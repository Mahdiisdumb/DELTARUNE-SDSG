const frameMs = 1000 / 30;
const mainFontFamily = `"Eight Bit Operator", "Courier New", monospace`;
const menuFontFamily = `"Eight Bit Operator Choice", "Courier New", monospace`;
const choiceFadeInFrames = 14;
const choiceFadeOutFrames = 8;
const choiceVerticalOffset = -20;
const triChoiceNeutralSoulLift = 90;
const debugGridSpacing = 32;
const debugToggleCode = "vine";
const defaultPromptLineHeight = 28;
const saveDbName = "/_savedata";
const saveStoreName = "FILE_DATA";
const saveDbVersion = 21;
const saveTimestampIndexName = "timestamp";
const controlsStorageKey = "controls";
const deviceProfileStorageKey = "device_profile";
const consoleFamilyStorageKey = "console_family";
const audioCachingModeStorageKey = "cachingmode";
const startPageStorageKey = "startpage";
const offlineModePagePath = "app/offline/index.html";
let postSetupPagePath = "app/index.html";

const setupAutoBootOptions = [
  { label: "No, thanks!", page: "app/index.html" },
  { label: "Chapter Select", page: "play/play/index.html" },
  { label: "Chapter 1", page: "play/chapter1/" },
  { label: "Chapter 2", page: "play/chapter2/" },
  { label: "Chapter 3", page: "play/chapter3/" },
  { label: "Chapter 4", page: "play/chapter4/" },
  { label: "Chapter 5", page: "play/chapter5/" },
  { label: "Boss Rush", page: "play/rush/" },
];
const mobileControlAssetCacheName = "dr-mobile-control-assets-v1";
const mobileControlAssetPaths = [
  "mobile.js",
  "joy.js",
  "spr/z.svg",
  "spr/z_pressed.svg",
  "spr/x.svg",
  "spr/x_pressed.svg",
  "spr/c.svg",
  "spr/c_pressed.svg",
  "spr/dpad_up.svg",
  "spr/dpad_up-pressed.svg",
  "spr/dpad_down.svg",
  "spr/dpad_down-pressed.svg",
  "spr/dpad_left.svg",
  "spr/dpad_left-pressed.svg",
  "spr/dpad_right.svg",
  "spr/dpad_right-pressed.svg",
];

const pauseDurations = {
  "1": 5,
  "2": 10,
  "3": 15,
  "4": 20,
  "5": 30,
  "6": 40,
  "7": 60,
  "8": 90,
  "9": 150,
};

const textModes = {
  666: {
    charDelayFrames: 4,
    charAdvance: 20,
    lineHeight: 40,
    fontSize: 24,
  },
  667: {
    charDelayFrames: 2,
    charAdvance: 20,
    lineHeight: 40,
    fontSize: 24,
  },
};

const soulWidth = 34;
const soulHeight = 34;

const soulImage = new Image();
soulImage.src = "assets/image_soul_blur.png";

const logoImage = new Image();
logoImage.src = "logo.png";

const loadedScriptUrls = new Set();
let saveDbConnection = null;
let skipNextImportAction = false;
let saveCodeDialogSession = null;
let saveCodeModal = null;
let saveCodeDialog = null;
let saveCodeInput = null;
let saveCodeStatus = null;
let saveCodeConfirmButton = null;
let saveCodeCancelButton = null;
let hasBoundSaveCodeDialogEvents = false;

async function checkSetupOwnership() {
  try {
    if (!window.ownership_gate?.check_saved_ownership) {
      return false;
    }

    const gateResult = await window.ownership_gate.check_saved_ownership();
    return gateResult?.verified === true;
  } catch (error) {
    console.warn("Unable to verify setup ownership:", error);
    return false;
  }
}

function markSetupComplete() {
  try {
    localStorage.setItem("setup_complete", "1");
  } catch (error) {
    console.warn("Unable to save the setup completion flag:", error);
  }
}

function goToVerificationPage() {
  if (window.ownership_gate?.go_to_page) {
    window.ownership_gate.go_to_page("verif/index.html");
    return;
  }

  try {
    localStorage.setItem("startpage", "verif/index.html");
  } catch (error) {
    console.warn("Unable to save the verification page handoff:", error);
  }

  try {
    if (window.parent && window.parent !== window && typeof window.parent.goToContainerPage === "function") {
      window.parent.goToContainerPage("verif/index.html");
      return;
    }
  } catch (error) {
    console.warn("Unable to hand off to the verification page:", error);
  }

  window.location.href = "../verif/index.html";
}

function enterSetupCompletionPage(pagePath = "app/index.html") {
  const normalizedPagePath = String(pagePath || "app/index.html").trim() || "app/index.html";

  try {
    if (window.parent && window.parent !== window && typeof window.parent.goToContainerPage === "function") {
      window.parent.goToContainerPage(normalizedPagePath);
      return;
    }
  } catch (error) {
    console.warn("Unable to hand off to the container completion page:", error);
  }

  window.location.href = `../${normalizedPagePath}`;
}

function enterAppPage() {
  enterSetupCompletionPage("app/index.html");
}

function setAudioCachingMode(value) {
  const normalizedValue = value === "off" || value === "skip" || value === "noaudio" ? value : "on";

  try {
    localStorage.setItem(audioCachingModeStorageKey, normalizedValue);
  } catch (error) {
    console.warn("Unable to save the selected audio caching mode:", error);
  }

  return normalizedValue;
}

function setStartPagePreference(pagePath) {
  const normalizedPagePath = String(pagePath || "app/index.html").trim() || "app/index.html";

  try {
    localStorage.setItem(startPageStorageKey, normalizedPagePath);
  } catch (error) {
    console.warn("Unable to save the Auto-Boot page:", error);
  }

  try {
    if (window.parent && window.parent !== window && typeof window.parent.setContainerStartPage === "function") {
      window.parent.setContainerStartPage(normalizedPagePath);
    }
  } catch (error) {
    console.warn("Unable to sync the Auto-Boot page with the container:", error);
  }

  return normalizedPagePath;
}

function applySetupDownloadChoice(value) {
  if (value === "everything") {
    setAudioCachingMode("on");
    postSetupPagePath = offlineModePagePath;
    return;
  }

  if (value === "neither") {
    setAudioCachingMode("off");
    return;
  }

  setAudioCachingMode("on");
}

function applySetupAutoBootChoice(pagePath) {
  setStartPagePreference(pagePath);
}

function getControlsPreference() {
  try {
    return localStorage.getItem(controlsStorageKey) === "wasd" ? "wasd" : "arrows";
  } catch (error) {
    console.warn("Unable to read the preferred controls:", error);
    return "arrows";
  }
}

function setControlsPreference(value) {
  const normalizedValue = value === "wasd" ? "wasd" : "arrows";

  try {
    localStorage.setItem(controlsStorageKey, normalizedValue);
  } catch (error) {
    console.warn("Unable to save the preferred controls:", error);
  }

  return normalizedValue;
}

function setDeviceProfile(value) {
  const normalizedValue = value === "console" || value === "mobile" ? value : "desktop";

  try {
    localStorage.setItem(deviceProfileStorageKey, normalizedValue);
  } catch (error) {
    console.warn("Unable to save the selected device profile:", error);
  }

  if (normalizedValue !== "console") {
    clearConsoleFamily();
  }

  return normalizedValue;
}

function setConsoleFamily(value) {
  const normalizedValue = value === "xbox" || value === "playstation" ? value : "";

  try {
    if (normalizedValue) {
      localStorage.setItem(consoleFamilyStorageKey, normalizedValue);
    } else {
      localStorage.removeItem(consoleFamilyStorageKey);
    }
  } catch (error) {
    console.warn("Unable to save the selected console family:", error);
  }

  return normalizedValue;
}

function clearConsoleFamily() {
  try {
    localStorage.removeItem(consoleFamilyStorageKey);
  } catch (error) {
    console.warn("Unable to clear the selected console family:", error);
  }
}

function getPlayBaseUrl() {
  return new URL("../play/", window.location.href);
}

function getStageZoomValue() {
  const stageShell = document.getElementById("stage-shell");

  if (!stageShell) {
    return 1;
  }

  const zoomValue = Number.parseFloat(getComputedStyle(stageShell).getPropertyValue("--ui-zoom"));
  return Number.isFinite(zoomValue) && zoomValue > 0 ? zoomValue : 1;
}

function getMobileControlAssetUrls() {
  const playBaseUrl = getPlayBaseUrl();
  return mobileControlAssetPaths.map((assetPath) => new URL(assetPath, playBaseUrl).toString());
}

