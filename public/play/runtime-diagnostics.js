(function installRuntimeDiagnostics(windowObject) {
  if (windowObject.__vinetrapRuntimeDiagnostics) return;
  windowObject.__vinetrapRuntimeDiagnostics = true;

  const endpoint = "/client-log";
  const nativeFetch =
    typeof windowObject.fetch === "function"
      ? windowObject.fetch.bind(windowObject)
      : null;
  const nativeRequestAnimationFrame =
    windowObject.requestAnimationFrame.bind(windowObject);
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  const webglContexts = [];
  let frameCount = 0;

  function stringifyError(error) {
    if (!error) return "";
    return {
      name: String(error.name || ""),
      message: String(error.message || error),
      stack: String(error.stack || ""),
    };
  }

  function post(type, details) {
    const body = JSON.stringify({
      type,
      url: windowObject.location.href,
      timestamp: new Date().toISOString(),
      details,
    });

    try {
      if (
        typeof navigator.sendBeacon === "function"
        && navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: "application/json" }),
        )
      ) {
        return;
      }
    } catch (_error) {
    }

    nativeFetch?.(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function snapshot(label) {
    const moduleObject = windowObject.Module;
    const canvases = Array.from(document.querySelectorAll("canvas")).map(
      (canvas) => ({
        id: canvas.id,
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        display: getComputedStyle(canvas).display,
      }),
    );
    const resources = performance
      .getEntriesByType("resource")
      .slice(-12)
      .map((entry) => ({
        name: entry.name,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize,
      }));

    post(label, {
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      online: navigator.onLine,
      canvases,
      module: moduleObject
        ? {
            calledRun: Boolean(moduleObject.calledRun),
            abort: Boolean(moduleObject.ABORT),
            noExitRuntime: Boolean(moduleObject.noExitRuntime),
            runDependencies: Number(moduleObject.runDependencies ?? -1),
          }
        : null,
      frameCount,
      resources,
    });
  }

  function sampleWebGlFrame() {
    for (const { canvas, context, type } of webglContexts) {
      try {
        const width = context.drawingBufferWidth;
        const height = context.drawingBufferHeight;
        if (!width || !height) continue;
        const pixels = new Uint8Array(width * height * 4);
        context.readPixels(
          0,
          0,
          width,
          height,
          context.RGBA,
          context.UNSIGNED_BYTE,
          pixels,
        );
        let sampled = 0;
        let nonBlack = 0;
        let alpha = 0;
        for (let index = 0; index < pixels.length; index += 64) {
          sampled += 1;
          if (
            pixels[index] !== 0
            || pixels[index + 1] !== 0
            || pixels[index + 2] !== 0
          ) {
            nonBlack += 1;
          }
          if (pixels[index + 3] !== 0) alpha += 1;
        }
        post("canvas-frame-sample", {
          type,
          canvasId: canvas.id,
          width,
          height,
          frameCount,
          sampled,
          nonBlack,
          alpha,
          error: context.getError(),
        });
      } catch (error) {
        post("canvas-sample-error", stringifyError(error));
      }
    }
  }

  windowObject.addEventListener(
    "error",
    (event) => {
      if (event instanceof ErrorEvent) {
        post("window-error", {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: stringifyError(event.error),
        });
        return;
      }

      const target = event.target;
      post("resource-error", {
        tagName: target?.tagName || "",
        source: target?.src || target?.href || "",
      });
    },
    true,
  );

  windowObject.addEventListener("unhandledrejection", (event) => {
    post("unhandled-rejection", stringifyError(event.reason));
  });

  document.addEventListener(
    "webglcontextlost",
    (event) => {
      post("webgl-context-lost", {
        statusMessage: String(event.statusMessage || ""),
      });
    },
    true,
  );

  HTMLCanvasElement.prototype.getContext = function diagnosticGetContext(
    type,
    ...args
  ) {
    const context = nativeGetContext.call(this, type, ...args);
    if (
      context
      && /^webgl2?$/i.test(String(type))
      && !webglContexts.some((entry) => entry.context === context)
    ) {
      webglContexts.push({ canvas: this, context, type: String(type) });
      post("webgl-context-created", {
        type: String(type),
        canvasId: this.id,
        width: this.width,
        height: this.height,
      });
      for (const delay of [500, 3_000, 10_000, 20_000]) {
        windowObject.setTimeout(sampleWebGlFrame, delay);
      }
    }
    return context;
  };

  windowObject.requestAnimationFrame = function diagnosticAnimationFrame(
    callback,
  ) {
    return nativeRequestAnimationFrame((timestamp) => {
      frameCount += 1;
      callback(timestamp);
      if (frameCount === 120 || frameCount === 480 || frameCount === 1_200) {
        sampleWebGlFrame();
      }
    });
  };

  for (const method of ["warn", "error"]) {
    const nativeMethod = console[method].bind(console);
    console[method] = (...args) => {
      nativeMethod(...args);
      post(`console-${method}`, {
        message: args
          .map((value) =>
            typeof value === "string"
              ? value
              : JSON.stringify(value, null, 0),
          )
          .join(" ")
          .slice(0, 8_000),
      });
    };
  }

  const nativeAlert = windowObject.alert.bind(windowObject);
  windowObject.alert = (message) => {
    post("window-alert", { message: String(message) });
    return nativeAlert(message);
  };

  if (nativeFetch) {
    windowObject.fetch = async (...args) => {
      try {
        const response = await nativeFetch(...args);
        if (!response.ok) {
          post("fetch-http-error", {
            url: String(response.url || args[0] || ""),
            status: response.status,
          });
        }
        return response;
      } catch (error) {
        post("fetch-rejected", {
          request: String(args[0] || ""),
          error: stringifyError(error),
        });
        throw error;
      }
    };
  }

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    this.__vinetrapDiagnosticUrl = String(url);
    this.addEventListener("loadend", () => {
      if (this.status === 0 || this.status >= 400) {
        post("xhr-error", {
          method: String(method),
          url: this.__vinetrapDiagnosticUrl,
          status: this.status,
        });
      }
    });
    return nativeOpen.call(this, method, url, ...rest);
  };

  post("diagnostics-installed", {
    readyState: document.readyState,
    userAgent: navigator.userAgent,
  });
  for (const delay of [2_000, 8_000, 20_000]) {
    windowObject.setTimeout(() => snapshot(`heartbeat-${delay}`), delay);
  }
})(window);
