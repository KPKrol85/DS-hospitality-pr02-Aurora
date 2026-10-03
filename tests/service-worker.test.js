import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
import { createContext, Script } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "./helpers.js";

// Runs the real service-worker.js as a classic script in its own vm context. The context's global
// object stands in for the worker global scope (self), with in-memory Cache Storage, a mocked
// network fetch, clients.claim() and skipWaiting(), so the jsdom globals of the suite never reach
// the worker and no test reads dist/ or the network.
const projectRoot = resolve(import.meta.dirname, "..");
const workerPath = resolve(projectRoot, "service-worker.js");
const workerSource = readFileSync(workerPath, "utf8");

const ORIGIN = "https://aurora.test";
// The Accept header that a browser sends with a page navigation.
const NAVIGATION_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const PREVIOUS_VERSION_CACHES = ["aurora-1.17_static", "aurora-1.17_html"];

let worker;

function absoluteUrl(input) {
  return new URL(typeof input === "string" ? input : input.url, ORIGIN).href;
}

// Case-insensitive header lookup that, like Headers.get(), answers null for a missing header.
function createHeaders(fields) {
  const values = new Map();
  for (const [name, value] of Object.entries(fields)) {
    if (value != null) {
      values.set(name.toLowerCase(), value);
    }
  }
  return { get: (name) => values.get(name.toLowerCase()) ?? null };
}

// The Request fields that the worker reads.
function createRequest(path, { method = "GET", accept = "*/*", destination = "" } = {}) {
  return { url: absoluteUrl(path), method, destination, headers: createHeaders({ accept }) };
}

function pageRequest(path) {
  return createRequest(path, { accept: NAVIGATION_ACCEPT, destination: "document" });
}

// The Response fields that the worker reads. clone() returns a separate response with the same
// content, so a test can tell the cached copy from the response handed to the page.
function createResponse({ body = "", status = 200, type = "basic", contentType = "text/html; charset=UTF-8" } = {}) {
  return {
    body,
    status,
    type,
    ok: status >= 200 && status < 300,
    headers: createHeaders({ "content-type": contentType }),
    clone: () => createResponse({ body, status, type, contentType }),
  };
}

// What a cross-origin no-cors request yields: status 0 and no readable headers.
function createOpaqueResponse() {
  return createResponse({ status: 0, type: "opaque", contentType: null });
}

function displayUrl(url) {
  return url.startsWith(`${ORIGIN}/`) ? url.slice(ORIGIN.length) : url;
}

// Each cache is keyed by absolute URL, as the Cache API matches GET requests by URL. Every
// operation completes on a later task, as in the browser, so a step that the worker neither
// awaits nor passes to waitUntil() has not happened yet when a test inspects the caches.
function createCache() {
  const entries = new Map();
  return {
    entries,
    async match(request) {
      await flushPromises();
      return entries.get(absoluteUrl(request));
    },
    async put(request, response) {
      await flushPromises();
      entries.set(absoluteUrl(request), response);
    },
    // Stands in for the network requests of addAll() with one placeholder response per URL.
    addAll: vi.fn(async (requests) => {
      await flushPromises();
      for (const request of requests) {
        entries.set(absoluteUrl(request), createResponse({ body: `precached ${request}` }));
      }
    }),
  };
}

function createCacheStorage(stores) {
  return {
    open: vi.fn(async (name) => {
      await flushPromises();
      if (!stores.has(name)) {
        stores.set(name, createCache());
      }
      return stores.get(name);
    }),
    async keys() {
      await flushPromises();
      return Array.from(stores.keys());
    },
    async delete(name) {
      await flushPromises();
      return stores.delete(name);
    },
    // Searches every cache in creation order, as CacheStorage.match() does.
    async match(request) {
      for (const cache of stores.values()) {
        const response = await cache.match(request);
        if (response) {
          return response;
        }
      }
      return undefined;
    },
  };
}