async function primeMobileControlAssets() {
  const assetUrls = getMobileControlAssetUrls();
  let assetCache = null;

  if (window.caches?.open) {
    try {
      assetCache = await window.caches.open(mobileControlAssetCacheName);
    } catch (error) {
      console.warn("Unable to open the mobile control asset cache:", error);
    }
  }

  const warmResults = await Promise.allSettled(
    assetUrls.map(async (assetUrl) => {
      const response = await fetch(assetUrl, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Unable to warm ${assetUrl}: ${response.status}`);
      }

      if (assetCache) {
        await assetCache.put(assetUrl, response.clone());
      }
    }),
  );

  const rejectedResults = warmResults.filter((result) => result.status === "rejected");

  if (rejectedResults.length > 0) {
    console.warn(
      "Some mobile control assets could not be warmed:",
      rejectedResults.map((result) => result.reason),
    );
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


function detectSuggestedDeviceProfile() {
  const userAgent = navigator.userAgent || "";
  const uaDataMobile = Boolean(navigator.userAgentData && navigator.userAgentData.mobile);
  const touchCapable = (navigator.maxTouchPoints || 0) > 1;
  const mobileLike = uaDataMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  if (mobileLike || touchCapable) {
    return "mobile";
  }
  const gamepads = typeof navigator.getGamepads === "function" ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  if (gamepads.some((gamepad) => gamepad.connected)) {
    return "console";
  }
  return "desktop";
}

function getSuggestedDeviceChoiceIndex() {
  switch (detectSuggestedDeviceProfile()) {
    case "mobile": return 0;
    case "desktop": return 1;
    case "console": return 2;
    default: return 1;
  }
}

function cacheSaveCodeDialogElements() {
  saveCodeModal = document.getElementById("save-code-modal");
  saveCodeDialog = document.getElementById("save-code-dialog");
  saveCodeInput = document.getElementById("save-code-input");
  saveCodeStatus = document.getElementById("save-code-status");
  saveCodeConfirmButton = document.getElementById("save-code-confirm");
  saveCodeCancelButton = document.getElementById("save-code-cancel");
}

function createSaveCodeDialogMarkup() {
  const modal = document.createElement("div");
  modal.id = "save-code-modal";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div id="save-code-dialog" role="dialog" aria-modal="true" aria-label="Import save code">
      <p id="save-code-copy">Import save data from another device by uploading it at <a href="https://save.vinetrap.net" target="_blank" rel="noopener noreferrer">save.vinetrap.net</a> and typing the given code here!</p>
      <input
        id="save-code-input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        aria-label="Save import code"
        placeholder="XXXX-XXXX"
      >
      <p id="save-code-status" aria-live="polite" hidden></p>
      <div id="save-code-actions">
        <button id="save-code-confirm" type="button">Import</button>
        <button id="save-code-cancel" type="button">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function ensureSaveCodeDialogElements() {
  if (!saveCodeModal || !saveCodeDialog || !saveCodeInput || !saveCodeConfirmButton || !saveCodeCancelButton) {
    cacheSaveCodeDialogElements();
  }

  if (!saveCodeModal || !saveCodeDialog || !saveCodeInput || !saveCodeConfirmButton || !saveCodeCancelButton) {
    createSaveCodeDialogMarkup();
    cacheSaveCodeDialogElements();
  }

  if (!saveCodeModal || !saveCodeDialog || !saveCodeInput || !saveCodeConfirmButton || !saveCodeCancelButton) {
    return false;
  }

  if (!hasBoundSaveCodeDialogEvents) {
    bindSaveCodeDialogEvents();
    hasBoundSaveCodeDialogEvents = true;
  }

  return true;
}

function makeScriptLoaderStep(src, halt = false) {
  return {
    runAction: {
      type: "load-script",
      src,
      halt,
    },
  };
}

function makeDownloadChoiceStep() {
  return {
    mode: 667,
    x: 0,
    y: 0,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0%",
    ],
    choice: {
      promptLines: [
        "Would you like to download",
        "game files to speed up",
        "wait times?",
      ],
      promptX: 160,
      promptY: 50,
      promptLineHeight: 13,
      promptAlign: "center",
      fadeMainTextAfterMenu: false,
      optionAlign: "center",
      optionPositions: [
        { x: 86, y: 184 },
        { x: 160, y: 184 },
        { x: 234, y: 184 },
      ],
      defaultIndex: 1,
      options: ["Everything", "Music Only", "Neither"],
      branches: [
        [
          {
            runAction: {
              type: "set-download-choice",
              value: "everything",
            },
          },
        ],
        [
          {
            runAction: {
              type: "set-download-choice",
              value: "music",
            },
          },
        ],
        [
          {
            runAction: {
              type: "set-download-choice",
              value: "neither",
            },
          },
        ],
      ],
    },
  };
}

function makeAutoBootChoiceStep() {
  return {
    mode: 667,
    x: 0,
    y: 0,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0%",
    ],
    choice: {
      promptLines: [
        "Would you like to boot directly",
        "into the game when starting",
        "the app?",
      ],
      promptX: 160,
      promptY: 30,
      promptLineHeight: 13,
      promptAlign: "center",
      fadeMainTextAfterMenu: false,
      navigationMode: "spatial",
      optionAlign: "center",
      optionPositions: [
        { x: 102, y: 100 },
        { x: 218, y: 100 },
        { x: 102, y: 130 },
        { x: 218, y: 130 },
        { x: 102, y: 160 },
        { x: 218, y: 160 },
        { x: 102, y: 190 },
        { x: 218, y: 190 },
      ],
      defaultIndex: -1,
      options: setupAutoBootOptions.map((option) => option.label),
      branches: setupAutoBootOptions.map((option) => ([
        {
          runAction: {
            type: "set-auto-boot",
            value: option.page,
          },
        },
      ])),
    },
  };
}

function makeSaveImportStep(importMethod = "files") {
  const actionType = importMethod === "code" ? "import-save-code" : "import-save-files";

  return {
    mode: 667,
    x: 0,
    y: 0,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0%",
    ],
    choice: {
      promptLines: [
        "Do you have any SAVE files",
        "that you wish to import?",
      ],
      promptX: 160,
      promptY: 72,
      promptLineHeight: 12,
      promptAlign: "center",
      fadeMainTextAfterMenu: false,
      directSelectionActions: {
        0: {
          type: actionType,
        },
      },
      y: 180,
      xPositions: [110, 190],
      defaultIndex: -1,
      options: ["Yeah!!", "No..."],
      branches: [
        [
          {
            runAction: {
              type: actionType,
            },
          },
          makeDownloadChoiceStep(),
          makeAutoBootChoiceStep(),
        ],
        [
          makeDownloadChoiceStep(),
          makeAutoBootChoiceStep(),
        ],
      ],
    },
  };
}

function makeConsoleChoiceStep() {
  return {
    mode: 667,
    x: 0,
    y: 0,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0%",
    ],
    choice: {
      promptLines: ["Which console?"],
      promptX: 160,
      promptY: 78,
      promptLineHeight: 28,
      promptAlign: "center",
      fadeMainTextAfterMenu: false,
      y: 180,
      xPositions: [54, 196],
      defaultIndex: -1,
      options: ["Xbox One/Series", "PS4 / PS5"],
      branches: [
        [
          {
            runAction: {
              type: "set-console-family",
              value: "xbox",
            },
          },
        ],
        [
          {
            runAction: {
              type: "set-console-family",
              value: "playstation",
            },
          },
        ],
      ],
    },
  };
}

function makeControlSchemeChoiceStep() {
  return {
    mode: 667,
    x: 0,
    y: 0,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0%",
    ],
    choice: {
      promptLines: ["Which control scheme do you prefer?"],
      promptX: 160,
      promptY: 78,
      promptLineHeight: 28,
      promptAlign: "center",
      fadeMainTextAfterMenu: false,
      y: 180,
      xPositions: [90, 184],
      defaultIndex: -1,
      options: ["WASD", "Arrow Keys"],
      branches: [
        [
          {
            runAction: {
              type: "set-controls",
              value: "wasd",
            },
          },
          makeSaveImportStep("files"),
        ],
        [
          {
            runAction: {
              type: "set-controls",
              value: "arrows",
            },
          },
          makeSaveImportStep("files"),
        ],
      ],
    },
  };
}

function buildVerificationRequiredSequence() {
  return [
    scriptItems[0],
    {
      mode: 667,
      x: 110,
      y: 50,
      fadeOutFrames: 0.025,
      postDelayFrames: 0,
      messages: [
        "\\M0...WE'RE NOT?\\M1 ^8 %",
        "\\M0YOU SHOULD&PROBABLY VERIFY&FIRST...\\M1 ^8 %%",
      ],
      accessRedirect: {
        fadeDurationMs: frameMs * 24,
        pagePath: "verif/index.html",
      },
    },
  ];
}

const scriptItems = [
  {
    mode: 666,
    x: 110,
    y: 80,
    fadeOutFrames: 0.025,
    postDelayFrames: 0,
    initialDelayMs: 100,
    messages: [
      "^6 \\M0ARE WE^6&CONNECTED?\\M1 ^6 ^6 %%",
    ],
  },
  {
    mode: 667,
    x: 110,
    y: 50,
    fadeOutFrames: 0.025,
    postDelayFrames: 0,
    messages: [
      "\\M0WELCOME^1.\\M1 ^6 %",
      "^6\\M0IT'S BEEN&A WHILE...\\M1 ^6 %",
      "\\M2\\M0...SINCE&I'VE LAST&SEEN YOU,&^6HASN'T IT?\\M1 ^7 %",
      "\\M2\\M0HAVE I&SEEN YOU?&^2HAVE YOU&BEEN HERE?\\M1 ^7 %",
    ],
    choice: {
      y: 180,
      xPositions: [110, 190],
      defaultIndex: -1,
      options: ["Yeah!!", "No..."],
      branches: [
        [
          {
            mode: 667,
            x: 110,
            y: 50,
            fadeOutFrames: 0.025,
            postDelayFrames: 35,
            messages: [
              "\\M0WELCOME BACK.\\M1 ^6 %",
              "\\M0I HOPE...\\M1 ^6 %",
              "\\M0YOU ENJOY&THE CHANGES&WE'VE MADE.\\M1 ^6 %",
              "\\M0WE HAVE&IMPROVED YOUR&EXPERIENCE.\\M1 ^6 %",
              "\\M0SIGNIFICANTLY...&^2IMPACTED IT.\\M1 ^6 %",
              "\\M0I NOW THINK&^2YOU SHOULD&BE FAMILIAR...\\M1 ^6 %",
              "\\M0WITH MY&FOLLOWING&QUESTIONS.\\M1 ^6 %%",
            ],
          },
        ],
        [
          {
            mode: 667,
            x: 110,
            y: 50,
            fadeOutFrames: 0.025,
            postDelayFrames: 35,
            messages: [
              "\\M0WELL,&^2I WELCOME YOU.\\M1 ^6 %",
              "\\M0I SINCERELY&HOPE...\\M1 ^6 %",
              "\\M0YOU HAVE&A WONDERFUL&EXPERIENCE.\\M1 ^6 %",
              "\\M0THE TIME AND&EFFORT PUT&INTO THIS...\\M1 ^6 %",
              "\\M0HAS NOT&BEEN LIGHT.\\M1 ^6 %",
              "\\M0I WILL NOW&^2ASSIST YOU&WITH SETUP.\\M1 ^6 %%",
            ],
          },
        ],
      ],
    },
  },
  {
    mode: 667,
    x: 0,
    y: 0,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0%",
    ],
    choice: {
      promptLines: ["Please select your device."],
      promptX: 98,
      promptY: 78,
      promptLineHeight: 28,
      fadeMainTextAfterMenu: false,
      y: 180,
      xPositions: [56, 140, 224],
      defaultIndex: getSuggestedDeviceChoiceIndex(),
      options: ["Mobile", "Desktop", "Console"],
      branches: [
        [
          {
            runAction: {
              type: "set-device",
              value: "mobile",
            },
          },
          {
            runAction: {
              type: "prime-mobile-assets",
            },
          },
          makeScriptLoaderStep("./mobilesetup.js"),
          makeSaveImportStep("files"),
        ],
        [
          {
            runAction: {
              type: "set-device",
              value: "desktop",
            },
          },
          makeScriptLoaderStep("./desktopsetup.js"),
          {
            runAction: {
              type: "set-controls",
              value: "arrows",
            },
          },
          makeSaveImportStep("files"),
        ],
        [
          {
            runAction: {
              type: "set-device",
              value: "console",
            },
          },
          makeConsoleChoiceStep(),
          makeSaveImportStep("code"),
        ],
      ],
    },
  },
  {
    mode: 667,
    x: 75,
    y: 40,
    fadeOutFrames: 0.035,
    postDelayFrames: 0,
    messages: [
      "\\M0 %",
      "\\M0UNDERSTOOD.\\M1 ^6 %",
      "\\M0THANK YOU&^2FOR YOUR TIME.\\M1 ^6 %",
      "\\M0YOUR ANSWERS.\\M1 ^6 %",
      "YOUR SETTINGS",
    ],
    endingOverlay: {
      cutDelayMs: frameMs * 10,
      finalBlackFadeDelayMs: frameMs * 90,
      finalBlackFadeDurationMs: frameMs * 30,
      finalLogoFadeOutDurationMs: frameMs * 20,
      logo: {
        delayMs: frameMs * 20,
        fadeDurationMs: frameMs * 30,
        maxWidth: 400,
      },
      segments: [
        {
          lines: ["Will now be", "saved."],
          lineAligns: ["center", "block-left"],
          x: 160,
          y: 60,
          lineHeight: 14,
          align: "center",
          fontSize: 24,
          initialDelayMs: frameMs * 20,
          charDelayMs: 120,
          linePauseMs: frameMs * 10,
          nextSegmentDelayMs: frameMs * 60,
        },
        {
          lines: ["Welcome to"],
          x: 160,
          y: 102,
          align: "center",
          fontSize: 24,
          charDelayMs: 120,
          pauseAfterChars: [
            {
              lineIndex: 0,
              charCount: 7,
              delayMs: frameMs * 50,
            },
          ],
          fadeToWhite: true,
          fadeDurationMs: frameMs * 92,
        },
      ],
    },
  },
];

const heldKeys = {
  speedX: false,
  speedShift: false,
  setupTouchSpeedHeld: false,
};

let setupTouchSpeedActive = false;

const pressedKeys = {
  left: false,
  right: false,
  up: false,
  down: false,
  confirm: false,
};

const lastGamepadState = new Map();
let isDebugOverlayVisible = false;
let debugKeyBuffer = "";

function parseWriterText(raw) {
  const tokens = [];

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (char === "&") {
      tokens.push({ type: "newline" });
      continue;
    }

    if (char === "^") {
      const value = raw[index + 1];
      index += 1;
      tokens.push({
        type: "pause",
        ms: (pauseDurations[value] ?? 0) * frameMs,
      });
      continue;
    }

    if (char === "\\") {
      const command = raw[index + 1];
      const value = raw[index + 2];
      index += 2;
      tokens.push({
        type: "command",
        command,
        value,
      });
      continue;
    }

    if (char === "%" || char === "/") {
      tokens.push({ type: "end" });
      continue;
    }

    tokens.push({
      type: "char",
      value: char,
    });
  }

  return tokens;
}

function normalizeScriptStep(item) {
  const normalized = {
    ...item,
    parsedMessages: (item.messages ?? []).map((message) => parseWriterText(message)),
  };

  if (item.choice) {
    normalized.choice = {
      ...item.choice,
      branches: item.choice.branches.map((branch) => branch.map((branchItem) => normalizeScriptStep(branchItem))),
    };
  }

  return normalized;
}

function summarizeDebugText(message) {
  return message
    .replace(/\\M[0-9]/g, "")
    .replace(/\^[0-9]/g, "")
    .replace(/[&/%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStepType(item) {
  if (item.runAction) {
    return "action";
  }

  if (item.choice) {
    return "choice";
  }

  return "dialogue";
}

function getStepPreview(item) {
  if (item.runAction) {
    if (item.runAction.type === "load-script") {
      return `load-script ${item.runAction.src}`;
    }

    return item.runAction.type;
  }

  if (item.choice?.promptLines?.length) {
    return item.choice.promptLines.join(" / ");
  }

  if (item.messages?.length) {
    const preview = summarizeDebugText(item.messages.find((message) => summarizeDebugText(message)) ?? item.messages[0] ?? "");
    return preview || "(blank dialogue)";
  }

  return "(empty item)";
}

function collectJumpTargets(items, parentPath = "", entries = []) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const id = parentPath ? `${parentPath}/${index}` : String(index);
    const partCount = item.runAction ? 0 : (item.parsedMessages?.length ?? 0);
    const isRoot = parentPath === "";

    entries.push({
      id,
      item,
      kind: getStepType(item),
      preview: getStepPreview(item),
      parts: partCount,
      isRoot,
      rootIndex: isRoot ? index : null,
    });

    if (item.choice?.branches?.length) {
      for (let branchStepIndex = 0; branchStepIndex < item.choice.branches.length; branchStepIndex += 1) {
        collectJumpTargets(item.choice.branches[branchStepIndex], `${id}/${branchStepIndex}`, entries);
      }
    }
  }

  return entries;
}

function getEndingSections(config) {
  return Array.isArray(config?.segments) && config.segments.length > 0
    ? config.segments
    : [config];
}

function buildEndingPauseMap(segment) {
  const pauseMap = new Map();

  for (const pause of segment?.pauseAfterChars ?? []) {
    const lineIndex = Math.max(0, Math.trunc(pause.lineIndex ?? 0));
    const charCount = Math.max(0, Math.trunc(pause.charCount ?? 0));
    pauseMap.set(`${lineIndex}:${charCount}`, Math.max(0, pause.delayMs ?? 0));
  }

  return pauseMap;
}

function estimateEndingSectionDuration(segment) {
  const lines = segment?.lines ?? [];
  const charDelayMs = Math.max(0, segment?.charDelayMs ?? 120);
  const linePauseMs = Math.max(0, segment?.linePauseMs ?? 180);
  const pauseMap = buildEndingPauseMap(segment);
  let totalMs = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    totalMs += line.length * charDelayMs;

    for (let charCount = 1; charCount <= line.length; charCount += 1) {
      totalMs += pauseMap.get(`${index}:${charCount}`) ?? 0;
    }

    if (index + 1 < lines.length) {
      totalMs += linePauseMs;
    }
  }

  return Math.max(totalMs, frameMs);
}

function isNintendoGamepad(id) {
  return /nintendo|switch|joy-con|joycon|pro controller/i.test(id || "");
}

function readGamepadInput() {
  const frame = {
    speedHeld: false,
    leftPressed: false,
    rightPressed: false,
    upPressed: false,
    downPressed: false,
    confirmPressed: false,
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
    const speedIndex = nintendoLayout ? 0 : 1;
    const axes = gamepad.axes || [];
    const buttons = gamepad.buttons || [];

    const current = {
      leftHeld: Boolean(buttons[14] && buttons[14].pressed) || axes[0] < -0.5,
      rightHeld: Boolean(buttons[15] && buttons[15].pressed) || axes[0] > 0.5,
      upHeld: Boolean(buttons[12] && buttons[12].pressed) || axes[1] < -0.5,
      downHeld: Boolean(buttons[13] && buttons[13].pressed) || axes[1] > 0.5,
      confirmHeld: Boolean(buttons[confirmIndex] && buttons[confirmIndex].pressed),
      speedHeld: Boolean(buttons[speedIndex] && buttons[speedIndex].pressed),
    };

    const previous = lastGamepadState.get(gamepad.index) || {
      leftHeld: false,
      rightHeld: false,
      upHeld: false,
      downHeld: false,
      confirmHeld: false,
    };

    frame.speedHeld ||= current.speedHeld;
    frame.leftPressed ||= current.leftHeld && !previous.leftHeld;
    frame.rightPressed ||= current.rightHeld && !previous.rightHeld;
    frame.upPressed ||= current.upHeld && !previous.upHeld;
    frame.downPressed ||= current.downHeld && !previous.downHeld;
    frame.confirmPressed ||= current.confirmHeld && !previous.confirmHeld;

    lastGamepadState.set(gamepad.index, current);
  }

  return frame;
}

function readInputFrame() {
  const gamepadFrame = readGamepadInput();

  if (isSaveCodeDialogOpen()) {
    pressedKeys.left = false;
    pressedKeys.right = false;
    pressedKeys.up = false;
    pressedKeys.down = false;
    pressedKeys.confirm = false;

    return {
      speedHeld: false,
      leftPressed: false,
      rightPressed: false,
      upPressed: false,
      downPressed: false,
      confirmPressed: false,
    };
  }

  const frame = {
    speedHeld: heldKeys.speedX || heldKeys.speedShift || heldKeys.setupTouchSpeedHeld || setupTouchSpeedActive || gamepadFrame.speedHeld,
    leftPressed: pressedKeys.left || gamepadFrame.leftPressed,
    rightPressed: pressedKeys.right || gamepadFrame.rightPressed,
    upPressed: pressedKeys.up || gamepadFrame.upPressed,
    downPressed: pressedKeys.down || gamepadFrame.downPressed,
    confirmPressed: pressedKeys.confirm || gamepadFrame.confirmPressed,
  };

  pressedKeys.left = false;
  pressedKeys.right = false;
  pressedKeys.up = false;
  pressedKeys.down = false;
  pressedKeys.confirm = false;

  return frame;
}

function easeInOut(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - (2 * clamped));
}

function loadScriptOnce(src) {
  if (!src || loadedScriptUrls.has(src)) {
    return;
  }

  loadedScriptUrls.add(src);

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.dataset.codexExternal = "true";
  script.addEventListener("error", () => {
    console.warn(`Unable to load external script: ${src}`);
  });
  document.body.appendChild(script);
}

function isSaveCodeDialogOpen() {
  return Boolean(saveCodeDialogSession);
}

function setSaveCodeStatus(message = "", state = "") {
  if (!ensureSaveCodeDialogElements()) {
    return;
  }

  if (!saveCodeStatus) {
    return;
  }

  const nextMessage = String(message ?? "");
  const hasMessage = nextMessage.length > 0;

  saveCodeStatus.textContent = nextMessage;
  saveCodeStatus.hidden = !hasMessage;

  if (state) {
    saveCodeStatus.dataset.state = state;
    return;
  }

  delete saveCodeStatus.dataset.state;
}

function getSaveTransferCodec() {
  return window.save_transfer_codec ?? window.saveTransferCodec ?? null;
}

function formatTransferCodeInput(value) {
  const codec = getSaveTransferCodec();

  if (codec?.formatUserCodeInput) {
    return codec.formatUserCodeInput(value);
  }

  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function setSaveCodeDialogVisible(isVisible) {
  if (!ensureSaveCodeDialogElements()) {
    return;
  }

  if (!saveCodeModal) {
    return;
  }

  saveCodeModal.hidden = !isVisible;
  saveCodeModal.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function focusSaveCodePrimaryAction() {
  if (!saveCodeDialogSession || !saveCodeConfirmButton || saveCodeConfirmButton.disabled) {
    return false;
  }

  try {
    saveCodeConfirmButton.focus({ preventScroll: true });
  } catch (error) {
    try {
      saveCodeConfirmButton.focus();
    } catch (_nestedError) {
      return false;
    }
  }

  return document.activeElement === saveCodeConfirmButton;
}

function restoreSaveCodeDialogControllerFocus() {
  if (!saveCodeDialogSession || !saveCodeDialog) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (!saveCodeDialogSession || !saveCodeDialog) {
      return;
    }

    const activeElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    if (activeElement === saveCodeInput || activeElement === saveCodeConfirmButton || activeElement === saveCodeCancelButton) {
      return;
    }

    if (activeElement && saveCodeDialog.contains(activeElement)) {
      return;
    }

    focusSaveCodePrimaryAction();
  });
}

function closeSaveCodeDialog(result) {
  if (!saveCodeDialogSession) {
    return;
  }

  const session = saveCodeDialogSession;
  saveCodeDialogSession = null;
  setSaveCodeDialogVisible(false);
  setSaveCodeStatus("");

  if (saveCodeInput) {
    saveCodeInput.disabled = false;
    saveCodeInput.value = "";
  }

  if (saveCodeConfirmButton) {
    saveCodeConfirmButton.disabled = false;
  }

  if (saveCodeCancelButton) {
    saveCodeCancelButton.disabled = false;
  }

  if (session.previousFocus && typeof session.previousFocus.focus === "function") {
    session.previousFocus.focus();
  }

  session.resolve(result);
}

function cancelSaveCodeDialog() {
  closeSaveCodeDialog({
    imported: 0,
    cancelled: true,
    records: [],
  });
}

async function submitSaveCodeDialog() {
  const session = saveCodeDialogSession;

  if (!session) {
    return;
  }

  const rawCode = saveCodeInput?.value.trim() ?? "";

  if (!rawCode) {
    setSaveCodeStatus("Enter your import code first.");
    saveCodeInput?.focus();
    return;
  }

  const codec = getSaveTransferCodec();

  if (!codec?.decodeCode) {
    setSaveCodeStatus("The save code decoder is unavailable.");
    return;
  }

  if (saveCodeInput) {
    saveCodeInput.disabled = true;
  }

  if (saveCodeConfirmButton) {
    saveCodeConfirmButton.disabled = true;
  }

  if (saveCodeCancelButton) {
    saveCodeCancelButton.disabled = true;
  }

  setSaveCodeStatus("Decoding import code...", "ok");

  try {
    const records = await codec.decodeCode(rawCode);

    if (records.length === 0) {
      throw new Error("That import code does not contain any SAVE files.");
    }

    closeSaveCodeDialog({
      imported: records.length,
      cancelled: false,
      records,
    });
  } catch (error) {
    if (saveCodeDialogSession !== session) {
      return;
    }

    if (saveCodeInput) {
      saveCodeInput.disabled = false;
      saveCodeInput.focus();
      saveCodeInput.select();
    }

    if (saveCodeConfirmButton) {
      saveCodeConfirmButton.disabled = false;
    }

    if (saveCodeCancelButton) {
      saveCodeCancelButton.disabled = false;
    }

    setSaveCodeStatus(error?.message || "That import code is not valid.");
  }
}

function openSaveCodeDialog() {
  if (!ensureSaveCodeDialogElements()) {
    return Promise.reject(new Error("The save code dialog is missing from this page."));
  }

  if (saveCodeDialogSession) {
    return Promise.reject(new Error("A save code dialog is already open."));
  }

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  setSaveCodeDialogVisible(true);
  setSaveCodeStatus("");
  heldKeys.speedX = false;
  heldKeys.speedShift = false;
  heldKeys.setupTouchSpeedHeld = false;
  setupTouchSpeedActive = false;
  pressedKeys.left = false;
  pressedKeys.right = false;
  pressedKeys.up = false;
  pressedKeys.down = false;
  pressedKeys.confirm = false;
  saveCodeInput.disabled = false;
  saveCodeConfirmButton.disabled = false;
  saveCodeCancelButton.disabled = false;
  saveCodeInput.value = "";

  return new Promise((resolve) => {
    saveCodeDialogSession = {
      resolve,
      previousFocus,
    };

    window.requestAnimationFrame(() => {
      saveCodeInput.focus();
      saveCodeInput.select();
    });
  });
}

function formatSavePath(name) {
  return `/_savedata/${String(name ?? "").replace(/^\/?_savedata\//, "").replace(/^\//, "")}`;
}

function openSaveDatabase() {
  if (saveDbConnection) {
    return Promise.resolve(saveDbConnection);
  }

  if (!window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not supported in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(saveDbName, saveDbVersion);

    request.onerror = (event) => {
      reject(event.target.error || new Error("Unable to open IndexedDB."));
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(saveStoreName)) {
        database.createObjectStore(saveStoreName);
      }

      const transaction = event.target.transaction;
      const objectStore = transaction?.objectStore(saveStoreName);

      if (objectStore && !objectStore.indexNames.contains(saveTimestampIndexName)) {
        objectStore.createIndex(saveTimestampIndexName, saveTimestampIndexName, {
          unique: false,
        });
      }
    };

    request.onsuccess = async (event) => {
      const database = event.target.result;

      database.onversionchange = () => {
        database.close();
        saveDbConnection = null;
      };

      if (!database.objectStoreNames.contains(saveStoreName)) {
        reject(new Error(`Object store "${saveStoreName}" is unavailable.`));
        return;
      }

      try {
        if (!(await saveDatabaseHasRequiredSchema(database))) {
          const migratedDatabase = await rebuildSaveDatabaseWithRequiredSchema(database);
          saveDbConnection = migratedDatabase;
          resolve(migratedDatabase);
          return;
        }

        saveDbConnection = database;
        resolve(database);
      } catch (error) {
        database.close();
        saveDbConnection = null;
        reject(error);
      }
    };
  });
}

function readAllSaveRecordsFromDatabase(database) {
  return new Promise((resolve, reject) => {
    if (!database.objectStoreNames.contains(saveStoreName)) {
      resolve([]);
      return;
    }

    const transaction = database.transaction([saveStoreName], "readonly");
    const objectStore = transaction.objectStore(saveStoreName);
    const recordsRequest = objectStore.getAll();
    const keysRequest = objectStore.getAllKeys();

    transaction.onerror = (event) => {
      reject(event.target.error || new Error("Unable to read the SAVE database."));
    };

    transaction.oncomplete = () => {
      const records = recordsRequest.result ?? [];
      const keys = keysRequest.result ?? [];
      resolve(records.map((record, index) => ({
        key: keys[index],
        value: record,
      })));
    };
  });
}

function deleteSaveDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(saveDbName);
    request.onerror = (event) => {
      reject(event.target.error || new Error("Unable to reset the SAVE database."));
    };
    request.onsuccess = () => {
      resolve();
    };
    request.onblocked = () => {
      reject(new Error("The SAVE database is busy in another tab."));
    };
  });
}

function createFreshSaveDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(saveDbName, saveDbVersion);

    request.onerror = (event) => {
      reject(event.target.error || new Error("Unable to recreate the SAVE database."));
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      let objectStore = null;

      if (database.objectStoreNames.contains(saveStoreName)) {
        objectStore = event.target.transaction?.objectStore(saveStoreName) ?? null;
      } else {
        objectStore = database.createObjectStore(saveStoreName);
      }

      if (objectStore && !objectStore.indexNames.contains(saveTimestampIndexName)) {
        objectStore.createIndex(saveTimestampIndexName, saveTimestampIndexName, {
          unique: false,
        });
      }
    };

    request.onsuccess = (event) => {
      const database = event.target.result;

      database.onversionchange = () => {
        database.close();
        saveDbConnection = null;
      };

      resolve(database);
    };
  });
}

