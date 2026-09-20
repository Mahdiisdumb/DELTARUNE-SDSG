(function initAppMenu() {
  const stageWidth = 640;
  const stageHeight = 480;
  const controlsStorageKey = "controls";
  const optionFontSize = 22;
  const optionLineHeight = 34;
  const logoWidth = 392;
  const logoX = 320;
  const logoY = 100;
  const marqueeWidth = 308;
  const logoAspectRatio = 400 / 2000;
  const marqueeY = 178;
  const marqueeHeight = 18;
  const marqueeFontSize = 11;
  const marqueeMessagesPath = "./marquee.txt";
  const marqueeSpacerText = "⋆⭒｡˖⁺‧₊⭒⋆  ";
  const mainMenuOptionTopY = 215;
  const soulWidth = 16;
  const soulHeight = 16;
  const soulGap = 12;
  const soulEase = 0.5;
  const fadeInFrames = 26;
  const menuMoveVolume = 0.35;
  const menuAcceptVolume = 0.42;
  const menuBackVolume = 0.4;
  const modLoaderWarningFlashDurationMs = 1000;
  const modLoaderLoadingStepDurationMs = 280;
  const drLogoRatio = 400 / 2000;
  const deviceProfileStorageKey = "device_profile";
  const modLoaderVersions = ["1.00", "1.01A", "1.01B", "1.01C", "1.02", "1.03", "1.04", "1.05", "1.06", "1.07A", "1.07B", "1.07C", "1.07D", "1.07E"];
  const fallbackMarqueeMessages = [
    "Welcome to Project Vinetrap!",
    "Freshly loaded straight into your browser.",
    "Determination goes great with a web build.",
    "The WebMenu still opens if you know the trick.",
    "Boss Rush is waitin' in the Start menu.",
    "Try not to stare directly into the SAVE data.",
    "No install required. Just a little patience.",
    "Another run, another bad idea.",
  ];
  const modLoaderChapters = [
    { value: "s", label: "Select" },
    { value: "1", label: "Chapter 1" },
    { value: "2", label: "Chapter 2" },
    { value: "3", label: "Chapter 3" },
    { value: "4", label: "Chapter 4" },
    { value: "5", label: "Chapter 5" },
  ];
  const modPlayScope = "mods";
  const modOverrideCacheName = "dr-play-mod-overrides-v1";
  const modOverrideStorageKey = "dr-play-mod-override-v1";
  const modDefaultOverrideStorageKey = "modOverride";
  const modLoaderHelperPath = "../play/play/loader.js";
  const modPatcherWorkerPath = "../play/mods/patcher/xdelta3.worker.js";
  const offlineModeStorageKey = "offlineModeEnabled";
  const consoleFamilyStorageKey = "console_family";
  const offlineModePagePath = "app/offline/index.html";
  const offlineShellCacheName = "offline";
  const offlineAssetCacheName = "base";
  const offlineModeVisualOverrideStorageKey = "dr-offline-mode-visual-override-v1";
  const gameBorderStorageKey = "dr-play-border-v1";
  const audioCachingModeStorageKey = "cachingmode";
  const offlineModeEnabledIconPath = "./assets/mark.png";
  const offlineModeDisabledIconPath = "./assets/cross.png";
  const optionHelpIconPath = "./assets/help.png";
  const optionHelpIconSize = 16;
  const optionHelpIconGap = 6;
  const runtimeStatusRefreshIntervalMs = 15000;
  const optionHelpText = {
    offline_mode: {
      copy: "Offline Mode lets you access Vinetrap when you're offline! It downloads the whole site & game to your device for offline use.",
      className: "is-offline-mode-help",
    },
    audio_caching: {
      copy: "Caching stores audio and commonly used game files on your device to immensely speed up loading times!\n\nOn (recommended): Stores ~344MB of common assets in your cache\n\nOff: Downloads & preloads specific assets used by the game every time you start a mode\n\nSkip (not recommended): Skips preloading audio and downloads audio as you play the game\n\nNo Audio: Disables audio entirely; will still preload common assets",
      className: "is-audio-caching-help",
    },
    auto_boot: {
      copy: "Auto-Boot allows you to boot into a specific mode automatically when visiting the site, skipping entire sections! Useful for jumping right into the game; you can always exit back to the Main Menu by going to Chapter Select and pressing Quit",
      className: "is-auto-boot-help",
    },
    game_border: {
      copy: "You can select a specific border to use in-game; or use Dynamic if you'd like it to change depending on the current in-game state! (Mods don't support borders... unless you find one that has them.)",
      className: "is-game-border-help",
    },
  };
  const audioCachingModeOptions = [
    { id: "on", label: "On" },
    { id: "off", label: "Off" },
    { id: "skip", label: "Skip" },
    { id: "noaudio", label: "No Audio" },
  ];

  const autoBootStorageKey = "startpage";
  const autoBootOptions = [
    { id: "off", label: "Off", page: "app/index.html" },
    { id: "chapter_select", label: "Chapter Select", page: "play/play/index.html" },
    { id: "chapter1", label: "Chapter 1", page: "play/chapter1/" },
    { id: "chapter2", label: "Chapter 2", page: "play/chapter2/" },
    { id: "chapter3", label: "Chapter 3", page: "play/chapter3/" },
    { id: "chapter4", label: "Chapter 4", page: "play/chapter4/" },
    { id: "chapter5", label: "Chapter 5", page: "play/chapter5/" },
    { id: "boss_rush", label: "Boss Rush", page: "play/rush/" },
  ];

  const gameBorderOptions = [
    { id: "dynamic", label: "Dynamic" },
    { id: "line_1080", label: "Simple" },
    { id: "off", label: "None" },
    { id: "dw_blue", label: "Stars (Blue)" },
    { id: "dw_blue_light", label: "Stars (Light Blue)" },
    { id: "dw_blue_stars", label: "TV Stars" },
    { id: "dw_castle_cafe", label: "Castle (Cafe)" },
    { id: "dw_castle_left", label: "Castle (Left)" },
    { id: "dw_castle_right", label: "Castle (Right)" },
    { id: "dw_castle_right_gold", label: "Castle (Right) [Gold]" },
    { id: "dw_castle_top", label: "Castle (Top)" },
    { id: "dw_castletown", label: "Castle Town" },
    { id: "dw_church_a", label: "Church A" },
    { id: "dw_church_b", label: "Church B" },
    { id: "dw_church_c", label: "Church C" },
    { id: "dw_city", label: "Cyber City" },
    { id: "dw_cyber", label: "A Cyber's World" },
    { id: "dw_garden", label: "Garden of Hopes & Dreams" },
    { id: "dw_garden_cliff", label: "Garden Cliff" },
    { id: "dw_garden_cliff_bottom", label: "Garden Cliff (Bottom)" },
    { id: "dw_garden_cliff_bottom_frame", label: "Garden Cliff (Bottom) [Frame]" },
    { id: "dw_garden_cliff_frame", label: "Garden Cliff [Frame]" },
    { id: "dw_garden_cliff_lattice", label: "Garden Cliff (Lattice)" },
    { id: "dw_garden_cliff_lattice_bottom", label: "Garden Cliff (Bottom Lattice)" },
    { id: "dw_green_room", label: "Green Room" },
    { id: "dw_green_sloppy", label: "Sloppy Room" },
    { id: "dw_green_sloppy_z", label: "Sloppy Room [Alt]" },
    { id: "dw_mansion", label: "Pandora Palace" },
    { id: "dw_pink", label: "Pink" },
    { id: "dw_pink_alt", label: "Pink [Alt]" },
    { id: "dw_red_smiles", label: "Smiling Stars" },
    { id: "dw_teevie", label: "TV World" },
    { id: "dw_titan_base", label: "Titan" },
    { id: "dw_titan_eyes", label: "Titan Eyes" },
    { id: "dw_titan_eyes_red", label: "Titan Eyes (Red)" },
    { id: "dw_tv_black", label: "TV" },
    { id: "dw_tv_blue", label: "TV (Blue)" },
    { id: "dw_tv_meta", label: "TV Room" },
    { id: "dw_word", label: "Word" },
    { id: "lw_town", label: "Hometown" },
    { id: "lw_town_morning", label: "Hometown (Sunrise)" },
    { id: "lw_town_sunset", label: "Hometown (Sunset)" },
    { id: "lw_town_night", label: "Hometown (Night)" },
  ];
  let offlinemodecachepresent = null;
  const preloadedMenuImages = [];

  function getControlsPreference() {
    try {
      return localStorage.getItem(controlsStorageKey) === "wasd" ? "wasd" : "arrows";
    } catch (error) {
      console.warn("Unable to read the preferred controls:", error);
      return "arrows";
    }
  }

  function matchesDirectionalKey(eventKey, direction) {
    const key = String(eventKey || "").toLowerCase();

    if (direction === "left") {
      return eventKey === "ArrowLeft" || key === "a";
    }

    if (direction === "right") {
      return eventKey === "ArrowRight" || key === "d";
    }

    if (direction === "up") {
      return eventKey === "ArrowUp" || key === "w";
    }

    if (direction === "down") {
      return eventKey === "ArrowDown" || key === "s";
    }

    return false;
  }

  function getDeviceProfile() {
    try {
      const savedValue = localStorage.getItem(deviceProfileStorageKey);
      return savedValue === "console" || savedValue === "mobile" ? savedValue : "desktop";
    } catch (error) {
      console.warn("Unable to read the selected device profile:", error);
      return "desktop";
    }
  }

  function isofflinemodeenabled() {
    try {
      return localStorage.getItem(offlineModeStorageKey) === "true";
    } catch (error) {
      console.warn("Unable to read the Offline Mode state:", error);
      return false;
    }
  }

  function getconsolefamilypreference() {
    try {
      const savedValue = localStorage.getItem(consoleFamilyStorageKey);
      return savedValue === "xbox" || savedValue === "playstation" ? savedValue : "";
    } catch (error) {
      console.warn("Unable to read the selected console family:", error);
      return "";
    }
  }

  function normalizegameborderid(borderId) {
    const rawBorderId = String(borderId || "").trim();

    if (rawBorderId === "default") {
      return "dynamic";
    }

    if (rawBorderId === "line") {
      return "line_1080";
    }

    return rawBorderId;
  }

  function getgameborderindexbyid(borderId) {
    const normalizedBorderId = normalizegameborderid(borderId);
    return gameBorderOptions.findIndex((option) => option.id === normalizedBorderId);
  }

  function getselectedgameborderid() {
    try {
      const savedValue = String(localStorage.getItem(gameBorderStorageKey) || "").trim();
      return getgameborderindexbyid(savedValue) >= 0
        ? normalizegameborderid(savedValue)
        : gameBorderOptions[0].id;
    } catch (error) {
      console.warn("Unable to read the selected game border:", error);
      return gameBorderOptions[0].id;
    }
  }

  function getselectedgameborderoption() {
    return gameBorderOptions[getgameborderindexbyid(getselectedgameborderid())] ?? gameBorderOptions[0];
  }

  function setselectedgameborderid(borderId) {
    const normalizedBorderId = normalizegameborderid(borderId);
    const nextBorderId = getgameborderindexbyid(normalizedBorderId) >= 0 ? normalizedBorderId : gameBorderOptions[0].id;

    try {
      localStorage.setItem(gameBorderStorageKey, nextBorderId);
    } catch (error) {
      console.warn("Unable to update the selected game border:", error);
    }

    refreshCurrentMenuLayout();
    return nextBorderId;
  }

  function adjustselectedgameborder(delta) {
    const optionCount = gameBorderOptions.length;

    if (optionCount <= 0) {
      return false;
    }

    const currentIndex = Math.max(0, getgameborderindexbyid(getselectedgameborderid()));
    const normalizedDelta = delta < 0 ? -1 : 1;
    const nextIndex = (currentIndex + normalizedDelta + optionCount) % optionCount;
    return setselectedgameborderid(gameBorderOptions[nextIndex]?.id) !== gameBorderOptions[currentIndex]?.id;
  }

  function getAudioCachingModeIndexById(modeId) {
    const normalizedModeId = String(modeId || "").trim().toLowerCase();
    return audioCachingModeOptions.findIndex((option) => option.id === normalizedModeId);
  }

  function getSelectedAudioCachingModeId() {
    try {
      const savedValue = String(localStorage.getItem(audioCachingModeStorageKey) || "").trim().toLowerCase();
      return getAudioCachingModeIndexById(savedValue) >= 0 ? savedValue : audioCachingModeOptions[0].id;
    } catch (error) {
      console.warn("Unable to read the selected audio caching mode:", error);
      return audioCachingModeOptions[0].id;
    }
  }

  function getSelectedAudioCachingModeOption() {
    return audioCachingModeOptions[getAudioCachingModeIndexById(getSelectedAudioCachingModeId())] ?? audioCachingModeOptions[0];
  }

  function setSelectedAudioCachingModeId(modeId) {
    const nextModeId = getAudioCachingModeIndexById(modeId) >= 0 ? modeId : audioCachingModeOptions[0].id;

    try {
      localStorage.setItem(audioCachingModeStorageKey, nextModeId);
    } catch (error) {
      console.warn("Unable to update the selected audio caching mode:", error);
    }

    refreshCurrentMenuLayout();
    return nextModeId;
  }

  function adjustSelectedAudioCachingMode(delta) {
    const optionCount = audioCachingModeOptions.length;

    if (optionCount <= 0) {
      return false;
    }

    const currentIndex = Math.max(0, getAudioCachingModeIndexById(getSelectedAudioCachingModeId()));
    const normalizedDelta = delta < 0 ? -1 : 1;
    const nextIndex = (currentIndex + normalizedDelta + optionCount) % optionCount;
    return setSelectedAudioCachingModeId(audioCachingModeOptions[nextIndex]?.id) !== audioCachingModeOptions[currentIndex]?.id;
  }


  function normalizeAutoBootPage(pagePath) {
    const rawPagePath = String(pagePath || "").trim();
    return rawPagePath || autoBootOptions[0].page;
  }

  function getAutoBootOptionIndexByPage(pagePath) {
    const normalizedPagePath = normalizeAutoBootPage(pagePath);
    return autoBootOptions.findIndex((option) => option.page === normalizedPagePath);
  }

  function getSelectedAutoBootPagePath() {
    try {
      const savedValue = normalizeAutoBootPage(localStorage.getItem(autoBootStorageKey));
      return getAutoBootOptionIndexByPage(savedValue) >= 0 ? savedValue : autoBootOptions[0].page;
    } catch (error) {
      console.warn("Unable to read the Auto-Boot page:", error);
      return autoBootOptions[0].page;
    }
  }

  function getSelectedAutoBootOption() {
    return autoBootOptions[getAutoBootOptionIndexByPage(getSelectedAutoBootPagePath())] ?? autoBootOptions[0];
  }

  function setSelectedAutoBootPagePath(pagePath) {
    const normalizedPagePath = normalizeAutoBootPage(pagePath);
    const nextPagePath = getAutoBootOptionIndexByPage(normalizedPagePath) >= 0
      ? normalizedPagePath
      : autoBootOptions[0].page;

    try {
      localStorage.setItem(autoBootStorageKey, nextPagePath);
    } catch (error) {
      console.warn("Unable to update the Auto-Boot page:", error);
    }

    try {
      if (window.parent && window.parent !== window && typeof window.parent.setContainerStartPage === "function") {
        window.parent.setContainerStartPage(nextPagePath);
      }
    } catch (error) {
      console.warn("Unable to sync the Auto-Boot page with the container:", error);
    }

    refreshCurrentMenuLayout();
    return nextPagePath;
  }

  function adjustSelectedAutoBootPage(delta) {
    const optionCount = autoBootOptions.length;

    if (optionCount <= 0) {
      return false;
    }

    const currentIndex = Math.max(0, getAutoBootOptionIndexByPage(getSelectedAutoBootPagePath()));
    const normalizedDelta = delta < 0 ? -1 : 1;
    const nextIndex = (currentIndex + normalizedDelta + optionCount) % optionCount;
    return setSelectedAutoBootPagePath(autoBootOptions[nextIndex]?.page) !== autoBootOptions[currentIndex]?.page;
  }

  function setofflinemodeenabled(enabled) {
    try {
      localStorage.setItem(offlineModeStorageKey, enabled ? "true" : "false");
    } catch (error) {
      console.warn("Unable to update the Offline Mode state:", error);
    }

    refreshCurrentMenuLayout();
    updateRuntimeFooter().catch(() => {});
  }

  function readofflinemodevisualoverride() {
    try {
      const savedValue = sessionStorage.getItem(offlineModeVisualOverrideStorageKey);
      return savedValue === "mark" || savedValue === "cross" ? savedValue : "";
    } catch (error) {
      console.warn("Unable to read the Offline Mode visual override:", error);
      return "";
    }
  }

  function setofflinemodevisualoverride(nextValue) {
    try {
      if (nextValue === "mark" || nextValue === "cross") {
        sessionStorage.setItem(offlineModeVisualOverrideStorageKey, nextValue);
      } else {
        sessionStorage.removeItem(offlineModeVisualOverrideStorageKey);
      }
    } catch (error) {
      console.warn("Unable to update the Offline Mode visual override:", error);
    }

    refreshCurrentMenuLayout();
    updateRuntimeFooter().catch(() => {});
    return readofflinemodevisualoverride();
  }

  function isofflinemodeactivevisual() {
    const visualOverride = readofflinemodevisualoverride();

    if (visualOverride === "mark") {
      return true;
    }

    if (visualOverride === "cross") {
      return false;
    }

    if (offlinemodecachepresent === false) {
      return false;
    }

    return isofflinemodeenabled();
  }

  async function cachehasentries(cachename, knowncachenames = null) {
    if (!window.caches?.open) {
      return false;
    }

    const cacheNames = Array.isArray(knowncachenames)
      ? knowncachenames
      : (window.caches?.keys ? await window.caches.keys() : []);

    if (!cacheNames.includes(cachename)) {
      return false;
    }

    try {
      const cache = await window.caches.open(cachename);
      const cacheKeys = await cache.keys();
      return cacheKeys.length > 0;
    } catch (error) {
      console.warn(`Unable to inspect the ${cachename} cache:`, error);
      return false;
    }
  }

  async function syncofflinemodecacheavailability() {
    if (!window.caches?.keys || !window.caches?.open) {
      offlinemodecachepresent = false;

      if (isofflinemodeenabled()) {
        setofflinemodeenabled(false);
      }

      refreshCurrentMenuLayout();
      return false;
    }

    try {
      const cacheNames = await window.caches.keys();
      const hasOfflineShellCache = await cachehasentries(offlineShellCacheName, cacheNames);
      const hasOfflineAssetCache = await cachehasentries(offlineAssetCacheName, cacheNames);
      offlinemodecachepresent = hasOfflineShellCache && hasOfflineAssetCache;

      if (!offlinemodecachepresent && isofflinemodeenabled()) {
        setofflinemodeenabled(false);
      }
    } catch (error) {
      console.warn("Unable to sync the Offline Mode cache state:", error);
      offlinemodecachepresent = false;

      if (isofflinemodeenabled()) {
        setofflinemodeenabled(false);
      }
    }

    refreshCurrentMenuLayout();
    updateRuntimeFooter().catch(() => {});
    return offlinemodecachepresent;
  }

  function parseWindowsVersionFromUserAgent(userAgent) {
    const normalizedUserAgent = String(userAgent || "");

    if (/Windows 11/i.test(normalizedUserAgent)) {
      return "11";
    }

    if (/Windows 10/i.test(normalizedUserAgent)) {
      return "10";
    }

    const match = normalizedUserAgent.match(/Windows NT ([0-9.]+)/i);

    if (!match) {
      return "";
    }

    switch (match[1]) {
      case "10.0":
        return "10";
      case "6.3":
        return "8.1";
      case "6.2":
        return "8";
      case "6.1":
        return "7";
      case "6.0":
        return "Vista";
      default:
        return match[1];
    }
  }

  function detectPreferredPlayStationLabel(userAgent, platform, uaDataPlatform, consoleFamilyPreference) {
    if (/PlayStation 5|PS5/i.test(userAgent)) {
      return "PS5";
    }

    if (/PlayStation 4|PS4/i.test(userAgent)) {
      return "PS4";
    }

    if (consoleFamilyPreference !== "playstation") {
      return "";
    }

    if (/PlayStation/i.test(userAgent) || /PlayStation/i.test(platform) || /PlayStation/i.test(uaDataPlatform)) {
      return /5/i.test(`${userAgent} ${platform} ${uaDataPlatform}`) ? "PS5" : "PS4";
    }

    return "PS4";
  }

  async function detectRuntimeDeviceLabel() {
    const userAgent = String(navigator.userAgent || "");
    const platform = String(navigator.platform || "");
    const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
    const userAgentData = navigator.userAgentData || null;
    const uaDataPlatform = String(userAgentData?.platform || "");
    const deviceProfile = getDeviceProfile();
    const consoleFamilyPreference = getconsolefamilypreference();
    const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent)
      || (/Mac/i.test(platform) && maxTouchPoints > 1);

    const playStationLabel = detectPreferredPlayStationLabel(
      userAgent,
      platform,
      uaDataPlatform,
      consoleFamilyPreference,
    );

    if (playStationLabel) {
      return playStationLabel;
    }

    if (/Xbox/i.test(userAgent) || consoleFamilyPreference === "xbox") {
      return "Xbox One/Series";
    }

    if (
      deviceProfile === "console"
      && !consoleFamilyPreference
      && (/Windows/i.test(userAgent) || /Win/i.test(platform) || /Windows/i.test(uaDataPlatform))
    ) {
      return "Xbox One/Series";
    }

    if (/CrOS/i.test(userAgent) || /Chrome ?OS/i.test(platform) || /Chrome ?OS/i.test(uaDataPlatform)) {
      return "ChromeOS";
    }

    if (isIOSDevice) {
      return "Mobile (iOS)";
    }

    if (/Android/i.test(userAgent)) {
      return "Mobile (Android)";
    }

    if (/Windows/i.test(userAgent) || /Win/i.test(platform) || /Windows/i.test(uaDataPlatform)) {
      let windowsVersion = "";

      if (userAgentData?.getHighEntropyValues) {
        try {
          const highEntropyValues = await userAgentData.getHighEntropyValues(["platformVersion"]);
          const majorVersion = Number.parseInt(String(highEntropyValues?.platformVersion || "").split(".")[0], 10);

          if (Number.isFinite(majorVersion) && majorVersion > 0) {
            windowsVersion = majorVersion >= 13 ? "11" : "10";
          }
        } catch (_error) {
        }
      }

      if (!windowsVersion) {
        windowsVersion = parseWindowsVersionFromUserAgent(userAgent) || "10";
      }

      return `Windows ${windowsVersion}`;
    }

    if (/Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform) || /macOS/i.test(uaDataPlatform)) {
      return "macOS";
    }

    return "Other";
  }

  const menuMap = {
    main: {
      optionX: 286,
      optionTopY: mainMenuOptionTopY,
      optionGap: 5,
      items: [
        {
          type: "text",
          label: "Start",
          nextMenu: "start",
        },
        {
          type: "text",
          label: "OST Player",
          disabled: true,
          onConfirm: () => {},
        },
        {
          type: "text",
          label: "Options",
          nextMenu: "options",
        },
        {
          type: "text",
          label: "Feedback?",
          onConfirm: () => {
            window.open("https://forms.gle/grUjQxbN4VXiFqUu8", "_blank", "noopener,noreferrer");
          },
        },
      ],
    },
    start: {
      optionX: 286,
      optionTopY: mainMenuOptionTopY,
      optionGap: 5,
      items: [
        {
            type: "text",
            label: "Play",
            onConfirm: () => {
              goToPage("play/play/index.html");
            },
          },
        {
          type: "text",
          label: "Mod Loader",
          nextMenu: "mod_loader",
          disabled: () => getDeviceProfile() === "console",
        },
        {
          type: "text",
          label: "Boss Rush",
          onConfirm: () => {
            goToPage("play/rush/index.html");
          },
        },
      ],
    },
    options: {
      optionX: 286,
      optionTopY: mainMenuOptionTopY,
      optionGap: 8,
      panel: {
        title: "",
      },
      items: [
        {
          type: "text",
          id: "offline_mode",
          label: "Offline Mode",
          helpText: optionHelpText.offline_mode,
          statusImageSrc: () => (isofflinemodeactivevisual() ? offlineModeEnabledIconPath : offlineModeDisabledIconPath),
          statusImageAlt: () => (isofflinemodeactivevisual() ? "Offline Mode enabled" : "Offline Mode disabled"),
          onConfirm: () => {
            goToPage(offlineModePagePath, { remember: false });
          },
        },
        {
          type: "text",
          id: "audio_caching",
          label: () => `Audio Caching: ${getSelectedAudioCachingModeOption().label}`,
          helpText: optionHelpText.audio_caching,
          onAdjust: (delta) => adjustSelectedAudioCachingMode(delta),
          onConfirm: () => adjustSelectedAudioCachingMode(1),
        },
        {
          type: "text",
          id: "auto_boot",
          label: () => `Auto-Boot: ${getSelectedAutoBootOption().label}`,
          helpText: optionHelpText.auto_boot,
          onAdjust: (delta) => adjustSelectedAutoBootPage(delta),
          onConfirm: () => adjustSelectedAutoBootPage(1),
        },
        {
          type: "text",
          id: "game_border",
          label: () => `Border: ${getselectedgameborderoption().label}`,
          helpText: optionHelpText.game_border,
          onAdjust: (delta) => adjustselectedgameborder(delta),
          onConfirm: () => adjustselectedgameborder(1),
        },
      ],
    },
    mod_loader: {
      optionX: 184,
      optionTopY: 210,
      optionGap: 8,
      panel: {},
      items: [
        {
          type: "text",
          id: "version",
          label: () => `Version: ${getModLoaderVersion()}`,
          onAdjust: (delta) => adjustModLoaderVersion(delta),
          onConfirm: () => adjustModLoaderVersion(1),
        },
        {
          type: "text",
          id: "set_default",
          label: () => getModLoaderSetDefaultLabel(),
          small: true,
          tint: () => modLoaderState.setAsDefault ? "blue" : "normal",
          onConfirm: () => toggleModLoaderSetAsDefault(),
        },
        {
          type: "text",
          id: "clear_default",
          label: () => getModLoaderClearDefaultLabel(),
          small: true,
          disabled: () => !hasModDefaultOverrideForCurrentChapter(),
          onConfirm: () => clearModDefaultOverrideForCurrentChapter(),
        },
        {
          type: "text",
          id: "chapter",
          label: () => `Chapter: ${getModLoaderChapter().label}`,
          onAdjust: (delta) => adjustModLoaderChapter(delta),
          onConfirm: () => adjustModLoaderChapter(1),
        },
        {
          type: "text",
          id: "patch",
          label: () => `Patch: ${getModLoaderPatchLabel()}`,
          onConfirm: () => {
            openModPatchPicker();
          },
        },
        {
          type: "text",
          id: "change_files",
          label: "Change the files?",
          onConfirm: () => {
            openModFileChanger();
          },
        },
        {
          type: "text",
          id: "load",
          label: () => getModLoaderLoadLabel(),
          onConfirm: () => {
            submitModLoaderPatch();
          },
        },
      ],
    },
  };

  const modLoaderState = {
    versionIndex: modLoaderVersions.indexOf("1.07E"),
    chapterIndex: 1,
    patchFile: null,
    logLines: [],
    busy: false,
    patchWarningActive: false,
    patchWarningFlashUntil: 0,
    loadFeedback: "idle",
    loadFeedbackFlashUntil: 0,
    loadFeedbackSticky: false,
    loadingAnimationStartedAt: 0,
    setAsDefault: false,
  };

  const heldKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
    cancel: false,
  };

  const pressedKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
    cancel: false,
  };

  const lastGamepadState = new Map();
  const stageShell = document.getElementById("stage-shell");
  const appPanelOverlay = document.getElementById("app-panel-overlay");
  const appPanelTitle = document.getElementById("app-panel-title");
  const appPanelLog = document.getElementById("app-panel-log");
  const modPatchInput = document.getElementById("mod-patch-file");
  const choiceOverlay = document.getElementById("choice-overlay");
  const soulNode = document.getElementById("menu-soul");
  const logoNode = document.getElementById("menu-logo");
  const marqueeNode = document.getElementById("menu-marquee");
  const marqueeTrackNode = document.getElementById("menu-marquee-track");
  const runtimeFooterNode = document.getElementById("runtime-footer");
  const runtimeOfflineModeIconNode = document.getElementById("runtime-offline-mode-icon");
  const runtimeStatusLabelNode = document.getElementById("runtime-status-label");
  const runtimeDeviceLabelNode = document.getElementById("runtime-device-label");
  const fadeNode = document.getElementById("menu-fade");
  const menuSounds = {
    move: {
      label: "menu move",
      path: "./assets/menu_move.wav",
      volume: menuMoveVolume,
      fallbackSound: new Audio("./assets/menu_move.wav"),
      bufferPromise: null,
    },
    accept: {
      label: "menu accept",
      path: "./assets/menu_accept.wav",
      volume: menuAcceptVolume,
      fallbackSound: new Audio("./assets/menu_accept.wav"),
      bufferPromise: null,
    },
    back: {
      label: "menu back",
      path: "./assets/menu_back.wav",
      volume: menuBackVolume,
      fallbackSound: new Audio("./assets/menu_back.wav"),
      bufferPromise: null,
    },
  };
  let menuAudioContext = null;
  const warnedSoundFallbacks = new Set();

  for (const sound of Object.values(menuSounds)) {
    sound.fallbackSound.preload = "auto";
  }

  if (!stageShell || !choiceOverlay || !soulNode || !logoNode || !fadeNode || !modPatchInput) {
    return;
  }

  let renderer = null;
  let modLoaderHelperPromise = null;
  let marqueeMessagesPromise = null;
  let currentMarqueeMessage = "";
  let lastMarqueeLayoutSignature = "";
  let marqueeUnitWidthPx = 0;
  let marqueeOffsetPx = 0;
  let currentMarqueeFontSizePx = marqueeFontSize;
  let runtimeStatusRequestId = 0;

  let logoResetTapCount = 0;
  let logoResetTapTimerId = 0;

  function resetLogoResetTapCounter() {
    logoResetTapCount = 0;
    if (logoResetTapTimerId) {
      window.clearTimeout(logoResetTapTimerId);
      logoResetTapTimerId = 0;
    }
  }

  function deleteIndexedDatabase(databaseName) {
    return new Promise((resolve) => {
      if (!window.indexedDB || !databaseName) {
        resolve(false);
        return;
      }

      const request = window.indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    });
  }

  async function clearAllDataExceptVerification() {
    const verificationStorageKey = window.gate?.verification_storage_key || "steam_ownership_verification";
    const preservedVerificationState = (() => {
      try {
        return window.localStorage.getItem(verificationStorageKey);
      } catch (_error) {
        return null;
      }
    })();

    try {
      window.sessionStorage?.clear();
    } catch (_error) {
    }

    try {
      window.localStorage?.clear();
      if (preservedVerificationState) {
        window.localStorage.setItem(verificationStorageKey, preservedVerificationState);
      }
    } catch (_error) {
    }

    if (window.caches?.keys) {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      } catch (_error) {
      }
    }

    let databaseNames = [];
    if (window.indexedDB?.databases) {
      try {
        databaseNames = await window.indexedDB.databases();
      } catch (_error) {
        databaseNames = [];
      }
    }

    const verificationDatabaseName = "steam_verification_keys";
    const fallbackDatabaseNames = [
      "/_savedata",
      "_savedata",
      "DELTARUNE",
      "deltarune",
      "dr-play-assets-v1",
      "dr-play-audio-v1",
    ];
    const databaseNamesToDelete = new Set();

    for (const databaseInfo of databaseNames) {
      const databaseName = String(databaseInfo?.name || "").trim();
      if (databaseName && databaseName !== verificationDatabaseName) {
        databaseNamesToDelete.add(databaseName);
      }
    }

    for (const databaseName of fallbackDatabaseNames) {
      if (databaseName !== verificationDatabaseName) {
        databaseNamesToDelete.add(databaseName);
      }
    }

    await Promise.all(Array.from(databaseNamesToDelete).map((databaseName) => deleteIndexedDatabase(databaseName)));
  }

  async function promptResetAllDataExceptVerification() {
    const confirmed = window.confirm("Would you like to reset your data? (You will lose ALL progress!)");
    if (!confirmed) {
      return;
    }

    await clearAllDataExceptVerification();
    window.alert("All data reset! Reloading...");
    window.location.reload();
  }


  function rememberAppPage() {
    let pagePathToSync = "app/index.html";

    try {
      const savedPagePath = normalizeAutoBootPage(localStorage.getItem(autoBootStorageKey));
      if (getAutoBootOptionIndexByPage(savedPagePath) >= 0) {
        pagePathToSync = savedPagePath;
      } else {
        localStorage.setItem(autoBootStorageKey, pagePathToSync);
      }
    } catch (error) {
      console.warn("Unable to read or save the app start page:", error);
    }

    try {
      if (window.parent && window.parent !== window && typeof window.parent.setContainerStartPage === "function") {
        window.parent.setContainerStartPage(pagePathToSync);
      }
    } catch (error) {
      console.warn("Unable to sync the app start page with the container:", error);
    }
  }

  function goToPage(pagePath, options = {}) {
    const normalizedPagePath = String(pagePath ?? "");
    const shouldRemember = options.remember !== false && !/^play\/.+/.test(normalizedPagePath);

    if (shouldRemember) {
      try {
        localStorage.setItem("startpage", normalizedPagePath);
      } catch (error) {
        console.warn("Unable to save the requested app page:", error);
      }
    }

    try {
      if (window.parent && window.parent !== window) {
        if (!shouldRemember && typeof window.parent.goToContainerPageWithoutRemember === "function") {
          window.parent.goToContainerPageWithoutRemember(normalizedPagePath);
          return;
        }

        if (typeof window.parent.goToContainerPage === "function") {
          window.parent.goToContainerPage(normalizedPagePath);
          return;
        }
      }
    } catch (error) {
      console.warn("Unable to hand off to the app container:", error);
    }

    window.location.href = `../${normalizedPagePath}`;
  }

  function refreshCurrentMenuLayout() {
    renderer?.applyLayout(true);
  }

  function isruntimeonline() {
    return navigator.onLine !== false;
  }

  function applyruntimefooterstatus(isOnline) {
    if (!runtimeStatusLabelNode) {
      return;
    }

    runtimeStatusLabelNode.textContent = isOnline ? "Online" : "Offline";
    runtimeStatusLabelNode.classList.toggle("runtime-footer-status-online", isOnline);
    runtimeStatusLabelNode.classList.toggle("runtime-footer-status-offline", !isOnline);
  }

  function applyruntimefooterofflinemodeindicator(isEnabled) {
    if (!runtimeOfflineModeIconNode) {
      return;
    }

    runtimeOfflineModeIconNode.hidden = !isEnabled;
  }

  async function updateRuntimeFooter() {
    if (!runtimeFooterNode || !runtimeDeviceLabelNode || !runtimeStatusLabelNode) {
      return;
    }

    applyruntimefooterstatus(isruntimeonline());
    applyruntimefooterofflinemodeindicator(isofflinemodeactivevisual());
    const currentRequestId = runtimeStatusRequestId + 1;
    runtimeStatusRequestId = currentRequestId;

    try {
      const runtimeDeviceLabel = await detectRuntimeDeviceLabel();

      if (currentRequestId !== runtimeStatusRequestId) {
        return;
      }

      runtimeDeviceLabelNode.textContent = runtimeDeviceLabel;
    } catch (error) {
      if (currentRequestId !== runtimeStatusRequestId) {
        return;
      }

      console.warn("Unable to detect the runtime device:", error);
      runtimeDeviceLabelNode.textContent = "Other";
    }
  }

  function normalizemarqueemessages(fileContents) {
    return String(fileContents || "")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  function pickmarqueemessage(messages) {
    if (!Array.isArray(messages) || messages.length <= 0) {
      return fallbackMarqueeMessages[0];
    }

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex] ?? fallbackMarqueeMessages[0];
  }

  async function loadmarqueemessages() {
    if (marqueeMessagesPromise) {
      return marqueeMessagesPromise;
    }

    marqueeMessagesPromise = fetch(marqueeMessagesPath, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load marquee messages (${response.status}).`);
        }

        return response.text();
      })
      .then((fileContents) => {
        const messages = normalizemarqueemessages(fileContents);
        return messages.length > 0 ? messages : fallbackMarqueeMessages;
      })
      .catch((error) => {
        console.warn("Unable to load marquee messages:", error);
        return fallbackMarqueeMessages;
      });

    return marqueeMessagesPromise;
  }

  function measuremarqueetextwidth() {
    if (!marqueeTrackNode) {
      return 0;
    }

    marqueeTrackNode.textContent = "";
    const segmentNode = createmarqueesegmentnode();
    segmentNode.style.width = "auto";
    marqueeTrackNode.appendChild(segmentNode);

    const measuredWidth = Number(segmentNode.getBoundingClientRect().width || 0);
    marqueeTrackNode.textContent = "";
    return measuredWidth;
  }

  function createmarqueesegmentnode() {
    const segmentNode = document.createElement("span");
    segmentNode.className = "menu-marquee-segment";

    const messageNode = document.createElement("span");
    messageNode.className = "menu-marquee-message";
    messageNode.textContent = currentMarqueeMessage;

    const separatorNode = document.createElement("span");
    separatorNode.className = "menu-marquee-separator";
    separatorNode.textContent = marqueeSpacerText;

    segmentNode.appendChild(messageNode);
    segmentNode.appendChild(separatorNode);
    return segmentNode;
  }

  function buildmarqueeunits(itemsPerUnit) {
    if (!marqueeTrackNode) {
      return;
    }

    marqueeTrackNode.textContent = "";

    for (let unitIndex = 0; unitIndex < 3; unitIndex += 1) {
      const unitNode = document.createElement("div");
      unitNode.className = "menu-marquee-unit";

      for (let itemIndex = 0; itemIndex < itemsPerUnit; itemIndex += 1) {
        unitNode.appendChild(createmarqueesegmentnode());
      }

      marqueeTrackNode.appendChild(unitNode);
    }
  }

  function updatemarquee(deltaFrames, isVisible) {
    if (!marqueeTrackNode || !isVisible || !(marqueeUnitWidthPx > 0)) {
      return;
    }

    const movementPerFrame = 3.9 * Math.max(0.7, Math.min(1.15, currentMarqueeFontSizePx / marqueeFontSize));
    marqueeOffsetPx += movementPerFrame * Math.max(0, deltaFrames);

    while (marqueeOffsetPx >= marqueeUnitWidthPx) {
      marqueeOffsetPx -= marqueeUnitWidthPx;
    }

    marqueeTrackNode.style.transform = `translateX(${-marqueeOffsetPx.toFixed(3)}px)`;
  }

  function syncmarqueeanimation() {
    if (!marqueeNode || !marqueeTrackNode || !currentMarqueeMessage) {
      return;
    }

    const availableWidth = Math.max(0, marqueeNode.clientWidth - 2);

    if (availableWidth <= 0) {
      return;
    }

    const messageLength = currentMarqueeMessage.length;
    const letterSpacingEm = Math.max(0.06, Math.min(0.18, 0.2 - (messageLength * 0.0018)));
    const layoutSignature = `${currentMarqueeMessage}|${availableWidth}|${letterSpacingEm.toFixed(3)}`;

    if (layoutSignature === lastMarqueeLayoutSignature) {
      return;
    }

    marqueeNode.style.setProperty("--marquee-letter-spacing", `${letterSpacingEm.toFixed(3)}em`);
    const textWidth = Math.ceil(measuremarqueetextwidth());

    if (!(textWidth > 0)) {
      return;
    }

    const itemWidth = textWidth;
    const itemsPerUnit = Math.max(2, Math.ceil(availableWidth / itemWidth) + 1);
    buildmarqueeunits(itemsPerUnit);
    const unitNodes = marqueeTrackNode.querySelectorAll(".menu-marquee-unit");
    const firstUnitNode = unitNodes[0] ?? null;
    const secondUnitNode = unitNodes[1] ?? null;
    const unitWidth = secondUnitNode
      ? Math.max(1, Math.round(secondUnitNode.offsetLeft - firstUnitNode.offsetLeft))
      : Math.ceil(Number(firstUnitNode?.getBoundingClientRect().width || 0));

    if (!(unitWidth > 0)) {
      return;
    }

    marqueeUnitWidthPx = unitWidth;
    marqueeOffsetPx = marqueeUnitWidthPx > 0 ? marqueeOffsetPx % marqueeUnitWidthPx : 0;
    marqueeTrackNode.style.transform = `translateX(${-marqueeOffsetPx.toFixed(3)}px)`;
    lastMarqueeLayoutSignature = `${layoutSignature}|${itemsPerUnit}|${unitWidth.toFixed(2)}`;
  }

  function setmarqueemessage(message) {
    const nextMessage = String(message || "").trim();

    if (!nextMessage || currentMarqueeMessage === nextMessage) {
      return;
    }

    currentMarqueeMessage = nextMessage;
    lastMarqueeLayoutSignature = "";
    marqueeUnitWidthPx = 0;
    marqueeOffsetPx = 0;
    refreshCurrentMenuLayout();
  }

  function getNowMs() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  function getAppUiZoom() {
    try {
      const rootStyles = window.getComputedStyle(document.documentElement);
      const parsedValue = Number.parseFloat(rootStyles.getPropertyValue("--ui-zoom"));
      return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1.35;
    } catch (_error) {
      return 1.35;
    }
  }

  function focusStageShell() {
    try {
      stageShell.focus({ preventScroll: true });
    } catch (_error) {
      stageShell.focus();
    }
  }


  const modFileOverrideStorageKey = "dr-play-file-overrides-v1";

  function readModDefaultOverrides() {
    try {
      const raw = localStorage.getItem(modDefaultOverrideStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function writeModDefaultOverrides(record) {
    try {
      localStorage.setItem(modDefaultOverrideStorageKey, JSON.stringify(record || {}));
    } catch (error) {
      console.warn("Unable to save mod default override record:", error);
    }
  }

  function getModDefaultOverrideKeyForChapter(chapter) {
    return String(chapter) === "s" ? "play" : String(chapter);
  }

  function getModLoaderPlayScopeForChapter(chapter) {
    return String(chapter) === "s" ? "play" : `chapter${chapter}`;
  }

  function getModLoaderDefaultOverrideKeyForChapter(chapter) {
    return String(chapter) === "s" ? "play" : String(chapter);
  }

  function getModDefaultOverrideForChapter(chapterValue = getModLoaderChapter().value) {
    const record = readModDefaultOverrides();
    const defaultOverrideKey = getModDefaultOverrideKeyForChapter(chapterValue);
    const entry = record[defaultOverrideKey]
      || Object.values(record).find((candidate) => (
        candidate && typeof candidate === "object" && candidate.play_scope === getModLoaderPlayScopeForChapter(chapterValue)
      ));
    return entry && typeof entry === "object" && entry.cache_key ? entry : null;
  }

  function hasModDefaultOverrideForCurrentChapter() {
    return Boolean(getModDefaultOverrideForChapter());
  }

  function getModLoaderSetDefaultLabel() {
    return hasModDefaultOverrideForCurrentChapter() ? "Overwrite default?" : "Set as default?";
  }

  function getModLoaderClearDefaultLabel() {
    return "Clear default?";
  }

  function toggleModLoaderSetAsDefault() {
    modLoaderState.setAsDefault = !modLoaderState.setAsDefault;
    refreshCurrentMenuLayout();
    return true;
  }

  async function clearModDefaultOverrideForCurrentChapter() {
    const chapter = getModLoaderChapter().value;
    const record = readModDefaultOverrides();
    const defaultOverrideKey = getModLoaderDefaultOverrideKeyForChapter(chapter);
    const entry = record[defaultOverrideKey];
    delete record[defaultOverrideKey];
    writeModDefaultOverrides(record);

    if (entry?.cache_key && window.caches?.open) {
      try {
        const overrideCache = await caches.open(modOverrideCacheName);
        await overrideCache.delete(entry.cache_key);
      } catch (error) {
        console.warn("Unable to clear cached mod default:", error);
      }
    }

    modLoaderState.setAsDefault = false;
    appendModLoaderLog(`Cleared ${getModLoaderChapter().label} default mod.`);
    refreshCurrentMenuLayout();
  }

  function getModLoaderMinVersionIndexForChapter(chapterValue = getModLoaderChapter().value) {
    return String(chapterValue) === "5" ? modLoaderVersions.indexOf("1.06") : 0;
  }

  function normalizeModLoaderSelection() {
    const minIndex = Math.max(0, getModLoaderMinVersionIndexForChapter());
    if (modLoaderState.versionIndex < minIndex) {
      modLoaderState.versionIndex = minIndex;
    }
  }

  function normalizeModAssetPath(rawPath) {
    let normalized = String(rawPath ?? "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/[?#].*$/, "");

    while (normalized.startsWith("../") || normalized.startsWith("./")) {
      normalized = normalized.replace(/^\.\.\//, "").replace(/^\.\//, "");
    }

    normalized = normalized.replace(/^play\/chapter\d+\//i, "");

    const musIndex = normalized.toLowerCase().lastIndexOf("mus/");
    if (musIndex >= 0) {
      return normalized.slice(musIndex);
    }

    const vidIndex = normalized.toLowerCase().lastIndexOf("vid/");
    if (vidIndex >= 0) {
      return normalized.slice(vidIndex);
    }

    return normalized;
  }

  async function loadModChapterAssetList(chapterValue = getModLoaderChapter().value) {
    const chapter = String(chapterValue);
    const response = await fetch(`../play/chapter${chapter}/index.html`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load Chapter ${chapter} file list.`);
    }

    const html = await response.text();
    const allowVideos = chapter === "3" || chapter === "5";
    const matches = Array.from(html.matchAll(/(?:\.\.\/|\.\/)?(?:mus|vid)\/[^`"'<>;,\]\)\s]+\.(?:ogg|wav|mp3|mp4|webm|ogv)/gi))
      .map((match) => match[0]);
    const seen = new Set();
    const files = [];

    for (const value of matches) {
      const assetPath = normalizeModAssetPath(value);
      const lower = assetPath.toLowerCase();

      if (!lower || lower === "") {
        continue;
      }

      const isMusic = lower.startsWith("mus/") && /\.(?:ogg|wav|mp3)$/i.test(lower);
      const isVideo = allowVideos && lower.startsWith("vid/") && /\.(?:mp4|webm|ogv)$/i.test(lower);

      if ((!isMusic && !isVideo) || seen.has(lower)) {
        continue;
      }

      seen.add(lower);
      files.push(assetPath);
    }

    if (files.length === 0 && Array.isArray(modLoaderFallbackReplaceableFiles[chapter])) {
      for (const fallbackPath of modLoaderFallbackReplaceableFiles[chapter]) {
        const normalizedFallbackPath = normalizeModAssetPath(fallbackPath);
        const lowerFallbackPath = normalizedFallbackPath.toLowerCase();
        if (lowerFallbackPath && lowerFallbackPath !== "" && !seen.has(lowerFallbackPath)) {
          seen.add(lowerFallbackPath);
          files.push(normalizedFallbackPath);
        }
      }
    }

    files.sort((a, b) => a.localeCompare(b));
    return files;
  }
  function closeModFileChangerModal() {
    const modal = document.getElementById("mod-file-changer-modal");
    if (!modal?.classList.contains("is-open")) {
      return false;
    }

    modal.classList.remove("is-open");
    focusStageShell();
    return true;
  }

  function isModFileChangerModalOpen() {
    return document.getElementById("mod-file-changer-modal")?.classList.contains("is-open") === true;
  }

  function getModFileChangerFocusableNodes() {
    const modal = document.getElementById("mod-file-changer-modal");
    if (!modal?.classList.contains("is-open")) {
      return [];
    }

    return Array.from(modal.querySelectorAll("button:not([disabled])"));
  }

  function moveModFileChangerFocus(delta) {
    const focusableNodes = getModFileChangerFocusableNodes();
    if (focusableNodes.length === 0) {
      return false;
    }

    const currentIndex = Math.max(0, focusableNodes.indexOf(document.activeElement));
    const nextIndex = (currentIndex + delta + focusableNodes.length) % focusableNodes.length;
    focusableNodes[nextIndex]?.focus?.({ preventScroll: true });
    return true;
  }

  function activateFocusedModFileChangerControl() {
    if (!isModFileChangerModalOpen()) {
      return false;
    }

    if (document.activeElement instanceof HTMLButtonElement) {
      document.activeElement.click();
      return true;
    }

    const firstButton = getModFileChangerFocusableNodes()[0];
    firstButton?.focus?.({ preventScroll: true });
    return Boolean(firstButton);
  }

  function handleModFileChangerInputFrame(inputFrame) {
    if (!isModFileChangerModalOpen()) {
      return false;
    }

    if (inputFrame.cancelPressed) {
      playMenuBackSound();
      closeModFileChangerModal();
      return true;
    }

    if (inputFrame.upPressed || inputFrame.leftPressed) {
      playMenuMoveSound();
      moveModFileChangerFocus(-1);
      return true;
    }

    if (inputFrame.downPressed || inputFrame.rightPressed) {
      playMenuMoveSound();
      moveModFileChangerFocus(1);
      return true;
    }

    if (inputFrame.confirmPressed) {
      playMenuAcceptSound();
      activateFocusedModFileChangerControl();
      return true;
    }

    return true;
  }

  function ensureModFileChangerModal() {
    let modal = document.getElementById("mod-file-changer-modal");
    if (modal) {
      return modal;
    }
    modal = document.createElement("div");
    modal.id = "mod-file-changer-modal";
    modal.innerHTML = `
      <style>
        #mod-file-changer-modal{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.9);color:#fff;font-family:"Eight Bit Operator","Courier New",monospace;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box}
        #mod-file-changer-modal.is-open{display:flex}
        #mod-file-changer-modal .mod-file-card{width:min(900px,100%);max-height:min(88vh,760px);display:flex;flex-direction:column;gap:10px;background:#06060c;border:2px solid #fff;box-shadow:0 0 0 4px #000,0 0 28px rgba(255,255,255,.2);padding:clamp(10px,3vw,18px);box-sizing:border-box}
        #mod-file-changer-modal .mod-file-copy{margin:0;text-align:center;color:#ddd;font-size:clamp(13px,3.3vw,16px);line-height:1.35}
        #mod-file-changer-modal .mod-file-list{overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:8px;padding:8px;border:2px solid rgba(255,255,255,.55);background:#000;min-height:160px;max-height:52vh;box-sizing:border-box;-webkit-overflow-scrolling:touch}
        #mod-file-changer-modal button{font:inherit;color:#fff;background:#000;border:2px solid #fff;padding:10px 11px;cursor:pointer;text-align:left;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.25;min-height:44px;box-sizing:border-box;touch-action:manipulation}
        #mod-file-changer-modal button:hover,#mod-file-changer-modal button:focus,#mod-file-changer-modal button:focus-visible{color:#ffff66;outline:3px solid #ffff66;outline-offset:2px;z-index:1}
        #mod-file-changer-modal .mod-file-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:stretch}
        #mod-file-changer-modal .mod-file-actions button{text-align:center;justify-content:center}
        #mod-file-changer-modal .mod-file-status{text-align:center;min-height:1.3em;color:#bbb;margin:0;font-size:clamp(12px,3vw,15px);line-height:1.35;overflow-wrap:anywhere}
        @media (max-width:520px){#mod-file-changer-modal .mod-file-card{max-height:92vh}#mod-file-changer-modal .mod-file-list{grid-template-columns:1fr;max-height:56vh;padding:6px}#mod-file-changer-modal .mod-file-actions{grid-template-columns:1fr}#mod-file-changer-modal button{padding:11px 9px}}
      </style>
      <section class="mod-file-card" role="dialog" aria-modal="true" aria-label="Choose replacement files">
        <p class="mod-file-copy">Pick a music/video file, then choose your replacement.</p>
        <p class="mod-file-status" id="mod-file-status">Loading file list...</p>
        <div class="mod-file-list" id="mod-file-list" role="list"></div>
        <div class="mod-file-actions"><button type="button" id="mod-file-clear">Reset file changes?</button><button type="button" id="mod-file-close">Back?</button></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelector("#mod-file-close")?.addEventListener("click", () => closeModFileChangerModal());
    modal.addEventListener("click", (event) => { if (event.target === modal) closeModFileChangerModal(); });
    modal.addEventListener("keydown", (event) => {
      if (!modal.classList.contains("is-open")) return;
      if (event.key === "Escape" || event.key === "Backspace") {
        event.preventDefault();
        closeModFileChangerModal();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveModFileChangerFocus(-1);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        moveModFileChangerFocus(1);
      }
    });
    modal.querySelector("#mod-file-clear")?.addEventListener("click", async () => {
      try { sessionStorage.removeItem(modFileOverrideStorageKey); } catch (_error) {}
      const status = modal.querySelector("#mod-file-status");
      if (status) status.textContent = "File changes cleared.";
    });
    return modal;
  }

  async function stashModFileOverride(chapterValue, assetPath, file) {
    if (!window.caches?.open) {
      throw new Error("This browser cannot store file replacements.");
    }
    const chapter = String(chapterValue);
    const cache = await caches.open(modOverrideCacheName);
    const cacheKey = `${window.location.origin}/__dr_mod_file_override__/chapter${chapter}/${encodeURIComponent(assetPath)}/${Date.now()}`;
    await cache.put(cacheKey, new Response(file, { headers: { "content-type": file.type || "application/octet-stream", "cache-control": "no-store" } }));
    let record = { play_scope: `chapter${chapter}`, files: [] };
    try {
      const parsed = JSON.parse(sessionStorage.getItem(modFileOverrideStorageKey) || "null");
      if (parsed && parsed.play_scope === record.play_scope && Array.isArray(parsed.files)) record = parsed;
    } catch (_error) {}
    record.files = record.files.filter((entry) => String(entry.asset_path).toLowerCase() !== assetPath.toLowerCase());
    record.files.push({ asset_path: assetPath, cache_key: cacheKey, file_name: file.name, created_at: Date.now() });
    sessionStorage.setItem(modFileOverrideStorageKey, JSON.stringify(record));
  }

  function chooseReplacementFileForAsset(chapterValue, assetPath, statusNode) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = /\.mp4$|\.webm$|\.ogv$/i.test(assetPath) ? "video/*,.mp4,.webm,.ogv" : "audio/*,.ogg,.wav,.mp3";
    input.setAttribute("aria-label", `Choose replacement for ${assetPath}`);
    input.style.position = "fixed";
    input.style.left = "0";
    input.style.top = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0.01";
    input.style.pointerEvents = "none";
    input.style.zIndex = "10060";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      if (!file) {
        const firstButton = getModFileChangerFocusableNodes()[0];
        firstButton?.focus?.({ preventScroll: true });
        return;
      }
      try {
        if (statusNode) statusNode.textContent = `Replacing ${assetPath}...`;
        await stashModFileOverride(chapterValue, assetPath, file);
        if (statusNode) statusNode.textContent = `File change set for ${assetPath}.`;
      } catch (error) {
        console.error("Unable to store file replacement:", error);
        if (statusNode) statusNode.textContent = error?.message || "Unable to store replacement.";
      } finally {
        const activeModal = document.getElementById("mod-file-changer-modal");
        const matchingButton = Array.from(activeModal?.querySelectorAll("[data-asset-path]") || [])
          .find((button) => button.dataset.assetPath === assetPath);
        matchingButton?.focus?.({ preventScroll: true });
      }
    }, { once: true });
    input.click();
  }

  async function openModFileChanger() {
    if (modLoaderState.busy) return;
    const chapter = getModLoaderChapter().value;
    const modal = ensureModFileChangerModal();
    const list = modal.querySelector("#mod-file-list");
    const status = modal.querySelector("#mod-file-status");
    modal.classList.add("is-open");
    if (list) list.innerHTML = "";
    if (status) status.textContent = "Loading file list...";
    try {
      const files = await loadModChapterAssetList(chapter);
      if (status) status.textContent = files.length ? `Chapter ${chapter}: ${files.length} replaceable files.` : "No replaceable files found.";
      for (const assetPath of files) {
        const button = document.createElement("button");
        button.type = "button";
        button.title = assetPath;
        button.dataset.assetPath = assetPath;
        button.setAttribute("role", "listitem");
        button.textContent = assetPath;
        button.addEventListener("click", () => chooseReplacementFileForAsset(chapter, assetPath, status));
        list?.appendChild(button);
      }
      list?.querySelector("button")?.focus?.({ preventScroll: true });
      if (!list?.querySelector("button")) {
        modal.querySelector("#mod-file-close")?.focus?.({ preventScroll: true });
      }
    } catch (error) {
      console.error("Unable to open file changer:", error);
      if (status) status.textContent = error?.message || "Unable to load file list.";
    }
  }

  function wrapSelectionIndex(currentIndex, delta, length) {
    if (!Number.isFinite(length) || length <= 0) {
      return 0;
    }

    return (currentIndex + delta + length) % length;
  }

  function getModLoaderVersion() {
    normalizeModLoaderSelection();
    return modLoaderVersions[Math.max(0, modLoaderState.versionIndex)] ?? modLoaderVersions[0];
  }

  function getModLoaderChapter() {
    return modLoaderChapters[Math.max(0, modLoaderState.chapterIndex)] ?? modLoaderChapters[0];
  }

  function trimMiddleLabel(value, maxLength = 24) {
    const normalizedValue = String(value ?? "").trim();

    if (normalizedValue.length <= maxLength) {
      return normalizedValue;
    }

    const headLength = Math.max(8, Math.floor((maxLength - 3) * 0.6));
    const tailLength = Math.max(5, maxLength - headLength - 3);
    return `${normalizedValue.slice(0, headLength)}...${normalizedValue.slice(-tailLength)}`;
  }

  function getModLoaderPatchLabel() {
    if (!modLoaderState.patchFile) {
      return "⸻";
    }

    return trimMiddleLabel(modLoaderState.patchFile.name, 26);
  }

  function getModLoaderLoadLabel() {
    if (modLoaderState.loadFeedback === "loading") {
      const elapsedMs = Math.max(0, getNowMs() - modLoaderState.loadingAnimationStartedAt);
      const dotCount = (Math.floor(elapsedMs / modLoaderLoadingStepDurationMs) % 3) + 1;
      return `Loading${".".repeat(dotCount)}`;
    }

    if (modLoaderState.loadFeedback === "missing_patch") {
      return "Please select a patch!";
    }

    if (modLoaderState.loadFeedback === "mismatch") {
      return "Wrong chapter/version selected!";
    }

    if (modLoaderState.loadFeedback === "failed") {
      return "Patch failed.";
    }

    return "Load it up!";
  }

  function clearModLoaderPatchWarning() {
    modLoaderState.patchWarningActive = false;
    modLoaderState.patchWarningFlashUntil = 0;
    refreshCurrentMenuLayout();
  }

  function triggerModLoaderPatchWarning() {
    modLoaderState.patchWarningActive = true;
    modLoaderState.patchWarningFlashUntil = getNowMs() + modLoaderWarningFlashDurationMs;
    refreshCurrentMenuLayout();
  }

  function clearModLoaderLoadFeedback() {
    modLoaderState.loadFeedback = "idle";
    modLoaderState.loadFeedbackFlashUntil = 0;
    modLoaderState.loadFeedbackSticky = false;
    refreshCurrentMenuLayout();
  }

  function setModLoaderLoadFeedback(value, { sticky = false, flash = false } = {}) {
    modLoaderState.loadFeedback = value;
    modLoaderState.loadFeedbackSticky = sticky;
    modLoaderState.loadFeedbackFlashUntil = flash
      ? getNowMs() + modLoaderWarningFlashDurationMs
      : 0;

    if (value === "loading") {
      modLoaderState.loadingAnimationStartedAt = getNowMs();
    }

    refreshCurrentMenuLayout();
  }

  function getModLoaderOptionWarningState(optionId) {
    if (optionId === "patch" && modLoaderState.patchWarningActive) {
      return {
        warning: true,
        flash: getNowMs() < modLoaderState.patchWarningFlashUntil,
      };
    }

    if (optionId === "load" && modLoaderState.loadFeedback !== "idle" && modLoaderState.loadFeedback !== "loading") {
      return {
        warning: true,
        flash: getNowMs() < modLoaderState.loadFeedbackFlashUntil,
      };
    }

    return {
      warning: false,
      flash: false,
    };
  }

  function isLikelyPatchMismatch(message) {
    return /mismatch|checksum|xd3|invalid input|target window|source window|source size/i.test(String(message ?? ""));
  }

  function syncModLoaderPanelLog() {
    if (!appPanelLog) {
      return;
    }

    if (renderer?.currentMenuId !== "mod_loader" || modLoaderState.logLines.length === 0) {
      appPanelLog.hidden = true;
      appPanelLog.textContent = "";
      return;
    }

    appPanelLog.hidden = false;
    appPanelLog.textContent = modLoaderState.logLines.join("\n");
    appPanelLog.scrollTop = appPanelLog.scrollHeight;
  }

  function appendModLoaderLog(message) {
    const normalizedMessage = String(message ?? "").trim();

    if (!normalizedMessage) {
      return;
    }

    if (modLoaderState.logLines[modLoaderState.logLines.length - 1] === normalizedMessage) {
      return;
    }

    modLoaderState.logLines.push(normalizedMessage);

    if (modLoaderState.logLines.length > 8) {
      modLoaderState.logLines = modLoaderState.logLines.slice(-8);
    }

    syncModLoaderPanelLog();
  }

  function formatModLoaderByteQuantity(byteCount) {
    const normalizedByteCount = Math.max(0, Number(byteCount) || 0);
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    let scaledValue = normalizedByteCount;

    while (scaledValue >= 1024 && unitIndex < units.length - 1) {
      scaledValue /= 1024;
      unitIndex += 1;
    }

    const decimals = scaledValue >= 100 ? 0 : (scaledValue >= 10 ? 1 : 2);
    return `${scaledValue.toFixed(decimals)} ${units[unitIndex]}`;
  }

  function createModLoaderProgressLogger(assetPath) {
    let lastLoggedMessage = "";
    let lastLoggedAt = 0;
    let lastLoggedBytes = 0;

    return (progressState) => {
      const downloadedBytes = Math.max(0, Number(progressState?.downloaded_bytes) || 0);
      const totalBytes = Math.max(downloadedBytes, Number(progressState?.total_bytes) || 0);
      const now = Date.now();
      const done = progressState?.done === true;

      if (!done && now - lastLoggedAt < 250 && downloadedBytes - lastLoggedBytes < 512 * 1024) {
        return;
      }

      const percent = totalBytes > 0 ? Math.max(0, Math.min(100, (downloadedBytes / totalBytes) * 100)) : 100;
      const message = `${done ? "Downloaded file" : "Downloading file"}: ${assetPath} (${formatModLoaderByteQuantity(downloadedBytes)} / ${formatModLoaderByteQuantity(totalBytes)}, ${percent.toFixed(percent >= 10 ? 0 : 1)}%)`;

      if (message === lastLoggedMessage) {
        return;
      }

      lastLoggedMessage = message;
      lastLoggedAt = now;
      lastLoggedBytes = downloadedBytes;
      appendModLoaderLog(message);
    };
  }

  function clearModLoaderLog() {
    modLoaderState.logLines = [];
    syncModLoaderPanelLog();
  }

  function setModLoaderBusy(isBusy) {
    modLoaderState.busy = Boolean(isBusy);
    refreshCurrentMenuLayout();
  }

  function updateAppPanel(menu) {
    if (!appPanelOverlay || !appPanelTitle) {
      return;
    }

    const panelConfig = menu?.panel ?? null;
    const isVisible = Boolean(panelConfig);
    appPanelOverlay.hidden = !isVisible;
    appPanelOverlay.setAttribute("aria-hidden", isVisible ? "false" : "true");

    if (!panelConfig) {
      syncModLoaderPanelLog();
      return;
    }

    appPanelTitle.textContent = panelConfig.title ?? "";
    syncModLoaderPanelLog();
  }

  function adjustModLoaderVersion(delta) {
    if (modLoaderState.busy) {
      return false;
    }

    const minIndex = Math.max(0, getModLoaderMinVersionIndexForChapter());
    const allowedLength = modLoaderVersions.length - minIndex;
    modLoaderState.versionIndex = minIndex + wrapSelectionIndex(modLoaderState.versionIndex - minIndex, delta, allowedLength);
    refreshCurrentMenuLayout();
    return true;
  }

  function adjustModLoaderChapter(delta) {
    if (modLoaderState.busy) {
      return false;
    }

    modLoaderState.chapterIndex = wrapSelectionIndex(modLoaderState.chapterIndex, delta, modLoaderChapters.length);
    normalizeModLoaderSelection();
    refreshCurrentMenuLayout();
    return true;
  }

  async function ensureModLoaderHelper() {
    if (window.ensureProtectedPlaySession && window.resolveProtectedPlayAssetUrl) {
      return;
    }

    if (!modLoaderHelperPromise) {
      modLoaderHelperPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector("script[data-dr-play-helper='1']");

        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("Unable to load the protected play helper.")), { once: true });
          return;
        }

        const helperScript = document.createElement("script");
        helperScript.async = true;
        helperScript.dataset.drPlayHelper = "1";
        helperScript.src = new URL(modLoaderHelperPath, window.location.href).toString();
        helperScript.onload = () => resolve();
        helperScript.onerror = () => reject(new Error("Unable to load the protected play helper."));
        document.body.appendChild(helperScript);
      }).finally(() => {
        if (!(window.ensureProtectedPlaySession && window.resolveProtectedPlayAssetUrl)) {
          modLoaderHelperPromise = null;
        }
      });
    }

    await modLoaderHelperPromise;

    if (!(window.ensureProtectedPlaySession && window.resolveProtectedPlayAssetUrl)) {
      throw new Error("The protected play helper is unavailable.");
    }
  }

  function warmModLoaderHelper() {
    ensureModLoaderHelper().catch((error) => {
      if (renderer?.currentMenuId === "mod_loader") {
        appendModLoaderLog(error.message || "Unable to prepare the mod loader.");
      }
    });
  }

  async function verifyModAccess() {
    const gateApi = window.gate ?? window.ownership_gate ?? null;

    if (!gateApi?.check_saved_ownership) {
      throw new Error("Verification is unavailable in this browser.");
    }

    const gateResult = await gateApi.check_saved_ownership();

    if (!gateResult?.verified) {
      throw new Error("Verification required.");
    }

    return gateResult;
  }

  async function ensureModPlaySession() {
    await ensureModLoaderHelper();
    await verifyModAccess();
    return window.ensureProtectedPlaySession(modPlayScope);
  }

  async function fileToUint8Array(file) {
    return new Uint8Array(await file.arrayBuffer());
  }

  function getSourceVersionFolder(version) {
    const normalizedVersion = String(version || "");
    if (normalizedVersion === "1.00") return "1.00.0";
    return normalizedVersion;
  }

  function getModLoaderSourceChapterFile(chapter) {
    return String(chapter) === "s" ? "chaps.unx" : `chap${chapter}.unx`;
  }
  async function fetchProtectedSourceBytes(version, chapter) {
    const sourcePath = `unmod/${getSourceVersionFolder(version)}/${getModLoaderSourceChapterFile(chapter)}`;
    appendModLoaderLog(`Requesting file: ${sourcePath}`);
    await ensureModPlaySession();
    const logProtectedProgress = createModLoaderProgressLogger(sourcePath);
    let response = null;

    if (window.fetchProtectedPlayAssetResponse) {
      response = await window.fetchProtectedPlayAssetResponse(sourcePath, modPlayScope, {
        on_status(message) {
          appendModLoaderLog(message);
        },
        on_progress: logProtectedProgress,
      });
    } else {
      const sourceUrl = await window.resolveProtectedPlayAssetUrl(sourcePath, modPlayScope);
      response = await fetch(sourceUrl);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${sourcePath}`);
    }

    appendModLoaderLog("Base file ready.");
    return new Uint8Array(await response.arrayBuffer());
  }

  async function applyModPatch(sourceBytes, patchBytes) {
    appendModLoaderLog("Applying patch...");

    return new Promise((resolve, reject) => {
      const worker = new Worker(modPatcherWorkerPath, { type: "module" });
      const chunks = [];

      worker.onmessage = (event) => {
        if (!event.data) {
          return;
        }

        const { final, bytes, error, errorMessage, errorCode } = event.data;

        if (!final) {
          if (bytes) {
            chunks.push(bytes);
          }
          return;
        }

        worker.terminate();

        if (error) {
          reject(new Error(errorMessage || `Worker error code ${errorCode}`));
          return;
        }

        resolve(new Blob(chunks, { type: "application/octet-stream" }));
      };

      worker.onerror = (event) => {
        worker.terminate();
        reject(new Error(event.message || "The patch worker crashed."));
      };

      worker.postMessage({
        command: "start",
        sourceFile: new Blob([sourceBytes]),
        patchFile: new Blob([patchBytes]),
      });
    });
  }

    async function stashPatchedGameBlob(chapter, patchedBlob, options = {}) {
    if (!window.caches?.open) {
      throw new Error("This browser cannot store the patched game data.");
    }

    const overrideCache = await caches.open(modOverrideCacheName);
    const playScope = getModLoaderPlayScopeForChapter(chapter);
    const defaultOverrideKey = getModLoaderDefaultOverrideKeyForChapter(chapter);
    const cacheKey = `${window.location.origin}/__dr_mod_override__/${playScope}/${Date.now()}`;
    await overrideCache.put(
      cacheKey,
      new Response(patchedBlob, {
        headers: {
          "content-type": "application/octet-stream",
          "cache-control": "no-store",
        },
      }),
    );

    const overrideRecord = {
      play_scope: playScope,
      cache_key: cacheKey,
      created_at: Date.now(),
    };

    if (options.setAsDefault === true) {
      const defaultRecord = readModDefaultOverrides();
      const previousEntry = defaultRecord[defaultOverrideKey];
      defaultRecord[defaultOverrideKey] = {
        ...overrideRecord,
        version: getModLoaderVersion(),
        patch_name: modLoaderState.patchFile?.name || "",
      };
      writeModDefaultOverrides(defaultRecord);
      appendModLoaderLog(`Saved Chapter ${getModLoaderChapter().label} as default mod.`);
      console.log("[mod loader] saved default mod override", defaultRecord[defaultOverrideKey]);

      // Default mods must stay in the override cache. Do not also write the
      // one-shot session override record, because the play loader deletes
      // one-shot override cache entries after applying them. If the session
      // record points at the same cache key as the default, the first launch
      // works once and then destroys the saved default.
      try {
        sessionStorage.removeItem(modOverrideStorageKey);
      } catch (_storage_error) {
      }

      if (previousEntry?.cache_key && previousEntry.cache_key !== cacheKey) {
        try {
          await overrideCache.delete(previousEntry.cache_key);
        } catch (_delete_error) {
        }
      }
    } else {
      sessionStorage.setItem(modOverrideStorageKey, JSON.stringify(overrideRecord));
    }
  }

  function redirectToVerificationPage() {
    goToPage("verif/index.html");
  }

  function ensureDirectModPatchInput(node) {
    let input = node.querySelector(".mod-patch-direct-input");
    if (input instanceof HTMLInputElement) {
      return input;
    }

    input = document.createElement("input");
    input.type = "file";
    input.accept = ".xdelta,.xd3,.patch,application/octet-stream";
    input.className = "mod-patch-direct-input";
    input.setAttribute("aria-label", "Choose patch file");
    Object.assign(input.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      opacity: "0.01",
      cursor: "pointer",
      zIndex: "2",
      border: "0",
      padding: "0",
      margin: "0",
      fontSize: "16px",
      background: "transparent",
      color: "transparent",
    });
    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      const optionIndex = Number(node.dataset.choiceIndex ?? -1);
      if (optionIndex >= 0) {
        renderer?.setSelectedIndex(optionIndex);
      }
    });
    input.addEventListener("change", () => {
      setSelectedModPatchFile(input.files?.[0] ?? null);
      input.value = "";
    });
    node.appendChild(input);
    return input;
  }

  function syncDirectModPatchInput(node, option) {
    const shouldUseDirectPicker = option?.id === "patch" && renderer?.currentMenuId === "mod_loader";
    const existingInput = node.querySelector(".mod-patch-direct-input");

    if (!shouldUseDirectPicker) {
      existingInput?.remove();
      node.classList.remove("has-direct-file-input");
      return;
    }

    node.classList.add("has-direct-file-input");
    node.style.position = "absolute";
    ensureDirectModPatchInput(node);
  }

  function setSelectedModPatchFile(file) {
    modLoaderState.patchFile = file ?? null;

    if (modLoaderState.patchFile) {
      clearModLoaderPatchWarning();

      if (modLoaderState.loadFeedback === "missing_patch") {
        clearModLoaderLoadFeedback();
      }
    }

    if (!modLoaderState.busy) {
      clearModLoaderLog();
    }

    refreshCurrentMenuLayout();
    focusStageShell();
  }

  function openModPatchPicker() {
    if (modLoaderState.busy) {
      return;
    }

    const patchNode = renderer?.optionNodes?.find((node) => {
      const optionIndex = Number(node.dataset.choiceIndex ?? -1);
      return renderer?.optionLayouts?.[optionIndex]?.id === "patch";
    });
    const input = patchNode ? ensureDirectModPatchInput(patchNode) : null;

    if (input instanceof HTMLInputElement) {
      input.click();
    }
  }

  async function submitModLoaderPatch() {
    if (modLoaderState.busy) {
      return;
    }

    if (!modLoaderState.patchFile) {
      triggerModLoaderPatchWarning();
      setModLoaderLoadFeedback("missing_patch", {
        sticky: true,
        flash: true,
      });
      return;
    }

    clearModLoaderLog();
    clearModLoaderPatchWarning();
    setModLoaderBusy(true);
    setModLoaderLoadFeedback("loading", {
      sticky: true,
      flash: false,
    });

    const version = getModLoaderVersion();
    const chapter = getModLoaderChapter().value;

    try {
      const sourceBytes = await fetchProtectedSourceBytes(version, chapter);
      appendModLoaderLog(`Reading patch file: ${modLoaderState.patchFile.name}`);
      const patchBytes = await fileToUint8Array(modLoaderState.patchFile);
      const patchedBlob = await applyModPatch(sourceBytes, patchBytes);
      await stashPatchedGameBlob(chapter, patchedBlob, { setAsDefault: modLoaderState.setAsDefault });
      goToPage(String(chapter) === "s" ? "play/play/index.html" : `play/chapter${chapter}/index.html`);
    } catch (error) {
      const message = error?.message || "Patch failed.";
      setModLoaderBusy(false);

      if (message === "Verification required.") {
        clearModLoaderLoadFeedback();
        window.setTimeout(redirectToVerificationPage, 600);
        return;
      }

      setModLoaderLoadFeedback(isLikelyPatchMismatch(message) ? "mismatch" : "failed", {
        sticky: true,
        flash: true,
      });
    }
  }

  async function checkappowner() {
    try {
      if (!window.ownership_gate?.check_saved_ownership) {
        return null;
      }

      const ownerresult = await window.ownership_gate.check_saved_ownership();
      return ownerresult?.verified === true ? ownerresult : null;
    } catch (error) {
      console.warn("Unable to verify app ownership:", error);
      return null;
    }
  }

  async function requestappstats(ownerresult) {
    const decryptedbundle = ownerresult?.result?.decrypted_bundle ?? null;
    const keysendpoint = window.ownership_gate?.get_keys_endpoint?.() || "";

    if (!window.DRWebStats?.start || !keysendpoint || !decryptedbundle?.raw_key) {
      return null;
    }

    const response = await window.fetch(keysendpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "create_stats_session",
        stats_scope: "app",
        key_id: decryptedbundle.key_id,
        key: decryptedbundle.raw_key,
        steamid: decryptedbundle.steamid,
        appid: decryptedbundle.appid,
        verification_mode: decryptedbundle.verification_mode,
      }),
    });
    const responsetext = await response.text();
    let responsedata = null;

    try {
      responsedata = responsetext ? JSON.parse(responsetext) : {};
    } catch (_parseError) {
      responsedata = {
        ok: false,
        error: responsetext || "The stats service returned an unreadable response.",
      };
    }

    if (!response.ok || !responsedata?.stats_token) {
      throw new Error(responsedata?.error || "Unable to create an app stats session.");
    }

    return responsedata;
  }

  async function starttracking(ownerresult) {
    if (!window.DRWebStats?.start) {
      return;
    }

    const statsconfig = window.drweb_stats_config ?? window.drwebStatsConfig ?? {};

    if (!String(statsconfig.endpoint ?? statsconfig.stats_endpoint ?? "").trim()) {
      return;
    }

    try {
      const statssession = await requestappstats(ownerresult);

      if (!statssession?.stats_token) {
        return;
      }

      window.DRWebStats.start(statssession);
    } catch (error) {
      console.warn("Unable to start app stats:", error);
    }
  }

  function redirectToSetupPage() {
    fadeNode.style.opacity = "1";

    window.setTimeout(() => {
      if (window.ownership_gate?.go_to_page) {
        window.ownership_gate.go_to_page("setup/index.html");
        return;
      }

      goToPage("setup/index.html");
    }, 80);
  }

  function getMenuAudioContext() {
    if (menuAudioContext) {
      return menuAudioContext;
    }

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    menuAudioContext = new AudioContextConstructor();
    return menuAudioContext;
  }

  async function loadMenuSoundBuffer(soundKey) {
    const sound = menuSounds[soundKey];

    if (!sound) {
      return null;
    }

    const audioContext = getMenuAudioContext();

    if (!audioContext) {
      return null;
    }

    if (!sound.bufferPromise) {
      sound.bufferPromise = fetch(sound.path)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unable to fetch ${sound.path}`);
          }

          return response.arrayBuffer();
        })
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer.slice(0)));
    }

    return sound.bufferPromise;
  }

  function primeMenuAudio() {
    for (const soundKey of Object.keys(menuSounds)) {
      loadMenuSoundBuffer(soundKey).catch(() => {});
    }
  }

  function primeMenuImages() {
    for (const imagePath of [offlineModeEnabledIconPath, offlineModeDisabledIconPath, optionHelpIconPath]) {
      try {
        const image = new Image();
        image.decoding = "sync";
        image.src = imagePath;

        if (typeof image.decode === "function") {
          image.decode().catch(() => {});
        }

        preloadedMenuImages.push(image);
      } catch (_imageError) {
      }
    }
  }

  function playFallbackMenuSound(soundKey) {
    const sound = menuSounds[soundKey];

    if (!sound) {
      return;
    }

    try {
      const fallbackNode = sound.fallbackSound.cloneNode();
      fallbackNode.volume = sound.volume;
      fallbackNode.play().catch(() => {});
    } catch (error) {
      console.warn(`Unable to play the ${sound.label} sound:`, error);
    }
  }

  async function playMenuSound(soundKey) {
    const sound = menuSounds[soundKey];

    if (!sound) {
      return;
    }

    try {
      const audioContext = getMenuAudioContext();

      if (!audioContext) {
        playFallbackMenuSound(soundKey);
        return;
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const audioBuffer = await loadMenuSoundBuffer(soundKey);

      if (!audioBuffer) {
        playFallbackMenuSound(soundKey);
        return;
      }

      const sourceNode = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = sound.volume;
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      sourceNode.start(0);
    } catch (error) {
      if (!warnedSoundFallbacks.has(soundKey)) {
        console.warn(`Falling back to HTML audio for the ${sound.label} sound:`, error);
        warnedSoundFallbacks.add(soundKey);
      }

      playFallbackMenuSound(soundKey);
    }
  }

  function playMenuMoveSound() {
    playMenuSound("move");
  }

  function playMenuAcceptSound() {
    playMenuSound("accept");
  }

  function playMenuBackSound() {
    playMenuSound("back");
  }

  function isNintendoGamepad(id) {
    return /nintendo|switch|joy-con|joycon|pro controller/i.test(id || "");
  }

  function readGamepadInput() {
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

      const nintendoLayout = isNintendoGamepad(gamepad.id);
      const confirmIndex = nintendoLayout ? 1 : 0;
      const cancelIndex = nintendoLayout ? 0 : 1;
      const axes = gamepad.axes || [];
      const buttons = gamepad.buttons || [];
      const current = {
        leftHeld: Boolean(buttons[14] && buttons[14].pressed) || axes[0] < -0.5,
        rightHeld: Boolean(buttons[15] && buttons[15].pressed) || axes[0] > 0.5,
        upHeld: Boolean(buttons[12] && buttons[12].pressed) || axes[1] < -0.5,
        downHeld: Boolean(buttons[13] && buttons[13].pressed) || axes[1] > 0.5,
        confirmHeld: Boolean(buttons[confirmIndex] && buttons[confirmIndex].pressed),
        cancelHeld: Boolean(buttons[cancelIndex] && buttons[cancelIndex].pressed),
      };

      const previous = lastGamepadState.get(gamepad.index) || {
        leftHeld: false,
        rightHeld: false,
        upHeld: false,
        downHeld: false,
        confirmHeld: false,
        cancelHeld: false,
      };

      frame.leftPressed ||= current.leftHeld && !previous.leftHeld;
      frame.rightPressed ||= current.rightHeld && !previous.rightHeld;
      frame.upPressed ||= current.upHeld && !previous.upHeld;
      frame.downPressed ||= current.downHeld && !previous.downHeld;
      frame.confirmPressed ||= current.confirmHeld && !previous.confirmHeld;
      frame.cancelPressed ||= current.cancelHeld && !previous.cancelHeld;

      lastGamepadState.set(gamepad.index, current);
    }

    return frame;
  }

  function readInputFrame() {
    const gamepadFrame = readGamepadInput();
    const frame = {
      leftPressed: pressedKeys.left || gamepadFrame.leftPressed,
      rightPressed: pressedKeys.right || gamepadFrame.rightPressed,
      upPressed: pressedKeys.up || gamepadFrame.upPressed,
      downPressed: pressedKeys.down || gamepadFrame.downPressed,
      confirmPressed: pressedKeys.confirm || gamepadFrame.confirmPressed,
      cancelPressed: pressedKeys.cancel || gamepadFrame.cancelPressed,
    };

    pressedKeys.left = false;
    pressedKeys.right = false;
    pressedKeys.up = false;
    pressedKeys.down = false;
    pressedKeys.confirm = false;
    pressedKeys.cancel = false;

    return frame;
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }

    const key = event.key;

    if (matchesDirectionalKey(key, "left")) {
      heldKeys.left = true;
      pressedKeys.left = true;
      event.preventDefault();
    } else if (matchesDirectionalKey(key, "right")) {
      heldKeys.right = true;
      pressedKeys.right = true;
      event.preventDefault();
    } else if (matchesDirectionalKey(key, "up")) {
      heldKeys.up = true;
      pressedKeys.up = true;
      event.preventDefault();
    } else if (matchesDirectionalKey(key, "down")) {
      heldKeys.down = true;
      pressedKeys.down = true;
      event.preventDefault();
    } else if (key === "Enter" || key === "z" || key === "Z") {
      heldKeys.confirm = true;
      pressedKeys.confirm = true;
      event.preventDefault();
    } else if (
      key === "Escape" ||
      key === "Backspace" ||
      key === "Shift" ||
      key === "x" ||
      key === "X"
    ) {
      heldKeys.cancel = true;
      pressedKeys.cancel = true;
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key;

    if (matchesDirectionalKey(key, "left")) {
      heldKeys.left = false;
    } else if (matchesDirectionalKey(key, "right")) {
      heldKeys.right = false;
    } else if (matchesDirectionalKey(key, "up")) {
      heldKeys.up = false;
    } else if (matchesDirectionalKey(key, "down")) {
      heldKeys.down = false;
    } else if (key === "Enter" || key === "z" || key === "Z") {
      heldKeys.confirm = false;
    } else if (
      key === "Escape" ||
      key === "Backspace" ||
      key === "Shift" ||
      key === "x" ||
      key === "X"
    ) {
      heldKeys.cancel = false;
    }
  });

  window.addEventListener("blur", () => {
    heldKeys.left = false;
    heldKeys.right = false;
    heldKeys.up = false;
    heldKeys.down = false;
    heldKeys.confirm = false;
    heldKeys.cancel = false;
    pressedKeys.left = false;
    pressedKeys.right = false;
    pressedKeys.up = false;
    pressedKeys.down = false;
    pressedKeys.confirm = false;
    pressedKeys.cancel = false;
  });

  modPatchInput.addEventListener("change", () => {
    setSelectedModPatchFile(modPatchInput.files?.[0] ?? null);
  });

  logoNode.addEventListener("pointerdown", (event) => {
    if (renderer && renderer.canGoBack()) {
      resetLogoResetTapCounter();
      event.preventDefault();
      renderer.goBack();
      return;
    }

    if (renderer?.currentMenuId !== "main") {
      resetLogoResetTapCounter();
      return;
    }

    event.preventDefault();
    logoResetTapCount += 1;

    if (logoResetTapTimerId) {
      window.clearTimeout(logoResetTapTimerId);
    }

    logoResetTapTimerId = window.setTimeout(resetLogoResetTapCounter, 1500);

    if (logoResetTapCount >= 3) {
      resetLogoResetTapCounter();
      void promptResetAllDataExceptVerification();
    }
  });

  let optionHelpOverlayNode = null;
  let optionHelpOverlayCopyNode = null;
  let optionHelpOverlayActive = false;

  function ensureOptionHelpOverlay() {
    if (optionHelpOverlayNode) {
      return optionHelpOverlayNode;
    }

    optionHelpOverlayNode = document.createElement("section");
    optionHelpOverlayNode.id = "option-help-overlay";
    optionHelpOverlayNode.hidden = true;
    optionHelpOverlayNode.setAttribute("role", "dialog");
    optionHelpOverlayNode.setAttribute("aria-modal", "true");
    optionHelpOverlayNode.setAttribute("aria-live", "polite");
    optionHelpOverlayNode.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      hideOptionHelpOverlay();
      playMenuBackSound();
    });

    const cardNode = document.createElement("section");
    cardNode.id = "option-help-card";

    optionHelpOverlayCopyNode = document.createElement("p");
    optionHelpOverlayCopyNode.id = "option-help-copy";

    cardNode.appendChild(optionHelpOverlayCopyNode);
    optionHelpOverlayNode.appendChild(cardNode);
    stageShell.appendChild(optionHelpOverlayNode);
    return optionHelpOverlayNode;
  }

  function applyOptionHelpOverlayClass(helpInfo) {
    if (!optionHelpOverlayNode) {
      return;
    }

    optionHelpOverlayNode.classList.remove(
      "is-offline-mode-help",
      "is-audio-caching-help",
      "is-auto-boot-help",
      "is-game-border-help",
    );

    if (helpInfo?.className) {
      optionHelpOverlayNode.classList.add(helpInfo.className);
    }
  }

  function showOptionHelpOverlay(helpInfo) {
    const overlayNode = ensureOptionHelpOverlay();
    const normalizedHelpInfo = typeof helpInfo === "object" && helpInfo
      ? helpInfo
      : { copy: String(helpInfo || ""), className: "" };
    optionHelpOverlayCopyNode.textContent = String(normalizedHelpInfo.copy || "");
    applyOptionHelpOverlayClass(normalizedHelpInfo);
    overlayNode.hidden = false;
    optionHelpOverlayActive = true;
  }

  function hideOptionHelpOverlay() {
    if (!optionHelpOverlayActive) {
      return false;
    }

    optionHelpOverlayActive = false;
    if (optionHelpOverlayNode) {
      optionHelpOverlayNode.hidden = true;
    }
    return true;
  }

  class AppMenuRenderer {
    constructor() {
      this.optionNodes = [];
      this.menuHistory = [];
      this.currentMenuId = "main";
      this.menu = menuMap.main;
      this.optionLayouts = [];
      this.selectedIndex = 0;
      this.lastTappedOption = -1;
      this.fadeAlpha = 1;
      this.soulX = 0;
      this.soulY = 0;
      this.lastTimestamp = 0;
      this.lastRectWidth = 0;
      this.lastRectHeight = 0;
      this.setMenu("main", true);
      requestAnimationFrame((timestamp) => this.frame(timestamp));
    }

    canGoBack() {
      return this.menuHistory.length > 0;
    }

    buildOptionLayouts(menu) {
      let currentY = menu.optionTopY;
      const layouts = [];

      for (const item of menu.items) {
        const height = item.type === "image"
          ? (item.imageHeight ?? Math.round((item.imageWidth ?? 160) * drLogoRatio))
          : optionLineHeight;
        const isModLoaderDefaultSideOption = this.currentMenuId === "mod_loader"
          && (item.id === "set_default" || item.id === "clear_default");
        const modLoaderDefaultColumnX = menu.optionX + 185;
        const modLoaderDefaultRowY = menu.optionTopY + (item.id === "clear_default" ? Math.round(optionLineHeight * 0.72) + 4 : 0);
        const itemX = isModLoaderDefaultSideOption
          ? modLoaderDefaultColumnX
          : (item.x ?? menu.optionX);
        const itemY = isModLoaderDefaultSideOption ? modLoaderDefaultRowY : currentY;

        if (this.currentMenuId === "options" && item.helpText) {
          layouts.push({
            type: "help",
            id: `${item.id}_help`,
            parentOptionId: item.id,
            helpText: item.helpText,
            imageSrc: optionHelpIconPath,
            imageAlt: "Help",
            x: itemX - soulWidth - soulGap - optionHelpIconSize - optionHelpIconGap - 4,
            y: currentY + 3,
            height: optionHelpIconSize,
            width: optionHelpIconSize,
            gridRow: layouts.filter((layout) => layout.type === "help").length,
            gridColumn: 0,
          });
        }

        layouts.push({
          ...item,
          x: itemX,
          y: itemY,
          height,
          width: item.type === "image" ? (item.imageWidth ?? 160) : null,
          gridRow: this.currentMenuId === "options" && item.helpText
            ? layouts.filter((layout) => layout.type === "help").length - 1
            : (this.currentMenuId === "mod_loader" && ["version", "set_default"].includes(item.id)
              ? 0
              : (this.currentMenuId === "mod_loader" && ["chapter", "clear_default"].includes(item.id) ? 1 : null)),
          gridColumn: this.currentMenuId === "options" && item.helpText
            ? 1
            : (this.currentMenuId === "mod_loader" && ["version", "chapter"].includes(item.id)
              ? 0
              : (this.currentMenuId === "mod_loader" && ["set_default", "clear_default"].includes(item.id) ? 1 : null)),
        });

        if (!isModLoaderDefaultSideOption) {
          currentY += height + (item.gapAfter ?? menu.optionGap);
        }
      }

      return layouts;
    }

    setMenu(menuId, snapSoul = false, preferredIndex = 0) {
      const nextMenu = menuMap[menuId];

      if (!nextMenu) {
        return;
      }

      this.currentMenuId = menuId;
      this.menu = nextMenu;
      this.optionLayouts = this.buildOptionLayouts(nextMenu);
      const normalizedPreferredIndex = Math.max(0, Math.min(Number(preferredIndex) || 0, this.optionLayouts.length - 1));
      const optionsDefaultIndex = menuId === "options" && normalizedPreferredIndex === 0
        ? this.optionLayouts.findIndex((option) => option.id === "offline_mode")
        : -1;
      const preferredEnabledIndex = this.findNearestEnabledIndex(
        optionsDefaultIndex >= 0 ? optionsDefaultIndex : normalizedPreferredIndex,
      );
      this.selectedIndex = preferredEnabledIndex >= 0 ? preferredEnabledIndex : 0;
      this.lastTappedOption = -1;
      this.syncOptionNodes();
      updateAppPanel(nextMenu);

      const target = this.getSoulTarget(this.selectedIndex);

      if (snapSoul || !Number.isFinite(this.soulX) || !Number.isFinite(this.soulY)) {
        this.soulX = target.x;
        this.soulY = target.y;
      }

      this.updateLogoBackState();
      this.applyLayout(true);

      if (menuId === "mod_loader") {
        if (!modLoaderState.busy) {
          clearModLoaderLoadFeedback();
        }

        if (!modLoaderState.busy) {
          clearModLoaderLog();
        }

        warmModLoaderHelper();
      }
    }

    openMenu(menuId) {
      this.menuHistory.push({
        menuId: this.currentMenuId,
        returnIndex: this.selectedIndex,
      });
      this.setMenu(menuId);
    }

    goBack() {
      if (this.currentMenuId === "mod_loader" && modLoaderState.busy) {
        return false;
      }

      if (!this.canGoBack()) {
        return false;
      }

      playMenuBackSound();
      const previousMenuState = this.menuHistory.pop();
      const previousMenuId = typeof previousMenuState === "string"
        ? previousMenuState
        : previousMenuState?.menuId;
      const previousMenuIndex = typeof previousMenuState === "string"
        ? 0
        : previousMenuState?.returnIndex;
      this.setMenu(previousMenuId, false, previousMenuIndex);
      return true;
    }

    updateLogoBackState() {
      logoNode.style.cursor = this.canGoBack() ? "pointer" : "default";
    }

    isOptionDisabled(index) {
      const option = this.optionLayouts[index];

      if (!option) {
        return true;
      }

      if (typeof option.disabled === "function") {
        return option.disabled() === true;
      }

      return option.disabled === true;
    }

    setSelectedIndex(index, shouldPlaySound = true) {
      const optionCount = this.optionLayouts.length;

      if (optionCount <= 0) {
        return;
      }

      let nextIndex = Math.max(0, Math.min(index, optionCount - 1));
      const previousOptionId = this.optionLayouts[this.selectedIndex]?.id ?? null;

      if (this.isOptionDisabled(nextIndex)) {
        const fallbackIndex = this.findNearestEnabledIndex(nextIndex);

        if (fallbackIndex < 0) {
          return;
        }

        nextIndex = fallbackIndex;
      }

      if (nextIndex === this.selectedIndex) {
        return;
      }

      const nextOptionId = this.optionLayouts[nextIndex]?.id ?? null;

      if (previousOptionId === "load" && nextOptionId !== "load" && !modLoaderState.busy) {
        clearModLoaderLoadFeedback();
      }

      this.selectedIndex = nextIndex;
      this.lastTappedOption = -1;

      if (shouldPlaySound) {
        playMenuMoveSound();
      }
    }

    findNearestEnabledIndex(preferredIndex, step = 1) {
      const optionCount = this.optionLayouts.length;

      if (optionCount <= 0) {
        return -1;
      }

      for (let offset = 0; offset < optionCount; offset += 1) {
        const candidateIndex = (preferredIndex + (offset * step) + optionCount) % optionCount;

        if (!this.isOptionDisabled(candidateIndex)) {
          return candidateIndex;
        }
      }

      return -1;
    }

    syncOptionNodes() {
      while (this.optionNodes.length < this.optionLayouts.length) {
        const node = document.createElement("div");
        node.className = "choice-option";
        node.addEventListener("pointerenter", (event) => {
          const optionIndex = Number(event.currentTarget.dataset.choiceIndex ?? -1);
          if (optionIndex >= 0 && event.pointerType !== "touch" && !this.isOptionDisabled(optionIndex)) {
            this.setSelectedIndex(optionIndex);
          }
        });
        node.addEventListener("pointermove", (event) => {
          const optionIndex = Number(event.currentTarget.dataset.choiceIndex ?? -1);
          if (optionIndex >= 0 && event.pointerType !== "touch" && !this.isOptionDisabled(optionIndex)) {
            this.setSelectedIndex(optionIndex);
          }
        });
        node.addEventListener("pointerdown", (event) => {
          const optionIndex = Number(event.currentTarget.dataset.choiceIndex ?? -1);
          if (optionIndex < 0 || this.isOptionDisabled(optionIndex)) {
            return;
          }

          if (event.pointerType === "touch") {
            const touchedOption = this.optionLayouts[optionIndex];
            if (touchedOption?.id === "patch" && this.currentMenuId === "mod_loader") {
              this.setSelectedIndex(optionIndex);
              this.lastTappedOption = -1;
              return;
            }

            event.preventDefault();

            if (this.selectedIndex === optionIndex) {
              this.confirmSelected();
              this.lastTappedOption = -1;
              return;
            }

            this.setSelectedIndex(optionIndex);
            this.lastTappedOption = -1;
            return;
          }

          this.setSelectedIndex(optionIndex);
          this.confirmSelected();
        });
        choiceOverlay.appendChild(node);
        this.optionNodes.push(node);
      }

      while (this.optionNodes.length > this.optionLayouts.length) {
        const node = this.optionNodes.pop();
        node.remove();
      }
    }

    getSoulTarget(index) {
      const option = this.optionLayouts[Math.max(0, Math.min(index, this.optionLayouts.length - 1))];
      const targetHeight = option.type === "image" || option.type === "help" ? option.height : optionFontSize;

      return {
        x: option.x - soulWidth - soulGap,
        y: option.y + Math.round((targetHeight - soulHeight) / 2),
      };
    }

    moveSelection(delta) {
      const optionCount = this.optionLayouts.length;

      if (optionCount <= 0) {
        return;
      }

      const step = delta >= 0 ? 1 : -1;
      let candidateIndex = this.selectedIndex;

      for (let attempts = 0; attempts < optionCount; attempts += 1) {
        candidateIndex = (candidateIndex + step + optionCount) % optionCount;

        if (!this.isOptionDisabled(candidateIndex)) {
          this.setSelectedIndex(candidateIndex);
          return;
        }
      }
    }

    findOptionsGridIndex(row, column) {
      return this.optionLayouts.findIndex((option) => option.gridRow === row && option.gridColumn === column);
    }

    moveGridSelection(direction) {
      if (this.currentMenuId !== "options" && this.currentMenuId !== "mod_loader") {
        return false;
      }

      const selectedOption = this.optionLayouts[this.selectedIndex];
      if (!selectedOption || !Number.isFinite(selectedOption.gridRow) || !Number.isFinite(selectedOption.gridColumn)) {
        return false;
      }

      let nextRow = selectedOption.gridRow;
      let nextColumn = selectedOption.gridColumn;

      if (direction === "left") {
        if (selectedOption.gridColumn !== 1) {
          return false;
        }
        nextColumn = 0;
      } else if (direction === "right") {
        if (selectedOption.gridColumn !== 0) {
          return false;
        }
        nextColumn = 1;
      } else if (direction === "up" || direction === "down") {
        const rows = this.optionLayouts
          .map((option) => option.gridRow)
          .filter((row) => Number.isFinite(row));
        const maxRow = rows.length > 0 ? Math.max(...rows) : selectedOption.gridRow;
        nextRow = direction === "up"
          ? (selectedOption.gridRow - 1 + maxRow + 1) % (maxRow + 1)
          : (selectedOption.gridRow + 1) % (maxRow + 1);
      } else {
        return false;
      }

      const nextIndex = this.findOptionsGridIndex(nextRow, nextColumn);
      if (nextIndex < 0 || this.isOptionDisabled(nextIndex)) {
        return false;
      }

      this.setSelectedIndex(nextIndex);
      return true;
    }

    handleDirectionalInput(direction) {
      const selectedOption = this.optionLayouts[this.selectedIndex];

      if (this.currentMenuId === "mod_loader" && modLoaderState.busy) {
        return;
      }

      if (this.currentMenuId === "options") {
        if (direction === "up" || direction === "down" || selectedOption?.type === "help" || direction === "left") {
          if (this.moveGridSelection(direction)) {
            return;
          }
        }
      }

      if (this.currentMenuId === "mod_loader" && Number.isFinite(selectedOption?.gridRow)) {
        const shouldUseModGrid = selectedOption.id === "set_default"
          || selectedOption.id === "clear_default"
          || direction === "left"
          || direction === "right";
        if (shouldUseModGrid && this.moveGridSelection(direction)) {
          return;
        }
      }

      if ((direction === "left" || direction === "right") && typeof selectedOption?.onAdjust === "function") {
        const changed = selectedOption.onAdjust(direction === "left" ? -1 : 1);

        if (changed) {
          playMenuMoveSound();
        }

        return;
      }

      if (direction === "left" || direction === "up") {
        this.moveSelection(-1);
        return;
      }

      if (direction === "right" || direction === "down") {
        this.moveSelection(1);
      }
    }

    confirmSelected() {
      const selectedOption = this.optionLayouts[this.selectedIndex];

      if (!selectedOption) {
        return;
      }

      if (this.currentMenuId === "mod_loader" && modLoaderState.busy) {
        return;
      }

      if (this.isOptionDisabled(this.selectedIndex)) {
        return;
      }

      playMenuAcceptSound();

      if (selectedOption.type === "help") {
        showOptionHelpOverlay(selectedOption.helpText);
        return;
      }

      if (selectedOption.nextMenu) {
        this.openMenu(selectedOption.nextMenu);
        return;
      }

      if (selectedOption.goToPage) {
        goToPage(selectedOption.goToPage);
        return;
      }

      if (selectedOption.onConfirm) {
        selectedOption.onConfirm();
      }
    }

    frame(timestamp) {
      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
      }

      const deltaFrames = (timestamp - this.lastTimestamp) / (1000 / 30);
      this.lastTimestamp = timestamp;
      this.update(deltaFrames);
      this.applyLayout();
      requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp));
    }

    update(deltaFrames) {
      const inputFrame = readInputFrame();

      if (optionHelpOverlayActive) {
        if (inputFrame.confirmPressed || inputFrame.cancelPressed) {
          hideOptionHelpOverlay();
          playMenuBackSound();
        }
        return;
      }

      if (handleModFileChangerInputFrame(inputFrame)) {
        return;
      }

      if (inputFrame.cancelPressed && !(this.currentMenuId === "mod_loader" && modLoaderState.busy)) {
        this.goBack();
      }

      if (inputFrame.leftPressed) {
        this.handleDirectionalInput("left");
      }

      if (inputFrame.rightPressed) {
        this.handleDirectionalInput("right");
      }

      if (inputFrame.upPressed) {
        this.handleDirectionalInput("up");
      }

      if (inputFrame.downPressed) {
        this.handleDirectionalInput("down");
      }

      if (inputFrame.confirmPressed) {
        this.confirmSelected();
      }

      this.fadeAlpha = Math.max(0, this.fadeAlpha - (deltaFrames / fadeInFrames));
      updatemarquee(deltaFrames, currentMarqueeMessage.length > 0);

      const target = this.getSoulTarget(this.selectedIndex);

      if (Math.abs(target.x - this.soulX) <= 1) {
        this.soulX = target.x;
      } else {
        this.soulX += (target.x - this.soulX) * Math.min(1, soulEase * deltaFrames);
      }

      if (Math.abs(target.y - this.soulY) <= 1) {
        this.soulY = target.y;
      } else {
        this.soulY += (target.y - this.soulY) * Math.min(1, soulEase * deltaFrames);
      }
    }

    applyLayout(force = false) {
      const rect = stageShell.getBoundingClientRect();
      const scaleX = rect.width / stageWidth;
      const scaleY = rect.height / stageHeight;
      const scaledFontSize = Math.max(1, Math.round(optionFontSize * scaleY));
      const uiZoom = getAppUiZoom();
      const scaledMarqueeFontSize = Math.round(
        Math.max(8, Math.min(18, scaledFontSize * uiZoom * (marqueeFontSize / optionFontSize) * 0.74)),
      );
      const scaledMarqueeHeight = Math.max(15, Math.round(scaledMarqueeFontSize * (marqueeHeight / marqueeFontSize)));
      const scaledMarqueePadding = Math.max(5, Math.round(7 * scaleX));
      const scaledMarqueeBorderWidth = 1;
      const runtimeFooterFontSize = Math.round(
        Math.max(11, Math.min(42, scaledFontSize * uiZoom * (16 / optionFontSize))),
      );
      currentMarqueeFontSizePx = scaledMarqueeFontSize;

      if (force || rect.width !== this.lastRectWidth || rect.height !== this.lastRectHeight) {
        this.lastRectWidth = rect.width;
        this.lastRectHeight = rect.height;

        logoNode.style.width = `${Math.round(logoWidth * scaleX)}px`;
        logoNode.style.left = `${Math.round(logoX * scaleX)}px`;
        logoNode.style.top = `${Math.round(logoY * scaleY)}px`;
        logoNode.style.transform = "translateX(-50%)";

        if (marqueeNode) {
          marqueeNode.style.width = `${Math.round(marqueeWidth * scaleX)}px`;
          marqueeNode.style.height = `${scaledMarqueeHeight}px`;
          marqueeNode.style.left = `${Math.round(logoX * scaleX)}px`;
          marqueeNode.style.top = `${Math.round(marqueeY * scaleY)}px`;
          marqueeNode.style.padding = `0 ${scaledMarqueePadding}px`;
          marqueeNode.style.borderWidth = `${scaledMarqueeBorderWidth}px`;
          marqueeNode.style.fontSize = `${scaledMarqueeFontSize}px`;
          marqueeNode.style.transform = "translateX(-50%)";
        }

        soulNode.style.width = `${Math.round(soulWidth * scaleX)}px`;
        soulNode.style.height = `${Math.round(soulHeight * scaleY)}px`;

        if (runtimeFooterNode) {
          runtimeFooterNode.style.right = `${Math.round(Math.max(14, 24 * scaleX))}px`;
          runtimeFooterNode.style.bottom = `${Math.round(Math.max(10, 18 * scaleY))}px`;
          runtimeFooterNode.style.fontSize = `${runtimeFooterFontSize}px`;
        }
      }

      soulNode.style.left = `${Math.round(this.soulX * scaleX)}px`;
      soulNode.style.top = `${Math.round(this.soulY * scaleY)}px`;
      fadeNode.style.opacity = `${this.fadeAlpha}`;

      if (runtimeFooterNode) {
        runtimeFooterNode.style.opacity = `${1 - this.fadeAlpha}`;
      }

      if (marqueeNode) {
        const shouldShowMarquee = currentMarqueeMessage.length > 0;
        marqueeNode.style.opacity = shouldShowMarquee ? `${1 - this.fadeAlpha}` : "0";

        if (shouldShowMarquee) {
          syncmarqueeanimation();
        }
      }

      for (let index = 0; index < this.optionLayouts.length; index += 1) {
        const option = this.optionLayouts[index];
        const node = this.optionNodes[index];
        const isImage = option.type === "image";
        const isHelp = option.type === "help";
        const isDisabled = this.isOptionDisabled(index);
        const optionWarningState = getModLoaderOptionWarningState(option.id);
        node.dataset.choiceIndex = String(index);
        node.classList.toggle("is-selected", index === this.selectedIndex);
        node.classList.toggle("is-image", isImage);
        node.classList.toggle("is-help", isHelp);
        node.classList.toggle("is-disabled", isDisabled);
        const optionTint = typeof option.tint === "function" ? option.tint() : option.tint;
        node.classList.toggle("is-warning", optionWarningState.warning);
        node.classList.toggle("is-warning-flash", optionWarningState.flash);
        node.classList.toggle("is-blue", optionTint === "blue");
        node.classList.toggle("is-small", option.small === true);
        node.style.left = `${Math.round(option.x * scaleX)}px`;
        node.style.top = `${Math.round(option.y * scaleY)}px`;
        node.style.fontSize = `${Math.round((option.small === true ? scaledFontSize * 0.72 : scaledFontSize))}px`;
        syncDirectModPatchInput(node, option);

        if (isImage || isHelp) {
          let imageNode = node.querySelector("img");

          if (!imageNode) {
            node.textContent = "";
            imageNode = document.createElement("img");
            node.appendChild(imageNode);
          }

          imageNode.src = option.imageSrc;
          imageNode.alt = option.imageAlt ?? "";
          node.style.width = `${Math.round((option.width ?? 160) * scaleX)}px`;
          node.style.height = isHelp ? `${Math.round((option.height ?? optionHelpIconSize) * scaleY)}px` : "";
        } else {
          const optionLabel = typeof option.label === "function" ? option.label() : option.label;
          const optionStatusImageSrc = typeof option.statusImageSrc === "function"
            ? option.statusImageSrc()
            : option.statusImageSrc;
          const optionStatusImageAlt = typeof option.statusImageAlt === "function"
            ? option.statusImageAlt()
            : option.statusImageAlt;
          const optionStatusEnabled = Boolean(optionStatusImageSrc);
          const optionStatusWrapper = node.querySelector(".choice-option-inner");
          const optionStatusImageNode = node.querySelector(".choice-option-status");
          const optionStatusLabelNode = node.querySelector(".choice-option-label");

          node.style.width = "";
          node.style.height = "";
          node.classList.toggle("has-status", optionStatusEnabled);

          if (optionStatusEnabled) {
            let statusWrapper = optionStatusWrapper;
            let statusLabelNode = optionStatusLabelNode;
            let statusImageNode = optionStatusImageNode;

            if (!statusWrapper || !statusLabelNode || !statusImageNode) {
              node.textContent = "";
              statusWrapper = document.createElement("span");
              statusWrapper.className = "choice-option-inner";
              statusLabelNode = document.createElement("span");
              statusLabelNode.className = "choice-option-label";
              statusImageNode = document.createElement("img");
              statusImageNode.className = "choice-option-status";
              statusWrapper.appendChild(statusLabelNode);
              statusWrapper.appendChild(statusImageNode);
              node.appendChild(statusWrapper);
            }

            if (statusLabelNode.textContent !== optionLabel) {
              statusLabelNode.textContent = optionLabel;
            }

            if (statusImageNode.getAttribute("src") !== optionStatusImageSrc) {
              statusImageNode.setAttribute("src", optionStatusImageSrc);
            }

            statusImageNode.alt = optionStatusImageAlt ?? "";
            statusImageNode.classList.toggle("is-mark", /(?:^|\/)mark\.png(?:[?#].*)?$/i.test(String(optionStatusImageSrc || "")));
            statusImageNode.classList.toggle("is-cross", /(?:^|\/)cross\.png(?:[?#].*)?$/i.test(String(optionStatusImageSrc || "")));
          } else {
            const imageNode = node.querySelector("img");

            if (optionStatusWrapper) {
              optionStatusWrapper.remove();
            }

            if (imageNode) {
              imageNode.remove();
            }

            if (node.textContent !== optionLabel) {
              node.textContent = optionLabel;
            }
          }
        }
      }

      syncModLoaderPanelLog();
    }
  }

  function buildAppMenuDebug() {
    return {
      state() {
        if (!renderer) {
          return {
            ready: false,
          };
        }

        return {
          ready: true,
          currentMenuId: renderer.currentMenuId,
          selectedIndex: renderer.selectedIndex,
          canGoBack: renderer.canGoBack(),
          options: renderer.optionLayouts.map((option, index) => ({
            index,
            label: (typeof option.label === "function" ? option.label() : option.label) ?? option.imageAlt ?? option.type,
            type: option.type,
          })),
        };
      },
      open(menuId) {
        if (renderer) {
          renderer.openMenu(menuId);
        }

        return this.state();
      },
      back() {
        if (renderer) {
          renderer.goBack();
        }

        return this.state();
      },
      select(index) {
        if (renderer) {
          renderer.setSelectedIndex(Number(index) || 0);
        }

        return this.state();
      },
      confirm() {
        if (renderer) {
          renderer.confirmSelected();
        }

        return this.state();
      },
    };
  }

  function buildOfflineModeDebug() {
    return {
      mark() {
        setofflinemodevisualoverride("mark");
        return {
          visual: "mark",
          actual: isofflinemodeenabled(),
        };
      },
      cross() {
        setofflinemodevisualoverride("cross");
        return {
          visual: "cross",
          actual: isofflinemodeenabled(),
        };
      },
      clear() {
        setofflinemodevisualoverride("");
        return {
          visual: isofflinemodeactivevisual() ? "mark" : "cross",
          actual: isofflinemodeenabled(),
        };
      },
      state() {
        return {
          visualOverride: readofflinemodevisualoverride() || null,
          visual: isofflinemodeactivevisual() ? "mark" : "cross",
          actual: isofflinemodeenabled(),
          cachePresent: offlinemodecachepresent,
        };
      },
    };
  }

  function publishOfflineModeDebug(debugApi) {
    window.OfflineModeDebug = debugApi;
    window.offlineModeDebug = debugApi;

    try {
      if (window.parent && window.parent !== window) {
        window.parent.OfflineModeDebug = debugApi;
        window.parent.offlineModeDebug = debugApi;
      }
    } catch (_parentError) {
    }
  }

  async function bootstrapAppMenu() {
    const ownerresult = await checkappowner();

    if (!ownerresult?.verified) {
      redirectToSetupPage();
      return;
    }

    await syncofflinemodecacheavailability();
    rememberAppPage();
    primeMenuAudio();
    primeMenuImages();
    renderer = new AppMenuRenderer();
    window.AppMenu = renderer;
    window.app_menu = renderer;
    starttracking(ownerresult);
  }

  window.AppMenuDebug = buildAppMenuDebug();
  window.app_menu_debug = window.AppMenuDebug;
  publishOfflineModeDebug(buildOfflineModeDebug());
  updateRuntimeFooter();
  window.addEventListener("online", () => {
    updateRuntimeFooter().catch(() => {});
  });
  window.addEventListener("offline", () => {
    updateRuntimeFooter().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      updateRuntimeFooter().catch(() => {});
    }
  });
  window.addEventListener("focus", () => {
    updateRuntimeFooter().catch(() => {});
  });
  window.setInterval(() => {
    if (document.visibilityState !== "hidden") {
      updateRuntimeFooter().catch(() => {});
    }
  }, runtimeStatusRefreshIntervalMs);
  if (document.fonts?.ready) {
    document.fonts.ready
      .then(() => {
        lastMarqueeLayoutSignature = "";
        refreshCurrentMenuLayout();
      })
      .catch(() => {
      });
  }
  loadmarqueemessages()
    .then((messages) => {
      setmarqueemessage(pickmarqueemessage(messages));
    })
    .catch((error) => {
      console.warn("Unable to prepare the marquee message:", error);
    });
  window.addEventListener("pageshow", () => {
    syncofflinemodecacheavailability().catch(() => {});
  });
  window.addEventListener("focus", () => {
    syncofflinemodecacheavailability().catch(() => {});
  });
  window.addEventListener("storage", (event) => {
    if (event.key === gameBorderStorageKey) {
      refreshCurrentMenuLayout();
    }
  });
  bootstrapAppMenu();
})();