// Evaluates service-worker.js in a fresh worker scope and returns the handles a test drives.
function loadWorker() {
  const listeners = new Map();
  const stores = new Map();
  const scope = {
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    caches: createCacheStorage(stores),
    // The network is offline unless a test answers the request.
    fetch: vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }),
    clients: { claim: vi.fn(async () => {}) },
    skipWaiting: vi.fn(async () => {}),
    URL,
  };
  scope.self = scope;

  const context = createContext(scope);
  new Script(workerSource, { filename: workerPath }).runInContext(context);
  // The top-level constants are bindings of the worker's global scope, which a later script in
  // the same context shares.
  const constants = new Script("({ VERSION, STATIC_CACHE, HTML_CACHE, STATIC_ASSETS })").runInContext(context);

  // Calls the registered listeners synchronously, as the browser dispatches an event, and collects
  // the promises passed to waitUntil() and, for a fetch event, the one passed to respondWith().
  function dispatch(type, properties) {
    const handlers = listeners.get(type);
    if (!handlers) {
      throw new Error(`service-worker.js registers no ${type} listener`);
    }

    const extensions = [];
    const result = { responded: false, response: undefined };
    const event = { ...properties, waitUntil: (promise) => extensions.push(promise) };
    if (type === "fetch") {
      event.respondWith = (response) => {
        if (result.responded) {
          throw new Error("respondWith() was already called");
        }
        Object.assign(result, { responded: true, response });
      };
    }

    handlers.forEach((handler) => handler(event));
    return { ...result, lifetime: Promise.all(extensions) };
  }

  return {
    ...constants,
    stores,
    caches: scope.caches,
    network: scope.fetch,
    clients: scope.clients,
    skipWaiting: scope.skipWaiting,
    // Each resolves once the promises passed to waitUntil() settle.
    install: () => dispatch("install", {}).lifetime,
    activate: () => dispatch("activate", {}).lifetime,
    message: (data) => dispatch("message", { data }).lifetime,
    // Resolves to the response passed to respondWith(), or null when the worker leaves the request
    // to the browser.
    async dispatchFetch(request) {
      const { responded, response } = dispatch("fetch", { request });
      const answer = responded ? await response : null;
      // The worker does not wait for its cache writes; let them finish before the test checks.
      await flushPromises();
      return answer;
    },
    // Stores a response directly, as an earlier visit or an earlier worker version would have.
    seed(cacheName, path, response = createResponse({ body: `${cacheName} ${path}` })) {
      if (!stores.has(cacheName)) {
        stores.set(cacheName, createCache());
      }
      stores.get(cacheName).entries.set(absoluteUrl(path), response);
      return response;
    },
    lookup(cacheName, path) {
      return stores.get(cacheName)?.entries.get(absoluteUrl(path));
    },
    // Every stored entry as "<cache name> <URL>", sorted, so a test can assert exactly what is cached.
    cacheListing() {
      return Array.from(stores, ([name, cache]) =>
        Array.from(cache.entries.keys(), (url) => `${name} ${displayUrl(url)}`)
      )
        .flat()
        .sort();
    },
  };
}

beforeEach(() => {
  worker = loadWorker();
});

describe("install", () => {
  it("precaches exactly STATIC_ASSETS in the current static cache", async () => {
    await worker.install();

    expect(worker.caches.open).toHaveBeenCalledTimes(1);
    expect(worker.caches.open).toHaveBeenCalledWith(worker.STATIC_CACHE);
    const { addAll } = worker.stores.get(worker.STATIC_CACHE);
    expect(addAll).toHaveBeenCalledTimes(1);
    expect(addAll).toHaveBeenCalledWith(worker.STATIC_ASSETS);
    // The install waits for the precache, so every entry is stored once the event settles.
    expect(worker.cacheListing()).toEqual(
      Array.from(worker.STATIC_ASSETS, (path) => `${worker.STATIC_CACHE} ${path}`).sort()
    );
    expect(worker.network).not.toHaveBeenCalled();
  });
});