async function saveDatabaseHasRequiredSchema(database) {
  if (!database.objectStoreNames.contains(saveStoreName)) {
    return false;
  }

  try {
    const transaction = database.transaction([saveStoreName], "readonly");
    const objectStore = transaction.objectStore(saveStoreName);
    return objectStore.indexNames.contains(saveTimestampIndexName);
  } catch (error) {
    return false;
  }
}

async function rebuildSaveDatabaseWithRequiredSchema(database) {
  const records = await readAllSaveRecordsFromDatabase(database);
  database.close();
  saveDbConnection = null;

  await deleteSaveDatabase();

  const rebuiltDatabase = await createFreshSaveDatabase();

  if (records.length === 0) {
    return rebuiltDatabase;
  }

  await new Promise((resolve, reject) => {
    const transaction = rebuiltDatabase.transaction([saveStoreName], "readwrite");
    const objectStore = transaction.objectStore(saveStoreName);

    transaction.onerror = (event) => {
      reject(event.target.error || new Error("Unable to restore imported SAVE data."));
    };

    transaction.oncomplete = () => {
      resolve();
    };

    records.forEach(({ key, value }) => {
      objectStore.put(value, key);
    });
  });

  return rebuiltDatabase;
}

async function buildSaveRecordFromFile(file) {
  return {
    name: file.name,
    timestampMs: file.lastModified || Date.now(),
    mode: 33206,
    contents: new Uint8Array(await file.arrayBuffer()),
  };
}

