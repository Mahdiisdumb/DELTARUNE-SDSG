function isMobileDevice() {
    if (navigator.userAgentData && navigator.userAgentData.mobile) {
        return true;
    }
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent);
}

function getPlayRootUrl() {
    const pathSegments = String(window.location.pathname || '')
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean);
    const playIndex = pathSegments.indexOf('play');

    if (playIndex === -1) {
        return new URL('./', window.location.href);
    }

    return new URL(`/${pathSegments.slice(0, playIndex + 1).join('/')}/`, window.location.origin);
}

function toPlaySpriteUrl(spritePath) {
    return new URL(String(spritePath || '').replace(/^\/+/, ''), getPlayRootUrl()).toString();
}

if (isMobileDevice()) {
    let mobileInteractionStylesInstalled = false;
    let positionModePauseToken = null;
    let positionModeUsedPauseWrapper = false;

    function getOrientation() {
        return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    function installMobileInteractionStyles() {
        if (mobileInteractionStylesInstalled) return;
        mobileInteractionStylesInstalled = true;

        if (!document.getElementById('dr-mobile-interaction-style')) {
            const style = document.createElement('style');
            style.id = 'dr-mobile-interaction-style';
            style.textContent = `
html, body, canvas,
#mobile-controls, #mobile-controls *,
#joystick-zone, #joystick-zone *,
#button-zone, #button-zone *,
#button-z, #button-z *,
#button-x, #button-x *,
#button-c, #button-c * {
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
  -webkit-tap-highlight-color: transparent !important;
  -webkit-user-drag: none !important;
  outline: none !important;
}
            `.trim();
            document.head.appendChild(style);
        }

        const root = document.documentElement;
        const body = document.body;
        [root, body].forEach((el) => {
            if (!el) return;
            el.style.webkitTapHighlightColor = 'transparent';
            el.style.webkitUserSelect = 'none';
            el.style.userSelect = 'none';
            el.style.webkitTouchCallout = 'none';
        });
    }

    function ensureMobileControlsLayer() {
        const mobileControls = document.getElementById('mobile-controls');

        if (!mobileControls || !document.body) {
            return null;
        }

        if (mobileControls.parentElement !== document.body) {
            document.body.appendChild(mobileControls);
        }

        Object.assign(mobileControls.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '10003',
            pointerEvents: 'none',
            isolation: 'isolate',
        });

        return mobileControls;
    }

    function setDefaultBottomLayout() {
        const joystick = document.getElementById('joystick-zone');
        const buttonZone = document.getElementById('button-zone');
        if (!joystick || !buttonZone) return;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const joystickSize = Math.min(120, screenWidth * 0.3);
        joystick.style.width = joystickSize + 'px';
        joystick.style.height = joystickSize + 'px';
        joystick.style.position = 'absolute';
        joystick.style.left = '10px';
        joystick.style.top = (screenHeight - joystickSize - 10) + 'px';

        const buttonWidth = 60;
        const buttonHeight = joystickSize;
        buttonZone.style.width = buttonWidth + 'px';
        buttonZone.style.height = buttonHeight + 'px';
        buttonZone.style.position = 'absolute';
        buttonZone.style.left = (10 + joystickSize + 10) + 'px';
        buttonZone.style.top = (screenHeight - buttonHeight - 10) + 'px';
        buttonZone.style.display = 'flex';
        buttonZone.style.flexDirection = 'column';
        buttonZone.style.justifyContent = 'space-between';
        buttonZone.style.alignItems = 'center';
    }

    function scaleFromBaseline(baselineW, baselineH, baselinePos, targetW, targetH) {
        return {
            left: Math.round((baselinePos.left / baselineW) * targetW),
            top: Math.round((baselinePos.top / baselineH) * targetH),
        };
    }

    function saveControlPositions() {
        const ids = ['button-z', 'button-x', 'button-c', 'button-zone', 'joystick-zone'];
        const data = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                data[id] = {
                    left: parseInt(el.style.left) || el.offsetLeft,
                    top: parseInt(el.style.top) || el.offsetTop,
                    width: el.offsetWidth,
                    height: el.offsetHeight,
                };
            }
        });
        data.dpadMode = window.dpadMode;

        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const orientation = getOrientation();
        allPositions[orientation] = data;
        localStorage.setItem('controlPositions', JSON.stringify(allPositions));
    }

    function resetControlPositions() {
        const orientation = getOrientation();
        const isPortrait = orientation === 'portrait';
        const w = isPortrait ?
            Math.min(window.innerWidth, window.innerHeight) :
            Math.max(window.innerWidth, window.innerHeight);
        const h = isPortrait ?
            Math.max(window.innerWidth, window.innerHeight) :
            Math.min(window.innerWidth, window.innerHeight);

        const baselinePos = getDefaultButtonPositionsForSize(w, h, orientation);
        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const saved = allPositions[orientation] || {};
        const ids = ['button-z', 'button-x', 'button-c', 'joystick-zone'];
        const buttonZone = document.getElementById('button-zone');
        let prevDisplay = '';
        if (buttonZone) {
            prevDisplay = buttonZone.style.display || '';
            buttonZone.style.display = 'none';
        }
        ids.forEach(id => {
            const el = document.getElementById(id);
            const p = baselinePos[id];
            if (!el || !p) return;
            el.style.position = 'absolute';
            el.style.left = p.left + 'px';
            el.style.top = p.top + 'px';
            if (id === 'joystick-zone') {
                const jSize = Math.round(w * 0.28);
                el.style.width = jSize + 'px';
                el.style.height = jSize + 'px';
                saved[id] = {
                    left: p.left,
                    top: p.top,
                    width: jSize,
                    height: jSize,
                };
            } else {
                saved[id] = {
                    left: p.left,
                    top: p.top
                };
            }
            if (el.parentElement !== document.body) {
                document.body.appendChild(el);
            }
            el.dataset.dragged = 'true';
            el.dataset.initialized = 'true';
        });
        if (buttonZone) {
            buttonZone.style.display = prevDisplay;
        }
        allPositions[orientation] = saved;
        localStorage.setItem('controlPositions', JSON.stringify(allPositions));
        if (typeof window.updateControlPositions === 'function') {
            window.updateControlPositions(getOrientation());
        }
    }

    function getDefaultButtonPositionsForSize(screenW, screenH, orientation) {
        const isPortrait = orientation === 'portrait';
        const baseline = isPortrait ? BASELINE_PORTRAIT : BASELINE_LANDSCAPE;
        const designMaxX = isPortrait ? BASE_PORTRAIT_W : 667;
        const designMaxY = isPortrait ? BASE_PORTRAIT_H : 375;
        const out = {};
        for (const id in baseline) {
            out[id] = scaleFromBaseline(designMaxX, designMaxY, baseline[id], screenW, screenH);
        }
        return out;
    }

    function ensurePortraitDefaultsOnly() {
        const allDefaults = JSON.parse(localStorage.getItem('defaultPositions') || '{}');
        if (allDefaults.portrait) return;

        const portraitW = Math.min(window.innerWidth, window.innerHeight);
        const portraitH = Math.max(window.innerWidth, window.innerHeight);
        const portraitDefaults = getDefaultButtonPositionsForSize(portraitW, portraitH, 'portrait');

        const ids = ['button-z', 'button-x', 'button-c', 'joystick-zone', 'button-zone'];
        const portraitStored = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            const p = portraitDefaults[id] || {
                left: 10,
                top: 10
            };
            portraitStored[id] = {
                left: p.left,
                top: p.top,
                width: (el && el.offsetWidth) ? el.offsetWidth : (id === 'joystick-zone' ? Math.round(portraitW * 0.28) : 75),
                height: (el && el.offsetHeight) ? el.offsetHeight : (id === 'joystick-zone' ? Math.round(portraitW * 0.28) : 75),
            };
        });
        allDefaults.portrait = portraitStored;
        localStorage.setItem('defaultPositions', JSON.stringify(allDefaults));
    }

    function captureDefaultPositions() {
        ensurePortraitDefaultsOnly();
        const orientation = getOrientation();
        const allDefaults = JSON.parse(localStorage.getItem('defaultPositions') || '{}');
        const orientationDefaults = allDefaults[orientation] || {};
        if (Object.keys(orientationDefaults).length > 0) {
            trueDefaultPositions[orientation] = orientationDefaults;
            return;
        }

        const ids = ['button-z', 'button-x', 'button-c', 'joystick-zone', 'button-zone'];
        const captured = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            captured[id] = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: el.offsetWidth,
                height: el.offsetHeight,
            };
        });
        allDefaults[orientation] = captured;
        localStorage.setItem('defaultPositions', JSON.stringify(allDefaults));
        trueDefaultPositions[orientation] = captured;
    }

    function requestPositionModePause() {
        positionModePauseToken = null;
        positionModeUsedPauseWrapper = false;

        if (typeof window.pause === 'function' && typeof window.resume === 'function') {
            try {
                positionModePauseToken = window.pause('mobile-position-mode');
                positionModeUsedPauseWrapper = true;
                return;
            } catch (_pauseError) {
                positionModePauseToken = null;
                positionModeUsedPauseWrapper = false;
            }
        }

        if (typeof GM_pause === "function") {
            GM_pause();
        }
    }

    function releasePositionModePause() {
        if (positionModeUsedPauseWrapper && typeof window.resume === 'function') {
            try {
                window.resume(positionModePauseToken);
            } catch (_resumeError) {
            }
        } else if (typeof GM_unpause === "function") {
            GM_unpause();
        }

        positionModePauseToken = null;
        positionModeUsedPauseWrapper = false;
    }

    function exitPositionMode() {
        if (!window.positionMode) return;
        window.positionMode = false;

        const overlay = document.getElementById('positionOverlay');
        if (overlay) overlay.style.display = 'none';
        const backButton = document.getElementById('exitPositionModeButton');
        if (backButton) backButton.style.display = 'none';
        const resetButton = document.getElementById('resetPositionsButton');
        if (resetButton) resetButton.style.display = 'none';

        ['button-z', 'button-x', 'button-c', 'joystick-zone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.pointerEvents = 'auto';
                el.style.zIndex = '';
                if (id === 'joystick-zone') {
                    el.querySelectorAll('*').forEach(child => {
                        child.style.pointerEvents = '';
                    });
                }
            }
        });

        saveControlPositions();
        if (typeof showUI === "function") showUI();
        releasePositionModePause();
        if (typeof window.createOrUpdateControls === "function") {
            window.createOrUpdateControls();
        }
    }

    function makeDraggable(el) {
        if (!el) return;
        if (el.dataset.dragBindingsApplied === '1') return;
        el.dataset.dragBindingsApplied = '1';
        el.style.touchAction = 'none';
        el.style.position = el.style.position || 'absolute';
        el.style.userSelect = 'none';
        el.style.webkitUserDrag = 'none';

        let offsetX = 0,
            offsetY = 0,
            isDragging = false,
            activeInputMode = null,
            activeTouchId = null;

        function startDrag(clientX, clientY, mode) {
            if (!window.positionMode) return false;
            if (activeInputMode && activeInputMode !== mode) return false;
            activeInputMode = mode;
            isDragging = true;
            offsetX = clientX - el.offsetLeft;
            offsetY = clientY - el.offsetTop;
            return true;
        }

        function updateDrag(clientX, clientY) {
            if (!isDragging || !window.positionMode) return;
            let newLeft = clientX - offsetX;
            let newTop = clientY - offsetY;

            const width = el.offsetWidth;
            const height = el.offsetHeight;
            const minLeft = 0;
            const maxLeft = window.innerWidth - width;
            const minTop = 0;
            const maxTop = window.innerHeight - height;

            newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
            newTop = Math.max(minTop, Math.min(newTop, maxTop));
            el.style.left = Math.round(newLeft) + 'px';
            el.style.top = Math.round(newTop) + 'px';
        }

        function endDrag() {
            if (!window.positionMode) {
                isDragging = false;
                activeInputMode = null;
                activeTouchId = null;
                return;
            }
            if (isDragging) {
                el.dataset.dragged = 'true';
                saveControlPositions();
            }
            isDragging = false;
            activeInputMode = null;
            activeTouchId = null;
        }

        el.addEventListener('pointerdown', e => {
            if (!window.positionMode) return;
            if (e.pointerType === 'mouse') return;
            e.preventDefault();
            if (!startDrag(e.clientX, e.clientY, 'pointer')) return;
            try {
                el.setPointerCapture(e.pointerId);
            } catch (err) {}
        });

        el.addEventListener('pointermove', e => {
            if (activeInputMode !== 'pointer') return;
            updateDrag(e.clientX, e.clientY);
        });

        el.addEventListener('pointerup', () => {
            if (activeInputMode !== 'pointer') return;
            endDrag();
        });

        el.addEventListener('pointercancel', () => {
            if (activeInputMode !== 'pointer') return;
            endDrag();
        });

        el.addEventListener('touchstart', e => {
            if (!window.positionMode || activeInputMode === 'pointer' || activeInputMode === 'mouse') return;
            if (e.changedTouches.length === 0) return;
            e.preventDefault();
            const touch = e.changedTouches[0];
            activeTouchId = touch.identifier;
            startDrag(touch.clientX, touch.clientY, 'touch');
        }, {
            passive: false
        });

        el.addEventListener('touchmove', e => {
            if (activeInputMode !== 'touch') return;
            const touch = Array.from(e.touches).find((item) => item.identifier === activeTouchId);
            if (!touch) return;
            e.preventDefault();
            updateDrag(touch.clientX, touch.clientY);
        }, {
            passive: false
        });

        const releaseTouchDrag = e => {
            if (activeInputMode !== 'touch') return;
            if (!Array.from(e.changedTouches).some((item) => item.identifier === activeTouchId)) return;
            e.preventDefault();
            endDrag();
        };
        el.addEventListener('touchend', releaseTouchDrag, {
            passive: false
        });
        el.addEventListener('touchcancel', releaseTouchDrag, {
            passive: false
        });

        el.addEventListener('mousedown', e => {
            if (!window.positionMode || e.button !== 0) return;
            e.preventDefault();
            startDrag(e.clientX, e.clientY, 'mouse');
        });

        window.addEventListener('mousemove', e => {
            if (activeInputMode !== 'mouse') return;
            updateDrag(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', e => {
            if (activeInputMode !== 'mouse' || e.button !== 0) return;
            endDrag();
        });

        el.addEventListener('dragstart', e => {
            e.preventDefault();
        });
    }

    function loadControlPositions() {
        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const orientation = getOrientation();
        const requiredIds = ['button-z', 'button-x', 'button-c', 'joystick-zone'];
        const isPortrait = orientation === 'portrait';
        const w = isPortrait ?
            Math.min(window.innerWidth, window.innerHeight) :
            Math.max(window.innerWidth, window.innerHeight);
        const h = isPortrait ?
            Math.max(window.innerWidth, window.innerHeight) :
            Math.min(window.innerWidth, window.innerHeight);

        const scaledDefaults = getDefaultButtonPositionsForSize(w, h, orientation);
        const saved = { ...(allPositions[orientation] || {})
        };
        let changed = false;

        requiredIds.forEach(id => {
            if (!saved[id]) {
                const pos = scaledDefaults[id];
                if (pos) {
                    saved[id] = {
                        left: pos.left,
                        top: pos.top,
                        width: id === 'joystick-zone' ? Math.round(w * 0.28) : 75,
                        height: id === 'joystick-zone' ? Math.round(w * 0.28) : 75,
                    };
                    changed = true;
                }
            }
        });

        if (Object.keys(saved).length === 0) return;

        requiredIds.forEach(id => {
            const pos = saved[id];
            const el = document.getElementById(id);
            if (!el || !pos) return;
            el.style.position = 'absolute';
            el.style.left = pos.left + 'px';
            el.style.top = pos.top + 'px';
            if (pos.width) el.style.width = pos.width + 'px';
            if (pos.height) el.style.height = pos.height + 'px';
            if (el.parentElement !== document.body) {
                document.body.appendChild(el);
            }
            el.dataset.dragged = 'true';
            el.dataset.initialized = 'true';
        });

        if (changed) {
            allPositions[orientation] = saved;
            localStorage.setItem('controlPositions', JSON.stringify(allPositions));
        }

        if (typeof saved.dpadMode === 'boolean') {
            window.dpadMode = saved.dpadMode;
        }
    }

    function ensureDefaultPositionsForAllOrientations() {
        const allDefaults = JSON.parse(localStorage.getItem('defaultPositions') || '{}');
        const orientations = ['portrait', 'landscape'];

        orientations.forEach(o => {
            if (!allDefaults[o]) {
                const w = o === 'portrait' ?
                    Math.min(window.innerWidth, window.innerHeight) :
                    Math.max(window.innerWidth, window.innerHeight);
                const h = o === 'portrait' ?
                    Math.max(window.innerWidth, window.innerHeight) :
                    Math.min(window.innerWidth, window.innerHeight);

                const positions = getDefaultButtonPositionsForSize(w, h, o);

                ['button-z', 'button-x', 'button-c', 'joystick-zone', 'button-zone'].forEach(id => {
                    const el = document.getElementById(id);
                    const pos = positions[id] || {
                        left: 10,
                        top: 10
                    };
                    positions[id] = {
                        left: pos.left,
                        top: pos.top,
                        width: (el && el.offsetWidth) ? el.offsetWidth : (id === 'joystick-zone' ? Math.round(w * 0.28) : 75),
                        height: (el && el.offsetHeight) ? el.offsetHeight : (id === 'joystick-zone' ? Math.round(w * 0.28) : 75),
                    };
                });
                allDefaults[o] = positions;
            }
        });

        localStorage.setItem('defaultPositions', JSON.stringify(allDefaults));
    }


    let trueDefaultPositions = {};
    const BASE_PORTRAIT_W = 430;
    const BASE_PORTRAIT_H = 932;
    const BASELINE_PORTRAIT = {
        'button-c': {
            left: 319,
            top: 660
        },
        'button-x': {
            left: 275,
            top: 745
        },
        'button-z': {
            left: 235,
            top: 835
        },
        'joystick-zone': {
            left: 20,
            top: 685
        },
    };
    const BASELINE_LANDSCAPE = {
        'button-c': {
            left: 544,
            top: 46
        },
        'button-x': {
            left: 544,
            top: 146
        },
        'button-z': {
            left: 544,
            top: 246
        },
        'joystick-zone': {
            left: 20,
            top: 0
        },
    };

    window.dpadMode = false;
    window.toggleDpadMode = function() {
        window.dpadMode = !window.dpadMode;
        const allPositions = JSON.parse(localStorage.getItem('controlPositions') || '{}');
        const orientation = getOrientation();
        const saved = allPositions[orientation] || {};
        saved.dpadMode = window.dpadMode;
        allPositions[orientation] = saved;
        localStorage.setItem('controlPositions', JSON.stringify(allPositions));
        if (typeof window.createOrUpdateControls === "function") {
            window.createOrUpdateControls();
        }
    };

    window.positionMode = false;
    window.enterPositionMode = function() {
        if (window.positionMode) return;
        window.positionMode = true;
        requestPositionModePause();
        if (typeof hideUI === "function") hideUI();

        let overlay = document.getElementById('positionOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'positionOverlay';
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.15)',
                zIndex: 9998,
                pointerEvents: 'none',
            });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        let backButton = document.getElementById('exitPositionModeButton');
        if (!backButton) {
            backButton = document.createElement('button');
            backButton.id = 'exitPositionModeButton';
            backButton.textContent = '← back to game?';
            Object.assign(backButton.style, {
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 10000,
                padding: '8px 12px',
                fontSize: '16px',
                pointerEvents: 'auto',
            });
            overlay.appendChild(backButton);
            backButton.onclick = exitPositionMode;
        }
        backButton.style.display = 'block';

        let resetButton = document.getElementById('resetPositionsButton');
        if (!resetButton) {
            resetButton = document.createElement('button');
            resetButton.id = 'resetPositionsButton';
            resetButton.textContent = 'reset positions?';
            Object.assign(resetButton.style, {
                position: 'absolute',
                top: '50px',
                left: '10px',
                zIndex: 10000,
                padding: '8px 12px',
                fontSize: '16px',
                pointerEvents: 'auto',
            });
            overlay.appendChild(resetButton);
            resetButton.onclick = resetControlPositions;
        }
        resetButton.style.display = 'block';

        const buttons = ['button-z', 'button-x', 'button-c'];
        buttons.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            el.dataset.originalParent = el.parentElement.id || '';
            el.style.position = 'absolute';
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            el.style.zIndex = 10001;
            el.style.pointerEvents = 'auto';
            document.body.appendChild(el);
            makeDraggable(el);
        });

        const joystick = document.getElementById('joystick-zone');
        if (joystick) {
            const rect = joystick.getBoundingClientRect();
            let dragRect = rect;
            const directChildren = Array.from(joystick.children || []);
            const childRects = directChildren
                .map(child => child.getBoundingClientRect())
                .filter(childRect => childRect.width > 0 && childRect.height > 0);
            const smallerChildRect = childRects.find(childRect => {
                const childArea = childRect.width * childRect.height;
                const parentArea = rect.width * rect.height;
                return childArea > 0 && childArea <= (parentArea * 0.9);
            });

            if (smallerChildRect) {
                dragRect = smallerChildRect;
            } else if (rect.height > (rect.width * 1.35)) {
                const size = rect.width;
                dragRect = {
                    left: rect.left,
                    top: rect.top + ((rect.height - size) / 2),
                    width: size,
                    height: size
                };
            }

            joystick.style.position = 'absolute';
            joystick.style.left = dragRect.left + 'px';
            joystick.style.top = dragRect.top + 'px';
            joystick.style.right = 'auto';
            joystick.style.bottom = 'auto';
            joystick.style.width = dragRect.width + 'px';
            joystick.style.height = dragRect.height + 'px';
            joystick.style.zIndex = 100000;
            joystick.style.pointerEvents = 'auto';
            joystick.style.touchAction = 'none';
            joystick.querySelectorAll('*').forEach(child => {
                child.style.pointerEvents = 'none';
            });
            if (joystick.parentElement !== document.body) {
                document.body.appendChild(joystick);
            }
            makeDraggable(joystick);
        }
    };

    let mobileControlsInitialized = false;

    function initializeMobileControls() {
        if (mobileControlsInitialized) return;
        mobileControlsInitialized = true;

        installMobileInteractionStyles();
        const mobileControls = ensureMobileControlsLayer();

        if (!localStorage.getItem('controlPositions')) {
            captureDefaultPositions();
        }
        if (getOrientation() === 'portrait') {
            setDefaultBottomLayout();
        }
        ensureDefaultPositionsForAllOrientations();
        loadControlPositions();

        let fadeOverlay = document.getElementById("fadeOverlay");
        if (!fadeOverlay) {
            fadeOverlay = document.createElement("div");
            fadeOverlay.id = "fadeOverlay";
            Object.assign(fadeOverlay.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "black",
                opacity: "0",
                transition: "opacity 0.25s ease",
                pointerEvents: "none",
                zIndex: "9999"
            });
            document.body.appendChild(fadeOverlay);
        }

        if (mobileControls) {
            mobileControls.style.display = 'block';
        }

        const buttonZone = document.getElementById('button-zone');
        const joystickZone = document.getElementById('joystick-zone');
        if (!buttonZone || !joystickZone) return;

        function isInteractiveControlTarget(target) {
            return target instanceof Element && Boolean(
                target.closest('#button-zone, #joystick-zone, #button-z, #button-x, #button-c, #exitPositionModeButton, #resetPositionsButton')
            );
        }

        document.addEventListener('selectstart', (event) => {
            if (isInteractiveControlTarget(event.target)) {
                event.preventDefault();
            }
        }, {
            passive: false
        });

        let tapCount = 0;
        let tapTimer = null;
        const requiredTaps = 5;
        const tapTimeout = 400;
        document.body.addEventListener('touchstart', (event) => {
            showMobileControlsForTouchInput();
            if (isInteractiveControlTarget(event.target)) {
                return;
            }
            tapCount += 1;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, tapTimeout);
            if (tapCount >= requiredTaps) {
                if (typeof showUI === 'function') {
                    showUI();
                }
                tapCount = 0;
                clearTimeout(tapTimer);
            }
        }, {
            passive: true
        });

        document.body.addEventListener('pointerdown', (event) => {
            if (event.pointerType && event.pointerType !== 'mouse') {
                showMobileControlsForTouchInput();
            }
        }, {
            passive: true
        });

        window.addEventListener('keydown', (event) => {
            if (shouldHideForKeyboardEvent(event)) {
                hideMobileControlsForPhysicalInput();
            }
        });

        window.addEventListener('gamepadconnected', () => {
            if (gamepadPollIntervalId !== null) return;
            gamepadPollIntervalId = window.setInterval(() => {
                if (hasActiveGamepadInput()) {
                    hideMobileControlsForPhysicalInput();
                }
            }, 200);
        });

        window.addEventListener('gamepaddisconnected', () => {
            if (typeof navigator.getGamepads === 'function' && Array.from(navigator.getGamepads() || []).some(Boolean)) {
                return;
            }
            if (gamepadPollIntervalId !== null) {
                window.clearInterval(gamepadPollIntervalId);
                gamepadPollIntervalId = null;
            }
        });

        if (typeof navigator.getGamepads === 'function' && Array.from(navigator.getGamepads() || []).some(Boolean)) {
            gamepadPollIntervalId = window.setInterval(() => {
                if (hasActiveGamepadInput()) {
                    hideMobileControlsForPhysicalInput();
                }
            }, 200);
        }

        const keyState = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        const keyMap = {
            up: {
                key: 'ArrowUp',
                code: 38
            },
            down: {
                key: 'ArrowDown',
                code: 40
            },
            left: {
                key: 'ArrowLeft',
                code: 37
            },
            right: {
                key: 'ArrowRight',
                code: 39
            }
        };
        const supportsPointerInput = typeof window.PointerEvent === 'function';
        const supportsTouchInput = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
        const usePointerPrimaryInput = supportsPointerInput && !supportsTouchInput;
        const actionButtonStates = new Map();
        const actionButtonTouchBindings = new Map();
        let joystick = null;
        let renderedControlMode = null;
        let lastOrientation = getOrientation();
        let orientationRefreshTimer = null;
        let mobileControlsHiddenForPhysicalInput = false;
        let gamepadPollIntervalId = null;

        function rememberMobileControlStyle(el) {
            if (!el || el.dataset.mobileVisibilityStateCaptured === '1') return;
            el.dataset.mobileVisibilityStateCaptured = '1';
            el.dataset.mobileVisibilityOpacity = el.style.opacity || '';
            el.dataset.mobileVisibilityPointerEvents = el.style.pointerEvents || '';
            el.dataset.mobileVisibilityVisibility = el.style.visibility || '';
        }

        function setMobileControlElementVisible(el, visible) {
            if (!el) return;
            rememberMobileControlStyle(el);
            el.style.opacity = visible ? el.dataset.mobileVisibilityOpacity : '0';
            el.style.visibility = visible ? el.dataset.mobileVisibilityVisibility : 'hidden';
            el.style.pointerEvents = visible ? el.dataset.mobileVisibilityPointerEvents : 'none';
        }

        function setMobileControlsVisible(visible) {
            if (mobileControls) {
                mobileControls.style.display = 'block';
                mobileControls.style.opacity = '1';
                mobileControls.style.visibility = 'visible';
                mobileControls.style.pointerEvents = 'none';
            }

            [
                joystickZone,
                buttonZone,
                document.getElementById('button-z'),
                document.getElementById('button-x'),
                document.getElementById('button-c'),
            ].forEach((el) => setMobileControlElementVisible(el, visible));
        }

        function hideMobileControlsForPhysicalInput() {
            if (window.positionMode || mobileControlsHiddenForPhysicalInput) return;
            mobileControlsHiddenForPhysicalInput = true;
            setMobileControlsVisible(false);
        }

        function showMobileControlsForTouchInput() {
            if (window.positionMode || !mobileControlsHiddenForPhysicalInput) return;
            mobileControlsHiddenForPhysicalInput = false;
            setMobileControlsVisible(true);
        }

        function shouldHideForKeyboardEvent(event) {
            if (!event || event.isComposing || event.repeat) return false;
            if (event.isTrusted === false) return false;
            const key = String(event.key || '');
            if (!key) return false;
            if (event.ctrlKey || event.metaKey || event.altKey) return false;

            const ignoredKeys = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock']);
            if (ignoredKeys.has(key)) return false;
            if (key.length === 1) return true;

            return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Tab', 'Backspace', ' '].includes(key);
        }

        function hasActiveGamepadInput() {
            if (typeof navigator.getGamepads !== 'function') {
                return false;
            }

            const gamepads = navigator.getGamepads();
            if (!gamepads) {
                return false;
            }

            for (const gamepad of gamepads) {
                if (!gamepad) continue;
                if (gamepad.buttons?.some((button) => button && (button.pressed || button.value > 0.5))) {
                    return true;
                }
                if (gamepad.axes?.some((axis) => Math.abs(axis) > 0.35)) {
                    return true;
                }
            }

            return false;
        }

        function simulateKeyEvent(eventType, key, keyCode) {
            const normalizedKey = String(key || '');
            let eventCode = normalizedKey;

            if (/^[a-z]$/i.test(normalizedKey)) {
                eventCode = `Key${normalizedKey.toUpperCase()}`;
            } else if (normalizedKey === ' ') {
                eventCode = 'Space';
            }

            const keyboardEvent = new KeyboardEvent(eventType, {
                key: normalizedKey,
                code: eventCode,
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true,
                composed: true,
            });

            document.dispatchEvent(keyboardEvent);
        }

        function getReleasedDirectionalState() {
            return {
                up: false,
                down: false,
                left: false,
                right: false
            };
        }

        function updateKeyState(newKeyState) {
            for (const dir in keyState) {
                if (keyState[dir] && !newKeyState[dir]) {
                    simulateKeyEvent('keyup', keyMap[dir].key, keyMap[dir].code);
                } else if (!keyState[dir] && newKeyState[dir]) {
                    simulateKeyEvent('keydown', keyMap[dir].key, keyMap[dir].code);
                }
                keyState[dir] = newKeyState[dir];
            }
        }

        let pendingDirectionalReassertFrameId = 0;
        let pendingDirectionalReassertTimeoutIds = [];

        function reassertDirectionalKeysOnce() {
            for (const dir in keyState) {
                if (keyState[dir]) {
                    simulateKeyEvent('keydown', keyMap[dir].key, keyMap[dir].code);
                }
            }
        }

        function clearDirectionalReassertQueue() {
            if (pendingDirectionalReassertFrameId) {
                window.cancelAnimationFrame(pendingDirectionalReassertFrameId);
                pendingDirectionalReassertFrameId = 0;
            }

            pendingDirectionalReassertTimeoutIds.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            pendingDirectionalReassertTimeoutIds = [];
        }

        function releaseAllDirectionalKeys() {
            clearDirectionalReassertQueue();
            updateKeyState(getReleasedDirectionalState());
        }

        function queueDirectionalKeyReassert() {
            clearDirectionalReassertQueue();
            reassertDirectionalKeysOnce();

            pendingDirectionalReassertTimeoutIds.push(window.setTimeout(reassertDirectionalKeysOnce, 0));
            pendingDirectionalReassertTimeoutIds.push(window.setTimeout(reassertDirectionalKeysOnce, 24));

            pendingDirectionalReassertFrameId = window.requestAnimationFrame(() => {
                pendingDirectionalReassertFrameId = window.requestAnimationFrame(() => {
                    pendingDirectionalReassertFrameId = 0;
                    reassertDirectionalKeysOnce();
                });
            });
        }

        function destroyJoystick() {
            if (joystick && joystick.destroy) {
                joystick.destroy();
            }
            joystick = null;
        }

        function createJoystick() {
            const zone = document.getElementById('joystick-zone');
            if (!zone) return;
            zone.style.display = 'block';
            zone.style.overflow = 'visible';
            if (!zone.style.width) zone.style.width = '195px';
            if (!zone.style.height) zone.style.height = '195px';

            destroyJoystick();
            joystick = new JoyStick('joystick-zone', {
                internalFillColor: 'rgba(255,255,255,0)',
                internalStrokeColor: 'rgba(255,255,255,0.4)',
                externalStrokeColor: 'rgba(255,255,255,0.15)',
            }, (stickStatus) => {
                const x = stickStatus.x / 100;
                const y = stickStatus.y / 100;
                const threshold = 0.3;
                const newKeyState = getReleasedDirectionalState();

                if (y > threshold) newKeyState.up = true;
                if (y < -threshold) newKeyState.down = true;
                if (x < -threshold) newKeyState.left = true;
                if (x > threshold) newKeyState.right = true;
                updateKeyState(newKeyState);
            });
        }

        function createDpad() {
            const zone = document.getElementById('joystick-zone');
            if (!zone) return;

            zone.innerHTML = '';
            zone.style.display = 'flex';
            zone.style.alignItems = 'center';
            zone.style.justifyContent = 'center';

            const dpadContainer = document.createElement('div');
            dpadContainer.style.position = 'relative';
            dpadContainer.style.display = 'flex';
            dpadContainer.style.alignItems = 'center';
            dpadContainer.style.justifyContent = 'center';

            if (getOrientation() === 'portrait') {
                dpadContainer.style.width = '120px';
                dpadContainer.style.height = '120px';
                dpadContainer.style.transform = 'translate(20px, -17.5px)';
            } else {
                dpadContainer.style.width = '180px';
                dpadContainer.style.height = '180px';
            }
            zone.appendChild(dpadContainer);

            const directionsMap = {
                up: {
                    top: '5.5%',
                    left: '50%',
                    img: toPlaySpriteUrl('spr/dpad_up.svg'),
                    imgPressed: toPlaySpriteUrl('spr/dpad_up-pressed.svg')
                },
                down: {
                    top: '95.5%',
                    left: '50%',
                    img: toPlaySpriteUrl('spr/dpad_down.svg'),
                    imgPressed: toPlaySpriteUrl('spr/dpad_down-pressed.svg')
                },
                left: {
                    top: '50%',
                    left: '2.5%',
                    img: toPlaySpriteUrl('spr/dpad_left.svg'),
                    imgPressed: toPlaySpriteUrl('spr/dpad_left-pressed.svg')
                },
                right: {
                    top: '50%',
                    left: '96%',
                    img: toPlaySpriteUrl('spr/dpad_right.svg'),
                    imgPressed: toPlaySpriteUrl('spr/dpad_right-pressed.svg')
                },
            };

            const dpadElements = {};
            for (const id in directionsMap) {
                const dir = directionsMap[id];
                const wrapper = document.createElement('div');
                wrapper.style.position = 'absolute';
                wrapper.style.top = dir.top;
                wrapper.style.left = dir.left;
                wrapper.style.transform = 'translate(-50%, -50%)';
                wrapper.style.width = '30%';
                wrapper.style.height = '30%';

                const imgNormal = document.createElement('img');
                imgNormal.src = dir.img;
                imgNormal.style.cssText = 'position:absolute; width:100%; height:100%; opacity:0.5; transition:opacity 0.05s ease;';
                const imgPressed = document.createElement('img');
                imgPressed.src = dir.imgPressed;
                imgPressed.style.cssText = 'position:absolute; width:100%; height:100%; opacity:0; transition:opacity 0.05s ease;';

                wrapper.appendChild(imgNormal);
                wrapper.appendChild(imgPressed);
                dpadContainer.appendChild(wrapper);
                dpadElements[id] = {
                    normal: imgNormal,
                    pressed: imgPressed
                };
            }

            const touchLayer = document.createElement('div');
            touchLayer.style.cssText = 'position:absolute; top:-10%; left:-12.5%; width:124%; height:121%; z-index:10; background:transparent; touch-action:none;';
            dpadContainer.appendChild(touchLayer);

            const updateDpadVisualsAndState = (newKeyState) => {
                for (const id in dpadElements) {
                    const elem = dpadElements[id];
                    const pressed = newKeyState[id];
                    elem.normal.style.opacity = pressed ? '0' : '0.5';
                    elem.pressed.style.opacity = pressed ? '0.5' : '0';
                }
                updateKeyState(newKeyState);
            };

            function getDpadStateFromPoint(clientX, clientY) {
                const rect = dpadContainer.getBoundingClientRect();
                const normalizedX = ((clientX - rect.left) / rect.width - 0.5) * 2;
                const normalizedY = ((clientY - rect.top) / rect.height - 0.5) * 2;
                const threshold = 0.25;
                const newKeyState = getReleasedDirectionalState();

                if (normalizedY < -threshold) newKeyState.up = true;
                if (normalizedY > threshold) newKeyState.down = true;
                if (normalizedX < -threshold) newKeyState.left = true;
                if (normalizedX > threshold) newKeyState.right = true;
                return newKeyState;
            }

            function releaseDpad() {
                updateDpadVisualsAndState(getReleasedDirectionalState());
            }

            if (usePointerPrimaryInput) {
                let activePointerId = null;
                let usingMouseFallback = false;
                touchLayer.addEventListener('pointerdown', (event) => {
                    if (window.positionMode) return;
                    event.preventDefault();
                    activePointerId = event.pointerId;
                    usingMouseFallback = false;
                    try {
                        touchLayer.setPointerCapture(event.pointerId);
                    } catch (err) {}
                    updateDpadVisualsAndState(getDpadStateFromPoint(event.clientX, event.clientY));
                });
                touchLayer.addEventListener('pointermove', (event) => {
                    if (event.pointerId !== activePointerId) return;
                    event.preventDefault();
                    updateDpadVisualsAndState(getDpadStateFromPoint(event.clientX, event.clientY));
                });
                const releasePointer = (event) => {
                    if (event.pointerId !== activePointerId) return;
                    event.preventDefault();
                    activePointerId = null;
                    releaseDpad();
                };
                touchLayer.addEventListener('pointerup', releasePointer);
                touchLayer.addEventListener('pointercancel', releasePointer);
                touchLayer.addEventListener('lostpointercapture', () => {
                    activePointerId = null;
                    usingMouseFallback = false;
                    releaseDpad();
                });
                touchLayer.addEventListener('mousedown', (event) => {
                    if (window.positionMode || event.button !== 0 || activePointerId !== null) return;
                    event.preventDefault();
                    usingMouseFallback = true;
                    updateDpadVisualsAndState(getDpadStateFromPoint(event.clientX, event.clientY));
                });
                window.addEventListener('mousemove', (event) => {
                    if (!usingMouseFallback) return;
                    event.preventDefault();
                    updateDpadVisualsAndState(getDpadStateFromPoint(event.clientX, event.clientY));
                });
                window.addEventListener('mouseup', (event) => {
                    if (!usingMouseFallback || event.button !== 0) return;
                    usingMouseFallback = false;
                    releaseDpad();
                });
            } else {
                let activeTouchId = null;
                touchLayer.addEventListener('touchstart', (event) => {
                    if (window.positionMode || activeTouchId !== null || event.changedTouches.length === 0) return;
                    event.preventDefault();
                    activeTouchId = event.changedTouches[0].identifier;
                    updateDpadVisualsAndState(getDpadStateFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY));
                }, {
                    passive: false
                });
                touchLayer.addEventListener('touchmove', (event) => {
                    const activeTouch = Array.from(event.touches).find((touch) => touch.identifier === activeTouchId);
                    if (!activeTouch) return;
                    event.preventDefault();
                    updateDpadVisualsAndState(getDpadStateFromPoint(activeTouch.clientX, activeTouch.clientY));
                }, {
                    passive: false
                });
                const releaseTouch = (event) => {
                    if (!Array.from(event.changedTouches).some((touch) => touch.identifier === activeTouchId)) {
                        return;
                    }
                    event.preventDefault();
                    activeTouchId = null;
                    releaseDpad();
                };
                touchLayer.addEventListener('touchend', releaseTouch, {
                    passive: false
                });
                touchLayer.addEventListener('touchcancel', releaseTouch, {
                    passive: false
                });
            }
        }

        function createOrUpdateControls(force = false) {
            if (window.positionMode) return;

            const desiredMode = window.dpadMode ? 'dpad' : 'joystick';
            const needsRebuild = force || renderedControlMode !== desiredMode || joystickZone.childElementCount === 0;
            if (!needsRebuild) {
                return;
            }

            releaseAllDirectionalKeys();
            destroyJoystick();
            joystickZone.innerHTML = '';
            renderedControlMode = desiredMode;

            if (desiredMode === 'dpad') {
                createDpad();
            } else {
                createJoystick();
            }
        }

        function updateControlPositions(orientation) {
            if (window.positionMode) return;

            const isPortrait = orientation === "portrait";
            const saved = JSON.parse(localStorage.getItem('controlPositions') || '{}');
            const savedPositions = saved[orientation] || {};
            const savedJoystick = savedPositions['joystick-zone'];
            let buttonSize = 75;
            const buttonGap = 12;

            if (savedJoystick) {
                Object.assign(joystickZone.style, {
                    position: 'absolute',
                    left: savedJoystick.left + 'px',
                    top: savedJoystick.top + 'px',
                    right: 'auto',
                    bottom: 'auto',
                    width: (savedJoystick.width || joystickZone.offsetWidth) + 'px',
                    height: (savedJoystick.height || joystickZone.offsetHeight) + 'px'
                });
            } else if (!isPortrait) {
                Object.assign(joystickZone.style, {
                    position: 'absolute',
                    left: '5.5vw',
                    top: '0',
                    right: 'auto',
                    bottom: 'auto',
                    width: '25vw',
                    height: '100%'
                });
                Object.assign(buttonZone.style, {
                    position: 'absolute',
                    right: '2vw',
                    top: '0',
                    width: '25vw',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '25px',
                    pointerEvents: 'none',
                    background: 'transparent'
                });
                buttonSize = 90;
            } else {
                Object.assign(joystickZone.style, {
                    position: 'absolute',
                    left: '2vw',
                    top: 'auto',
                    right: 'auto',
                    bottom: '2vh',
                    width: '30vw',
                    height: '30vw'
                });
                Object.assign(buttonZone.style, {
                    position: 'absolute',
                    right: '2vw',
                    bottom: '2vh',
                    width: (buttonSize + 10) + 'px',
                    height: (buttonSize * 3 + buttonGap * 2) + 'px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: buttonGap + 'px',
                    pointerEvents: 'none',
                    background: 'transparent'
                });
                buttonSize = 75;
            }

            ['button-z', 'button-x', 'button-c'].forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.width = buttonSize + 'px';
                el.style.height = buttonSize + 'px';
            });
        }

        function refreshMobileControls(forceRebuild = false) {
            ensureDefaultPositionsForAllOrientations();
            loadControlPositions();
            createOrUpdateControls(forceRebuild);
            updateControlPositions(getOrientation());
            lastOrientation = getOrientation();
        }

        function releaseAllActionButtons() {
            actionButtonStates.forEach((state) => {
                if (typeof state.release === 'function') {
                    state.release();
                }
            });
            actionButtonTouchBindings.clear();
        }

        const actionButtonFlushEpsilonPx = 0.5;
        const actionButtonClusterReachPx = 10;

        function getRectGapComponents(a, b) {
            return {
                horizontal: Math.max(0, Math.max(a.left - b.right, b.left - a.right)),
                vertical: Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom)),
            };
        }

        function getDistanceFromPointToRect(clientX, clientY, rect) {
            const dx = clientX < rect.left
                ? (rect.left - clientX)
                : (clientX > rect.right ? clientX - rect.right : 0);
            const dy = clientY < rect.top
                ? (rect.top - clientY)
                : (clientY > rect.bottom ? clientY - rect.bottom : 0);
            return Math.sqrt((dx * dx) + (dy * dy));
        }

        function areRectsFlushOrOverlapping(a, b) {
            const gap = getRectGapComponents(a, b);
            return gap.horizontal <= actionButtonFlushEpsilonPx && gap.vertical <= actionButtonFlushEpsilonPx;
        }

        function getClusteredActionButtonIds(primaryButtonId, clientX, clientY) {
            const primaryState = actionButtonStates.get(primaryButtonId);
            const primaryElement = primaryState?.element ?? null;

            if (!primaryElement) {
                return [primaryButtonId];
            }

            const primaryRect = primaryElement.getBoundingClientRect();
            let bestCandidateId = null;
            let bestCandidateDistance = Number.POSITIVE_INFINITY;

            actionButtonStates.forEach((candidateState, candidateButtonId) => {
                if (candidateButtonId === primaryButtonId || !candidateState?.element) {
                    return;
                }

                const candidateRect = candidateState.element.getBoundingClientRect();
                if (!areRectsFlushOrOverlapping(primaryRect, candidateRect)) {
                    return;
                }

                const touchDistance = getDistanceFromPointToRect(clientX, clientY, candidateRect);

                if (touchDistance <= actionButtonClusterReachPx && touchDistance < bestCandidateDistance) {
                    bestCandidateId = candidateButtonId;
                    bestCandidateDistance = touchDistance;
                }
            });

            return bestCandidateId ? [primaryButtonId, bestCandidateId] : [primaryButtonId];
        }

        function bindActionTouchCluster(buttonId, touchIdentifier, clientX, clientY) {
            const buttonIds = getClusteredActionButtonIds(buttonId, clientX, clientY);
            const activeButtonIds = new Set();

            buttonIds.forEach((candidateButtonId) => {
                const candidateState = actionButtonStates.get(candidateButtonId);

                if (!candidateState) {
                    return;
                }

                candidateState.touchIds.add(touchIdentifier);
                candidateState.setPressed(true);
                activeButtonIds.add(candidateButtonId);
            });

            actionButtonTouchBindings.set(touchIdentifier, activeButtonIds);
        }

        function releaseActionTouchCluster(touchIdentifier) {
            const boundButtonIds = actionButtonTouchBindings.get(touchIdentifier);

            if (!boundButtonIds) {
                return;
            }

            boundButtonIds.forEach((buttonId) => {
                const buttonState = actionButtonStates.get(buttonId);

                if (!buttonState) {
                    return;
                }

                buttonState.touchIds.delete(touchIdentifier);

                if (buttonState.touchIds.size === 0) {
                    buttonState.release();
                }
            });

            actionButtonTouchBindings.delete(touchIdentifier);
        }

        function queueOrientationRefresh() {
            clearTimeout(orientationRefreshTimer);
            fadeOverlay.style.opacity = '1';
            buttonZone.style.opacity = '0';
            joystickZone.style.opacity = '0';

            orientationRefreshTimer = setTimeout(() => {
                releaseAllDirectionalKeys();
                releaseAllActionButtons();
                refreshMobileControls(true);
                buttonZone.style.opacity = '1';
                joystickZone.style.opacity = '1';
                setMobileControlsVisible(!mobileControlsHiddenForPhysicalInput);
                fadeOverlay.style.opacity = '0';
            }, 300);
        }

        function bindActionButton(buttonInfo) {
            const buttonElement = document.getElementById(buttonInfo.id);
            if (!buttonElement) return;

            const state = {
                id: buttonInfo.id,
                element: buttonElement,
                pressed: false,
                pointerId: null,
                touchIds: new Set(),
                usingMouseFallback: false,
                setPressed(pressed) {
                    if (state.pressed === pressed) return;
                    state.pressed = pressed;
                    buttonElement.src = pressed ? buttonInfo.img_down : buttonInfo.img_up;
                    simulateKeyEvent(pressed ? 'keydown' : 'keyup', buttonInfo.key, buttonInfo.keyCode);
                },
                release() {
                    state.pointerId = null;
                    state.touchIds.clear();
                    state.usingMouseFallback = false;
                    const hadPressedState = state.pressed;
                    state.setPressed(false);

                    if (hadPressedState) {
                        queueDirectionalKeyReassert();
                    }
                }
            };

            buttonElement.src = buttonInfo.img_up;
            buttonElement.style.touchAction = 'none';
            buttonElement.setAttribute('draggable', 'false');
            actionButtonStates.set(buttonInfo.id, state);

            if (usePointerPrimaryInput) {
                buttonElement.addEventListener('pointerdown', (event) => {
                    if (window.positionMode) return;
                    event.preventDefault();
                    state.pointerId = event.pointerId;
                    state.usingMouseFallback = false;
                    try {
                        buttonElement.setPointerCapture(event.pointerId);
                    } catch (err) {}
                    state.setPressed(true);
                });
                const releasePointer = (event) => {
                    if (event.pointerId !== state.pointerId) return;
                    event.preventDefault();
                    state.release();
                };
                buttonElement.addEventListener('pointerup', releasePointer);
                buttonElement.addEventListener('pointercancel', releasePointer);
                buttonElement.addEventListener('lostpointercapture', () => {
                    state.release();
                });
                buttonElement.addEventListener('mousedown', (event) => {
                    if (window.positionMode || event.button !== 0 || state.pointerId !== null || state.pressed) return;
                    event.preventDefault();
                    state.usingMouseFallback = true;
                    state.setPressed(true);
                });
                window.addEventListener('mouseup', (event) => {
                    if (!state.usingMouseFallback || event.button !== 0) return;
                    state.release();
                });
            } else {
                buttonElement.addEventListener('touchstart', (event) => {
                    if (window.positionMode || event.changedTouches.length === 0) return;
                    event.preventDefault();
                    for (const touch of Array.from(event.changedTouches)) {
                        if (actionButtonTouchBindings.has(touch.identifier)) {
                            continue;
                        }

                        bindActionTouchCluster(buttonInfo.id, touch.identifier, touch.clientX, touch.clientY);
                    }
                }, {
                    passive: false
                });
                const releaseTouch = (event) => {
                    event.preventDefault();

                    Array.from(event.changedTouches).forEach((touch) => {
                        releaseActionTouchCluster(touch.identifier);
                    });
                };
                buttonElement.addEventListener('touchend', releaseTouch, {
                    passive: false
                });
                buttonElement.addEventListener('touchcancel', releaseTouch, {
                    passive: false
                });
            }
        }

        window.createOrUpdateControls = function() {
            createOrUpdateControls(true);
            updateControlPositions(getOrientation());
        };
        window.updateControlPositions = updateControlPositions;

        const buttons = [{
            id: 'button-z',
            key: 'z',
            keyCode: 90,
            img_up: toPlaySpriteUrl('spr/z.svg'),
            img_down: toPlaySpriteUrl('spr/z_pressed.svg')
        }, {
            id: 'button-x',
            key: 'x',
            keyCode: 88,
            img_up: toPlaySpriteUrl('spr/x.svg'),
            img_down: toPlaySpriteUrl('spr/x_pressed.svg')
        }, {
            id: 'button-c',
            key: 'c',
            keyCode: 67,
            img_up: toPlaySpriteUrl('spr/c.svg'),
            img_down: toPlaySpriteUrl('spr/c_pressed.svg')
        }];
        buttons.forEach(bindActionButton);

        window.addEventListener('touchend', (event) => {
            Array.from(event.changedTouches || []).forEach((touch) => {
                releaseActionTouchCluster(touch.identifier);
            });
        }, {
            passive: false
        });

        window.addEventListener('touchcancel', (event) => {
            Array.from(event.changedTouches || []).forEach((touch) => {
                releaseActionTouchCluster(touch.identifier);
            });
        }, {
            passive: false
        });

        window.addEventListener("orientationchange", () => {
            queueOrientationRefresh();
        });

        window.addEventListener('resize', () => {
            const orientation = getOrientation();
            if (orientation !== lastOrientation) {
                queueOrientationRefresh();
                return;
            }
            updateControlPositions(orientation);
        });

        refreshMobileControls(true);
        setMobileControlsVisible(true);
    }

    if (document.readyState === 'complete') {
        initializeMobileControls();
    } else {
        window.addEventListener('load', initializeMobileControls, {
            once: true
        });
    }
}