describe("activate", () => {
  it("derives both cache names from VERSION, so a new VERSION starts new caches", () => {
    expect(worker.VERSION).toMatch(/^aurora-/);
    expect(worker.STATIC_CACHE).toBe(`${worker.VERSION}_static`);
    expect(worker.HTML_CACHE).toBe(`${worker.VERSION}_html`);
    expect(PREVIOUS_VERSION_CACHES).not.toContain(worker.STATIC_CACHE);
    expect(PREVIOUS_VERSION_CACHES).not.toContain(worker.HTML_CACHE);
  });

  it("deletes the caches of an earlier Aurora version and keeps both current caches", async () => {
    const precached = worker.seed(worker.STATIC_CACHE, "/index.html");
    const page = worker.seed(worker.HTML_CACHE, "/tours.html");
    PREVIOUS_VERSION_CACHES.forEach((name) => worker.seed(name, "/index.html"));

    await worker.activate();

    expect(worker.cacheListing()).toEqual([`${worker.HTML_CACHE} /tours.html`, `${worker.STATIC_CACHE} /index.html`]);
    expect(worker.lookup(worker.STATIC_CACHE, "/index.html")).toBe(precached);
    expect(worker.lookup(worker.HTML_CACHE, "/tours.html")).toBe(page);
  });

  it("claims the open pages without opening a cache or using the network", async () => {
    await worker.activate();

    expect(worker.clients.claim).toHaveBeenCalledTimes(1);
    expect(worker.caches.open).not.toHaveBeenCalled();
    expect(worker.network).not.toHaveBeenCalled();
  });
});