async function storeSaveRecord(record) {
  const database = await openSaveDatabase();
  const fileName = formatSavePath(String(record?.name ?? ""));
  const storedRecord = {
    timestamp: new Date(record?.timestampMs ?? Date.now()),
    mode: Math.max(0, Math.trunc(record?.mode ?? 33206)),
    contents: record?.contents instanceof Uint8Array
      ? record.contents
      : new Uint8Array(record?.contents ?? []),
  };

  if (fileName === "/_savedata/") {
    throw new Error("That SAVE entry is missing a file name.");
  }

  await new Promise((resolve, reject) => {
    const transaction = database.transaction([saveStoreName], "readwrite");
    const objectStore = transaction.objectStore(saveStoreName);
    const request = objectStore.put(storedRecord, fileName);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error || new Error(`Unable to save ${fileName}.`));
  });
}

async function storeSaveRecords(records) {
  await Promise.all(Array.from(records ?? []).map((record) => storeSaveRecord(record)));
}

async function storeImportedSave(file) {
  const record = await buildSaveRecordFromFile(file);
  await storeSaveRecord(record);
}

function waitForFilePicker(input) {
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      window.removeEventListener("focus", onFocus);
    };

    const finish = (files) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(files);
    };

    const onChange = () => finish(Array.from(input.files ?? []));
    const onCancel = () => finish([]);
    const onFocus = () => {
      window.setTimeout(() => {
        if (!settled && (input.files?.length ?? 0) === 0) {
          finish([]);
        }
      }, 300);
    };

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onFocus, { once: true });
  });
}

async function importSaveFiles() {
  const input = document.getElementById("save-import-input");

  if (!input) {
    throw new Error("Save import input is missing.");
  }

  input.value = "";
  const selection = waitForFilePicker(input);
  input.click();

  const files = await selection;

  if (files.length === 0) {
    return {
      imported: 0,
      cancelled: true,
    };
  }

  await Promise.all(files.map((file) => storeImportedSave(file)));

  return {
    imported: files.length,
    cancelled: false,
  };
}

async function importSaveCode() {
  const result = await openSaveCodeDialog();

  if (result.cancelled) {
    return result;
  }

  await storeSaveRecords(result.records);
  return result;
}

window.SAVEManager = {
  openIndexedDB: openSaveDatabase,
  importSaveFiles,
  importSaveCode,
  storeSaveRecords,
};
window.save_manager = window.SAVEManager;

function bindSaveCodeDialogEvents() {
  saveCodeInput.addEventListener("input", () => {
    saveCodeInput.value = formatTransferCodeInput(saveCodeInput.value);
    setSaveCodeStatus("");
  });

  saveCodeInput.addEventListener("keydown", (event) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      submitSaveCodeDialog();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelSaveCodeDialog();
    }
  });

  saveCodeInput.addEventListener("keyup", (event) => {
    event.stopPropagation();
  });

  saveCodeInput.addEventListener("blur", () => {
    restoreSaveCodeDialogControllerFocus();
  });

  saveCodeConfirmButton.addEventListener("click", () => {
    submitSaveCodeDialog();
  });

  saveCodeCancelButton.addEventListener("click", () => {
    cancelSaveCodeDialog();
  });

  saveCodeModal.addEventListener("pointerdown", (event) => {
    if (event.target === saveCodeModal) {
      cancelSaveCodeDialog();
    }
  });

  saveCodeDialog.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  saveCodeDialog.addEventListener("focusout", () => {
    restoreSaveCodeDialogControllerFocus();
  });
}

ensureSaveCodeDialogElements();

class SurveyProgramRenderer {
  constructor(screenCanvas, sequence, options = {}) {
    this.screenCanvas = screenCanvas;
    this.context = screenCanvas.getContext("2d");
    this.choiceOverlay = document.getElementById("choice-overlay");
    this.choiceNodes = [];
    this.promptNodes = [];
    this.endingNodes = [];
    this.verificationLockActive = options.verificationLockActive === true;
    this.baseSequence = sequence.map((item) => normalizeScriptStep(item));
    this.sequence = this.baseSequence;
    this.debugEntries = collectJumpTargets(this.baseSequence);
    this.debugEntryMap = new Map(this.debugEntries.map((entry) => [entry.id, entry]));
    this.actionToken = 0;
    this.reset();
  }

  preparePlayback(sequence = this.baseSequence) {
    this.sequence = sequence;
    this.finished = false;
    this.lastTimestamp = 0;
    this.scriptClock = 0;
    this.charSpeedMultiplier = 1;
    this.branchSteps = null;
    this.branchContextStack = [];
    this.resumeScriptStep = null;
    this.choiceMenuState = null;
    this.endingSceneState = null;
    this.queuedEndingScene = null;
    this.accessRedirectState = null;
    this.actionToken += 1;
    this.isActionRunning = false;
    this.lastTappedOption = -1;
    this.hasTriggeredAppPage = false;
    this.clearChoiceOverlay();
    this.clearEndingOverlay();
  }

  reset() {
    this.preparePlayback(this.baseSequence);
    this.loadScriptStep(0);
  }

  completeSetup() {
    if (this.hasTriggeredAppPage) {
      return;
    }

    this.hasTriggeredAppPage = true;
    this.finished = true;
    markSetupComplete();
    enterSetupCompletionPage(postSetupPagePath);
  }

  loadScriptStep(index, messagePartIndex = 0) {
    const item = this.sequence[index];

    if (!item) {
      this.finished = true;
      return;
    }

    this.playbackSource = "script";
    this.scriptStepIndex = index;
    this.loadStep(item, messagePartIndex);
  }

  loadBranchStep(index) {
    const item = this.branchSteps[index];
    this.playbackSource = "branch";
    this.branchStepIndex = index;
    this.loadStep(item);
  }

  loadStep(item, messagePartIndex = 0) {
    if (item.runAction) {
      this.runActionStep(item);
      return;
    }

    this.item = item;
    this.mode = textModes[item.mode] ?? textModes[667];
    this.messagePartIndex = 0;
    this.stepAdvanceAt = null;
    this.partSwitchAt = null;
    this.choiceMenuState = null;
    this.endingSceneState = null;
    this.queuedEndingScene = null;
    this.accessRedirectState = null;
    this.lastTappedOption = -1;
    this.clearChoiceOverlay();
    this.clearEndingOverlay();
    this.loadMessagePart(Math.max(0, Math.min(messagePartIndex, item.parsedMessages.length - 1)));
  }

  runActionStep(item) {
    const actionToken = this.actionToken;
    this.item = item;
    this.choiceMenuState = null;
    this.endingSceneState = null;
    this.queuedEndingScene = null;
    this.accessRedirectState = null;
    this.typedGlyphs = [];
    this.stepAdvanceAt = null;
    this.partSwitchAt = null;
    this.isActionRunning = true;
    this.clearChoiceOverlay();
    this.clearEndingOverlay();

    Promise.resolve()
      .then(async () => {
        if (item.runAction.type === "load-script") {
          loadScriptOnce(item.runAction.src);
          return;
        }

        if (item.runAction.type === "set-controls") {
          setControlsPreference(item.runAction.value);
          return;
        }

        if (item.runAction.type === "set-device") {
          setDeviceProfile(item.runAction.value);
          return;
        }

        if (item.runAction.type === "set-console-family") {
          setConsoleFamily(item.runAction.value);
          return;
        }

        if (item.runAction.type === "set-download-choice") {
          applySetupDownloadChoice(item.runAction.value);
          return;
        }

        if (item.runAction.type === "set-auto-boot") {
          applySetupAutoBootChoice(item.runAction.value);
          return;
        }

        if (item.runAction.type === "prime-mobile-assets") {
          await primeMobileControlAssets();
          return;
        }

        if (item.runAction.type === "import-save-files") {
          if (skipNextImportAction) {
            skipNextImportAction = false;
            return;
          }

          await importSaveFiles();
          return;
        }

        if (item.runAction.type === "import-save-code") {
          if (skipNextImportAction) {
            skipNextImportAction = false;
            return;
          }

          await importSaveCode();
        }
      })
      .catch((error) => {
        if (actionToken !== this.actionToken) {
          return;
        }

        console.error("Run action failed:", error);
      })
      .finally(() => {
        if (actionToken !== this.actionToken) {
          return;
        }

        this.isActionRunning = false;

        if (item.runAction.halt) {
          this.finished = true;
          return;
        }

        this.advanceFromCurrentSource();
      });
  }

  loadMessagePart(index) {
    const tokens = this.item.parsedMessages[index];
    this.messagePartIndex = index;
    this.tokens = tokens;
    this.currentTokenIndex = 0;
    this.typedGlyphs = [];
    this.textCursorX = this.item.x * 2;
    this.textCursorY = this.item.y * 2;
    this.lineStartX = this.textCursorX;
    this.nextTokenTime = this.scriptClock + (index === 0 ? (this.item.initialDelayMs ?? 0) : 0);
    this.textAlpha = 1;
    this.shouldFadeText = false;
    this.keepTextVisible = false;
    this.glowFlash = 0;

    if (this.item.endingOverlay && index === this.item.parsedMessages.length - 1) {
      this.charSpeedMultiplier = 1;
    }
  }

  findJumpTarget(target) {
    if (typeof target === "number" && Number.isInteger(target)) {
      return this.debugEntryMap.get(String(target)) ?? null;
    }

    const normalizedTarget = String(target ?? "").trim();

    if (!normalizedTarget) {
      return null;
    }

    return this.debugEntryMap.get(normalizedTarget) ?? null;
  }

