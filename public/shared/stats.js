(function initstatshelper(globalscope) {
  const defaultheartbeatintervalms = 30000;
  const heartbeatreasons = {
    start: "start",
    interval: "interval",
    hidden: "hidden",
    visible: "visible",
    pagehide: "pagehide",
  };

  let activesession = null;
  let heartbeattimerid = 0;
  let listenersbound = false;
  let lastheartbeatreason = "";

  function readstatsconfig() {
    const configuredstats = globalscope.drweb_stats_config ?? globalscope.drwebStatsConfig ?? {};
    const endpoint = String(configuredstats.endpoint ?? configuredstats.stats_endpoint ?? "").trim().replace(/\/+$/, "");
    const heartbeatpath = String(configuredstats.heartbeat_path ?? configuredstats.heartbeatPath ?? "/api/heartbeat").trim() || "/api/heartbeat";
    const heartbeatintervalms = Math.max(
      5000,
      Number(configuredstats.heartbeat_interval_ms ?? configuredstats.heartbeatIntervalMs ?? defaultheartbeatintervalms) || defaultheartbeatintervalms,
    );

    return {
      endpoint,
      heartbeatpath: heartbeatpath.startsWith("/") ? heartbeatpath : `/${heartbeatpath}`,
      heartbeatintervalms,
    };
  }

  function getheartbeaturl(statsconfig = readstatsconfig()) {
    if (!statsconfig.endpoint) {
      return "";
    }

    return `${statsconfig.endpoint}${statsconfig.heartbeatpath}`;
  }

  function buildheartbeatpayload(reason) {
    return {
      token: activesession.token,
      reason,
      path: String(globalscope.location?.pathname ?? ""),
      visible: !isdocumenthidden(),
      sent_at: new Date().toISOString(),
    };
  }

  function buildheartbeatfallbackpayload(reason) {
    return {
      action: "stats_heartbeat",
      ...buildheartbeatpayload(reason),
    };
  }

  async function postjson(url, payload, options = {}) {
    return globalscope.fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
      keepalive: options.keepalive === true,
    });
  }

  function parseexpirationms(value) {
    if (!value) {
      return 0;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value > 10_000_000_000 ? value : value * 1000;
    }

    const parsedtime = Date.parse(String(value));
    return Number.isFinite(parsedtime) ? parsedtime : 0;
  }

  function clearheartbeattimer() {
    if (heartbeattimerid) {
      globalscope.clearInterval(heartbeattimerid);
      heartbeattimerid = 0;
    }
  }

  function isdocumenthidden() {
    try {
      return globalscope.document?.visibilityState === "hidden";
    } catch (_error) {
      return false;
    }
  }

  function cansendheartbeat() {
    if (!activesession?.token || !activesession.heartbeaturl) {
      return false;
    }

    if (activesession.expiresatms && Date.now() >= activesession.expiresatms) {
      return false;
    }

    return true;
  }

  async function sendheartbeat(reason, options = {}) {
    if (!cansendheartbeat()) {
      return false;
    }

    if (reason === heartbeatreasons.interval && isdocumenthidden()) {
      return false;
    }

    lastheartbeatreason = reason;

    try {
      const response = await postjson(
        activesession.heartbeaturl,
        buildheartbeatpayload(reason),
        options,
      );

      if (!response.ok) {
        try {
          const fallbackresponse = await postjson(
            readstatsconfig().endpoint,
            buildheartbeatfallbackpayload(reason),
            options,
          );

          if (!fallbackresponse.ok) {
            console.warn("Stats heartbeat failed:", fallbackresponse.status, activesession.heartbeaturl);
            return false;
          }

          return true;
        } catch (_fallbackerror) {
          console.warn("Stats heartbeat failed:", response.status, activesession.heartbeaturl);
          return false;
        }
      }

      return true;
    } catch (_error) {
      try {
        const fallbackresponse = await postjson(
          readstatsconfig().endpoint,
          buildheartbeatfallbackpayload(reason),
          options,
        );

        if (!fallbackresponse.ok) {
          console.warn("Stats heartbeat failed:", fallbackresponse.status, activesession.heartbeaturl);
          return false;
        }

        return true;
      } catch (_fallbackerror) {
        console.warn("Stats heartbeat request failed:", activesession.heartbeaturl);
        return false;
      }
    }
  }

  function scheduleheartbeats() {
    clearheartbeattimer();

    if (!cansendheartbeat() || isdocumenthidden()) {
      return;
    }

    heartbeattimerid = globalscope.setInterval(() => {
      sendheartbeat(heartbeatreasons.interval);
    }, activesession.heartbeatintervalms);
  }

  function bindlifecycle() {
    if (listenersbound) {
      return;
    }

    listenersbound = true;

    globalscope.document?.addEventListener("visibilitychange", () => {
      if (!activesession) {
        return;
      }

      if (isdocumenthidden()) {
        clearheartbeattimer();
        sendheartbeat(heartbeatreasons.hidden);
        return;
      }

      sendheartbeat(heartbeatreasons.visible);
      scheduleheartbeats();
    });

    globalscope.addEventListener("pagehide", () => {
      if (!activesession) {
        return;
      }

      clearheartbeattimer();
      sendheartbeat(heartbeatreasons.pagehide, { keepalive: true });
    });
  }

  function stop() {
    clearheartbeattimer();
    activesession = null;
    lastheartbeatreason = "";
  }

  function start(session = {}) {
    const statsconfig = readstatsconfig();
    const statstoken = String(session.token ?? session.stats_token ?? "").trim();
    const heartbeaturl = getheartbeaturl(statsconfig);

    if (!statstoken || !heartbeaturl) {
      stop();
      return false;
    }

    activesession = {
      token: statstoken,
      scope: String(session.scope ?? session.stats_scope ?? "").trim(),
      heartbeaturl,
      heartbeatintervalms: Math.max(
        5000,
        Number(session.heartbeat_interval_ms ?? statsconfig.heartbeatintervalms) || statsconfig.heartbeatintervalms,
      ),
      expiresatms: parseexpirationms(session.expires_at ?? session.stats_expires_at ?? 0),
      startedatms: Date.now(),
    };

    if (!activesession.heartbeatintervalms || !Number.isFinite(activesession.heartbeatintervalms)) {
      activesession.heartbeatintervalms = statsconfig.heartbeatintervalms;
    }

    bindlifecycle();
    scheduleheartbeats();
    sendheartbeat(heartbeatreasons.start);
    return true;
  }

  const statsapi = {
    start,
    stop,
    status() {
      return {
        active: Boolean(activesession?.token),
        scope: activesession?.scope || "",
        lastHeartbeatReason: lastheartbeatreason,
        endpoint: activesession?.heartbeaturl || getheartbeaturl(readstatsconfig()),
      };
    },
  };

  globalscope.DRWebStats = statsapi;
  globalscope.drweb_stats = statsapi;
})(window);
