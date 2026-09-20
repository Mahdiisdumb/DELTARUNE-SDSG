(function initOfflineModePage() {
  const offlineModeStorageKey = "offlineModeEnabled";
  const offlineModeDownloadStorageKey = "dr-play-offline-download-active-v1";
  const offlineProtectedChecksumIndexStorageKey = "dr-play-offline-protected-checksums-v1";
  const defaultKeysEndpoint = `${window.location.origin}/keys`;
  const offlineShellCacheName = "offline";
  const offlineAssetCacheName = "base";
  const offlineShellChecksumsPath = "./checksums.json";
  const offlineShellProgressShare = 0.035;
  const maxAttemptsPerItem = 3;
  const retryDelayMs = 800;
  const autoReturnDelayMs = 1400;
  const md5ShiftAmounts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const md5Table = Array.from({ length: 64 }, (_entry, index) => (
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
  ));
  const enableWarningCopy = `Offline Mode downloads all game assets in order to let you play offline or to give you a more seamless experience when playing by having the assets already downloaded to your device to drastically speed up loading times!

DELTARUNE (not including the Mod Loader) is ~862MB. By enabling Offline Mode, you will not be able to receive any more patches or updates until you disable Offline Mode, however you can always re-enable it to play the updated version offline!`;
  const skippedManifestFiles = new Set(["index.html", "runner-sw.js", "sw.js", "runner.json"]);
  const offlineScopePlans = [
    {
      play_scope: "play",
      label: "Chapter Select",
      manifest_url: "../../play/play/index.html",
    },
    {
      play_scope: "chapter1",
      label: "Chapter 1",
      manifest_url: "../../play/chapter1/index.html",
    },
    {
      play_scope: "chapter2",
      label: "Chapter 2",
      manifest_url: "../../play/chapter2/index.html",
    },
    {
      play_scope: "chapter3",
      label: "Chapter 3",
      manifest_url: "../../play/chapter3/index.html",
    },
    {
      play_scope: "chapter4",
      label: "Chapter 4",
      manifest_url: "../../play/chapter4/index.html",
    },
    {
      play_scope: "chapter5",
      label: "Chapter 5",
      manifest_url: "../../play/chapter5/index.html",
    },
    {
      play_scope: "rush",
      label: "Boss Rush",
      manifest_url: "../../play/rush/index.html",
    },
  ];
  const offlineShellPaths = Array.from(new Set([
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/sw.js",
    "/app/",
    "/app/index.html",
    "/app/styles.css",
    "/app/script.js",
    "/app/logo.png",
    "/app/marquee.txt",
    "/app/assets/menu_soul.png",
    "/app/assets/menu_move.wav",
    "/app/assets/menu_accept.wav",
    "/app/assets/menu_back.wav",
    "/app/assets/mark.png",
    "/app/assets/cross.png",
    "/play/common/borders/border_dw_blue.png",
    "/play/common/borders/border_dw_castle_cafe.png",
    "/play/common/borders/border_dw_castle_left.png",
    "/play/common/borders/border_dw_castle_right.png",
    "/play/common/borders/border_dw_castle_right_gold.png",
    "/play/common/borders/border_dw_castle_top.png",
    "/play/common/borders/border_dw_garden.png",
    "/play/common/borders/border_dw_garden_cliff.png",
    "/play/common/borders/border_dw_garden_cliff_bottom.png",
    "/play/common/borders/border_dw_garden_cliff_bottom_frame.png",
    "/play/common/borders/border_dw_garden_cliff_frame.png",
    "/play/common/borders/border_dw_garden_cliff_lattice.png",
    "/play/common/borders/border_dw_garden_cliff_lattice_bottom.png",
    "/play/common/borders/border_dw_pink.png",
    "/play/common/borders/border_dw_pink_alt.png",
    "/play/common/borders/border_lw_town_morning.png",
    "/play/common/borders/border_lw_town_sunset.png",
    "/play/common/borders/border_dw_blue_light.png",
    "/play/common/borders/border_dw_blue_stars.png",
    "/play/common/borders/border_dw_castletown.png",
    "/play/common/borders/border_dw_church_a.png",
    "/play/common/borders/border_dw_church_b.png",
    "/play/common/borders/border_dw_church_c.png",
    "/play/common/borders/border_dw_city.png",
    "/play/common/borders/border_dw_cyber.png",
    "/play/common/borders/border_dw_green_room.png",
    "/play/common/borders/border_dw_green_sloppy.png",
    "/play/common/borders/border_dw_green_sloppy_z.png",
    "/play/common/borders/border_dw_mansion.png",
    "/play/common/borders/border_dw_red_smiles.png",
    "/play/common/borders/border_dw_teevie.png",
    "/play/common/borders/border_dw_titan_base.png",
    "/play/common/borders/border_dw_titan_eyes.png",
    "/play/common/borders/border_dw_titan_eyes_red.png",
    "/play/common/borders/border_dw_tv_black.png",
    "/play/common/borders/border_dw_tv_blue.png",
    "/play/common/borders/border_dw_tv_meta.png",
    "/play/common/borders/border_dw_word.png",
    "/play/common/borders/border_line_1080.png",
    "/play/common/borders/border_lw_town.png",
    "/play/common/borders/border_lw_town_night.png",
    "/app/offline/",
    "/app/offline/index.html",
    "/app/offline/loader-frame.html",
    "/app/offline/loader.css",
    "/app/offline/loader.js",
    "/app/offline/styles.css",
    "/app/offline/script.js",
    "/verif/",
    "/verif/index.html",
    "/verif/styles.css",
    "/verif/script.js",
    "/verif/steamverif.js",
    "/setup/",
    "/setup/index.html",
    "/setup/styles.css",
    "/setup/script.js",
    "/setup/savetransfer.js",
    "/setup/savecodec.js",
    "/setup/logo.png",
    "/setup/assets/image_soul_blur.png",
    "/shared/fonts.css",
    "/shared/8bitoperator.otf",
    "/shared/8bitOperatorPlus-Bold.ttf",
    "/shared/gate.js",
    "/shared/stats-config.js",
    "/shared/stats.js",

    "/play/fav.ico",

    "/play/chapters.css",

    "/play/jszip.min.js",

    "/play/vine.js",

    "/play/mobile.js",

    "/play/joy.js",

    "/play/play/",

    "/play/play/index.html",

    "/play/play/fav.ico",

    "/play/play/loader.css",

    "/play/play/loader.js",

    "/play/chapter1/",

    "/play/chapter1/index.html",

    "/play/chapter2/",

    "/play/chapter2/index.html",

    "/play/chapter3/",

    "/play/chapter3/index.html",

    "/play/chapter4/",

    "/play/chapter4/index.html",

    "/play/chapter5/",

    "/play/chapter5/index.html",

    "/play/rush/",

    "/play/rush/index.html",

    "/play/spr/tobyload.gif",

    "/play/spr/z.svg",

    "/play/spr/z_pressed.svg",

    "/play/spr/x.svg",

    "/play/spr/x_pressed.svg",

    "/play/spr/c.svg",

    "/play/spr/c_pressed.svg",

    "/play/spr/dpad_up.svg",

    "/play/spr/dpad_up-pressed.svg",

    "/play/spr/dpad_down.svg",

    "/play/spr/dpad_down-pressed.svg",

    "/play/spr/dpad_left.svg",

    "/play/spr/dpad_left-pressed.svg",

    "/play/spr/dpad_right.svg",

    "/play/spr/dpad_right-pressed.svg",
  ]));

  const warningScreen = document.getElementById("offline-warning-screen");
  const offlineShell = document.getElementById("offline-shell");
  const warningCopyNode = document.getElementById("offline-warning-copy");
  const warningYesButton = document.getElementById("offline-choice-yes");
  const warningNoButton = document.getElementById("offline-choice-no");
  const warningThirdButton = document.getElementById("offline-choice-third");
  const downloadScreen = document.getElementById("offline-download-screen");
  const loaderFrameNode = document.getElementById("offline-loader-frame");
  const resultScreen = document.getElementById("offline-result-screen");
  const resultTitleNode = document.getElementById("offline-result-title");
  const resultCopyNode = document.getElementById("offline-result-copy");
  const resultPrimaryButton = document.getElementById("offline-result-primary");
  const resultSecondaryButton = document.getElementById("offline-result-secondary");
  const activeOfflineSessionScopes = new Set();

  const state = {
    phase: "warning",
    warningSelectionIndex: 0,
    warningDefaultSelectionIndex: 0,
    warningButtons: [],
    cachedOfflineBytes: 0,
    resultSelectionIndex: 0,
    resultButtons: [],
    totalUnits: 0,
    completedUnits: 0,
    currentUnitRatio: 0,
    shellTotalUnits: 0,
    shellCompletedUnits: 0,
    protectedTotalUnits: 0,
    protectedCompletedUnits: 0,
    protectedTotalExpectedBytes: 0,
    protectedCompletedExpectedBytes: 0,
    activePhaseKey: "",
    historyModeKey: "install",
    autoReturnTimerId: null,
    isDownloading: false,
    warningMode: "enable",
    statusText: "",
    fileText: "",
    downloadedBytes: 0,
    totalBytes: 0,
    inputMode: "keyboard",
  };
  const lastGamepadState = new Map();
  let gamepadLoopRequestId = 0;
  let protectedChecksumIndexCache = null;

  function revealOfflineUi() {
    document.body?.classList.remove("offline-ui-pending");
  }

  function focusOfflineShell() {
    try {
      offlineShell?.focus?.({ preventScroll: true });
    } catch (_focusError) {
    }
  }

  function focusOfflineLoader() {
    const frameDocument = loaderFrameNode?.contentWindow?.document ?? null;
    const focusTarget = frameDocument?.getElementById("loadah") ?? loaderFrameNode;

    try {
      focusTarget?.focus?.({ preventScroll: true });
    } catch (_focusError) {
    }
  }

  function getOfflineLoader() {
    return loaderFrameNode?.contentWindow?.DRWebOfflineLoader ?? null;
  }

  function syncOfflineInputMode() {
    const isGamepadMode = state.inputMode === "gamepad";
    document.body?.classList.toggle("offline-gamepad-mode", isGamepadMode);
    loaderFrameNode?.contentWindow?.document?.body?.classList.toggle("offline-gamepad-mode", isGamepadMode);

    if (!isGamepadMode) {
      return;
    }

    if (state.phase === "downloading") {
      focusOfflineLoader();
      return;
    }

    focusOfflineShell();
  }

  function setOfflineInputMode(nextMode) {
    state.inputMode = nextMode === "gamepad" ? "gamepad" : "keyboard";
    syncOfflineInputMode();
  }

  function clearAutoReturnTimer() {
    if (state.autoReturnTimerId !== null) {
      window.clearTimeout(state.autoReturnTimerId);
      state.autoReturnTimerId = null;
    }
  }

  function stopTimerUpdates() {
    getOfflineLoader()?.stop?.();
  }

  function startTimerUpdates() {
    getOfflineLoader()?.start?.({
      history_mode_key: state.historyModeKey,
    });
  }

  function delay(durationMs) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }

  function normalizeAssetPath(assetPath) {
    return String(assetPath ?? "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..")
      .join("/");
  }

  function isOfflineModeEnabled() {
    try {
      return localStorage.getItem(offlineModeStorageKey) === "true";
    } catch (_storageError) {
      return false;
    }
  }

  function setOfflineModeEnabled(enabled) {
    try {
      localStorage.setItem(offlineModeStorageKey, enabled ? "true" : "false");
    } catch (_storageError) {
    }
  }

  function markOfflineDownloadActive(active) {
    try {
      if (active) {
        localStorage.setItem(offlineModeDownloadStorageKey, "true");
      } else {
        localStorage.removeItem(offlineModeDownloadStorageKey);
      }
    } catch (_storageError) {
    }
  }

  function getKeysEndpoint() {
    const gate = window.gate ?? window.ownership_gate ?? null;

    if (typeof gate?.get_keys_endpoint === "function") {
      const configuredEndpoint = String(gate.get_keys_endpoint() || "").trim().replace(/\/+$/, "");

      if (configuredEndpoint) {
        return configuredEndpoint;
      }
    }

    return defaultKeysEndpoint;
  }

  async function getVerifiedOwnershipBundle() {
    const gate = window.gate ?? window.ownership_gate ?? null;

    if (typeof gate?.check_saved_ownership !== "function") {
      throw new Error("Verification helper missing.");
    }

    const gateResult = await gate.check_saved_ownership();

    if (!gateResult?.verified || !gateResult?.result?.decrypted_bundle) {
      throw new Error("Verification required.");
    }

    return gateResult.result.decrypted_bundle;
  }

  function getScopeDisplayLabel(playScope) {
    const matchingPlan = offlineScopePlans.find((scopePlan) => scopePlan.play_scope === playScope);
    return matchingPlan?.label ?? playScope;
  }

  function formatStorageSize(totalBytes) {
    const normalizedBytes = Math.max(0, Number(totalBytes) || 0);

    if (normalizedBytes >= 1000 * 1000 * 1000) {
      return `${(normalizedBytes / (1000 * 1000 * 1000)).toFixed(1)}GB`;
    }

    if (normalizedBytes >= 1000 * 1000) {
      return `${Math.round(normalizedBytes / (1000 * 1000))}MB`;
    }

    if (normalizedBytes >= 1000) {
      return `${Math.round(normalizedBytes / 1000)}KB`;
    }

    return `${normalizedBytes}B`;
  }

  function formatSectionProgressLabel(protectedEntry, currentUnitRatio = 0) {
    const sectionLabel = String(protectedEntry?.scope_label ?? getScopeDisplayLabel(protectedEntry?.play_scope));
    const sectionIndex = Math.max(1, Number(protectedEntry?.scope_index) || 1);
    const sectionTotal = Math.max(sectionIndex, Number(protectedEntry?.scope_total) || sectionIndex);
    const normalizedUnitRatio = Math.max(0, Math.min(1, Number(currentUnitRatio) || 0));
    const completedBeforeCurrent = Math.max(0, sectionIndex - 1);
    const sectionProgressPercent = Math.max(
      0,
      Math.min(100, Math.round(((completedBeforeCurrent + normalizedUnitRatio) / sectionTotal) * 100)),
    );
    return `${sectionLabel} (${sectionIndex}/${sectionTotal}) [${sectionProgressPercent}%]`;
  }

  function formatShellPhaseStatusLabel(baseLabel, shellIndex, shellTotal, currentUnitRatio = 0) {
    const normalizedBaseLabel = String(baseLabel ?? "").trim() || "Preparing offline pages...";
    const normalizedShellIndex = Math.max(1, Number(shellIndex) || 1);
    const normalizedShellTotal = Math.max(normalizedShellIndex, Number(shellTotal) || normalizedShellIndex);
    const normalizedUnitRatio = Math.max(0, Math.min(1, Number(currentUnitRatio) || 0));
    const completedBeforeCurrent = Math.max(0, normalizedShellIndex - 1);
    const shellProgressPercent = Math.max(
      0,
      Math.min(100, Math.round(((completedBeforeCurrent + normalizedUnitRatio) / normalizedShellTotal) * 100)),
    );
    return `${normalizedBaseLabel} (${normalizedShellIndex}/${normalizedShellTotal}) [${shellProgressPercent}%]`;
  }

  function normalizeChecksumValue(checksumValue) {
    return String(checksumValue ?? "").trim().toLowerCase();
  }

  function readProtectedChecksumIndex() {
    if (protectedChecksumIndexCache && typeof protectedChecksumIndexCache === "object" && !Array.isArray(protectedChecksumIndexCache)) {
      return protectedChecksumIndexCache;
    }

    try {
      const storedValue = window.localStorage.getItem(offlineProtectedChecksumIndexStorageKey);
      const parsedValue = storedValue ? JSON.parse(storedValue) : {};
      protectedChecksumIndexCache = (
        parsedValue
        && typeof parsedValue === "object"
        && !Array.isArray(parsedValue)
      ) ? parsedValue : {};
    } catch (_storageError) {
      protectedChecksumIndexCache = {};
    }

    return protectedChecksumIndexCache;
  }

  function writeProtectedChecksumIndex(nextIndex) {
    protectedChecksumIndexCache = (
      nextIndex
      && typeof nextIndex === "object"
      && !Array.isArray(nextIndex)
    ) ? nextIndex : {};

    try {
      window.localStorage.setItem(
        offlineProtectedChecksumIndexStorageKey,
        JSON.stringify(protectedChecksumIndexCache),
      );
    } catch (_storageError) {
    }
  }

  function getStoredProtectedEntryChecksum(assetPath, playScope) {
    const protectedChecksumIndex = readProtectedChecksumIndex();
    const protectedCacheKey = getProtectedEntryCacheKey(assetPath, playScope);
    return normalizeChecksumValue(protectedChecksumIndex[protectedCacheKey]);
  }

  function setStoredProtectedEntryChecksum(assetPath, playScope, checksumValue) {
    const normalizedChecksum = normalizeChecksumValue(checksumValue);

    if (!normalizedChecksum) {
      return;
    }

    const protectedChecksumIndex = {
      ...readProtectedChecksumIndex(),
    };
    protectedChecksumIndex[getProtectedEntryCacheKey(assetPath, playScope)] = normalizedChecksum;
    writeProtectedChecksumIndex(protectedChecksumIndex);
  }

  function deleteStoredProtectedEntryChecksum(assetPath, playScope) {
    const protectedChecksumIndex = {
      ...readProtectedChecksumIndex(),
    };
    const protectedCacheKey = getProtectedEntryCacheKey(assetPath, playScope);

    if (!(protectedCacheKey in protectedChecksumIndex)) {
      return;
    }

    delete protectedChecksumIndex[protectedCacheKey];
    writeProtectedChecksumIndex(protectedChecksumIndex);
  }

  function rotateLeft32(value, shift) {
    return ((value << shift) | (value >>> (32 - shift))) >>> 0;
  }

  function bytesToHex(inputBytes) {
    const normalizedBytes = inputBytes instanceof Uint8Array
      ? inputBytes
      : new Uint8Array(inputBytes);
    let hex = "";

    for (let byteIndex = 0; byteIndex < normalizedBytes.length; byteIndex += 1) {
      hex += normalizedBytes[byteIndex].toString(16).padStart(2, "0");
    }

    return hex;
  }

  function md5Bytes(inputBytes) {
    const normalizedBytes = inputBytes instanceof Uint8Array
      ? inputBytes
      : new Uint8Array(inputBytes);
    const paddedLength = (((normalizedBytes.length + 8) >>> 6) + 1) << 6;
    const paddedBytes = new Uint8Array(paddedLength);
    paddedBytes.set(normalizedBytes);
    paddedBytes[normalizedBytes.length] = 0x80;

    const bitLengthLow = (normalizedBytes.length << 3) >>> 0;
    const bitLengthHigh = (normalizedBytes.length >>> 29) >>> 0;
    const dataView = new DataView(paddedBytes.buffer);
    dataView.setUint32(paddedLength - 8, bitLengthLow, true);
    dataView.setUint32(paddedLength - 4, bitLengthHigh, true);

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    for (let chunkOffset = 0; chunkOffset < paddedLength; chunkOffset += 64) {
      let a = a0;
      let b = b0;
      let c = c0;
      let d = d0;

      for (let roundIndex = 0; roundIndex < 64; roundIndex += 1) {
        let f = 0;
        let g = 0;

        if (roundIndex < 16) {
          f = (b & c) | (~b & d);
          g = roundIndex;
        } else if (roundIndex < 32) {
          f = (d & b) | (~d & c);
          g = (5 * roundIndex + 1) % 16;
        } else if (roundIndex < 48) {
          f = b ^ c ^ d;
          g = (3 * roundIndex + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * roundIndex) % 16;
        }

        const nextWord = dataView.getUint32(chunkOffset + (g * 4), true);
        const rotatedValue = rotateLeft32(
          (a + f + md5Table[roundIndex] + nextWord) >>> 0,
          md5ShiftAmounts[roundIndex],
        );
        const nextB = (b + rotatedValue) >>> 0;

        a = d;
        d = c;
        c = b;
        b = nextB;
      }

      a0 = (a0 + a) >>> 0;
      b0 = (b0 + b) >>> 0;
      c0 = (c0 + c) >>> 0;
      d0 = (d0 + d) >>> 0;
    }

    const outputBytes = new Uint8Array(16);
    const outputView = new DataView(outputBytes.buffer);
    outputView.setUint32(0, a0, true);
    outputView.setUint32(4, b0, true);
    outputView.setUint32(8, c0, true);
    outputView.setUint32(12, d0, true);
    return bytesToHex(outputBytes);
  }

  async function digestSha256Hex(inputBytes) {
    const normalizedBytes = inputBytes instanceof Uint8Array
      ? inputBytes
      : new Uint8Array(inputBytes);
    const digestBuffer = await window.crypto.subtle.digest("SHA-256", normalizedBytes);
    return bytesToHex(new Uint8Array(digestBuffer));
  }

  async function readResponseBytes(response) {
    return new Uint8Array(await response.arrayBuffer());
  }

  async function loadOfflineShellChecksums() {
    const response = await window.fetch(offlineShellChecksumsPath, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`Unable to load offline checksums (${response.status}).`);
    }

    const payload = await response.json();
    const checksums = payload?.checksums;
    return checksums && typeof checksums === "object" ? checksums : {};
  }

  async function loadOfflineUpdateManifestFromKeys() {
    const verifiedBundle = await getVerifiedOwnershipBundle();
    const response = await window.fetch(`${getKeysEndpoint()}/play`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        action: "get_offline_update_manifest",
        site_origin: window.location.origin,
        key_id: verifiedBundle.key_id,
        key: verifiedBundle.raw_key,
        steamid: verifiedBundle.steamid,
        appid: verifiedBundle.appid,
        verification_mode: verifiedBundle.verification_mode,
      }),
    });
    const responseText = await response.text();
    let responseData = {};

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (_parseError) {
      throw new Error(responseText || "The update manifest service returned an unreadable response.");
    }

    if (!response.ok) {
      throw new Error(responseData?.error || `Unable to load the update manifest (${response.status}).`);
    }

    const shellChecksums = responseData?.shell_checksums;
    const protectedEntries = responseData?.protected_entries;
    return {
      shell_checksums: shellChecksums && typeof shellChecksums === "object" ? shellChecksums : {},
      protected_entries: Array.isArray(protectedEntries) ? protectedEntries : [],
    };
  }

  function normalizeProtectedDownloadStatusText(statusText) {
    const normalizedStatusText = String(statusText ?? "").trim();

    if (!normalizedStatusText) {
      return "Preparing game files...";
    }

    if (/^requesting file:/i.test(normalizedStatusText)) {
      return "Requesting game files...";
    }

    if (/^downloading file:/i.test(normalizedStatusText)) {
      return "Downloading game files...";
    }

    if (/^preparing file:/i.test(normalizedStatusText)) {
      return "Preparing game files...";
    }

    if (/^retrying file:/i.test(normalizedStatusText)) {
      return normalizedStatusText.replace(/^retrying file:/i, "Retrying game files:");
    }

    return normalizedStatusText;
  }

  function getRootUrl(pathname) {
    return new URL(String(pathname ?? "").replace(/^\/+/, ""), window.location.origin).toString();
  }

  function getProtectedEntryCacheKey(assetPath, playScope) {
    return `${String(assetPath).startsWith("mus/") ? "shared" : playScope}::${assetPath}`;
  }

  function getProtectedAssetCacheUrl(assetPath, playScope) {
    const normalizedAssetPath = normalizeAssetPath(assetPath);
    const cacheScope = String(normalizedAssetPath).startsWith("mus/")
      ? "shared"
      : String(playScope ?? "");
    const encodedScope = encodeURIComponent(cacheScope);
    const encodedSegments = normalizedAssetPath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${window.location.origin}/__dr_play_cache__/${encodedScope}/${encodedSegments}`;
  }

  function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function computeOverallDownloadProgressFraction(currentUnitRatio = state.currentUnitRatio) {
    const normalizedUnitRatio = clampNumber(Number(currentUnitRatio) || 0, 0, 1);
    const shellTotalUnits = Math.max(0, Number(state.shellTotalUnits) || 0);
    const protectedTotalUnits = Math.max(0, Number(state.protectedTotalUnits) || 0);
    const shellCompletedUnits = Math.max(0, Number(state.shellCompletedUnits) || 0);
    const protectedCompletedUnits = Math.max(0, Number(state.protectedCompletedUnits) || 0);
    const shellBaseFraction = shellTotalUnits > 0
      ? clampNumber(shellCompletedUnits / shellTotalUnits, 0, 1)
      : 1;
    const protectedBaseFraction = protectedTotalUnits > 0
      ? clampNumber(protectedCompletedUnits / protectedTotalUnits, 0, 1)
      : 1;
    const shellFraction = state.activePhaseKey === "shell" && shellTotalUnits > 0
      ? clampNumber((shellCompletedUnits + normalizedUnitRatio) / shellTotalUnits, 0, 1)
      : shellBaseFraction;
    const protectedFraction = state.activePhaseKey === "protected" && protectedTotalUnits > 0
      ? clampNumber((protectedCompletedUnits + normalizedUnitRatio) / protectedTotalUnits, 0, 1)
      : protectedBaseFraction;

    if (protectedTotalUnits <= 0) {
      return shellFraction;
    }

    const shellShare = shellTotalUnits > 0 ? offlineShellProgressShare : 0;
    const protectedShare = 1 - shellShare;

    return clampNumber(
      (shellFraction * shellShare) + (protectedFraction * protectedShare),
      0,
      1,
    );
  }

  function goToAppPage() {
    clearAutoReturnTimer();

    try {
      if (window.parent && window.parent !== window && typeof window.parent.goToContainerPage === "function") {
        window.parent.goToContainerPage("app/index.html");
        return;
      }
    } catch (_parentError) {
    }

    window.location.href = "../index.html";
  }

  function goToVerificationPage() {
    clearAutoReturnTimer();
    const redirectTarget = "verif/index.html?redirect=app/offline/index.html";

    try {
      if (window.parent && window.parent !== window && typeof window.parent.goToContainerPage === "function") {
        window.parent.goToContainerPage(redirectTarget);
        return;
      }
    } catch (_parentError) {
    }

    window.location.href = `../../${redirectTarget}`;
  }

  async function cacheHasEntries(cacheName, knownCacheNames = null) {
    if (!window.caches?.open) {
      return false;
    }

    const cacheNames = Array.isArray(knownCacheNames)
      ? knownCacheNames
      : (window.caches?.keys ? await window.caches.keys() : []);

    if (!cacheNames.includes(cacheName)) {
      return false;
    }

    try {
      const cache = await window.caches.open(cacheName);
      const cacheKeys = await cache.keys();
      return cacheKeys.length > 0;
    } catch (_cacheError) {
      return false;
    }
  }

  async function isOfflineModeCacheReady() {
    if (!window.caches?.keys || !window.caches?.open) {
      return false;
    }

    try {
      const cacheNames = await window.caches.keys();
      const hasOfflineShellCache = await cacheHasEntries(offlineShellCacheName, cacheNames);
      const hasOfflineAssetCache = await cacheHasEntries(offlineAssetCacheName, cacheNames);
      return hasOfflineShellCache && hasOfflineAssetCache;
    } catch (_cacheError) {
      return false;
    }
  }

  async function readCacheStorageBytes(cacheName) {
    if (!window.caches?.open || !window.caches?.keys) {
      return 0;
    }

    const cacheNames = await window.caches.keys();

    if (!cacheNames.includes(cacheName)) {
      return 0;
    }

    const cache = await window.caches.open(cacheName);
    const requests = await cache.keys();
    let totalBytes = 0;

    for (const request of requests) {
      try {
        const response = await cache.match(request);

        if (!response) {
          continue;
        }

        const contentLength = Number(response.headers.get("content-length")) || 0;

        if (contentLength > 0) {
          totalBytes += contentLength;
          continue;
        }

        const blob = await response.blob();
        totalBytes += blob.size;
      } catch (_responseError) {
      }
    }

    return totalBytes;
  }

  async function readOfflineModeCacheBytes() {
    const [shellBytes, assetBytes] = await Promise.all([
      readCacheStorageBytes(offlineShellCacheName),
      readCacheStorageBytes(offlineAssetCacheName),
    ]);
    return shellBytes + assetBytes;
  }

  async function ensureDebugCacheMarker(cacheName) {
    if (!window.caches?.open) {
      return;
    }

    const cache = await window.caches.open(cacheName);
    const markerUrl = getRootUrl(`__dr_offline_debug__/${cacheName}.txt`);
    const existingResponse = await cache.match(markerUrl, { ignoreSearch: true });

    if (existingResponse) {
      return;
    }

    await cache.put(markerUrl, new Response("offline-debug", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    }));
  }

  async function ensureOfflineModeDebugCachesPresent() {
    await Promise.all([
      ensureDebugCacheMarker(offlineShellCacheName),
      ensureDebugCacheMarker(offlineAssetCacheName),
    ]);
  }

  function getVisibleWarningButtons() {
    return state.warningButtons.filter((button) => !button.hidden);
  }

  function configureWarningButtons(actions, defaultSelectionIndex = 0) {
    state.warningButtons = [
      {
        node: warningYesButton,
        hidden: !actions[0],
        action: actions[0]?.action ?? null,
      },
      {
        node: warningNoButton,
        hidden: !actions[1],
        action: actions[1]?.action ?? null,
      },
      {
        node: warningThirdButton,
        hidden: !actions[2],
        action: actions[2]?.action ?? null,
      },
    ];

    [warningYesButton, warningNoButton, warningThirdButton].forEach((buttonNode, buttonIndex) => {
      const action = actions[buttonIndex];
      buttonNode.hidden = !action;
      buttonNode.classList.remove("is-selected");

      if (action) {
        buttonNode.textContent = action.label;
      }
    });

    const visibleButtonCount = getVisibleWarningButtons().length;
    state.warningDefaultSelectionIndex = visibleButtonCount > 0
      ? Math.max(0, Math.min(defaultSelectionIndex, visibleButtonCount - 1))
      : 0;
  }

  function setWarningSelection(nextIndex) {
    const visibleButtons = getVisibleWarningButtons();

    if (visibleButtons.length === 0) {
      return;
    }

    state.warningSelectionIndex = Math.max(0, Math.min(nextIndex, visibleButtons.length - 1));

    visibleButtons.forEach((button, buttonIndex) => {
      button.node.classList.toggle("is-selected", buttonIndex === state.warningSelectionIndex);
    });
  }

  function setResultSelection(nextIndex) {
    const visibleButtons = state.resultButtons.filter((button) => !button.hidden);

    if (visibleButtons.length === 0) {
      return;
    }

    state.resultSelectionIndex = Math.max(0, Math.min(nextIndex, visibleButtons.length - 1));
    visibleButtons.forEach((button, buttonIndex) => {
      button.node.classList.toggle("is-selected", buttonIndex === state.resultSelectionIndex);
    });
  }

  function isNintendoGamepad(id) {
    return /nintendo|switch|joy-con|joycon|pro controller/i.test(String(id ?? ""));
  }

  function readGamepadFrame() {
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

    const connectedIndices = new Set();
    const gamepads = navigator.getGamepads();

    for (const gamepad of gamepads) {
      if (!gamepad || !gamepad.connected) {
        continue;
      }

      connectedIndices.add(gamepad.index);
      const isNintendoLayout = isNintendoGamepad(gamepad.id);
      const confirmIndex = isNintendoLayout ? 1 : 0;
      const cancelIndex = isNintendoLayout ? 0 : 1;
      const axes = gamepad.axes || [];
      const buttons = gamepad.buttons || [];
      const currentState = {
        leftHeld: Boolean(buttons[14]?.pressed) || axes[0] < -0.5,
        rightHeld: Boolean(buttons[15]?.pressed) || axes[0] > 0.5,
        upHeld: Boolean(buttons[12]?.pressed) || axes[1] < -0.5,
        downHeld: Boolean(buttons[13]?.pressed) || axes[1] > 0.5,
        confirmHeld: Boolean(buttons[confirmIndex]?.pressed),
        cancelHeld: Boolean(buttons[cancelIndex]?.pressed),
      };
      const previousState = lastGamepadState.get(gamepad.index) || {
        leftHeld: false,
        rightHeld: false,
        upHeld: false,
        downHeld: false,
        confirmHeld: false,
        cancelHeld: false,
      };

      frame.leftPressed ||= currentState.leftHeld && !previousState.leftHeld;
      frame.rightPressed ||= currentState.rightHeld && !previousState.rightHeld;
      frame.upPressed ||= currentState.upHeld && !previousState.upHeld;
      frame.downPressed ||= currentState.downHeld && !previousState.downHeld;
      frame.confirmPressed ||= currentState.confirmHeld && !previousState.confirmHeld;
      frame.cancelPressed ||= currentState.cancelHeld && !previousState.cancelHeld;
      lastGamepadState.set(gamepad.index, currentState);
    }

    for (const gamepadIndex of Array.from(lastGamepadState.keys())) {
      if (!connectedIndices.has(gamepadIndex)) {
        lastGamepadState.delete(gamepadIndex);
      }
    }

    return frame;
  }

  function handleGamepadFrame(frame) {
    const usedGamepadInput = Boolean(
      frame.leftPressed
      || frame.rightPressed
      || frame.upPressed
      || frame.downPressed
      || frame.confirmPressed
      || frame.cancelPressed
    );

    if (usedGamepadInput) {
      setOfflineInputMode("gamepad");
    }

    if (state.phase === "downloading") {
      return;
    }

    if (state.phase === "warning") {
      const visibleButtons = getVisibleWarningButtons();

      if (visibleButtons.length > 1) {
        if (frame.leftPressed || frame.upPressed) {
          const nextIndex = (state.warningSelectionIndex - 1 + visibleButtons.length) % visibleButtons.length;
          setWarningSelection(nextIndex);
          return;
        }

        if (frame.rightPressed || frame.downPressed) {
          const nextIndex = (state.warningSelectionIndex + 1) % visibleButtons.length;
          setWarningSelection(nextIndex);
          return;
        }
      }

      if (frame.confirmPressed) {
        handleWarningConfirm();
        return;
      }

      if (frame.cancelPressed) {
        goToAppPage();
      }

      return;
    }

    if (state.phase === "result") {
      const visibleButtons = state.resultButtons.filter((button) => !button.hidden);

      if (visibleButtons.length > 1) {
        if (frame.leftPressed || frame.upPressed || frame.rightPressed || frame.downPressed) {
          const nextIndex = state.resultSelectionIndex === 0 ? 1 : 0;
          setResultSelection(nextIndex);
          return;
        }
      }

      if (frame.confirmPressed) {
        handleResultConfirm();
        return;
      }

      if (frame.cancelPressed) {
        const fallbackAction = visibleButtons[visibleButtons.length - 1]?.action
          ?? visibleButtons[0]?.action;

        if (typeof fallbackAction === "function") {
          fallbackAction();
        }
      }
    }
  }

  function startGamepadLoop() {
    const tick = () => {
      handleGamepadFrame(readGamepadFrame());
      gamepadLoopRequestId = window.requestAnimationFrame(tick);
    };

    if (gamepadLoopRequestId !== 0) {
      window.cancelAnimationFrame(gamepadLoopRequestId);
    }

    gamepadLoopRequestId = window.requestAnimationFrame(tick);
  }

  function showWarningScreen() {
    clearAutoReturnTimer();
    stopTimerUpdates();
    state.phase = "warning";
    state.isDownloading = false;
    revealOfflineUi();
    offlineShell.hidden = false;
    warningScreen.hidden = false;
    downloadScreen.hidden = true;
    resultScreen.hidden = true;
    setWarningSelection(state.warningDefaultSelectionIndex);
    syncOfflineInputMode();
  }

  function setWarningMode(mode, options = {}) {
    state.warningMode = mode === "manage" || mode === "disable" ? mode : "enable";

    if (typeof options.cacheBytes === "number") {
      state.cachedOfflineBytes = Math.max(0, Number(options.cacheBytes) || 0);
    }

    if (state.warningMode === "manage") {
      warningCopyNode.textContent = "Would you like to update your offline assets to the latest from the server or disable Offline Mode?";
      configureWarningButtons(
        [
          {
            label: "Update!",
            action: () => startOfflineDownload(true),
          },
          {
            label: "Disable...",
            action: () => setWarningMode("disable", { cacheBytes: state.cachedOfflineBytes }),
          },
          {
            label: "Nah, take me back",
            action: () => goToAppPage(),
          },
        ],
        2,
      );
    } else if (state.warningMode === "disable") {
      const cacheSizeLabel = formatStorageSize(state.cachedOfflineBytes);
      warningCopyNode.textContent = `Would you like to disable Offline Mode? Upon disabling it, the site will update, and begin from the server every time you launch the game and ${cacheSizeLabel} of space will be cleared from your browser.`;
      configureWarningButtons(
        [
          {
            label: "Yes",
            action: () => disableOfflineMode(),
          },
          {
            label: "No",
            action: () => setWarningMode("manage", { cacheBytes: state.cachedOfflineBytes }),
          },
        ],
        1,
      );
    } else {
      warningCopyNode.textContent = enableWarningCopy;
      configureWarningButtons(
        [
          {
            label: "Turn it on!",
            action: () => startOfflineDownload(false),
          },
          {
            label: "Nah, take me back",
            action: () => goToAppPage(),
          },
        ],
        1,
      );
    }

    showWarningScreen();
  }

  function showDownloadScreen() {
    clearAutoReturnTimer();
    state.phase = "downloading";
    state.isDownloading = true;
    revealOfflineUi();
    state.shellTotalUnits = 0;
    state.shellCompletedUnits = 0;
    state.protectedTotalUnits = 0;
    state.protectedCompletedUnits = 0;
    state.activePhaseKey = "";
    offlineShell.hidden = true;
    warningScreen.hidden = true;
    downloadScreen.hidden = false;
    resultScreen.hidden = true;
    startTimerUpdates();
    updateDownloadProgressUi();
    syncOfflineInputMode();
  }

  function showResultScreen(title, copy, actions, options = {}) {
    clearAutoReturnTimer();
    stopTimerUpdates();
    state.phase = "result";
    state.isDownloading = false;
    revealOfflineUi();
    offlineShell.hidden = false;
    warningScreen.hidden = true;
    downloadScreen.hidden = true;
    resultScreen.hidden = false;
    resultTitleNode.textContent = title;
    resultCopyNode.textContent = copy;
    state.resultButtons = [
      {
        node: resultPrimaryButton,
        hidden: !actions[0],
        action: actions[0]?.action ?? null,
      },
      {
        node: resultSecondaryButton,
        hidden: !actions[1],
        action: actions[1]?.action ?? null,
      },
    ];

    [resultPrimaryButton, resultSecondaryButton].forEach((buttonNode, buttonIndex) => {
      const action = actions[buttonIndex];
      buttonNode.hidden = !action;

      if (action) {
        buttonNode.textContent = action.label;
      }
    });

    setResultSelection(0);
    syncOfflineInputMode();

    if (options.autoReturn === true) {
      state.autoReturnTimerId = window.setTimeout(() => {
        goToAppPage();
      }, autoReturnDelayMs);
    }
  }

  function updateDownloadProgressUi() {
    getOfflineLoader()?.update?.({
      total_units: state.totalUnits,
      completed_units: state.completedUnits,
      current_unit_ratio: state.currentUnitRatio,
      overall_progress_fraction: computeOverallDownloadProgressFraction(state.currentUnitRatio),
      eta_phase_key: state.activePhaseKey,
      history_mode_key: state.historyModeKey,
      total_expected_bytes: state.protectedTotalExpectedBytes,
      completed_expected_bytes: state.protectedCompletedExpectedBytes,
      status_text: state.statusText,
      file_text: state.fileText,
      downloaded_bytes: state.downloadedBytes,
      total_bytes: state.totalBytes,
    });
  }

  function setDownloadState(statusText, fileText, options = {}) {
    if (typeof options.completedUnits === "number") {
      state.completedUnits = options.completedUnits;
    }

    if (typeof options.totalUnits === "number") {
      state.totalUnits = options.totalUnits;
    }

    if (typeof options.currentUnitRatio === "number") {
      state.currentUnitRatio = options.currentUnitRatio;
    }

    state.statusText = statusText ?? "";
    state.fileText = fileText ?? "";
    state.downloadedBytes = Math.max(0, Number(options.downloadedBytes) || 0);
    state.totalBytes = Math.max(0, Number(options.totalBytes) || 0);
    updateDownloadProgressUi();
  }

  async function closeActiveOfflineSessions() {
    const closeProtectedPlaySession = window.closeProtectedPlaySession
      ?? window.close_protected_play_session;

    if (typeof closeProtectedPlaySession !== "function" || activeOfflineSessionScopes.size === 0) {
      activeOfflineSessionScopes.clear();
      return;
    }

    const activeScopes = Array.from(activeOfflineSessionScopes);
    activeOfflineSessionScopes.clear();
    await Promise.all(activeScopes.map((playScope) => closeProtectedPlaySession(playScope).catch(() => false)));
  }

  async function disableOfflineMode() {
    if (state.isDownloading) {
      return;
    }

    try {
      markOfflineDownloadActive(false);
      setOfflineModeEnabled(false);

      if (window.caches?.delete) {
        await Promise.all([
          window.caches.delete(offlineShellCacheName).catch(() => false),
          window.caches.delete(offlineAssetCacheName).catch(() => false),
        ]);
      }

      if (navigator.serviceWorker?.getRegistrations) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
        } catch (_serviceWorkerError) {
        }
      }

      goToAppPage();
    } catch (error) {
      console.error("Offline Mode disable failed:", error);
      showResultScreen(
        "Offline Mode Error",
        `${error?.message || "Offline Mode could not be disabled."}\n\nYou can try again or head back to /app.`,
        [
          {
            label: "Try Again",
            action: () => initializeWarningMode(),
          },
          {
            label: "Back to /app",
            action: () => goToAppPage(),
          },
        ],
      );
    }
  }

  async function finishOfflineModeForDebug() {
    try {
      await ensureOfflineModeDebugCachesPresent();
    } catch (error) {
      console.warn("Unable to seed the Offline Mode debug caches:", error);
    }

    setOfflineModeEnabled(true);
    markOfflineDownloadActive(false);
    await closeActiveOfflineSessions();

    state.totalUnits = Math.max(1, Number(state.totalUnits) || 1);
    state.completedUnits = state.totalUnits;
    state.currentUnitRatio = 0;
    state.shellCompletedUnits = Math.max(state.shellCompletedUnits, state.shellTotalUnits);
    state.protectedCompletedUnits = Math.max(state.protectedCompletedUnits, state.protectedTotalUnits);
    state.activePhaseKey = "";
    state.statusText = "Offline Mode is now enabled.";
    state.fileText = "";
    state.downloadedBytes = 0;
    state.totalBytes = 0;
    state.isDownloading = false;

    getOfflineLoader()?.finish?.({
      total_units: state.totalUnits,
      history_mode_key: state.historyModeKey,
      status_text: state.statusText,
      file_text: state.fileText,
    });

    window.setTimeout(() => {
      goToAppPage();
    }, 120);
  }

  function publishOfflineModeDebugHelpers() {
    const debugApi = Object.freeze({
      finish: () => finishOfflineModeForDebug(),
      skip: () => finishOfflineModeForDebug(),
    });

    window.OfflineModeDebug = debugApi;
    window.offlineModeDebug = debugApi;
    window.skipofflinemode = () => finishOfflineModeForDebug();

    try {
      if (window.parent && window.parent !== window) {
        window.parent.OfflineModeDebug = debugApi;
        window.parent.offlineModeDebug = debugApi;
        window.parent.skipofflinemode = () => finishOfflineModeForDebug();
      }
    } catch (_parentError) {
    }
  }

  async function registerOfflineServiceWorker() {
    if (!navigator.serviceWorker?.register) {
      return;
    }

    const swUrl = new URL("../../sw.js", window.location.href);
    const scopeUrl = new URL("../../", window.location.href);
    await navigator.serviceWorker.register(swUrl.toString(), {
      scope: scopeUrl.pathname,
    });
    await navigator.serviceWorker.ready;
  }

  async function readResponseBytesWithProgress(response, onProgress) {
    if (!response.body || typeof response.body.getReader !== "function") {
      const fallbackBuffer = await response.arrayBuffer();
      const fallbackBytes = new Uint8Array(fallbackBuffer);

      if (typeof onProgress === "function") {
        onProgress({
          downloaded_bytes: fallbackBytes.byteLength,
          total_bytes: fallbackBytes.byteLength,
        });
      }

      return fallbackBytes;
    }

    const totalBytes = Math.max(0, Number(response.headers.get("content-length")) || 0);
    const reader = response.body.getReader();
    const chunks = [];
    let downloadedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      chunks.push(value);
      downloadedBytes += value.byteLength;

      if (typeof onProgress === "function") {
        onProgress({
          downloaded_bytes: downloadedBytes,
          total_bytes: totalBytes,
        });
      }
    }

    const mergedBytes = new Uint8Array(downloadedBytes);
    let writeOffset = 0;

    for (const chunk of chunks) {
      mergedBytes.set(chunk, writeOffset);
      writeOffset += chunk.byteLength;
    }

    return mergedBytes;
  }

  async function cacheShellPath(shellCache, shellPath, options = {}) {
    const requestUrl = getRootUrl(shellPath);
    const existingResponse = await shellCache.match(requestUrl, { ignoreSearch: true });
    const forceServerCheck = options.forceServerCheck === true;
    const expectedChecksum = normalizeChecksumValue(options.expectedChecksum);

    if (existingResponse && !forceServerCheck) {
      return {
        source: "cache",
        downloaded_bytes: 0,
      };
    }

    if (existingResponse && forceServerCheck && expectedChecksum) {
      const cachedBytes = await readResponseBytes(existingResponse);
      const cachedDigest = await digestSha256Hex(cachedBytes);

      if (cachedDigest === expectedChecksum) {
        return {
          source: "verified",
          downloaded_bytes: 0,
        };
      }
    }

    const response = await window.fetch(requestUrl, {
      cache: "no-cache",
    });

    if (!response.ok) {
      const optionalShellPath = /(?:runner\.json|fav\.ico|runner-sw\.js|sw\.js)$/i.test(String(shellPath || ""));
      if (optionalShellPath && (response.status === 404 || response.status === 410)) {
        return {
          source: "missing-optional",
          downloaded_bytes: 0,
        };
      }
      throw new Error(`Unable to cache ${shellPath} (${response.status}).`);
    }

    const responseBytes = await readResponseBytesWithProgress(response, options.onProgress);

    if (existingResponse && forceServerCheck && !expectedChecksum) {
      const [cachedBytes, liveDigest] = await Promise.all([
        readResponseBytes(existingResponse),
        digestSha256Hex(responseBytes),
      ]);
      const cachedDigest = await digestSha256Hex(cachedBytes);

      if (cachedDigest === liveDigest) {
        return {
          source: "verified",
          downloaded_bytes: responseBytes.byteLength,
        };
      }
    }

    const cachedResponse = new Response(responseBytes, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    await shellCache.put(requestUrl, cachedResponse);
    return {
      source: existingResponse ? "updated" : "network",
      downloaded_bytes: responseBytes.byteLength,
    };
  }

  function getFallbackManifestFilesForUrl(manifestUrl) {
    const normalizedUrl = String(manifestUrl || "").replace(/\\/g, "/");
    if (normalizedUrl.includes("/play/play/") || normalizedUrl.endsWith("play/runner.json")) {
      return [
        "runner.js",
        "runner.data",
        "../common/chapters/runner.wasm",
        "../common/chapters/audio-worklet.js",
        "game.unx",
        "index.html",
      ];
    }
    return [
      "runner.js",
      "runner.data",
      "../common/chapters/runner.wasm",
      "../common/chapters/audio-worklet.js",
      "game.unx",
      "index.html",
    ];
  }

  function extractManifestFilesFromHtml(htmlText) {
    const text = String(htmlText || "");
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

  async function loadManifestFiles(manifestUrl) {
    const response = await window.fetch(manifestUrl, {
      cache: "no-cache",
    });

    if (response.ok) {
      if (/\.html(?:[?#].*)?$/i.test(String(manifestUrl || ""))) {
        return {
          manifest_files: extractManifestFilesFromHtml(await response.text()),
          manifest_md5: [],
        };
      }

      const manifestData = await response.json();
      const manifestFiles = Array.isArray(manifestData?.manifestFiles)
        ? manifestData.manifestFiles
        : [];
      const manifestFilesMD5 = Array.isArray(manifestData?.manifestFilesMD5)
        ? manifestData.manifestFilesMD5
        : [];
      return {
        manifest_files: manifestFiles,
        manifest_md5: manifestFilesMD5,
      };
    }

    const indexUrl = String(manifestUrl || "").replace(/runner\.json(?:[?#].*)?$/i, "index.html");
    try {
      const indexResponse = await window.fetch(indexUrl, {
        cache: "no-cache",
      });
      if (indexResponse.ok) {
        const embeddedFiles = extractManifestFilesFromHtml(await indexResponse.text());
        if (embeddedFiles.length > 0) {
          return {
            manifest_files: embeddedFiles,
            manifest_md5: [],
          };
        }
      }
    } catch (indexError) {
      console.warn(`Unable to load embedded manifest fallback for ${manifestUrl}:`, indexError);
    }

    return {
      manifest_files: getFallbackManifestFilesForUrl(manifestUrl),
      manifest_md5: [],
    };
  }

  async function buildOfflineProtectedEntries() {
    const protectedEntryMap = new Map();

    for (const scopePlan of offlineScopePlans) {
      const {
        manifest_files: manifestFiles,
        manifest_md5: manifestMd5,
      } = await loadManifestFiles(scopePlan.manifest_url);

      for (let fileIndex = 0; fileIndex < manifestFiles.length; fileIndex += 1) {
        const fileName = manifestFiles[fileIndex];
        const assetPath = normalizeAssetPath(fileName);
        const expectedMd5 = normalizeChecksumValue(manifestMd5[fileIndex]);

        if (!assetPath || skippedManifestFiles.has(assetPath)) {
          continue;
        }

        const cacheKey = getProtectedEntryCacheKey(assetPath, scopePlan.play_scope);

        if (!protectedEntryMap.has(cacheKey)) {
          protectedEntryMap.set(cacheKey, {
            asset_path: assetPath,
            play_scope: scopePlan.play_scope,
            scope_label: scopePlan.label,
            expected_md5: expectedMd5,
          });
        } else if (!protectedEntryMap.get(cacheKey)?.expected_md5 && expectedMd5) {
          protectedEntryMap.get(cacheKey).expected_md5 = expectedMd5;
        }
      }
    }

    const protectedEntries = Array.from(protectedEntryMap.values());
    const scopeTotals = new Map();
    const scopeProgress = new Map();

    for (const protectedEntry of protectedEntries) {
      const playScope = String(protectedEntry.play_scope);
      scopeTotals.set(playScope, (scopeTotals.get(playScope) || 0) + 1);
    }

    for (const protectedEntry of protectedEntries) {
      const playScope = String(protectedEntry.play_scope);
      const nextScopeIndex = (scopeProgress.get(playScope) || 0) + 1;
      scopeProgress.set(playScope, nextScopeIndex);
      protectedEntry.scope_index = nextScopeIndex;
      protectedEntry.scope_total = scopeTotals.get(playScope) || nextScopeIndex;
    }

    return protectedEntries;
  }

  async function getCachedProtectedAssetResponse(assetPath, playScope, assetCache = null) {
    if (!assetCache && !window.caches?.open) {
      return null;
    }

    try {
      const resolvedAssetCache = assetCache ?? await window.caches.open(offlineAssetCacheName);
      return await resolvedAssetCache.match(getProtectedAssetCacheUrl(assetPath, playScope)) ?? null;
    } catch (_cacheError) {
      return null;
    }
  }

  async function deleteCachedProtectedAssetResponse(assetPath, playScope, assetCache = null) {
    if (!assetCache && !window.caches?.open) {
      deleteStoredProtectedEntryChecksum(assetPath, playScope);
      return false;
    }

    try {
      const resolvedAssetCache = assetCache ?? await window.caches.open(offlineAssetCacheName);
      const deleted = await resolvedAssetCache.delete(getProtectedAssetCacheUrl(assetPath, playScope));
      deleteStoredProtectedEntryChecksum(assetPath, playScope);
      return deleted;
    } catch (_cacheError) {
      deleteStoredProtectedEntryChecksum(assetPath, playScope);
      return false;
    }
  }

  async function doesProtectedEntryMatchExpectedChecksum(protectedEntry, assetCache = null) {
    const expectedMd5 = normalizeChecksumValue(protectedEntry?.expected_md5);

    if (!expectedMd5) {
      return false;
    }

    const cachedResponse = await getCachedProtectedAssetResponse(
      protectedEntry.asset_path,
      protectedEntry.play_scope,
      assetCache,
    );

    if (!cachedResponse) {
      deleteStoredProtectedEntryChecksum(protectedEntry.asset_path, protectedEntry.play_scope);
      return false;
    }

    if (getStoredProtectedEntryChecksum(protectedEntry.asset_path, protectedEntry.play_scope) === expectedMd5) {
      return true;
    }

    const cachedBytes = await readResponseBytes(cachedResponse);
    const doesChecksumMatch = md5Bytes(cachedBytes) === expectedMd5;

    if (doesChecksumMatch) {
      setStoredProtectedEntryChecksum(
        protectedEntry.asset_path,
        protectedEntry.play_scope,
        expectedMd5,
      );
    } else {
      deleteStoredProtectedEntryChecksum(protectedEntry.asset_path, protectedEntry.play_scope);
    }

    return doesChecksumMatch;
  }

  async function runWithRetries(taskLabel, taskCallback) {
    let lastError = null;

    for (let attemptNumber = 1; attemptNumber <= maxAttemptsPerItem; attemptNumber += 1) {
      try {
        return await taskCallback(attemptNumber);
      } catch (error) {
        lastError = error;

        if (attemptNumber >= maxAttemptsPerItem) {
          break;
        }

        setDownloadState(
          `Retrying ${taskLabel}...`,
          `Attempt ${attemptNumber + 1}/${maxAttemptsPerItem}`,
        );
        await delay(retryDelayMs * attemptNumber);
      }
    }

    throw lastError ?? new Error(`Unable to finish ${taskLabel}.`);
  }

  function attachResultButtonActions() {
    [resultPrimaryButton, resultSecondaryButton].forEach((buttonNode, buttonIndex) => {
      buttonNode.addEventListener("click", () => {
        const action = state.resultButtons[buttonIndex]?.action;

        if (typeof action === "function") {
          action();
        }
      });
    });
  }

  async function startOfflineDownload(forceRefresh = false) {
    if (state.isDownloading) {
      return;
    }

    const isUpdateMode = forceRefresh === true;
    state.historyModeKey = isUpdateMode ? "update" : "install";

    const primeProtectedPlayAssetCache = window.primeProtectedPlayAssetCache
      ?? window.prime_protected_play_asset_cache;
    const ensureProtectedPlaySession = window.ensureProtectedPlaySession
      ?? window.ensure_protected_play_session;

    if (typeof primeProtectedPlayAssetCache !== "function") {
      showResultScreen(
        "Offline Mode Error",
        "The protected asset cache helper could not be loaded.",
        [
          {
            label: "Try Again",
            action: () => startOfflineDownload(isUpdateMode),
          },
          {
            label: "Back to /app",
            action: () => goToAppPage(),
          },
        ],
      );
      return;
    }

    if (typeof ensureProtectedPlaySession !== "function") {
      showResultScreen(
        "Offline Mode Error",
        "The protected session helper could not be loaded.",
        [
          {
            label: "Try Again",
            action: () => startOfflineDownload(isUpdateMode),
          },
          {
            label: "Back to /app",
            action: () => goToAppPage(),
          },
        ],
      );
      return;
    }

    const previousOfflineModeEnabled = isOfflineModeEnabled();
    activeOfflineSessionScopes.clear();
    showDownloadScreen();
    setDownloadState(isUpdateMode ? "Reading server checksums..." : "Reading game manifests...", "", {
      completedUnits: 0,
      currentUnitRatio: 0,
      totalUnits: 0,
    });
    markOfflineDownloadActive(true);

    try {
      await registerOfflineServiceWorker();
      let offlineShellChecksums = {};
      let protectedEntries = [];

      if (isUpdateMode) {
        try {
          const updateManifest = await loadOfflineUpdateManifestFromKeys();
          offlineShellChecksums = updateManifest.shell_checksums ?? {};
          protectedEntries = Array.isArray(updateManifest.protected_entries)
            ? updateManifest.protected_entries
            : [];
        } catch (updateManifestError) {
          console.warn("Unable to load the combined update manifest from keys, falling back to local manifests:", updateManifestError);
          offlineShellChecksums = await loadOfflineShellChecksums();
          protectedEntries = await buildOfflineProtectedEntries();
        }
      } else {
        protectedEntries = await buildOfflineProtectedEntries();
      }

      const shellCache = await caches.open(offlineShellCacheName);
      const assetCache = await caches.open(offlineAssetCacheName);
      state.totalUnits = offlineShellPaths.length + protectedEntries.length;
      state.completedUnits = 0;
      state.currentUnitRatio = 0;
      state.shellTotalUnits = offlineShellPaths.length;
      state.shellCompletedUnits = 0;
      state.protectedTotalUnits = protectedEntries.length;
      state.protectedCompletedUnits = 0;
      state.protectedTotalExpectedBytes = protectedEntries.reduce(
        (totalBytes, protectedEntry) => totalBytes + Math.max(0, Number(protectedEntry?.size_bytes) || 0),
        0,
      );
      state.protectedCompletedExpectedBytes = 0;
      state.activePhaseKey = "";
      updateDownloadProgressUi();

      for (let shellIndex = 0; shellIndex < offlineShellPaths.length; shellIndex += 1) {
        const shellPath = offlineShellPaths[shellIndex];
        const shellStatusText = isUpdateMode
          ? "Checking offline pages..."
          : "Preparing offline pages...";
        const shellStatusLabel = (currentRatio = 0) => formatShellPhaseStatusLabel(
          shellStatusText,
          shellIndex + 1,
          offlineShellPaths.length,
          currentRatio,
        );
        state.activePhaseKey = "shell";
        setDownloadState(
          shellStatusLabel(0),
          "",
          {
            completedUnits: state.completedUnits,
            totalUnits: state.totalUnits,
            currentUnitRatio: 0,
          },
        );

        await runWithRetries(`shell file ${shellPath}`, async () => {
          await cacheShellPath(shellCache, shellPath, {
            forceServerCheck: isUpdateMode,
            expectedChecksum: offlineShellChecksums[shellPath],
            onProgress(progressState) {
              const currentRatio = (Number(progressState?.total_bytes) || 0) > 0
                ? Math.max(0, Math.min(1, (Number(progressState?.downloaded_bytes) || 0) / Number(progressState?.total_bytes)))
                : 0;
              setDownloadState(
                shellStatusLabel(currentRatio),
                "",
                {
                  completedUnits: state.completedUnits,
                  totalUnits: state.totalUnits,
                  currentUnitRatio: currentRatio,
                  downloadedBytes: progressState?.downloaded_bytes,
                  totalBytes: progressState?.total_bytes,
                },
              );
            },
          });
        });

        state.completedUnits += 1;
        state.shellCompletedUnits += 1;
        state.currentUnitRatio = 0;
        state.downloadedBytes = 0;
        state.totalBytes = 0;
        updateDownloadProgressUi();
      }

      for (let assetIndex = 0; assetIndex < protectedEntries.length; assetIndex += 1) {
        const protectedEntry = protectedEntries[assetIndex];
        const sectionLabel = formatSectionProgressLabel(protectedEntry, 0);
        state.activePhaseKey = "protected";
        setDownloadState(
          isUpdateMode ? "Checking game files..." : "Requesting file...",
          sectionLabel,
          {
            completedUnits: state.completedUnits,
            totalUnits: state.totalUnits,
            currentUnitRatio: 0,
          },
        );

        if (isUpdateMode && await doesProtectedEntryMatchExpectedChecksum(protectedEntry, assetCache)) {
          setStoredProtectedEntryChecksum(
            protectedEntry.asset_path,
            protectedEntry.play_scope,
            protectedEntry.expected_md5,
          );
          state.completedUnits += 1;
          state.protectedCompletedUnits += 1;
          state.protectedCompletedExpectedBytes += Math.max(0, Number(protectedEntry?.size_bytes) || 0);
          state.currentUnitRatio = 0;
          state.downloadedBytes = 0;
          state.totalBytes = 0;
          updateDownloadProgressUi();
          continue;
        }

        if (isUpdateMode) {
          await deleteCachedProtectedAssetResponse(
            protectedEntry.asset_path,
            protectedEntry.play_scope,
            assetCache,
          );
        }

        await ensureProtectedPlaySession(protectedEntry.play_scope, { persistent: true });
        activeOfflineSessionScopes.add(protectedEntry.play_scope);
        await runWithRetries(`protected asset ${protectedEntry.asset_path}`, async () => {
          await primeProtectedPlayAssetCache(protectedEntry.asset_path, protectedEntry.play_scope, {
            session_options: {
              persistent: true,
            },
            on_status(message) {
              setDownloadState(
                normalizeProtectedDownloadStatusText(message),
                formatSectionProgressLabel(protectedEntry, state.currentUnitRatio),
                {
                  completedUnits: state.completedUnits,
                  totalUnits: state.totalUnits,
                  currentUnitRatio: state.currentUnitRatio,
                  downloadedBytes: state.downloadedBytes,
                  totalBytes: state.totalBytes,
                },
              );
            },
            on_progress(progressState) {
              const totalBytes = Number(progressState?.total_bytes) || 0;
              const downloadedBytes = Number(progressState?.downloaded_bytes) || 0;
              const currentRatio = totalBytes > 0
                ? Math.max(0, Math.min(1, downloadedBytes / totalBytes))
                : 0;

              setDownloadState(
                downloadedBytes > 0
                  ? "Downloading game files..."
                  : "Requesting game files...",
                formatSectionProgressLabel(protectedEntry, currentRatio),
                {
                  completedUnits: state.completedUnits,
                  totalUnits: state.totalUnits,
                  currentUnitRatio: currentRatio,
                  downloadedBytes,
                  totalBytes,
                },
              );
            },
          });
        });

        setStoredProtectedEntryChecksum(
          protectedEntry.asset_path,
          protectedEntry.play_scope,
          protectedEntry.expected_md5,
        );

        state.completedUnits += 1;
        state.protectedCompletedUnits += 1;
        state.protectedCompletedExpectedBytes += Math.max(0, Number(protectedEntry?.size_bytes) || 0);
        state.currentUnitRatio = 0;
        state.downloadedBytes = 0;
        state.totalBytes = 0;
        updateDownloadProgressUi();
      }

      setOfflineModeEnabled(true);
      markOfflineDownloadActive(false);
      await closeActiveOfflineSessions();
      state.totalUnits = Math.max(1, state.totalUnits);
      state.completedUnits = state.totalUnits;
      state.currentUnitRatio = 0;
      state.shellCompletedUnits = state.shellTotalUnits;
      state.protectedCompletedUnits = state.protectedTotalUnits;
      state.activePhaseKey = "";
      state.statusText = isUpdateMode
        ? "Offline assets are now up to date."
        : "Offline Mode is now enabled.";
      state.fileText = "";
      state.downloadedBytes = 0;
      state.totalBytes = 0;
      getOfflineLoader()?.finish?.({
        total_units: state.totalUnits,
        history_mode_key: state.historyModeKey,
        status_text: state.statusText,
        file_text: state.fileText,
      });
      window.setTimeout(() => {
        goToAppPage();
      }, 120);
    } catch (error) {
      console.error("Offline Mode download failed:", error);
      setOfflineModeEnabled(previousOfflineModeEnabled);
      markOfflineDownloadActive(false);
      await closeActiveOfflineSessions();

      if (error?.message === "Verification required.") {
        goToVerificationPage();
        return;
      }

      showResultScreen(
        "Offline Mode Error",
        `${error?.message || "Offline Mode could not be enabled."}\n\nYou can try again or head back to /app.`,
        [
          {
            label: "Try Again",
            action: () => startOfflineDownload(isUpdateMode),
          },
          {
            label: "Back to /app",
            action: () => goToAppPage(),
          },
        ],
      );
    }
  }

  function handleWarningConfirm() {
    const selectedButton = getVisibleWarningButtons()[state.warningSelectionIndex] ?? null;

    if (typeof selectedButton?.action === "function") {
      selectedButton.action();
    }
  }

  function handleResultConfirm() {
    const visibleButtons = state.resultButtons.filter((button) => !button.hidden);
    const selectedButton = visibleButtons[state.resultSelectionIndex] ?? null;

    if (typeof selectedButton?.action === "function") {
      selectedButton.action();
    }
  }

  function handleKeyboardInput(event) {
    setOfflineInputMode("keyboard");

    if (state.phase === "downloading") {
      return;
    }

    const key = String(event.key ?? "");
    const isConfirm = key === "Enter" || key === "z" || key === "Z";
    const isCancel = key === "Escape" || key === "Backspace" || key === "x" || key === "X";
    const wantsPrevious = key === "ArrowLeft" || key === "ArrowUp";
    const wantsNext = key === "ArrowRight" || key === "ArrowDown";

    if (state.phase === "warning") {
      const visibleButtons = getVisibleWarningButtons();

      if (visibleButtons.length > 1 && (wantsPrevious || wantsNext)) {
        event.preventDefault();
        const delta = wantsPrevious ? -1 : 1;
        const nextIndex = (state.warningSelectionIndex + delta + visibleButtons.length) % visibleButtons.length;
        setWarningSelection(nextIndex);
        return;
      }

      if (isConfirm) {
        event.preventDefault();
        handleWarningConfirm();
        return;
      }

      if (isCancel) {
        event.preventDefault();
        goToAppPage();
      }

      return;
    }

    if (state.phase === "result") {
      const visibleButtons = state.resultButtons.filter((button) => !button.hidden);

      if (visibleButtons.length > 1 && (wantsPrevious || wantsNext)) {
        event.preventDefault();
        setResultSelection(state.resultSelectionIndex === 0 ? 1 : 0);
        return;
      }

      if (isConfirm) {
        event.preventDefault();
        handleResultConfirm();
        return;
      }

      if (isCancel) {
        event.preventDefault();
        const fallbackAction = visibleButtons[visibleButtons.length - 1]?.action
          ?? visibleButtons[0]?.action;

        if (typeof fallbackAction === "function") {
          fallbackAction();
        }
      }
    }
  }

  function attachWarningActions() {
    warningYesButton.addEventListener("click", () => {
      setWarningSelection(getVisibleWarningButtons().findIndex((button) => button.node === warningYesButton));
      handleWarningConfirm();
    });

    warningNoButton.addEventListener("click", () => {
      setWarningSelection(getVisibleWarningButtons().findIndex((button) => button.node === warningNoButton));
      handleWarningConfirm();
    });

    warningThirdButton.addEventListener("click", () => {
      setWarningSelection(getVisibleWarningButtons().findIndex((button) => button.node === warningThirdButton));
      handleWarningConfirm();
    });
  }

  function init() {
    markOfflineDownloadActive(false);
    attachWarningActions();
    attachResultButtonActions();
    publishOfflineModeDebugHelpers();
    loaderFrameNode?.addEventListener("load", () => {
      if (state.phase === "downloading") {
        startTimerUpdates();
        updateDownloadProgressUi();
      }

      syncOfflineInputMode();
    });
    window.addEventListener("keydown", handleKeyboardInput);
    window.addEventListener("blur", () => {
      lastGamepadState.clear();
    });
    window.addEventListener("beforeunload", () => {
      clearAutoReturnTimer();
      closeActiveOfflineSessions();
    });
    window.addEventListener("pagehide", () => {
      clearAutoReturnTimer();
      closeActiveOfflineSessions();
    });
    syncOfflineInputMode();
    startGamepadLoop();
    initializeWarningMode().catch((error) => {
      console.warn("Unable to initialize the Offline Mode warning:", error);
      setWarningMode("enable");
    });
  }

  async function initializeWarningMode() {
    const hasOfflineCache = await isOfflineModeCacheReady();

    if (!hasOfflineCache && isOfflineModeEnabled()) {
      setOfflineModeEnabled(false);
    }

    if (isOfflineModeEnabled() && hasOfflineCache) {
      const cacheBytes = await readOfflineModeCacheBytes();
      setWarningMode("manage", { cacheBytes });
      return;
    }

    setWarningMode("enable");
  }

  init();
})();