  listJumpTargets() {
    return this.debugEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      parts: entry.parts,
      preview: entry.preview,
      root: entry.isRoot,
    }));
  }

  getPlaybackState() {
    return {
      playbackSource: this.playbackSource ?? null,
      scriptStepIndex: Number.isInteger(this.scriptStepIndex) ? this.scriptStepIndex : null,
      messagePartIndex: Number.isInteger(this.messagePartIndex) ? this.messagePartIndex : null,
      preview: this.item ? getStepPreview(this.item) : null,
      standalone: this.sequence !== this.baseSequence,
      verificationLocked: this.verificationLockActive,
      choiceActive: Boolean(this.choiceMenuState),
      accessRedirectActive: Boolean(this.accessRedirectState),
      endingActive: Boolean(this.queuedEndingScene || this.endingSceneState),
      endingSegmentIndex: this.endingSceneState ? this.endingSceneState.segmentIndex : null,
      finished: this.finished,
    };
  }

  jumpToTarget(target, messagePartIndex = 0, options = {}) {
    if (this.verificationLockActive) {
      throw new Error("Verification is required before debug jumps are available.");
    }

    const entry = this.findJumpTarget(target);

    if (!entry) {
      throw new Error(`Unknown dialogue target "${target}". Run SurveyDebug.list() first.`);
    }

    const safePartIndex = entry.parts > 0
      ? Math.max(0, Math.min(Math.trunc(messagePartIndex) || 0, entry.parts - 1))
      : 0;
    const standalone = options.standalone === true || !entry.isRoot;

    if (standalone) {
      this.preparePlayback([entry.item]);
      this.loadScriptStep(0, safePartIndex);
      return this.getPlaybackState();
    }

    this.preparePlayback(this.baseSequence);
    this.loadScriptStep(entry.rootIndex, safePartIndex);
    return this.getPlaybackState();
  }

  skipAhead() {
    if (this.verificationLockActive || this.accessRedirectState) {
      return this.getPlaybackState();
    }

    if (this.queuedEndingScene) {
      this.startEndingScene(this.queuedEndingScene.config);
      return this.getPlaybackState();
    }

    if (this.endingSceneState) {
      if (this.endingSceneState.segmentIndex + 1 < this.endingSceneState.segments.length) {
        this.loadEndingSection(this.endingSceneState.segmentIndex + 1);
        return this.getPlaybackState();
      }

      this.endingSceneState.visibleCounts = this.endingSceneState.lineLayouts.map((line) => line.text.length);
      this.endingSceneState.currentLine = Math.max(0, this.endingSceneState.lineLayouts.length - 1);
      this.endingSceneState.backgroundFadeAlpha = this.endingSceneState.segment.fadeToWhite ? 1 : this.endingSceneState.backgroundFadeAlpha;
      this.endingSceneState.logoRevealAt = this.scriptClock;
      this.endingSceneState.logoFadeOutStartAt = this.scriptClock;
      this.endingSceneState.logoAlpha = 0;
      this.endingSceneState.blackFadeStartAt = this.scriptClock;
      this.endingSceneState.blackFadeAlpha = 1;
      this.endingSceneState.done = true;
      this.finished = true;
      this.refreshEndingOverlay(this.endingSceneState);
      return this.getPlaybackState();
    }

    if (this.isActionRunning) {
      this.actionToken += 1;
      this.isActionRunning = false;
      this.advanceFromCurrentSource();
      return this.getPlaybackState();
    }

    if (this.choiceMenuState) {
      this.choiceMenuState = null;
      this.lastTappedOption = -1;
      this.clearChoiceOverlay();
      this.advanceFromCurrentSource();
      return this.getPlaybackState();
    }

    if (!this.item || this.item.runAction) {
      this.advanceFromCurrentSource();
      return this.getPlaybackState();
    }

    const partCount = this.item.parsedMessages?.length ?? 0;

    if (partCount > 0 && this.messagePartIndex + 1 < partCount) {
      this.loadMessagePart(this.messagePartIndex + 1);
      return this.getPlaybackState();
    }

    if (this.item.choice) {
      this.startChoice(this.item.choice);
      return this.getPlaybackState();
    }

    if (this.item.endingOverlay) {
      this.startEndingScene(this.item.endingOverlay);
      return this.getPlaybackState();
    }

    this.advanceFromCurrentSource();
    return this.getPlaybackState();
  }

  startEndingScene(config) {
    this.choiceMenuState = null;
    this.charSpeedMultiplier = 1;
    this.endingSceneState = {
      config,
      segments: getEndingSections(config),
      segmentIndex: 0,
      segment: null,
      lineLayouts: [],
      visibleCounts: [],
      currentLine: 0,
      nextCharAt: this.scriptClock,
      pauseMap: new Map(),
      segmentAdvanceAt: null,
      backgroundFadeAlpha: 0,
      backgroundFadeStartAlpha: 0,
      backgroundFadeDurationMs: frameMs,
      segmentStartAt: this.scriptClock,
      textColorChannel: 255,
      logoRevealAt: null,
      logoFadeOutStartAt: null,
      logoAlpha: 0,
      blackFadeStartAt: null,
      blackFadeAlpha: 0,
      done: false,
    };
    this.queuedEndingScene = null;
    this.typedGlyphs = [];
    this.stepAdvanceAt = null;
    this.partSwitchAt = null;
    this.shouldFadeText = false;
    this.keepTextVisible = false;
    this.textAlpha = 1;
    this.glowFlash = 0;
    this.clearChoiceOverlay();
    this.clearEndingOverlay();
    this.loadEndingSection(0);
    this.refreshEndingOverlay(this.endingSceneState);
  }

  isEndingSpeedLocked() {
    if (this.verificationLockActive || this.accessRedirectState) {
      return true;
    }

    if (this.queuedEndingScene || this.endingSceneState) {
      return true;
    }

    if (!this.item?.endingOverlay || this.item.runAction) {
      return false;
    }

    return this.messagePartIndex === this.item.parsedMessages.length - 1;
  }

  loadEndingSection(segmentIndex) {
    const state = this.endingSceneState;
    const segment = state?.segments?.[segmentIndex];

    if (!state || !segment) {
      if (state) {
        state.done = true;
      }

      this.finished = true;
      return;
    }

    const lines = segment.lines ?? [];
    const fontSize = segment.fontSize ?? this.mode.fontSize;

    this.context.save();
    this.context.font = `${fontSize}px ${menuFontFamily}`;
    this.context.fontKerning = "none";

    let blockLeftX = (segment.x ?? 160) * 2;
    const measuredLines = lines.map((text, index) => {
      const x = (segment.x ?? 160) * 2;
      const requestedAlign = segment.lineAligns?.[index] ?? (segment.align ?? "center");
      const width = this.context.measureText(text).width;
      const effectiveX = requestedAlign === "center" ? x : blockLeftX;

      if (index === 0) {
        blockLeftX = requestedAlign === "center" ? (x - (width / 2)) : effectiveX;
      }

      return {
        text,
        x: effectiveX,
        y: ((segment.y ?? 100) + (index * (segment.lineHeight ?? defaultPromptLineHeight))) * 2,
        align: requestedAlign,
        width,
      };
    });

    this.context.restore();

    state.segmentIndex = segmentIndex;
    state.segment = segment;
    state.lineLayouts = measuredLines;
    state.visibleCounts = lines.map(() => 0);
    state.currentLine = 0;
    state.nextCharAt = this.scriptClock + (segment.initialDelayMs ?? 0);
    state.pauseMap = buildEndingPauseMap(segment);
    state.segmentAdvanceAt = null;
    state.segmentStartAt = this.scriptClock;
    state.backgroundFadeStartAlpha = state.backgroundFadeAlpha ?? 0;
    state.backgroundFadeDurationMs = segment.fadeToWhite
      ? Math.max(frameMs, segment.fadeDurationMs ?? estimateEndingSectionDuration(segment))
      : frameMs;
    state.textColorChannel = segment.fadeTextToBlack
      ? Math.round((1 - state.backgroundFadeStartAlpha) * 255)
      : 255;
    state.done = false;
  }

  startAccessRedirect(config) {
    this.choiceMenuState = null;
    this.endingSceneState = null;
    this.queuedEndingScene = null;
    this.stepAdvanceAt = null;
    this.partSwitchAt = null;
    this.accessRedirectState = {
      config,
      startedAt: this.scriptClock,
      fadeDurationMs: Math.max(frameMs, config.fadeDurationMs ?? (frameMs * 24)),
      alpha: 0,
      redirected: false,
    };
    this.clearChoiceOverlay();
    this.clearEndingOverlay();
  }

  updateAccessRedirect() {
    const state = this.accessRedirectState;

    if (!state || state.redirected) {
      return;
    }

    const elapsedMs = Math.max(0, this.scriptClock - state.startedAt);
    state.alpha = Math.min(1, elapsedMs / state.fadeDurationMs);

    if (state.alpha < 1) {
      return;
    }

    state.redirected = true;
    this.finished = true;

    if (state.config.pagePath === "verif/index.html") {
      goToVerificationPage();
      return;
    }

    if (window.ownership_gate?.go_to_page) {
      window.ownership_gate.go_to_page(state.config.pagePath);
      return;
    }

    window.location.href = `../${state.config.pagePath}`;
  }

  start() {
    requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  frame(timestamp) {
    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const deltaMs = timestamp - this.lastTimestamp;
    const deltaFrames = deltaMs / frameMs;
    this.lastTimestamp = timestamp;

    this.update(deltaFrames, timestamp);
    this.render(timestamp);

    requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp));
  }

  update(deltaFrames, timestamp) {
    const frameInput = readInputFrame();
    const endingSpeedLocked = this.isEndingSpeedLocked();

    if (endingSpeedLocked) {
      this.charSpeedMultiplier = 1;
    } else {
      const targetSpeed = frameInput.speedHeld ? 4.25 : 1;
      const ramp = Math.min(1, deltaFrames * 0.18);
      this.charSpeedMultiplier += (targetSpeed - this.charSpeedMultiplier) * ramp;
    }

    this.scriptClock += deltaFrames * frameMs;

    if (this.queuedEndingScene) {
      if (this.scriptClock >= this.queuedEndingScene.activateAt) {
        this.startEndingScene(this.queuedEndingScene.config);
      }

      this.glowFlash = Math.max(0, this.glowFlash - (0.055 * deltaFrames));
      return;
    }

    if (this.accessRedirectState) {
      this.updateAccessRedirect();
      this.glowFlash = Math.max(0, this.glowFlash - (0.055 * deltaFrames));
      return;
    }

    if (this.endingSceneState) {
      this.updateEndingScene();
      this.glowFlash = Math.max(0, this.glowFlash - (0.055 * deltaFrames));
      return;
    }

    if (this.isActionRunning) {
      this.glowFlash = Math.max(0, this.glowFlash - (0.055 * deltaFrames));
      return;
    }

    if (this.choiceMenuState) {
      this.updateChoiceMenu(deltaFrames, frameInput);
    } else if (!this.finished) {
      let safety = 0;

      if (this.partSwitchAt !== null && this.scriptClock >= this.partSwitchAt) {
        this.partSwitchAt = null;
        this.loadMessagePart(this.messagePartIndex + 1);
      }

      while (!this.finished && !this.stepAdvanceAt && !this.partSwitchAt && this.scriptClock >= this.nextTokenTime && safety < 512) {
        safety += 1;
        this.processNextToken();
      }

      if (this.stepAdvanceAt !== null && this.scriptClock >= this.stepAdvanceAt) {
        this.advanceFromCurrentSource();
      }
    }

    if (this.choiceMenuState && this.choiceMenuState.phase !== "textFadeOut") {
      this.textAlpha = 1;
      this.shouldFadeText = false;
    } else if (this.shouldFadeText && !this.keepTextVisible) {
      this.textAlpha = Math.max(0, this.textAlpha - ((this.item.fadeOutFrames ?? 0.025) * deltaFrames));
    } else {
      this.textAlpha = Math.min(1, this.textAlpha + (0.08 * deltaFrames));
    }

    if (this.choiceMenuState && this.choiceMenuState.phase === "textFadeOut" && this.textAlpha <= 0) {
      this.completeChoiceTransition();
    }

    this.glowFlash = Math.max(0, this.glowFlash - (0.055 * deltaFrames));
  }

  processNextToken() {
    const token = this.tokens[this.currentTokenIndex];

    if (!token) {
      this.queueNextPartOrSequence();
      return;
    }

    this.currentTokenIndex += 1;

    if (token.type === "char") {
      this.typedGlyphs.push({
        char: token.value,
        x: this.textCursorX,
        y: this.textCursorY,
      });

      this.textCursorX += this.mode.charAdvance;
      this.nextTokenTime = this.scriptClock + (Math.max(0.22, this.mode.charDelayFrames / this.charSpeedMultiplier) * frameMs);

      if (this.item.endingOverlay && this.messagePartIndex === this.item.parsedMessages.length - 1 && this.currentTokenIndex >= this.tokens.length) {
        this.queuedEndingScene = {
          config: this.item.endingOverlay,
          activateAt: this.scriptClock + (this.item.endingOverlay.cutDelayMs ?? 0),
        };
      }

      return;
    }

    if (token.type === "newline") {
      this.textCursorX = this.lineStartX;
      this.textCursorY += this.mode.lineHeight;
      this.nextTokenTime = this.scriptClock;
      return;
    }

    if (token.type === "pause") {
      this.nextTokenTime = this.scriptClock + token.ms;
      return;
    }

    if (token.type === "command") {
      this.applyCommand(token);
      this.nextTokenTime = this.scriptClock;
      return;
    }

    if (token.type === "end") {
      this.queueNextPartOrSequence();
    }
  }

  queueNextPartOrSequence() {
    const hasNextPart = this.messagePartIndex + 1 < this.item.parsedMessages.length;

    if (hasNextPart) {
      this.partSwitchAt = this.scriptClock + frameMs;
      return;
    }

    if (this.item.choice) {
      this.startChoice(this.item.choice);
      return;
    }

    if (this.item.accessRedirect) {
      this.startAccessRedirect(this.item.accessRedirect);
      return;
    }

    this.stepAdvanceAt = this.scriptClock + ((this.item.postDelayFrames ?? 0) * frameMs);
  }

  advanceFromCurrentSource() {
    this.stepAdvanceAt = null;

    if (this.playbackSource === "branch") {
      const nextBranchIndex = this.branchStepIndex + 1;

      if (this.branchSteps && nextBranchIndex < this.branchSteps.length) {
        this.loadBranchStep(nextBranchIndex);
        return;
      }

      const parentBranchContext = this.branchContextStack.pop();

      if (parentBranchContext?.branchSteps && parentBranchContext.nextBranchIndex < parentBranchContext.branchSteps.length) {
        this.branchSteps = parentBranchContext.branchSteps;
        this.loadBranchStep(parentBranchContext.nextBranchIndex);
        return;
      }

      const resumeIndex = this.resumeScriptStep;
      this.branchSteps = null;
      this.resumeScriptStep = null;
      this.loadScriptStep(resumeIndex);
      return;
    }

    this.loadScriptStep(this.scriptStepIndex + 1);
  }

  applyCommand(token) {
    if (token.command !== "M") {
      return;
    }

    if (token.value === "0") {
      this.shouldFadeText = false;
      this.textAlpha = 1;
      return;
    }

    if (token.value === "1") {
      if (this.item.choice && this.messagePartIndex === this.item.parsedMessages.length - 1) {
        this.keepTextVisible = true;
        this.shouldFadeText = false;
        this.textAlpha = 1;
        return;
      }

      this.shouldFadeText = true;
      return;
    }

    if (token.value === "2") {
      this.glowFlash = 1;
    }
  }

  startChoice(choiceConfig) {
    this.context.save();
    this.context.font = `${this.mode.fontSize}px ${menuFontFamily}`;
    this.context.fontKerning = "none";
    this.context.textBaseline = "top";
    this.context.textAlign = "left";

    const optionLayouts = choiceConfig.options.map((label, index) => {
      const optionPosition = choiceConfig.optionPositions?.[index];
      const rawX = optionPosition?.x ?? choiceConfig.xPositions?.[index] ?? choiceConfig.xPositions?.[0] ?? 110;
      const y = ((optionPosition?.y ?? choiceConfig.y ?? 180) + choiceVerticalOffset) * 2;
      const width = this.context.measureText(label).width;
      const x = choiceConfig.optionAlign === "center"
        ? Math.round((rawX * 2) - (width / 2))
        : rawX * 2;
      const heartY = y + Math.round((this.mode.fontSize - soulHeight) / 2);

      return {
        label,
        x,
        y,
        width,
        heartX: Math.round(x + (width / 2) - (soulWidth / 2)),
        heartY,
      };
    });

    this.context.restore();

    const selectedIndex = choiceConfig.defaultIndex ?? -1;
    const neutralTarget = this.getNeutralChoiceHeartTarget(optionLayouts);
    const target = selectedIndex >= 0
      ? this.getChoiceHeartTarget(optionLayouts[selectedIndex])
      : neutralTarget;

    this.shouldFadeText = false;
    this.textAlpha = 1;
    this.choiceMenuState = {
      config: choiceConfig,
      optionLayouts,
      promptLayouts: (choiceConfig.promptLines ?? []).map((line, index) => ({
        text: line,
        x: (choiceConfig.promptX ?? 0) * 2,
        y: ((choiceConfig.promptY ?? 0) + (index * (choiceConfig.promptLineHeight ?? defaultPromptLineHeight))) * 2,
        align: choiceConfig.promptAlign ?? "left",
      })),
      directSelectionActions: choiceConfig.directSelectionActions ?? {},
      selectedIndex,
      alpha: 0,
      phase: "enter",
      fadeMainTextAfterMenu: choiceConfig.fadeMainTextAfterMenu ?? true,
      neutralHeartX: neutralTarget.x,
      neutralHeartY: neutralTarget.y,
      heartX: target.x,
      heartY: target.y,
    };

    this.lastTappedOption = -1;
    this.refreshChoiceOverlay(this.choiceMenuState);
  }

  getNeutralChoiceHeartTarget(optionLayouts) {
    if (optionLayouts.length === 0) {
      return { x: 0, y: 0 };
    }

    if (optionLayouts.length === 1) {
      return this.getChoiceHeartTarget(optionLayouts[0]);
    }

    if (optionLayouts.length === 3) {
      const middle = optionLayouts[1];

      return {
        x: middle.heartX,
        y: Math.round(middle.y - soulHeight - triChoiceNeutralSoulLift),
      };
    }

    const first = this.getChoiceHeartTarget(optionLayouts[0]);
    const last = this.getChoiceHeartTarget(optionLayouts[optionLayouts.length - 1]);

    return {
      x: Math.round((first.x + last.x) / 2),
      y: Math.round((first.y + last.y) / 2),
    };
  }

  getChoiceHeartTarget(layout) {
    return {
      x: layout.heartX,
      y: layout.heartY,
    };
  }

  getDirectionalChoiceIndex(state, direction) {
    if (!state || state.selectedIndex < 0 || !state.optionLayouts[state.selectedIndex]) {
      return this.getNeutralDirectionChoiceIndex(state, direction);
    }

    const current = state.optionLayouts[state.selectedIndex];
    const candidates = state.optionLayouts
      .map((option, index) => ({ index, x: option.heartX, y: option.heartY }))
      .filter((option) => option.index !== state.selectedIndex)
      .filter((option) => {
        if (direction === "left") return option.x < current.heartX - 1;
        if (direction === "right") return option.x > current.heartX + 1;
        if (direction === "up") return option.y < current.heartY - 1;
        if (direction === "down") return option.y > current.heartY + 1;
        return false;
      })
      .map((option) => {
        const primary = direction === "left"
          ? current.heartX - option.x
          : direction === "right"
            ? option.x - current.heartX
            : direction === "up"
              ? current.heartY - option.y
              : option.y - current.heartY;
        const secondary = direction === "left" || direction === "right"
          ? Math.abs(option.y - current.heartY)
          : Math.abs(option.x - current.heartX);
        return { ...option, primary, secondary };
      })
      .sort((a, b) => a.secondary - b.secondary || a.primary - b.primary);

    return candidates[0]?.index ?? state.selectedIndex;
  }

  getNeutralDirectionChoiceIndex(state, direction) {
    if (state.optionLayouts.length <= 2) {
      const neutralX = state.neutralHeartX;

      if (direction === "left" || direction === "up") {
        const leftOptions = state.optionLayouts
          .map((option, index) => ({ index, x: option.heartX }))
          .filter((option) => option.x < neutralX - 1)
          .sort((a, b) => b.x - a.x);

        if (leftOptions.length > 0) {
          return leftOptions[0].index;
        }

        return 0;
      }

      const rightOptions = state.optionLayouts
        .map((option, index) => ({ index, x: option.heartX }))
        .filter((option) => option.x > neutralX + 1)
        .sort((a, b) => a.x - b.x);

      if (rightOptions.length > 0) {
        return rightOptions[0].index;
      }

      return Math.max(0, state.optionLayouts.length - 1);
    }

    const neutralX = state.neutralHeartX;
    const neutralY = state.neutralHeartY;
    const candidates = state.optionLayouts.map((option, index) => ({
      index,
      x: option.heartX,
      y: option.heartY,
    }));

    const directionalCandidates = candidates
      .filter((option) => {
        if (direction === "left") {
          return option.x < neutralX - 1;
        }

        if (direction === "right") {
          return option.x > neutralX + 1;
        }

        if (direction === "up") {
          return option.y < neutralY - 1;
        }

        if (direction === "down") {
          return option.y > neutralY + 1;
        }

        return false;
      })
      .map((option) => {
        const primary = direction === "left"
          ? neutralX - option.x
          : direction === "right"
            ? option.x - neutralX
            : direction === "up"
              ? neutralY - option.y
              : option.y - neutralY;
        const secondary = direction === "left" || direction === "right"
          ? Math.abs(option.y - neutralY)
          : Math.abs(option.x - neutralX);

        return {
          ...option,
          primary,
          secondary,
        };
      })
      .sort((a, b) => a.primary - b.primary || a.secondary - b.secondary);

    if (directionalCandidates.length > 0) {
      return directionalCandidates[0].index;
    }

    const nearestOverall = candidates
      .map((option) => ({
        ...option,
        distance: ((option.x - neutralX) ** 2) + ((option.y - neutralY) ** 2),
      }))
      .sort((a, b) => a.distance - b.distance);

    return nearestOverall[0]?.index ?? 0;
  }

  completeChoiceTransition() {
    const state = this.choiceMenuState;

    if (!state || state.selectedIndex < 0) {
      return;
    }

    const branchSteps = state.config.branches[state.selectedIndex];
    this.clearChoiceOverlay();

    if (!branchSteps || branchSteps.length === 0) {
      this.choiceMenuState = null;
      this.advanceFromCurrentSource();
      return;
    }

    this.choiceMenuState = null;
    if (this.playbackSource === "branch" && this.branchSteps) {
      this.branchContextStack.push({
        branchSteps: this.branchSteps,
        nextBranchIndex: this.branchStepIndex + 1,
      });
    }
    this.branchSteps = branchSteps;
    if (this.playbackSource !== "branch") {
      this.resumeScriptStep = this.scriptStepIndex + 1;
    }
    this.loadBranchStep(0);
  }

  updateEndingScene() {
    const state = this.endingSceneState;

    if (!state || state.done) {
      return;
    }

    if (state.segment?.fadeToWhite) {
      const elapsedMs = Math.max(0, this.scriptClock - state.segmentStartAt);
      const fadeProgress = Math.min(1, elapsedMs / Math.max(frameMs, state.backgroundFadeDurationMs));
      state.backgroundFadeAlpha = state.backgroundFadeStartAlpha + ((1 - state.backgroundFadeStartAlpha) * fadeProgress);
    }

    if (state.segment?.fadeTextToBlack) {
      state.textColorChannel = Math.round((1 - (state.backgroundFadeAlpha ?? 0)) * 255);
    } else {
      state.textColorChannel = 255;
    }

    if (state.logoRevealAt !== null && this.scriptClock >= state.logoRevealAt) {
      const logoConfig = state.config.logo ?? {};
      const fadeInDurationMs = Math.max(frameMs, logoConfig.fadeDurationMs ?? (frameMs * 30));
      const fadeInElapsedMs = this.scriptClock - state.logoRevealAt;
      const fadeOutDurationMs = Math.max(frameMs, state.config.finalLogoFadeOutDurationMs ?? (frameMs * 20));
      const fadeInAlpha = Math.min(1, fadeInElapsedMs / fadeInDurationMs);

      if (state.logoFadeOutStartAt === null) {
        state.logoAlpha = fadeInAlpha;
      } else if (this.scriptClock < state.logoFadeOutStartAt) {
        state.logoAlpha = 1;
      } else {
        const fadeOutElapsedMs = this.scriptClock - state.logoFadeOutStartAt;
        state.logoAlpha = Math.max(0, 1 - (fadeOutElapsedMs / fadeOutDurationMs));
      }

      if (state.lineLayouts.length > 0) {
        state.visibleCounts = state.visibleCounts.map(() => 0);
      }

      if (fadeInAlpha >= 1 && state.logoFadeOutStartAt === null) {
        state.logoFadeOutStartAt = this.scriptClock + (state.config.finalBlackFadeDelayMs ?? 0);
      }

      if (state.logoFadeOutStartAt !== null && this.scriptClock >= state.logoFadeOutStartAt && state.logoAlpha <= 0 && state.blackFadeStartAt === null) {
        state.blackFadeStartAt = this.scriptClock;
      }
    }

    if (state.blackFadeStartAt !== null && this.scriptClock >= state.blackFadeStartAt) {
      const fadeDurationMs = Math.max(frameMs, state.config.finalBlackFadeDurationMs ?? (frameMs * 30));
      const elapsedMs = this.scriptClock - state.blackFadeStartAt;
      state.blackFadeAlpha = Math.min(1, elapsedMs / fadeDurationMs);
    }

    if (state.logoRevealAt !== null && this.scriptClock >= state.logoRevealAt) {
      state.nextCharAt = this.scriptClock + frameMs;

      if (state.blackFadeStartAt !== null && state.blackFadeAlpha >= 1) {
        state.done = true;
        this.completeSetup();
      }

      return;
    }

    let safety = 0;

    while (!state.done && this.scriptClock >= state.nextCharAt && safety < 512) {
      safety += 1;

      const line = state.lineLayouts[state.currentLine];

      if (!line) {
        state.done = true;
        this.finished = true;
        break;
      }

      const currentCount = state.visibleCounts[state.currentLine];

      if (currentCount < line.text.length) {
        const nextCount = currentCount + 1;
        const extraPauseMs = state.pauseMap.get(`${state.currentLine}:${nextCount}`) ?? 0;
        state.visibleCounts[state.currentLine] = nextCount;
        state.nextCharAt = this.scriptClock + (((state.segment?.charDelayMs ?? 120) + extraPauseMs) / this.charSpeedMultiplier);
        continue;
      }

      if (state.currentLine + 1 < state.lineLayouts.length) {
        state.currentLine += 1;
        state.nextCharAt = this.scriptClock + (state.segment?.linePauseMs ?? 180);
        continue;
      }

      if (state.segmentIndex + 1 < state.segments.length) {
        if (state.segmentAdvanceAt === null) {
          state.segmentAdvanceAt = this.scriptClock + (state.segment?.nextSegmentDelayMs ?? 0);
        }

        if (this.scriptClock < state.segmentAdvanceAt) {
          state.nextCharAt = state.segmentAdvanceAt;
          break;
        }

        state.segmentAdvanceAt = null;
        this.loadEndingSection(state.segmentIndex + 1);
        continue;
      }

      if (state.segment?.fadeToWhite && (state.backgroundFadeAlpha ?? 0) < 1) {
        state.nextCharAt = Math.max(this.scriptClock + frameMs, state.segmentStartAt + state.backgroundFadeDurationMs);
        break;
      }

      if (state.config.logo) {
        if (state.logoRevealAt === null) {
          state.logoRevealAt = this.scriptClock + (state.config.logo.delayMs ?? 0);
        }

        if (this.scriptClock < state.logoRevealAt || state.logoAlpha < 1) {
          state.nextCharAt = Math.max(this.scriptClock + frameMs, state.logoRevealAt);
          break;
        }
      }

      if (state.blackFadeStartAt === null) {
        state.blackFadeStartAt = this.scriptClock + (state.config.finalBlackFadeDelayMs ?? 0);
      }

      if (this.scriptClock < state.blackFadeStartAt || state.blackFadeAlpha < 1) {
        state.nextCharAt = Math.max(this.scriptClock + frameMs, state.blackFadeStartAt);
        break;
      }

      state.done = true;
      this.completeSetup();
    }
  }

  updateChoiceMenu(deltaFrames, frameInput) {
    const state = this.choiceMenuState;

    if (!state) {
      return;
    }

    const lastIndex = state.optionLayouts.length - 1;

    if (state.phase === "enter") {
      state.alpha = Math.min(1, state.alpha + (deltaFrames / choiceFadeInFrames));

      if (state.alpha >= 1) {
        state.phase = "idle";
      }
    } else if (state.phase === "idle") {
      const useSpatialChoiceNavigation = state.config.navigationMode === "spatial";

      if (frameInput.leftPressed) {
        state.selectedIndex = useSpatialChoiceNavigation
          ? this.getDirectionalChoiceIndex(state, "left")
          : state.selectedIndex < 0
            ? this.getNeutralDirectionChoiceIndex(state, "left")
            : Math.max(0, state.selectedIndex - 1);
        this.lastTappedOption = -1;
      }

      if (frameInput.rightPressed) {
        state.selectedIndex = useSpatialChoiceNavigation
          ? this.getDirectionalChoiceIndex(state, "right")
          : state.selectedIndex < 0
            ? this.getNeutralDirectionChoiceIndex(state, "right")
            : Math.min(lastIndex, state.selectedIndex + 1);
        this.lastTappedOption = -1;
      }

      if (frameInput.upPressed) {
        state.selectedIndex = useSpatialChoiceNavigation
          ? this.getDirectionalChoiceIndex(state, "up")
          : state.selectedIndex < 0
            ? this.getNeutralDirectionChoiceIndex(state, "up")
            : Math.max(0, state.selectedIndex - 1);
        this.lastTappedOption = -1;
      }

      if (frameInput.downPressed) {
        state.selectedIndex = useSpatialChoiceNavigation
          ? this.getDirectionalChoiceIndex(state, "down")
          : state.selectedIndex < 0
            ? this.getNeutralDirectionChoiceIndex(state, "down")
            : Math.min(lastIndex, state.selectedIndex + 1);
        this.lastTappedOption = -1;
      }

      if (frameInput.confirmPressed && state.selectedIndex >= 0) {
        if (this.triggerDirectChoiceAction(state.selectedIndex)) {
          this.refreshChoiceOverlay(state);
          return;
        }

        state.phase = "menuFadeOut";
      }
    } else if (state.phase === "menuFadeOut") {
      state.alpha = Math.max(0, state.alpha - (deltaFrames / choiceFadeOutFrames));

      if (state.alpha <= 0) {
        if (state.fadeMainTextAfterMenu) {
          state.phase = "textFadeOut";
          this.keepTextVisible = false;
          this.shouldFadeText = true;
        } else {
          this.completeChoiceTransition();
          return;
        }
      }
    }

    const target = state.selectedIndex >= 0
      ? this.getChoiceHeartTarget(state.optionLayouts[state.selectedIndex])
      : {
          x: state.neutralHeartX,
          y: state.neutralHeartY,
        };

    if (Math.abs(state.heartX - target.x) <= 2) {
      state.heartX = target.x;
    }

    if (Math.abs(state.heartY - target.y) <= 2) {
      state.heartY = target.y;
    }

    state.heartX += (target.x - state.heartX) * 0.18;
    state.heartY += (target.y - state.heartY) * 0.18;
  }

  render(timestamp) {
    const context = this.context;
    const width = this.screenCanvas.width;
    const height = this.screenCanvas.height;

    context.clearRect(0, 0, width, height);
    const endingBackgroundChannel = Math.round((this.endingSceneState?.backgroundFadeAlpha ?? 0) * 255);
    context.fillStyle = `rgb(${endingBackgroundChannel}, ${endingBackgroundChannel}, ${endingBackgroundChannel})`;
    context.fillRect(0, 0, width, height);

    context.font = `${this.mode.fontSize}px ${mainFontFamily}`;
    context.textBaseline = "top";
    context.textAlign = "left";

    const pulse = Math.sin(timestamp / 466);
    const crossAlpha = Math.max(0, 0.3 + (pulse * 0.1) + (this.glowFlash * 0.12));
    const diagonalAlpha = Math.max(0, 0.08 + (pulse * 0.04) + (this.glowFlash * 0.06));

    for (const glyph of this.typedGlyphs) {
      this.drawGlowGlyph(glyph, crossAlpha, diagonalAlpha);
    }

    if (this.choiceMenuState) {
      this.drawChoiceSoul(this.choiceMenuState);
      this.refreshChoiceOverlay(this.choiceMenuState);
      this.clearEndingOverlay();
    } else if (this.accessRedirectState) {
      this.clearChoiceOverlay();
      this.clearEndingOverlay();
      context.save();
      context.globalAlpha = Math.max(0, Math.min(1, this.accessRedirectState.alpha ?? 0));
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
      context.restore();
    } else if (this.endingSceneState) {
      this.clearChoiceOverlay();
      this.refreshEndingOverlay(this.endingSceneState);
      this.drawEndingLogo(this.endingSceneState);

      if ((this.endingSceneState.blackFadeAlpha ?? 0) > 0) {
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, this.endingSceneState.blackFadeAlpha));
        context.fillStyle = "#000000";
        context.fillRect(0, 0, width, height);
        context.restore();
      }
    } else {
      this.clearChoiceOverlay();
      this.clearEndingOverlay();
    }

    if (isDebugOverlayVisible) {
      this.drawDebugGrid(width, height);
    }
  }

  drawGlowGlyph(glyph, crossAlpha, diagonalAlpha) {
    const context = this.context;
    const mainAlpha = this.textAlpha;

    if (mainAlpha <= 0) {
      return;
    }

    context.save();
    context.fillStyle = `rgba(255, 255, 255, ${mainAlpha})`;
    context.fillText(glyph.char, glyph.x, glyph.y);

    const crossOffsets = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];

    context.fillStyle = `rgba(255, 255, 255, ${crossAlpha * mainAlpha})`;
    for (const [offsetX, offsetY] of crossOffsets) {
      context.fillText(glyph.char, glyph.x + offsetX, glyph.y + offsetY);
    }

    const diagonalOffsets = [
      [2, 2],
      [-2, -2],
      [-2, 2],
      [2, -2],
    ];

    context.fillStyle = `rgba(255, 255, 255, ${diagonalAlpha * mainAlpha})`;
    for (const [offsetX, offsetY] of diagonalOffsets) {
      context.fillText(glyph.char, glyph.x + offsetX, glyph.y + offsetY);
    }

    context.restore();
  }

  drawChoiceSoul(choiceMenuState) {
    const context = this.context;
    const soulAlpha = choiceMenuState.alpha;

    context.save();
    const drawAlpha = easeInOut(soulAlpha);

    if (drawAlpha > 0 && soulImage.complete && soulImage.naturalWidth > 0) {
      context.globalAlpha = 0.6 * drawAlpha;
      context.imageSmoothingEnabled = false;
      context.drawImage(
        soulImage,
        Math.round(choiceMenuState.heartX),
        Math.round(choiceMenuState.heartY),
        soulWidth,
        soulHeight,
      );
    }

    context.restore();
  }

  drawEndingLogo(endingSceneState) {
    if (!endingSceneState || endingSceneState.logoAlpha <= 0 || !logoImage.complete || logoImage.naturalWidth <= 0) {
      return;
    }

    const context = this.context;
    const logoConfig = endingSceneState.config.logo ?? {};
    const maxWidth = Math.max(1, logoConfig.maxWidth ?? this.screenCanvas.width);
    const drawWidth = Math.min(maxWidth, logoImage.naturalWidth);
    const drawHeight = drawWidth * (logoImage.naturalHeight / logoImage.naturalWidth);
    const drawX = Math.round((this.screenCanvas.width - drawWidth) / 2);
    const drawY = Math.round((this.screenCanvas.height - drawHeight) / 2);

    context.save();
    context.globalAlpha = Math.max(0, Math.min(1, endingSceneState.logoAlpha));
    context.imageSmoothingEnabled = true;
    context.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);
    context.restore();
  }

  handleChoicePointerHover(index, pointerType) {
    const state = this.choiceMenuState;

    if (!state || (state.phase !== "enter" && state.phase !== "idle")) {
      return;
    }

    if (pointerType === "touch") {
      return;
    }

    state.selectedIndex = index;
    this.lastTappedOption = -1;
  }

  triggerDirectChoiceAction(index) {
    const state = this.choiceMenuState;

    if (!state || (state.phase !== "enter" && state.phase !== "idle")) {
      return false;
    }

    const action = state.directSelectionActions?.[index];

    if (!action) {
      return false;
    }

    state.selectedIndex = index;
    state.phase = "actionWait";
    this.lastTappedOption = -1;
    const activeState = state;
    let actionPromise = null;

    if (action.type === "import-save-files") {
      actionPromise = importSaveFiles();
    } else if (action.type === "import-save-code") {
      actionPromise = importSaveCode();
    } else {
      state.phase = "idle";
      return false;
    }

    actionPromise
      .then((result) => {
        if (this.choiceMenuState !== activeState) {
          return;
        }

        if (result?.cancelled) {
          activeState.phase = "idle";
          return;
        }

        skipNextImportAction = true;
        activeState.phase = "menuFadeOut";
      })
      .catch((error) => {
        if (this.choiceMenuState !== activeState) {
          return;
        }

        console.error("Direct save import failed:", error);
        activeState.phase = "idle";
      });

    return true;
  }

  handleImmediateChoiceConfirm() {
    const state = this.choiceMenuState;

    if (!state || state.selectedIndex < 0) {
      return false;
    }

    return this.triggerDirectChoiceAction(state.selectedIndex);
  }

  handleChoicePointerPress(index, pointerType) {
    const state = this.choiceMenuState;

    if (!state || (state.phase !== "enter" && state.phase !== "idle")) {
      return;
    }

    if (pointerType === "touch") {
      if (state.selectedIndex === index && state.phase === "idle") {
        if (this.triggerDirectChoiceAction(index)) {
          return;
        }

        state.phase = "menuFadeOut";
        this.lastTappedOption = -1;
        return;
      }

      state.selectedIndex = index;
      this.lastTappedOption = index;
      return;
    }

    state.selectedIndex = index;
    this.lastTappedOption = -1;

    if (state.phase === "idle") {
      if (this.triggerDirectChoiceAction(index)) {
        return;
      }

      state.phase = "menuFadeOut";
    }
  }

  refreshChoiceOverlay(choiceMenuState) {
    if (!this.choiceOverlay || !choiceMenuState) {
      return;
    }

    while (this.choiceNodes.length < choiceMenuState.optionLayouts.length) {
      const node = document.createElement("div");
      node.className = "choice-option";
      node.addEventListener("pointerenter", (event) => {
        const index = Number(event.currentTarget.dataset.choiceIndex ?? -1);
        if (index >= 0) {
          this.handleChoicePointerHover(index, event.pointerType);
        }
      });
      node.addEventListener("pointermove", (event) => {
        const index = Number(event.currentTarget.dataset.choiceIndex ?? -1);
        if (index >= 0) {
          this.handleChoicePointerHover(index, event.pointerType);
        }
      });
      node.addEventListener("pointerdown", (event) => {
        const index = Number(event.currentTarget.dataset.choiceIndex ?? -1);
        if (index >= 0) {
          if (event.pointerType === "touch") {
            event.preventDefault();
          }

          this.handleChoicePointerPress(index, event.pointerType);
        }
      });
      this.choiceOverlay.appendChild(node);
      this.choiceNodes.push(node);
    }

    while (this.choiceNodes.length > choiceMenuState.optionLayouts.length) {
      const node = this.choiceNodes.pop();
      node.remove();
    }

    while (this.promptNodes.length < choiceMenuState.promptLayouts.length) {
      const node = document.createElement("div");
      node.className = "choice-prompt";
      this.choiceOverlay.appendChild(node);
      this.promptNodes.push(node);
    }

    while (this.promptNodes.length > choiceMenuState.promptLayouts.length) {
      const node = this.promptNodes.pop();
      node.remove();
    }

    const rect = this.choiceOverlay.getBoundingClientRect();
    const stageZoom = getStageZoomValue();
    const scaleX = (rect.width / stageZoom) / this.screenCanvas.width;
    const scaleY = (rect.height / stageZoom) / this.screenCanvas.height;
    const fontSize = Math.max(1, Math.round(this.mode.fontSize * scaleY));
    const textAlpha = easeInOut(choiceMenuState.alpha);

    for (let index = 0; index < choiceMenuState.promptLayouts.length; index += 1) {
      const prompt = choiceMenuState.promptLayouts[index];
      const node = this.promptNodes[index];
      node.textContent = prompt.text;
      node.style.left = `${Math.round(prompt.x * scaleX)}px`;
      node.style.top = `${Math.round(prompt.y * scaleY)}px`;
      node.style.fontSize = `${fontSize}px`;
      node.style.opacity = `${textAlpha}`;
      node.style.textAlign = prompt.align;
      node.style.transform = prompt.align === "center" ? "translateX(-50%)" : "none";
    }

    for (let index = 0; index < choiceMenuState.optionLayouts.length; index += 1) {
      const option = choiceMenuState.optionLayouts[index];
      const node = this.choiceNodes[index];
      node.dataset.choiceIndex = String(index);
      node.textContent = option.label;
      node.style.left = `${Math.round(option.x * scaleX)}px`;
      node.style.top = `${Math.round(option.y * scaleY)}px`;
      node.style.fontSize = `${fontSize}px`;
      node.style.opacity = `${textAlpha}`;
      node.classList.toggle("is-selected", index === choiceMenuState.selectedIndex);
    }
  }

  clearChoiceOverlay() {
    if (!this.choiceOverlay) {
      return;
    }

    for (const node of this.choiceNodes) {
      node.remove();
    }

    for (const node of this.promptNodes) {
      node.remove();
    }

    this.choiceNodes = [];
    this.promptNodes = [];
  }

  refreshEndingOverlay(endingSceneState) {
    if (!this.choiceOverlay || !endingSceneState) {
      return;
    }

    while (this.endingNodes.length < endingSceneState.lineLayouts.length) {
      const node = document.createElement("div");
      node.className = "ending-line";
      this.choiceOverlay.appendChild(node);
      this.endingNodes.push(node);
    }

    while (this.endingNodes.length > endingSceneState.lineLayouts.length) {
      const node = this.endingNodes.pop();
      node.remove();
    }

    const rect = this.choiceOverlay.getBoundingClientRect();
    const stageZoom = getStageZoomValue();
    const scaleX = (rect.width / stageZoom) / this.screenCanvas.width;
    const scaleY = (rect.height / stageZoom) / this.screenCanvas.height;
    const fontSize = Math.max(1, Math.round(((endingSceneState.segment?.fontSize ?? endingSceneState.config.fontSize) ?? this.mode.fontSize) * scaleY));

    for (let index = 0; index < endingSceneState.lineLayouts.length; index += 1) {
      const line = endingSceneState.lineLayouts[index];
      const node = this.endingNodes[index];
      node.textContent = line.text.slice(0, endingSceneState.visibleCounts[index]);
      const align = line.align === "block-left" ? "left" : line.align;
      const left = align === "center"
        ? Math.round((line.x - (line.width / 2)) * scaleX)
        : Math.round(line.x * scaleX);
      node.style.left = `${left}px`;
      node.style.top = `${Math.round(line.y * scaleY)}px`;
      node.style.fontSize = `${fontSize}px`;
      node.style.textAlign = align === "center" ? "left" : align;
      node.style.transform = "none";
      node.style.color = `rgb(${endingSceneState.textColorChannel}, ${endingSceneState.textColorChannel}, ${endingSceneState.textColorChannel})`;
      node.style.webkitTextFillColor = `rgb(${endingSceneState.textColorChannel}, ${endingSceneState.textColorChannel}, ${endingSceneState.textColorChannel})`;
      const endingVisibility = endingSceneState.visibleCounts[index] > 0 ? 1 : 0;
      const fadeToBlackVisibility = 1 - Math.max(0, Math.min(1, endingSceneState.blackFadeAlpha ?? 0));
      node.style.opacity = `${endingVisibility * fadeToBlackVisibility}`;
    }
  }

  clearEndingOverlay() {
    if (!this.choiceOverlay) {
      return;
    }

    for (const node of this.endingNodes) {
      node.remove();
    }

    this.endingNodes = [];
  }

  drawDebugGrid(width, height) {
    const context = this.context;
    const centerX = width / 2;
    const centerY = height / 2;

    context.save();

    context.lineWidth = 1;

    for (let x = debugGridSpacing; x < width; x += debugGridSpacing) {
      context.strokeStyle = x === centerX ? "rgba(255, 255, 0, 0.7)" : "rgba(255, 255, 255, 0.12)";
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, height);
      context.stroke();
    }

    for (let y = debugGridSpacing; y < height; y += debugGridSpacing) {
      context.strokeStyle = y === centerY ? "rgba(255, 255, 0, 0.7)" : "rgba(255, 255, 255, 0.12)";
      context.beginPath();
      context.moveTo(0, y + 0.5);
      context.lineTo(width, y + 0.5);
      context.stroke();
    }

    context.strokeStyle = "rgba(255, 255, 255, 0.4)";
    context.strokeRect(0.5, 0.5, width - 1, height - 1);

    context.strokeStyle = "rgba(255, 255, 0, 0.9)";
    context.beginPath();
    context.moveTo(centerX + 0.5, 0);
    context.lineTo(centerX + 0.5, height);
    context.stroke();

    context.beginPath();
    context.moveTo(0, centerY + 0.5);
    context.lineTo(width, centerY + 0.5);
    context.stroke();

    context.fillStyle = "rgba(255, 255, 0, 0.9)";
    context.fillRect(centerX - 2, centerY - 2, 4, 4);

    context.restore();
  }
}

