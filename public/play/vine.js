(function init_vine_menu(global_scope) {
  const menu_container = document.getElementById("output-container");
  const menu_panel = menu_container?.querySelector(".vine-menu-panel") ?? null;
  const menu_list = document.getElementById("vine-menu-list");
  const menu_soul = document.getElementById("vine-menu-soul");
  const menu_title = document.getElementById("vine-menu-title");
  const close_button = document.getElementById("closeUIButton");
  const fullscreen_button = document.getElementById("fullscreen");
  const mobile_buttons_group = document.getElementById("mobile-buttons");
  const colorpicker_trigger = document.getElementById("colorpicker-trigger");
  let refresh_runner_button = document.getElementById("refreshRunnerButton");

  if (!menu_container || !menu_panel || !menu_list || !menu_soul || !close_button) {
    return;
  }

  if (!(refresh_runner_button instanceof HTMLButtonElement)) {
    refresh_runner_button = document.createElement("button");
    refresh_runner_button.type = "button";
    refresh_runner_button.id = "refreshRunnerButton";
    refresh_runner_button.className = "output-button vine-menu-option";
    refresh_runner_button.textContent = "Refresh Runner?";
    menu_list.appendChild(refresh_runner_button);
  }

  if (menu_soul.parentElement !== menu_panel) {
    menu_panel.appendChild(menu_soul);
  }

  menu_panel.tabIndex = -1;

  const soul_gap = 12;
  const soul_ease = 0.5;
  const open_sequence = ["v", "i", "n", "e"];
  const close_resume_delay_ms = 500;
  const gamepad_open_right_trigger_index = 7;
  const gamepad_open_required_press_count = 3;
  const gamepad_open_press_window_ms = 900;
  const last_gamepad_state = new Map();
  const state = {
    selected_index: 1,
    visible: false,
    soul_x: 0,
    soul_y: 0,
    animation_frame_id: 0,
    last_timestamp: 0,
    pause_token: null,
    open_sequence_index: 0,
    last_content_index: 1,
    input_mode: "keyboard",
    programmatic_activation_option_index: -1,
    touch_confirm_option_index: -1,
    gamepad_open_press_count: 0,
    last_gamepad_open_press_at: 0,
    resume_timeout_id: 0,
    input_suppressed_until: 0,
  };

  if (menu_title) {
    menu_title.textContent = "WebMenu!";
  }

  function set_input_mode(next_mode) {
    state.input_mode = next_mode;
    menu_panel.dataset.inputMode = next_mode;

    if (next_mode === "touch" && document.activeElement instanceof HTMLElement && menu_panel.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  function get_now_ms() {
    return typeof global_scope.performance?.now === "function"
      ? global_scope.performance.now()
      : Date.now();
  }

  function is_input_suppressed() {
    return state.input_suppressed_until > 0 && get_now_ms() < state.input_suppressed_until;
  }

  function clear_resume_timeout() {
    if (state.resume_timeout_id) {
      global_scope.clearTimeout(state.resume_timeout_id);
      state.resume_timeout_id = 0;
    }
  }

  function suppress_event(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function is_modal_target(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(target.closest(".save-manager-modal, .custom-message-box"));
  }

  function is_option_visible(option) {
    if (!(option instanceof HTMLElement) || option.hidden || option.disabled) {
      return false;
    }

    let current_node = option;

    while (current_node instanceof HTMLElement) {
      const computed_style = global_scope.getComputedStyle ? global_scope.getComputedStyle(current_node) : null;

      if (computed_style && (computed_style.display === "none" || computed_style.visibility === "hidden")) {
        return false;
      }

      if (current_node === menu_panel) {
        break;
      }

      current_node = current_node.parentElement;
    }

    return option.getClientRects().length > 0;
  }

  function get_options() {
    return [close_button, ...Array.from(menu_list.querySelectorAll(".vine-menu-option"))].filter(is_option_visible);
  }

  function get_mobile_default_option(options) {
    if (!(mobile_buttons_group instanceof HTMLElement)) {
      return null;
    }

    const mobile_options = Array.from(mobile_buttons_group.querySelectorAll(".vine-menu-option")).filter(is_option_visible);

    if (!mobile_options.length) {
      return null;
    }

    const mobile_default_option = mobile_options[0];
    return options.includes(mobile_default_option) ? mobile_default_option : null;
  }

  function get_preferred_content_index(options) {
    const mobile_default_option = get_mobile_default_option(options);

    if (mobile_default_option) {
      return options.indexOf(mobile_default_option);
    }

    const fullscreen_index = options.indexOf(fullscreen_button);

    if (fullscreen_index >= 0) {
      return fullscreen_index;
    }

    for (let option_index = 0; option_index < options.length; option_index += 1) {
      if (options[option_index] !== close_button) {
        return option_index;
      }
    }

    return 0;
  }

  function get_default_selected_index() {
    return get_preferred_content_index(get_options());
  }

  function get_selected_option() {
    const options = get_options();
    return options[state.selected_index] ?? null;
  }

  function get_soul_target(index) {
    const options = get_options();
    const selected_option = options[index];

    if (!selected_option) {
      return {
        x: state.soul_x,
        y: state.soul_y,
      };
    }

    const panel_rect = menu_panel.getBoundingClientRect();
    const option_rect = selected_option.getBoundingClientRect();
    const soul_width = menu_soul.offsetWidth || 18;
    const soul_height = menu_soul.offsetHeight || 20;
    return {
      x: Math.round(option_rect.left - panel_rect.left + menu_panel.scrollLeft - soul_width - soul_gap),
      y: Math.round(option_rect.top - panel_rect.top + menu_panel.scrollTop + ((option_rect.height - soul_height) / 2) - 2),
    };
  }

  function get_first_content_index(options) {
    return get_preferred_content_index(options);
  }

  function get_last_content_index(options) {
    for (let option_index = options.length - 1; option_index >= 0; option_index -= 1) {
      if (options[option_index] !== close_button) {
        return option_index;
      }
    }

    return 0;
  }

  function get_restored_content_index(options) {
    if (Number.isFinite(state.last_content_index) && state.last_content_index > 0 && options[state.last_content_index]) {
      return state.last_content_index;
    }

    return get_first_content_index(options);
  }

  function get_move_target(direction) {
    const options = get_options();

    if (!options.length) {
      return state.selected_index;
    }

    const current_option = options[state.selected_index] ?? null;
    const default_index = get_first_content_index(options);
    const last_content_index = get_last_content_index(options);
    const on_close = current_option === close_button;

    if (direction === "right") {
      return on_close ? state.selected_index : 0;
    }

    if (direction === "left") {
      return on_close ? get_restored_content_index(options) : state.selected_index;
    }

    if (direction === "up") {
      if (on_close) {
        return state.selected_index;
      }

      if (state.selected_index <= 1) {
        return 0;
      }

      return state.selected_index - 1;
    }

    if (direction === "down") {
      if (on_close) {
        return options.length > 1 ? 1 : 0;
      }

      if (state.selected_index >= last_content_index) {
        return state.selected_index;
      }

      return state.selected_index + 1;
    }

    return state.selected_index;
  }

  function apply_soul_position() {
    menu_soul.hidden = !state.visible;
    menu_soul.style.transform = `translate(${Math.round(state.soul_x)}px, ${Math.round(state.soul_y)}px)`;
  }

  function update_soul_position(delta_frames) {
    if (!state.visible) {
      menu_soul.hidden = true;
      return;
    }

    const target = get_soul_target(state.selected_index);

    if (Math.abs(target.x - state.soul_x) <= 1) {
      state.soul_x = target.x;
    } else {
      state.soul_x += (target.x - state.soul_x) * Math.min(1, soul_ease * delta_frames);
    }

    if (Math.abs(target.y - state.soul_y) <= 1) {
      state.soul_y = target.y;
    } else {
      state.soul_y += (target.y - state.soul_y) * Math.min(1, soul_ease * delta_frames);
    }

    apply_soul_position();
  }

  function snap_soul_to_selection() {
    const target = get_soul_target(state.selected_index);
    state.soul_x = target.x;
    state.soul_y = target.y;
    apply_soul_position();
  }

  function is_nintendo_gamepad(id) {
    return /nintendo|switch|joy-con|joycon|pro controller/i.test(id || "");
  }

  function read_gamepad_frame() {
    const frame = {
      left_pressed: false,
      right_pressed: false,
      up_pressed: false,
      down_pressed: false,
      confirm_pressed: false,
      cancel_pressed: false,
      open_trigger_pressed: false,
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
      const current = {
        left_held: Boolean(buttons[14] && buttons[14].pressed) || axes[0] < -0.5,
        right_held: Boolean(buttons[15] && buttons[15].pressed) || axes[0] > 0.5,
        up_held: Boolean(buttons[12] && buttons[12].pressed) || axes[1] < -0.5,
        down_held: Boolean(buttons[13] && buttons[13].pressed) || axes[1] > 0.5,
        confirm_held: Boolean(buttons[confirm_index] && buttons[confirm_index].pressed),
        cancel_held: Boolean(buttons[cancel_index] && buttons[cancel_index].pressed),
        open_held: Boolean(buttons[gamepad_open_right_trigger_index] && buttons[gamepad_open_right_trigger_index].pressed),
      };

      const previous = last_gamepad_state.get(gamepad.index) || {
        left_held: false,
        right_held: false,
        up_held: false,
        down_held: false,
        confirm_held: false,
        cancel_held: false,
        open_held: false,
      };

      frame.left_pressed ||= current.left_held && !previous.left_held;
      frame.right_pressed ||= current.right_held && !previous.right_held;
      frame.up_pressed ||= current.up_held && !previous.up_held;
      frame.down_pressed ||= current.down_held && !previous.down_held;
      frame.confirm_pressed ||= current.confirm_held && !previous.confirm_held;
      frame.cancel_pressed ||= current.cancel_held && !previous.cancel_held;
      frame.open_trigger_pressed ||= current.open_held && !previous.open_held;

      last_gamepad_state.set(gamepad.index, current);
    }

    return frame;
  }

  function animation_frame(timestamp) {
    if (!state.last_timestamp) {
      state.last_timestamp = timestamp;
    }

    const delta_frames = (timestamp - state.last_timestamp) / (1000 / 30);
    state.last_timestamp = timestamp;

    if (state.visible) {
      const frame = read_gamepad_frame();

      if (frame.up_pressed) {
        set_input_mode("gamepad");
        move_selection("up");
      }

      if (frame.down_pressed) {
        set_input_mode("gamepad");
        move_selection("down");
      }

      if (frame.left_pressed) {
        set_input_mode("gamepad");
        if (!try_adjust_selected_option(-1)) {
          move_selection("left");
        }
      }

      if (frame.right_pressed) {
        set_input_mode("gamepad");
        if (!try_adjust_selected_option(1)) {
          move_selection("right");
        }
      }

      if (frame.confirm_pressed) {
        set_input_mode("gamepad");
        trigger_selected_option();
      }

      if (frame.cancel_pressed && typeof global_scope.hideUI === "function") {
        set_input_mode("gamepad");
        global_scope.hideUI();
      }
    } else if (!is_input_suppressed()) {
      const frame = read_gamepad_frame();

      if (frame.open_trigger_pressed) {
        const elapsed_ms = state.last_gamepad_open_press_at > 0
          ? timestamp - state.last_gamepad_open_press_at
          : Number.POSITIVE_INFINITY;

        if (elapsed_ms <= gamepad_open_press_window_ms) {
          state.gamepad_open_press_count += 1;
        } else {
          state.gamepad_open_press_count = 1;
        }

        state.last_gamepad_open_press_at = timestamp;

        if (state.gamepad_open_press_count >= gamepad_open_required_press_count && typeof global_scope.showUI === "function") {
          state.gamepad_open_press_count = 0;
          state.last_gamepad_open_press_at = 0;
          set_input_mode("gamepad");
          global_scope.showUI();
        }
      } else if (state.last_gamepad_open_press_at > 0 && (timestamp - state.last_gamepad_open_press_at) > gamepad_open_press_window_ms) {
        state.gamepad_open_press_count = 0;
        state.last_gamepad_open_press_at = 0;
      }
    }

    update_soul_position(delta_frames);
    state.animation_frame_id = global_scope.requestAnimationFrame(animation_frame);
  }

  function sync_option_state(focus_selected) {
    const options = get_options();

    if (!options.length) {
      menu_soul.hidden = true;
      return;
    }

    if (state.selected_index >= options.length) {
      state.selected_index = options.length - 1;
    }

    if (state.selected_index < 0) {
      state.selected_index = 0;
    }

    options.forEach((option, option_index) => {
      const is_selected = option_index === state.selected_index;

      option.classList.toggle("is-selected", is_selected);
      option.setAttribute("aria-current", is_selected ? "true" : "false");
      option.tabIndex = is_selected ? 0 : -1;

      if (is_selected && focus_selected) {
        try {
          option.focus({ preventScroll: true });
        } catch (_focus_error) {
          option.focus();
        }
      }
    });
  }

  function refresh_menu(focus_selected) {
    sync_option_state(Boolean(focus_selected));
  }

  function set_selected_index(next_index, focus_selected) {
    state.selected_index = next_index;

    if (state.selected_index > 0) {
      state.last_content_index = state.selected_index;
    }

    sync_option_state(Boolean(focus_selected));
  }

  function move_selection(direction) {
    const options = get_options();

    if (!options.length) {
      return;
    }

    const next_index = get_move_target(direction);
    set_selected_index(next_index, true);
  }

  function try_adjust_selected_option(delta) {
    const selected_option = get_selected_option();

    if (!selected_option) {
      return false;
    }

    if (selected_option === colorpicker_trigger && typeof global_scope.adjustGameBorderSelection === "function") {
      try {
        return Boolean(global_scope.adjustGameBorderSelection(delta));
      } catch (_adjust_error) {
        return false;
      }
    }

    return false;
  }

  function trigger_selected_option() {
    const selected_option = get_selected_option();

    if (selected_option) {
      activate_option(selected_option);
    }
  }

  function activate_option(option) {
    const option_index = get_options().indexOf(option);

    if (option_index < 0) {
      return;
    }

    if (option === close_button) {
      if (typeof global_scope.hideUI === "function") {
        global_scope.hideUI();
      }
      return;
    }

    try {
      if (typeof option.onclick === "function") {
        option.onclick.call(option, new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: global_scope,
        }));
        return;
      }

      state.programmatic_activation_option_index = option_index;
      option.click();
    } finally {
      state.programmatic_activation_option_index = -1;
    }
  }

  function refresh_runner() {
    if (typeof global_scope.hideUI === "function") {
      global_scope.hideUI();
    }

    if (typeof global_scope.refreshCurrentPlayRunnerSafely === "function") {
      global_scope.refreshCurrentPlayRunnerSafely({
        status_message: "Refreshing runner...",
      });
      return;
    }

    global_scope.location.reload();
  }

  function should_ignore_key_event(event) {
    if (!state.visible || is_modal_target(event.target)) {
      return true;
    }

    if (!(event.target instanceof HTMLElement)) {
      return false;
    }

    if ((event.target.matches("input, textarea") || event.target.isContentEditable) && event.target.id !== "output") {
      return true;
    }

    return false;
  }

  function handle_open_sequence_key(key) {
    const normalized_key = String(key || "").toLowerCase();

    if (normalized_key === open_sequence[state.open_sequence_index]) {
      state.open_sequence_index += 1;

      if (state.open_sequence_index >= open_sequence.length) {
        state.open_sequence_index = 0;

        if (typeof global_scope.showUI === "function") {
          global_scope.showUI();
          return true;
        }
      }

      return false;
    }

    state.open_sequence_index = normalized_key === open_sequence[0] ? 1 : 0;
    return false;
  }

  function handle_keydown(event) {
    if (is_input_suppressed()) {
      suppress_event(event);
      return;
    }

    if (!state.visible) {
      handle_open_sequence_key(event.key);
    }

    if (should_ignore_key_event(event)) {
      return;
    }

    const key = String(event.key || "");

    suppress_event(event);

    set_input_mode("keyboard");

    if (key === "ArrowUp" || key === "w" || key === "W") {
      move_selection("up");
      return;
    }

    if (key === "ArrowDown" || key === "s" || key === "S") {
      move_selection("down");
      return;
    }

    if (key === "ArrowLeft" || key === "a" || key === "A") {
      if (!try_adjust_selected_option(-1)) {
        move_selection("left");
      }
      return;
    }

    if (key === "ArrowRight" || key === "d" || key === "D") {
      if (!try_adjust_selected_option(1)) {
        move_selection("right");
      }
      return;
    }

    if (key === "Enter" || key === " " || key === "Spacebar" || key === "z" || key === "Z") {
      trigger_selected_option();
      return;
    }

    if (key === "Escape" || key === "Backspace" || key === "x" || key === "X" || key === "Shift") {
      if (typeof global_scope.hideUI === "function") {
        global_scope.hideUI();
      }
    }
  }

  function swallow_keyup(event) {
    if (is_input_suppressed()) {
      suppress_event(event);
      return;
    }

    if (!state.visible || should_ignore_key_event(event)) {
      return;
    }

    suppress_event(event);
  }

  function bind_option(option) {
    if (!(option instanceof HTMLElement) || option.dataset.vineMenuBound === "1") {
      return;
    }

    option.dataset.vineMenuBound = "1";

    option.addEventListener("pointerenter", (event) => {
      if (!state.visible) {
        return;
      }

      if (event.pointerType === "touch") {
        return;
      }

      set_input_mode("mouse");

      const options = get_options();
      const option_index = options.indexOf(option);

      if (option_index >= 0) {
        set_selected_index(option_index, true);
      }
    });

    option.addEventListener("pointerdown", (event) => {
      if (!state.visible) {
        return;
      }

      if (event.pointerType === "touch") {
        return;
      }

      const option_index = get_options().indexOf(option);

      if (option_index < 0) {
        return;
      }
    });

    option.addEventListener("touchstart", (event) => {
      if (!state.visible) {
        return;
      }

      const option_index = get_options().indexOf(option);

      if (option_index < 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      set_input_mode("touch");

      if (state.selected_index === option_index) {
        state.touch_confirm_option_index = option_index;
        return;
      }

      state.touch_confirm_option_index = -1;
      set_selected_index(option_index, false);
    }, { passive: false });

    option.addEventListener("touchend", (event) => {
      if (!state.visible) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      const option_index = get_options().indexOf(option);

      if (option_index >= 0 && state.touch_confirm_option_index === option_index) {
        activate_option(option);
      }

      state.touch_confirm_option_index = -1;
    }, { passive: false });

    option.addEventListener("touchcancel", () => {
      state.touch_confirm_option_index = -1;
    }, { passive: true });

    option.addEventListener("click", (event) => {
      if (!state.visible) {
        return;
      }

      const option_index = get_options().indexOf(option);

      if (option_index < 0) {
        return;
      }

      if (state.programmatic_activation_option_index === option_index && !event.isTrusted) {
        return;
      }

      if (state.input_mode === "touch" && event.isTrusted) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      }
    }, true);
  }

  function bind_options() {
    if (refresh_runner_button && typeof refresh_runner_button.onclick !== "function") {
      refresh_runner_button.onclick = refresh_runner;
    }

    bind_option(close_button);
    Array.from(menu_list.querySelectorAll(".vine-menu-option")).forEach(bind_option);
    global_scope.refreshGameBorderMenuButton?.();
  }

  function show() {
    state.visible = true;
    state.programmatic_activation_option_index = -1;
    state.touch_confirm_option_index = -1;
    state.input_suppressed_until = 0;
    clear_resume_timeout();
    menu_container.setAttribute("aria-hidden", "false");
    set_input_mode(state.input_mode === "mouse" ? "mouse" : "keyboard");
    state.selected_index = Math.min(get_default_selected_index(), Math.max(0, get_options().length - 1));

    if (!Number.isFinite(state.selected_index) || state.selected_index < 0) {
      state.selected_index = get_default_selected_index();
    }

    if (typeof global_scope.pause === "function" && typeof global_scope.resume === "function" && !state.pause_token) {
      try {
        state.pause_token = global_scope.pause("vine-menu") ?? null;
      } catch (_pause_error) {
        state.pause_token = null;
      }
    }

    bind_options();
    refresh_menu(true);
    snap_soul_to_selection();

    try {
      const selected_option = get_selected_option();

      if (selected_option instanceof HTMLElement) {
        selected_option.focus({ preventScroll: true });
      } else {
        menu_panel.focus({ preventScroll: true });
      }
    } catch (_focus_error) {
      const selected_option = get_selected_option();

      if (selected_option instanceof HTMLElement) {
        selected_option.focus();
      } else {
        menu_panel.focus();
      }
    }
  }

  function hide() {
    state.visible = false;
    state.programmatic_activation_option_index = -1;
    state.touch_confirm_option_index = -1;
    state.input_suppressed_until = get_now_ms() + close_resume_delay_ms;
    menu_container.setAttribute("aria-hidden", "true");
    menu_soul.hidden = true;

    if (typeof global_scope.resume === "function") {
      clear_resume_timeout();
      state.resume_timeout_id = global_scope.setTimeout(() => {
        state.resume_timeout_id = 0;

        try {
          const resumed = state.pause_token ? global_scope.resume(state.pause_token) : false;

          if (!resumed) {
            global_scope.resume("vine-menu");
          }
        } catch (_resume_error) {
          // ignore resume failures
        } finally {
          state.pause_token = null;
        }
      }, close_resume_delay_ms);
    }
  }

  menu_container.addEventListener("click", (event) => {
    if (event.target === menu_container && typeof global_scope.hideUI === "function") {
      global_scope.hideUI();
    }
  });

  global_scope.addEventListener("resize", () => {
    if (state.visible) {
      snap_soul_to_selection();
    }
  });

  global_scope.addEventListener("keydown", handle_keydown, true);
  global_scope.addEventListener("keyup", swallow_keyup, true);
  document.addEventListener("keydown", handle_keydown, true);
  document.addEventListener("keyup", swallow_keyup, true);

  bind_options();
  set_input_mode("keyboard");
  refresh_menu(false);
  snap_soul_to_selection();
  state.animation_frame_id = global_scope.requestAnimationFrame(animation_frame);

  global_scope.vine_menu = {
    show,
    hide,
    refresh() {
      bind_options();
      refresh_menu(false);
    },
  };
})(window);