describe("request routing", () => {
  it.each([
    {
      label: "a contact form POST",
      request: createRequest("/contact.html", { method: "POST", accept: NAVIGATION_ACCEPT, destination: "document" }),
    },
    { label: "a HEAD request for a precached path", request: createRequest("/css/style.min.css", { method: "HEAD" }) },
  ])("does not intercept $label", async ({ request }) => {
    expect(await worker.dispatchFetch(request)).toBeNull();
    expect(worker.network).not.toHaveBeenCalled();
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  // "/" is also precached, so the page route has to take precedence over the static one.
  it.each(["/tours.html", "/"])("serves a page request for %s network-first, ahead of a cached copy", async (path) => {
    await worker.install();
    worker.seed(worker.HTML_CACHE, path, createResponse({ body: "cached page" }));
    const fresh = createResponse({ body: "fresh page" });
    worker.network.mockResolvedValueOnce(fresh);
    const request = pageRequest(path);

    expect(await worker.dispatchFetch(request)).toBe(fresh);
    expect(worker.network).toHaveBeenCalledTimes(1);
    expect(worker.network).toHaveBeenCalledWith(request);
  });

  // The manifest has no static destination and is routed by its precached path.
  it.each([
    { destination: "style", path: "/css/style.min.css" },
    { destination: "script", path: "/js/script.min.js" },
    { destination: "image", path: "/assets/img/hero/hero-1200x800.avif" },
    { destination: "font", path: "/assets/fonts/Manrope-VariableFont.woff2" },
    { destination: "manifest", path: "/site.webmanifest" },
  ])("serves a $destination request for $path cache-first", async ({ destination, path }) => {
    const cached = worker.seed(worker.STATIC_CACHE, path);
    worker.network.mockResolvedValue(createResponse({ body: "network copy" }));

    expect(await worker.dispatchFetch(createRequest(path, { destination }))).toBe(cached);
    expect(worker.network).not.toHaveBeenCalled();
  });

  it.each(["/assets/data/tours.json", "/assets/data/gallery-data.json"])(
    "does not intercept the data request for %s",
    async (path) => {
      expect(await worker.dispatchFetch(createRequest(path))).toBeNull();
      expect(worker.network).not.toHaveBeenCalled();
      expect(worker.caches.open).not.toHaveBeenCalled();
    }
  );
});

describe("HTML requests online", () => {
  it("returns a 2xx HTML response and stores a copy in the HTML cache", async () => {
    const response = createResponse({ body: "tours page" });
    worker.network.mockResolvedValueOnce(response);

    expect(await worker.dispatchFetch(pageRequest("/tours.html"))).toBe(response);
    expect(worker.cacheListing()).toEqual([`${worker.HTML_CACHE} /tours.html`]);
    const copy = worker.lookup(worker.HTML_CACHE, "/tours.html");
    expect(copy).not.toBe(response);
    expect(copy).toMatchObject({ body: "tours page", status: 200 });
  });

  it.each(["text/plain; charset=UTF-8", "application/json", null])(
    "returns a response with content type %j but does not cache it",
    async (contentType) => {
      const response = createResponse({ body: "not a page", contentType });
      worker.network.mockResolvedValueOnce(response);

      expect(await worker.dispatchFetch(pageRequest("/tours.html"))).toBe(response);
      expect(worker.cacheListing()).toEqual([]);
    }
  );

  it.each([404, 500, 503])("returns an HTML response with status %i but does not cache it", async (status) => {
    const response = createResponse({ body: "error page", status });
    worker.network.mockResolvedValueOnce(response);

    expect(await worker.dispatchFetch(pageRequest("/missing.html"))).toBe(response);
    expect(worker.cacheListing()).toEqual([]);
  });
});

describe("HTML requests offline", () => {
  beforeEach(async () => {
    await worker.install();
  });

  it("returns the cached copy of a page visited while online", async () => {
    worker.network.mockResolvedValueOnce(createResponse({ body: "tours page" }));
    await worker.dispatchFetch(pageRequest("/tours.html"));

    // The network stays offline for the second visit.
    const response = await worker.dispatchFetch(pageRequest("/tours.html"));

    expect(worker.network).toHaveBeenCalledTimes(2);
    expect(response).toBe(worker.lookup(worker.HTML_CACHE, "/tours.html"));
    expect(response.body).toBe("tours page");
  });

  it("falls back to the precached /offline.html for a page that was never cached", async () => {
    const response = await worker.dispatchFetch(pageRequest("/about.html"));

    expect(worker.network).toHaveBeenCalledTimes(1);
    expect(response).toBe(worker.lookup(worker.STATIC_CACHE, "/offline.html"));
    expect(response.body).toBe("precached /offline.html");
  });
});

describe("static asset requests", () => {
  it("answers a precached bundle from the static cache without calling fetch", async () => {
    await worker.install();

    const response = await worker.dispatchFetch(createRequest("/js/script.min.js", { destination: "script" }));

    expect(response).toBe(worker.lookup(worker.STATIC_CACHE, "/js/script.min.js"));
    expect(response.body).toBe("precached /js/script.min.js");
    expect(worker.network).not.toHaveBeenCalled();
  });

  it("fetches a missing asset and caches a copy of a 2xx response", async () => {
    const request = createRequest("/assets/img/hero/hero-1200x800.avif", { destination: "image" });
    const response = createResponse({ body: "hero image", contentType: "image/avif" });
    worker.network.mockResolvedValueOnce(response);

    expect(await worker.dispatchFetch(request)).toBe(response);
    expect(worker.network).toHaveBeenCalledTimes(1);
    expect(worker.network).toHaveBeenCalledWith(request);
    expect(worker.cacheListing()).toEqual([`${worker.STATIC_CACHE} /assets/img/hero/hero-1200x800.avif`]);
    const copy = worker.lookup(worker.STATIC_CACHE, "/assets/img/hero/hero-1200x800.avif");
    expect(copy).not.toBe(response);
    expect(copy).toMatchObject({ body: "hero image", status: 200 });
  });

  it("returns an opaque cross-origin response but does not cache it", async () => {
    const request = createRequest("https://images.example.com/photo.jpg", { destination: "image" });
    const response = createOpaqueResponse();
    worker.network.mockResolvedValueOnce(response);

    expect(await worker.dispatchFetch(request)).toBe(response);
    expect(worker.network).toHaveBeenCalledWith(request);
    expect(worker.cacheListing()).toEqual([]);
  });

  it.each([404, 500])("returns a response with status %i but does not cache it", async (status) => {
    const request = createRequest("/assets/img/hero/missing.avif", { destination: "image" });
    const response = createResponse({ body: "error page", status });
    worker.network.mockResolvedValueOnce(response);

    expect(await worker.dispatchFetch(request)).toBe(response);
    expect(worker.network).toHaveBeenCalledWith(request);
    expect(worker.cacheListing()).toEqual([]);
  });
});

// js/script.js posts { type: "SKIP_WAITING" } from the update notice.
describe("update activation", () => {
  it("calls skipWaiting() for the SKIP_WAITING message", async () => {
    await worker.message({ type: "SKIP_WAITING" });

    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it.each([{ type: "skip_waiting" }, { type: "PING" }, "SKIP_WAITING", null])(
    "does not call skipWaiting() for the message %j",
    async (data) => {
      await worker.message(data);

      expect(worker.skipWaiting).not.toHaveBeenCalled();
    }
  );
});