const screenCanvas = document.getElementById("survey-screen");
let surveyRenderer = null;

async function bootstrapSurveyProgram() {
  const hasOwnership = await checkSetupOwnership();
  const startupSequence = hasOwnership ? scriptItems : buildVerificationRequiredSequence();

  surveyRenderer = new SurveyProgramRenderer(screenCanvas, startupSequence, {
    verificationLockActive: !hasOwnership,
  });
  surveyRenderer.start();
  window.SurveyProgram = surveyRenderer;
  window.survey_program = surveyRenderer;
}

window.SurveyDebug = {
  list() {
    if (!surveyRenderer) {
      return [];
    }

    const entries = surveyRenderer.listJumpTargets();
    console.table(entries);
    return entries;
  },
  goto(target, messagePartIndex = 0) {
    if (!surveyRenderer) {
      return null;
    }

    return surveyRenderer.jumpToTarget(target, messagePartIndex, { standalone: false });
  },
  cut(target, messagePartIndex = 0) {
    if (!surveyRenderer) {
      return null;
    }

    return surveyRenderer.jumpToTarget(target, messagePartIndex, { standalone: true });
  },
  state() {
    if (!surveyRenderer) {
      return {
        ready: false,
      };
    }

    return surveyRenderer.getPlaybackState();
  },
  skip() {
    if (!surveyRenderer) {
      return null;
    }

    return surveyRenderer.skipAhead();
  },
  restart() {
    if (!surveyRenderer) {
      return null;
    }

    surveyRenderer.reset();
    return surveyRenderer.getPlaybackState();
  },
  end() {
    if (!surveyRenderer) {
      return null;
    }

    surveyRenderer.completeSetup();
    return {
      ready: true,
      finished: true,
      redirected: true,
    };
  },
};
window.survey_debug = window.SurveyDebug;
window.skipsetup = () => window.SurveyDebug.end();

