const CACHE_NAME = "offline";

function getNavigationFallbackCandidates(requestUrl) {
  const url = new URL(requestUrl);
  const normalizedPathname = url.pathname.replace(/\/{2,}/g, "/");
  const fallbackCandidates = [];
  const seenCandidates = new Set();

  function addCandidate(candidatePath) {
    const normalizedCandidatePath = String(candidatePath || "").replace(/\/{2,}/g, "/");

    if (!normalizedCandidatePath || seenCandidates.has(normalizedCandidatePath)) {
      return;
    }

    seenCandidates.add(normalizedCandidatePath);
    fallbackCandidates.push(normalizedCandidatePath);
  }

  addCandidate(normalizedPathname);

  if (normalizedPathname.endsWith("/")) {
    addCandidate(`${normalizedPathname}index.html`);
  } else if (!/\.[a-z0-9]+$/i.test(normalizedPathname)) {
    addCandidate(`${normalizedPathname.replace(/\/+$/g, "")}/index.html`);
  }

  return fallbackCandidates;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith((async () => {
    const isNavigation = event.request.mode === "navigate";

    if (event.request.headers.has("range")) {
      try {
        const fullResponse = await caches.match(new Request(event.request.url), { ignoreSearch: true });

        if (!fullResponse) {
          return fetch(event.request);
        }

        const rangeHeader = event.request.headers.get("range");
        const arrayBuffer = await fullResponse.arrayBuffer();
        const bufferLength = arrayBuffer.byteLength;
        const ranges = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
        const start = ranges && ranges[1] ? parseInt(ranges[1], 10) : 0;
        const end = ranges && ranges[2]
          ? Math.min(parseInt(ranges[2], 10), bufferLength - 1)
          : bufferLength - 1;

        if (start >= bufferLength || end < start) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${bufferLength}`,
            },
          });
        }

        const sliced = arrayBuffer.slice(start, end + 1);
        return new Response(sliced, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${bufferLength}`,
            "Content-Length": String(end - start + 1),
            "Content-Type": fullResponse.headers.get("Content-Type") || "application/octet-stream",
            "Accept-Ranges": "bytes",
          },
        });
      } catch (_rangeError) {
        try {
          return await fetch(event.request);
        } catch (_networkError) {
          return new Response("Network error trying to fetch resource.", {
            status: 408,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        }
      }
    }

    const cachedResponse = await caches.match(event.request, { ignoreSearch: true });

    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      return await fetch(event.request);
    } catch (_fetchError) {
      if (isNavigation) {
        for (const fallbackPath of getNavigationFallbackCandidates(event.request.url)) {
          const routeFallback = await caches.match(fallbackPath, { ignoreSearch: true });

          if (routeFallback) {
            return routeFallback;
          }
        }

        const rootFallback = await caches.match("/index.html", { ignoreSearch: true });

        if (rootFallback) {
          return rootFallback;
        }

        const appFallback = await caches.match("/app/index.html", { ignoreSearch: true });

        if (appFallback) {
          return appFallback;
        }
      }

      return new Response("Network error trying to fetch resource.", {
        status: 408,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
  })());
});
