(function initOfflineModeLoader() {
  const timerIntervalMs = 250;
  const timerMetricsRefreshIntervalMs = 1000;
  const timerDisplayEtaPaddingMs = 4000;
  const minimumVisibleEtaMs = 1000;
  const historyStorageKey = "dr-offline-loader-history-v1";
  const idleDownloadIndicatorFrames = ["·", "₊", "⊹", "˖", "✧", "˖", "⊹", "₊"];
  const maxStatusLength = 120;

  const state = {
    started: false,
    timerIntervalId: null,
    totalUnits: 0,
    completedUnits: 0,
    currentUnitRatio: 0,
    overallProgressFraction: -1,
    etaPhaseKey: "",
    historyModeKey: "install",
    totalExpectedBytes: 0,
    completedExpectedBytes: 0,
    startedAtMs: 0,
    activeDownloadedBytes: 0,
    activeTotalBytes: 0,
    activeFirstByteAtMs: 0,
    activeSmoothedBytesPerMs: 0,
    activeLastSampleAtMs: 0,
    activeLastSampleDownloadedBytes: 0,
    displayedBytesPerSecond: 0,
    displayedEtaRemainingSeconds: 0,
    lastMetricsRefreshAtMs: 0,
    lastEtaRemainingMs: 0,
    lastEtaElapsedMs: 0,
    statusText: "",
    fileText: "",
    historyProfile: {
      runs: 0,
      lastDurationMs: 0,
      averageDurationMs: 0,
      averageBytesPerMs: 0,
    },
  };

  let loadingScreen = null;
  let statusElement = null;
  let timerElement = null;
  let progressBar = null;
  let gifElement = null;
  let stageElement = null;
  let loaderUiElement = null;
  let resizeHandlerAttached = false;
  let currentProgressPercent = 0;

  function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function cacheElements() {
    loadingScreen = document.getElementById("loadah");
    statusElement = document.getElementById("loadahstatus");
    timerElement = document.getElementById("loadah-timer");
    progressBar = document.getElementById("progressbar");
    gifElement = document.getElementById("tobyload");
    stageElement = document.getElementById("loadah-stage");
    loaderUiElement = document.getElementById("loadah-ui");
    const progressContainer = document.getElementById("progressbar-container");

    if (!loadingScreen || !gifElement || !statusElement || !progressContainer) {
      return false;
    }

    if (!stageElement) {
      stageElement = document.createElement("div");
      stageElement.id = "loadah-stage";
    }

    if (stageElement.parentElement !== loadingScreen) {
      if (gifElement.parentElement === loadingScreen) {
        loadingScreen.insertBefore(stageElement, gifElement);
      } else {
        loadingScreen.appendChild(stageElement);
      }
    }

    if (!loaderUiElement) {
      loaderUiElement = document.createElement("div");
      loaderUiElement.id = "loadah-ui";
    }

    if (loaderUiElement.parentElement !== stageElement) {
      stageElement.appendChild(loaderUiElement);
    }

    if (!timerElement) {
      timerElement = document.createElement("div");
      timerElement.id = "loadah-timer";
      timerElement.hidden = true;
    }

    if (gifElement.parentElement !== stageElement) {
      stageElement.insertBefore(gifElement, loaderUiElement);
    }

    if (progressContainer.parentElement !== loaderUiElement) {
      loaderUiElement.appendChild(progressContainer);
    }

    if (timerElement.parentElement !== loaderUiElement) {
      loaderUiElement.insertBefore(timerElement, progressContainer);
    }

    if (statusElement.parentElement !== loaderUiElement) {
      loaderUiElement.appendChild(statusElement);
    }

    updateLoaderLayout();
    return true;
  }

  function createEmptyHistoryBucket() {
    return {
      runs: 0,
      lastDurationMs: 0,
      totalDurationMs: 0,
      totalExpectedBytes: 0,
    };
  }

  function normalizeHistoryModeKey(modeKey) {
    const normalizedModeKey = String(modeKey ?? "").trim().toLowerCase();
    return normalizedModeKey || "install";
  }

  function readHistoryStore() {
    try {
      const parsedHistory = JSON.parse(window.localStorage.getItem(historyStorageKey) || "null");

      if (parsedHistory && typeof parsedHistory === "object") {
        if (parsedHistory.modes && typeof parsedHistory.modes === "object") {
          return {
            modes: parsedHistory.modes,
          };
        }

        return {
          modes: {
            install: {
              runs: Math.max(0, Number(parsedHistory.runs) || 0),
              lastDurationMs: Math.max(0, Number(parsedHistory.lastDurationMs) || 0),
              totalDurationMs: Math.max(0, Number(parsedHistory.totalDurationMs) || 0),
              totalExpectedBytes: Math.max(0, Number(parsedHistory.totalExpectedBytes) || 0),
            },
          },
        };
      }
    } catch (_historyError) {
    }

    return {
      modes: {},
    };
  }

  function readHistoryProfile(modeKey = state.historyModeKey) {
    const historyStore = readHistoryStore();
    const historyBucket = historyStore.modes?.[normalizeHistoryModeKey(modeKey)] ?? createEmptyHistoryBucket();
    const runs = Math.max(0, Number(historyBucket.runs) || 0);
    const lastDurationMs = Math.max(0, Number(historyBucket.lastDurationMs) || 0);
    const totalDurationMs = Math.max(0, Number(historyBucket.totalDurationMs) || 0);
    const totalExpectedBytes = Math.max(0, Number(historyBucket.totalExpectedBytes) || 0);
    const averageDurationMs = runs > 0 ? (totalDurationMs / runs) : 0;
    const averageBytesPerMs = totalDurationMs > 0 ? (totalExpectedBytes / totalDurationMs) : 0;

    return {
      runs,
      lastDurationMs,
      averageDurationMs,
      averageBytesPerMs,
    };
  }

  function writeHistorySample(totalExpectedBytes, modeKey = state.historyModeKey) {
    const normalizedExpectedBytes = Math.max(0, Number(totalExpectedBytes) || 0);
    const elapsedMs = Math.max(0, performance.now() - state.startedAtMs);

    if (normalizedExpectedBytes <= 0 || elapsedMs <= 0) {
      return;
    }

    const historyStore = readHistoryStore();
    const normalizedModeKey = normalizeHistoryModeKey(modeKey);
    const previousHistory = historyStore.modes?.[normalizedModeKey] ?? createEmptyHistoryBucket();

    const nextHistory = {
      runs: Math.max(0, Number(previousHistory.runs) || 0) + 1,
      lastDurationMs: elapsedMs,
      totalDurationMs: Math.max(0, Number(previousHistory.totalDurationMs) || 0) + elapsedMs,
      totalExpectedBytes: Math.max(0, Number(previousHistory.totalExpectedBytes) || 0) + normalizedExpectedBytes,
    };

    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify({
        modes: {
          ...historyStore.modes,
          [normalizedModeKey]: nextHistory,
        },
      }));
    } catch (_historyError) {
    }

    state.historyProfile = readHistoryProfile(normalizedModeKey);
  }

  function ensureResizeHandler() {
    if (resizeHandlerAttached) {
      return;
    }

    const handleResize = () => {
      updateLoaderLayout();
      setLoaderProgress(currentProgressPercent);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    resizeHandlerAttached = true;
  }

  function updateLoaderLayout() {
    if (!stageElement) {
      return;
    }

    const stageRect = stageElement.getBoundingClientRect();
    const stageWidth = stageRect.width || 640;
    const stageHeight = stageRect.height || 480;

    stageElement.style.setProperty("--loadah-ui-width", `${Math.round(stageWidth * 0.82)}px`);
    stageElement.style.setProperty("--loadah-ui-bottom", `${Math.round(clampNumber(stageHeight * 0.1325, 58, stageHeight * 0.19))}px`);
    stageElement.style.setProperty("--loadah-ui-gap", `${Math.round(clampNumber(stageHeight * 0.016, 8, 16))}px`);
    stageElement.style.setProperty("--loadah-ui-padding-x", `${Math.round(clampNumber(stageWidth * 0.01, 6, 18))}px`);
    stageElement.style.setProperty("--loadah-timer-size", `${Math.round(clampNumber(stageHeight * 0.03, 13, 24))}px`);
    stageElement.style.setProperty("--loadah-status-size", `${Math.round(clampNumber(stageHeight * 0.034, 14, 28))}px`);
    stageElement.style.setProperty("--loadah-progress-height", `${Math.round(clampNumber(stageHeight * 0.05, 18, 36))}px`);
  }

  function stopTimerLoop() {
    if (state.timerIntervalId !== null) {
      window.clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }
  }

  function startTimerLoop() {
    stopTimerLoop();
    state.timerIntervalId = window.setInterval(() => {
      render();
    }, timerIntervalMs);
  }

  function formatDurationClock(totalSecondsValue) {
    const normalizedTotalSeconds = Number(totalSecondsValue) || 0;
    const isNegative = normalizedTotalSeconds < 0;
    const totalSeconds = Math.abs(Math.trunc(normalizedTotalSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedDuration = minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `0:${String(seconds).padStart(2, "0")}`;

    return isNegative ? `-${formattedDuration}` : formattedDuration;
  }

  function getSignedEtaRemainingSeconds(remainingMs) {
    const normalizedRemainingMs = Number(remainingMs) || 0;

    if (normalizedRemainingMs === 0) {
      return 0;
    }

    return normalizedRemainingMs > 0
      ? Math.ceil(normalizedRemainingMs / 1000)
      : -Math.ceil(Math.abs(normalizedRemainingMs) / 1000);
  }

  function formatByteQuantity(byteCount) {
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

  function formatByteRate(bytesPerSecond) {
    const normalizedRate = Math.max(0, Number(bytesPerSecond) || 0);
    return normalizedRate > 0 ? `${formatByteQuantity(normalizedRate)}/s` : "✓";
  }

  function formatPercent(value) {
    return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  }

  function getIdleDownloadIndicator() {
    const frameIndex = Math.floor(Date.now() / 125) % idleDownloadIndicatorFrames.length;
    return idleDownloadIndicatorFrames[frameIndex];
  }

  function getCurrentDownloadBytesPerSecond() {
    return Math.max(0, Number(state.activeSmoothedBytesPerMs) || 0) * 1000;
  }

  function resetEtaState(clearDisplayedMetrics = false) {
    state.lastEtaRemainingMs = 0;
    state.lastEtaElapsedMs = 0;
    state.lastMetricsRefreshAtMs = 0;

    if (clearDisplayedMetrics) {
      state.displayedEtaRemainingSeconds = 0;
      state.displayedBytesPerSecond = 0;
    }
  }

  function getActiveDownloadElapsedMs() {
    const startedAtMs = state.activeFirstByteAtMs > 0 ? state.activeFirstByteAtMs : 0;
    return startedAtMs > 0 ? Math.max(0, performance.now() - startedAtMs) : 0;
  }

  function getEffectiveDownloadBytesPerMs() {
    const liveBytesPerMs = Math.max(0, Number(state.activeSmoothedBytesPerMs) || 0);
    const historyBytesPerMs = Math.max(0, Number(state.historyProfile?.averageBytesPerMs) || 0);

    if (liveBytesPerMs <= 0) {
      return historyBytesPerMs;
    }

    const activeTotalBytes = Math.max(0, Number(state.activeTotalBytes) || 0);
    const activeDownloadedBytes = Math.max(0, Number(state.activeDownloadedBytes) || 0);
    const observedProgressFraction = activeTotalBytes > 0
      ? clampNumber(activeDownloadedBytes / activeTotalBytes, 0, 1)
      : 0;
    const elapsedMs = getActiveDownloadElapsedMs();
    const warmupFraction = clampNumber(elapsedMs / 2200, 0, 1);
    const liveWeight = clampNumber(
      Math.max((warmupFraction * 0.82), observedProgressFraction * 1.15),
      0.6,
      0.96,
    );
    const cappedHistoryBytesPerMs = historyBytesPerMs > 0
      ? Math.min(historyBytesPerMs, liveBytesPerMs * 1.35)
      : 0;

    return (cappedHistoryBytesPerMs * (1 - liveWeight)) + (liveBytesPerMs * liveWeight);
  }

  function refreshDisplayedDownloadMetrics(force = false) {
    const nowMs = performance.now();

    if (
      !force
      && state.lastMetricsRefreshAtMs > 0
      && (nowMs - state.lastMetricsRefreshAtMs) < timerMetricsRefreshIntervalMs
    ) {
      return;
    }

    const progressFraction = getOverallProgressFraction();
    const nextDisplayedEtaRemainingSeconds = getSignedEtaRemainingSeconds(
      computeRemainingEtaMs(progressFraction) + timerDisplayEtaPaddingMs,
    );
    const previousDisplayedEtaRemainingSeconds = getLiveDisplayedEtaRemainingSeconds();
    state.displayedBytesPerSecond = getCurrentDownloadBytesPerSecond();
    state.displayedEtaRemainingSeconds = state.lastMetricsRefreshAtMs > 0
      ? Math.min(previousDisplayedEtaRemainingSeconds, nextDisplayedEtaRemainingSeconds)
      : nextDisplayedEtaRemainingSeconds;
    state.lastMetricsRefreshAtMs = nowMs;
  }

  function getLiveDisplayedEtaRemainingSeconds() {
    const baseRemainingSeconds = Math.trunc(Number(state.displayedEtaRemainingSeconds) || 0);

    if (state.lastMetricsRefreshAtMs <= 0) {
      return baseRemainingSeconds;
    }

    const elapsedSeconds = Math.floor(Math.max(0, performance.now() - state.lastMetricsRefreshAtMs) / 1000);
    return baseRemainingSeconds - elapsedSeconds;
  }

  function getUnitBasedProgressFraction() {
    const totalUnits = Math.max(0, state.totalUnits);
    const completedUnits = Math.max(0, Math.min(state.completedUnits, totalUnits));
    const currentUnitRatio = Math.max(0, Math.min(1, state.currentUnitRatio));
    return totalUnits > 0
      ? clampNumber((completedUnits + currentUnitRatio) / totalUnits, 0, 1)
      : 0;
  }

  function getOverallProgressFraction() {
    if (Number.isFinite(state.overallProgressFraction) && state.overallProgressFraction >= 0) {
      return clampNumber(state.overallProgressFraction, 0, 1);
    }

    return getUnitBasedProgressFraction();
  }

  function resetActiveDownloadMetrics() {
    state.activeDownloadedBytes = 0;
    state.activeTotalBytes = 0;
    state.activeFirstByteAtMs = 0;
    state.activeSmoothedBytesPerMs = 0;
    state.activeLastSampleAtMs = 0;
    state.activeLastSampleDownloadedBytes = 0;
  }

  function updateActiveDownloadProgress(downloadedBytes, totalBytes = 0) {
    const nowMs = performance.now();
    const previousDownloadedBytes = Math.max(0, Number(state.activeDownloadedBytes) || 0);
    state.activeDownloadedBytes = Math.max(0, Number(downloadedBytes) || 0);

    if (state.activeDownloadedBytes <= 0) {
      resetActiveDownloadMetrics();
      return;
    }

    if (state.activeFirstByteAtMs <= 0) {
      state.activeFirstByteAtMs = nowMs;
      state.activeLastSampleAtMs = nowMs;
      state.activeLastSampleDownloadedBytes = state.activeDownloadedBytes;
    }

    if ((Number(totalBytes) || 0) > 0) {
      state.activeTotalBytes = Math.max(0, Number(totalBytes) || 0);
    }

    if (state.activeDownloadedBytes > previousDownloadedBytes && state.activeLastSampleAtMs > 0) {
      const sampleElapsedMs = Math.max(1, nowMs - state.activeLastSampleAtMs);
      const sampleDownloadedBytes = state.activeDownloadedBytes - state.activeLastSampleDownloadedBytes;

      if (sampleDownloadedBytes > 0) {
        const sampleSpeedBytesPerMs = sampleDownloadedBytes / sampleElapsedMs;
        state.activeSmoothedBytesPerMs = state.activeSmoothedBytesPerMs > 0
          ? ((state.activeSmoothedBytesPerMs * 0.72) + (sampleSpeedBytesPerMs * 0.28))
          : sampleSpeedBytesPerMs;
        state.activeLastSampleAtMs = nowMs;
        state.activeLastSampleDownloadedBytes = state.activeDownloadedBytes;
      }
    }
  }

  function computeRemainingEtaMs(progressFraction) {
    const elapsedMs = Math.max(0, performance.now() - state.startedAtMs);
    const normalizedTotalExpectedBytes = Math.max(0, Number(state.totalExpectedBytes) || 0);
    const normalizedCompletedExpectedBytes = Math.max(0, Number(state.completedExpectedBytes) || 0);

    if (progressFraction >= 1) {
      state.lastEtaRemainingMs = 0;
      state.lastEtaElapsedMs = elapsedMs;
      return 0;
    }

    let rawRemainingMs = 0;
    const currentBytesPerSecond = getCurrentDownloadBytesPerSecond();
    const effectiveBytesPerMs = getEffectiveDownloadBytesPerMs();

    if (state.etaPhaseKey === "protected" && normalizedTotalExpectedBytes > 0 && effectiveBytesPerMs > 0) {
      const remainingExpectedBytes = Math.max(
        0,
        normalizedTotalExpectedBytes
          - normalizedCompletedExpectedBytes
          - Math.max(0, Number(state.activeDownloadedBytes) || 0),
      );

      rawRemainingMs = remainingExpectedBytes / effectiveBytesPerMs;
    }

    if (rawRemainingMs <= 0 && state.activeTotalBytes > state.activeDownloadedBytes && effectiveBytesPerMs > 0) {
      rawRemainingMs = Math.max(
        0,
        (state.activeTotalBytes - state.activeDownloadedBytes) / effectiveBytesPerMs,
      );
    }

    if (progressFraction > 0.01 && elapsedMs > 0) {
      const progressBasedRemainingMs = (elapsedMs * (1 - progressFraction)) / Math.max(progressFraction, 0.01);
      rawRemainingMs = rawRemainingMs > 0
        ? ((rawRemainingMs * 0.84) + (progressBasedRemainingMs * 0.16))
        : progressBasedRemainingMs;
    }

    const recentRunRemainingMs = Math.max(
      0,
      Math.max(0, Number(state.historyProfile?.lastDurationMs) || 0) - elapsedMs,
    );

    if (recentRunRemainingMs > 0) {
      rawRemainingMs = rawRemainingMs > 0
        ? ((rawRemainingMs * 0.42) + (recentRunRemainingMs * 0.58))
        : recentRunRemainingMs;
    }

    if (currentBytesPerSecond > 0 && state.activeTotalBytes > state.activeDownloadedBytes) {
      const currentRemainingMs = ((state.activeTotalBytes - state.activeDownloadedBytes) / currentBytesPerSecond) * 1000;

      rawRemainingMs = rawRemainingMs > 0
        ? ((rawRemainingMs * 0.86) + (currentRemainingMs * 0.14))
        : currentRemainingMs;
    }

    if (rawRemainingMs <= 0 && state.completedUnits > 0) {
      const averageUnitMs = elapsedMs / Math.max(1, state.completedUnits);
      const remainingUnits = Math.max(0, state.totalUnits - state.completedUnits);
      rawRemainingMs = averageUnitMs * remainingUnits;
    }

    if (rawRemainingMs <= 0) {
      return 0;
    }

    let nextRemainingMs = Math.max(minimumVisibleEtaMs, rawRemainingMs);

    if (state.lastEtaElapsedMs > 0 && state.lastEtaRemainingMs > 0) {
      const elapsedSinceLastMs = Math.max(0, elapsedMs - state.lastEtaElapsedMs);
      const decayedPreviousRemainingMs = Math.max(0, state.lastEtaRemainingMs - elapsedSinceLastMs);
      const smoothingAlpha = clampNumber(0.14 + (progressFraction * 0.18), 0.14, 0.32);
      nextRemainingMs = decayedPreviousRemainingMs
        + ((nextRemainingMs - decayedPreviousRemainingMs) * smoothingAlpha);
      nextRemainingMs = Math.max(nextRemainingMs, minimumVisibleEtaMs);
    }

    state.lastEtaRemainingMs = nextRemainingMs;
    state.lastEtaElapsedMs = elapsedMs;
    return nextRemainingMs;
  }

  function normalizeLoaderStatusMessage(message) {
    const normalizedMessage = String(message ?? "").replace(/\s+/g, " ").trim();

    if (!normalizedMessage) {
      return "";
    }

    if (/^requesting file:\s+/i.test(normalizedMessage)) {
      return "Requesting game files...";
    }

    if (/^downloading file:\s+/i.test(normalizedMessage)) {
      return "Downloading game files...";
    }

    if (/^prepared\s+/i.test(normalizedMessage)) {
      return "Preparing game files...";
    }

    if (/^using cached asset:\s+/i.test(normalizedMessage)) {
      return "Using cached game files...";
    }

    const longHexTokenCount = (normalizedMessage.match(/\b[0-9a-f]{8,}\b/gi) || []).length;
    const letterCount = (normalizedMessage.match(/[a-z]/gi) || []).length;
    const looksLikeHexDump = /^(?:[0-9a-f.]{2,}\s+){2,}[0-9a-f.\s]+$/i.test(normalizedMessage);
    const looksLikeRunnerByteProgress = /^loaded\s+\d+%\s+\(\d+\s+of\s+\d+\)\s+bytes$/i.test(normalizedMessage);

    if (looksLikeRunnerByteProgress) {
      return "Loadin' up!";
    }

    if ((looksLikeHexDump || longHexTokenCount >= 2) && letterCount < 8) {
      return "Loadin' up!";
    }

    return normalizedMessage;
  }

  function truncateStatusLine(line) {
    const normalizedLine = String(line ?? "").trim();
    return normalizedLine.length > maxStatusLength
      ? `${normalizedLine.slice(0, maxStatusLength)}...`
      : normalizedLine;
  }

  function setLoaderStatus(statusText, fileText) {
    if (!statusElement) {
      return;
    }

    const normalizedStatus = truncateStatusLine(normalizeLoaderStatusMessage(statusText));
    const normalizedFile = truncateStatusLine(String(fileText ?? "").trim());
    const lines = [normalizedStatus, normalizedFile].filter(Boolean);

    statusElement.replaceChildren();

    if (lines.length === 0) {
      statusElement.textContent = "";
      return;
    }

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        statusElement.appendChild(document.createElement("br"));
      }

      statusElement.appendChild(document.createTextNode(line));
    });
  }

  function updateTimerText(force = false) {
    if (!timerElement) {
      return;
    }

    const totalUnits = Math.max(0, state.totalUnits);
    const progressFraction = getOverallProgressFraction();
    const progressPercent = progressFraction * 100;
    refreshDisplayedDownloadMetrics(force);
    const displayedBytesPerSecond = Math.max(0, Number(state.displayedBytesPerSecond) || 0);
    const displayedEtaRemainingSeconds = getLiveDisplayedEtaRemainingSeconds();
    const downloadIndicator = progressFraction >= 1
      ? "✓"
      : (displayedBytesPerSecond > 0 ? formatByteRate(displayedBytesPerSecond) : getIdleDownloadIndicator());

    timerElement.hidden = false;
    timerElement.textContent = totalUnits > 0
      ? `Loading... ${formatPercent(progressPercent)} (ETA: ${formatDurationClock(displayedEtaRemainingSeconds)} / ↓ ${downloadIndicator})`
      : "Preparing Offline Mode...";
  }

  function setLoaderProgress(progressPercent) {
    currentProgressPercent = Math.max(0, Math.min(100, Number(progressPercent) || 0));

    if (!progressBar || !gifElement) {
      updateTimerText();
      return;
    }

    progressBar.style.width = `${currentProgressPercent}%`;

    const stageRect = stageElement?.getBoundingClientRect?.();
    const stageHeight = stageRect?.height || window.innerHeight || 480;
    const startY = -Math.round(stageHeight * 0.92);
    const endY = -Math.round(stageHeight * 0.38);
    const currentY = startY + ((endY - startY) * (currentProgressPercent / 100));
    gifElement.style.transform = `translateX(-50%) translateY(${currentY}px)`;

    updateTimerText();
  }

  function render() {
    if (!cacheElements()) {
      return;
    }

    const progressFraction = getOverallProgressFraction();

    loadingScreen.classList.remove("hidden");
    setLoaderProgress(progressFraction * 100);
    setLoaderStatus(state.statusText, state.fileText);
  }

  function start(options = {}) {
    if (!cacheElements()) {
      return;
    }

    ensureResizeHandler();
    state.started = true;
    state.startedAtMs = performance.now();
    state.totalUnits = 0;
    state.completedUnits = 0;
    state.currentUnitRatio = 0;
    state.overallProgressFraction = -1;
    state.etaPhaseKey = "";
    state.historyModeKey = normalizeHistoryModeKey(options.history_mode_key);
    state.totalExpectedBytes = 0;
    state.completedExpectedBytes = 0;
    state.statusText = "Preparing Offline Mode...";
    state.fileText = "";
    state.displayedBytesPerSecond = 0;
    state.displayedEtaRemainingSeconds = 0;
    resetEtaState(true);
    state.historyProfile = readHistoryProfile(state.historyModeKey);
    resetActiveDownloadMetrics();
    startTimerLoop();
    render();
  }

  function stop() {
    stopTimerLoop();
    state.started = false;
  }

  function update(nextState = {}) {
    if (typeof nextState.total_units === "number") {
      state.totalUnits = nextState.total_units;
    }

    if (typeof nextState.completed_units === "number") {
      state.completedUnits = nextState.completed_units;
    }

    if (typeof nextState.current_unit_ratio === "number") {
      state.currentUnitRatio = nextState.current_unit_ratio;
    }

    if (typeof nextState.overall_progress_fraction === "number") {
      state.overallProgressFraction = nextState.overall_progress_fraction;
    }

    if (typeof nextState.eta_phase_key === "string") {
      state.etaPhaseKey = nextState.eta_phase_key;
    }

    if (typeof nextState.history_mode_key === "string") {
      const normalizedHistoryModeKey = normalizeHistoryModeKey(nextState.history_mode_key);

      if (normalizedHistoryModeKey !== state.historyModeKey) {
        state.historyModeKey = normalizedHistoryModeKey;
        state.historyProfile = readHistoryProfile(state.historyModeKey);
        resetEtaState(true);
      }
    }

    if (typeof nextState.total_expected_bytes === "number") {
      state.totalExpectedBytes = Math.max(0, Number(nextState.total_expected_bytes) || 0);
    }

    if (typeof nextState.completed_expected_bytes === "number") {
      state.completedExpectedBytes = Math.max(0, Number(nextState.completed_expected_bytes) || 0);
    }

    if (typeof nextState.status_text === "string") {
      state.statusText = nextState.status_text;
    }

    if (typeof nextState.file_text === "string") {
      state.fileText = nextState.file_text;
    }

    if (typeof nextState.downloaded_bytes === "number" || typeof nextState.total_bytes === "number") {
      updateActiveDownloadProgress(nextState.downloaded_bytes, nextState.total_bytes);
    }

    render();
  }

  function finish(nextState = {}) {
    if (typeof nextState.history_mode_key === "string") {
      state.historyModeKey = normalizeHistoryModeKey(nextState.history_mode_key);
      state.historyProfile = readHistoryProfile(state.historyModeKey);
    }

    state.totalUnits = Math.max(1, Number(nextState.total_units) || state.totalUnits || 1);
    state.completedUnits = state.totalUnits;
    state.currentUnitRatio = 0;
    state.overallProgressFraction = 1;
    state.statusText = typeof nextState.status_text === "string"
      ? nextState.status_text
      : state.statusText;
    state.fileText = typeof nextState.file_text === "string"
      ? nextState.file_text
      : "";
    state.completedExpectedBytes = Math.max(
      state.totalExpectedBytes,
      Number(nextState.completed_expected_bytes) || state.totalExpectedBytes,
    );
    state.displayedBytesPerSecond = 0;
    state.displayedEtaRemainingSeconds = 0;
    resetEtaState(true);
    resetActiveDownloadMetrics();
    writeHistorySample(state.totalExpectedBytes, state.historyModeKey);
    render();
  }

  window.DRWebOfflineLoader = {
    start,
    stop,
    update,
    finish,
  };
})();