bootstrapSurveyProgram().catch((error) => {
  console.error("Unable to start the setup survey:", error);
  goToVerificationPage();
});


function shouldUseSetupTouchSpeed(event) {
  if (isSaveCodeDialogOpen()) {
    return false;
  }
  const target = event?.target;
  if (target instanceof HTMLElement) {
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/i.test(target.tagName)) {
      return false;
    }
    if (target.closest?.(".choice-option, #save-code-modal")) {
      return false;
    }
  }
  return true;
}

function startSetupTouchSpeed(event) {
  if (!shouldUseSetupTouchSpeed(event)) {
    return;
  }
  setupTouchSpeedActive = true;
  heldKeys.setupTouchSpeedHeld = true;
  if (event?.cancelable) {
    event.preventDefault();
  }
}

function clearSetupTouchSpeed() {
  setupTouchSpeedActive = false;
  heldKeys.setupTouchSpeedHeld = false;
}

window.addEventListener("pointerdown", startSetupTouchSpeed, { passive: false, capture: true });
window.addEventListener("touchstart", startSetupTouchSpeed, { passive: false, capture: true });
window.addEventListener("mousedown", startSetupTouchSpeed, { passive: false, capture: true });
window.addEventListener("pointerup", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("pointercancel", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("touchend", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("touchcancel", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("mouseup", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("mouseleave", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("blur", clearSetupTouchSpeed, { passive: true, capture: true });
window.addEventListener("contextmenu", (event) => {
  if (shouldUseSetupTouchSpeed(event)) {
    event.preventDefault();
  }
}, { capture: true });

window.addEventListener("keydown", (event) => {
  if (isSaveCodeDialogOpen()) {
    return;
  }

  const key = event.key.toLowerCase();

  if (!event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && key.length === 1 && /^[a-z]$/.test(key)) {
    debugKeyBuffer = `${debugKeyBuffer}${key}`.slice(-debugToggleCode.length);

    if (debugKeyBuffer === debugToggleCode) {
      isDebugOverlayVisible = !isDebugOverlayVisible;
      debugKeyBuffer = "";
    }
  }

  if (key === "x") {
    event.preventDefault();
    heldKeys.speedX = true;
  }

  if (event.key === "Shift") {
    heldKeys.speedShift = true;
  }

  if (!event.repeat) {
    if (matchesDirectionalKey(event.key, "left")) {
      event.preventDefault();
      pressedKeys.left = true;
    }

    if (matchesDirectionalKey(event.key, "right")) {
      event.preventDefault();
      pressedKeys.right = true;
    }

    if (matchesDirectionalKey(event.key, "up")) {
      event.preventDefault();
      pressedKeys.up = true;
    }

    if (matchesDirectionalKey(event.key, "down")) {
      event.preventDefault();
      pressedKeys.down = true;
    }

    if (key === "z" || event.key === "Enter") {
      event.preventDefault();

      if (surveyRenderer?.handleImmediateChoiceConfirm && surveyRenderer.handleImmediateChoiceConfirm()) {
        return;
      }

      pressedKeys.confirm = true;
    }

    if (key === "r" && surveyRenderer) {
      surveyRenderer.reset();
    }
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (isSaveCodeDialogOpen()) {
    if (key === "x") {
      heldKeys.speedX = false;
    }

    if (event.key === "Shift") {
      heldKeys.speedShift = false;
    }

    return;
  }

  if (key === "x") {
    heldKeys.speedX = false;
  }

  if (event.key === "Shift") {
    heldKeys.speedShift = false;
  }
});

window.addEventListener("blur", () => {
  heldKeys.speedX = false;
  heldKeys.speedShift = false;
  heldKeys.setupTouchSpeedHeld = false;
  setupTouchSpeedActive = false;
  pressedKeys.left = false;
  pressedKeys.right = false;
  pressedKeys.up = false;
  pressedKeys.down = false;
  pressedKeys.confirm = false;
  debugKeyBuffer = "";
});


// setup-long-press-context-menu-guard
window.addEventListener("contextmenu", (event) => {
  if (shouldUseSetupTouchSpeed(event)) {
    event.preventDefault();
  }
}, { capture: true });
