const VERSION = "aurora-1.3";

const STATIC_CACHE = `${VERSION}_static`;
const HTML_CACHE = `${VERSION}_html`;

const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = ["/", "/index.html", "/css/style.min.css", "/js/script.min.js", "/site.webmanifest", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, HTML_CACHE].includes(key)) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  }
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  return ["style", "script", "image", "font"].includes(request.destination) || STATIC_ASSETS.includes(url.pathname);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const isCacheableResponse = response.ok && response.status >= 200 && response.status < 300 && response.type !== "opaque";
  if (isCacheableResponse) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    const isCacheableHtmlResponse = response.ok && response.status >= 200 && response.status < 300 && contentType.includes("text/html");

    if (isCacheableHtmlResponse) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}
