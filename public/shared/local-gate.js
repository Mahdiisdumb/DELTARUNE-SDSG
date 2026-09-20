(function install_local_ownership_gate(global_scope) {
  const verification_storage_key = "steam_ownership_verification";
  const setup_complete_storage_key = "setup_complete";
  const local_bundle = {
    key_id: "local-vinetrap",
    raw_key: "local-static-assets",
    steamid: "local",
    appid: 1671210,
    verification_mode: "local",
  };
  const local_state = {
    verified: true,
    owns_app: true,
    appid: 1671210,
    steamid: "local",
    checked_at: new Date().toISOString(),
    game_name: "DELTARUNE",
    verification_key_id: local_bundle.key_id,
    verification_mode: local_bundle.verification_mode,
    verification_source: "local-data-win",
    match_label: "Local DELTARUNE installation",
  };

  function get_keys_endpoint() {
    return `${global_scope.location.origin}/keys`;
  }

  function is_setup_complete() {
    try {
      return global_scope.localStorage?.getItem(setup_complete_storage_key) === "1";
    } catch (_error) {
      return false;
    }
  }

  function get_verified_default_page() {
    return is_setup_complete() ? "app/index.html" : "setup/index.html";
  }

  function build_result() {
    return {
      verified: true,
      reason: "local-replica",
      state: local_state,
      offline_mode: true,
      result: {
        ok: true,
        valid: true,
        appid: 1671210,
        steamid: "local",
        key_id: local_bundle.key_id,
        verification_mode: local_bundle.verification_mode,
        source: "local-data-win",
        match_label: local_state.match_label,
        decrypted_bundle: local_bundle,
      },
    };
  }

  async function verify_saved_ownership() {
    return build_result().result;
  }

  async function check_saved_ownership() {
    return build_result();
  }

  function normalize_page_path(value) {
    const trimmed_value = String(value ?? "").trim();
    if (!trimmed_value) {
      return get_verified_default_page();
    }

    let normalized_value = trimmed_value.replace(/^\.?\//, "");
    const aliases = {
      setup: "setup/index.html",
      app: "app/index.html",
      verif: "verif/index.html",
      i: "i/index.html",
      d: "d/index.html",
      play: "play/play/index.html",
    };
    normalized_value = aliases[normalized_value] ?? normalized_value;

    if (!/^(setup|app|verif|i|d|play)\/.+/.test(normalized_value)) {
      return get_verified_default_page();
    }

    return normalized_value;
  }

  function resolve_start_page(stored_page) {
    const normalized_page = normalize_page_path(
      stored_page || get_verified_default_page(),
    );
    return normalized_page === "verif/index.html"
      ? get_verified_default_page()
      : normalized_page;
  }

  function remember_start_page(page_path) {
    const normalized_page = normalize_page_path(page_path);
    if (
      normalized_page !== "app/offline/index.html"
      && !/^play\/.+/.test(normalized_page)
    ) {
      try {
        global_scope.localStorage?.setItem("startpage", normalized_page);
      } catch (_error) {
      }
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
    } catch (_error) {
    }

    global_scope.location.href = `/${normalized_page.replace(/^\/+/, "")}`;
    return normalized_page;
  }

  const gate = {
    verification_storage_key,
    setup_complete_storage_key,
    get_keys_endpoint,
    is_setup_complete,
    get_verified_default_page,
    read_saved_verification_state: () => local_state,
    read_saved_verification_bundle: () => local_bundle,
    verify_saved_ownership,
    check_saved_ownership,
    resolve_start_page,
    remember_start_page,
    go_to_page,
  };

  global_scope.gate = gate;
  global_scope.ownership_gate = gate;
})(window);
