(
    function init_dr_play_loader() {
  const loader_console_log_buffer = [];
  const loader_console_max_entries = 20000;

  function serialize_console_log_part(value) {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, (_key, nested_value) => {
        if (nested_value instanceof Error) {
          return { name: nested_value.name, message: nested_value.message, stack: nested_value.stack };
        }
        if (nested_value instanceof Uint8Array) return `[Uint8Array ${nested_value.byteLength}]`;
        if (nested_value instanceof ArrayBuffer) return `[ArrayBuffer ${nested_value.byteLength}]`;
        return nested_value;
      });
    } catch (_json_error) {
      return String(value);
    }
  }

  function record_loader_console_log(level, parts) {
    try {
      loader_console_log_buffer.push({
        at: new Date().toISOString(),
        level,
        message: Array.from(parts).map(serialize_console_log_part).join(" "),
      });
      while (loader_console_log_buffer.length > loader_console_max_entries) loader_console_log_buffer.shift();
    } catch (_record_error) {}
  }

  function install_loader_console_capture() {
    if (console.__drLoaderConsoleCaptureInstalled) return;
    Object.defineProperty(console, "__drLoaderConsoleCaptureInstalled", { value: true, configurable: true });
    for (const level of ["log", "debug", "info", "warn", "error"]) {
      const original_method = console[level];
      if (typeof original_method !== "function") continue;
      console[level] = function captured_loader_console_log(...parts) {
        record_loader_console_log(level, parts);
        return original_method.apply(this, parts);
      };
    }
    window.addEventListener("error", (event) => {
      record_loader_console_log("error", [event.message, event.filename, event.lineno, event.colno, event.error?.stack || ""]);
    });
    window.addEventListener("unhandledrejection", (event) => {
      record_loader_console_log("error", ["Unhandled promise rejection", event.reason]);
    });
    window.addEventListener("unhandledrejection", (event) => {
      record_loader_console_log("error", ["Unhandled rejection", event.reason?.stack || event.reason || ""]);
    });
  }

  install_loader_console_capture();
  const hide_signal = "Entering main loop.";
  const max_log_length = 70;
  const base_progress_percent = 6;
  const preload_progress_percent = 92;
  const preload_game_unx_progress_share = 0.58;
  const loader_history_storage_key = "loaderhistory";
  const chapter_select_intro_storage_key = "firstrun";
  const chapter_select_intro_duration_ms = 10000;
  const chapter_select_intro_fade_duration_ms = 500;
  const preload_timer_interval_ms = 250;
  const preload_timer_text_update_interval_ms = 1000;
  const preload_timer_display_eta_padding_ms = 4000;
  const default_network_asset_duration_ms = 280;
  const default_cached_asset_duration_ms = 25;
  const default_fixed_preload_overhead_ms = 1200;
  const default_network_asset_bytes = 4 * 1024 * 1024;
  const default_runner_js_asset_bytes = 2 * 1024 * 1024;
  const default_runner_wasm_asset_bytes = 6 * 1024 * 1024;
  const default_runner_data_asset_bytes = 32 * 1024 * 1024;
  const default_game_unx_asset_bytes = 128 * 1024 * 1024;
  const default_shared_audio_pack_asset_bytes = 194 * 1024 * 1024;
  const default_chunked_asset_min_bytes = 30 * 1024 * 1024;
  const gamepad_escape_button_index = 4;
  const gamepad_f1_button_index = 5;
  const current_download_progress_emit_interval_ms = 80;
  const active_download_speed_warmup_ms = 700;
  const minimum_visible_eta_ms = 1000;
  const protected_asset_max_attempts = 3;
  const protected_asset_retry_delay_ms = 700;
  const game_unx_asset_path = "game.unx";
  const shared_audio_pack_asset_path = "mus/base_index_audio.pak";
  const shared_audio_pack_magic = "DRPAK001";
  const idle_download_indicator_frames = ["·", "₊", "⊹", "˖", "✧", "˖", "⊹", "₊"];
  const retryable_play_asset_statuses = new Set([408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524]);
  const fallback_manifest_files = [
    "runner.js",
    "runner.data",
    "runner.wasm",
    "audio-worklet.js",
    "game.unx",
    "AUDIO_INTRONOISE.ogg",
    "snd_closet_fall.ogg",
    "snd_closet_impact.ogg",
    "common/chapters/snd_great_shine.ogg",
    "snd_paper_rumble.ogg",
    "snd_paper_surf.ogg",
    "common/chapters/snd_revival.ogg",
    "snd_rurus_appear.ogg",
    "common/chapters/snd_usefountain.ogg",
  ];
  const shared_chapter_common_asset_paths = new Set([
    "audio_intronoise.ogg",
    "audio-worklet.js",
    "igor.output.manifest",
    "runner.wasm",
    "mus_undynescary.ogg",
    "snd_bigcar_yelp.ogg",
    "snd_churchbell.ogg",
    "snd_closet_fall.ogg",
    "snd_closet_impact.ogg",
    "snd_dtrans_drone.ogg",
    "snd_dtrans_flip.ogg",
    "snd_dtrans_heavypassing.ogg",
    "snd_dtrans_lw.ogg",
    "snd_dtrans_square.ogg",
    "snd_dtrans_twinkle.ogg",
    "snd_fountain_make.ogg",
    "snd_fountain_target.ogg",
    "snd_ghostappear.ogg",
    "snd_great_shine.ogg",
    "snd_him_quick.ogg",
    "snd_hitcar.ogg",
    "snd_hitcar_little.ogg",
    "snd_icespell.ogg",
    "snd_paper_rumble.ogg",
    "snd_paper_surf.ogg",
    "snd_power.ogg",
    "snd_revival.ogg",
    "snd_usefountain.ogg",
    "snd_smallcar_yelp.ogg",
    "snd_snowgrave.ogg",
    "snd_spell_pacify.ogg",
    "snd_rurus_appear.ogg",
  ]);
  const shared_chapter_common_sound_asset_paths = new Set(Array.from(shared_chapter_common_asset_paths).filter((asset_path) => {
    const normalized_asset_path = String(asset_path || "").toLowerCase();
    return normalized_asset_path.endsWith(".ogg") && !normalized_asset_path.startsWith("mus_");
  }));
  const skipped_manifest_files = new Set([
    "index.html",
    "runner-sw.js",
    "sw.js",
    "runner.json",
  ]);
  const chunked_protected_asset_suffixes = new Set([
    ".data",
    ".wasm",
    ".unx",
    ".unxw",
    ".pak",
  ]);
  const default_keys_endpoint = `${window.location.origin}/keys`;
  // Keep locally patched assets isolated from the upstream cache. The cache
  // lookup below is intentionally fast and does not validate a cached
  // response against the current manifest size, so reusing "base" after a
  // Chinese patch update can boot a mismatched runner.data/game.unx pair.
  const protected_asset_cache_name = "base-chs-260723-r3";
  const refresh_asset_cache_name = "dr-play-refresh-assets-chs-260723-r3";
  const mod_override_cache_name = "dr-play-mod-overrides-v1";
  const runner_refresh_storage_key = "dr-play-runner-refresh-v1";
  const mod_override_storage_key = "dr-play-mod-override-v1";
  const mod_default_override_storage_key = "modOverride";
  const debug_game_mode_storage_key = "dr-play-debug-game-mode-v1";
  const offline_mode_storage_key = "offlineModeEnabled";
  const offline_mode_download_storage_key = "dr-play-offline-download-active-v1";
  const audio_caching_mode_storage_key = "cachingmode";
  const device_profile_storage_key = "device_profile";
  const console_family_storage_key = "console_family";
  const game_border_storage_key = "dr-play-border-v1";
  const game_border_stage_width = 1920;
  const game_border_stage_height = 1080;
  const game_border_frame_left = 320;
  const game_border_frame_top = 60;
  const game_border_frame_width = 1280;
  const game_border_frame_height = 960;
  const game_border_options = [
    { id: "dynamic", label: "Dynamic", asset_file_name: "" },
    { id: "line_1080", label: "Simple", asset_file_name: "border_line_1080.png" },
    { id: "off", label: "None", asset_file_name: "" },
    { id: "dw_blue", label: "Stars (Blue)", asset_file_name: "border_dw_blue.png" },
    { id: "dw_blue_light", label: "Stars (Light Blue)", asset_file_name: "border_dw_blue_light.png" },
    { id: "dw_blue_stars", label: "TV Stars", asset_file_name: "border_dw_blue_stars.png" },
    { id: "dw_castle_cafe", label: "Castle (Cafe)", asset_file_name: "border_dw_castle_cafe.png" },
    { id: "dw_castle_left", label: "Castle (Left)", asset_file_name: "border_dw_castle_left.png" },
    { id: "dw_castle_right", label: "Castle (Right)", asset_file_name: "border_dw_castle_right.png" },
    { id: "dw_castle_right_gold", label: "Castle (Right) [Gold]", asset_file_name: "border_dw_castle_right_gold.png" },
    { id: "dw_castle_top", label: "Castle (Top)", asset_file_name: "border_dw_castle_top.png" },
    { id: "dw_castletown", label: "Castle Town", asset_file_name: "border_dw_castletown.png" },
    { id: "dw_church_a", label: "Church A", asset_file_name: "border_dw_church_a.png" },
    { id: "dw_church_b", label: "Church B", asset_file_name: "border_dw_church_b.png" },
    { id: "dw_church_c", label: "Church C", asset_file_name: "border_dw_church_c.png" },
    { id: "dw_city", label: "Cyber City", asset_file_name: "border_dw_city.png" },
    { id: "dw_cyber", label: "A Cyber's World", asset_file_name: "border_dw_cyber.png" },
    { id: "dw_garden", label: "Garden of Hopes & Dreams", asset_file_name: "border_dw_garden.png" },
    { id: "dw_garden_cliff", label: "Garden Cliff", asset_file_name: "border_dw_garden_cliff.png" },
    { id: "dw_garden_cliff_bottom", label: "Garden Cliff (Bottom)", asset_file_name: "border_dw_garden_cliff_bottom.png" },
    { id: "dw_garden_cliff_bottom_frame", label: "Garden Cliff (Bottom) [Frame]", asset_file_name: "border_dw_garden_cliff_bottom_frame.png" },
    { id: "dw_garden_cliff_frame", label: "Garden Cliff [Frame]", asset_file_name: "border_dw_garden_cliff_frame.png" },
    { id: "dw_garden_cliff_lattice", label: "Garden Cliff (Lattice)", asset_file_name: "border_dw_garden_cliff_lattice.png" },
    { id: "dw_garden_cliff_lattice_bottom", label: "Garden Cliff (Bottom Lattice)", asset_file_name: "border_dw_garden_cliff_lattice_bottom.png" },
    { id: "dw_green_room", label: "Green Room", asset_file_name: "border_dw_green_room.png" },
    { id: "dw_green_sloppy", label: "Sloppy Room", asset_file_name: "border_dw_green_sloppy.png" },
    { id: "dw_green_sloppy_z", label: "Sloppy Room [Alt]", asset_file_name: "border_dw_green_sloppy_z.png" },
    { id: "dw_mansion", label: "Pandora Palace", asset_file_name: "border_dw_mansion.png" },
    { id: "dw_pink", label: "Pink", asset_file_name: "border_dw_pink.png" },
    { id: "dw_pink_alt", label: "Pink [Alt]", asset_file_name: "border_dw_pink_alt.png" },
    { id: "dw_red_smiles", label: "Smiling Stars", asset_file_name: "border_dw_red_smiles.png" },
    { id: "dw_teevie", label: "TV World", asset_file_name: "border_dw_teevie.png" },
    { id: "dw_titan_base", label: "Titan", asset_file_name: "border_dw_titan_base.png" },
    { id: "dw_titan_eyes", label: "Titan Eyes", asset_file_name: "border_dw_titan_eyes.png" },
    { id: "dw_titan_eyes_red", label: "Titan Eyes (Red)", asset_file_name: "border_dw_titan_eyes_red.png" },
    { id: "dw_tv_black", label: "TV", asset_file_name: "border_dw_tv_black.png" },
    { id: "dw_tv_blue", label: "TV (Blue)", asset_file_name: "border_dw_tv_blue.png" },
    { id: "dw_tv_meta", label: "TV Room", asset_file_name: "border_dw_tv_meta.png" },
    { id: "dw_word", label: "Word", asset_file_name: "border_dw_word.png" },
    { id: "lw_town", label: "Hometown", asset_file_name: "border_lw_town.png" },
    { id: "lw_town_morning", label: "Hometown (Sunrise)", asset_file_name: "border_lw_town_morning.png" },
    { id: "lw_town_sunset", label: "Hometown (Sunset)", asset_file_name: "border_lw_town_sunset.png" },
    { id: "lw_town_night", label: "Hometown (Night)", asset_file_name: "border_lw_town_night.png" },
  ];
  // Do not prefetch every chapter while loading the chapter select. The chapter
  // select should only preload its own runner/game files plus the shared audio
  // pack; prefetching chapter1-5 here balloons startup to hundreds of files.
  const chapter_select_prefetch_scopes = [];

  let loading_screen = null;
  let status_element = null;
  let timer_element = null;
  let intro_element = null;
  let progress_bar = null;
  let gif_element = null;
  let stage_element = null;
  let loader_ui_element = null;
  let game_container = null;
  let loader_started = false;
  let loader_hidden = false;
  let current_loader_progress_percent = 0;
  let loader_run_promise = null;
  let gate_loader_promise = null;
  let sharedstatsloaderpromise = null;
  let pendingscopestatssession = null;
  let startedscopestatssessionid = "";
  let protected_asset_interceptors_installed = false;
  let verified_gate_result = null;
  let play_sessions = new Map();
  let protected_asset_urls = new Map();
  let preload_timer_state = null;
  let preload_timer_interval_id = null;
  let preload_timer_last_text_update_ms = 0;
  let preload_timer_override_text = "";
  let base_module_template = null;
  let base_window_error_handler = null;
  let shared_audio_pack_enabled = true;
  let shared_audio_pack_promise = null;
  let shared_audio_pack_member_paths = null;
  let shared_audio_pack_member_paths_promise = null;
  let shared_audio_pack_object_urls_ready = false;
  let shared_audio_pack_object_urls_promise = null;
  let shared_audio_pack_memory_entries = null;
  let shared_audio_pack_fs_ready = false;
  let protected_audio_memory_entries = new Map();
  let protected_audio_fs_ready = false;
  let non_chunkable_protected_assets = new Set();
  let preload_eta_manifest_promise = null;
  let fullscreen_bridge_installed = false;
  let game_border_stage = null;
  let original_ensure_aspect_ratio = null;
  let live_native_game_border_id = "";
  let live_native_game_border_alpha = 0;
  let game_border_preload_promise = null;
  const preloaded_game_border_images = [];
  let shoulder_shortcut_frame_id = 0;
  let shoulder_escape_held = false;
  const last_shoulder_button_state = new Map();
  const native_game_border_sprite_to_option_id = new Map([
    ["bg_border_line_1080", "line_1080"],
    ["border_line_1080", "line_1080"],
    ["border_dark", "dw_castletown"],
    ["border_light", "lw_town"],
    ["border_dw_blue", "dw_blue"],
    ["border_dw_blue_0", "dw_blue"],
    ["border_dw_blue.png", "dw_blue"],
    ["border_dw_blue_light", "dw_blue_light"],
    ["border_dw_blue_light_0", "dw_blue_light"],
    ["border_dw_blue_light.png", "dw_blue_light"],
    ["border_dw_blue_stars", "dw_blue_stars"],
    ["border_dw_blue_stars_0", "dw_blue_stars"],
    ["border_dw_blue_stars.png", "dw_blue_stars"],
    ["border_dw_castle_cafe", "dw_castle_cafe"],
    ["border_dw_castle_cafe_0", "dw_castle_cafe"],
    ["border_dw_castle_cafe.png", "dw_castle_cafe"],
    ["border_dw_castle_left", "dw_castle_left"],
    ["border_dw_castle_left_0", "dw_castle_left"],
    ["border_dw_castle_left.png", "dw_castle_left"],
    ["border_dw_castle_right", "dw_castle_right"],
    ["border_dw_castle_right_0", "dw_castle_right"],
    ["border_dw_castle_right.png", "dw_castle_right"],
    ["border_dw_castle_right_gold", "dw_castle_right_gold"],
    ["border_dw_castle_right_gold_0", "dw_castle_right_gold"],
    ["border_dw_castle_right_gold.png", "dw_castle_right_gold"],
    ["border_dw_castle_top", "dw_castle_top"],
    ["border_dw_castle_top_0", "dw_castle_top"],
    ["border_dw_castle_top.png", "dw_castle_top"],
    ["border_dw_castletown", "dw_castletown"],
    ["border_dw_castletown_0", "dw_castletown"],
    ["border_dw_castletown.png", "dw_castletown"],
    ["border_dw_church_a", "dw_church_a"],
    ["border_dw_church_a_0", "dw_church_a"],
    ["border_dw_church_a.png", "dw_church_a"],
    ["border_dw_church_b", "dw_church_b"],
    ["border_dw_church_b_0", "dw_church_b"],
    ["border_dw_church_b.png", "dw_church_b"],
    ["border_dw_church_c", "dw_church_c"],
    ["border_dw_church_c_0", "dw_church_c"],
    ["border_dw_church_c.png", "dw_church_c"],
    ["border_dw_city", "dw_city"],
    ["border_dw_city_0", "dw_city"],
    ["border_dw_city.png", "dw_city"],
    ["border_dw_cyber", "dw_cyber"],
    ["border_dw_cyber_0", "dw_cyber"],
    ["border_dw_cyber.png", "dw_cyber"],
    ["border_dw_garden", "dw_garden"],
    ["border_dw_garden_0", "dw_garden"],
    ["border_dw_garden.png", "dw_garden"],
    ["border_dw_garden_cliff", "dw_garden_cliff"],
    ["border_dw_garden_cliff_0", "dw_garden_cliff"],
    ["border_dw_garden_cliff.png", "dw_garden_cliff"],
    ["border_dw_garden_cliff_bottom", "dw_garden_cliff_bottom"],
    ["border_dw_garden_cliff_bottom_0", "dw_garden_cliff_bottom"],
    ["border_dw_garden_cliff_bottom.png", "dw_garden_cliff_bottom"],
    ["border_dw_garden_cliff_bottom_frame", "dw_garden_cliff_bottom_frame"],
    ["border_dw_garden_cliff_bottom_frame_0", "dw_garden_cliff_bottom_frame"],
    ["border_dw_garden_cliff_bottom_frame.png", "dw_garden_cliff_bottom_frame"],
    ["border_dw_garden_cliff_frame", "dw_garden_cliff_frame"],
    ["border_dw_garden_cliff_frame_0", "dw_garden_cliff_frame"],
    ["border_dw_garden_cliff_frame.png", "dw_garden_cliff_frame"],
    ["border_dw_garden_cliff_lattice", "dw_garden_cliff_lattice"],
    ["border_dw_garden_cliff_lattice_0", "dw_garden_cliff_lattice"],
    ["border_dw_garden_cliff_lattice.png", "dw_garden_cliff_lattice"],
    ["border_dw_garden_cliff_lattice_bottom", "dw_garden_cliff_lattice_bottom"],
    ["border_dw_garden_cliff_lattice_bottom_0", "dw_garden_cliff_lattice_bottom"],
    ["border_dw_garden_cliff_lattice_bottom.png", "dw_garden_cliff_lattice_bottom"],
    ["border_dw_green_room", "dw_green_room"],
    ["border_dw_green_room_0", "dw_green_room"],
    ["border_dw_green_room.png", "dw_green_room"],
    ["border_dw_green_sloppy", "dw_green_sloppy"],
    ["border_dw_green_sloppy_0", "dw_green_sloppy"],
    ["border_dw_green_sloppy.png", "dw_green_sloppy"],
    ["border_dw_green_sloppy_z", "dw_green_sloppy_z"],
    ["border_dw_green_sloppy_z_0", "dw_green_sloppy_z"],
    ["border_dw_green_sloppy_z.png", "dw_green_sloppy_z"],
    ["border_dw_mansion", "dw_mansion"],
    ["border_dw_mansion_0", "dw_mansion"],
    ["border_dw_mansion.png", "dw_mansion"],
    ["border_dw_pink", "dw_pink"],
    ["border_dw_pink_0", "dw_pink"],
    ["border_dw_pink.png", "dw_pink"],
    ["border_dw_pink_alt", "dw_pink_alt"],
    ["border_dw_pink_alt_0", "dw_pink_alt"],
    ["border_dw_pink_alt.png", "dw_pink_alt"],
    ["border_dw_red_smiles", "dw_red_smiles"],
    ["border_dw_red_smiles_0", "dw_red_smiles"],
    ["border_dw_red_smiles.png", "dw_red_smiles"],
    ["border_dw_teevie", "dw_teevie"],
    ["border_dw_teevie_0", "dw_teevie"],
    ["border_dw_teevie.png", "dw_teevie"],
    ["border_dw_titan_base", "dw_titan_base"],
    ["border_dw_titan_base_0", "dw_titan_base"],
    ["border_dw_titan_base.png", "dw_titan_base"],
    ["border_dw_titan_eyes", "dw_titan_eyes"],
    ["border_dw_titan_eyes_0", "dw_titan_eyes"],
    ["border_dw_titan_eyes.png", "dw_titan_eyes"],
    ["border_dw_titan_eyes_red", "dw_titan_eyes_red"],
    ["border_dw_titan_eyes_red_0", "dw_titan_eyes_red"],
    ["border_dw_titan_eyes_red.png", "dw_titan_eyes_red"],
    ["border_dw_tv_black", "dw_tv_black"],
    ["border_dw_tv_black_0", "dw_tv_black"],
    ["border_dw_tv_black.png", "dw_tv_black"],
    ["border_dw_tv_blue", "dw_tv_blue"],
    ["border_dw_tv_blue_0", "dw_tv_blue"],
    ["border_dw_tv_blue.png", "dw_tv_blue"],
    ["border_dw_tv_meta", "dw_tv_meta"],
    ["border_dw_tv_meta_0", "dw_tv_meta"],
    ["border_dw_tv_meta.png", "dw_tv_meta"],
    ["border_dw_word", "dw_word"],
    ["border_dw_word_0", "dw_word"],
    ["border_dw_word.png", "dw_word"],
    ["border_line_1080_0", "line_1080"],
    ["border_line_1080.png", "line_1080"],
    ["border_lw_town", "lw_town"],
    ["border_lw_town_0", "lw_town"],
    ["border_lw_town.png", "lw_town"],
    ["border_lw_town_morning", "lw_town_morning"],
    ["border_lw_town_morning_0", "lw_town_morning"],
    ["border_lw_town_morning.png", "lw_town_morning"],
    ["border_lw_town_night", "lw_town_night"],
    ["border_lw_town_night_0", "lw_town_night"],
    ["border_lw_town_night.png", "lw_town_night"],
    ["border_lw_town_sunset", "lw_town_sunset"],
    ["border_lw_town_sunset_0", "lw_town_sunset"],
    ["border_lw_town_sunset.png", "lw_town_sunset"],
  ]);

  function clamp_number(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function get_path_segments() {
    return String(window.location.pathname ?? "")
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
  }

  function get_current_directory_segments() {
    const path_segments = get_path_segments();
    const pathname = String(window.location.pathname ?? "");
    const last_segment = path_segments[path_segments.length - 1] ?? "";
    const last_segment_is_file = !pathname.endsWith("/") && last_segment.includes(".");

    return last_segment_is_file ? path_segments.slice(0, -1) : path_segments;
  }

  function get_site_root_url() {
    return new URL("/", window.location.href);
  }

  function get_play_root_url() {
    const directory_segments = get_current_directory_segments();
    const play_index = directory_segments.indexOf("play");

    if (play_index === -1) {
      return get_site_root_url();
    }

    const play_root_path = `/${directory_segments.slice(0, play_index + 1).join("/")}/`;
    return new URL(play_root_path, window.location.origin);
  }

  function get_keys_endpoint() {
    const config = window.steam_verify_config ?? {};
    return String(config.keys_endpoint ?? default_keys_endpoint).trim().replace(/\/+$/, "");
  }

  function get_play_api_url() {
    return `${get_keys_endpoint()}/play`;
  }

  function normalize_play_scope(play_scope) {
    const scope_segments = String(play_scope ?? get_current_play_scope())
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (scope_segments.length === 0) {
      return "play";
    }

    if (scope_segments.every((segment) => segment === "play")) {
      return "play";
    }

    return scope_segments.join("/");
  }

  function get_current_play_scope() {
    const directory_segments = get_current_directory_segments();
    const play_index = directory_segments.indexOf("play");
    const scope_segments = play_index === -1
      ? directory_segments
      : directory_segments.slice(play_index + 1);

    if (scope_segments.length > 0 && scope_segments.every((segment) => segment === "play")) {
      return "play";
    }

    return scope_segments.length > 0 ? scope_segments.join("/") : "play";
  }

  function delay(duration_ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, duration_ms);
    });
  }


  function get_runtime_asset_path(asset_name, play_scope = get_current_play_scope()) {
    const normalized_asset_name = normalize_asset_path(asset_name);
    const normalized_play_scope = normalize_play_scope(play_scope);

    // Boss Rush ships its own runner/runtime bundle. Do not use the shared chapter
    // runtime cache for it, or the normal chapter runner.wasm can be reused.
    if (normalized_play_scope === "rush" || normalized_play_scope.startsWith("rush/")) {
      return normalized_asset_name;
    }

    if (normalized_asset_name === "runner.wasm" || normalized_asset_name === "audio-worklet.js") {
      return `common/chapters/${normalized_asset_name}`;
    }

    return normalized_asset_name;
  }

  function is_runtime_bundle_asset_path(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path).toLowerCase();
    return normalized_asset_path === "runner.js"
      || normalized_asset_path === "runner.data"
      || normalized_asset_path === "runner.wasm"
      || normalized_asset_path === "audio-worklet.js";
  }

  function should_scope_runtime_bundle_asset(asset_path, play_scope = get_current_play_scope()) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    return is_runtime_bundle_asset_path(asset_path)
      && (normalized_play_scope === "rush" || normalized_play_scope.startsWith("rush/"));
  }

  function get_protected_asset_memory_key(asset_path, play_scope = get_current_play_scope()) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);
    return should_scope_runtime_bundle_asset(normalized_asset_path, normalized_play_scope)
      ? `${normalized_play_scope}/${normalized_asset_path}`
      : normalized_asset_path;
  }

  function is_text_input_element(element) {
    return element instanceof HTMLElement && (
      element.matches("input, textarea, select")
      || element.isContentEditable
    );
  }

  function get_keyboard_dispatch_target() {
    const active_element = document.activeElement;

    if (is_text_input_element(active_element)) {
      return null;
    }

    const canvas_element = document.getElementById("canvas");

    if (canvas_element instanceof HTMLElement) {
      return canvas_element;
    }

    if (document.body instanceof HTMLElement) {
      return document.body;
    }

    if (document.documentElement instanceof HTMLElement) {
      return document.documentElement;
    }

    return document;
  }

  function apply_keyboard_event_legacy_fields(keyboard_event, key_code) {
    for (const property_name of ["keyCode", "which", "charCode"]) {
      try {
        Object.defineProperty(keyboard_event, property_name, {
          configurable: true,
          enumerable: true,
          get() {
            return property_name === "charCode" ? 0 : key_code;
          },
        });
      } catch (_define_error) {
      }
    }
  }

  function dispatch_synthetic_keyboard_event(event_type, key, code, key_code) {
    const dispatch_target = get_keyboard_dispatch_target();

    if (!dispatch_target) {
      return false;
    }

    const keyboard_event = new KeyboardEvent(event_type, {
      key,
      code,
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    apply_keyboard_event_legacy_fields(keyboard_event, key_code);
    return dispatch_target.dispatchEvent(keyboard_event);
  }

  function trigger_gamepad_f1_shortcut() {
    if (!dispatch_synthetic_keyboard_event("keydown", "F1", "F1", 112)) {
      return;
    }

    window.setTimeout(() => {
      dispatch_synthetic_keyboard_event("keyup", "F1", "F1", 112);
    }, 0);
  }

  function release_gamepad_escape_shortcut() {
    if (!shoulder_escape_held) {
      return;
    }

    shoulder_escape_held = false;
    dispatch_synthetic_keyboard_event("keyup", "Escape", "Escape", 27);
  }

  function tick_gamepad_shoulder_shortcuts() {
    const gamepads = typeof navigator.getGamepads === "function"
      ? (navigator.getGamepads() || [])
      : [];
    const connected_indices = new Set();

    for (const gamepad of gamepads) {
      if (!gamepad || !gamepad.connected) {
        continue;
      }

      connected_indices.add(gamepad.index);
      const buttons = gamepad.buttons || [];
      const current_state = {
        lb_pressed: Boolean(buttons[gamepad_escape_button_index] && buttons[gamepad_escape_button_index].pressed),
        rb_pressed: Boolean(buttons[gamepad_f1_button_index] && buttons[gamepad_f1_button_index].pressed),
      };
      const previous_state = last_shoulder_button_state.get(gamepad.index) || {
        lb_pressed: false,
        rb_pressed: false,
      };

      if (current_state.rb_pressed && !previous_state.rb_pressed) {
        trigger_gamepad_f1_shortcut();
      }

      if (current_state.lb_pressed && !previous_state.lb_pressed) {
        shoulder_escape_held = true;
        dispatch_synthetic_keyboard_event("keydown", "Escape", "Escape", 27);
      }

      last_shoulder_button_state.set(gamepad.index, current_state);
    }

    for (const gamepad_index of Array.from(last_shoulder_button_state.keys())) {
      if (!connected_indices.has(gamepad_index)) {
        last_shoulder_button_state.delete(gamepad_index);
      }
    }

    const any_escape_button_held = Array.from(last_shoulder_button_state.values()).some((state) => state.lb_pressed);

    if (!any_escape_button_held) {
      release_gamepad_escape_shortcut();
    }

    shoulder_shortcut_frame_id = window.requestAnimationFrame(tick_gamepad_shoulder_shortcuts);
  }

  function start_gamepad_shoulder_shortcuts() {
    if (shoulder_shortcut_frame_id !== 0 || typeof navigator.getGamepads !== "function") {
      return;
    }

    shoulder_shortcut_frame_id = window.requestAnimationFrame(tick_gamepad_shoulder_shortcuts);
  }

  function read_local_storage_boolean(storage_key) {
    try {
      return localStorage.getItem(storage_key) === "true";
    } catch (_storage_error) {
      return false;
    }
  }

  function read_local_storage_string(storage_key) {
    try {
      return String(localStorage.getItem(storage_key) || "");
    } catch (_storage_error) {
      return "";
    }
  }

  function get_console_family_preference() {
    const console_family = read_local_storage_string(console_family_storage_key);
    return console_family === "xbox" || console_family === "playstation"
      ? console_family
      : "";
  }

  function get_game_border_index_by_id(border_id) {
    const normalized_border_id = String(border_id || "").trim() === "default"
      ? "dynamic"
      : String(border_id || "").trim();
    return game_border_options.findIndex((option) => option.id === normalized_border_id);
  }

  function get_selected_game_border_id() {
    const selected_border_id = read_local_storage_string(game_border_storage_key);
    return get_game_border_index_by_id(selected_border_id) >= 0
      ? (selected_border_id === "default" ? "dynamic" : selected_border_id)
      : game_border_options[0].id;
  }

  function get_selected_game_border() {
    const border_index = Math.max(0, get_game_border_index_by_id(get_selected_game_border_id()));
    return game_border_options[border_index] ?? game_border_options[0];
  }

  function write_selected_game_border_id(border_id) {
    const normalized_border_id = get_game_border_index_by_id(border_id) >= 0
      ? border_id
      : game_border_options[0].id;

    try {
      localStorage.setItem(game_border_storage_key, normalized_border_id);
    } catch (_storage_error) {
    }

    return normalized_border_id;
  }

  function get_game_border_asset_url(border_option) {
    const asset_file_name = String(border_option?.asset_file_name || "").trim();
    return asset_file_name ? to_root_relative(`play/common/borders/${asset_file_name}`) : "";
  }

  function get_game_border_asset_paths_to_preload() {
    return game_border_options
      .map((border_option) => String(border_option?.asset_file_name || "").trim())
      .filter(Boolean)
      .map((asset_file_name) => `common/borders/${asset_file_name}`);
  }

  function get_game_border_asset_urls_to_preload() {
    return game_border_options
      .map((border_option) => get_game_border_asset_url(border_option))
      .filter(Boolean);
  }

  function is_game_border_asset_path(asset_path) {
    return normalize_asset_path(asset_path).toLowerCase().startsWith("common/borders/");
  }

  function log_loader_cache_debug(message, details = {}) {
    try {
      console.debug(`[loader] ${message}`, details);
    } catch (_debug_error) {
    }
  }

  function preload_game_border_assets() {
    if (game_border_preload_promise) {
      return game_border_preload_promise;
    }

    const border_asset_urls = Array.from(new Set(get_game_border_asset_urls_to_preload()));

    // Warm every border image in the browser image cache/decoder. This runs in
    // the background so changing a fixed border, or dynamic borders popping in
    // from game state, can swap to an already-decoded image instead of waiting
    // on a network/cache read and first decode at the moment of display.
    game_border_preload_promise = Promise.allSettled(
      border_asset_urls.map((asset_url) => new Promise((resolve) => {
        try {
          const preload_link = document.createElement("link");
          preload_link.rel = "preload";
          preload_link.as = "image";
          preload_link.href = asset_url;
          document.head?.appendChild(preload_link);
        } catch (_link_error) {
        }

        const image = new Image();
        let settled = false;
        const settle = (result) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(result);
        };

        image.decoding = "async";
        image.loading = "eager";
        image.onload = () => {
          if (typeof image.decode === "function") {
            image.decode().then(() => settle(true)).catch(() => settle(true));
          } else {
            settle(true);
          }
        };
        image.onerror = () => settle(false);
        image.src = asset_url;

        if (typeof image.decode === "function") {
          image.decode().then(() => settle(true)).catch(() => {});
        }

        preloaded_game_border_images.push(image);
      })),
    ).then(() => true);

    return game_border_preload_promise;
  }

  function get_native_game_border_option_id_by_sprite_name(sprite_name) {
    return native_game_border_sprite_to_option_id.get(String(sprite_name ?? "").trim()) || "";
  }

  function parse_game_border_log_boolean(value) {
    const normalized_value = String(value ?? "").trim().toLowerCase();
    return normalized_value === "1" || normalized_value === "true";
  }

  function parse_game_border_log_number(value, fallback = 0) {
    const parsed_value = Number(value);
    return Number.isFinite(parsed_value) ? parsed_value : fallback;
  }

  function parse_native_game_border_log_message(message) {
    const normalized_message = String(message ?? "");

    if (!normalized_message.startsWith("webborder|")) {
      return null;
    }

    const details = {};
    const fields = normalized_message.slice("webborder|".length).split("|");

    for (const field of fields) {
      const separator_index = field.indexOf("=");

      if (separator_index <= 0) {
        continue;
      }

      const key = field.slice(0, separator_index).trim().toLowerCase();
      const value = field.slice(separator_index + 1).trim();

      if (key) {
        details[key] = value;
      }
    }

    return details;
  }

  function get_native_game_border_option_id_from_log(details) {
    if (!details) {
      return "";
    }

    const normalized_event = String(details.event ?? "").trim().toLowerCase();
    const normalized_mode = String(details.mode ?? "").trim().toLowerCase();
    const normalized_base = String(details.base ?? "").trim().toLowerCase();
    const normalized_layer = String(details.layer ?? "").trim().toLowerCase();
    const has_explicit_none_base = !normalized_base || normalized_base === "none";
    const has_explicit_none_layer = !normalized_layer || normalized_layer === "none" || normalized_layer === "-4";

    if (normalized_mode === "simple" || normalized_mode === "シンプル") {
      return "line";
    }

    const layer_option_id = get_native_game_border_option_id_by_sprite_name(details.layer);

    if (layer_option_id === "dw_titan_eyes" && parse_game_border_log_number(details.red, 0) > 0.01) {
      return "dw_titan_eyes_red";
    }

    if (layer_option_id) {
      return layer_option_id;
    }

    const base_option_id = get_native_game_border_option_id_by_sprite_name(details.base);

    if (base_option_id) {
      return base_option_id;
    }

    if (
      normalized_event === "skip"
      || normalized_event === "disable"
      || (!parse_game_border_log_boolean(details.active) && has_explicit_none_base && has_explicit_none_layer)
    ) {
      return "";
    }

    return "";
  }

  function handle_native_game_border_log_message(message) {
    const details = parse_native_game_border_log_message(message);

    if (!details) {
      return false;
    }

    // Only the native border state/hide events are authoritative for web border
    // art. Other webborder messages are diagnostic/control chatter; swallow
    // them so they do not update the loader status or accidentally resize/swap
    // borders.
    const normalized_border_event = String(details.event ?? "").trim().toLowerCase();
    if (normalized_border_event !== "state" && normalized_border_event !== "hide") {
      return true;
    }

    const previous_native_game_border_alpha = clamp_number(live_native_game_border_alpha, 0, 1);
    const is_hide_border_event = normalized_border_event === "hide";
    const next_native_game_border_alpha = is_hide_border_event
      ? 0
      : clamp_number(parse_game_border_log_number(details.alpha, 1), 0, 1);

    // A hide event is an explicit command to remove the active native/dynamic
    // web border. Do not keep the previous/base sprite around with opacity 0,
    // because that still leaves the dynamic border layout active in some paths.
    live_native_game_border_id = is_hide_border_event ? "" : get_native_game_border_option_id_from_log(details);
    live_native_game_border_alpha = next_native_game_border_alpha;

    if (get_selected_game_border_id() === "dynamic") {
      refresh_selected_game_border_layout(
        should_animate_dynamic_native_game_border_transition(
          previous_native_game_border_alpha,
          next_native_game_border_alpha,
        ),
      );
    }

    return true;
  }

  function get_effective_game_border() {
    const selected_border = get_selected_game_border();

    if (selected_border.id !== "dynamic") {
      return selected_border;
    }

    const live_native_border_index = get_game_border_index_by_id(live_native_game_border_id);
    return live_native_border_index >= 0
      ? game_border_options[live_native_border_index]
      : selected_border;
  }

  function get_effective_game_border_alpha() {
    return get_selected_game_border().id === "dynamic"
      ? clamp_number(live_native_game_border_alpha, 0, 1)
      : 1;
  }

  function can_apply_dynamic_native_game_border_layout() {
    return get_selected_game_border().id === "dynamic";
  }

  function should_animate_dynamic_native_game_border_alpha(alpha_value) {
    const normalized_alpha = clamp_number(Number(alpha_value), 0, 1);
    return normalized_alpha > 0.001 && normalized_alpha < 0.999;
  }

  function should_animate_dynamic_native_game_border_transition(previous_alpha_value, next_alpha_value) {
    return (
      should_animate_dynamic_native_game_border_alpha(previous_alpha_value)
      || should_animate_dynamic_native_game_border_alpha(next_alpha_value)
    );
  }

  function get_game_border_button_label() {
    return `Border: ${get_selected_game_border().label}`;
  }

  function get_device_profile_preference() {
    const device_profile = read_local_storage_string(device_profile_storage_key);
    return device_profile === "console" || device_profile === "mobile"
      ? device_profile
      : "desktop";
  }

  function is_offline_mode_active() {
    return read_local_storage_boolean(offline_mode_storage_key)
      || read_local_storage_boolean(offline_mode_download_storage_key);
  }

  function get_audio_caching_mode() {
    const mode = read_local_storage_string(audio_caching_mode_storage_key).toLowerCase();
    return mode === "off" || mode === "skip" || mode === "noaudio" ? mode : "on";
  }

  function should_use_shared_audio_pack() {
    return get_audio_caching_mode() === "on";
  }

  function should_skip_manifest_music() {
    const mode = get_audio_caching_mode();
    return mode === "skip" || mode === "noaudio";
  }

  function should_disable_game_audio() {
    return get_audio_caching_mode() === "noaudio";
  }

  function is_manifest_music_asset(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path).toLowerCase();
    return normalized_asset_path.startsWith("mus/") && normalized_asset_path.endsWith(".ogg");
  }

  function is_manifest_audio_asset(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path).toLowerCase();
    return normalized_asset_path.endsWith(".ogg") && (
      normalized_asset_path.startsWith("mus/")
      || normalized_asset_path.startsWith("common/chapters/")
      || normalized_asset_path.startsWith("snd_")
      || normalized_asset_path === "audio_intronoise.ogg"
    );
  }

  function is_console_runtime() {
    if (get_device_profile_preference() === "console" || get_console_family_preference()) {
      return true;
    }

    return /Xbox|PlayStation/i.test(String(navigator.userAgent || ""));
  }

  function should_use_safe_console_runner_refresh() {
    return is_console_runtime();
  }

  function get_fullscreen_host() {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.toggleContainerFullscreen === "function") {
        return window.parent;
      }
    } catch (_error) {
    }

    return null;
  }

  function dispatch_synthetic_fullscreen_change() {
    for (const event_name of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"]) {
      try {
        document.dispatchEvent(new Event(event_name));
      } catch (_event_error) {
      }
    }
  }

  function install_fullscreen_bridge() {
    if (fullscreen_bridge_installed) {
      return;
    }

    fullscreen_bridge_installed = true;
    const element_prototype = window.Element?.prototype;
    const document_prototype = window.Document?.prototype;

    if (!element_prototype || !document_prototype) {
      return;
    }

    const original_request_fullscreen = element_prototype.requestFullscreen;
    const original_webkit_request_fullscreen = element_prototype.webkitRequestFullscreen;
    const original_moz_request_fullscreen = element_prototype.mozRequestFullScreen;
    const original_ms_request_fullscreen = element_prototype.msRequestFullscreen;
    const original_exit_fullscreen = document_prototype.exitFullscreen;
    const original_webkit_exit_fullscreen = document_prototype.webkitExitFullscreen;
    const original_moz_cancel_fullscreen = document_prototype.mozCancelFullScreen;
    const original_ms_exit_fullscreen = document_prototype.msExitFullscreen;

    async function request_container_fullscreen_or_fallback(target, native_method, args) {
      const fullscreen_host = get_fullscreen_host();

      if (fullscreen_host) {
        try {
          const is_container_fullscreen = typeof fullscreen_host.isContainerFullscreen === "function"
            ? Boolean(fullscreen_host.isContainerFullscreen())
            : false;

          if (!is_container_fullscreen) {
            await fullscreen_host.toggleContainerFullscreen();
          }

          dispatch_synthetic_fullscreen_change();
          return;
        } catch (error) {
          console.warn("Unable to route fullscreen through the container host:", error);
        }
      }

      if (typeof native_method === "function") {
        return native_method.apply(target, args);
      }
    }

    async function exit_container_fullscreen_or_fallback(target, native_method, args) {
      const fullscreen_host = get_fullscreen_host();

      if (fullscreen_host) {
        try {
          const is_container_fullscreen = typeof fullscreen_host.isContainerFullscreen === "function"
            ? Boolean(fullscreen_host.isContainerFullscreen())
            : false;

          if (is_container_fullscreen) {
            await fullscreen_host.toggleContainerFullscreen();
          }

          dispatch_synthetic_fullscreen_change();
          return;
        } catch (error) {
          console.warn("Unable to exit container fullscreen through the host:", error);
        }
      }

      if (typeof native_method === "function") {
        return native_method.apply(target, args);
      }
    }

    if (typeof original_request_fullscreen === "function") {
      element_prototype.requestFullscreen = function request_fullscreen_via_container(...args) {
        return request_container_fullscreen_or_fallback(this, original_request_fullscreen, args);
      };
    }

    if (typeof original_webkit_request_fullscreen === "function") {
      element_prototype.webkitRequestFullscreen = function webkit_request_fullscreen_via_container(...args) {
        return request_container_fullscreen_or_fallback(this, original_webkit_request_fullscreen, args);
      };
    }

    if (typeof original_moz_request_fullscreen === "function") {
      element_prototype.mozRequestFullScreen = function moz_request_fullscreen_via_container(...args) {
        return request_container_fullscreen_or_fallback(this, original_moz_request_fullscreen, args);
      };
    }

    if (typeof original_ms_request_fullscreen === "function") {
      element_prototype.msRequestFullscreen = function ms_request_fullscreen_via_container(...args) {
        return request_container_fullscreen_or_fallback(this, original_ms_request_fullscreen, args);
      };
    }

    if (typeof original_exit_fullscreen === "function") {
      document_prototype.exitFullscreen = function exit_fullscreen_via_container(...args) {
        return exit_container_fullscreen_or_fallback(this, original_exit_fullscreen, args);
      };
    }

    if (typeof original_webkit_exit_fullscreen === "function") {
      document_prototype.webkitExitFullscreen = function webkit_exit_fullscreen_via_container(...args) {
        return exit_container_fullscreen_or_fallback(this, original_webkit_exit_fullscreen, args);
      };
    }

    if (typeof original_moz_cancel_fullscreen === "function") {
      document_prototype.mozCancelFullScreen = function moz_cancel_fullscreen_via_container(...args) {
        return exit_container_fullscreen_or_fallback(this, original_moz_cancel_fullscreen, args);
      };
    }

    if (typeof original_ms_exit_fullscreen === "function") {
      document_prototype.msExitFullscreen = function ms_exit_fullscreen_via_container(...args) {
        return exit_container_fullscreen_or_fallback(this, original_ms_exit_fullscreen, args);
      };
    }
  }

  function to_root_relative(target_path) {
    return new URL(String(target_path ?? "").replace(/^\/+/, ""), get_site_root_url()).toString();
  }

  function to_play_root_relative(target_path) {
    return new URL(String(target_path ?? "").replace(/^\/+/, ""), get_play_root_url()).toString();
  }

  function normalize_asset_path(asset_path) {
    return String(asset_path ?? "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..")
      .join("/");
  }

  function is_audio_asset_path(asset_path) {
    return /\.(?:ogg|wav|mp3)$/i.test(normalize_asset_path(asset_path));
  }
  function normalize_runner_audio_request_path(asset_path) {
    const normalized_path = normalize_asset_path(asset_path);
    if (!/\.(?:ogg|wav|mp3)$/i.test(normalized_path)) {
      return normalized_path;
    }

    const lower_path = normalized_path.toLowerCase();
    const mus_index = lower_path.lastIndexOf("mus/");
    if (mus_index > 0) {
      return normalized_path.slice(mus_index);
    }

    return normalized_path;
  }


  function is_shared_chapter_common_asset(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path).toLowerCase();
    return normalized_asset_path.startsWith("common/chapters/")
      || normalized_asset_path.startsWith("common/chapter-common/")
      || normalized_asset_path.startsWith("shared/chapters/")
      || shared_chapter_common_asset_paths.has(normalized_asset_path);
  }

  function map_common_chapter_asset_path(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const lowercase_asset_path = normalized_asset_path.toLowerCase();

    if (lowercase_asset_path.startsWith("common/chapter-common/")) {
      return `common/chapters/${normalized_asset_path.split("/").pop()}`;
    }

    if (!lowercase_asset_path || lowercase_asset_path.startsWith("common/chapters/") || lowercase_asset_path.startsWith("shared/chapters/")) {
      return normalized_asset_path;
    }

    return shared_chapter_common_asset_paths.has(lowercase_asset_path)
      ? `common/chapters/${normalized_asset_path.split("/").pop()}`
      : normalized_asset_path;
  }

  function map_play_asset_path(asset_path, play_scope = get_current_play_scope()) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);

    // Boss Rush has its own runner.js/runner.data/runner.wasm bundle. These names
    // are otherwise chapter-common assets, but mapping rush runner.wasm to
    // common/chapters/runner.wasm pairs the rush runner.js with the normal chapter
    // wasm and causes Emscripten import LinkErrors (for example import "a" "Oh").
    if (should_scope_runtime_bundle_asset(normalized_asset_path, normalized_play_scope)) {
      return normalized_asset_path;
    }

    return map_common_chapter_asset_path(normalized_asset_path);
  }

  function remember_protected_audio_memory_entry(asset_path, asset_bytes) {
    const normalized_asset_path = map_common_chapter_asset_path(asset_path);
    const normalized_asset_bytes = asset_bytes instanceof Uint8Array
      ? asset_bytes
      : new Uint8Array(asset_bytes ?? []);

    if (!normalized_asset_path || !is_audio_asset_path(normalized_asset_path) || normalized_asset_bytes.byteLength === 0) {
      return false;
    }

    protected_audio_memory_entries.set(normalized_asset_path, normalized_asset_bytes);
    protected_audio_fs_ready = false;
    return true;
  }

  function register_protected_asset_url(asset_path, object_url, play_scope = get_current_play_scope()) {
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), play_scope);
    const memory_key = get_protected_asset_memory_key(normalized_asset_path, play_scope);

    if (!normalized_asset_path || !object_url) {
      return;
    }

    protected_asset_urls.set(memory_key, object_url);
    protected_asset_urls.set(memory_key.toLowerCase(), object_url);

    if (memory_key === normalized_asset_path) {
      protected_asset_urls.set(normalized_asset_path, object_url);
      protected_asset_urls.set(normalized_asset_path.toLowerCase(), object_url);
    }

    const lower_asset_path = normalized_asset_path.toLowerCase();
    const base_name = normalized_asset_path.split("/").pop();

    if (base_name && /\.(?:ogg|wav|mp3)$/i.test(normalized_asset_path)) {
      protected_asset_urls.set(base_name, object_url);
      protected_asset_urls.set(base_name.toLowerCase(), object_url);
      protected_asset_urls.set(`assets/${base_name}`, object_url);
      protected_asset_urls.set(`assets/${base_name.toLowerCase()}`, object_url);

      if (lower_asset_path.startsWith("mus/")) {
        protected_asset_urls.set(`assets/mus/${base_name}`, object_url);
        protected_asset_urls.set(`assets/mus/${base_name.toLowerCase()}`, object_url);
      }

      if (lower_asset_path.startsWith("common/chapters/")) {
        protected_asset_urls.set(`common/chapters/${base_name}`, object_url);
        protected_asset_urls.set(`common/chapters/${base_name.toLowerCase()}`, object_url);
        protected_asset_urls.set(`common/chapter-common/${base_name}`, object_url);
        protected_asset_urls.set(`common/chapter-common/${base_name.toLowerCase()}`, object_url);
        protected_asset_urls.set(`../common/chapters/${base_name}`, object_url);
        protected_asset_urls.set(`../common/chapters/${base_name.toLowerCase()}`, object_url);
        protected_asset_urls.set(`../common/chapter-common/${base_name}`, object_url);
        protected_asset_urls.set(`../common/chapter-common/${base_name.toLowerCase()}`, object_url);
        protected_asset_urls.set(`assets/common/chapters/${base_name}`, object_url);
        protected_asset_urls.set(`assets/common/chapters/${base_name.toLowerCase()}`, object_url);
        protected_asset_urls.set(`assets/common/chapter-common/${base_name}`, object_url);
        protected_asset_urls.set(`assets/common/chapter-common/${base_name.toLowerCase()}`, object_url);
      }
    }
  }

  function ensure_game_border_stage() {
    if (game_border_stage instanceof HTMLElement && game_border_stage.isConnected) {
      return game_border_stage;
    }

    const current_game_container = document.getElementById("game-container");

    if (!(current_game_container instanceof HTMLElement)) {
      return null;
    }

    let next_game_border_stage = document.getElementById("game-border-stage");

    if (!(next_game_border_stage instanceof HTMLElement)) {
      next_game_border_stage = document.createElement("div");
      next_game_border_stage.id = "game-border-stage";
      current_game_container.insertBefore(next_game_border_stage, current_game_container.firstChild);
    }

    game_border_stage = next_game_border_stage;
    return game_border_stage;
  }

  function clear_game_border_canvas_layout(canvas_element) {
    if (!(canvas_element instanceof HTMLCanvasElement)) {
      return;
    }

    canvas_element.style.transition = "";
    canvas_element.style.left = "";
    canvas_element.style.top = "";
    canvas_element.style.transform = "";
    canvas_element.style.width = "";
    canvas_element.style.height = "";
    canvas_element.style.margin = "";
  }

  function get_canvas_fullscreen_layout_rect(canvas_element) {
    if (!(canvas_element instanceof HTMLCanvasElement)) {
      return null;
    }

    const viewport_width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const viewport_height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const starting_width = Number(window.startingWidth) || Number(canvas_element.width) || game_border_frame_width;
    const starting_height = Number(window.startingHeight) || Number(canvas_element.height) || game_border_frame_height;

    if (!(starting_width > 0) || !(starting_height > 0)) {
      return null;
    }

    const starting_aspect = Number(window.startingAspect) > 0
      ? Number(window.startingAspect)
      : (starting_width / starting_height);
    let canvas_width = viewport_width;
    let canvas_height = Math.round(canvas_width / starting_aspect);

    if (canvas_height > viewport_height) {
      canvas_height = viewport_height;
      canvas_width = Math.round(canvas_height * starting_aspect);
    }

    const canvas_left = Math.round((viewport_width - canvas_width) / 2);
    const canvas_top = Math.round((viewport_height - canvas_height) / 2);
    return {
      left: canvas_left,
      top: canvas_top,
      width: Math.round(canvas_width),
      height: Math.round(canvas_height),
    };
  }

  function get_canvas_aspect_fit_layout_rect(canvas_element) {
    if (!(canvas_element instanceof HTMLCanvasElement)) {
      return null;
    }

    const viewport_width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const viewport_height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const starting_width = Number(window.startingWidth) || Number(canvas_element.width) || game_border_frame_width;
    const starting_height = Number(window.startingHeight) || Number(canvas_element.height) || game_border_frame_height;

    if (!(starting_width > 0) || !(starting_height > 0)) {
      return null;
    }

    const aspect = starting_width / starting_height;
    let canvas_width = viewport_width;
    let canvas_height = Math.round(canvas_width / aspect);

    if (canvas_height > viewport_height) {
      canvas_height = viewport_height;
      canvas_width = Math.round(canvas_height * aspect);
    }

    return {
      left: Math.round((viewport_width - canvas_width) / 2),
      top: Math.round((viewport_height - canvas_height) / 2),
      width: Math.round(canvas_width),
      height: Math.round(canvas_height),
    };
  }

  function get_border_frame_layout_rect() {
    const viewport_width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || game_border_stage_width);
    const viewport_height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || game_border_stage_height);
    const stage_scale = Math.min(viewport_width / game_border_stage_width, viewport_height / game_border_stage_height);
    const stage_width = Math.round(game_border_stage_width * stage_scale);
    const stage_height = Math.round(game_border_stage_height * stage_scale);
    const stage_left = Math.round((viewport_width - stage_width) / 2);
    const stage_top = Math.round((viewport_height - stage_height) / 2);
    const frame_width = Math.round(game_border_frame_width * stage_scale);
    const frame_height = Math.round(game_border_frame_height * stage_scale);
    const frame_left = stage_left + Math.round(((game_border_stage_width - game_border_frame_width) / 2) * stage_scale);
    const frame_top = stage_top + Math.round(((game_border_stage_height - game_border_frame_height) / 2) * stage_scale);

    return {
      stage_left,
      stage_top,
      stage_width,
      stage_height,
      frame_left,
      frame_top,
      frame_width,
      frame_height,
    };
  }

  function interpolate_canvas_layout_rect(progress, from_rect, to_rect) {
    const normalized_progress = clamp_number(progress, 0, 1);
    const lerp = (from_value, to_value) => Math.round(from_value + ((to_value - from_value) * normalized_progress));
    return {
      left: lerp(from_rect.left, to_rect.left),
      top: lerp(from_rect.top, to_rect.top),
      width: lerp(from_rect.width, to_rect.width),
      height: lerp(from_rect.height, to_rect.height),
    };
  }

  function apply_canvas_layout_rect(canvas_element, layout_rect, transition_text = "") {
    if (!(canvas_element instanceof HTMLCanvasElement) || !layout_rect) {
      return false;
    }

    canvas_element.style.transition = transition_text;
    canvas_element.classList.add("active");
    canvas_element.style.left = `${layout_rect.left}px`;
    canvas_element.style.top = `${layout_rect.top}px`;
    canvas_element.style.transform = "none";
    canvas_element.style.width = `${layout_rect.width}px`;
    canvas_element.style.height = `${layout_rect.height}px`;
    canvas_element.style.margin = "0";
    return true;
  }

  function apply_centered_canvas_layout(canvas_element, layout_rect, transition_text = "") {
    if (!(canvas_element instanceof HTMLCanvasElement) || !layout_rect) {
      return false;
    }

    canvas_element.style.transition = transition_text;
    canvas_element.classList.add("active");
    canvas_element.style.position = "absolute";
    canvas_element.style.left = "50%";
    canvas_element.style.top = "50%";
    canvas_element.style.transform = "translate(-50%, -50%)";
    canvas_element.style.width = `${layout_rect.width}px`;
    canvas_element.style.height = `${layout_rect.height}px`;
    canvas_element.style.margin = "0";
    return true;
  }

  function apply_selected_game_border_layout(should_animate_dynamic_transition = false) {
    const current_game_container = game_container instanceof HTMLElement
      ? game_container
      : document.getElementById("game-container");
    const canvas_element = window.canvasElement instanceof HTMLCanvasElement
      ? window.canvasElement
      : document.getElementById("canvas");

    if (!(current_game_container instanceof HTMLElement) || !(canvas_element instanceof HTMLCanvasElement)) {
      return false;
    }

    const selected_border = get_effective_game_border();
    const border_alpha = get_effective_game_border_alpha();
    const border_asset_url = get_game_border_asset_url(selected_border);
    const border_stage_node = ensure_game_border_stage();
    const is_dynamic_border_layout = can_apply_dynamic_native_game_border_layout();
    const has_visible_native_border_layout = is_dynamic_border_layout
      && Boolean(live_native_game_border_id)
      && border_alpha > 0.001;
    const should_use_borderless_dynamic_layout = is_dynamic_border_layout && !Boolean(live_native_game_border_id);
    const should_hide_dynamic_border_art = is_dynamic_border_layout && border_alpha <= 0.001;
    const border_frame_layout = get_border_frame_layout_rect();

    if (!(border_stage_node instanceof HTMLElement) || !border_asset_url || should_use_borderless_dynamic_layout) {
      current_game_container.classList.remove("has-game-border");

      if (border_stage_node instanceof HTMLElement) {
        border_stage_node.style.backgroundImage = "";
        border_stage_node.style.opacity = "";
        border_stage_node.style.transition = "";
        border_stage_node.style.left = "";
        border_stage_node.style.top = "";
        border_stage_node.style.width = "";
        border_stage_node.style.height = "";
      }

      const no_border_layout_rect = get_canvas_aspect_fit_layout_rect(canvas_element);

      if (no_border_layout_rect) {
        return apply_centered_canvas_layout(
          canvas_element,
          no_border_layout_rect,
          should_animate_dynamic_transition
            ? "left 90ms linear, top 90ms linear, width 90ms linear, height 90ms linear"
            : "",
        );
      }

      clear_game_border_canvas_layout(canvas_element);
      return false;
    }

    current_game_container.classList.add("has-game-border");
    border_stage_node.style.transition = (is_dynamic_border_layout && should_animate_dynamic_transition)
      ? "opacity 90ms linear"
      : "";
    border_stage_node.style.left = `${border_frame_layout.stage_left}px`;
    border_stage_node.style.top = `${border_frame_layout.stage_top}px`;
    border_stage_node.style.width = `${border_frame_layout.stage_width}px`;
    border_stage_node.style.height = `${border_frame_layout.stage_height}px`;
    border_stage_node.style.backgroundImage = `url("${border_asset_url}")`;
    border_stage_node.style.opacity = should_hide_dynamic_border_art ? "0" : String(border_alpha);

    const no_border_layout_rect = is_dynamic_border_layout
      ? get_canvas_aspect_fit_layout_rect(canvas_element)
      : null;
    const target_canvas_layout_rect = is_dynamic_border_layout && no_border_layout_rect
      ? interpolate_canvas_layout_rect(border_alpha, no_border_layout_rect, {
        left: border_frame_layout.frame_left,
        top: border_frame_layout.frame_top,
        width: border_frame_layout.frame_width,
        height: border_frame_layout.frame_height,
      })
      : {
        left: border_frame_layout.frame_left,
        top: border_frame_layout.frame_top,
        width: border_frame_layout.frame_width,
        height: border_frame_layout.frame_height,
      };

    return apply_canvas_layout_rect(
      canvas_element,
      target_canvas_layout_rect,
      (is_dynamic_border_layout && should_animate_dynamic_transition)
        ? "left 90ms linear, top 90ms linear, width 90ms linear, height 90ms linear"
        : "",
    );
  }

  function refresh_selected_game_border_layout(should_animate_dynamic_transition = false) {
    if (apply_selected_game_border_layout(should_animate_dynamic_transition)) {
      return true;
    }

    if (typeof original_ensure_aspect_ratio === "function") {
      original_ensure_aspect_ratio();
      return true;
    }

    return false;
  }

  function refresh_game_border_menu_button() {
    const border_button = document.getElementById("colorpicker-trigger");

    if (!(border_button instanceof HTMLButtonElement)) {
      return false;
    }

    border_button.textContent = get_game_border_button_label();
    border_button.title = "Choose which border art appears around the game with left/right or confirm.";
    border_button.onclick = () => {
      adjust_game_border_selection(1);
      return false;
    };
    return true;
  }

  function adjust_game_border_selection(delta) {
    const option_count = game_border_options.length;

    if (option_count <= 0) {
      return false;
    }

    const current_index = Math.max(0, get_game_border_index_by_id(get_selected_game_border_id()));
    const normalized_delta = delta < 0 ? -1 : 1;
    const next_index = (current_index + normalized_delta + option_count) % option_count;
    const next_border = game_border_options[next_index] ?? game_border_options[0];

    if (!next_border || next_border.id === game_border_options[current_index]?.id) {
      return false;
    }

    write_selected_game_border_id(next_border.id);
    refresh_game_border_menu_button();
    refresh_selected_game_border_layout();
    return true;
  }

  function install_game_border_layout_bridge() {
    if (typeof window.ensureAspectRatio !== "function" || original_ensure_aspect_ratio) {
      refresh_game_border_menu_button();
      refresh_selected_game_border_layout();
      return;
    }

    original_ensure_aspect_ratio = window.ensureAspectRatio.bind(window);
    window.ensureAspectRatio = function ensure_aspect_ratio_with_game_border(...args) {
      if (apply_selected_game_border_layout(false)) {
        return;
      }

      return original_ensure_aspect_ratio(...args);
    };

    refresh_game_border_menu_button();
    refresh_selected_game_border_layout();
  }

  function encode_text(value) {
    return new TextEncoder().encode(String(value ?? ""));
  }

  function base64_to_array_buffer(value) {
    const binary = window.atob(String(value ?? ""));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
  }

  function concat_uint8_arrays(...arrays) {
    const total_length = arrays.reduce((running_total, array) => running_total + (array?.length ?? 0), 0);
    const combined = new Uint8Array(total_length);
    let offset = 0;

    for (const array of arrays) {
      const normalized_array = array instanceof Uint8Array ? array : new Uint8Array(array ?? []);
      combined.set(normalized_array, offset);
      offset += normalized_array.length;
    }

    return combined;
  }

  function combine_uint8_array_chunks(array_list) {
    const normalized_list = Array.isArray(array_list) ? array_list : [];
    const total_length = normalized_list.reduce((running_total, array) => running_total + (array?.byteLength ?? array?.length ?? 0), 0);
    const combined = new Uint8Array(total_length);
    let offset = 0;

    for (const array of normalized_list) {
      const normalized_array = array instanceof Uint8Array ? array : new Uint8Array(array ?? []);
      combined.set(normalized_array, offset);
      offset += normalized_array.byteLength;
    }

    return combined;
  }

  function is_shared_audio_pack_asset(asset_path) {
    return normalize_asset_path(asset_path) === shared_audio_pack_asset_path;
  }

  function normalize_shared_audio_request_url(resource) {
    let raw_url = "";

    try {
      raw_url = typeof resource === "string" ? resource : String(resource?.url || "");
    } catch (_error) {
      raw_url = "";
    }

    if (!raw_url) {
      return "";
    }

    let pathname = raw_url;

    try {
      pathname = new URL(raw_url, window.location.href).pathname;
    } catch (_error) {
      pathname = raw_url.split("?")[0].split("#")[0];
    }

    pathname = decodeURIComponent(String(pathname || "").replace(/\\/g, "/"));

    const play_index = pathname.toLowerCase().lastIndexOf("/play/");
    const relative_path = play_index >= 0
      ? pathname.slice(play_index + "/play/".length)
      : pathname.replace(/^\/+/, "");

    return map_common_chapter_asset_path(relative_path);
  }

  function is_shared_audio_pack_candidate(asset_path) {
    const normalized_asset_path = map_common_chapter_asset_path(asset_path).toLowerCase();
    return normalized_asset_path.startsWith("mus/") && normalized_asset_path.endsWith(".ogg");
  }

  function is_known_shared_audio_pack_member(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    return Boolean(
      normalized_asset_path
      && shared_audio_pack_member_paths instanceof Set
      && shared_audio_pack_member_paths.has(normalized_asset_path),
    );
  }

  function resolve_shared_audio_pack_member_path(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path);

    if (!normalized_asset_path) {
      return "";
    }

    if (shared_audio_pack_member_paths instanceof Set) {
      if (shared_audio_pack_member_paths.has(normalized_asset_path)) {
        return normalized_asset_path;
      }

      const lowercase_asset_path = normalized_asset_path.toLowerCase();
      for (const member_path of shared_audio_pack_member_paths) {
        if (String(member_path || "").toLowerCase() === lowercase_asset_path) {
          return member_path;
        }
      }
    }

    return normalized_asset_path;
  }

  function extract_shared_audio_pack_member_paths(manifest_files) {
    const member_paths = new Set();

    for (const raw_asset_path of Array.isArray(manifest_files) ? manifest_files : []) {
      const normalized_asset_path = normalize_asset_path(raw_asset_path);

      if (is_shared_audio_pack_candidate(normalized_asset_path)) {
        member_paths.add(normalized_asset_path);
      }
    }

    return member_paths;
  }

  function is_shared_audio_pack_preload_entry(entry) {
    return String(entry?.loader_kind || "").trim() === "shared_audio_pack";
  }

  function guess_protected_asset_type(asset_path) {
    return normalize_asset_path(asset_path).toLowerCase().endsWith(".ogg")
      ? "audio/ogg"
      : "application/octet-stream";
  }

  function parse_shared_audio_pack_entries(pack_bytes) {
    const normalized_pack_bytes = pack_bytes instanceof Uint8Array
      ? pack_bytes
      : new Uint8Array(pack_bytes ?? []);

    if (normalized_pack_bytes.byteLength < shared_audio_pack_magic.length + 4) {
      throw new Error("The shared audio pack was incomplete.");
    }

    const header_view = new DataView(
      normalized_pack_bytes.buffer,
      normalized_pack_bytes.byteOffset,
      normalized_pack_bytes.byteLength,
    );
    const decoder = new TextDecoder();
    const magic_text = decoder.decode(normalized_pack_bytes.subarray(0, shared_audio_pack_magic.length));

    if (magic_text !== shared_audio_pack_magic) {
      throw new Error("The shared audio pack header was invalid.");
    }

    const entry_count = header_view.getUint32(shared_audio_pack_magic.length, true);
    let cursor = shared_audio_pack_magic.length + 4;
    const pack_entries = [];

    for (let entry_index = 0; entry_index < entry_count; entry_index += 1) {
      if ((cursor + 10) > normalized_pack_bytes.byteLength) {
        throw new Error("The shared audio pack index was truncated.");
      }

      const path_length = header_view.getUint16(cursor, true);
      cursor += 2;
      const asset_offset = header_view.getUint32(cursor, true);
      cursor += 4;
      const asset_size = header_view.getUint32(cursor, true);
      cursor += 4;

      if ((cursor + path_length) > normalized_pack_bytes.byteLength) {
        throw new Error("The shared audio pack entry path was truncated.");
      }

      const asset_path = normalize_asset_path(
        decoder.decode(normalized_pack_bytes.subarray(cursor, cursor + path_length)),
      );
      cursor += path_length;

      if (!asset_path || (asset_offset + asset_size) > normalized_pack_bytes.byteLength) {
        throw new Error(`The shared audio pack entry for ${asset_path || "(unknown)"} was invalid.`);
      }

      pack_entries.push({
        asset_path,
        asset_offset,
        asset_size,
      });
    }

    return pack_entries;
  }

  function is_missing_shared_audio_pack_error(error) {
    const normalized_message = String(error?.message ?? error ?? "").toLowerCase();
    return (
      normalized_message.includes(shared_audio_pack_asset_path)
      && (normalized_message.includes("not found") || normalized_message.includes("404"))
    );
  }

  function is_plain_object(value) {
    if (!value || typeof value !== "object") {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function clone_runner_state_value(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => clone_runner_state_value(entry));
    }

    if (is_plain_object(value)) {
      const cloned_object = {};

      for (const [entry_key, entry_value] of Object.entries(value)) {
        cloned_object[entry_key] = clone_runner_state_value(entry_value);
      }

      return cloned_object;
    }

    return value;
  }

  function capture_base_runner_state() {
    if (base_module_template || !is_plain_object(window.Module)) {
      return;
    }

    base_module_template = clone_runner_state_value(window.Module);
    base_window_error_handler = window.onerror;
  }

  function create_fresh_module_state() {
    const base_module_state = base_module_template
      ?? (is_plain_object(window.Module) ? clone_runner_state_value(window.Module) : {});
    const fresh_module_state = clone_runner_state_value(base_module_state);

    fresh_module_state.preRun = Array.isArray(fresh_module_state.preRun)
      ? [...fresh_module_state.preRun]
      : [];
    fresh_module_state.postRun = Array.isArray(fresh_module_state.postRun)
      ? [...fresh_module_state.postRun]
      : [];

    install_shared_audio_fs_prerun(fresh_module_state);

    fresh_module_state.totalDependencies = 0;

    if (typeof fresh_module_state.setStatus === "function" && fresh_module_state.setStatus.last) {
      delete fresh_module_state.setStatus.last;
    }

    if (typeof window === "object") {
      fresh_module_state.arguments = window.location.search.substr(1).trim().split("&");

      if (!fresh_module_state.arguments[0]) {
        fresh_module_state.arguments = [];
      }
    }

    if (window.canvasElement instanceof HTMLCanvasElement) {
      fresh_module_state.canvas = window.canvasElement;
    }

    return fresh_module_state;
  }

  function install_shared_audio_fs_prerun(module_object) {
    if (!is_plain_object(module_object)) {
      return module_object;
    }

    module_object.preRun = Array.isArray(module_object.preRun)
      ? [...module_object.preRun]
      : [];

    if (!module_object.preRun.some((entry) => entry?.__drPrepareSharedAudioFileSystem === true)) {
      const prepare_shared_audio_file_system = function prepare_shared_audio_file_system() {
        try {
          window.prepareSharedAudioPackFileSystem?.();
        } catch (error) {
          console.warn("Unable to prepare shared audio files before runner start:", error);
        }
      };
      prepare_shared_audio_file_system.__drPrepareSharedAudioFileSystem = true;
      module_object.preRun.push(prepare_shared_audio_file_system);
    }

    return module_object;
  }

  function recreate_canvas_element() {
    const current_canvas = window.canvasElement instanceof HTMLCanvasElement
      ? window.canvasElement
      : document.getElementById("canvas");

    if (!(current_canvas instanceof HTMLCanvasElement) || !current_canvas.parentNode) {
      return current_canvas instanceof HTMLCanvasElement ? current_canvas : null;
    }

    const next_canvas = current_canvas.cloneNode(false);
    next_canvas.width = current_canvas.width;
    next_canvas.height = current_canvas.height;
    next_canvas.className = current_canvas.className;
    next_canvas.style.cssText = current_canvas.style.cssText;
    next_canvas.tabIndex = current_canvas.tabIndex;
    current_canvas.parentNode.replaceChild(next_canvas, current_canvas);
    next_canvas.addEventListener("click", () => {
      next_canvas.focus();
    });
    window.canvasElement = next_canvas;
    return next_canvas;
  }

  function reset_runner_dom_state() {
    const canvas = recreate_canvas_element();
    const current_game_container = game_container instanceof HTMLElement
      ? game_container
      : document.getElementById("game-container");
    const border_stage_node = game_border_stage instanceof HTMLElement
      ? game_border_stage
      : document.getElementById("game-border-stage");

    if ("loadprogress" in window) {
      window.loadprogress = 0;
    }

    window.startingWidth = undefined;
    window.startingHeight = undefined;
    window.startingAspect = undefined;

    if (window.outputElement && typeof window.outputElement.value === "string") {
      window.outputElement.value = "";
    }

    if (window.statusElement instanceof HTMLElement) {
      window.statusElement.innerHTML = "Downloading...";
    }

    if (window.progressElement instanceof HTMLElement) {
      window.progressElement.value = null;
      window.progressElement.max = null;
      window.progressElement.hidden = true;
    }

    if (window.spinnerElement instanceof HTMLElement) {
      window.spinnerElement.hidden = false;
      window.spinnerElement.style.display = "";
    }

    if (canvas instanceof HTMLCanvasElement) {
      canvas.style.display = "";
      clear_game_border_canvas_layout(canvas);
      canvas.classList.remove("active", "paused", "unpaused");

      try {
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
      } catch (_canvas_error) {
      }
    }

    if (current_game_container instanceof HTMLElement) {
      current_game_container.classList.remove("has-game-border");
    }

    if (border_stage_node instanceof HTMLElement) {
      border_stage_node.style.backgroundImage = "";
      border_stage_node.style.opacity = "";
      border_stage_node.style.transition = "";
      border_stage_node.style.left = "";
      border_stage_node.style.top = "";
      border_stage_node.style.width = "";
      border_stage_node.style.height = "";
    }
  }

  function remove_runner_event_listeners() {
    if (Array.isArray(window.jf)) {
      while (window.jf.length > 0) {
        const listener_index = window.jf.length - 1;

        try {
          if (typeof window.kf === "function") {
            window.kf(listener_index);
          } else {
            const listener = window.jf[listener_index];
            listener?.target?.removeEventListener?.(listener.Li, listener.rl, listener.Oi);
            window.jf.splice(listener_index, 1);
          }
        } catch (_listener_error) {
          window.jf.splice(listener_index, 1);
        }
      }
    }

    if (typeof window.ma === "function") {
      document.removeEventListener("visibilitychange", window.ma);
    }
  }

  function reset_runner_bootstrap_state() {
    capture_base_runner_state();
    reset_runner_dom_state();
    shared_audio_pack_fs_ready = false;
    protected_audio_fs_ready = false;
    live_native_game_border_id = "";
    live_native_game_border_alpha = 0;
    window.Module = create_fresh_module_state();

    if (typeof base_window_error_handler !== "undefined") {
      window.onerror = base_window_error_handler;
    }

    try {
      delete window.k;
    } catch (_delete_error) {
      window.k = undefined;
    }

    if (get_selected_game_border_id() === "dynamic") {
      refresh_selected_game_border_layout(false);
    }
  }

  async function pause_existing_runner() {
    const module_object = window.Module ?? null;

    try {
      module_object?.pauseMainLoop?.();
    } catch (_pause_error) {
    }

    for (const audio_context of [
      module_object?.SDL2?.audioContext,
      module_object?.audioContext,
      window.AL?.context,
    ]) {
      if (!audio_context || typeof audio_context.close !== "function" || audio_context.state === "closed") {
        continue;
      }

      try {
        await audio_context.close();
      } catch (_audio_error) {
      }
    }
  }

  function remove_existing_runner_scripts() {
    document.querySelectorAll("script[data-dr-runner='1']").forEach((script) => {
      script.remove();
    });
  }

  function reset_current_play_runtime_state() {
    const current_play_scope = normalize_play_scope(get_current_play_scope());
    play_sessions.delete(current_play_scope);
    pendingscopestatssession = null;
    startedscopestatssessionid = "";
    verified_gate_result = null;
  }

  async function cache_current_runner_assets_for_refresh(play_scope = get_current_play_scope()) {
    const refresh_cache = await open_refresh_asset_cache();

    if (!refresh_cache || protected_asset_urls.size === 0) {
      return false;
    }

    const normalized_play_scope = normalize_play_scope(play_scope);
    const asset_entries = Array.from(protected_asset_urls.entries());

    await Promise.all(asset_entries.map(async ([asset_path, asset_url]) => {
      if (typeof asset_url !== "string" || !asset_url) {
        return;
      }

      try {
        const asset_response = await window.fetch(asset_url);

        if (!asset_response.ok) {
          return;
        }

        const asset_blob = await asset_response.blob();
        await cache_refresh_asset_blob(asset_path, asset_blob, normalized_play_scope);
      } catch (_refresh_cache_error) {
      }
    }));

    return true;
  }

  function show_loading_screen(initial_status = "Refreshing runner...") {
    cache_loader_elements();
    loader_hidden = false;
    current_loader_progress_percent = 0;
    preload_timer_state = null;
    stop_preload_timer_interval();
    preload_timer_override_text = "";

    if (intro_element) {
      intro_element.hidden = true;
      intro_element.classList.remove("is-fading");
    }

    if (loading_screen) {
      loading_screen.classList.remove("hidden");
    }

    if (game_container) {
      game_container.style.visibility = "hidden";
    }

    update_preload_timer_text();
    set_loader_progress(0);
    set_loader_status(initial_status);
  }

  function run_loader_operation(operation) {
    if (loader_run_promise) {
      return loader_run_promise;
    }

    loader_run_promise = (async () => {
      try {
        return await operation();
      } finally {
        loader_run_promise = null;
      }
    })();

    return loader_run_promise;
  }

  function base64_to_uint8_array(value) {
    return new Uint8Array(base64_to_array_buffer(value));
  }

  function bytes_to_hex(bytes) {
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  function create_empty_loader_history_bucket() {
    return {
      runs: 0,
      total_preload_duration_ms: 0,
      last_preload_duration_ms: 0,
      total_asset_count: 0,
      total_missing_asset_count: 0,
      total_network_asset_count: 0,
      total_network_duration_ms: 0,
      total_network_bytes: 0,
      total_cached_asset_count: 0,
      total_cached_duration_ms: 0,
      total_fixed_overhead_ms: 0,
    };
  }

  function read_loader_history_store() {
    try {
      const parsed_history = JSON.parse(localStorage.getItem(loader_history_storage_key) || "null");

      if (parsed_history && typeof parsed_history === "object") {
        return {
          global: parsed_history.global && typeof parsed_history.global === "object"
            ? parsed_history.global
            : create_empty_loader_history_bucket(),
          scopes: parsed_history.scopes && typeof parsed_history.scopes === "object"
            ? parsed_history.scopes
            : {},
        };
      }
    } catch (_history_error) {
    }

    return {
      global: create_empty_loader_history_bucket(),
      scopes: {},
    };
  }

  function write_loader_history_store(history_store) {
    try {
      localStorage.setItem(loader_history_storage_key, JSON.stringify(history_store));
    } catch (_history_error) {
    }
  }

  function average_or_default(total_value, total_count, default_value) {
    return total_count > 0 ? (total_value / total_count) : default_value;
  }

  function build_loader_history_profile(history_bucket) {
    const average_preload_duration_ms = average_or_default(
      history_bucket.total_preload_duration_ms,
      history_bucket.runs,
      0,
    );
    const average_network_asset_duration_ms = average_or_default(
      history_bucket.total_network_duration_ms,
      history_bucket.total_network_asset_count,
      default_network_asset_duration_ms,
    );
    const average_cached_asset_duration_ms = average_or_default(
      history_bucket.total_cached_duration_ms,
      history_bucket.total_cached_asset_count,
      default_cached_asset_duration_ms,
    );
    const average_fixed_overhead_ms = average_or_default(
      history_bucket.total_fixed_overhead_ms,
      history_bucket.runs,
      default_fixed_preload_overhead_ms,
    );
    const average_network_asset_bytes = average_or_default(
      history_bucket.total_network_bytes,
      history_bucket.total_network_asset_count,
      default_network_asset_bytes,
    );
    const average_network_bytes_per_ms = history_bucket.total_network_duration_ms > 0
      ? (history_bucket.total_network_bytes / history_bucket.total_network_duration_ms)
      : (average_network_asset_bytes / default_network_asset_duration_ms);
    const recent_preload_duration_ms = Math.max(0, Number(history_bucket.last_preload_duration_ms) || 0);

    return {
      runs: history_bucket.runs,
      recent_preload_duration_ms,
      average_preload_duration_ms,
      average_network_asset_duration_ms,
      average_network_asset_bytes,
      average_network_bytes_per_ms,
      average_cached_asset_duration_ms,
      average_fixed_overhead_ms,
    };
  }

  function get_loader_history_profile(play_scope) {
    const history_store = read_loader_history_store();
    const normalized_play_scope = normalize_play_scope(play_scope);
    const scoped_history = history_store.scopes?.[normalized_play_scope];
    return build_loader_history_profile(scoped_history ?? create_empty_loader_history_bucket());
  }

  function get_loader_history_runs(play_scope) {
    const history_store = read_loader_history_store();
    const normalized_play_scope = normalize_play_scope(play_scope);
    return Number(history_store.scopes?.[normalized_play_scope]?.runs || 0);
  }

  function format_duration_clock(total_seconds_value) {
    const normalized_total_seconds = Number(total_seconds_value) || 0;
    const is_negative = normalized_total_seconds < 0;
    const total_seconds = Math.abs(Math.trunc(normalized_total_seconds));
    const minutes = Math.floor(total_seconds / 60);
    const seconds = total_seconds % 60;
    const formatted_duration = minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `0:${String(seconds).padStart(2, "0")}`;

    return is_negative ? `-${formatted_duration}` : formatted_duration;
  }

  function get_signed_preload_eta_remaining_seconds(remaining_ms) {
    const normalized_remaining_ms = Number(remaining_ms) || 0;

    if (normalized_remaining_ms === 0) {
      return 0;
    }

    return normalized_remaining_ms > 0
      ? Math.ceil(normalized_remaining_ms / 1000)
      : -Math.ceil(Math.abs(normalized_remaining_ms) / 1000);
  }

  function format_byte_quantity(byte_count) {
    const normalized_byte_count = Math.max(0, Number(byte_count) || 0);
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unit_index = 0;
    let scaled_value = normalized_byte_count;

    while (scaled_value >= 1024 && unit_index < units.length - 1) {
      scaled_value /= 1024;
      unit_index += 1;
    }

    const decimals = scaled_value >= 100 ? 0 : (scaled_value >= 10 ? 1 : 2);
    return `${scaled_value.toFixed(decimals)} ${units[unit_index]}`;
  }

  function format_byte_rate(bytes_per_second) {
    const normalized_rate = Math.max(0, Number(bytes_per_second) || 0);
    return normalized_rate > 0 ? `${format_byte_quantity(normalized_rate)}/s` : "✓";
  }

  function get_loader_progress_display_percent() {
    return Math.round(clamp_number(current_loader_progress_percent, 0, 100));
  }

  function format_progress_percent(downloaded_bytes, total_bytes) {
    const normalized_downloaded_bytes = Math.max(0, Number(downloaded_bytes) || 0);
    const normalized_total_bytes = Math.max(normalized_downloaded_bytes, Number(total_bytes) || 0);

    if (normalized_total_bytes <= 0) {
      return "0.0%";
    }

    const percent = Math.max(0, Math.min(100, (normalized_downloaded_bytes / normalized_total_bytes) * 100));
    return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
  }

  function parse_positive_int(value) {
    const parsed_value = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(parsed_value) && parsed_value > 0 ? parsed_value : 0;
  }

  function get_chunked_play_asset_label(asset_path, chunk_index) {
    return `${normalize_asset_path(asset_path)}#chunk:${Math.max(0, Number(chunk_index) || 0)}`;
  }

  function estimate_chunkable_asset_total_bytes(asset_path) {
    const normalized_asset_path = normalize_asset_path(asset_path);

    if (!normalized_asset_path) {
      return 0;
    }

    if (normalized_asset_path === game_unx_asset_path) {
      return default_game_unx_asset_bytes;
    }

    if (normalized_asset_path === "runner.wasm") {
      return default_runner_wasm_asset_bytes;
    }

    if (normalized_asset_path === shared_audio_pack_asset_path) {
      return default_shared_audio_pack_asset_bytes;
    }

    const last_dot_index = normalized_asset_path.lastIndexOf(".");
    const asset_suffix = last_dot_index >= 0
      ? normalized_asset_path.slice(last_dot_index).toLowerCase()
      : "";

    if (asset_suffix === ".unx" || asset_suffix === ".unxw") {
      return default_game_unx_asset_bytes;
    }

    if (asset_suffix === ".wasm") {
      return default_runner_wasm_asset_bytes;
    }

    if (asset_suffix === ".pak") {
      return default_shared_audio_pack_asset_bytes;
    }

    return 0;
  }

  function should_use_chunked_asset_fetch(asset_path, play_session, options = {}) {
    if (options.allow_chunked === false) {
      return false;
    }

    if (play_session?.supports_chunked_assets !== true) {
      return false;
    }

    if (parse_positive_int(play_session?.asset_chunk_bytes) <= 0) {
      return false;
    }

    const normalized_asset_path = normalize_asset_path(asset_path);
    const last_dot_index = normalized_asset_path.lastIndexOf(".");
    const asset_suffix = last_dot_index >= 0
      ? normalized_asset_path.slice(last_dot_index).toLowerCase()
      : "";

    if (non_chunkable_protected_assets.has(normalized_asset_path)) {
      return false;
    }

    if (!chunked_protected_asset_suffixes.has(asset_suffix)) {
      return false;
    }

    const minimum_chunked_asset_bytes = parse_positive_int(play_session?.asset_chunk_min_bytes)
      || default_chunked_asset_min_bytes;
    const estimated_asset_bytes = estimate_chunkable_asset_total_bytes(normalized_asset_path);

    if (estimated_asset_bytes <= 0) {
      return false;
    }

    if (minimum_chunked_asset_bytes > 0 && estimated_asset_bytes < minimum_chunked_asset_bytes) {
      return false;
    }

    return true;
  }

  function create_loader_error(message, details = {}) {
    const error = new Error(message);
    Object.assign(error, details);
    return error;
  }

  function is_chunk_unsupported_play_asset_error(error) {
    return (
      Number(error?.status_code) === 400
      && /does not support chunked delivery/i.test(String(error?.message ?? ""))
    );
  }

  function get_error_message(error) {
    return String(error?.message ?? error ?? "").trim();
  }

  function should_reset_play_session_after_error(error) {
    if (error?.reset_session === true) {
      return true;
    }

    const normalized_message = get_error_message(error).toLowerCase();
    return (
      normalized_message.includes("session expired")
      || normalized_message.includes("invalid session")
      || normalized_message.includes("unknown session")
      || normalized_message.includes("play session expired")
    );
  }

  function is_retryable_play_asset_error(error) {
    if (error?.retryable === true) {
      return true;
    }

    const normalized_message = get_error_message(error).toLowerCase();
    return (
      normalized_message.includes("failed to fetch")
      || normalized_message.includes("networkerror")
      || normalized_message.includes("load failed")
      || normalized_message.includes("timeout")
      || normalized_message.includes("524")
      || normalized_message.includes("503")
      || normalized_message.includes("502")
    );
  }

  function estimate_preload_asset_total_bytes(asset_path, history_profile) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const average_network_asset_bytes = Math.max(
      default_network_asset_bytes,
      Number(history_profile?.average_network_asset_bytes) || 0,
    );

    if (normalized_asset_path === game_unx_asset_path) {
      return Math.max(default_game_unx_asset_bytes, average_network_asset_bytes * 8);
    }

    if (normalized_asset_path === "runner.data") {
      return Math.max(default_runner_data_asset_bytes, average_network_asset_bytes * 2);
    }

    if (normalized_asset_path === "runner.wasm") {
      return Math.max(default_runner_wasm_asset_bytes, average_network_asset_bytes);
    }

    if (normalized_asset_path === "runner.js") {
      return Math.max(default_runner_js_asset_bytes, average_network_asset_bytes * 0.5);
    }

    if (normalized_asset_path === shared_audio_pack_asset_path) {
      return Math.max(default_shared_audio_pack_asset_bytes, average_network_asset_bytes * 16);
    }

    return average_network_asset_bytes;
  }

  function stop_preload_timer_interval() {
    if (preload_timer_interval_id !== null) {
      window.clearInterval(preload_timer_interval_id);
      preload_timer_interval_id = null;
    }
  }

  function is_shared_play_asset(asset_path) {
    const normalized_asset_path = map_common_chapter_asset_path(asset_path);
    return normalized_asset_path.startsWith("mus/") || is_shared_chapter_common_asset(normalized_asset_path);
  }

  function is_scoped_runtime_bundle_asset(asset_path, play_scope = get_current_play_scope()) {
    return should_scope_runtime_bundle_asset(normalize_asset_path(asset_path), normalize_play_scope(play_scope));
  }

  function should_persist_asset_cache(asset_path, play_scope = get_current_play_scope()) {
    if (get_audio_caching_mode() === "skip") {
      return false;
    }

    if (is_scoped_runtime_bundle_asset(asset_path, play_scope)) {
      return false;
    }

    if (is_game_border_asset_path(asset_path)) {
      return get_audio_caching_mode() === "on" || get_audio_caching_mode() === "noaudio" || is_offline_mode_active();
    }

    if (is_shared_play_asset(asset_path)) {
      return get_audio_caching_mode() !== "off" || is_offline_mode_active();
    }

    if (is_offline_mode_active()) {
      return true;
    }

    return get_audio_caching_mode() === "on" && normalize_play_scope(play_scope) === "play";
  }

  function get_asset_cache_scope(asset_path, play_scope = get_current_play_scope()) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), normalized_play_scope);

    if (should_scope_runtime_bundle_asset(normalized_asset_path, normalized_play_scope)) {
      return normalized_play_scope;
    }

    if (normalized_asset_path.startsWith("mus/") || is_shared_chapter_common_asset(normalized_asset_path) || is_game_border_asset_path(normalized_asset_path)) {
      return "shared";
    }

    return normalized_play_scope;
  }

  function get_protected_asset_cache_key(asset_path, play_scope = get_current_play_scope()) {
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), play_scope);
    const encoded_scope = encodeURIComponent(get_asset_cache_scope(normalized_asset_path, play_scope));
    const encoded_segments = normalized_asset_path
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${window.location.origin}/__dr_play_cache__/${encoded_scope}/${encoded_segments}`;
  }

  async function open_protected_asset_cache() {
    if (!window.caches?.open) {
      return null;
    }

    try {
      return await window.caches.open(protected_asset_cache_name);
    } catch (_cache_error) {
      return null;
    }
  }

  async function open_refresh_asset_cache() {
    if (!window.caches?.open) {
      return null;
    }

    try {
      return await window.caches.open(refresh_asset_cache_name);
    } catch (_cache_error) {
      return null;
    }
  }

  async function open_mod_override_cache() {
    if (!window.caches?.open) {
      return null;
    }

    try {
      return await window.caches.open(mod_override_cache_name);
    } catch (_cache_error) {
      return null;
    }
  }

  function read_mod_default_override_record(play_scope = get_current_play_scope()) {
    try {
      const normalized_play_scope = normalize_play_scope(play_scope);
      const chapter_match = normalized_play_scope.match(/^chapter(\d+)/i);
      const default_override_key = chapter_match ? chapter_match[1] : (normalized_play_scope === "play" ? "play" : "");
      if (!default_override_key) {
        return null;
      }

      const raw_record = localStorage.getItem(mod_default_override_storage_key);
      const parsed_record = raw_record ? JSON.parse(raw_record) : null;
      let chapter_record = parsed_record && typeof parsed_record === "object" ? parsed_record[default_override_key] : null;

      if ((!chapter_record || typeof chapter_record !== "object") && parsed_record && typeof parsed_record === "object") {
        chapter_record = Object.values(parsed_record).find((entry) => (
          entry && typeof entry === "object" && normalize_play_scope(entry.play_scope) === normalized_play_scope
        )) || null;
      }

      if (!chapter_record || typeof chapter_record !== "object") {
        log_loader_cache_debug("mod default miss", {
          play_scope: normalized_play_scope,
          default_override_key,
          reason: "no_record",
          available_keys: parsed_record && typeof parsed_record === "object" ? Object.keys(parsed_record) : [],
        });
        return null;
      }

      if (normalize_play_scope(chapter_record.play_scope) !== normalized_play_scope) {
        log_loader_cache_debug("mod default miss", {
          play_scope: normalized_play_scope,
          default_override_key,
          reason: "scope_mismatch",
          record_scope: chapter_record.play_scope,
        });
        return null;
      }

      const cache_key = String(chapter_record.cache_key ?? "").trim();
      if (!cache_key) {
        log_loader_cache_debug("mod default miss", {
          play_scope: normalized_play_scope,
          default_override_key,
          reason: "missing_cache_key",
        });
        return null;
      }

      log_loader_cache_debug("mod default found", {
        play_scope: normalized_play_scope,
        default_override_key,
        cache_key,
        version: chapter_record.version || "",
        patch_name: chapter_record.patch_name || "",
      });
      return { ...chapter_record, cache_key, persistent_default: true };
    } catch (_storage_error) {
      return null;
    }
  }

  function read_mod_override_record(play_scope = get_current_play_scope()) {
    try {
      const raw_record = sessionStorage.getItem(mod_override_storage_key);

      if (!raw_record) {
        return read_mod_default_override_record(play_scope);
      }

      const parsed_record = JSON.parse(raw_record);

      if (!parsed_record || typeof parsed_record !== "object") {
        return read_mod_default_override_record(play_scope);
      }

      if (normalize_play_scope(parsed_record.play_scope) !== normalize_play_scope(play_scope)) {
        return read_mod_default_override_record(play_scope);
      }

      const cache_key = String(parsed_record.cache_key ?? "").trim();
      return cache_key ? { ...parsed_record, cache_key, persistent_default: false } : read_mod_default_override_record(play_scope);
    } catch (_storage_error) {
      return read_mod_default_override_record(play_scope);
    }
  }

  function clear_mod_override_record() {
    try {
      sessionStorage.removeItem(mod_override_storage_key);
    } catch (_storage_error) {
    }
  }

  const mod_file_override_storage_key = "dr-play-file-overrides-v1";

  function read_mod_file_override_record(play_scope = get_current_play_scope()) {
    try {
      const raw_record = sessionStorage.getItem(mod_file_override_storage_key);
      if (!raw_record) return null;
      const parsed_record = JSON.parse(raw_record);
      if (!parsed_record || typeof parsed_record !== "object") return null;
      if (normalize_play_scope(parsed_record.play_scope) !== normalize_play_scope(play_scope)) return null;
      const files = Array.isArray(parsed_record.files) ? parsed_record.files : [];
      return { ...parsed_record, files };
    } catch (_storage_error) {
      return null;
    }
  }

  async function register_mod_file_overrides(play_scope = get_current_play_scope()) {
    const override_record = read_mod_file_override_record(play_scope);
    if (!override_record || override_record.files.length === 0) return 0;
    const mod_override_cache = await open_mod_override_cache();
    if (!mod_override_cache) return 0;
    let applied_count = 0;
    await Promise.all(override_record.files.map(async (entry) => {
      const asset_path = normalize_asset_path(entry?.asset_path);
      const cache_key = String(entry?.cache_key ?? "").trim();
      if (!asset_path || !cache_key) return;
      const cached_response = await mod_override_cache.match(cache_key);
      if (!cached_response) return;
      const override_blob = await cached_response.blob();
      const override_url = URL.createObjectURL(override_blob);
      register_protected_asset_url(asset_path, override_url);
      applied_count += 1;
    }));
    if (applied_count > 0) console.log(`[mod-file-overrides] Applied ${applied_count} session file replacement(s).`);
    return applied_count;
  }

  function read_debug_game_mode_record() {
    try {
      const raw_record = sessionStorage.getItem(debug_game_mode_storage_key);

      if (!raw_record) {
        return {};
      }

      const parsed_record = JSON.parse(raw_record);
      return is_plain_object(parsed_record) ? parsed_record : {};
    } catch (_storage_error) {
      return {};
    }
  }

  function write_debug_game_mode_record(record) {
    try {
      sessionStorage.setItem(debug_game_mode_storage_key, JSON.stringify(record));
    } catch (_storage_error) {
    }
  }

  function is_play_debug_mode_enabled(play_scope = get_current_play_scope()) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const debug_mode_record = read_debug_game_mode_record();
    return Boolean(debug_mode_record[normalized_play_scope]);
  }

  function set_play_debug_mode_enabled(play_scope, is_enabled) {
    const normalized_play_scope = normalize_play_scope(play_scope);

    if (!normalized_play_scope || normalized_play_scope.endsWith("/debug")) {
      return false;
    }

    const debug_mode_record = read_debug_game_mode_record();

    if (is_enabled) {
      debug_mode_record[normalized_play_scope] = true;
    } else {
      delete debug_mode_record[normalized_play_scope];
    }

    write_debug_game_mode_record(debug_mode_record);
    return Boolean(debug_mode_record[normalized_play_scope]);
  }

  function get_debug_mode_button() {
    return Array.from(document.querySelectorAll("#vine-menu-list .vine-menu-option")).find((button) => {
      const label_text = String(button?.textContent ?? "").trim().toLowerCase();
      const title_text = String(button?.getAttribute?.("title") ?? "").trim().toLowerCase();
      return (
        label_text === "debug mode?"
        || label_text === "normal mode?"
        || title_text.includes("debug mode version")
        || title_text.includes("non-debug mode version")
      );
    }) ?? null;
  }

  function refresh_debug_mode_button() {
    const debug_mode_button = get_debug_mode_button();

    if (!(debug_mode_button instanceof HTMLButtonElement)) {
      return;
    }

    const normalized_play_scope = normalize_play_scope(get_current_play_scope());

    if (normalized_play_scope.endsWith("/debug")) {
      debug_mode_button.textContent = "Normal Mode?";
      debug_mode_button.title = "Sends you to the non-Debug Mode version of DELTARUNE";
      debug_mode_button.onclick = () => {
        window.location.href = "../index.html";
      };
      return;
    }

    const debug_mode_enabled = is_play_debug_mode_enabled(normalized_play_scope);
    debug_mode_button.textContent = debug_mode_enabled ? "Normal Mode?" : "Debug Mode?";
    debug_mode_button.title = debug_mode_enabled
      ? "Reloads the runner with the normal chapter game.unx"
      : "Reloads the runner with the chapter debug game.unx";
    debug_mode_button.onclick = () => {
      void toggle_play_debug_mode();
    };
  }

  function read_runner_refresh_record(play_scope = get_current_play_scope()) {
    try {
      const raw_record = sessionStorage.getItem(runner_refresh_storage_key);

      if (!raw_record) {
        return null;
      }

      const parsed_record = JSON.parse(raw_record);

      if (!parsed_record || typeof parsed_record !== "object") {
        return null;
      }

      if (normalize_play_scope(parsed_record.play_scope) !== normalize_play_scope(play_scope)) {
        return null;
      }

      const created_at_ms = Number(parsed_record.created_at_ms) || 0;

      if (created_at_ms > 0 && (Date.now() - created_at_ms) > 5 * 60 * 1000) {
        sessionStorage.removeItem(runner_refresh_storage_key);
        return null;
      }

      return {
        play_scope: normalize_play_scope(parsed_record.play_scope),
        created_at_ms,
      };
    } catch (_storage_error) {
      return null;
    }
  }

  function mark_runner_refresh_record(play_scope = get_current_play_scope()) {
    try {
      sessionStorage.setItem(runner_refresh_storage_key, JSON.stringify({
        play_scope: normalize_play_scope(play_scope),
        created_at_ms: Date.now(),
      }));
    } catch (_storage_error) {
    }
  }

  function clear_runner_refresh_record() {
    try {
      sessionStorage.removeItem(runner_refresh_storage_key);
    } catch (_storage_error) {
    }
  }

  async function clear_refresh_asset_cache() {
    if (!window.caches?.delete) {
      return;
    }

    try {
      await window.caches.delete(refresh_asset_cache_name);
    } catch (_cache_error) {
    }
  }

  async function register_mod_game_override(play_scope = get_current_play_scope()) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const override_record = read_mod_override_record(play_scope);

    if (!override_record) {
      if (!normalized_play_scope.endsWith("/debug") && is_play_debug_mode_enabled(normalized_play_scope)) {
        try {
          const override_url = await ensure_protected_asset_url("debug/game.unx", normalized_play_scope);
          register_protected_asset_url("game.unx", override_url);
          return override_url;
        } catch (error) {
          console.error("Unable to apply debug game override:", error);
          set_play_debug_mode_enabled(normalized_play_scope, false);
          refresh_debug_mode_button();
        }
      }

      return null;
    }

    const mod_override_cache = await open_mod_override_cache();

    if (!mod_override_cache) {
      clear_mod_override_record();
      return null;
    }

    const cached_response = await mod_override_cache.match(override_record.cache_key);

    if (!cached_response) {
      log_loader_cache_debug("mod override cache miss", {
        play_scope: normalized_play_scope,
        cache_key: override_record.cache_key,
        persistent_default: override_record.persistent_default === true,
      });
      if (!override_record.persistent_default) {
        clear_mod_override_record();
      }
      return null;
    }

    const override_blob = await cached_response.blob();
    const override_url = URL.createObjectURL(override_blob);
    log_loader_cache_debug("mod override applied", {
      play_scope: normalized_play_scope,
      cache_key: override_record.cache_key,
      persistent_default: override_record.persistent_default === true,
      bytes: override_blob.size,
    });
    register_protected_asset_url("game.unx", override_url);

    if (!override_record.persistent_default) {
      const matching_default_record = read_mod_default_override_record(normalized_play_scope);
      const cache_key_is_saved_default = matching_default_record?.cache_key === override_record.cache_key;

      // Older launcher builds wrote the same cache key as both a saved default
      // and a one-shot session override. One-shot overrides are normally
      // deleted after launch, but deleting this key destroys the saved default.
      if (!cache_key_is_saved_default) {
        try {
          await mod_override_cache.delete(override_record.cache_key);
        } catch (_cache_error) {
        }
      }

      clear_mod_override_record();
    }
    return override_url;
  }

  async function toggle_play_debug_mode() {
    const normalized_play_scope = normalize_play_scope(get_current_play_scope());

    if (!normalized_play_scope || normalized_play_scope.endsWith("/debug")) {
      window.location.href = "../index.html";
      return;
    }

    const next_debug_mode_enabled = !is_play_debug_mode_enabled(normalized_play_scope);
    set_play_debug_mode_enabled(normalized_play_scope, next_debug_mode_enabled);
    refresh_debug_mode_button();

    await refreshcurrentplayrunnersafely({
      status_message: next_debug_mode_enabled
        ? "Switching to debug game..."
        : "Returning to normal game...",
    });
  }

  async function get_cached_asset_response(asset_path, play_scope = get_current_play_scope()) {
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), play_scope);
    const normalized_cache_scope = get_asset_cache_scope(normalized_asset_path, play_scope);
    const cache_key = get_protected_asset_cache_key(normalized_asset_path, normalized_cache_scope);
    const should_persist = should_persist_asset_cache(normalized_asset_path, normalized_cache_scope);

    if (should_persist) {
      const asset_cache = await open_protected_asset_cache();

      if (asset_cache) {
        const persistent_match = await asset_cache.match(cache_key);

        log_loader_cache_debug(persistent_match ? "persistent cache hit" : "persistent cache miss", {
          asset_path: normalized_asset_path,
          requested_scope: normalize_play_scope(play_scope),
          cache_scope: normalized_cache_scope,
          cache_key,
        });

        if (persistent_match) {
          return persistent_match;
        }
      } else {
        log_loader_cache_debug("persistent cache unavailable", {
          asset_path: normalized_asset_path,
          requested_scope: normalize_play_scope(play_scope),
          cache_scope: normalized_cache_scope,
          cache_key,
        });
      }
    } else {
      log_loader_cache_debug("persistent cache skipped", {
        asset_path: normalized_asset_path,
        requested_scope: normalize_play_scope(play_scope),
        cache_scope: normalized_cache_scope,
        cache_key,
      });
    }

    const refresh_record = read_runner_refresh_record(play_scope);

    if (!refresh_record) {
      return null;
    }

    const refresh_cache = await open_refresh_asset_cache();

    if (!refresh_cache) {
      return null;
    }

    return refresh_cache.match(cache_key) ?? null;
  }

  async function cache_protected_asset_blob(asset_path, asset_blob, play_scope = get_current_play_scope()) {
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), play_scope);
    const normalized_cache_scope = get_asset_cache_scope(normalized_asset_path, play_scope);
    const cache_key = get_protected_asset_cache_key(normalized_asset_path, normalized_cache_scope);

    if (!should_persist_asset_cache(normalized_asset_path, normalized_cache_scope)) {
      log_loader_cache_debug("cache write skipped", {
        asset_path: normalized_asset_path,
        requested_scope: normalize_play_scope(play_scope),
        cache_scope: normalized_cache_scope,
        cache_key,
      });
      return;
    }

    const asset_cache = await open_protected_asset_cache();

    if (!asset_cache) {
      log_loader_cache_debug("cache write unavailable", {
        asset_path: normalized_asset_path,
        requested_scope: normalize_play_scope(play_scope),
        cache_scope: normalized_cache_scope,
        cache_key,
      });
      return;
    }

    const response_headers = new Headers({
      "content-type": asset_blob.type || "application/octet-stream",
      "cache-control": "max-age=31536000, immutable",
    });

    try {
      await asset_cache.put(
        cache_key,
        new Response(asset_blob, { headers: response_headers }),
      );
      log_loader_cache_debug("cache write stored", {
        asset_path: normalized_asset_path,
        requested_scope: normalize_play_scope(play_scope),
        cache_scope: normalized_cache_scope,
        cache_key,
        bytes: Number(asset_blob?.size) || 0,
      });
    } catch (cache_error) {
      log_loader_cache_debug("cache write failed", {
        asset_path: normalized_asset_path,
        requested_scope: normalize_play_scope(play_scope),
        cache_scope: normalized_cache_scope,
        cache_key,
        error: String(cache_error?.message || cache_error),
      });
    }
  }

  async function cache_refresh_asset_blob(asset_path, asset_blob, play_scope = get_current_play_scope()) {
    const refresh_cache = await open_refresh_asset_cache();

    if (!refresh_cache) {
      return;
    }

    const response_headers = new Headers({
      "content-type": asset_blob.type || "application/octet-stream",
      "cache-control": "no-store",
    });

    try {
      await refresh_cache.put(
        get_protected_asset_cache_key(asset_path, play_scope),
        new Response(asset_blob, { headers: response_headers }),
      );
    } catch (_cache_error) {
    }
  }

  async function create_object_url_from_cached_asset(asset_path, play_scope = get_current_play_scope()) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), normalized_play_scope);
    const cache_scope = get_asset_cache_scope(normalized_asset_path, normalized_play_scope);
    const started_at_ms = performance.now();

    if (!should_persist_asset_cache(normalized_asset_path, normalized_play_scope) && !read_runner_refresh_record(normalized_play_scope)) {
      return null;
    }

    const cached_response = await get_cached_asset_response(normalized_asset_path, cache_scope);

    if (!cached_response) {
      return null;
    }

    const cached_blob = await cached_response.blob();
    const object_url = URL.createObjectURL(cached_blob);
    register_protected_asset_url(normalized_asset_path, object_url, normalized_play_scope);
    if (is_audio_asset_path(normalized_asset_path)) {
      remember_protected_audio_memory_entry(normalized_asset_path, new Uint8Array(await cached_blob.arrayBuffer()));
    }
    return {
      url: object_url,
      source: "cache",
      downloaded_bytes: 0,
      decoded_bytes: cached_blob.size,
      duration_ms: performance.now() - started_at_ms,
    };
  }

  async function cache_shared_audio_pack_entries(pack_bytes) {
    const pack_entries = parse_shared_audio_pack_entries(pack_bytes)
      .filter((pack_entry) => is_shared_audio_pack_candidate(pack_entry.asset_path));
    const memory_entries = new Map();

    for (const pack_entry of pack_entries) {
      const entry_bytes = pack_bytes.subarray(pack_entry.asset_offset, pack_entry.asset_offset + pack_entry.asset_size);
      const entry_blob = new Blob([
        entry_bytes,
      ], {
        type: guess_protected_asset_type(pack_entry.asset_path),
      });
      memory_entries.set(pack_entry.asset_path, entry_bytes);
      memory_entries.set(pack_entry.asset_path.toLowerCase(), entry_bytes);
      remember_protected_audio_memory_entry(pack_entry.asset_path, entry_bytes);
      if (pack_entry.asset_path.toLowerCase() !== pack_entry.asset_path) {
        remember_protected_audio_memory_entry(pack_entry.asset_path.toLowerCase(), entry_bytes);
      }
      await cache_protected_asset_blob(pack_entry.asset_path, entry_blob, "shared");
      if (pack_entry.asset_path.toLowerCase() !== pack_entry.asset_path) {
        await cache_protected_asset_blob(pack_entry.asset_path.toLowerCase(), entry_blob, "shared");
      }
    }

    shared_audio_pack_memory_entries = memory_entries;
    shared_audio_pack_member_paths = new Set(pack_entries.map((pack_entry) => pack_entry.asset_path));
    shared_audio_pack_fs_ready = false;
    shared_audio_pack_object_urls_ready = false;

    const pack_marker_blob = new Blob([
      JSON.stringify({
        asset_path: shared_audio_pack_asset_path,
        entry_count: pack_entries.length,
        entries: pack_entries.map((pack_entry) => pack_entry.asset_path),
      }),
    ], {
      type: "application/json",
    });
    await cache_protected_asset_blob(shared_audio_pack_asset_path, pack_marker_blob, "shared");

    return pack_entries;
  }

  async function load_shared_audio_pack_marker_entry_paths() {
    try {
      const marker_response = await get_cached_asset_response(shared_audio_pack_asset_path, "shared");
      if (!marker_response) {
        return null;
      }

      const marker_data = await marker_response.clone().json();
      const marker_entries = Array.isArray(marker_data?.entries)
        ? marker_data.entries.map((entry) => normalize_asset_path(entry)).filter(Boolean)
        : [];

      if (marker_entries.length === 0) {
        return null;
      }

      if (!(shared_audio_pack_member_paths instanceof Set)) {
        shared_audio_pack_member_paths = new Set();
      }

      for (const marker_entry of marker_entries) {
        shared_audio_pack_member_paths.add(marker_entry);
      }

      return shared_audio_pack_member_paths;
    } catch (_marker_error) {
      return null;
    }
  }

  async function has_complete_shared_audio_pack_marker() {
    try {
      const marker_response = await get_cached_asset_response(shared_audio_pack_asset_path, "shared");
      if (!marker_response) {
        return false;
      }

      const marker_data = await marker_response.clone().json();
      return Array.isArray(marker_data?.entries) && marker_data.entries.length > 0;
    } catch (_marker_error) {
      return false;
    }
  }

  async function ensure_shared_audio_pack_memory_entries() {
    if (shared_audio_pack_memory_entries instanceof Map && shared_audio_pack_memory_entries.size > 0) {
      return shared_audio_pack_memory_entries;
    }

    if (!(shared_audio_pack_member_paths instanceof Set) || shared_audio_pack_member_paths.size === 0) {
      await load_shared_audio_pack_member_paths();
    }

    await load_shared_audio_pack_marker_entry_paths();

    if (!(shared_audio_pack_member_paths instanceof Set) || shared_audio_pack_member_paths.size === 0) {
      return null;
    }

    const memory_entries = new Map();

    for (const asset_path of shared_audio_pack_member_paths) {
      const cached_response = await get_cached_asset_response(asset_path, "shared");

      if (!cached_response) {
        continue;
      }

      const asset_bytes = new Uint8Array(await cached_response.arrayBuffer());
      memory_entries.set(asset_path, asset_bytes);
      memory_entries.set(asset_path.toLowerCase(), asset_bytes);
      remember_protected_audio_memory_entry(asset_path, asset_bytes);
      if (asset_path.toLowerCase() !== asset_path) {
        remember_protected_audio_memory_entry(asset_path.toLowerCase(), asset_bytes);
      }
    }

    if (memory_entries.size > 0) {
      shared_audio_pack_memory_entries = memory_entries;
      shared_audio_pack_fs_ready = false;
      return shared_audio_pack_memory_entries;
    }

    return null;
  }

  function ensure_runner_shared_audio_fs_entries() {
    if (shared_audio_pack_fs_ready) {
      return true;
    }

    const module_instance = typeof window.ModuleName === "function"
      ? window.ModuleName()
      : window.Module;

    if (
      !module_instance
      || typeof module_instance.FS_createPath !== "function"
      || typeof module_instance.FS_createDataFile !== "function"
      || !(shared_audio_pack_memory_entries instanceof Map)
      || shared_audio_pack_memory_entries.size === 0
    ) {
      return false;
    }

    const ensure_dir = (parent_path, child_name) => {
      try {
        module_instance.FS_createPath(parent_path, child_name, true, true);
      } catch (_fs_path_error) {
      }
    };

    const mount_file = (full_path, asset_bytes) => {
      const normalized_full_path = String(full_path || "").replace(/\/+/g, "/");
      const last_slash_index = normalized_full_path.lastIndexOf("/");
      const parent_path = last_slash_index > 0 ? normalized_full_path.slice(0, last_slash_index) : "/";
      const file_name = normalized_full_path.slice(last_slash_index + 1);

      if (!file_name) {
        return;
      }

      try {
        module_instance.FS_unlink?.(normalized_full_path);
      } catch (_unlink_error) {
      }

      try {
        module_instance.FS_createDataFile(parent_path, file_name, asset_bytes, true, true, true);
      } catch (create_file_error) {
        if (normalized_full_path.includes("/common/chapters/") || normalized_full_path.includes("/common/chapter-common/")) {
          console.warn(`Unable to mount shared common audio file at ${normalized_full_path}:`, create_file_error);
        }
      }
    };

    ensure_dir("/", "assets");
    ensure_dir("/assets", "mus");
    ensure_dir("/", "mus");
    ensure_dir("/", "common");
    ensure_dir("/common", "chapters");
    ensure_dir("/common", "chapter-common");
    ensure_dir("/assets", "common");
    ensure_dir("/assets/common", "chapters");
    ensure_dir("/assets/common", "chapter-common");
    ensure_dir("/assets", "..");
    ensure_dir("/assets/..", "common");
    ensure_dir("/assets/../common", "chapters");
    ensure_dir("/assets/../common", "chapter-common");
    ensure_dir("/", "..");
    ensure_dir("/..", "mus");
    ensure_dir("/..", "common");
    ensure_dir("/../common", "chapters");
    ensure_dir("/../common", "chapter-common");

    for (const [asset_path, asset_bytes] of shared_audio_pack_memory_entries.entries()) {
      const normalized_asset_path = normalize_asset_path(asset_path);
      const base_name = normalized_asset_path.split("/").pop();

      if (!base_name) {
        continue;
      }

      const lowercase_base_name = base_name.toLowerCase();

      if (normalized_asset_path.startsWith("mus/")) {
        mount_file(`/assets/mus/${base_name}`, asset_bytes);
        mount_file(`/assets/${base_name}`, asset_bytes);
        mount_file(`/mus/${base_name}`, asset_bytes);
        mount_file(`/../mus/${base_name}`, asset_bytes);
        mount_file(`mus/${base_name}`, asset_bytes);
        mount_file(`assets/mus/${base_name}`, asset_bytes);
        if (lowercase_base_name !== base_name) {
          mount_file(`/assets/mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/${lowercase_base_name}`, asset_bytes);
          mount_file(`/mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`/../mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`assets/mus/${lowercase_base_name}`, asset_bytes);
        }
        continue;
      }

      if (normalized_asset_path.startsWith("common/chapters/")) {
        mount_file(`/common/chapters/${base_name}`, asset_bytes);
        mount_file(`/../common/chapters/${base_name}`, asset_bytes);
        mount_file(`/common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/../common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/assets/${normalized_asset_path}`, asset_bytes);
        mount_file(`/assets/../common/chapters/${base_name}`, asset_bytes);
        mount_file(`/assets/../common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/assets/common/chapters/${base_name}`, asset_bytes);
        mount_file(`/assets/common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/${normalized_asset_path}`, asset_bytes);
        if (lowercase_base_name !== base_name) {
          mount_file(`/common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/../common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/common/chapter-common/${lowercase_base_name}`, asset_bytes);
          mount_file(`/../common/chapter-common/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/../common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/../common/chapter-common/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/common/chapter-common/${lowercase_base_name}`, asset_bytes);
        }
      }
    }

    shared_audio_pack_fs_ready = true;
    return true;
  }

  function ensure_runner_protected_audio_fs_entries() {
    if (protected_audio_fs_ready) {
      return true;
    }

    const module_instance = typeof window.ModuleName === "function"
      ? window.ModuleName()
      : window.Module;

    if (
      !module_instance
      || typeof module_instance.FS_createPath !== "function"
      || typeof module_instance.FS_createDataFile !== "function"
      || !(protected_audio_memory_entries instanceof Map)
      || protected_audio_memory_entries.size === 0
    ) {
      return false;
    }

    const ensure_dir = (parent_path, child_name) => {
      try {
        module_instance.FS_createPath(parent_path, child_name, true, true);
      } catch (_fs_path_error) {
      }
    };

    const mount_file = (full_path, asset_bytes) => {
      const normalized_full_path = String(full_path || "").replace(/\/+/g, "/");
      const last_slash_index = normalized_full_path.lastIndexOf("/");
      const parent_path = last_slash_index > 0 ? normalized_full_path.slice(0, last_slash_index) : "/";
      const file_name = normalized_full_path.slice(last_slash_index + 1);

      if (!file_name) {
        return;
      }

      try {
        module_instance.FS_unlink?.(normalized_full_path);
      } catch (_unlink_error) {
      }

      try {
        module_instance.FS_createDataFile(parent_path, file_name, asset_bytes, true, true, true);
      } catch (create_file_error) {
        if (normalized_full_path.includes("/common/chapters/") || normalized_full_path.includes("/common/chapter-common/")) {
          console.warn(`Unable to mount protected common audio file at ${normalized_full_path}:`, create_file_error);
        }
      }
    };

    ensure_dir("/", "assets");
    ensure_dir("/assets", "mus");
    ensure_dir("/", "mus");
    ensure_dir("/", "common");
    ensure_dir("/common", "chapters");
    ensure_dir("/common", "chapter-common");
    ensure_dir("/assets", "common");
    ensure_dir("/assets/common", "chapters");
    ensure_dir("/assets/common", "chapter-common");
    ensure_dir("/assets", "..");
    ensure_dir("/assets/..", "common");
    ensure_dir("/assets/../common", "chapters");
    ensure_dir("/assets/../common", "chapter-common");
    ensure_dir("/", "..");
    ensure_dir("/..", "mus");
    ensure_dir("/..", "common");
    ensure_dir("/../common", "chapters");
    ensure_dir("/../common", "chapter-common");

    for (const [asset_path, asset_bytes] of protected_audio_memory_entries.entries()) {
      const normalized_asset_path = normalize_asset_path(asset_path);
      const base_name = normalized_asset_path.split("/").pop();

      if (!base_name) {
        continue;
      }

      const lowercase_base_name = base_name.toLowerCase();

      mount_file(`/${base_name}`, asset_bytes);
      if (lowercase_base_name !== base_name) {
        mount_file(`/${lowercase_base_name}`, asset_bytes);
      }

      mount_file(`/assets/${base_name}`, asset_bytes);
      if (lowercase_base_name !== base_name) {
        mount_file(`/assets/${lowercase_base_name}`, asset_bytes);
      }

      if (normalized_asset_path.startsWith("mus/")) {
        mount_file(`/mus/${base_name}`, asset_bytes);
        mount_file(`/assets/mus/${base_name}`, asset_bytes);
        mount_file(`/../mus/${base_name}`, asset_bytes);
        mount_file(`mus/${base_name}`, asset_bytes);
        mount_file(`assets/mus/${base_name}`, asset_bytes);

        if (lowercase_base_name !== base_name) {
          mount_file(`/mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`/../mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`mus/${lowercase_base_name}`, asset_bytes);
          mount_file(`assets/mus/${lowercase_base_name}`, asset_bytes);
        }
      }

      if (normalized_asset_path.startsWith("common/chapters/")) {
        mount_file(`/common/chapters/${base_name}`, asset_bytes);
        mount_file(`/../common/chapters/${base_name}`, asset_bytes);
        mount_file(`/common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/../common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/assets/${normalized_asset_path}`, asset_bytes);
        mount_file(`/assets/../common/chapters/${base_name}`, asset_bytes);
        mount_file(`/assets/../common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/assets/common/chapters/${base_name}`, asset_bytes);
        mount_file(`/assets/common/chapter-common/${base_name}`, asset_bytes);
        mount_file(`/${normalized_asset_path}`, asset_bytes);

        if (lowercase_base_name !== base_name) {
          mount_file(`/common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/../common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/common/chapter-common/${lowercase_base_name}`, asset_bytes);
          mount_file(`/../common/chapter-common/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/../common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/../common/chapter-common/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/common/chapters/${lowercase_base_name}`, asset_bytes);
          mount_file(`/assets/common/chapter-common/${lowercase_base_name}`, asset_bytes);
        }
      }
    }

    protected_audio_fs_ready = true;
    return true;
  }

  async function ensure_shared_audio_pack_object_urls() {
    if (shared_audio_pack_object_urls_ready) {
      return true;
    }

    if (shared_audio_pack_object_urls_promise) {
      return shared_audio_pack_object_urls_promise;
    }

    shared_audio_pack_object_urls_promise = (async () => {
      if (!(shared_audio_pack_member_paths instanceof Set) || shared_audio_pack_member_paths.size === 0) {
        await load_shared_audio_pack_member_paths();
      }

      await load_shared_audio_pack_marker_entry_paths();

      if (!(shared_audio_pack_member_paths instanceof Set) || shared_audio_pack_member_paths.size === 0) {
        return false;
      }

      await Promise.all(Array.from(shared_audio_pack_member_paths, async (asset_path) => {
        if (protected_asset_urls.has(asset_path)) {
          return;
        }

        await create_object_url_from_cached_asset(asset_path, "shared");
      }));

      shared_audio_pack_object_urls_ready = true;
      return true;
    })();

    try {
      return await shared_audio_pack_object_urls_promise;
    } finally {
      shared_audio_pack_object_urls_promise = null;
    }
  }

  async function is_shared_audio_pack_cached() {
    return Boolean(await get_cached_asset_response(shared_audio_pack_asset_path, "shared"));
  }

  const local_shared_audio_pack_base_url = "local-assets/shared/mus/base_index_audio.pak";
  const local_shared_audio_pack_expected_parts = 8;   // 000-007
  const local_shared_audio_pack_max_probe_parts = 64; // safety ceiling when probing
  const local_shared_audio_pack_cache_mode = "no-store";
  let local_shared_audio_pack_available = true;       // flips false after one failed attempt

  function get_local_shared_audio_pack_part_url(part_index) {
    const suffix = String(Math.max(0, Number(part_index) || 0)).padStart(3, "0");
    return to_root_relative(`${local_shared_audio_pack_base_url}.${suffix}`);
  }

  // Probe sequential .000/.001/... parts and return their URLs plus a byte total
  // when the server reports content-length. Stops at the first missing part.
  async function probe_local_shared_audio_pack_parts() {
    const part_descriptors = [];
    let total_bytes = 0;
    let total_bytes_known = true;

    for (let part_index = 0; part_index < local_shared_audio_pack_max_probe_parts; part_index += 1) {
      const part_url = get_local_shared_audio_pack_part_url(part_index);
      let head_response = null;

      try {
        head_response = await window.fetch(part_url, {
          method: "HEAD",
          cache: local_shared_audio_pack_cache_mode,
        });
      } catch (_head_error) {
        break;
      }

      if (!head_response.ok) {
        break;
      }

      const part_bytes = parse_positive_int(head_response.headers.get("content-length"));

      if (part_bytes > 0) {
        total_bytes += part_bytes;
      } else {
        total_bytes_known = false;
      }

      part_descriptors.push({ part_index, part_url, part_bytes });
    }

    return {
      part_descriptors,
      total_bytes: total_bytes_known ? total_bytes : 0,
    };
  }

  async function fetch_local_shared_audio_pack_bytes(options = {}) {
    const started_at_ms = performance.now();
    const { part_descriptors, total_bytes } = await probe_local_shared_audio_pack_parts();

    if (part_descriptors.length === 0) {
      throw new Error(`No local shared audio pack parts found at ${local_shared_audio_pack_base_url}.000`);
    }

    if (
      local_shared_audio_pack_expected_parts > 0
      && part_descriptors.length !== local_shared_audio_pack_expected_parts
    ) {
      console.warn(
        `[loader] expected ${local_shared_audio_pack_expected_parts} shared audio pack parts, found ${part_descriptors.length}.`,
      );
    }

    const status_callback = typeof options.on_status === "function" ? options.on_status : null;
    const progress_callback = typeof options.on_progress === "function" ? options.on_progress : null;
    const chunk_list = [];
    let downloaded_bytes = 0;

    for (const descriptor of part_descriptors) {
      status_callback?.(
        `Downloading audio files... (part ${descriptor.part_index + 1}/${part_descriptors.length})`,
      );

      const part_response = await window.fetch(descriptor.part_url, {
        cache: local_shared_audio_pack_cache_mode,
      });

      if (!part_response.ok) {
        throw new Error(
          `Local shared audio pack part ${descriptor.part_index} returned ${part_response.status}.`,
        );
      }

      const part_base_bytes = downloaded_bytes;
      const part_bytes = await read_response_bytes_with_progress(
        part_response,
        progress_callback
          ? (progress_state) => {
            progress_callback({
              downloaded_bytes: part_base_bytes + (Number(progress_state?.downloaded_bytes) || 0),
              total_bytes,
              done: false,
            });
          }
          : null,
        { total_bytes_hint: descriptor.part_bytes },
      );

      chunk_list.push(part_bytes);
      downloaded_bytes += part_bytes.byteLength;
    }

    const plaintext_bytes = combine_uint8_array_chunks(chunk_list);

    progress_callback?.({
      downloaded_bytes,
      total_bytes: total_bytes || downloaded_bytes,
      done: true,
    });

    console.log(
      `[loader] reassembled local shared audio pack: ${part_descriptors.length} parts, ${plaintext_bytes.byteLength} bytes`,
    );

    return {
      url: null,
      source: "local-parts",
      downloaded_bytes,
      decoded_bytes: plaintext_bytes.byteLength,
      duration_ms: performance.now() - started_at_ms,
      plaintext_bytes,
      original_type: "application/octet-stream",
    };
  }

  async function hydrate_shared_audio_pack(play_scope = get_current_play_scope(), options = {}) {
    if (!shared_audio_pack_enabled) {
      throw new Error("The shared audio pack is disabled.");
    }

    if (shared_audio_pack_promise) {
      return shared_audio_pack_promise;
    }

    shared_audio_pack_promise = (async () => {
      let pack_result = null;

      if (local_shared_audio_pack_available) {
        try {
          pack_result = await fetch_local_shared_audio_pack_bytes({
            on_status: options.on_status,
            on_progress: options.on_progress,
          });
        } catch (local_pack_error) {
          local_shared_audio_pack_available = false;
          console.warn(
            "Local shared audio pack unavailable; falling back to the play API.",
            local_pack_error,
          );
        }
      }

      if (!pack_result) {
        pack_result = await fetch_protected_asset(shared_audio_pack_asset_path, play_scope, {
          persist_object_url: false,
          cache_response: false,
          session_options: options.session_options,
          on_status: options.on_status,
          on_progress: options.on_progress,
        });
      }

      const pack_entries = await cache_shared_audio_pack_entries(pack_result.plaintext_bytes);
      await ensure_shared_audio_pack_object_urls();
      await ensure_shared_audio_pack_memory_entries();
      return {
        ...pack_result,
        entry_count: pack_entries.length,
      };
    })();

    try {
      return await shared_audio_pack_promise;
    } finally {
      shared_audio_pack_promise = null;
    }
  }

  async function prime_shared_audio_pack_cache(play_scope = get_current_play_scope(), options = {}) {
    if (await is_shared_audio_pack_cached()) {
      const has_complete_marker = await has_complete_shared_audio_pack_marker();

      if (has_complete_marker) {
        await load_shared_audio_pack_marker_entry_paths();
        await ensure_shared_audio_pack_object_urls();
        const memory_entries = await ensure_shared_audio_pack_memory_entries();

        if (memory_entries instanceof Map && memory_entries.size > 0 && shared_audio_pack_member_paths instanceof Set && shared_audio_pack_member_paths.size > 0) {
          return {
            url: null,
            source: "cache",
            downloaded_bytes: 0,
            decoded_bytes: 0,
            duration_ms: 0,
            entry_count: 0,
          };
        }
      }

      // Older caches only had a marker and manifest-listed entries. Rehydrate the
      // pack once so engine FS lookups like mus/menu.ogg are available from cache.
      return await hydrate_shared_audio_pack(play_scope, options);
    }

    try {
      return await hydrate_shared_audio_pack(play_scope, options);
    } catch (error) {
      console.warn("Shared audio pack preload failed; continuing without the audio pack.", error);
      shared_audio_pack_enabled = false;
      return null;
    }
  }

  window.prepareSharedAudioPackFileSystem = function prepareSharedAudioPackFileSystem() {
    try {
      const module_instance = typeof window.ModuleName === "function"
        ? window.ModuleName()
        : window.Module;
      install_common_chapter_fs_path_redirects(module_instance);
      const shared_audio_ready = ensure_runner_shared_audio_fs_entries();
      const protected_audio_ready = ensure_runner_protected_audio_fs_entries();
      return shared_audio_ready || protected_audio_ready;
    } catch (error) {
      console.error("Failed to prepare shared audio pack file system:", error);
      return false;
    }
  };

  function remount_audio_cache_for_file_lookup(path) {
    const normalized_path = normalize_runner_audio_request_path(path);
    if (!is_shared_audio_pack_candidate(normalized_path) && !is_manifest_audio_asset(normalized_path)) {
      return path;
    }

    try {
      window.prepareSharedAudioPackFileSystem?.();
    } catch (_prepare_error) {
    }

    return path;
  }

  function normalize_common_chapter_fs_path(file_path) {
    const raw_path = String(file_path ?? "").replace(/\\/g, "/");
    const common_chapters_index = raw_path.toLowerCase().lastIndexOf("common/chapters/");
    const common_chapter_common_index = raw_path.toLowerCase().lastIndexOf("common/chapter-common/");
    const common_index = Math.max(common_chapters_index, common_chapter_common_index);

    if (common_index < 0) {
      return file_path;
    }

    const base_name = raw_path.slice(common_index).split("/").pop();

    if (!base_name) {
      return file_path;
    }

    return raw_path.toLowerCase().includes("common/chapter-common/")
      ? `/common/chapter-common/${base_name}`
      : `/common/chapters/${base_name}`;
  }

  function install_common_chapter_fs_path_redirects(module_instance) {
    if (!module_instance || module_instance.__drCommonChapterFsRedirectsInstalled === true) {
      return;
    }

    const wrap_path_function = (function_name, argument_index = 0) => {
      const original_function = module_instance[function_name];

      if (typeof original_function !== "function" || original_function.__drCommonChapterPathRedirect === true) {
        return;
      }

      const wrapped_function = function common_chapter_path_redirect_wrapper() {
        const args = Array.from(arguments);
        args[argument_index] = normalize_common_chapter_fs_path(args[argument_index]);
        return original_function.apply(this, args);
      };
      wrapped_function.__drCommonChapterPathRedirect = true;
      module_instance[function_name] = wrapped_function;
    };

    wrap_path_function("FS_readFile", 0);
    wrap_path_function("FS_open", 0);
    wrap_path_function("FS_stat", 0);
    wrap_path_function("FS_analyzePath", 0);
    module_instance.__drCommonChapterFsRedirectsInstalled = true;
  }

  async function try_respond_with_shared_audio_pack(resource) {
    const requested_asset_path = normalize_shared_audio_request_url(resource);

    if (
      !shared_audio_pack_enabled
      || !should_use_shared_audio_pack()
      || !is_shared_audio_pack_candidate(requested_asset_path)
    ) {
      return null;
    }

    try {
      await load_shared_audio_pack_member_paths();
      await ensure_shared_audio_pack_memory_entries();
      const normalized_asset_path = resolve_shared_audio_pack_member_path(requested_asset_path);
      let cached_response = await get_cached_asset_response(normalized_asset_path, "shared");

      if (!cached_response && normalized_asset_path !== requested_asset_path) {
        cached_response = await get_cached_asset_response(requested_asset_path, "shared");
      }

      if (!cached_response) {
        await hydrate_shared_audio_pack(get_current_play_scope(), { session_options: {} });
        const hydrated_asset_path = resolve_shared_audio_pack_member_path(requested_asset_path);
        cached_response = await get_cached_asset_response(hydrated_asset_path, "shared")
          || await get_cached_asset_response(requested_asset_path, "shared");
      }

      if (!cached_response) {
        return null;
      }

      return cached_response;
    } catch (error) {
      console.warn(`Unable to satisfy ${requested_asset_path} from shared audio pack cache:`, error);
      return null;
    }
  }

  async function try_fetch_shared_audio_from_pack(asset_path, play_scope = get_current_play_scope(), options = {}) {
    const requested_asset_path = map_common_chapter_asset_path(asset_path);

    if (
      !shared_audio_pack_enabled
      || !is_shared_audio_pack_candidate(requested_asset_path)
      || window.navigator?.onLine === false
    ) {
      return null;
    }

    if (shared_audio_pack_member_paths === null) {
      await load_shared_audio_pack_member_paths();
    }

    try {
      const normalized_asset_path = resolve_shared_audio_pack_member_path(requested_asset_path);
      let cached_response = await get_cached_asset_response(normalized_asset_path, "shared");

      if (!cached_response && normalized_asset_path !== requested_asset_path) {
        cached_response = await get_cached_asset_response(requested_asset_path, "shared");
      }

      if (
        !cached_response
        && shared_audio_pack_member_paths instanceof Set
        && !shared_audio_pack_member_paths.has(normalized_asset_path)
      ) {
        // The current chapter manifest may not list every mus/common file. If the
        // shared pack was cached from Chapter Select, allow direct shared-cache
        // lookup, including case-insensitive modded/official requests such as
        // ../mus/audio_drone.ogg for cached mus/AUDIO_DRONE.ogg.
        await ensure_shared_audio_pack_memory_entries();
        cached_response = await get_cached_asset_response(resolve_shared_audio_pack_member_path(requested_asset_path), "shared");

        if (!cached_response) {
          return null;
        }
      }

      const pack_result = cached_response
        ? {
            source: "shared-cache",
            downloaded_bytes: 0,
            duration_ms: 0,
          }
        : await hydrate_shared_audio_pack(play_scope, options);

      if (options.persist_object_url === false) {
        cached_response = cached_response || await get_cached_asset_response(normalized_asset_path, "shared");

        if (!cached_response) {
          return null;
        }

        const cached_blob = await cached_response.blob();

        return {
          url: null,
          source: pack_result?.source || "network",
          downloaded_bytes: Number(pack_result?.downloaded_bytes) || 0,
          decoded_bytes: cached_blob.size,
          duration_ms: Number(pack_result?.duration_ms) || 0,
          plaintext_bytes: new Uint8Array(await cached_blob.arrayBuffer()),
          original_type: cached_blob.type || "application/octet-stream",
        };
      }

      const cached_object_result = await create_object_url_from_cached_asset(normalized_asset_path, "shared");

      if (!cached_object_result) {
        return null;
      }

      return {
        ...cached_object_result,
        source: pack_result?.source || "network",
        downloaded_bytes: Number(pack_result?.downloaded_bytes) || 0,
        duration_ms: Number(pack_result?.duration_ms) || 0,
      };
    } catch (error) {
      if (is_missing_shared_audio_pack_error(error)) {
        shared_audio_pack_enabled = false;
      }

      console.warn("Falling back to individual shared audio files:", error);
      return null;
    }
  }

  async function inspect_preload_entries(asset_entries) {
    const normalized_entries = asset_entries.map((asset_entry) => normalize_preload_entry(asset_entry));
    const cache_matches = await Promise.all(
      normalized_entries.map(async (entry) => {
        if (is_shared_audio_pack_preload_entry(entry)) {
          return is_shared_audio_pack_cached();
        }

        const normalized_play_scope = normalize_play_scope(entry.play_scope);
        const normalized_asset_path = map_play_asset_path(entry.asset_path, normalized_play_scope);
        return Boolean(await get_cached_asset_response(normalized_asset_path, get_asset_cache_scope(normalized_asset_path, normalized_play_scope)));
      }),
    );

    return normalized_entries.map((entry, entry_index) => ({
      ...entry,
      is_cached: cache_matches[entry_index],
    }));
  }

  async function hydrate_cached_protected_audio_entries(asset_entries) {
    const normalized_entries = Array.isArray(asset_entries)
      ? asset_entries.map((asset_entry) => normalize_preload_entry(asset_entry))
      : [];

    await Promise.all(normalized_entries.map(async (entry) => {
      const normalized_asset_path = map_common_chapter_asset_path(entry?.asset_path);

      if (!is_audio_asset_path(normalized_asset_path) || is_shared_audio_pack_preload_entry(entry)) {
        return;
      }

      if (protected_audio_memory_entries.has(normalized_asset_path)) {
        return;
      }

      await create_object_url_from_cached_asset(normalized_asset_path, entry?.play_scope || get_current_play_scope());
    }));
  }

  function create_preload_timer_state(play_scope, preload_entries) {
    const normalized_entries = Array.isArray(preload_entries) ? preload_entries : [];
    const total_asset_count = normalized_entries.length;
    const missing_asset_count = normalized_entries.reduce(
      (missing_count, entry) => missing_count + (entry?.is_cached ? 0 : 1),
      0,
    );
    const total_missing_expected_bytes = normalized_entries.reduce(
      (total_bytes, entry) => total_bytes + (entry?.is_cached ? 0 : Math.max(0, Number(entry?.expected_bytes) || 0)),
      0,
    );
    const total_non_game_unx_asset_count = normalized_entries.reduce(
      (asset_count, entry) => asset_count + (entry?.asset_path === game_unx_asset_path ? 0 : 1),
      0,
    );
    const has_game_unx_asset = normalized_entries.some((entry) => entry?.asset_path === game_unx_asset_path);

    return {
      play_scope: normalize_play_scope(play_scope),
      started_at_ms: performance.now(),
      total_asset_count,
      total_missing_asset_count: missing_asset_count,
      total_missing_expected_bytes,
      total_non_game_unx_asset_count,
      has_game_unx_asset,
      completed_asset_count: 0,
      completed_network_asset_count: 0,
      completed_network_expected_bytes: 0,
      completed_cached_asset_count: 0,
      completed_non_game_unx_asset_count: 0,
      completed_game_unx_asset_count: 0,
      observed_network_duration_ms: 0,
      observed_network_bytes: 0,
      observed_cached_duration_ms: 0,
      active_asset_path: "",
      active_asset_is_cached: false,
      active_asset_started_at_ms: 0,
      active_asset_first_byte_at_ms: 0,
      active_asset_downloaded_bytes: 0,
      active_asset_total_bytes: 0,
      active_asset_expected_bytes: 0,
      active_asset_progress_fraction: 0,
      active_asset_last_progress_emit_ms: 0,
      active_asset_smoothed_bytes_per_ms: 0,
      active_asset_last_sample_at_ms: 0,
      active_asset_last_sample_downloaded_bytes: 0,
      displayed_download_bytes_per_second: 0,
      displayed_eta_remaining_seconds: 0,
      last_metrics_refresh_at_ms: 0,
      last_eta_remaining_ms: 0,
      last_eta_elapsed_ms: 0,
      history_profile: get_loader_history_profile(play_scope),
    };
  }

  function get_history_network_speed_bytes_per_ms(state) {
    return Math.max(
      default_network_asset_bytes / default_network_asset_duration_ms,
      Number(state?.history_profile?.average_network_bytes_per_ms) || 0,
    );
  }

  function reset_preload_eta_state(state) {
    if (!state) {
      return;
    }

    state.last_eta_remaining_ms = 0;
    state.last_eta_elapsed_ms = 0;
  }

  function get_active_download_started_at_ms(state) {
    if (!state) {
      return 0;
    }

    return state.active_asset_first_byte_at_ms > 0
      ? state.active_asset_first_byte_at_ms
      : state.active_asset_started_at_ms;
  }

  function get_live_active_download_speed_bytes_per_ms(state) {
    if (!state || !state.active_asset_path || state.active_asset_is_cached || state.active_asset_downloaded_bytes <= 0) {
      return 0;
    }

    const now_ms = performance.now();
    const active_download_started_at_ms = get_active_download_started_at_ms(state);
    const request_elapsed_ms = active_download_started_at_ms > 0
      ? Math.max(1, now_ms - active_download_started_at_ms)
      : 0;
    const cumulative_speed_bytes_per_ms = request_elapsed_ms > 0
      ? (state.active_asset_downloaded_bytes / Math.max(request_elapsed_ms, active_download_speed_warmup_ms))
      : 0;
    const smoothed_speed_bytes_per_ms = Math.max(0, Number(state.active_asset_smoothed_bytes_per_ms) || 0);

    if (smoothed_speed_bytes_per_ms > 0 && cumulative_speed_bytes_per_ms > 0) {
      return (smoothed_speed_bytes_per_ms * 0.6) + (cumulative_speed_bytes_per_ms * 0.4);
    }

    return Math.max(smoothed_speed_bytes_per_ms, cumulative_speed_bytes_per_ms);
  }

  function get_effective_active_download_speed_bytes_per_ms(state) {
    const history_speed_bytes_per_ms = get_history_network_speed_bytes_per_ms(state);
    const live_speed_bytes_per_ms = get_live_active_download_speed_bytes_per_ms(state);

    if (live_speed_bytes_per_ms <= 0) {
      return history_speed_bytes_per_ms;
    }

    const active_total_bytes = Math.max(0, Number(state?.active_asset_total_bytes) || 0);
    const active_downloaded_bytes = Math.max(0, Number(state?.active_asset_downloaded_bytes) || 0);
    const observed_progress_fraction = active_total_bytes > 0
      ? clamp_number(active_downloaded_bytes / active_total_bytes, 0, 1)
      : 0;
    const active_download_started_at_ms = get_active_download_started_at_ms(state);
    const request_elapsed_ms = active_download_started_at_ms > 0
      ? Math.max(0, performance.now() - active_download_started_at_ms)
      : 0;
    const warmup_fraction = clamp_number(request_elapsed_ms / 2200, 0, 1);
    const live_speed_weight = clamp_number(
      Math.max((warmup_fraction * 0.82), observed_progress_fraction * 1.15),
      0.6,
      0.96,
    );
    const capped_history_speed_bytes_per_ms = history_speed_bytes_per_ms > 0
      ? Math.min(history_speed_bytes_per_ms, live_speed_bytes_per_ms * 1.35)
      : 0;

    return (capped_history_speed_bytes_per_ms * (1 - live_speed_weight))
      + (live_speed_bytes_per_ms * live_speed_weight);
  }

  function get_history_remaining_ms(state, history_based_total_ms, progress_fraction) {
    if (!state?.history_profile?.runs || history_based_total_ms <= 0) {
      return 0;
    }

    return Math.max(
      0,
      history_based_total_ms * Math.max(0, 1 - clamp_number(progress_fraction, 0, 1)),
    );
  }

  function stabilize_preload_remaining_ms(state, raw_remaining_ms, elapsed_ms, history_remaining_ms = 0) {
    const normalized_raw_remaining_ms = Math.max(0, Number(raw_remaining_ms) || 0);

    if (!state) {
      return normalized_raw_remaining_ms;
    }

    const progress_fraction = get_preload_progress_fraction(state);
    const minimum_remaining_ms = progress_fraction < 0.999
      ? minimum_visible_eta_ms
      : 0;
    const history_floor_weight = state.history_profile?.runs > 0
      ? clamp_number(0.58 - (progress_fraction * 0.28), 0.26, 0.58)
      : 0;
    const history_floor_remaining_ms = history_remaining_ms > 0
      ? (history_remaining_ms * history_floor_weight)
      : 0;
    let next_remaining_ms = Math.max(normalized_raw_remaining_ms, minimum_remaining_ms, history_floor_remaining_ms);

    if (state.last_eta_elapsed_ms > 0 && state.last_eta_remaining_ms > 0) {
      const elapsed_since_last_ms = Math.max(0, elapsed_ms - state.last_eta_elapsed_ms);
      const decayed_previous_remaining_ms = Math.max(0, state.last_eta_remaining_ms - elapsed_since_last_ms);
      const smoothing_alpha = clamp_number(0.12 + (progress_fraction * 0.14), 0.12, 0.26);
      next_remaining_ms = decayed_previous_remaining_ms
        + ((next_remaining_ms - decayed_previous_remaining_ms) * smoothing_alpha);
      next_remaining_ms = Math.max(next_remaining_ms, minimum_remaining_ms, history_floor_remaining_ms);
    }

    state.last_eta_remaining_ms = next_remaining_ms;
    state.last_eta_elapsed_ms = elapsed_ms;
    return next_remaining_ms;
  }

  function compute_preload_timer_estimate(state) {
    if (!state) {
      return null;
    }

    const cached_asset_target = Math.max(0, state.total_asset_count - state.total_missing_asset_count);
    const active_network_asset = state.active_asset_path && !state.active_asset_is_cached;
    const network_asset_duration_ms = state.completed_network_asset_count > 0
      ? (state.observed_network_duration_ms / state.completed_network_asset_count)
      : state.history_profile.average_network_asset_duration_ms;
    const cached_asset_duration_ms = state.completed_cached_asset_count > 0
      ? (state.observed_cached_duration_ms / state.completed_cached_asset_count)
      : state.history_profile.average_cached_asset_duration_ms;
    const fixed_overhead_ms = state.history_profile.runs > 0
      ? state.history_profile.average_fixed_overhead_ms
      : default_fixed_preload_overhead_ms;
    const history_recent_total_ms = Math.max(0, Number(state.history_profile.recent_preload_duration_ms) || 0);
    const history_average_total_ms = Math.max(0, Number(state.history_profile.average_preload_duration_ms) || 0);
    const history_based_total_ms = Math.max(
      default_fixed_preload_overhead_ms,
      history_recent_total_ms > 0 && history_average_total_ms > 0
        ? ((history_recent_total_ms * 0.72) + (history_average_total_ms * 0.28))
        : (history_recent_total_ms || history_average_total_ms || 0),
    );
    const elapsed_ms = performance.now() - state.started_at_ms;
    const remaining_cached_asset_count = Math.max(
      0,
      cached_asset_target - state.completed_cached_asset_count - (state.active_asset_is_cached ? 1 : 0),
    );
    const remaining_network_asset_count = Math.max(
      0,
      state.total_missing_asset_count - state.completed_network_asset_count - (active_network_asset ? 1 : 0),
    );
    const total_missing_expected_bytes = Math.max(0, Number(state.total_missing_expected_bytes) || 0);
    const completed_network_expected_bytes = Math.max(0, Number(state.completed_network_expected_bytes) || 0);
    const active_asset_expected_bytes = Math.max(
      0,
      Number(state.active_asset_total_bytes) || Number(state.active_asset_expected_bytes) || 0,
    );
    let active_network_remaining_ms = 0;

    if (active_network_asset) {
      const effective_speed_bytes_per_ms = get_effective_active_download_speed_bytes_per_ms(state);
      const fallback_speed_bytes_per_ms = state.active_asset_total_bytes > 0 && network_asset_duration_ms > 0
        ? (state.active_asset_total_bytes / network_asset_duration_ms)
        : (default_network_asset_bytes / default_network_asset_duration_ms);
      const resolved_speed_bytes_per_ms = effective_speed_bytes_per_ms > 0
        ? effective_speed_bytes_per_ms
        : fallback_speed_bytes_per_ms;

      if (state.active_asset_total_bytes > 0 && resolved_speed_bytes_per_ms > 0) {
        active_network_remaining_ms = Math.max(
          0,
          (state.active_asset_total_bytes - state.active_asset_downloaded_bytes) / resolved_speed_bytes_per_ms,
        );
      } else {
        active_network_remaining_ms = network_asset_duration_ms;
      }
    }

    const resolved_network_speed_bytes_per_ms = get_effective_active_download_speed_bytes_per_ms(state)
      || get_history_network_speed_bytes_per_ms(state);
    const remaining_expected_network_bytes = Math.max(
      0,
      total_missing_expected_bytes
        - completed_network_expected_bytes
        - (active_network_asset
          ? Math.min(
            Math.max(0, Number(state.active_asset_downloaded_bytes) || 0),
            active_asset_expected_bytes || Math.max(0, Number(state.active_asset_downloaded_bytes) || 0),
          )
          : 0),
    );
    const remaining_network_bytes_based_ms = (
      remaining_expected_network_bytes > 0 && resolved_network_speed_bytes_per_ms > 0
    )
      ? (remaining_expected_network_bytes / resolved_network_speed_bytes_per_ms)
      : 0;

    const remaining_fixed_overhead_ms = Math.max(0, fixed_overhead_ms - Math.min(elapsed_ms, fixed_overhead_ms));
    const live_estimated_total_ms = elapsed_ms
      + remaining_fixed_overhead_ms
      + (remaining_network_bytes_based_ms > 0
        ? remaining_network_bytes_based_ms
        : (active_network_remaining_ms + (remaining_network_asset_count * network_asset_duration_ms)))
      + (remaining_cached_asset_count * cached_asset_duration_ms);
    const progress_fraction = get_preload_progress_fraction(state);
    const history_remaining_ms = get_history_remaining_ms(state, history_based_total_ms, progress_fraction);
    const history_confidence = state.history_profile.runs > 0
      ? clamp_number(0.5 + (Math.min(state.history_profile.runs, 6) * 0.08), 0.5, 0.88)
      : 0;
    let history_weight = history_confidence > 0
      ? clamp_number(
        history_confidence * (1 - (progress_fraction * 0.35)),
        0.34,
        0.9,
      )
      : 0;
    if (active_network_asset && state.active_asset_downloaded_bytes > 0 && remaining_network_bytes_based_ms > 0) {
      history_weight = Math.min(history_weight, 0.2);
    }
    const estimated_total_ms = history_weight > 0
      ? ((history_based_total_ms * history_weight) + (live_estimated_total_ms * (1 - history_weight)))
      : live_estimated_total_ms;
    const raw_remaining_ms = Math.max(0, estimated_total_ms - elapsed_ms);
    const stabilized_remaining_ms = stabilize_preload_remaining_ms(
      state,
      raw_remaining_ms,
      elapsed_ms,
      history_remaining_ms,
    );

    return {
      estimated_total_ms,
      elapsed_ms,
      remaining_ms: stabilized_remaining_ms,
    };
  }

  function get_current_download_bytes_per_second(state) {
    if (!state || !state.active_asset_path || state.active_asset_is_cached || state.active_asset_downloaded_bytes <= 0) {
      return 0;
    }

    const live_speed_bytes_per_ms = get_live_active_download_speed_bytes_per_ms(state);
    return live_speed_bytes_per_ms > 0 ? (live_speed_bytes_per_ms * 1000) : 0;
  }

  function refresh_preload_timer_metrics(force = false) {
    if (!preload_timer_state) {
      return null;
    }

    const now_ms = performance.now();

    if (
      !force
      && preload_timer_state.last_metrics_refresh_at_ms > 0
      && (now_ms - preload_timer_state.last_metrics_refresh_at_ms) < preload_timer_text_update_interval_ms
    ) {
      return null;
    }

    const timer_estimate = compute_preload_timer_estimate(preload_timer_state);

    if (!timer_estimate) {
      preload_timer_state.displayed_download_bytes_per_second = 0;
      preload_timer_state.displayed_eta_remaining_seconds = 0;
      preload_timer_state.last_metrics_refresh_at_ms = now_ms;
      return null;
    }

    const next_display_eta_remaining_seconds = get_signed_preload_eta_remaining_seconds(
      Number(timer_estimate.remaining_ms || 0) + preload_timer_display_eta_padding_ms,
    );
    const previous_display_eta_remaining_seconds = get_preload_display_eta_remaining_seconds(preload_timer_state);

    preload_timer_state.displayed_download_bytes_per_second = get_current_download_bytes_per_second(preload_timer_state);
    preload_timer_state.displayed_eta_remaining_seconds = preload_timer_state.last_metrics_refresh_at_ms > 0
      ? Math.min(previous_display_eta_remaining_seconds, next_display_eta_remaining_seconds)
      : next_display_eta_remaining_seconds;
    preload_timer_state.last_metrics_refresh_at_ms = now_ms;
    return timer_estimate;
  }

  function get_preload_display_eta_remaining_seconds(state) {
    if (!state) {
      return 0;
    }

    const base_remaining_seconds = Math.trunc(Number(state.displayed_eta_remaining_seconds) || 0);

    if (state.last_metrics_refresh_at_ms <= 0) {
      return base_remaining_seconds;
    }

    const elapsed_seconds = Math.floor(Math.max(0, performance.now() - state.last_metrics_refresh_at_ms) / 1000);
    return base_remaining_seconds - elapsed_seconds;
  }

  function get_idle_download_indicator() {
    const frame_index = Math.floor(performance.now() / 160) % idle_download_indicator_frames.length;
    return idle_download_indicator_frames[frame_index];
  }

  function get_preload_progress_fraction(state) {
    if (!state || state.total_asset_count <= 0) {
      return 0;
    }

    const has_other_assets = state.total_non_game_unx_asset_count > 0;
    const has_game_unx_asset = Boolean(state.has_game_unx_asset);
    const other_progress_share = has_other_assets
      ? (has_game_unx_asset ? (1 - preload_game_unx_progress_share) : 1)
      : 0;
    const game_unx_progress_share = has_game_unx_asset
      ? (has_other_assets ? preload_game_unx_progress_share : 1)
      : 0;
    const other_progress_fraction = has_other_assets
      ? clamp_number(
        (
          state.completed_non_game_unx_asset_count
          + (state.active_asset_path && state.active_asset_path !== game_unx_asset_path
            ? state.active_asset_progress_fraction
            : 0)
        ) / state.total_non_game_unx_asset_count,
        0,
        1,
      )
      : 1;
    const game_unx_progress_fraction = has_game_unx_asset
      ? clamp_number(
        state.completed_game_unx_asset_count
        + (state.active_asset_path === game_unx_asset_path ? state.active_asset_progress_fraction : 0),
        0,
        1,
      )
      : 1;

    return clamp_number(
      (other_progress_fraction * other_progress_share) + (game_unx_progress_fraction * game_unx_progress_share),
      0,
      1,
    );
  }

  function update_preload_progress_bar() {
    if (!preload_timer_state) {
      return;
    }

    const progress_fraction = get_preload_progress_fraction(preload_timer_state);
    const progress_percent = base_progress_percent + (progress_fraction * preload_progress_percent);
    set_loader_progress(progress_percent);
  }

  function begin_preload_asset(asset_path, is_cached, expected_bytes = 0) {
    if (!preload_timer_state) {
      return;
    }

    preload_timer_state.active_asset_path = normalize_asset_path(asset_path);
    preload_timer_state.active_asset_is_cached = Boolean(is_cached);
    preload_timer_state.active_asset_started_at_ms = performance.now();
    preload_timer_state.active_asset_first_byte_at_ms = 0;
    preload_timer_state.active_asset_downloaded_bytes = 0;
    preload_timer_state.active_asset_expected_bytes = Math.max(0, Number(expected_bytes) || 0);
    preload_timer_state.active_asset_total_bytes = is_cached
      ? 0
      : (
        preload_timer_state.active_asset_expected_bytes
        || estimate_preload_asset_total_bytes(preload_timer_state.active_asset_path, preload_timer_state.history_profile)
      );
    preload_timer_state.active_asset_progress_fraction = is_cached ? 1 : 0;
    preload_timer_state.active_asset_last_progress_emit_ms = 0;
    preload_timer_state.active_asset_smoothed_bytes_per_ms = 0;
    preload_timer_state.active_asset_last_sample_at_ms = 0;
    preload_timer_state.active_asset_last_sample_downloaded_bytes = 0;
    preload_timer_state.displayed_download_bytes_per_second = 0;

    preload_timer_last_text_update_ms = 0;
    update_preload_timer_text(true);
    update_preload_progress_bar();
  }

  function update_preload_asset_progress(asset_path, downloaded_bytes, total_bytes = 0) {
    if (!preload_timer_state || normalize_asset_path(asset_path) !== preload_timer_state.active_asset_path) {
      return;
    }

    const now_ms = performance.now();
    const previous_downloaded_bytes = Math.max(0, Number(preload_timer_state.active_asset_downloaded_bytes) || 0);
    preload_timer_state.active_asset_downloaded_bytes = Math.max(0, Number(downloaded_bytes) || 0);
    if (preload_timer_state.active_asset_downloaded_bytes <= 0) {
      preload_timer_state.active_asset_first_byte_at_ms = 0;
      preload_timer_state.active_asset_last_progress_emit_ms = 0;
      preload_timer_state.active_asset_smoothed_bytes_per_ms = 0;
      preload_timer_state.active_asset_last_sample_at_ms = 0;
      preload_timer_state.active_asset_last_sample_downloaded_bytes = 0;
      preload_timer_state.displayed_download_bytes_per_second = 0;
    }
    if (preload_timer_state.active_asset_downloaded_bytes > 0 && preload_timer_state.active_asset_first_byte_at_ms <= 0) {
      preload_timer_state.active_asset_first_byte_at_ms = now_ms;
      preload_timer_state.active_asset_last_sample_at_ms = now_ms;
      preload_timer_state.active_asset_last_sample_downloaded_bytes = preload_timer_state.active_asset_downloaded_bytes;
    }
    if ((Number(total_bytes) || 0) > 0) {
      preload_timer_state.active_asset_total_bytes = Math.max(0, Number(total_bytes) || 0);
    }
    preload_timer_state.active_asset_progress_fraction = preload_timer_state.active_asset_total_bytes > 0
      ? clamp_number(preload_timer_state.active_asset_downloaded_bytes / preload_timer_state.active_asset_total_bytes, 0, 1)
      : 0;

    if (
      preload_timer_state.active_asset_downloaded_bytes > previous_downloaded_bytes
      && preload_timer_state.active_asset_last_sample_at_ms > 0
    ) {
      const sample_elapsed_ms = Math.max(1, now_ms - preload_timer_state.active_asset_last_sample_at_ms);
      const sample_downloaded_bytes = preload_timer_state.active_asset_downloaded_bytes
        - preload_timer_state.active_asset_last_sample_downloaded_bytes;

      if (sample_downloaded_bytes > 0) {
        const sample_speed_bytes_per_ms = sample_downloaded_bytes / sample_elapsed_ms;
        preload_timer_state.active_asset_smoothed_bytes_per_ms = preload_timer_state.active_asset_smoothed_bytes_per_ms > 0
          ? ((preload_timer_state.active_asset_smoothed_bytes_per_ms * 0.72) + (sample_speed_bytes_per_ms * 0.28))
          : sample_speed_bytes_per_ms;
        preload_timer_state.active_asset_last_sample_at_ms = now_ms;
        preload_timer_state.active_asset_last_sample_downloaded_bytes = preload_timer_state.active_asset_downloaded_bytes;
      }
    }

    if (
      preload_timer_state.active_asset_last_progress_emit_ms > 0
      && (now_ms - preload_timer_state.active_asset_last_progress_emit_ms) < current_download_progress_emit_interval_ms
    ) {
      return;
    }

    preload_timer_state.active_asset_last_progress_emit_ms = now_ms;
    update_preload_timer_text();
    update_preload_progress_bar();
  }

  function update_preload_timer_text(force = false) {
    if (!timer_element) {
      return;
    }

    if (!preload_timer_state) {
      if (preload_timer_override_text) {
        timer_element.hidden = false;
        timer_element.textContent = preload_timer_override_text;
        preload_timer_last_text_update_ms = performance.now();
        return;
      }

      timer_element.hidden = true;
      timer_element.textContent = "";
      preload_timer_last_text_update_ms = 0;
      return;
    }

    const timer_estimate = refresh_preload_timer_metrics(force);

    if (!timer_estimate && preload_timer_state.last_metrics_refresh_at_ms <= 0) {
      timer_element.hidden = true;
      timer_element.textContent = "";
      preload_timer_last_text_update_ms = 0;
      return;
    }

    timer_element.hidden = false;
    const current_download_bytes_per_second = Math.max(
      0,
      Number(preload_timer_state.displayed_download_bytes_per_second) || 0,
    );
    const displayed_remaining_seconds = get_preload_display_eta_remaining_seconds(preload_timer_state);
    const download_indicator = current_download_bytes_per_second > 0
      ? format_byte_rate(current_download_bytes_per_second)
      : get_idle_download_indicator();
    timer_element.textContent = `Loading... ${get_loader_progress_display_percent()}% (ETA: ${format_duration_clock(displayed_remaining_seconds)} / ↓ ${download_indicator})`;
    preload_timer_last_text_update_ms = performance.now();
  }

  function start_preload_timer(play_scope, preload_entries) {
    stop_preload_timer_interval();
    preload_timer_last_text_update_ms = 0;
    preload_timer_override_text = "";
    preload_timer_state = create_preload_timer_state(play_scope, preload_entries);
    update_preload_timer_text(true);
    update_preload_progress_bar();
    preload_timer_interval_id = window.setInterval(update_preload_timer_text, preload_timer_interval_ms);
  }

  function record_preload_timer_sample(asset_path, asset_result) {
    if (!preload_timer_state || !asset_result) {
      return;
    }

    const normalized_asset_path = normalize_asset_path(asset_path);
    preload_timer_state.completed_asset_count += 1;

    if (asset_result.source === "network") {
      preload_timer_state.completed_network_asset_count += 1;
      preload_timer_state.completed_network_expected_bytes += Math.max(
        0,
        Number(preload_timer_state.active_asset_total_bytes)
          || Number(preload_timer_state.active_asset_expected_bytes)
          || Number(asset_result.downloaded_bytes)
          || 0,
      );
      preload_timer_state.observed_network_duration_ms += Number(asset_result.duration_ms) || 0;
      preload_timer_state.observed_network_bytes += Number(asset_result.downloaded_bytes) || 0;
    } else {
      preload_timer_state.completed_cached_asset_count += 1;
      preload_timer_state.observed_cached_duration_ms += Number(asset_result.duration_ms) || 0;
    }

    if (normalized_asset_path === game_unx_asset_path) {
      preload_timer_state.completed_game_unx_asset_count = 1;
    } else {
      preload_timer_state.completed_non_game_unx_asset_count += 1;
    }

    preload_timer_state.active_asset_path = "";
    preload_timer_state.active_asset_is_cached = false;
    preload_timer_state.active_asset_started_at_ms = 0;
    preload_timer_state.active_asset_first_byte_at_ms = 0;
    preload_timer_state.active_asset_downloaded_bytes = 0;
    preload_timer_state.active_asset_total_bytes = 0;
    preload_timer_state.active_asset_expected_bytes = 0;
    preload_timer_state.active_asset_progress_fraction = 0;
    preload_timer_state.active_asset_last_progress_emit_ms = 0;
    preload_timer_state.active_asset_smoothed_bytes_per_ms = 0;
    preload_timer_state.active_asset_last_sample_at_ms = 0;
    preload_timer_state.active_asset_last_sample_downloaded_bytes = 0;
    update_preload_timer_text();
    update_preload_progress_bar();
  }

  function finish_preload_timer() {
    if (!preload_timer_state) {
      stop_preload_timer_interval();
      return;
    }

    const completed_preload_state = preload_timer_state;
    const elapsed_ms = performance.now() - completed_preload_state.started_at_ms;
    const fixed_overhead_ms = Math.max(
      0,
      elapsed_ms - completed_preload_state.observed_network_duration_ms - completed_preload_state.observed_cached_duration_ms,
    );
    const history_store = read_loader_history_store();
    const normalized_play_scope = completed_preload_state.play_scope;

    const merge_sample_into_bucket = (bucket) => {
      bucket.runs += 1;
      bucket.total_preload_duration_ms += elapsed_ms;
      bucket.last_preload_duration_ms = elapsed_ms;
      bucket.total_asset_count += completed_preload_state.total_asset_count;
      bucket.total_missing_asset_count += completed_preload_state.total_missing_asset_count;
      bucket.total_network_asset_count += completed_preload_state.completed_network_asset_count;
      bucket.total_network_duration_ms += completed_preload_state.observed_network_duration_ms;
      bucket.total_network_bytes += completed_preload_state.observed_network_bytes;
      bucket.total_cached_asset_count += completed_preload_state.completed_cached_asset_count;
      bucket.total_cached_duration_ms += completed_preload_state.observed_cached_duration_ms;
      bucket.total_fixed_overhead_ms += fixed_overhead_ms;
    };

    merge_sample_into_bucket(history_store.global);
    history_store.scopes[normalized_play_scope] = history_store.scopes[normalized_play_scope]
      ?? create_empty_loader_history_bucket();
    merge_sample_into_bucket(history_store.scopes[normalized_play_scope]);
    write_loader_history_store(history_store);

    if (normalized_play_scope === "play") {
      mark_chapter_select_intro_shown();
    }

    preload_timer_state = null;
    preload_timer_last_text_update_ms = 0;
    preload_timer_override_text = "Loading... 100% (ETA: 0:00 / ↓ ✓)";
    stop_preload_timer_interval();
    update_preload_timer_text(true);
  }

  function build_loader_console_log_text() {
    const header_lines = [
      "Project Vinetrap loader log",
      `Generated: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `User agent: ${navigator.userAgent}`,
      `Play scope: ${get_current_play_scope()}`,
      "",
    ];
    const log_lines = loader_console_log_buffer.map((entry) => `[${entry.at}] [${entry.level}] ${entry.message}`);
    return header_lines.concat(log_lines).join("\n");
  }

  function download_loader_console_log_file(log_text, log_id = "local") {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const blob = new Blob([log_text], { type: "text/plain;charset=utf-8" });
      const object_url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = object_url;
      anchor.download = `vinetrap-loader-${timestamp}-${log_id}.log`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(object_url), 30000);
    } catch (error) {
      console.warn("Unable to download loader log file:", error);
    }
  }

  async function upload_loader_console_log(log_text) {
    const response = await window.fetch(get_play_api_url(), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        action: "upload_loader_log",
        generated_at: new Date().toISOString(),
        url: window.location.href,
        play_scope: get_current_play_scope(),
        user_agent: navigator.userAgent,
        log_text,
      }),
    });
    const response_data = await read_api_json(response);
    if (!response.ok || response_data?.ok !== true) {
      throw new Error(response_data?.error || "Unable to upload loader log.");
    }
    return response_data;
  }

  let toby_log_tap_count = 0;
  let toby_log_tap_timer = 0;
  let toby_log_upload_in_flight = false;

  async function export_loader_console_logs() {
    if (toby_log_upload_in_flight) return;
    toby_log_upload_in_flight = true;
    const log_text = build_loader_console_log_text();
    let log_id = "local";
    try {
      const upload_result = await upload_loader_console_log(log_text);
      log_id = String(upload_result.log_id || log_id);
      console.log("[loader] uploaded diagnostic log", upload_result);

      if (window.confirm("Debug logs sent! Wanna save the log?")) {
        download_loader_console_log_file(log_text, log_id);
      }
    } catch (error) {
      console.warn("[loader] unable to upload diagnostic log", error);
      window.alert("Unable to send debug logs. Please try again later.");
    } finally {
      toby_log_upload_in_flight = false;
    }
  }

  function install_toby_log_export_handler() {
    if (!gif_element || gif_element.__drLogExportInstalled) return;
    gif_element.__drLogExportInstalled = true;
    gif_element.style.cursor = "pointer";
    gif_element.title = "Tap three times to export loader logs";
    gif_element.addEventListener("pointerdown", () => {
      const now = Date.now();
      if (now - toby_log_tap_timer > 2500) toby_log_tap_count = 0;
      toby_log_tap_timer = now;
      toby_log_tap_count += 1;
      console.log("[loader] toby dog diagnostic tap", { count: toby_log_tap_count, required: 3 });
      if (toby_log_tap_count >= 3) {
        toby_log_tap_count = 0;
        void export_loader_console_logs();
      }
    });
  }

  function cache_loader_elements() {
    loading_screen = document.getElementById("loadah");
    status_element = document.getElementById("loadahstatus");
    timer_element = document.getElementById("loadah-timer");
    intro_element = document.getElementById("loadah-first-run");
    progress_bar = document.getElementById("progressbar");
    gif_element = document.getElementById("tobyload");
    stage_element = document.getElementById("loadah-stage");
    loader_ui_element = document.getElementById("loadah-ui");
    game_container = document.getElementById("game-container");
    const progress_container = document.getElementById("progressbar-container");

    if (!loading_screen || !gif_element || !status_element || !progress_container) {
      return;
    }

    install_toby_log_export_handler();

    if (!stage_element) {
      stage_element = document.createElement("div");
      stage_element.id = "loadah-stage";
    }

    if (stage_element.parentElement !== loading_screen) {
      if (gif_element.parentElement === loading_screen) {
        loading_screen.insertBefore(stage_element, gif_element);
      } else {
        loading_screen.appendChild(stage_element);
      }
    }

    if (!loader_ui_element) {
      loader_ui_element = document.createElement("div");
      loader_ui_element.id = "loadah-ui";
    }

    if (loader_ui_element.parentElement !== stage_element) {
      stage_element.appendChild(loader_ui_element);
    }

    if (!timer_element) {
      timer_element = document.createElement("div");
      timer_element.id = "loadah-timer";
      timer_element.hidden = true;
    }

    if (gif_element.parentElement !== stage_element) {
      stage_element.insertBefore(gif_element, loader_ui_element);
    }

    if (progress_container.parentElement !== loader_ui_element) {
      loader_ui_element.appendChild(progress_container);
    }

    if (timer_element.parentElement !== loader_ui_element) {
      loader_ui_element.insertBefore(timer_element, progress_container);
    }

    if (status_element.parentElement !== loader_ui_element) {
      loader_ui_element.appendChild(status_element);
    }

    if (!intro_element) {
      intro_element = document.createElement("div");
      intro_element.id = "loadah-first-run";
      intro_element.hidden = true;
      const first_run_lines = [
        '<div class="loadah-first-run-inner">',
      ];

      if (get_audio_caching_mode() === "on") {
        first_run_lines.push(
          "<p class=\"loadah-first-run-line\">We're downloading ~344MB of assets for your first run, please be patient!!</p>",
        );
      }

      first_run_lines.push(
        "<p class=\"loadah-first-run-line\">You can configure asset downloads<br>in the Options menu.</p>",
        "<p class=\"loadah-first-run-line\">Type the word \"vine\" on the keyboard, tap 5 times on mobile or press the right trigger 3 times on controller to open the WebMenu for some extras!</p>",
        "</div>",
      );
      intro_element.innerHTML = first_run_lines.join("");
      stage_element.appendChild(intro_element);
    }

    if (intro_element.parentElement !== stage_element) {
      stage_element.appendChild(intro_element);
    }

    update_loader_layout();
  }

  function update_loader_layout() {
    if (!stage_element) {
      return;
    }

    const stage_rect = stage_element.getBoundingClientRect();
    const stage_width = stage_rect.width || 640;
    const stage_height = stage_rect.height || 480;

    stage_element.style.setProperty("--loadah-ui-width", `${Math.round(stage_width * 0.82)}px`);
    stage_element.style.setProperty("--loadah-ui-bottom", `${Math.round(clamp_number(stage_height * 0.1325, 58, stage_height * 0.19))}px`);
    stage_element.style.setProperty("--loadah-ui-gap", `${Math.round(clamp_number(stage_height * 0.016, 8, 16))}px`);
    stage_element.style.setProperty("--loadah-ui-padding-x", `${Math.round(clamp_number(stage_width * 0.01, 6, 18))}px`);
    stage_element.style.setProperty("--loadah-timer-size", `${Math.round(clamp_number(stage_height * 0.03, 13, 24))}px`);
    stage_element.style.setProperty("--loadah-status-size", `${Math.round(clamp_number(stage_height * 0.034, 14, 28))}px`);
    stage_element.style.setProperty("--loadah-progress-height", `${Math.round(clamp_number(stage_height * 0.05, 18, 36))}px`);
    stage_element.style.setProperty("--loadah-first-run-width", `${Math.round(clamp_number(stage_width * 0.84, stage_width * 0.72, stage_width * 0.9))}px`);
    stage_element.style.setProperty("--loadah-first-run-size", `${Math.round(clamp_number(stage_height * 0.048, 15, 30))}px`);
    stage_element.style.setProperty("--loadah-first-run-gap", `${Math.round(clamp_number(stage_height * 0.03, 12, 24))}px`);
    stage_element.style.setProperty("--loadah-first-run-padding-y", `${Math.round(clamp_number(stage_height * 0.11, 32, 84))}px`);
    stage_element.style.setProperty("--loadah-first-run-padding-x", `${Math.round(clamp_number(stage_width * 0.05, 18, 52))}px`);
  }

  function should_show_chapter_select_intro(play_scope) {
    if (normalize_play_scope(play_scope) !== "play") {
      return false;
    }

    if (is_offline_mode_active()) {
      return false;
    }

    if (get_loader_history_runs("play") > 0) {
      return false;
    }

    try {
      return localStorage.getItem(chapter_select_intro_storage_key) !== "1";
    } catch (_storage_error) {
      return get_loader_history_runs("play") === 0;
    }
  }

  function mark_chapter_select_intro_shown() {
    try {
      localStorage.setItem(chapter_select_intro_storage_key, "1");
    } catch (_storage_error) {
    }
  }

  function get_active_preload_asset_counter() {
    if (!preload_timer_state?.active_asset_path || preload_timer_state.total_asset_count <= 0) {
      return "";
    }

    const active_asset_index = Math.min(
      preload_timer_state.total_asset_count,
      Math.max(1, preload_timer_state.completed_asset_count + 1),
    );
    return `${active_asset_index}/${preload_timer_state.total_asset_count}`;
  }

  function normalize_active_preload_status_message(message) {
    const normalized_message = String(message ?? "").replace(/\s+/g, " ").trim();

    if (!normalized_message || !preload_timer_state?.active_asset_path) {
      return normalized_message;
    }

    const asset_counter = get_active_preload_asset_counter();
    const is_shared_audio_pack = preload_timer_state.active_asset_path === shared_audio_pack_asset_path;

    if (!asset_counter && !is_shared_audio_pack) {
      return normalized_message;
    }

    const retry_match = normalized_message.match(/^Retrying file:.*?(\(Attempt \d+\/\d+\)\.\.\.)$/i);
    if (retry_match) {
      return is_shared_audio_pack
        ? `Retrying audio files... ${retry_match[1]}`
        : `Retrying file: ${asset_counter} ${retry_match[1]}`;
    }

    if (/^Requesting file:/i.test(normalized_message)) {
      return is_shared_audio_pack
        ? "Requesting audio files..."
        : `Requesting file: ${asset_counter}`;
    }

    if (/^Downloading file:/i.test(normalized_message)) {
      const percent_match = normalized_message.match(/\((\d+%)\)\s*$/i);
      const suffix = percent_match ? ` (${percent_match[1]})` : "";
      return is_shared_audio_pack
        ? `Downloading audio files...${suffix}`
        : `Downloading file: ${asset_counter}${suffix}`;
    }

    return normalized_message;
  }

  function normalize_loader_status_message(message) {
    const normalized_message = normalize_active_preload_status_message(message);

    if (!normalized_message) {
      return "";
    }

    const long_hex_token_count = (normalized_message.match(/\b[0-9a-f]{8,}\b/gi) || []).length;
    const letter_count = (normalized_message.match(/[a-z]/gi) || []).length;
    const looks_like_hex_dump = /^(?:[0-9a-f.]{2,}\s+){2,}[0-9a-f.\s]+$/i.test(normalized_message);
    const looks_like_runner_byte_progress = /^loaded\s+\d+%\s+\(\d+\s+of\s+\d+\)\s+bytes$/i.test(normalized_message);

    if (looks_like_runner_byte_progress) {
      return "Loadin' up!";
    }

    if ((looks_like_hex_dump || long_hex_token_count >= 2) && letter_count < 8) {
      return "Loadin' up!";
    }

    return normalized_message;
  }

  async function maybe_show_chapter_select_intro(play_scope) {
    if (!loading_screen || !stage_element || !intro_element || !should_show_chapter_select_intro(play_scope)) {
      if (intro_element) {
        intro_element.hidden = true;
        intro_element.classList.remove("is-fading");
      }
      return;
    }

    mark_chapter_select_intro_shown();
    intro_element.hidden = false;
    intro_element.classList.remove("is-fading");

    await delay(chapter_select_intro_duration_ms);

    window.requestAnimationFrame(() => {
      intro_element?.classList.add("is-fading");
    });
    await delay(chapter_select_intro_fade_duration_ms);

    if (intro_element) {
      intro_element.hidden = true;
      intro_element.classList.remove("is-fading");
    }
  }

  function set_loader_status(message) {
    if (!status_element) {
      return;
    }

    const trimmed_message = normalize_loader_status_message(message);
    status_element.textContent = trimmed_message.length > max_log_length
      ? `${trimmed_message.slice(0, max_log_length)}...`
      : trimmed_message;
  }

  function set_loader_progress(progress_percent) {
    current_loader_progress_percent = Math.max(0, Math.min(100, Number(progress_percent) || 0));

    if (!progress_bar || !gif_element) {
      return;
    }

    const clamped_percent = current_loader_progress_percent;
    progress_bar.style.width = `${clamped_percent}%`;

    const stage_rect = stage_element?.getBoundingClientRect?.();
    const stage_height = stage_rect?.height || window.innerHeight || 480;
    const start_y = -Math.round(stage_height * 0.92);
    const end_y = -Math.round(stage_height * 0.38);
    const current_y = start_y + ((end_y - start_y) * (clamped_percent / 100));
    gif_element.style.transform = `translateX(-50%) translateY(${current_y}px)`;
    update_preload_timer_text();
  }

  function hide_loading_screen() {
    if (loader_hidden) {
      return;
    }

    loader_hidden = true;
    stop_preload_timer_interval();
    preload_timer_override_text = "";

    if (loading_screen) {
      loading_screen.classList.add("hidden");
    }

    if (game_container) {
      game_container.style.visibility = "visible";
    }

    flushscopestats();
  }

  async function refreshcurrentplayrunner(options = {}) {
    const normalized_options = is_plain_object(options) ? options : {};
    const status_message = String(normalized_options.status_message || "Refreshing runner...");
    const play_scope = normalize_play_scope(get_current_play_scope());

    show_loading_screen(status_message);

    try {
      await window.DRWebStats?.stop?.();
    } catch (_stats_error) {
    }

    if (should_use_safe_console_runner_refresh()) {
      window.location.reload();
      return;
    }

    await cache_current_runner_assets_for_refresh(play_scope);
    mark_runner_refresh_record(play_scope);
    window.location.reload();
  }

  async function refreshcurrentplayrunnersafely(options = {}) {
    try {
      await refreshcurrentplayrunner(options);
    } catch (error) {
      console.error("Runner refresh failed, falling back to page reload:", error);
      clear_runner_refresh_record();
      await clear_refresh_asset_cache();
      window.location.reload();
    }
  }

  function set_loader_error(message) {
    if (game_container) {
      game_container.style.visibility = "hidden";
    }

    preload_timer_state = null;
    stop_preload_timer_interval();
    preload_timer_override_text = "";
    update_preload_timer_text();
    set_loader_status(message);
  }

  function return_to_app_from_game_end_signal() {
    try {
      if (window.parent && window.parent !== window) {
        if (typeof window.parent.goToContainerPage === "function") {
          window.parent.goToContainerPage("app/index.html");
          return;
        }

        if (typeof window.parent.goToContainerPageWithoutRemember === "function") {
          window.parent.goToContainerPageWithoutRemember("app/index.html");
          return;
        }
      }
    } catch (_parent_error) {
    }

    try {
      window.location.href = "/app/";
    } catch (_location_error) {
    }
  }

  function attach_log_interceptor() {
    const game_console = window.console;

    if (!game_console || !game_console.log || game_console.__dr_loader_intercepted) {
      return;
    }

    const original_log = game_console.log.bind(game_console);
    game_console.__dr_loader_intercepted = true;

    game_console.log = function (...args) {
      const message = args.map((value) => {
        if (typeof value === "object" && value !== null) {
          try {
            return JSON.stringify(value);
          } catch (_stringify_error) {
            return String(value);
          }
        }

        return String(value);
      }).join(" ");

      const handled_native_game_border_log = handle_native_game_border_log_message(message);

      if (message.includes("###game_end###0")) {
        original_log(...args);
        return_to_app_from_game_end_signal();
        return;
      }

      if (message.includes(hide_signal)) {
        set_loader_progress(100);
        set_loader_status("Starting game...");
        hide_loading_screen();
      } else if (!handled_native_game_border_log && !loader_hidden && message) {
        set_loader_status(message);
      }

      original_log(...args);
    };
  }

  async function read_api_json(response) {
    const response_text = await response.text();

    if (!response_text) {
      return {};
    }

    try {
      return JSON.parse(response_text);
    } catch (_parse_error) {
      return {
        ok: false,
        error: response_text,
      };
    }
  }

  async function derive_play_session_key_bytes(raw_key, session_id, session_salt) {
    const seed_bytes = encode_text(`play-session:${session_id}:${session_salt}:${raw_key}`);
    const digest_buffer = await window.crypto.subtle.digest("SHA-256", seed_bytes);
    return new Uint8Array(digest_buffer);
  }

  async function import_play_mac_key(session_key_bytes) {
    return window.crypto.subtle.importKey(
      "raw",
      session_key_bytes,
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );
  }

  function get_requested_asset_path(url_like) {
    const value = String(url_like ?? "");

    if (!value || value.startsWith("blob:") || value.startsWith("data:")) {
      return null;
    }

    const normalize_candidate = (candidate_value) => {
      const normalized_candidate = map_play_asset_path(candidate_value, get_current_play_scope());

      if (!normalized_candidate) {
        return null;
      }

      if (protected_asset_urls.has(normalized_candidate)) {
        return normalized_candidate;
      }

      const lower_candidate_full = normalized_candidate.toLowerCase();
      if (protected_asset_urls.has(lower_candidate_full)) {
        return lower_candidate_full;
      }

      const lower_candidate = normalized_candidate.toLowerCase();
      const common_chapters_marker = lower_candidate.indexOf("common/chapters/");
      const common_chapter_common_marker = lower_candidate.indexOf("common/chapter-common/");
      const common_borders_marker = lower_candidate.indexOf("common/borders/");
      const mus_marker = lower_candidate.indexOf("mus/");
      const vid_marker = lower_candidate.indexOf("vid/");

      if (common_chapter_common_marker !== -1) {
        const shared_common_path = `common/chapters/${normalized_candidate.slice(common_chapter_common_marker).split("/").pop()}`;
        return protected_asset_urls.has(shared_common_path) ? shared_common_path : null;
      }

      if (common_chapters_marker !== -1) {
        const shared_common_path = normalized_candidate.slice(common_chapters_marker);
        return protected_asset_urls.has(shared_common_path) ? shared_common_path : null;
      }

      if (common_borders_marker !== -1) {
        const shared_border_path = normalized_candidate.slice(common_borders_marker);
        return protected_asset_urls.has(shared_border_path) ? shared_border_path : null;
      }

      if (mus_marker !== -1) {
        const shared_music_path = normalized_candidate.slice(mus_marker);
        return protected_asset_urls.has(shared_music_path) ? shared_music_path : null;
      }

      if (vid_marker !== -1) {
        const shared_video_path = normalized_candidate.slice(vid_marker);
        return protected_asset_urls.has(shared_video_path) ? shared_video_path : null;
      }

      const base_name = normalized_candidate.split("/").pop();
      return protected_asset_urls.has(base_name) ? base_name : null;
    };

    try {
      const request_url = new URL(value, window.location.href);
      return normalize_candidate(request_url.pathname);
    } catch (_url_error) {
      return normalize_candidate(value.replace(/^\.?\//, ""));
    }
  }

  function get_protected_asset_url(url_like) {
    const asset_path = get_requested_asset_path(url_like);
    return asset_path ? protected_asset_urls.get(asset_path) ?? null : null;
  }

  async function compute_play_asset_mac(mac_key, iv_bytes, asset_path, ciphertext_bytes) {
    const mac_bytes = concat_uint8_arrays(iv_bytes, encode_text(asset_path), ciphertext_bytes);
    const mac_buffer = await window.crypto.subtle.sign("HMAC", mac_key, mac_bytes);
    return bytes_to_hex(new Uint8Array(mac_buffer));
  }

  async function read_response_bytes_with_progress(response, progress_callback, options = {}) {
    const hinted_total_bytes = parse_positive_int(options?.total_bytes_hint);
    const total_bytes = hinted_total_bytes || parse_positive_int(
      response.headers.get("x-dr-play-size") || response.headers.get("content-length"),
    );
    const response_reader = response.body?.getReader?.();

    if (!response_reader) {
      const buffer = new Uint8Array(await response.arrayBuffer());

      if (typeof progress_callback === "function") {
        progress_callback({
          downloaded_bytes: buffer.byteLength,
          total_bytes: total_bytes || buffer.byteLength,
          done: true,
        });
      }

      return buffer;
    }

    if (typeof progress_callback === "function" && total_bytes > 0) {
      progress_callback({
        downloaded_bytes: 0,
        total_bytes,
        done: false,
      });
    }

    const chunk_list = [];
    let downloaded_bytes = 0;

    while (true) {
      const { value, done } = await response_reader.read();

      if (done) {
        break;
      }

      if (value) {
        chunk_list.push(value);
        downloaded_bytes += value.byteLength;

        if (typeof progress_callback === "function") {
          progress_callback({
            downloaded_bytes,
            total_bytes,
            done: false,
          });
        }
      }
    }

    const combined_bytes = new Uint8Array(downloaded_bytes);
    let chunk_offset = 0;

    for (const chunk of chunk_list) {
      combined_bytes.set(chunk, chunk_offset);
      chunk_offset += chunk.byteLength;
    }

    if (typeof progress_callback === "function") {
      progress_callback({
        downloaded_bytes,
        total_bytes: total_bytes || downloaded_bytes,
        done: true,
      });
    }

    return combined_bytes;
  }

  async function build_xorshift_state(session_key_bytes, iv_bytes, asset_path) {
    const seed_source = concat_uint8_arrays(session_key_bytes, iv_bytes, encode_text(asset_path));
    const seed_buffer = await window.crypto.subtle.digest("SHA-256", seed_source);
    const seed_bytes = new Uint8Array(seed_buffer);
    const state = [];

    for (let index = 0; index < 16; index += 4) {
      state.push(
        (
          (seed_bytes[index] << 24)
          | (seed_bytes[index + 1] << 16)
          | (seed_bytes[index + 2] << 8)
          | seed_bytes[index + 3]
        ) >>> 0,
      );
    }

    if (!state.some(Boolean)) {
      state[0] = 0x6d2b79f5;
    }

    return state;
  }

  function next_xorshift_word(state) {
    let tail_word = state[3] >>> 0;
    const head_word = state[0] >>> 0;

    state[3] = state[2] >>> 0;
    state[2] = state[1] >>> 0;
    state[1] = head_word >>> 0;

    tail_word ^= (tail_word << 11) >>> 0;
    tail_word ^= tail_word >>> 8;
    const next_word = (tail_word ^ head_word ^ (head_word >>> 19)) >>> 0;
    state[0] = next_word >>> 0;
    return next_word >>> 0;
  }

  async function decrypt_play_asset(
    ciphertext_bytes,
    asset_path,
    play_scope,
    iv_base64,
    expected_mac,
    compression,
    encryption,
    asset_mac_identifier = asset_path,
  ) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const play_session = play_sessions.get(normalized_play_scope) ?? null;

    if (!play_session?.session_key_bytes || !play_session?.mac_key) {
      throw new Error("The play session key was not initialized.");
    }

    const iv_bytes = base64_to_uint8_array(iv_base64);
    const actual_mac = await compute_play_asset_mac(play_session.mac_key, iv_bytes, asset_mac_identifier, ciphertext_bytes);

    if (String(expected_mac ?? "").trim().toLowerCase() !== actual_mac.toLowerCase()) {
      throw new Error(`The encrypted asset check failed for ${asset_path}.`);
    }

    const normalized_encryption = String(encryption ?? "").toLowerCase();
    let decrypted_bytes = new Uint8Array(ciphertext_bytes);

    if (normalized_encryption === "xor") {
      const state = await build_xorshift_state(play_session.session_key_bytes, iv_bytes, asset_mac_identifier);
      decrypted_bytes = new Uint8Array(ciphertext_bytes);
      let offset = 0;

      while (offset < decrypted_bytes.length) {
        const mask_word = next_xorshift_word(state);

        for (let byte_index = 0; byte_index < 4; byte_index += 1) {
          const target_index = offset + byte_index;

          if (target_index >= decrypted_bytes.length) {
            break;
          }

          const shift_amount = (3 - byte_index) * 8;
          decrypted_bytes[target_index] ^= (mask_word >>> shift_amount) & 0xff;
        }

        offset += 4;
      }
    }

    if (String(compression ?? "").toLowerCase() !== "gzip") {
      return decrypted_bytes;
    }

    if (typeof DecompressionStream !== "function") {
      throw new Error("This browser cannot decompress protected play assets.");
    }

    const compressed_blob = new Blob([decrypted_bytes], { type: "application/octet-stream" });
    const decompressed_stream = compressed_blob.stream().pipeThrough(new DecompressionStream("gzip"));
    const decompressed_buffer = await new Response(decompressed_stream).arrayBuffer();
    return new Uint8Array(decompressed_buffer);
  }

  async function create_play_session(gate_result, play_scope = get_current_play_scope(), options = {}) {
    const decrypted_bundle = gate_result?.result?.decrypted_bundle ?? null;
    const normalized_play_scope = normalize_play_scope(play_scope);
    const persistent_session = options?.persistent === true;

    if (!decrypted_bundle?.raw_key) {
      throw new Error("This browser is missing its verification key.");
    }

    const response = await window.fetch(get_play_api_url(), {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "create_play_session",
        play_scope: normalized_play_scope,
        key_id: decrypted_bundle.key_id,
        key: decrypted_bundle.raw_key,
        steamid: decrypted_bundle.steamid,
        appid: decrypted_bundle.appid,
        verification_mode: decrypted_bundle.verification_mode,
        force_encrypt: false,
        persistent: persistent_session,
      }),
    });
    const response_data = await read_api_json(response);

    if (!response.ok || !response_data?.session_id || !response_data?.session_salt) {
      throw new Error(response_data?.error || "Unable to create a verified play session.");
    }

    const session_key_bytes = await derive_play_session_key_bytes(
      decrypted_bundle.raw_key,
      response_data.session_id,
      response_data.session_salt,
    );
    const mac_key = await import_play_mac_key(session_key_bytes);

    const play_session = {
      ...response_data,
      decrypted_bundle,
      play_scope: normalized_play_scope,
      force_encrypt: response_data?.force_encrypt === true,
      session_key_bytes,
      mac_key,
    };
    play_sessions.set(normalized_play_scope, play_session);

    if (normalized_play_scope === get_current_play_scope()) {
      queuescopestats(play_session);
    }

    return play_session;
  }

  function queuescopestats(play_session) {
    if (!play_session?.stats_token) {
      return;
    }

    pendingscopestatssession = play_session;

    if (loader_hidden) {
      flushscopestats();
    }
  }

  async function startscopestats(play_session) {
    if (!play_session?.stats_token) {
      return;
    }

    const stats_session_id = String(play_session.stats_session_id ?? play_session.session_id ?? "").trim();

    if (stats_session_id && startedscopestatssessionid === stats_session_id) {
      return;
    }

    try {
      const sharedstats = await loadsharedstats();
      const started = sharedstats?.start?.(play_session) === true;

      if (started && stats_session_id) {
        startedscopestatssessionid = stats_session_id;
      }
    } catch (error) {
      console.warn("Unable to start scope stats:", error);
    }
  }

  function flushscopestats() {
    if (!pendingscopestatssession?.stats_token) {
      return;
    }

    const play_session = pendingscopestatssession;
    pendingscopestatssession = null;
    startscopestats(play_session);
  }

  async function ensure_play_session(play_scope = get_current_play_scope(), options = {}) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const wants_persistent_session = options?.persistent === true;
    const existing_play_session = play_sessions.get(normalized_play_scope) ?? null;

    if (existing_play_session?.session_id) {
      if (wants_persistent_session && existing_play_session.persistent !== true) {
        play_sessions.delete(normalized_play_scope);
      } else {
        return existing_play_session;
      }
    }

    if (!verified_gate_result) {
      throw new Error("Verification is required before starting a play session.");
    }

    return create_play_session(verified_gate_result, normalized_play_scope, options);
  }


  const cdn_asset_manifest_cache = new Map();

  function get_cdn_asset_cache_key(asset_path, play_scope) {
    return `${normalize_play_scope(play_scope)}::${normalize_asset_path(asset_path)}`;
  }

  async function get_signed_cdn_asset_entry(asset_path, play_scope, play_session, options = {}) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);
    const cache_key = get_cdn_asset_cache_key(normalized_asset_path, normalized_play_scope);
    const cached_entry = cdn_asset_manifest_cache.get(cache_key);
    if (
      options.force_refresh !== true
      && cached_entry?.url
      && (!cached_entry.expires_at || Date.parse(cached_entry.expires_at) > Date.now() + 30000)
    ) {
      return cached_entry;
    }

    const response = await window.fetch(get_play_api_url(), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        action: "create_cdn_asset_manifest",
        session_id: play_session.session_id,
        assets: [{ asset_path: normalized_asset_path, play_scope: normalized_play_scope }],
      }),
    });

    const response_data = await read_api_json(response);
    log_loader_cache_debug("cdn manifest response", {
      asset_path: normalized_asset_path,
      play_scope: normalized_play_scope,
      force_refresh: Boolean(options.force_refresh),
      response: get_response_debug_info(response),
      response_data,
      browser: {
        online: navigator.onLine,
        page_url: window.location.href,
        origin: window.location.origin,
      },
    });
    if (!response.ok || !Array.isArray(response_data?.entries) || response_data.entries.length === 0) {
      throw create_loader_error(response_data?.error || "CDN asset URL unavailable.", { retryable: retryable_play_asset_statuses.has(response.status), status_code: response.status });
    }

    const entry = response_data.entries[0];
    if (entry?.url) {
      entry.url = normalize_cdn_entry_url(entry.url);
    }
    cdn_asset_manifest_cache.set(cache_key, entry);
    return entry;
  }

  // ── GitHub raw asset host (replaces BunnyCDN / vinetrap.b-cdn.net) ──────────
  // Assets live in: public/local-assets/{scope|shared}/{asset_path}
  // Example: rush/runner.data →
  //   https://raw.githubusercontent.com/Mahdiisdumb/DELTARUNE-SDSG/main/public/local-assets/rush/runner.data
  //
  // GitHub raw paths are CASE-SENSITIVE. Everything in this repo is stored
  // lowercase, so we always lowercase the path segments when building URLs.
  const GITHUB_RAW_BASE =
    "https://raw.githubusercontent.com/Mahdiisdumb/DELTARUNE-SDSG/main/public/local-assets";

  function build_github_raw_asset_url(asset_path, play_scope) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);

    // Shared music / common / borders live under the "shared" folder on disk.
    const cache_scope = get_asset_cache_scope(normalized_asset_path, normalized_play_scope);
    let folder = cache_scope === "shared" ? "shared" : normalized_play_scope;

    // Case-insensitive: GitHub raw is case-sensitive and this repo stores
    // files in lowercase (game.unx, runner.data, …).
    const lower_folder = String(folder || "").toLowerCase();
    const lower_asset = String(normalized_asset_path || "").toLowerCase();

    const url = `${GITHUB_RAW_BASE}/${lower_folder}/${lower_asset}`;
    return url.replace(/([^:]\/)\/+/g, "$1"); // collapse any double slashes
  }

  // Only game.unx / *.unx / *.unxw are split into .000 .001 … part files.
  // Never probe parts for audio (.ogg) or other assets.
  function should_try_unx_part_files(asset_path) {
    const lower = String(normalize_asset_path(asset_path) || "").toLowerCase();
    if (!lower) return false;
    // Exact game.unx, debug/game.unx, or any path ending in .unx / .unxw
    // but NOT already a numbered part like game.unx.000
    if (/\.\d{3}$/.test(lower)) return false;
    return (
      lower === "game.unx"
      || lower.endsWith("/game.unx")
      || lower.endsWith(".unx")
      || lower.endsWith(".unxw")
    );
  }

  // Kept for compatibility with any remaining callers; always returns "".
  function get_408_fallback_cdn_url(_url) {
    return "";
  }

  function normalize_cdn_entry_url(url) {
    // No longer needed for GitHub raw (already HTTPS), but keep as identity.
    return String(url || "");
  }

  function get_error_debug_info(error) {
    if (!error) {
      return null;
    }

    return {
      name: String(error.name || ""),
      message: String(error.message || error),
      stack: String(error.stack || ""),
      cause: error.cause ? String(error.cause?.message || error.cause) : "",
      code: error.code ?? null,
    };
  }

  function get_response_debug_info(response) {
    if (!response) {
      return null;
    }

    const headers = {};
    try {
      response.headers?.forEach((value, key) => {
        headers[key] = value;
      });
    } catch (_headers_error) {
    }

    return {
      ok: Boolean(response.ok),
      status: Number(response.status) || 0,
      status_text: String(response.statusText || ""),
      type: String(response.type || ""),
      url: String(response.url || ""),
      redirected: Boolean(response.redirected),
      headers,
    };
  }

  function get_cdn_debug_url_info(url) {
    try {
      const parsed_url = new URL(url, window.location.href);
      const query = {};
      parsed_url.searchParams.forEach((value, key) => {
        query[key] = value;
      });
      const expires_value = parsed_url.searchParams.get("expires")
        || parsed_url.searchParams.get("exp")
        || parsed_url.searchParams.get("e")
        || "";
      const expires_unix = Number(expires_value) || 0;
      const now_unix = Math.floor(Date.now() / 1000);
      return {
        full_url: parsed_url.toString(),
        href: parsed_url.href,
        origin: parsed_url.origin,
        protocol: parsed_url.protocol,
        host: parsed_url.host,
        hostname: parsed_url.hostname,
        port: parsed_url.port,
        pathname: parsed_url.pathname,
        search: parsed_url.search,
        query,
        query_keys: Array.from(parsed_url.searchParams.keys()),
        expires: expires_value,
        now_unix,
        ttl_remaining_seconds: expires_unix > 0 ? expires_unix - now_unix : null,
      };
    } catch (error) {
      return {
        full_url: String(url || ""),
        error: String(error?.message || error),
      };
    }
  }

  async function try_fetch_cdn_asset(asset_path, play_scope, play_session, options = {}) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);

    // GitHub-raw mode: skip signed CDN manifest / Bunny entirely.
    // Still require a play session so ownership gate stays intact.
    if (!play_session?.session_id || options.disable_cdn === true) {
      return null;
    }

    const github_url = build_github_raw_asset_url(normalized_asset_path, normalized_play_scope);
    const url_info = get_cdn_debug_url_info(github_url);
    const can_use_parts = should_try_unx_part_files(normalized_asset_path);

    log_loader_cache_debug("github raw download start", {
      asset_path: normalized_asset_path,
      play_scope: normalized_play_scope,
      url_info,
      can_use_parts,
    });

    const fetch_options = { cache: "no-store", mode: "cors" };
    const started_at = performance.now();

    // For known-split game.unx assets, prefer parts immediately when the
    // single file is missing. Still try the full file first (chapter1/play
    // ship a single game.unx).
    let response;
    try {
      response = await window.fetch(github_url, fetch_options);
    } catch (fetch_error) {
      log_loader_cache_debug("github raw fetch threw", {
        asset_path: normalized_asset_path,
        play_scope: normalized_play_scope,
        duration_ms: Math.round(performance.now() - started_at),
        error: get_error_debug_info(fetch_error),
        url_info,
        browser: { online: navigator.onLine },
      });

      // Network throw: if this is an unx, still try parts as a fallback.
      if (can_use_parts) {
        const part_result = await try_fetch_github_raw_part_files(
          normalized_asset_path,
          normalized_play_scope,
          options,
        );
        if (part_result) {
          return {
            url: null,
            source: "github-raw-parts",
            downloaded_bytes: part_result.plaintext_bytes.byteLength,
            decoded_bytes: part_result.plaintext_bytes.byteLength,
            duration_ms: Math.round(performance.now() - started_at),
            plaintext_bytes: part_result.plaintext_bytes,
            original_type: part_result.original_type || "application/octet-stream",
          };
        }
      }

      throw create_loader_error(
        `GitHub raw fetch failed for ${normalized_asset_path}: ${fetch_error?.message || fetch_error}`,
        { retryable: true, status_code: 0 },
      );
    }

    // On 404 for .unx only → assemble part files (.000 .001 …).
    if (response.status === 404 && can_use_parts) {
      log_loader_cache_debug("github raw 404 on unx; probing for part files", {
        asset_path: normalized_asset_path,
        play_scope: normalized_play_scope,
        url_info,
        first_part_url: build_github_raw_asset_url(`${normalized_asset_path}.000`, normalized_play_scope),
      });

      if (typeof options.on_status === "function") {
        options.on_status(`Combining game.unx parts...`);
      } else if (!loader_hidden) {
        set_loader_status("Combining game.unx parts...");
      }

      const part_result = await try_fetch_github_raw_part_files(
        normalized_asset_path,
        normalized_play_scope,
        options,
      );

      if (part_result) {
        log_loader_cache_debug("github raw part-files combined", {
          asset_path: normalized_asset_path,
          play_scope: normalized_play_scope,
          parts: part_result.part_count,
          bytes: part_result.plaintext_bytes.byteLength,
          duration_ms: Math.round(performance.now() - started_at),
        });
        return {
          url: null,
          source: "github-raw-parts",
          downloaded_bytes: part_result.plaintext_bytes.byteLength,
          decoded_bytes: part_result.plaintext_bytes.byteLength,
          duration_ms: Math.round(performance.now() - started_at),
          plaintext_bytes: part_result.plaintext_bytes,
          original_type: part_result.original_type || "application/octet-stream",
        };
      }

      log_loader_cache_debug("github raw download failed", {
        asset_path: normalized_asset_path,
        play_scope: normalized_play_scope,
        status: 404,
        status_text: "Not Found (no part files either)",
        url_info,
      });
      throw create_loader_error(
        `GitHub raw returned 404 for ${normalized_asset_path} (no part files found).`,
        { retryable: false, status_code: 404 },
      );
    }

    log_loader_cache_debug("github raw fetch response", {
      asset_path: normalized_asset_path,
      play_scope: normalized_play_scope,
      duration_ms: Math.round(performance.now() - started_at),
      url_info,
      response: get_response_debug_info(response),
      browser: { online: navigator.onLine },
    });

    if (!response.ok) {
      log_loader_cache_debug("github raw download failed", {
        asset_path: normalized_asset_path,
        play_scope: normalized_play_scope,
        status: response.status,
        status_text: response.statusText,
        url_info,
      });
      throw create_loader_error(
        `GitHub raw returned ${response.status} for ${normalized_asset_path}.`,
        { retryable: retryable_play_asset_statuses.has(response.status), status_code: response.status },
      );
    }

    const plaintext_bytes = await read_response_bytes_with_progress(response, options.on_progress, {
      total_bytes_hint: 0,
    });

    log_loader_cache_debug("github raw download complete", {
      asset_path: normalized_asset_path,
      play_scope: normalized_play_scope,
      bytes: plaintext_bytes.byteLength,
      url_info,
    });

    return {
      url: null,
      source: "github-raw",
      downloaded_bytes: plaintext_bytes.byteLength,
      decoded_bytes: plaintext_bytes.byteLength,
      duration_ms: Math.round(performance.now() - started_at),
      plaintext_bytes,
      original_type: response.headers.get("content-type") || "application/octet-stream",
    };
  }

  /**
   * Probe for sequential game.unx part files only:
   *   game.unx.000, game.unx.001, game.unx.002, …
   * Returns null if the first part (.000) does not exist.
   * Downloads every consecutive part and concatenates them in order.
   */
  async function try_fetch_github_raw_part_files(asset_path, play_scope, options = {}) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);

    // Hard guard: never assemble parts for non-unx assets (ogg, etc.).
    if (!should_try_unx_part_files(normalized_asset_path)) {
      return null;
    }

    const fetch_options = { cache: "no-store", mode: "cors" };
    const max_parts = 64;
    const part_buffers = [];
    let original_type = "application/octet-stream";
    let total_downloaded = 0;

    // First part must exist; otherwise this is not a split asset.
    // Path is lowercased inside build_github_raw_asset_url.
    const first_part_url = build_github_raw_asset_url(
      `${normalized_asset_path}.000`,
      normalized_play_scope,
    );

    log_loader_cache_debug("github raw probing first part", {
      asset_path: normalized_asset_path,
      play_scope: normalized_play_scope,
      first_part_url,
    });

    let first_response;
    try {
      first_response = await window.fetch(first_part_url, fetch_options);
    } catch (err) {
      log_loader_cache_debug("github raw first part threw", {
        asset_path: normalized_asset_path,
        error: get_error_debug_info(err),
        first_part_url,
      });
      return null;
    }

    if (!first_response.ok) {
      log_loader_cache_debug("github raw first part missing", {
        asset_path: normalized_asset_path,
        status: first_response.status,
        first_part_url,
      });
      return null;
    }

    original_type = first_response.headers.get("content-type") || original_type;
    const first_bytes = await read_response_bytes_with_progress(first_response, (progress) => {
      if (typeof options.on_status === "function") {
        options.on_status(`Downloading game.unx part 1...`);
      } else if (!loader_hidden) {
        set_loader_status("Downloading game.unx part 1...");
      }
      if (typeof options.on_progress === "function") {
        options.on_progress({
          downloaded_bytes: progress.downloaded_bytes,
          total_bytes: 0,
          done: false,
        });
      }
    });
    part_buffers.push(first_bytes);
    total_downloaded += first_bytes.byteLength;

    log_loader_cache_debug("github raw part found", {
      asset_path: normalized_asset_path,
      part: 0,
      bytes: first_bytes.byteLength,
      url: first_part_url,
    });

    // Download consecutive parts until a 404 (or non-ok) response.
    for (let part_index = 1; part_index < max_parts; part_index += 1) {
      const part_suffix = String(part_index).padStart(3, "0");
      const part_url = build_github_raw_asset_url(
        `${normalized_asset_path}.${part_suffix}`,
        normalized_play_scope,
      );

      let part_response;
      try {
        part_response = await window.fetch(part_url, fetch_options);
      } catch (err) {
        log_loader_cache_debug("github raw part threw; stopping", {
          asset_path: normalized_asset_path,
          part: part_index,
          error: get_error_debug_info(err),
        });
        break;
      }

      if (!part_response.ok) {
        log_loader_cache_debug("github raw part end", {
          asset_path: normalized_asset_path,
          part: part_index,
          status: part_response.status,
          collected_parts: part_buffers.length,
        });
        break;
      }

      if (typeof options.on_status === "function") {
        options.on_status(`Downloading game.unx part ${part_index + 1}...`);
      } else if (!loader_hidden) {
        set_loader_status(`Downloading game.unx part ${part_index + 1}...`);
      }

      const part_bytes = await read_response_bytes_with_progress(part_response, (progress) => {
        if (typeof options.on_progress === "function") {
          options.on_progress({
            downloaded_bytes: total_downloaded + progress.downloaded_bytes,
            total_bytes: 0,
            done: false,
          });
        }
      });

      part_buffers.push(part_bytes);
      total_downloaded += part_bytes.byteLength;

      log_loader_cache_debug("github raw part found", {
        asset_path: normalized_asset_path,
        part: part_index,
        bytes: part_bytes.byteLength,
        url: part_url,
      });
    }

    if (part_buffers.length === 0) {
      return null;
    }

    const combined = combine_uint8_array_chunks(part_buffers);

    if (typeof options.on_progress === "function") {
      options.on_progress({
        downloaded_bytes: combined.byteLength,
        total_bytes: combined.byteLength,
        done: true,
      });
    }

    if (typeof options.on_status === "function") {
      options.on_status(`Combined ${part_buffers.length} game.unx parts.`);
    } else if (!loader_hidden) {
      set_loader_status(`Combined ${part_buffers.length} game.unx parts.`);
    }

    return {
      plaintext_bytes: combined,
      original_type,
      part_count: part_buffers.length,
    };
  }

  async function fetch_chunked_protected_asset(asset_path, play_scope, play_session, options = {}) {
    const normalized_asset_path = normalize_asset_path(asset_path);
    const normalized_play_scope = normalize_play_scope(play_scope);
    const cdn_asset_result = await try_fetch_cdn_asset(normalized_asset_path, normalized_play_scope, play_session, {
      ...options,
      disable_cdn: false,
    });

    if (!cdn_asset_result?.plaintext_bytes) {
      throw create_loader_error(`CDN asset URL unavailable for ${normalized_asset_path}.`, { retryable: true });
    }

    return {
      plaintext_bytes: cdn_asset_result.plaintext_bytes,
      original_type: cdn_asset_result.original_type || "application/octet-stream",
      downloaded_bytes: cdn_asset_result.downloaded_bytes || cdn_asset_result.plaintext_bytes.byteLength,
    };
  }


  async function close_play_session(play_scope = get_current_play_scope()) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const existing_play_session = play_sessions.get(normalized_play_scope) ?? null;

    play_sessions.delete(normalized_play_scope);

    if (!existing_play_session?.session_id) {
      return false;
    }

    try {
      await window.fetch(get_play_api_url(), {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          action: "close_play_session",
          session_id: existing_play_session.session_id,
        }),
        keepalive: true,
      });
      return true;
    } catch (_close_error) {
      return false;
    }
  }

  async function fetch_protected_asset(asset_path, play_scope = get_current_play_scope(), options = {}) {
    const started_at_ms = performance.now();
    const normalized_play_scope = normalize_play_scope(play_scope);
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), normalized_play_scope);
    const cache_scope = get_asset_cache_scope(normalized_asset_path, normalized_play_scope);
    const session_options = is_plain_object(options.session_options) ? options.session_options : {};
    const persist_object_url = options.persist_object_url !== false;
    const cache_response = options.cache_response !== false;
    const max_attempts = Math.max(1, Number(options.max_attempts) || protected_asset_max_attempts);
    const status_callback = typeof options.on_status === "function"
      ? options.on_status
      : (!loader_hidden ? set_loader_status : null);
    let last_error = null;

    const shared_audio_pack_result = await try_fetch_shared_audio_from_pack(
      normalized_asset_path,
      normalized_play_scope,
      {
        persist_object_url,
        session_options,
        on_status: options.on_status,
        on_progress: options.on_progress,
      },
    );

    if (shared_audio_pack_result) {
      return shared_audio_pack_result;
    }

    for (let attempt_number = 1; attempt_number <= max_attempts; attempt_number += 1) {
      let waiting_timer_id = null;

      if (attempt_number > 1 && typeof options.on_progress === "function") {
        options.on_progress({
          downloaded_bytes: 0,
          total_bytes: 0,
          done: false,
          retrying: true,
          attempt_number,
          max_attempts,
        });
      }

      if (status_callback) {
        status_callback(
          attempt_number === 1
            ? `Requesting file: ${normalized_asset_path}`
            : `Retrying file: ${normalized_asset_path} (Attempt ${attempt_number}/${max_attempts})...`,
        );
      }

      try {
        const play_session = await ensure_play_session(normalized_play_scope, session_options);
        const cdn_asset_result = await try_fetch_cdn_asset(normalized_asset_path, normalized_play_scope, play_session, options);
        if (!cdn_asset_result) {
          throw create_loader_error(`CDN asset URL unavailable for ${normalized_asset_path}.`, { retryable: true });
        }

        {
          const asset_blob = new Blob([cdn_asset_result.plaintext_bytes], { type: cdn_asset_result.original_type });
          if (cache_response) {
            await cache_protected_asset_blob(normalized_asset_path, asset_blob, cache_scope);
          }
          remember_protected_audio_memory_entry(normalized_asset_path, cdn_asset_result.plaintext_bytes);
          const duration_ms = performance.now() - started_at_ms;

          if (!persist_object_url) {
            return {
              ...cdn_asset_result,
              duration_ms,
              normalized_asset_path,
            };
          }

          const object_url = URL.createObjectURL(asset_blob);
          register_protected_asset_url(normalized_asset_path, object_url, normalized_play_scope);
          return {
            url: object_url,
            source: "cdn",
            downloaded_bytes: cdn_asset_result.downloaded_bytes,
            decoded_bytes: cdn_asset_result.decoded_bytes,
            duration_ms,
          };
        }

        if (should_use_chunked_asset_fetch(normalized_asset_path, play_session, options)) {
          try {
            const {
              plaintext_bytes,
              original_type,
              downloaded_bytes,
            } = await fetch_chunked_protected_asset(
              normalized_asset_path,
              normalized_play_scope,
              play_session,
              options,
            );
            const asset_blob = new Blob([plaintext_bytes], { type: original_type });
            if (cache_response) {
              await cache_protected_asset_blob(normalized_asset_path, asset_blob, cache_scope);
            }
            remember_protected_audio_memory_entry(normalized_asset_path, plaintext_bytes);
            const duration_ms = performance.now() - started_at_ms;

            if (!persist_object_url) {
              return {
                url: null,
                source: "network",
                downloaded_bytes,
                decoded_bytes: plaintext_bytes.byteLength,
                duration_ms,
                plaintext_bytes,
                original_type,
              };
            }

            const object_url = URL.createObjectURL(asset_blob);
            register_protected_asset_url(normalized_asset_path, object_url, normalized_play_scope);
            return {
              url: object_url,
              source: "network",
              downloaded_bytes,
              decoded_bytes: plaintext_bytes.byteLength,
              duration_ms,
            };
          } catch (chunk_error) {
            if (!is_chunk_unsupported_play_asset_error(chunk_error)) {
              throw chunk_error;
            }

            non_chunkable_protected_assets.add(normalized_asset_path);
          }
        }

        throw create_loader_error(`GitHub-raw delivery is enabled; refusing VPS asset fallback for ${normalized_asset_path}.`, { retryable: true });

      } catch (error) {
        last_error = error;

        if (should_reset_play_session_after_error(error)) {
          play_sessions.delete(normalized_play_scope);
        }

        if (!is_retryable_play_asset_error(error) || attempt_number >= max_attempts) {
          throw error;
        }

        await delay(protected_asset_retry_delay_ms * attempt_number);
      } finally {
        if (waiting_timer_id !== null) {
          window.clearTimeout(waiting_timer_id);
        }
      }
    }

    throw last_error ?? new Error(`Unable to load ${normalized_asset_path}.`);
  }

  async function fetch_protected_asset_response(asset_path, play_scope = get_current_play_scope(), options = {}) {
    const {
      plaintext_bytes,
      original_type,
      normalized_asset_path,
    } = await fetch_protected_asset(asset_path, play_scope, {
      ...options,
      persist_object_url: false,
    });

    return new Response(plaintext_bytes, {
      headers: {
        "content-type": original_type || "application/octet-stream",
        "content-length": String(plaintext_bytes.byteLength),
        "cache-control": "no-store",
        "x-dr-protected-asset": normalized_asset_path,
      },
    });
  }

  async function prime_protected_asset_cache(asset_path, play_scope = get_current_play_scope(), options = {}) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), normalized_play_scope);
    const cache_scope = get_asset_cache_scope(normalized_asset_path, normalized_play_scope);

    if (await get_cached_asset_response(normalized_asset_path, cache_scope)) {
      return {
        url: null,
        source: "cache",
        downloaded_bytes: 0,
        decoded_bytes: 0,
        duration_ms: 0,
      };
    }

    return fetch_protected_asset(normalized_asset_path, normalized_play_scope, {
      allow_chunked: options.allow_chunked,
      persist_object_url: false,
      session_options: options.session_options,
      on_status: options.on_status,
      on_progress: options.on_progress,
    });
  }

  async function ensure_protected_asset_url(asset_path, play_scope = get_current_play_scope(), options = {}) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const normalized_asset_path = map_play_asset_path(normalize_runner_audio_request_path(asset_path), normalized_play_scope);
    const cache_scope = get_asset_cache_scope(normalized_asset_path, normalized_play_scope);

    const memory_key = get_protected_asset_memory_key(normalized_asset_path, normalized_play_scope);

    if (protected_asset_urls.has(memory_key)) {
      const memory_result = {
        url: protected_asset_urls.get(memory_key),
        source: "memory",
        downloaded_bytes: 0,
        decoded_bytes: 0,
        duration_ms: 0,
      };
      return options.detailed ? memory_result : memory_result.url;
    }

    const cached_object_result = await create_object_url_from_cached_asset(normalized_asset_path, cache_scope);

    if (cached_object_result) {
      return options.detailed ? cached_object_result : cached_object_result.url;
    }

    const network_result = await fetch_protected_asset(normalized_asset_path, normalized_play_scope, {
      allow_chunked: options.allow_chunked,
      session_options: options.session_options,
      on_progress: options.on_progress,
    });
    return options.detailed ? network_result : network_result.url;
  }

  function install_protected_asset_interceptors() {
    if (protected_asset_interceptors_installed) {
      return;
    }

    protected_asset_interceptors_installed = true;

    const original_fetch = window.fetch.bind(window);
    window.fetch = function (resource, ...args) {
      const protected_asset_url = get_protected_asset_url(resource?.url ?? resource);

      if (protected_asset_url) {
        if (resource instanceof Request) {
          return original_fetch(new Request(protected_asset_url, resource), ...args);
        }

        return original_fetch(protected_asset_url, ...args);
      }

      return original_fetch(resource, ...args);
    };

    const original_audio_constructor = window.Audio;
    if (typeof original_audio_constructor === "function") {
      const wrapped_audio_constructor = function (...args) {
        const rewritten_args = [...args];

        if (rewritten_args.length > 0) {
          rewritten_args[0] = get_protected_asset_url(rewritten_args[0]) ?? rewritten_args[0];
        }

        return Reflect.construct(original_audio_constructor, rewritten_args, new.target || original_audio_constructor);
      };

      Object.setPrototypeOf(wrapped_audio_constructor, original_audio_constructor);
      wrapped_audio_constructor.prototype = original_audio_constructor.prototype;
      window.Audio = wrapped_audio_constructor;
    }

    const original_xhr_open = XMLHttpRequest.prototype.open;
    const original_xhr_send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__dr_original_request_url = url;
      this.__dr_original_request_method = method;
      const rewritten_url = get_protected_asset_url(url) ?? url;
      return original_xhr_open.call(this, method, rewritten_url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
      const xhr = this;
      const original_url = xhr.__dr_original_request_url;
      const method = String(xhr.__dr_original_request_method || "GET").toUpperCase();
      const normalized_shared_audio_path = normalize_shared_audio_request_url(original_url);

      if (
        method !== "GET"
        || !normalized_shared_audio_path
        || !is_shared_audio_pack_candidate(normalized_shared_audio_path)
        || Boolean(get_protected_asset_url(original_url))
      ) {
        return original_xhr_send.call(xhr, body);
      }

      try_respond_with_shared_audio_pack(original_url).then(async (response) => {
        if (!response) {
          original_xhr_send.call(xhr, body);
          return;
        }

        const response_type = String(xhr.responseType || "").toLowerCase();
        const array_buffer = await response.arrayBuffer();
        const blob_type = response.headers.get("content-type") || guess_protected_asset_type(normalized_shared_audio_path);
        const text_value = response_type && response_type !== "text" ? "" : new TextDecoder().decode(array_buffer.slice(0));
        const response_value = response_type === "blob"
          ? new Blob([array_buffer], { type: blob_type })
          : response_type === "arraybuffer" || response_type === "moz-chunked-arraybuffer"
            ? array_buffer
            : text_value;

        Object.defineProperty(xhr, "readyState", { configurable: true, get: () => 4 });
        Object.defineProperty(xhr, "status", { configurable: true, get: () => 200 });
        Object.defineProperty(xhr, "statusText", { configurable: true, get: () => "OK" });
        Object.defineProperty(xhr, "responseURL", { configurable: true, get: () => String(original_url || "") });
        Object.defineProperty(xhr, "response", { configurable: true, get: () => response_value });
        Object.defineProperty(xhr, "responseText", { configurable: true, get: () => text_value });

        if (typeof xhr.onreadystatechange === "function") {
          xhr.onreadystatechange(new Event("readystatechange"));
        }

        const progress_init = {
          lengthComputable: true,
          loaded: array_buffer.byteLength,
          total: array_buffer.byteLength,
        };
        xhr.dispatchEvent(new ProgressEvent("readystatechange", progress_init));
        xhr.dispatchEvent(new ProgressEvent("progress", progress_init));

        if (typeof xhr.onload === "function") {
          xhr.onload(new ProgressEvent("load", progress_init));
        }

        xhr.dispatchEvent(new ProgressEvent("load", progress_init));

        if (typeof xhr.onloadend === "function") {
          xhr.onloadend(new ProgressEvent("loadend", progress_init));
        }

        xhr.dispatchEvent(new ProgressEvent("loadend", progress_init));
      }).catch((error) => {
        console.warn(`Unable to intercept shared audio request ${normalized_shared_audio_path}:`, error);
        original_xhr_send.call(xhr, body);
      });
    };

    const original_set_attribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      const lower_name = String(name ?? "").toLowerCase();
      const tag_name = String(this.tagName ?? "").toLowerCase();

      if (
        lower_name === "src"
        && (tag_name === "audio" || tag_name === "video" || tag_name === "source" || tag_name === "script")
      ) {
        return original_set_attribute.call(this, name, get_protected_asset_url(value) ?? value);
      }

      return original_set_attribute.call(this, name, value);
    };

    for (const prototype_object of [HTMLMediaElement?.prototype, HTMLSourceElement?.prototype, HTMLScriptElement?.prototype]) {
      if (!prototype_object) {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(prototype_object, "src");

      if (!descriptor?.set || !descriptor.get) {
        continue;
      }

      Object.defineProperty(prototype_object, "src", {
        configurable: true,
        enumerable: descriptor.enumerable ?? true,
        get: descriptor.get,
        set(value) {
          descriptor.set.call(this, get_protected_asset_url(value) ?? value);
        },
      });
    }

    if (window.AudioWorklet?.prototype?.addModule) {
      const original_add_module = window.AudioWorklet.prototype.addModule;
      window.AudioWorklet.prototype.addModule = function (module_url, ...rest) {
        return original_add_module.call(this, get_protected_asset_url(module_url) ?? module_url, ...rest);
      };
    }
  }

  function extract_manifest_files_from_html(html_text) {
    const text = String(html_text || "");
    const match = text.match(/function\s+manifestFiles\s*\(\)\s*\{\s*return\s+([\s\S]*?);\s*\}/);

    if (!match) {
      return [];
    }

    try {
      const value = Function(`"use strict"; return (${match[1]});`)();

      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string") {
        return value.split(";").filter(Boolean);
      }
    } catch (error) {
      console.warn("Unable to parse embedded manifestFiles() fallback:", error);
    }

    return [];
  }

  function get_manifest_index_fallback_url(requested_manifest_url) {
    const requested_value = String(requested_manifest_url || "");
    return requested_value.replace(/runner\.json(?:[?#].*)?$/i, "index.html");
  }

  async function load_runner_manifest(manifest_url = "index.html") {
    const current_play_scope = normalize_play_scope(get_current_play_scope());
    const normalized_manifest_url = normalize_asset_path(manifest_url);
    const requested_manifest_url = normalized_manifest_url === "runner.json" && current_play_scope.endsWith("/debug")
      ? "../runner.json"
      : manifest_url;

    try {
      const response = await window.fetch(requested_manifest_url);

      if (response.ok) {
        if (/\.html(?:[?#].*)?$/i.test(String(requested_manifest_url || ""))) {
          const embedded_manifest_files = extract_manifest_files_from_html(await response.text());

          if (embedded_manifest_files.length > 0) {
            return embedded_manifest_files;
          }
        } else {
          const manifest_data = await response.json();
          const manifest_files = Array.isArray(manifest_data?.manifestFiles)
            ? manifest_data.manifestFiles
            : [];

          return manifest_files.length > 0 ? manifest_files : fallback_manifest_files;
        }
      }
    } catch (_manifest_fetch_error) {
    }

    try {
      const index_response = await window.fetch(get_manifest_index_fallback_url(requested_manifest_url));

      if (index_response.ok) {
        const embedded_manifest_files = extract_manifest_files_from_html(await index_response.text());

        if (embedded_manifest_files.length > 0) {
          return embedded_manifest_files;
        }
      }
    } catch (_embedded_manifest_error) {
    }

    return fallback_manifest_files;
  }

  async function load_shared_audio_pack_member_paths() {
    if (shared_audio_pack_member_paths instanceof Set) {
      return shared_audio_pack_member_paths;
    }

    if (shared_audio_pack_member_paths_promise) {
      return shared_audio_pack_member_paths_promise;
    }

    shared_audio_pack_member_paths_promise = (async () => {
      try {
        const member_manifest_url = new URL("play/index.html", get_play_root_url()).toString();
        const manifest_files = await load_runner_manifest(member_manifest_url);
        shared_audio_pack_member_paths = extract_shared_audio_pack_member_paths(manifest_files);
        return shared_audio_pack_member_paths;
      } catch (_shared_audio_manifest_error) {
        return null;
      }
    })();

    try {
      return await shared_audio_pack_member_paths_promise;
    } finally {
      shared_audio_pack_member_paths_promise = null;
    }
  }

  function normalize_preload_entry(asset_entry) {
    if (typeof asset_entry === "string") {
      return {
        asset_path: normalize_asset_path(asset_entry),
        play_scope: get_current_play_scope(),
        loader_kind: "",
        expected_bytes: 0,
        supports_chunked_delivery: null,
      };
    }

    return {
      asset_path: normalize_asset_path(asset_entry?.asset_path),
      play_scope: normalize_play_scope(asset_entry?.play_scope),
      loader_kind: String(asset_entry?.loader_kind || "").trim(),
      expected_bytes: Math.max(0, Number(asset_entry?.expected_bytes) || 0),
      supports_chunked_delivery: typeof asset_entry?.supports_chunked_delivery === "boolean"
        ? asset_entry.supports_chunked_delivery
        : null,
    };
  }

  function to_preload_entries(manifest_files, play_scope) {
    const normalized_play_scope = normalize_play_scope(play_scope);
    const preload_asset_paths = new Set(
      manifest_files.map((file_name) => map_play_asset_path(file_name, normalized_play_scope)).filter(Boolean),
    );

    // Chapters sometimes reference ../common/chapters/*.ogg at runtime even when a
    // specific chapter manifest forgot the file. These are regular protected
    // common sound files, not music-pack members, so cache them beside the pak.
    if (normalized_play_scope !== "play" || should_use_shared_audio_pack()) {
      for (const common_asset_path of shared_chapter_common_sound_asset_paths) {
        preload_asset_paths.add(`common/chapters/${common_asset_path}`);
      }
    }

    // Borders are handled by store_missing_game_border_assets() so they have
    // their own status section and never inflate the normal file preload count.

    return Array.from(preload_asset_paths).map((asset_path) => ({
      asset_path,
      play_scope: normalized_play_scope,
      loader_kind: "",
      expected_bytes: 0,
      supports_chunked_delivery: null,
    }));
  }

  function get_preload_entry_cache_key(preload_entry) {
    const normalized_entry = normalize_preload_entry(preload_entry);
    return `${get_asset_cache_scope(normalized_entry.asset_path, normalized_entry.play_scope)}::${normalized_entry.asset_path}`;
  }

  async function fetch_preload_eta_manifest(preload_entries, play_scope = get_current_play_scope()) {
    if (is_offline_mode_active()) {
      return new Map();
    }

    const normalized_entries = preload_entries
      .map((preload_entry) => normalize_preload_entry(preload_entry))
      .filter((preload_entry) => preload_entry.asset_path);

    if (normalized_entries.length === 0) {
      return new Map();
    }

    const play_session = await ensure_play_session(play_scope);

    if (!play_session?.session_id) {
      return new Map();
    }

    const response = await window.fetch(get_play_api_url(), {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "get_play_eta_manifest",
        session_id: play_session.session_id,
        assets: normalized_entries.map((preload_entry) => ({
          asset_path: preload_entry.asset_path,
          play_scope: preload_entry.play_scope,
        })),
      }),
    });
    const response_data = await read_api_json(response);

    if (!response.ok || !Array.isArray(response_data?.entries)) {
      throw new Error(response_data?.error || "Unable to load play ETA metadata.");
    }

    const metadata_map = new Map();

    for (const entry of response_data.entries) {
      const cache_key = String(entry?.cache_key || "").trim();
      const size_bytes = Math.max(0, Number(entry?.size_bytes) || 0);

      if (!cache_key) {
        continue;
      }

      metadata_map.set(cache_key, {
        size_bytes,
        supports_chunked_delivery: typeof entry?.supports_chunked_delivery === "boolean"
          ? entry.supports_chunked_delivery
          : null,
      });
    }

    return metadata_map;
  }

  async function apply_preload_entry_sizes(preload_entries, play_scope = get_current_play_scope()) {
    if (!Array.isArray(preload_entries) || preload_entries.length === 0) {
      return preload_entries;
    }

    try {
      preload_eta_manifest_promise = preload_eta_manifest_promise
        ?? fetch_preload_eta_manifest(preload_entries, play_scope);
      const metadata_map = await preload_eta_manifest_promise;
      return preload_entries.map((preload_entry) => {
        const normalized_entry = normalize_preload_entry(preload_entry);
        const cache_key = get_preload_entry_cache_key(normalized_entry);
        const metadata_entry = metadata_map.get(cache_key) || null;
        return {
          ...normalized_entry,
          expected_bytes: Math.max(
            0,
            Number(metadata_entry?.size_bytes) || normalized_entry.expected_bytes || 0,
          ),
          supports_chunked_delivery: typeof metadata_entry?.supports_chunked_delivery === "boolean"
            ? metadata_entry.supports_chunked_delivery
            : normalized_entry.supports_chunked_delivery,
        };
      });
    } catch (_eta_manifest_error) {
      return preload_entries.map((preload_entry) => normalize_preload_entry(preload_entry));
    } finally {
      preload_eta_manifest_promise = null;
    }
  }

  function collapse_shared_audio_pack_preload_entries(preload_entries, play_scope = get_current_play_scope()) {
    // Skip mode should only prepare the files required to boot the runner/game.
    // Audio, common, border, and optional manifest assets are fetched during
    // gameplay and are not persisted.
    if (get_audio_caching_mode() === "skip") {
      return preload_entries.filter((preload_entry) => {
        const preload_asset_path = normalize_asset_path(preload_entry?.asset_path);
        return !is_shared_audio_pack_asset(preload_asset_path)
          && !is_manifest_audio_asset(preload_asset_path)
          && !is_shared_chapter_common_asset(preload_asset_path)
          && !is_game_border_asset_path(preload_asset_path)
          && (
            preload_asset_path === game_unx_asset_path
            || is_runtime_bundle_asset_path(preload_asset_path)
            || preload_asset_path.endsWith(".data")
            || preload_asset_path.endsWith(".wasm")
            || preload_asset_path.endsWith(".unx")
            || preload_asset_path.endsWith(".unxw")
          );
      });
    }

    // No Audio mode disables and excludes all audio preloading while still
    // allowing common non-audio assets and borders to be preloaded/cached.
    if (get_audio_caching_mode() === "noaudio") {
      return preload_entries.filter((preload_entry) => {
        const preload_asset_path = preload_entry?.asset_path;
        return !is_manifest_audio_asset(preload_asset_path)
          && !is_shared_audio_pack_asset(preload_asset_path);
      });
    }

    // Audio Caching Off means no shared audio pack: use the individual OGGs that
    // the current page/chapter manifest requests.
    if (get_audio_caching_mode() === "off") {
      return preload_entries.filter((preload_entry) => !is_shared_audio_pack_asset(preload_entry?.asset_path));
    }

    if (!shared_audio_pack_enabled || !should_use_shared_audio_pack()) {
      return preload_entries.filter((preload_entry) => !is_shared_audio_pack_asset(preload_entry?.asset_path));
    }

    const collapsed_entries = [];
    let found_shared_audio_entry = false;
    let found_shared_audio_pack_entry = false;
    const normalized_play_scope = normalize_play_scope(play_scope);

    for (const preload_entry of preload_entries) {
      const preload_asset_path = preload_entry?.asset_path;

      if (is_shared_audio_pack_asset(preload_asset_path)) {
        found_shared_audio_entry = true;
        found_shared_audio_pack_entry = true;

        collapsed_entries.push({
          ...preload_entry,
          asset_path: shared_audio_pack_asset_path,
          play_scope: normalized_play_scope,
          loader_kind: "shared_audio_pack",
        });

        continue;
      }

      // Audio Caching: On means startup should not individually preload mus .ogg
      // entries from the page manifest. Every loader page explicitly
      // preload/caches the single shared base pack plus common/border assets so
      // those assets are handled as one cache set.
      if (
        is_shared_audio_pack_candidate(preload_asset_path)
        || (
          is_known_shared_audio_pack_member(preload_asset_path)
          && !is_shared_chapter_common_asset(preload_asset_path)
        )
      ) {
        found_shared_audio_entry = true;
        continue;
      }

      collapsed_entries.push(preload_entry);
    }

    if (!found_shared_audio_pack_entry) {
      collapsed_entries.unshift({
        asset_path: shared_audio_pack_asset_path,
        play_scope: normalized_play_scope,
        loader_kind: "shared_audio_pack",
      });
    }

    return collapsed_entries;
  }

  async function load_preload_manifest_files() {
    let manifest_files = fallback_manifest_files;
    const current_play_scope = get_current_play_scope();

    try {
      manifest_files = await load_runner_manifest();
    } catch (_manifest_error) {
    }

    if (current_play_scope === "play") {
      shared_audio_pack_member_paths = extract_shared_audio_pack_member_paths(manifest_files);
    } else if (shared_audio_pack_member_paths === null) {
      await load_shared_audio_pack_member_paths();
    }

    if (current_play_scope !== "play") {
      return collapse_shared_audio_pack_preload_entries(
        to_preload_entries(manifest_files, current_play_scope),
        current_play_scope,
      );
    }

    const combined_manifest_files = new Map();
    const play_root_url = get_play_root_url();

    for (const preload_entry of to_preload_entries(manifest_files, current_play_scope)) {
      const cache_key = `${get_asset_cache_scope(preload_entry.asset_path, preload_entry.play_scope)}::${preload_entry.asset_path}`;
      combined_manifest_files.set(cache_key, preload_entry);
    }

    for (const chapter_scope of chapter_select_prefetch_scopes) {
      const manifest_url = new URL(`${chapter_scope}/index.html`, play_root_url).toString();

      try {
        const chapter_manifest_files = await load_runner_manifest(manifest_url);

        for (const preload_entry of to_preload_entries(chapter_manifest_files, chapter_scope)) {
          if (!should_persist_asset_cache(preload_entry.asset_path, preload_entry.play_scope)) {
            continue;
          }

          const cache_key = `${get_asset_cache_scope(preload_entry.asset_path, preload_entry.play_scope)}::${preload_entry.asset_path}`;
          combined_manifest_files.set(cache_key, preload_entry);
        }
      } catch (_chapter_manifest_error) {
      }
    }

    return collapse_shared_audio_pack_preload_entries(
      Array.from(combined_manifest_files.values()),
      current_play_scope,
    );
  }

  async function unregister_service_workers() {
    if (is_offline_mode_active()) {
      return;
    }

    if (!navigator.serviceWorker?.getRegistrations) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => {})));
    } catch (_service_worker_error) {
    }
  }

  async function load_shared_gate() {
    if (window.gate?.check_saved_ownership || window.ownership_gate?.check_saved_ownership) {
      return window.gate ?? window.ownership_gate;
    }

    if (!gate_loader_promise) {
      gate_loader_promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = to_root_relative("shared/local-gate.js");
        script.onload = () => resolve(window.gate ?? window.ownership_gate ?? null);
        script.onerror = () => reject(new Error("Unable to load the shared verification gate."));
        document.head.appendChild(script);
      });
    }

    return gate_loader_promise;
  }

  async function loadsharedstats() {
    if (window.DRWebStats?.start) {
      return window.DRWebStats;
    }

    if (!sharedstatsloaderpromise) {
      sharedstatsloaderpromise = new Promise((resolve, reject) => {
        const config_script = document.createElement("script");
        config_script.src = to_root_relative("shared/stats-config.js");
        config_script.onload = () => {
          const helper_script = document.createElement("script");
          helper_script.src = to_root_relative("shared/stats.js");
          helper_script.onload = () => resolve(window.DRWebStats ?? null);
          helper_script.onerror = () => reject(new Error("Unable to load the shared stats helper."));
          document.head.appendChild(helper_script);
        };
        config_script.onerror = () => reject(new Error("Unable to load the shared stats config."));
        document.head.appendChild(config_script);
      });
    }

    return sharedstatsloaderpromise;
  }

  async function ensure_verified_ownership() {
    const shared_gate = await load_shared_gate();

    if (!shared_gate?.check_saved_ownership) {
      throw new Error("Verification is unavailable in this browser.");
    }

    const gate_result = await shared_gate.check_saved_ownership();

    if (!gate_result?.verified) {
      throw new Error("Verification required.");
    }

    return gate_result;
  }

  async function ensure_verified_play_session(play_scope = get_current_play_scope(), options = {}) {
    if (!verified_gate_result) {
      verified_gate_result = await ensure_verified_ownership();
    }

    return ensure_play_session(play_scope, options);
  }

  function redirect_to_verification() {
    const shared_gate = window.gate ?? window.ownership_gate ?? null;

    if (shared_gate?.go_to_page) {
      shared_gate.go_to_page("verif/index.html");
      return;
    }

    window.location.href = to_root_relative("verif/index.html");
  }

  async function store_missing_game_border_assets(play_scope = get_current_play_scope()) {
    if (get_audio_caching_mode() !== "on") {
      return { checked: 0, stored: 0 };
    }

    const normalized_play_scope = normalize_play_scope(play_scope);
    const border_asset_paths = Array.from(new Set(get_game_border_asset_paths_to_preload()))
      .map((asset_path) => map_play_asset_path(asset_path, normalized_play_scope))
      .filter(Boolean);

    if (border_asset_paths.length === 0) {
      return { checked: 0, stored: 0 };
    }

    const missing_border_paths = [];
    for (const border_asset_path of border_asset_paths) {
      const cache_scope = get_asset_cache_scope(border_asset_path, normalized_play_scope);
      const cached_response = await get_cached_asset_response(border_asset_path, cache_scope);
      log_loader_cache_debug(cached_response ? "border cache hit" : "border cache miss", {
        asset_path: border_asset_path,
        play_scope: normalized_play_scope,
        cache_scope,
        cache_key: get_protected_asset_cache_key(border_asset_path, cache_scope),
      });
      if (!cached_response) {
        missing_border_paths.push(border_asset_path);
      }
    }

    log_loader_cache_debug("border cache check complete", {
      play_scope: normalized_play_scope,
      checked: border_asset_paths.length,
      missing: missing_border_paths.length,
    });

    if (missing_border_paths.length === 0) {
      return { checked: border_asset_paths.length, stored: 0 };
    }

    for (let border_index = 0; border_index < missing_border_paths.length; border_index += 1) {
      const border_asset_path = missing_border_paths[border_index];
      const border_counter = `${border_index + 1}/${missing_border_paths.length}`;
      log_loader_cache_debug("border store start", {
        asset_path: border_asset_path,
        play_scope: normalized_play_scope,
        cache_scope: get_asset_cache_scope(border_asset_path, normalized_play_scope),
        cache_key: get_protected_asset_cache_key(border_asset_path, get_asset_cache_scope(border_asset_path, normalized_play_scope)),
        index: border_index + 1,
        total: missing_border_paths.length,
      });
      set_loader_status(`Storing borders... (${border_counter})`);
      await prime_protected_asset_cache(border_asset_path, normalized_play_scope, {
        on_status() {
          set_loader_status(`Storing borders... (${border_counter})`);
        },
        on_progress() {
          set_loader_status(`Storing borders... (${border_counter})`);
        },
      });
      log_loader_cache_debug("border store complete", {
        asset_path: border_asset_path,
        play_scope: normalized_play_scope,
        cache_scope: get_asset_cache_scope(border_asset_path, normalized_play_scope),
        index: border_index + 1,
        total: missing_border_paths.length,
      });
    }

    return { checked: border_asset_paths.length, stored: missing_border_paths.length };
  }

  async function preload_manifest_assets(manifest_files) {
    const filtered_entries = manifest_files
      .map((asset_entry) => normalize_preload_entry(asset_entry))
      .filter(({ asset_path }) => {
        const normalized_asset_path = normalize_asset_path(asset_path);
        const base_name = normalized_asset_path.split("/").pop() || normalized_asset_path;
        return asset_path
          && !is_game_border_asset_path(normalized_asset_path)
          && !skipped_manifest_files.has(String(asset_path))
          && !skipped_manifest_files.has(normalized_asset_path)
          && !skipped_manifest_files.has(base_name)
          && !(asset_path === game_unx_asset_path && protected_asset_urls.has(game_unx_asset_path));
      });
    const current_play_scope = get_current_play_scope();

    await store_missing_game_border_assets(current_play_scope);

    if (filtered_entries.length === 0) {
      set_loader_progress(100);
      return;
    }

    const inspected_entries = await inspect_preload_entries(filtered_entries);
    await hydrate_cached_protected_audio_entries(inspected_entries);
    const missing_cached_assets = inspected_entries.reduce(
      (missing_count, entry) => missing_count + (entry.is_cached ? 0 : 1),
      0,
    );
    let missing_asset_index = 0;
    for (const inspected_entry of inspected_entries) {
      if (inspected_entry?.is_cached) {
        inspected_entry.preload_missing_index = 0;
        inspected_entry.preload_missing_total = missing_cached_assets;
        continue;
      }

      missing_asset_index += 1;
      inspected_entry.preload_missing_index = missing_asset_index;
      inspected_entry.preload_missing_total = missing_cached_assets;
    }
    const preload_label = missing_cached_assets > 0
      ? `Preloading ${missing_cached_assets} new assets...`
      : "Loading cached assets...";

    function get_preload_asset_counter(entry, fallback_index = 0) {
      if (Number(entry?.preload_missing_total) <= 0 || entry?.is_cached) {
        return "";
      }

      const normalized_total = Math.max(1, Number(entry?.preload_missing_total) || 1);
      const normalized_index = Math.max(
        1,
        Number(entry?.preload_missing_index) || Math.min(normalized_total, Math.max(1, fallback_index)),
      );
      return `${normalized_index}/${normalized_total}`;
    }

    function normalize_preload_status_message(message, entry, fallback_index = 0) {
      const normalized_message = String(message ?? "").trim();
      const isSharedAudioPack = is_shared_audio_pack_preload_entry(entry);

      if (!normalized_message) {
        return preload_label;
      }

      const asset_counter = get_preload_asset_counter(entry, fallback_index);
      if (!asset_counter && !isSharedAudioPack) {
        return preload_label;
      }

      const retry_match = normalized_message.match(/^Retrying file:.*?(\(Attempt \d+\/\d+\)\.\.\.)$/i);

      if (retry_match) {
        return isSharedAudioPack
          ? `Retrying audio files... ${retry_match[1]}`
          : `Retrying file: ${asset_counter} ${retry_match[1]}`;
      }

      if (/^Requesting file:/i.test(normalized_message)) {
        return isSharedAudioPack
          ? "Requesting audio files..."
          : `Requesting file: ${asset_counter}`;
      }

      if (/^Downloading file:/i.test(normalized_message)) {
        return isSharedAudioPack
          ? "Downloading audio files..."
          : `Downloading file: ${asset_counter}`;
      }

      return normalized_message;
    }

    start_preload_timer(current_play_scope, inspected_entries);
    set_loader_status(preload_label);
    set_loader_progress(base_progress_percent);

    for (let asset_index = 0; asset_index < inspected_entries.length; asset_index += 1) {
      const current_entry = inspected_entries[asset_index];
      const { asset_path, play_scope, is_cached } = current_entry;
      const normalized_play_scope = normalize_play_scope(play_scope);
      const should_register_live_url = normalized_play_scope === current_play_scope;
      const isSharedAudioPack = is_shared_audio_pack_preload_entry(current_entry);
      let asset_result = null;
      begin_preload_asset(asset_path, is_cached, current_entry?.expected_bytes);

      if (should_register_live_url) {
        if (isSharedAudioPack) {
          asset_result = await prime_shared_audio_pack_cache(normalized_play_scope, {
            on_status(message) {
              set_loader_status(
                normalize_preload_status_message(
                  message,
                  current_entry,
                  asset_index + 1,
                ),
              );
            },
            on_progress(progress_state) {
              update_preload_asset_progress(
                asset_path,
                progress_state?.downloaded_bytes,
                progress_state?.total_bytes,
              );
              if ((Number(progress_state?.downloaded_bytes) || 0) > 0) {
                set_loader_status(
                  `Downloading audio files... (${format_progress_percent(progress_state?.downloaded_bytes, progress_state?.total_bytes)})`,
                );
              }
            },
          });
        } else {
          asset_result = await ensure_protected_asset_url(asset_path, normalized_play_scope, {
            detailed: true,
            allow_chunked: current_entry?.supports_chunked_delivery === true,
            on_status(message) {
              set_loader_status(
                normalize_preload_status_message(
                  message,
                  current_entry,
                  asset_index + 1,
                ),
              );
            },
            on_progress(progress_state) {
              update_preload_asset_progress(
                asset_path,
                progress_state?.downloaded_bytes,
                progress_state?.total_bytes,
              );
              if ((Number(progress_state?.downloaded_bytes) || 0) > 0) {
                set_loader_status(
                  `Downloading file: ${get_preload_asset_counter(current_entry, asset_index + 1)} (${format_progress_percent(progress_state?.downloaded_bytes, progress_state?.total_bytes)})`,
                );
              }
            },
          });
        }
      } else {
        if (isSharedAudioPack) {
          asset_result = await prime_shared_audio_pack_cache(normalized_play_scope, {
            on_status(message) {
              set_loader_status(
                normalize_preload_status_message(
                  message,
                  current_entry,
                  asset_index + 1,
                ),
              );
            },
            on_progress(progress_state) {
              update_preload_asset_progress(
                asset_path,
                progress_state?.downloaded_bytes,
                progress_state?.total_bytes,
              );
              if ((Number(progress_state?.downloaded_bytes) || 0) > 0) {
                set_loader_status(
                  `Downloading audio files... (${format_progress_percent(progress_state?.downloaded_bytes, progress_state?.total_bytes)})`,
                );
              }
            },
          });
        } else {
          asset_result = await prime_protected_asset_cache(asset_path, normalized_play_scope, {
            allow_chunked: current_entry?.supports_chunked_delivery === true,
            on_status(message) {
              set_loader_status(
                normalize_preload_status_message(
                  message,
                  current_entry,
                  asset_index + 1,
                ),
              );
            },
            on_progress(progress_state) {
              update_preload_asset_progress(
                asset_path,
                progress_state?.downloaded_bytes,
                progress_state?.total_bytes,
              );
              if ((Number(progress_state?.downloaded_bytes) || 0) > 0) {
                set_loader_status(
                  `Downloading file: ${get_preload_asset_counter(current_entry, asset_index + 1)} (${format_progress_percent(progress_state?.downloaded_bytes, progress_state?.total_bytes)})`,
                );
              }
            },
          });
        }
      }

      record_preload_timer_sample(asset_path, asset_result);
      update_preload_progress_bar();

      const loaded_assets = asset_index + 1;

      if (!current_entry?.is_cached && (current_entry?.preload_missing_index === current_entry?.preload_missing_total || current_entry?.preload_missing_index % 4 === 0 || asset_path === game_unx_asset_path)) {
        const visible_loaded_assets = Math.max(1, Number(current_entry?.preload_missing_index) || 1);
        const visible_total_assets = Math.max(1, Number(current_entry?.preload_missing_total) || missing_cached_assets || 1);
        const progress_label = asset_path === game_unx_asset_path && asset_result?.source === "network"
          ? `Downloaded game.unx (${visible_loaded_assets}/${visible_total_assets} assets ready)...`
          : `Prepared ${visible_loaded_assets}/${visible_total_assets} assets...`;

        set_loader_status(progress_label);
      } else if (missing_cached_assets <= 0 && loaded_assets === inspected_entries.length) {
        set_loader_status("Loaded cached assets...");
      }
    }

    finish_preload_timer();
  }

  function install_no_audio_mode(module_object) {
    if (!should_disable_game_audio()) {
      return module_object;
    }

    if (!window.__drNoAudioModeInstalled) {
      window.__drNoAudioModeInstalled = true;

      try {
        const original_audio_context = window.AudioContext || window.webkitAudioContext;
        if (typeof original_audio_context === "function") {
          const wrapped_audio_context = function (...args) {
            const context = Reflect.construct(original_audio_context, args, new.target || original_audio_context);
            try {
              context.suspend?.();
            } catch (_suspend_error) {
            }
            return context;
          };
          Object.setPrototypeOf(wrapped_audio_context, original_audio_context);
          wrapped_audio_context.prototype = original_audio_context.prototype;
          window.AudioContext = wrapped_audio_context;
          if (window.webkitAudioContext) {
            window.webkitAudioContext = wrapped_audio_context;
          }
        }
      } catch (_audio_context_error) {
      }

      try {
        const original_play = HTMLMediaElement?.prototype?.play;
        if (typeof original_play === "function") {
          HTMLMediaElement.prototype.play = function (...args) {
            this.muted = true;
            this.volume = 0;
            return original_play.apply(this, args);
          };
        }
      } catch (_media_error) {
      }
    }

    const normalized_module_object = module_object ?? {};
    normalized_module_object.preRun = Array.isArray(normalized_module_object.preRun)
      ? normalized_module_object.preRun
      : [];

    if (!normalized_module_object.preRun.some((entry) => entry?.__drDisableGameAudio === true)) {
      const disable_game_audio = function disable_game_audio() {
        try {
          if (typeof ENV === "object" && ENV) {
            ENV.SDL_AUDIODRIVER = "dummy";
            ENV.AUDIODEV = "null";
          }
        } catch (_env_error) {
        }
      };
      disable_game_audio.__drDisableGameAudio = true;
      normalized_module_object.preRun.push(disable_game_audio);
    }

    normalized_module_object.noInitialRun = normalized_module_object.noInitialRun || false;
    return normalized_module_object;
  }

  async function install_module_asset_overrides() {
    const module_object = install_no_audio_mode(install_shared_audio_fs_prerun(window.Module ?? {}));
    const current_runtime_scope = get_current_play_scope();
    const runner_data_asset_path = get_runtime_asset_path("runner.data", current_runtime_scope);
    const runner_wasm_asset_path = get_runtime_asset_path("runner.wasm", current_runtime_scope);
    const should_force_fresh_runtime_bundle = normalize_play_scope(current_runtime_scope) === "rush"
      || normalize_play_scope(current_runtime_scope).startsWith("rush/");
    const runner_data_result = should_force_fresh_runtime_bundle
      ? await fetch_protected_asset(runner_data_asset_path, current_runtime_scope, { cache_response: false, persist_object_url: true })
      : null;
    const runner_wasm_result = should_force_fresh_runtime_bundle
      ? await fetch_protected_asset(runner_wasm_asset_path, current_runtime_scope, { cache_response: false, persist_object_url: true })
      : null;
    const runner_data_url = runner_data_result?.url
      || await ensure_protected_asset_url(runner_data_asset_path, current_runtime_scope);
    const runner_wasm_url = runner_wasm_result?.url
      || await ensure_protected_asset_url(runner_wasm_asset_path, current_runtime_scope);
    const existing_locate_file = typeof module_object.locateFile === "function"
      ? module_object.locateFile.bind(module_object)
      : null;
    const protected_file_map = new Map([
      ["runner.data", runner_data_url],
      ["runner.wasm", runner_wasm_url],
    ]);

    module_object.locateFile = function locate_protected_file(path, prefix) {
      const normalized_path = normalize_asset_path(path);

      if (protected_file_map.has(normalized_path)) {
        return protected_file_map.get(normalized_path);
      }

      if (existing_locate_file) {
        return existing_locate_file(path, prefix);
      }

      return `${prefix ?? ""}${path ?? ""}`;
    };

    module_object.locateFilePackage = function locate_protected_package(path, prefix) {
      return module_object.locateFile(path, prefix);
    };

    // Console dedup for the engine's print output. The engine routes its logs
    // through Module.print / Module.printErr (NOT console.log), so the dedup has
    // to wrap those. Each distinct message prints once; every later occurrence
    // of that exact same message is suppressed. Different messages (e.g. a
    // different save filename) each get their own first print.
    (function install_engine_print_dedup() {
      const seen_print_messages = new Set();
      const make_dedup_handler = function (original_handler, console_fallback) {
        const resolved = typeof original_handler === "function"
          ? original_handler
          : console_fallback;
        return function dedup_print() {
          const message = Array.prototype.join.call(arguments, " ");
          if (typeof message === "string" && message.startsWith("webborder|")) {
            try {
              const details = parse_native_game_border_log_message(message);
              if (details) {
                window.__drWebBorder?.(details);
              }
            } catch (error) {
              console.error("[loader] runner webborder print bridge failed", error, message);
            }
          }
          if (seen_print_messages.has(message)) {
            return;
          }
          seen_print_messages.add(message);
          return resolved.apply(this, arguments);
        };
      };
      module_object.print = make_dedup_handler(
        module_object.print,
        console.log.bind(console)
      );
      module_object.printErr = make_dedup_handler(
        module_object.printErr,
        console.error.bind(console)
      );
    })();

    window.Module = module_object;
  }

  function normalize_runner_audio_function_argument(value) {
    if (typeof value !== "string") {
      return value;
    }

    const normalized_path = normalize_runner_audio_request_path(value);
    return normalized_path || value;
  }

  function wrap_runner_audio_function(function_name, original_function) {
    if (typeof original_function !== "function" || original_function.__drAudioPathWrapped) {
      return original_function;
    }

    const wrapped_function = function wrapped_runner_audio_function(...args) {
      const rewritten_args = args.map((arg) => normalize_runner_audio_function_argument(arg));
      return original_function.apply(this, rewritten_args);
    };

    try {
      Object.defineProperty(wrapped_function, "name", { value: function_name, configurable: true });
    } catch (_name_error) {
    }

    Object.defineProperty(wrapped_function, "__drAudioPathWrapped", {
      value: true,
      configurable: true,
    });
    return wrapped_function;
  }

  function install_runner_audio_path_global_wrappers() {
    if (window.__drRunnerAudioPathGlobalWrappersInstalled) {
      return;
    }

    window.__drRunnerAudioPathGlobalWrappersInstalled = true;
    const function_names = [
      "GML_async_wget2_data",
      "__gx_check_cache",
    ];

    for (const function_name of function_names) {
      let assigned_value = window[function_name];
      if (typeof assigned_value === "function") {
        assigned_value = wrap_runner_audio_function(function_name, assigned_value);
      }

      try {
        Object.defineProperty(window, function_name, {
          configurable: true,
          enumerable: true,
          get() {
            return assigned_value;
          },
          set(next_value) {
            assigned_value = typeof next_value === "function"
              ? wrap_runner_audio_function(function_name, next_value)
              : next_value;
          },
        });
      } catch (_define_error) {
        if (typeof window[function_name] === "function") {
          window[function_name] = wrap_runner_audio_function(function_name, window[function_name]);
        }
      }
    }
  }

  async function inject_runner_script() {
    install_runner_audio_path_global_wrappers();

    if (document.querySelector("script[data-dr-runner='1']")) {
      return;
    }

    await install_module_asset_overrides();
    const current_runtime_scope = get_current_play_scope();
    const runner_script_asset_path = get_runtime_asset_path("runner.js", current_runtime_scope);
    const should_force_fresh_runtime_bundle = normalize_play_scope(current_runtime_scope) === "rush"
      || normalize_play_scope(current_runtime_scope).startsWith("rush/");
    const runner_script_result = should_force_fresh_runtime_bundle
      ? await fetch_protected_asset(runner_script_asset_path, current_runtime_scope, { cache_response: false, persist_object_url: true })
      : null;
    const runner_script_url = runner_script_result?.url
      || await ensure_protected_asset_url(runner_script_asset_path, current_runtime_scope);
    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    script.dataset.drRunner = "1";
    script.src = runner_script_url;

    await new Promise((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load runner.js from the play API."));
      document.body.appendChild(script);
    });

    install_audio_file_lookup_remounts();
  }

  function install_audio_file_lookup_remounts() {
    const module_object = window.Module ?? null;
    if (!module_object || module_object.__drAudioLookupRemountsInstalled) {
      return;
    }

    module_object.__drAudioLookupRemountsInstalled = true;

    for (const method_name of ["FS_stat", "FS_open", "FS_readFile", "FS_createPreloadedFile"]) {
      const original_method = module_object[method_name];
      if (typeof original_method !== "function") {
        continue;
      }

      module_object[method_name] = function patched_audio_lookup(first_arg, ...rest) {
        if (typeof first_arg === "string") {
          remount_audio_cache_for_file_lookup(first_arg);
        }
        return original_method.call(this, first_arg, ...rest);
      };
    }
  }

  async function run_play_loader() {
    cache_loader_elements();
    attach_log_interceptor();
    // Start loading/decoding every border immediately, but do not block the game
    // loader on it. Borders finish warming in the background during verification
    // and manifest loading.
    preload_game_border_assets().catch(() => {});

    if (!loading_screen || !status_element || !progress_bar || !gif_element || !game_container) {
      throw new Error("The play loader could not find all required HTML elements.");
    }

    capture_base_runner_state();
    game_container.style.visibility = "hidden";
    await maybe_show_chapter_select_intro(get_current_play_scope());
    set_loader_status("Verifying ownership...");
    set_loader_progress(0);

    try {
      await unregister_service_workers();
      const gate_result = await ensure_verified_ownership();
      verified_gate_result = gate_result;

      if (!is_offline_mode_active()) {
        await ensure_play_session(get_current_play_scope());
      }

      set_loader_progress(base_progress_percent);
      set_loader_status("Loading chapter manifest...");

      const manifest_files = await load_preload_manifest_files();
      const preload_entries = await apply_preload_entry_sizes(manifest_files, get_current_play_scope());

      install_protected_asset_interceptors();
      if (is_offline_mode_active() && should_use_shared_audio_pack()) {
        await ensure_shared_audio_pack_memory_entries();
      }
      await preload_manifest_assets(preload_entries);
      if (read_runner_refresh_record(get_current_play_scope())) {
        clear_runner_refresh_record();
        await clear_refresh_asset_cache();
      }
      await hydrate_cached_protected_audio_entries(preload_entries);

      // Apply mod/default replacements after manifest preloading. Preloading can
      // register the normal chapter assets (including game.unx) in memory, so
      // applying overrides here makes the active mod win immediately before the
      // runner starts and requests game.unx.
      await register_mod_game_override(get_current_play_scope());
      await register_mod_file_overrides(get_current_play_scope());

      set_loader_progress(99);
      set_loader_status("Starting game...");
      await inject_runner_script();
    } catch (error) {
      const error_message = error?.message === "Verification required."
        ? "Verification required. Redirecting..."
        : (error?.message || "Failed to start the game.");

      console.error("Play loader failed:", error);
      set_loader_error(error_message);

      if (error?.message === "Verification required.") {
        window.setTimeout(redirect_to_verification, 900);
      }
    }
  }

  async function start_play_loader() {
    if (loader_started) {
      return loader_run_promise ?? Promise.resolve();
    }

    loader_started = true;
    return run_loader_operation(run_play_loader);
  }

  document.addEventListener("DOMContentLoaded", () => {
    cache_loader_elements();
    install_fullscreen_bridge();
    install_game_border_layout_bridge();
    refresh_debug_mode_button();

    if (game_container) {
      game_container.style.visibility = "hidden";
    }

    start_gamepad_shoulder_shortcuts();
  });

  window.addEventListener("blur", () => {
    last_shoulder_button_state.clear();
    release_gamepad_escape_shortcut();
  });

  window.addEventListener("pagehide", () => {
    last_shoulder_button_state.clear();
    release_gamepad_escape_shortcut();
  });

  window.addEventListener("resize", () => {
    if (!loader_hidden) {
      cache_loader_elements();
      set_loader_progress(current_loader_progress_percent);
    }

    refresh_selected_game_border_layout();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === game_border_storage_key) {
      refresh_game_border_menu_button();
      refresh_selected_game_border_layout();
    }
  });

  window.startPlayLoader = start_play_loader;
  window.ensureProtectedPlaySession = ensure_verified_play_session;
  window.ensure_protected_play_session = ensure_verified_play_session;
  window.closeProtectedPlaySession = close_play_session;
  window.close_protected_play_session = close_play_session;



  window.fetchProtectedPlayAssetResponse = fetch_protected_asset_response;
  window.fetch_protected_play_asset_response = fetch_protected_asset_response;
  window.primeProtectedPlayAssetCache = prime_protected_asset_cache;
  window.prime_protected_play_asset_cache = prime_protected_asset_cache;
  window.resolveProtectedPlayAssetUrl = ensure_protected_asset_url;
  window.resolve_protected_play_asset_url = ensure_protected_asset_url;
  window.refreshCurrentPlayRunner = refreshcurrentplayrunner;
  window.refresh_current_play_runner = refreshcurrentplayrunner;
  window.refreshCurrentPlayRunnerSafely = refreshcurrentplayrunnersafely;
  window.refresh_current_play_runner_safely = refreshcurrentplayrunnersafely;
  window.refreshGameBorderMenuButton = refresh_game_border_menu_button;
  window.refresh_game_border_menu_button = refresh_game_border_menu_button;
  window.togglePlayDebugMode = toggle_play_debug_mode;
  window.toggle_play_debug_mode = toggle_play_debug_mode;
  window.refreshPlayDebugModeButton = refresh_debug_mode_button;
  window.refresh_play_debug_mode_button = refresh_debug_mode_button;
  window.adjustGameBorderSelection = adjust_game_border_selection;
  window.adjust_game_border_selection = adjust_game_border_selection;
})();