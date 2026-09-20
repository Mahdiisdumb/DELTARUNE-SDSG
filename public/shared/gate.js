(function init_gate(global_scope) {
  const verification_storage_key = "steam_ownership_verification";
  const browser_key_db_name = "steam_verification_keys";
  const browser_key_store_name = "browser_keys";
  const browser_key_record_id = "steam_verify_browser_key";
  const setup_complete_storage_key = "setup_complete";
  const offline_mode_storage_key = "offlineModeEnabled";
  const offline_mode_download_storage_key = "dr-play-offline-download-active-v1";
  const default_keys_endpoint = `${window.location.origin}/keys`;

  function get_keys_endpoint() {
    const config = global_scope.steam_verify_config ?? {};
    return String(config.keys_endpoint ?? default_keys_endpoint).trim().replace(/\/+$/, "");
  }

  function read_local_json(storage_key) {
    try {
      const raw_value = global_scope.localStorage?.getItem(storage_key);

      if (!raw_value) {
        return null;
      }

      const parsed_value = JSON.parse(raw_value);
      return parsed_value && typeof parsed_value === "object" ? parsed_value : null;
    } catch (_storage_error) {
      return null;
    }
  }

  function write_local_json(storage_key, value) {
    try {
      global_scope.localStorage?.setItem(storage_key, JSON.stringify(value));
      return true;
    } catch (_storage_error) {
      return false;
    }
  }

  function read_local_storage_boolean(storage_key) {
    try {
      return global_scope.localStorage?.getItem(storage_key) === "true";
    } catch (_storage_error) {
      return false;
    }
  }

  function is_offline_mode_active() {
    return read_local_storage_boolean(offline_mode_storage_key)
      || read_local_storage_boolean(offline_mode_download_storage_key);
  }

  function is_networkish_verification_error(error) {
    const error_message = String(error?.message ?? error ?? "").trim();

    if (!error_message) {
      return false;
    }

    return (
      /status\s+408\b/i.test(error_message)
      || /\bnetwork\b/i.test(error_message)
      || /failed to fetch/i.test(error_message)
      || /load failed/i.test(error_message)
      || /timed?\s*out/i.test(error_message)
      || /internet disconnected/i.test(error_message)
    );
  }

  function read_saved_verification_state() {
    return read_local_json(verification_storage_key);
  }

  function write_saved_verification_state(state) {
    write_local_json(verification_storage_key, state);
  }

  function read_saved_verification_bundle() {
    const saved_state = read_saved_verification_state();
    const stored_bundle = saved_state?.verification_key_bundle ?? null;

    if (!stored_bundle || !stored_bundle.wrapped_key || !stored_bundle.iv || !stored_bundle.ciphertext) {
      return null;
    }

    return stored_bundle;
  }

  function is_setup_complete() {
    try {
      return global_scope.localStorage?.getItem(setup_complete_storage_key) === "1";
    } catch (_storage_error) {
      return false;
    }
  }

  function get_verified_default_page() {
    return is_setup_complete() ? "app/index.html" : "setup/index.html";
  }
  function base64_to_array_buffer(value) {
    const binary = global_scope.atob(String(value ?? ""));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
  }

  function open_browser_key_db() {
    return new Promise((resolve, reject) => {
      if (!global_scope.indexedDB) {
        reject(new Error("This browser does not support IndexedDB storage for verification keys."));
        return;
      }

      const request = global_scope.indexedDB.open(browser_key_db_name, 1);

      request.onerror = () => {
        reject(request.error || new Error("Unable to open the verification key database."));
      };

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(browser_key_store_name)) {
          database.createObjectStore(browser_key_store_name, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  function read_browser_key_record(database) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(browser_key_store_name, "readonly");
      const store = transaction.objectStore(browser_key_store_name);
      const request = store.get(browser_key_record_id);

      request.onerror = () => {
        reject(request.error || new Error("Unable to read the verification browser key."));
      };

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
    });
  }

  async function decrypt_verification_bundle(bundle) {
    if (!global_scope.crypto?.subtle) {
      throw new Error("This browser cannot decrypt the saved verification bundle.");
    }

    const database = await open_browser_key_db();
    const browser_key_record = await read_browser_key_record(database);
    const private_key = browser_key_record?.key_pair?.privateKey;

    if (!private_key) {
      throw new Error("This browser is missing its local verification key.");
    }

    const session_key_buffer = await global_scope.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      private_key,
      base64_to_array_buffer(bundle.wrapped_key),
    );
    const session_key = await global_scope.crypto.subtle.importKey(
      "raw",
      session_key_buffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plaintext_buffer = await global_scope.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(base64_to_array_buffer(bundle.iv)),
      },
      session_key,
      base64_to_array_buffer(bundle.ciphertext),
    );

    return JSON.parse(new TextDecoder().decode(plaintext_buffer));
  }

  async function verify_saved_ownership() {
    const stored_bundle = read_saved_verification_bundle();

    if (!stored_bundle) {
      throw new Error("No saved verification bundle was found in this browser.");
    }

    const decrypted_bundle = await decrypt_verification_bundle(stored_bundle);
    const response = await global_scope.fetch(get_keys_endpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "verify",
        key_id: decrypted_bundle.key_id,
        key: decrypted_bundle.raw_key,
        steamid: decrypted_bundle.steamid,
        appid: decrypted_bundle.appid,
        verification_mode: decrypted_bundle.verification_mode,
      }),
    });
    const response_text = await response.text();
    let response_data = null;

    try {
      response_data = response_text ? JSON.parse(response_text) : {};
    } catch (_parse_error) {
      response_data = {
        ok: false,
        valid: false,
        error: response_text || "The key service returned an unreadable response.",
      };
    }

    if (!response.ok) {
      throw new Error(response_data?.error || `The key service returned status ${response.status}.`);
    }

    return {
      ...response_data,
      decrypted_bundle,
    };
  }

  async function build_offline_saved_ownership_result(saved_state, stored_bundle) {
    const decrypted_bundle = await decrypt_verification_bundle(stored_bundle);
    return {
      verified: true,
      reason: "offline-cached",
      state: saved_state,
      result: {
        valid: true,
        appid: Number(saved_state.appid ?? decrypted_bundle.appid ?? 1671210),
        steamid: String(saved_state.steamid ?? decrypted_bundle.steamid ?? ""),
        key_id: String(saved_state.verification_key_id ?? decrypted_bundle.key_id ?? ""),
        verification_mode: String(saved_state.verification_mode ?? decrypted_bundle.verification_mode ?? "steam"),
        source: String(saved_state.verification_source ?? ""),
        match_label: String(saved_state.match_label ?? ""),
        decrypted_bundle,
      },
      offline_mode: true,
    };
  }

  async function check_saved_ownership() {
    const saved_state = read_saved_verification_state();

    if (!saved_state || saved_state.verified !== true) {
      return {
        verified: false,
        reason: "missing-state",
        state: saved_state,
      };
    }

    const stored_bundle = read_saved_verification_bundle();

    if (!stored_bundle) {
      return {
        verified: false,
        reason: "missing-bundle",
        state: saved_state,
      };
    }

    if (is_offline_mode_active() && global_scope.navigator?.onLine === false) {
      try {
        return await build_offline_saved_ownership_result(saved_state, stored_bundle);
      } catch (offline_error) {
        return {
          verified: false,
          reason: "offline-error",
          state: saved_state,
          error: offline_error,
        };
      }
    }

    try {
      const verification_result = await verify_saved_ownership();

      if (!verification_result || verification_result.valid !== true) {
        return {
          verified: false,
          reason: "invalid",
          state: saved_state,
          result: verification_result,
        };
      }

      const refreshed_state = {
        ...saved_state,
        verified: true,
        owns_app: true,
        checked_at: new Date().toISOString(),
        appid: Number(verification_result.appid ?? saved_state.appid ?? 1671210),
        steamid: String(verification_result.steamid ?? saved_state.steamid ?? ""),
        verification_key_id: String(verification_result.key_id ?? saved_state.verification_key_id ?? ""),
        verification_mode: String(verification_result.verification_mode ?? saved_state.verification_mode ?? "steam"),
        verification_source: String(verification_result.source ?? saved_state.verification_source ?? ""),
        match_label: String(verification_result.match_label ?? saved_state.match_label ?? ""),
      };

      write_saved_verification_state(refreshed_state);

      return {
        verified: true,
        reason: "verified",
        state: refreshed_state,
        result: verification_result,
      };
    } catch (error) {
      if (is_offline_mode_active() && (
        global_scope.navigator?.onLine === false
        || is_networkish_verification_error(error)
      )) {
        try {
          return await build_offline_saved_ownership_result(saved_state, stored_bundle);
        } catch (offline_error) {
          return {
            verified: false,
            reason: "offline-error",
            state: saved_state,
            error: offline_error,
          };
        }
      }

      return {
        verified: false,
        reason: "error",
        state: saved_state,
        error,
      };
    }
  }

  function normalize_page_path(value) {
    const trimmed_value = String(value ?? "").trim();

    if (!trimmed_value) {
      return get_verified_default_page();
    }

    let normalized_value = trimmed_value.replace(/^\.?\//, "");

    if (normalized_value === "setup") {
      normalized_value = "setup/index.html";
    } else if (normalized_value === "app") {
      normalized_value = "app/index.html";
    } else if (normalized_value === "verif") {
      normalized_value = "verif/index.html";
    } else if (normalized_value === "i") {
      normalized_value = "i/index.html";
    } else if (normalized_value === "d") {
      normalized_value = "d/index.html";
    } else if (normalized_value === "play") {
      normalized_value = "play/play/index.html";
    }

    if (!/^(setup|app|verif|i|d|play)\/.+/.test(normalized_value)) {
      return get_verified_default_page();
    }

    return normalized_value;
  }

  function resolve_start_page(stored_page, gate_result) {
    if (!gate_result?.verified) {
      return "verif/index.html";
    }

    const normalized_page = normalize_page_path(stored_page || get_verified_default_page());

    if (normalized_page === "verif/index.html") {
      return get_verified_default_page();
    }

    return normalized_page;
  }

  function remember_start_page(page_path) {
    const normalized_page = normalize_page_path(page_path);

    if (normalized_page === "app/offline/index.html") {
      return normalized_page;
    }

    if (/^play\/.+/.test(normalized_page)) {
      return normalized_page;
    }

    try {
      global_scope.localStorage?.setItem("startpage", normalized_page);
    } catch (_storage_error) {
    }

    return normalized_page;
  }

  function go_to_page(page_path) {
    const normalized_page = remember_start_page(page_path);

    try {
      if (
        global_scope.parent
        && global_scope.parent !== global_scope
        && typeof global_scope.parent.goToContainerPage === "function"
      ) {
        global_scope.parent.goToContainerPage(normalized_page);
        return normalized_page;
      }
    } catch (_parent_error) {
    }

    global_scope.location.href = `/${String(normalized_page).replace(/^\/+/, "")}`;
    return normalized_page;
  }

  const gate = {
    verification_storage_key,
    setup_complete_storage_key,
    get_keys_endpoint,
    is_setup_complete,
    get_verified_default_page,
    read_saved_verification_state,
    read_saved_verification_bundle,
    verify_saved_ownership,
    check_saved_ownership,
    resolve_start_page,
    remember_start_page,
    go_to_page,
  };

  global_scope.gate = gate;
  global_scope.ownership_gate = gate;
})(window);
