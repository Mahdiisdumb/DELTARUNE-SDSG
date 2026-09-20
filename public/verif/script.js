(function init_verify_page() {
  const verification_storage_key = "steam_ownership_verification";
  const browser_key_db_name = "steam_verification_keys";
  const browser_key_store_name = "browser_keys";
  const browser_key_record_id = "steam_verify_browser_key";
  const steam_message_type = "steam-ownership-result";
  const steam_button = document.getElementById("steam-connect-button");
  const data_win_button = document.getElementById("data-win-button");
  const status_node = document.getElementById("verify-status");
  const details_node = document.getElementById("verify-details");
  const data_code_dialog = document.getElementById("data-code-dialog");
  const data_code_input = document.getElementById("data-code-input");
  const data_code_status = document.getElementById("data-code-status");
  const data_code_submit = document.getElementById("data-code-submit");
  const data_code_cancel = document.getElementById("data-code-cancel");
  const shell = document.querySelector("[data-autofocus-root]");
  const controls_storage_key = "controls";
  const main_action_buttons = [steam_button, data_win_button].filter(Boolean);
  const dialog_action_buttons = [data_code_submit, data_code_cancel].filter(Boolean);
  const last_gamepad_state = new Map();
  let browser_key_record_promise = null;
  let data_code_request_active = false;
  let selected_main_action_index = 0;
  let selected_dialog_action_index = 0;

  function focus_shell() {
    if (!shell || typeof shell.focus !== "function") {
      return;
    }

    try {
      shell.focus({ preventScroll: true });
    } catch (_focus_error) {
      try {
        shell.focus();
      } catch (_nested_focus_error) {
      }
    }
  }

  function get_controls_preference() {
    try {
      return localStorage.getItem(controls_storage_key) === "wasd" ? "wasd" : "arrows";
    } catch (_storage_error) {
      return "arrows";
    }
  }

  function matches_directional_key(event_key, direction) {
    const key = String(event_key || "").toLowerCase();
    const controls_preference = get_controls_preference();

    if (controls_preference === "wasd") {
      if (direction === "left") {
        return key === "a";
      }

      if (direction === "right") {
        return key === "d";
      }

      if (direction === "up") {
        return key === "w";
      }

      if (direction === "down") {
        return key === "s";
      }

      return false;
    }

    if (direction === "left") {
      return event_key === "ArrowLeft";
    }

    if (direction === "right") {
      return event_key === "ArrowRight";
    }

    if (direction === "up") {
      return event_key === "ArrowUp";
    }

    if (direction === "down") {
      return event_key === "ArrowDown";
    }

    return false;
  }

  function is_nintendo_gamepad(id) {
    return /nintendo|switch|joy-con|joycon|pro controller/i.test(id || "");
  }

  function read_gamepad_input() {
    const frame = {
      leftPressed: false,
      rightPressed: false,
      upPressed: false,
      downPressed: false,
      confirmPressed: false,
      cancelPressed: false,
    };

    if (!navigator.getGamepads) {
      return frame;
    }

    const gamepads = navigator.getGamepads();

    for (const gamepad of gamepads) {
      if (!gamepad || !gamepad.connected) {
        continue;
      }

      const nintendo_layout = is_nintendo_gamepad(gamepad.id);
      const confirm_index = nintendo_layout ? 1 : 0;
      const cancel_index = nintendo_layout ? 0 : 1;
      const axes = gamepad.axes || [];
      const buttons = gamepad.buttons || [];
      const current_state = {
        leftHeld: Boolean(buttons[14] && buttons[14].pressed) || axes[0] < -0.5,
        rightHeld: Boolean(buttons[15] && buttons[15].pressed) || axes[0] > 0.5,
        upHeld: Boolean(buttons[12] && buttons[12].pressed) || axes[1] < -0.5,
        downHeld: Boolean(buttons[13] && buttons[13].pressed) || axes[1] > 0.5,
        confirmHeld: Boolean(buttons[confirm_index] && buttons[confirm_index].pressed),
        cancelHeld: Boolean(buttons[cancel_index] && buttons[cancel_index].pressed),
      };
      const previous_state = last_gamepad_state.get(gamepad.index) || {
        leftHeld: false,
        rightHeld: false,
        upHeld: false,
        downHeld: false,
        confirmHeld: false,
        cancelHeld: false,
      };

      frame.leftPressed ||= current_state.leftHeld && !previous_state.leftHeld;
      frame.rightPressed ||= current_state.rightHeld && !previous_state.rightHeld;
      frame.upPressed ||= current_state.upHeld && !previous_state.upHeld;
      frame.downPressed ||= current_state.downHeld && !previous_state.downHeld;
      frame.confirmPressed ||= current_state.confirmHeld && !previous_state.confirmHeld;
      frame.cancelPressed ||= current_state.cancelHeld && !previous_state.cancelHeld;

      last_gamepad_state.set(gamepad.index, current_state);
    }

    return frame;
  }

  function is_data_code_dialog_open() {
    return Boolean(data_code_dialog && !data_code_dialog.hidden);
  }

  function set_selected_main_action(index) {
    if (main_action_buttons.length === 0) {
      selected_main_action_index = 0;
      return;
    }

    selected_main_action_index = ((index % main_action_buttons.length) + main_action_buttons.length) % main_action_buttons.length;

    for (let current_index = 0; current_index < main_action_buttons.length; current_index += 1) {
      main_action_buttons[current_index].classList.toggle("is-selected", current_index === selected_main_action_index);
    }
  }

  function set_selected_dialog_action(index) {
    if (dialog_action_buttons.length === 0) {
      selected_dialog_action_index = 0;
      return;
    }

    selected_dialog_action_index = ((index % dialog_action_buttons.length) + dialog_action_buttons.length) % dialog_action_buttons.length;

    for (let current_index = 0; current_index < dialog_action_buttons.length; current_index += 1) {
      dialog_action_buttons[current_index].classList.toggle("is-selected", current_index === selected_dialog_action_index);
    }
  }

  function move_main_action_selection(delta) {
    set_selected_main_action(selected_main_action_index + delta);
  }

  function move_dialog_action_selection(delta) {
    set_selected_dialog_action(selected_dialog_action_index + delta);
  }

  function trigger_selected_main_action() {
    const button = main_action_buttons[selected_main_action_index];

    if (button) {
      button.click();
    }
  }

  function trigger_selected_dialog_action() {
    if (selected_dialog_action_index === 0) {
      submit_data_code();
      return;
    }

    close_data_code_dialog();
  }

  function handle_navigation_input(delta) {
    if (is_data_code_dialog_open()) {
      move_dialog_action_selection(delta);
      return;
    }

    move_main_action_selection(delta);
  }

  function handle_confirm_input() {
    if (is_data_code_dialog_open()) {
      trigger_selected_dialog_action();
      return;
    }

    trigger_selected_main_action();
  }

  function handle_cancel_input() {
    if (!is_data_code_dialog_open() || data_code_request_active) {
      return;
    }

    close_data_code_dialog();
  }

  function poll_input_loop() {
    const frame = read_gamepad_input();

    if (frame.leftPressed || frame.upPressed) {
      handle_navigation_input(-1);
    }

    if (frame.rightPressed || frame.downPressed) {
      handle_navigation_input(1);
    }

    if (frame.confirmPressed) {
      handle_confirm_input();
    }

    if (frame.cancelPressed) {
      handle_cancel_input();
    }

    window.requestAnimationFrame(poll_input_loop);
  }

  function read_config() {
    const config = window.steam_verify_config ?? {};

    return {
      endpoint: String(config.endpoint ?? "").trim().replace(/\/+$/, ""),
      keys_endpoint: String(config.keys_endpoint ?? `${window.location.origin}/keys`).trim().replace(/\/+$/, ""),
      appid: Math.max(1, Number(config.appid ?? 1671210)),
      game_name: String(config.game_name ?? "DELTARUNE").trim() || "DELTARUNE",
    };
  }

  function set_status(message = "", state = "") {
    status_node.textContent = message;
    status_node.classList.toggle("is-error", state === "error");
    status_node.classList.toggle("is-success", state === "success");
  }

  function set_details(message = "") {
    details_node.textContent = message;
  }

  function set_data_code_status(message = "", state = "") {
    if (!data_code_status) {
      return;
    }

    const next_message = String(message ?? "");
    const has_message = next_message.length > 0;

    data_code_status.textContent = next_message;
    data_code_status.hidden = !has_message;
    data_code_status.classList.toggle("is-error", has_message && state === "error");
  }

  function get_endpoint_origin() {
    const config = read_config();

    if (!config.endpoint) {
      return "";
    }

    try {
      return new URL(config.endpoint).origin;
    } catch (_url_error) {
      return "";
    }
  }

  function array_buffer_to_base64(array_buffer) {
    const bytes = new Uint8Array(array_buffer);
    const chunk_size = 0x8000;
    let binary = "";

    for (let index = 0; index < bytes.length; index += chunk_size) {
      const chunk = bytes.subarray(index, index + chunk_size);
      binary += String.fromCharCode(...chunk);
    }

    return window.btoa(binary);
  }

  function base64_to_array_buffer(value) {
    const binary = window.atob(String(value ?? ""));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
  }

  function open_browser_key_db() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("This browser does not support IndexedDB storage for verification keys."));
        return;
      }

      const request = window.indexedDB.open(browser_key_db_name, 1);

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

  function write_browser_key_record(database, record) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(browser_key_store_name, "readwrite");
      const store = transaction.objectStore(browser_key_store_name);
      const request = store.put(record);

      request.onerror = () => {
        reject(request.error || new Error("Unable to save the verification browser key."));
      };

      transaction.oncomplete = () => {
        resolve(record);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error("Unable to finish saving the verification browser key."));
      };
    });
  }

  async function get_or_create_browser_key_record() {
    if (browser_key_record_promise) {
      return browser_key_record_promise;
    }

    browser_key_record_promise = (async () => {
      if (!window.crypto?.subtle) {
        throw new Error("This browser cannot create the local verification key needed for ownership verification.");
      }

      const database = await open_browser_key_db();
      const existing_record = await read_browser_key_record(database);

      if (
        existing_record
        && existing_record.public_key_base64
        && existing_record.key_pair?.privateKey
        && existing_record.key_pair?.publicKey
      ) {
        return existing_record;
      }

      const key_pair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
      );
      const public_key_buffer = await window.crypto.subtle.exportKey("spki", key_pair.publicKey);
      const browser_key_record = {
        id: browser_key_record_id,
        created_at: new Date().toISOString(),
        public_key_base64: array_buffer_to_base64(public_key_buffer),
        key_pair,
      };

      await write_browser_key_record(database, browser_key_record);
      return browser_key_record;
    })().catch((error) => {
      browser_key_record_promise = null;
      throw error;
    });

    return browser_key_record_promise;
  }

  async function encrypt_verification_bundle_for_browser(payload) {
    const browser_key_record = await get_or_create_browser_key_record();
    const public_key_base64 = browser_key_record?.public_key_base64;

    if (!public_key_base64) {
      throw new Error("This browser is missing its local verification public key.");
    }

    const browser_public_key = await window.crypto.subtle.importKey(
      "spki",
      base64_to_array_buffer(public_key_base64),
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"],
    );
    const session_key_bytes = new Uint8Array(32);
    const iv = new Uint8Array(12);

    window.crypto.getRandomValues(session_key_bytes);
    window.crypto.getRandomValues(iv);

    const session_key = await window.crypto.subtle.importKey(
      "raw",
      session_key_bytes,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      session_key,
      new TextEncoder().encode(JSON.stringify(payload)),
    );
    const wrapped_key = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      browser_public_key,
      session_key_bytes,
    );

    return {
      algorithm: "hybrid-rsa-aes-gcm",
      wrapped_key: array_buffer_to_base64(wrapped_key),
      iv: array_buffer_to_base64(iv),
      ciphertext: array_buffer_to_base64(ciphertext),
    };
  }

  function build_verification_state(result = {}) {
    const config = read_config();
    const result_bundle = result?.verification_key_bundle ?? null;
    const stored_bundle = result_bundle && result_bundle.wrapped_key && result_bundle.iv && result_bundle.ciphertext
      ? {
        ...result_bundle,
        key_id: String(result.verification_key_id ?? result_bundle.key_id ?? ""),
        steamid: String(result.steamid ?? result_bundle.steamid ?? ""),
        appid: Number(result.appid ?? result_bundle.appid ?? config.appid),
        issued_at: String(result.issued_at ?? result_bundle.issued_at ?? new Date().toISOString()),
        verification_mode: String(result.verification_mode ?? result_bundle.verification_mode ?? "steam"),
        stored_at: String(result_bundle.stored_at ?? new Date().toISOString()),
      }
      : null;

    return {
      verified: result.verified === true,
      owns_app: result.owns_app === true,
      appid: Number(result.appid ?? config.appid),
      steamid: String(result.steamid ?? ""),
      checked_at: String(result.checked_at ?? new Date().toISOString()),
      game_name: String(result.game_name ?? config.game_name),
      verification_key_id: String(result.verification_key_id ?? ""),
      verification_mode: String(result.verification_mode ?? stored_bundle?.verification_mode ?? "steam"),
      verification_source: String(result.source ?? ""),
      match_label: String(result.match_label ?? ""),
      verification_key_bundle: stored_bundle,
    };
  }

  function write_verification_state(state) {
    try {
      localStorage.setItem(verification_storage_key, JSON.stringify(state));
      localStorage.removeItem("steam_ownership_key_bundle");
    } catch (_storage_error) {
    }
  }

  function save_verification_result(result) {
    const normalized_result = build_verification_state(result);
    write_verification_state(normalized_result);
    return normalized_result;
  }

  function read_saved_verification_state() {
    try {
      const raw_value = localStorage.getItem(verification_storage_key);

      if (!raw_value) {
        return null;
      }

      const parsed_value = JSON.parse(raw_value);

      if (!parsed_value || typeof parsed_value !== "object") {
        return null;
      }

      return parsed_value;
    } catch (_storage_error) {
      return null;
    }
  }

  function read_saved_verification() {
    const parsed_value = read_saved_verification_state();

    if (!parsed_value || parsed_value.verified !== true) {
      return null;
    }

    return parsed_value;
  }

  function read_saved_verification_bundle() {
    const parsed_value = read_saved_verification_state();
    const stored_bundle = parsed_value?.verification_key_bundle ?? null;

    if (!stored_bundle || !stored_bundle.wrapped_key || !stored_bundle.iv || !stored_bundle.ciphertext) {
      return null;
    }

    return stored_bundle;
  }

  function build_worker_start_url(public_key_base64) {
    const config = read_config();

    if (!config.endpoint) {
      throw new Error("Set verif/steamverif.js with your Steam worker endpoint first.");
    }

    const start_url = new URL(`${config.endpoint}/api/steam/start`);
    start_url.searchParams.set("popup", "1");
    start_url.searchParams.set("return_to", window.location.href.split("#")[0]);
    start_url.searchParams.set("browser_key", public_key_base64);
    return start_url.toString();
  }

  function render_saved_verification() {
    const saved_verification = read_saved_verification();

    if (!saved_verification) {
      set_status("");
      set_details("");
      return;
    }

    set_status("Thanks for verifying, enjoy!", "success");
    set_details("");
  }

  async function decrypt_verification_bundle(bundle) {
    const browser_key_record = await get_or_create_browser_key_record();
    const private_key = browser_key_record?.key_pair?.privateKey;

    if (!private_key) {
      throw new Error("This browser is missing its local verification key.");
    }

    const session_key_buffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      private_key,
      base64_to_array_buffer(bundle.wrapped_key),
    );
    const session_key = await window.crypto.subtle.importKey(
      "raw",
      session_key_buffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plaintext_buffer = await window.crypto.subtle.decrypt(
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
    const config = read_config();
    const stored_bundle = read_saved_verification_bundle();

    if (!stored_bundle) {
      throw new Error("No saved verification bundle was found in this browser.");
    }

    const decrypted_bundle = await decrypt_verification_bundle(stored_bundle);
    const response = await window.fetch(config.keys_endpoint, {
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

  async function save_local_verification_bundle(result) {
    const bundle_payload = {
      key_id: String(result.verification_key_id ?? ""),
      raw_key: String(result.raw_verification_key ?? ""),
      steamid: String(result.steamid ?? ""),
      appid: Number(result.appid ?? read_config().appid),
      issued_at: String(result.issued_at ?? new Date().toISOString()),
      verification_mode: String(result.verification_mode ?? "data_win"),
    };

    if (!bundle_payload.key_id || !bundle_payload.raw_key) {
      throw new Error("The verification response did not include a usable browser key.");
    }

    const encrypted_bundle = await encrypt_verification_bundle_for_browser(bundle_payload);

    return save_verification_result({
      ...result,
      verification_key_bundle: {
        ...encrypted_bundle,
        key_id: bundle_payload.key_id,
        steamid: bundle_payload.steamid,
        appid: bundle_payload.appid,
        issued_at: bundle_payload.issued_at,
        verification_mode: bundle_payload.verification_mode,
        stored_at: new Date().toISOString(),
      },
    });
  }

  async function persist_successful_verification(result) {
    if (result.verification_key_bundle) {
      return save_verification_result({
        ...result,
        game_name: read_config().game_name,
      });
    }

    if (result.raw_verification_key) {
      return save_local_verification_bundle({
        ...result,
        game_name: read_config().game_name,
      });
    }

    return save_verification_result({
      ...result,
      game_name: read_config().game_name,
    });
  }

  function parse_error_details(error_details_text) {
    if (!error_details_text) {
      return null;
    }

    try {
      return JSON.parse(error_details_text);
    } catch (_parse_error) {
      return {
        message: String(error_details_text),
      };
    }
  }

  function route_after_success() {
    const next_page = window.ownership_gate?.get_verified_default_page
      ? window.ownership_gate.get_verified_default_page()
      : (localStorage.getItem("setup_complete") === "1" ? "app/index.html" : "setup/index.html");

    window.setTimeout(() => {
      if (window.ownership_gate?.go_to_page) {
        window.ownership_gate.go_to_page(next_page);
        return;
      }

      try {
        localStorage.setItem("startpage", next_page);
      } catch (_storage_error) {
      }

      try {
        if (window.parent && window.parent !== window && typeof window.parent.goToContainerPage === "function") {
          window.parent.goToContainerPage(next_page);
          return;
        }
      } catch (_parent_error) {
      }

      window.location.href = `../${next_page}`;
    }, 850);
  }

  async function apply_verification_result(result) {
    const config = read_config();

    if (result.verified && result.owns_app) {
      await persist_successful_verification(result);
      set_status("Thanks for verifying, enjoy!", "success");
      set_details("");
      route_after_success();
      return;
    }

    set_status(
      result.error || `That verification could not be confirmed for ${config.game_name}.`,
      "error",
    );
    set_details("");
  }

  function handle_callback_query() {
    const url = new URL(window.location.href);
    const verified = url.searchParams.get("steam_verified");
    const steamid = url.searchParams.get("steamid");
    const error = url.searchParams.get("steam_error");
    const error_details = parse_error_details(url.searchParams.get("steam_error_details"));
    const verification_key_id = url.searchParams.get("verification_key_id");

    if (!verified && !steamid && !error && !error_details && !verification_key_id) {
      return false;
    }

    if (verified === "1") {
      apply_verification_result({
        verified: true,
        owns_app: true,
        steamid: steamid || "",
        appid: read_config().appid,
        checked_at: new Date().toISOString(),
        verification_key_id: verification_key_id || "",
      }).catch((apply_error) => {
        set_status(apply_error?.message || "Unable to finish verification.", "error");
        set_details("");
      });
    } else {
      apply_verification_result({
        verified: false,
        owns_app: false,
        steamid: steamid || "",
        error: error || "",
        error_details: error_details || {
          message: error || "",
        },
      }).catch((apply_error) => {
        set_status(apply_error?.message || "Unable to finish verification.", "error");
        set_details("");
      });
    }

    url.searchParams.delete("steam_verified");
    url.searchParams.delete("steamid");
    url.searchParams.delete("steam_error");
    url.searchParams.delete("steam_error_details");
    url.searchParams.delete("verification_key_id");
    window.history.replaceState({}, "", url.toString());
    return true;
  }

  function write_popup_placeholder(popup) {
    if (!popup || popup.closed) {
      return;
    }

    try {
      popup.document.open();
      popup.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Opening Steam...</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #000;
        color: #fff;
        font: 16px/1.4 sans-serif;
      }

      body {
        display: grid;
        place-items: center;
        padding: 24px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    Preparing Steam verification...
  </body>
</html>`);
      popup.document.close();
    } catch (_popup_error) {
    }
  }

  async function connect_with_steam() {
    let popup = null;

    try {
      popup = window.open(
        "about:blank",
        "steam_ownership_verify",
        "popup=yes,width=560,height=720,resizable=yes,scrollbars=yes",
      );

      if (!popup) {
        set_status("The Steam popup was blocked by the browser.", "error");
        set_details("Allow popups for this page and try again.");
        return;
      }

      write_popup_placeholder(popup);
      set_status("Preparing Steam verification...", "");
      set_details("");

      const browser_key_record = await get_or_create_browser_key_record();
      const start_url = build_worker_start_url(browser_key_record.public_key_base64);

      popup.location.replace(start_url);
      set_status("Waiting for Steam verification...", "");
      set_details("");
      popup.focus();
    } catch (error) {
      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch (_popup_error) {
        }
      }

      set_status(error?.message || "Unable to start Steam verification.", "error");
      set_details("");
    }
  }

  function normalize_data_code(value) {
    return String(value ?? "").replace(/\D+/g, "").slice(0, 4);
  }

  function open_data_code_dialog() {
    if (!data_code_dialog || !data_code_input) {
      return;
    }

    data_code_input.value = "";
    set_selected_dialog_action(0);
    set_data_code_status("");
    data_code_dialog.hidden = false;
    data_code_dialog.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(() => {
      try {
        data_code_input.focus({ preventScroll: true });
        data_code_input.select();
      } catch (_focus_error) {
        try {
          data_code_input.focus();
        } catch (_nested_focus_error) {
        }
      }
    });
  }

  function close_data_code_dialog() {
    if (!data_code_dialog) {
      return;
    }

    data_code_dialog.hidden = true;
    data_code_dialog.setAttribute("aria-hidden", "true");
    set_selected_dialog_action(0);
    set_data_code_status("");
    focus_shell();
  }

  async function redeem_data_code(raw_code) {
    const config = read_config();
    const normalized_code = normalize_data_code(raw_code);

    const response = await window.fetch(config.keys_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "redeem_data_code",
        code: normalized_code,
      }),
    });
    const response_text = await response.text();
    let response_data = null;

    try {
      response_data = response_text ? JSON.parse(response_text) : {};
    } catch (_parse_error) {
      response_data = {
        ok: false,
        error: response_text || "The data code service returned an unreadable response.",
      };
    }

    if (!response.ok || response_data?.ok !== true) {
      throw new Error(response_data?.error || `The data code service returned status ${response.status}.`);
    }

    return response_data;
  }

  async function submit_data_code() {
    if (data_code_request_active) {
      return;
    }

    const normalized_code = normalize_data_code(data_code_input?.value ?? "");

    if (data_code_input) {
      data_code_input.value = normalized_code;
    }

    if (normalized_code.length !== 4) {
      try {
        data_code_input?.focus({ preventScroll: true });
      } catch (_focus_error) {
        try {
          data_code_input?.focus();
        } catch (_nested_focus_error) {
        }
      }

      return;
    }

    data_code_request_active = true;
    set_data_code_status("Checking code...");

    if (data_code_input) {
      data_code_input.disabled = true;
    }

    if (data_code_submit) {
      data_code_submit.disabled = true;
    }

    if (data_code_cancel) {
      data_code_cancel.disabled = true;
    }

    try {
      const result = await redeem_data_code(normalized_code);
      await apply_verification_result(result);
      close_data_code_dialog();
    } catch (error) {
      const error_message = error?.message || "Unable to use that data code right now.";
      set_data_code_status(error_message, "error");
    } finally {
      data_code_request_active = false;

      if (data_code_input) {
        data_code_input.disabled = false;
      }

      if (data_code_submit) {
        data_code_submit.disabled = false;
      }

      if (data_code_cancel) {
        data_code_cancel.disabled = false;
      }
    }
  }

  window.addEventListener("message", (event) => {
    const expected_origin = get_endpoint_origin();
    const message = event.data ?? {};

    if (!expected_origin || event.origin !== expected_origin) {
      return;
    }

    if (message.type !== steam_message_type) {
      return;
    }

    apply_verification_result(message).catch((error) => {
      set_status(error?.message || "Unable to finish verification.", "error");
      set_details("");
    });
  });

  steam_button?.addEventListener("click", () => {
    connect_with_steam();
  });

  steam_button?.addEventListener("pointerenter", () => {
    set_selected_main_action(0);
  });

  data_win_button?.addEventListener("click", () => {
    open_data_code_dialog();
  });

  data_win_button?.addEventListener("pointerenter", () => {
    set_selected_main_action(1);
  });

  data_code_submit?.addEventListener("click", () => {
    submit_data_code();
  });

  data_code_submit?.addEventListener("pointerenter", () => {
    set_selected_dialog_action(0);
  });

  data_code_cancel?.addEventListener("click", () => {
    close_data_code_dialog();
  });

  data_code_cancel?.addEventListener("pointerenter", () => {
    set_selected_dialog_action(1);
  });

  data_code_dialog?.addEventListener("click", (event) => {
    if (event.target === data_code_dialog && !data_code_request_active) {
      close_data_code_dialog();
    }
  });

  data_code_input?.addEventListener("input", () => {
    data_code_input.value = normalize_data_code(data_code_input.value);
    set_data_code_status("");
  });

  data_code_input?.addEventListener("keydown", (event) => {
    if (event.key === "Backspace") {
      event.stopPropagation();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      submit_data_code();
      return;
    }

    if (event.key === "Escape" && !data_code_request_active) {
      event.preventDefault();
      close_data_code_dialog();
    }
  });

  window.addEventListener("keydown", (event) => {
    const event_target = event.target;
    const is_text_entry_target = event_target instanceof HTMLElement
      && (event_target.matches("input, textarea") || event_target.isContentEditable);

    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (is_data_code_dialog_open() && is_text_entry_target && event.key === "Backspace") {
      return;
    }

    if (matches_directional_key(event.key, "left") || matches_directional_key(event.key, "up")) {
      event.preventDefault();
      handle_navigation_input(-1);
      return;
    }

    if (matches_directional_key(event.key, "right") || matches_directional_key(event.key, "down")) {
      event.preventDefault();
      handle_navigation_input(1);
      return;
    }

    if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
      event.preventDefault();
      handle_confirm_input();
      return;
    }

    if (
      event.key === "Escape"
      || event.key === "Backspace"
      || event.key === "Shift"
      || event.key === "x"
      || event.key === "X"
    ) {
      event.preventDefault();
      handle_cancel_input();
      return;
    }

    if (event.key === "Escape" && !data_code_dialog?.hidden && !data_code_request_active) {
      event.preventDefault();
      close_data_code_dialog();
    }
  });

  window.verify_saved_steam_ownership = verify_saved_ownership;
  window.verify_saved_ownership = verify_saved_ownership;

  window.addEventListener("load", () => {
    set_selected_main_action(0);
    set_selected_dialog_action(0);
    focus_shell();
    poll_input_loop();

    if (!handle_callback_query()) {
      render_saved_verification();
    }
  });
})();
