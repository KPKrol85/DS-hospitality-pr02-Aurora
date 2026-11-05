const assert = require("node:assert/strict");
const { execFile, spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { promisify } = require("node:util");
const { maintainedPages, assetReferences } = require("./site-build-contract");

const windows = process.platform === "win32";
const timeout = 15_000;
const quietPeriod = 300;
const missingRoute = "/oferty/malediwy/2026";
const mapPattern = "https://www.google.com/maps?*";
const interruption = new AbortController();

class Unavailable extends Error {}

async function findChromium() {
  const names = windows ? ["chrome.exe", "msedge.exe", "chromium.exe"] : ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
  const candidates = [
    ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA]
      .filter(Boolean)
      .flatMap((dir) => [path.join(dir, "Google/Chrome/Application/chrome.exe"), path.join(dir, "Microsoft/Edge/Application/msedge.exe")]),
    ...(process.platform === "darwin" ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] : []),
    ...(process.env.PATH || "").split(path.delimiter).filter(Boolean)
      .flatMap((dir) => names.map((name) => path.join(dir, name))),
  ];
  for (const candidate of process.env.CHROMIUM_PATH ? [process.env.CHROMIUM_PATH] : candidates) {
    const file = path.resolve(candidate);
    if ((await fs.stat(file).catch(() => null))?.isFile()) return file;
  }
  throw new Unavailable("Chromium executable not found. Set CHROMIUM_PATH to Chrome, Chromium, or Edge.");
}

function launch(executable, args, detached = false) {
  const child = spawn(executable, args, { detached, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const processState = { child, output: "", stopped: false };
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => { processState.output = (processState.output + chunk).slice(-4000); });
  }
  child.on("error", (error) => {
    processState.output += error.message;
    if (!child.pid) processState.stopped = true;
  });
  child.once("exit", () => { processState.stopped = true; });
  return processState;
}

async function waitFor(description, check, { ms = timeout, signal = interruption.signal } = {}) {
  const deadline = Date.now() + ms;
  do {
    signal?.throwIfAborted();
    const result = await check();
    if (result) return result;
    await delay(50, undefined, { signal: signal ?? undefined });
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for ${description}`);
}

function waitForStartup(label, state, check) {
  return waitFor(label, () => {
    if (state.stopped) throw new Error(`${label} exited. ${state.output.trim()}`);
    return check();
  });
}

async function connect(url) {
  const socket = new WebSocket(url);
  const events = new EventEmitter();
  const pending = new Map();
  let nextId = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const reply = pending.get(message.id);
    if (reply) {
      if (message.error) reply.reject(new Error(message.error.message));
      else reply.resolve(message.result);
    } else if (message.method) {
      events.emit(message.method, message.params);
    }
  });
  socket.addEventListener("close", () => {
    for (const reply of pending.values()) reply.reject(new Error("DevTools connection closed"));
  });
  try {
    await waitFor("the DevTools connection", () => {
      if (socket.readyState > WebSocket.OPEN) throw new Error("Cannot open the DevTools WebSocket");
      return socket.readyState === WebSocket.OPEN;
    });
  } catch (error) {
    socket.close();
    throw error;
  }

  async function send(method, params = {}, sessionId, ms = timeout) {
    const id = ++nextId;
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${method} timed out`)), ms);
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    } finally {
      clearTimeout(timer);
      pending.delete(id);
    }
  }
  return { events, send, socket };
}

async function stopBrowser(browser, cdp) {
  try {
    if (!browser || browser.stopped) return;
    if (cdp?.socket.readyState === WebSocket.OPEN) {
      try {
        await cdp.send("Browser.close", {}, undefined, 2000);
        await waitFor("Chromium to exit", () => browser.stopped, { ms: 2000, signal: null });
      } catch {
        // A disconnected or unresponsive browser still needs its process tree stopped.
      }
    }
    if (browser.stopped) return;
    const { pid } = browser.child;
    if (windows) {
      await promisify(execFile)("taskkill.exe", ["/pid", String(pid), "/t", "/f"], { windowsHide: true, timeout: 5000 })
        .catch((error) => { if (!browser.stopped) throw error; });
    } else {
      process.kill(-pid, "SIGKILL");
    }
    await waitFor("Chromium to exit", () => browser.stopped, { ms: 5000, signal: null });
  } finally {
    cdp?.socket.close();
  }
}

function inspect404() {
  const errors = [];
  const main = document.querySelector("#main-content");
  const heading = main?.querySelector("h1");
  const bounds = heading?.getBoundingClientRect();
  if (heading?.textContent.trim() !== "Nie znaleziono tej strony" ||
      !heading.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ||
      bounds.bottom <= 0 || bounds.top >= innerHeight || bounds.right <= 0 || bounds.left >= innerWidth) {
    errors.push("The 404 heading is missing or hidden");
  }
  const fonts = [...document.fonts];
  for (const [element, family] of [[heading, "Manrope"], [document.body, "Inter"]]) {
    const primaryFont = element && getComputedStyle(element).fontFamily.split(",")[0].replace(/["']/g, "").trim();
    if (primaryFont !== family ||
        !fonts.some((font) => font.family.replace(/["']/g, "") === family && font.status === "loaded")) {
      errors.push(`The 404 page is missing the rendered ${family} font`);
    }
  }

  const theme = document.documentElement.dataset.theme;
  document.querySelector("[data-theme-toggle]")?.click();
  if (!["light", "dark"].includes(theme) || document.documentElement.dataset.theme === theme) {
    errors.push("The 404 theme toggle did not run");
  }

  const images = [...document.images];
  if (!images.length || images.some((image) =>
    !image.complete || !image.naturalWidth || new URL(image.currentSrc).origin !== location.origin)) {
    errors.push("The 404 page is missing a rendered same-origin image");
  }

  const links = new Set();
  for (const element of document.querySelectorAll("[href], [src], [srcset]")) {
    const urls = [element.getAttribute("href"), element.getAttribute("src")];
    for (const candidate of (element.getAttribute("srcset") || "").split(",")) {
      urls.push(candidate.trim().split(/\s+/)[0]);
    }
    for (const raw of urls.filter(Boolean)) {
      if (raw.startsWith("#")) continue;
      const url = new URL(raw, document.baseURI);
      if (url.origin !== location.origin && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw)) continue;
      if (url.origin !== location.origin || !/^\/(?!\/)/.test(raw)) errors.push(`404 URL is not root-relative: ${raw}`);
      if (element.matches("a[href]")) links.add(url.pathname);
    }
  }
  for (const destination of ["/index.html", "/tours.html"]) {
    if (!main?.querySelector(`a[href="${destination}"]`)) errors.push(`Missing 404 action to ${destination}`);
  }
  return { errors, links: [...links] };
}

async function checkPages(cdp, origin) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const { frameTree } = await send("Page.getFrameTree");
  const frameId = frameTree.frame.id;
  const { events } = cdp;
  const activatedWorkers = new Set();
  let page;

  events.on("Page.lifecycleEvent", (event) => {
    if (page && event.frameId === frameId && event.name === "load") page.loads.add(event.loaderId);
  });
  events.on("Network.requestWillBeSent", ({ requestId, request, type, frameId: requestFrame }) => {
    if (!page) return;
    const entry = { url: request.url, pending: true, topDocument: requestFrame === frameId && type === "Document" };
    page.requests.set(requestId, entry);
    if (entry.topDocument) page.documents.push(entry);
    page.lastActivity = Date.now();
  });
  events.on("Network.responseReceived", ({ requestId, response }) => {
    const request = page?.requests.get(requestId);
    if (request) request.response = response;
  });
  for (const method of ["Network.loadingFinished", "Network.loadingFailed"]) {
    events.on(method, ({ requestId, errorText, blockedReason }) => {
      const request = page?.requests.get(requestId);
      if (!request) return;
      request.pending = false;
      request.failure = blockedReason || errorText;
      page.lastActivity = Date.now();
    });
  }
  events.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type === "error" || type === "assert") {
      page?.errors.add(`console.${type} ${args.map((arg) => arg.description || arg.value || arg.type).join(" ")}`);
    }
  });
  events.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    page?.errors.add(exceptionDetails.exception?.description || exceptionDetails.text);
  });
  events.on("Log.entryAdded", ({ entry }) => {
    if (entry.level === "error") page?.logs.push(entry);
  });
  events.on("Audits.issueAdded", ({ issue }) => {
    const violation = issue.details.contentSecurityPolicyIssueDetails;
    if (violation) page?.errors.add(`CSP ${violation.violatedDirective}: ${violation.blockedURL || violation.contentSecurityPolicyViolationType}`);
  });
  events.on("ServiceWorker.workerVersionUpdated", ({ versions }) => {
    for (const worker of versions) {
      if (worker.status === "activated") activatedWorkers.add(worker.scriptURL);
    }
  });
  events.on("ServiceWorker.workerErrorReported", ({ errorMessage }) => {
    page?.errors.add(`Service Worker: ${errorMessage.errorMessage}`);
  });
  events.on("Fetch.requestPaused", ({ requestId, networkId, request, frameId: requestFrame }) => {
    const requestingPage = page;
    const url = new URL(request.url);
    if (requestFrame === frameId || url.origin !== "https://www.google.com" ||
        url.pathname !== "/maps" || url.searchParams.get("output") !== "embed") {
      send("Fetch.continueRequest", { requestId })
        .catch((error) => requestingPage?.errors.add(`Request interception: ${error.message}`));
      return;
    }
    // Only the map iframe is stubbed. Chromium still applies the site's frame-src policy.
    send("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/html" }],
      body: Buffer.from("<!doctype html><title>Map omitted by smoke check</title>").toString("base64"),
    }).then(() => {
      // A cross-origin iframe may finish in a different DevTools session.
      const entry = requestingPage?.requests.get(networkId);
      if (entry) entry.pending = false;
    }).catch((error) => requestingPage?.errors.add(`Map interception: ${error.message}`));
  });

  try {
    await Promise.all(["Page", "Network", "Runtime", "Log", "Audits", "ServiceWorker"].map((domain) => send(`${domain}.enable`)));
    await send("Page.setLifecycleEventsEnabled", { enabled: true });
    await send("Fetch.enable", { patterns: [{ urlPattern: mapPattern, resourceType: "Document" }] });
  } catch (error) {
    throw new Unavailable(`Chromium lacks required DevTools capabilities. ${error.message}`);
  }

  async function evaluate(expression) {
    const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  }

  function pageErrors(expected404) {
    const errors = new Set(page.errors);
    for (const request of page.requests.values()) {
      if (request.failure) errors.add(`${request.url} ${request.failure}`);
      if (request !== expected404 && request.response?.status >= 400) errors.add(`HTTP ${request.response.status} ${request.url}`);
    }
    for (const log of page.logs) {
      const expectedLog = expected404 && log.source === "network" && /\b404\b/.test(log.text) &&
        (page.requests.get(log.networkRequestId) === expected404 || log.url === expected404.url);
      if (!expectedLog) errors.add(`${log.text}${log.url ? ` (${log.url})` : ""}`);
    }
    return [...errors];
  }

  const passedPages = new Set();
  async function navigate(route, expectedStatus = 200, verify) {
    const url = origin + route;
    page = { requests: new Map(), documents: [], loads: new Set(), errors: new Set(), logs: [], lastActivity: Date.now() };
    let expected404;
    try {
      const { loaderId, errorText } = await send("Page.navigate", { url });
      assert.ok(loaderId && !errorText, errorText || "No document navigation");
      await waitFor("the load event", () => page.loads.has(loaderId));
      const document = page.documents[0];
      assert.equal(document?.response?.url, url);
      assert.equal(document.response.status, expectedStatus, `Expected HTTP ${expectedStatus}, got HTTP ${document.response.status}`);
      assert.equal(document.response.mimeType, "text/html", `Expected HTML, got ${document.response.mimeType}`);
      assert.ok(Object.keys(document.response.headers).some((name) => name.toLowerCase() === "content-security-policy"), "Document is missing the CSP header");
      if (expectedStatus === 404) expected404 = document;
      await waitFor("local resources to settle", () =>
        Date.now() - page.lastActivity >= quietPeriod && [...page.requests.values()].every((request) => !request.pending));
      await verify?.();
      if (expectedStatus === 200) passedPages.add(route);
    } catch (error) {
      page.errors.add(error.message);
      for (const request of page.requests.values()) {
        if (request.pending) page.errors.add(`Unfinished request: ${request.url}`);
      }
    }
    const errors = pageErrors(expected404);
    assert.ok(!errors.length, `${route}\n  ${errors.join("\n  ")}`);
  }

  const workerUrl = origin + "/service-worker.js";
  await navigate("/", 200, async () => {
    const verifySingleLoad = () => assert.equal(page.documents.length, 1, "Initial Service Worker activation reloaded the page");
    await waitFor("the first Service Worker to activate and control the page", async () => {
      verifySingleLoad();
      if (!activatedWorkers.has(workerUrl)) return false;
      return evaluate(`navigator.serviceWorker.controller?.state === "activated" &&
        navigator.serviceWorker.controller?.scriptURL === ${JSON.stringify(workerUrl)}`);
    });
    // Let controllerchange and any resulting navigation reach the DevTools session.
    await delay(quietPeriod, undefined, { signal: interruption.signal });
    verifySingleLoad();
    assert.equal(page.loads.size, 1, "Expected one initial page load");
  });

  for (const file of maintainedPages) await navigate(`/${file}`);
  await navigate(missingRoute, 404, async () => {
    await evaluate("document.fonts.ready.then(() => true)");
    const { errors, links } = await evaluate(`(${inspect404})()`);
    for (const error of errors) page.errors.add(error);
    for (const link of links) {
      if (!passedPages.has(link)) page.errors.add(`404 link did not resolve to a verified page: ${link}`);
    }
    for (const { production } of assetReferences) {
      const loaded = [...page.requests.values()].some(({ url, response, pending, failure }) =>
        url === `${origin}/${production.file}` && response?.status === 200 && !pending && !failure);
      if (!loaded) page.errors.add(`404 did not load /${production.file}`);
    }
  });
}

async function main() {
  if (typeof WebSocket !== "function") throw new Unavailable("Node.js with a built-in WebSocket is required (Node.js 22+).");
  const chromium = await findChromium();
  const tempRoot = await fs.realpath(os.tmpdir());
  const profile = await fs.mkdtemp(path.join(tempRoot, "aurora-smoke-"));
  assert.equal(path.dirname(await fs.realpath(profile)), tempRoot, "Unexpected temporary profile location");
  let server;
  let browser;
  let cdp;
  let version;

  try {
    server = launch(process.execPath, [path.join(__dirname, "preview-server.js"), "dist", "--port", "0"]);
    const origin = await waitForStartup("Production preview", server, () =>
      server.output.match(/preview of dist\/: (http:\/\/127\.0\.0\.1:\d+)\//)?.[1]);
    browser = launch(chromium, [
      "--headless", "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
      "--window-size=1280,900", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
    ], !windows);
    try {
      const endpoint = await waitForStartup("Chromium DevTools", browser, async () => {
        let contents;
        try {
          contents = await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8");
        } catch (error) {
          // Chromium can briefly lock this file while writing the debugging endpoint on Windows.
          if (error.code === "ENOENT" || error.code === "EBUSY") return false;
          throw error;
        }
        const [port, endpointPath] = contents.trim().split(/\r?\n/);
        return /^\d+$/.test(port) && endpointPath?.startsWith("/devtools/browser/") && `ws://127.0.0.1:${port}${endpointPath}`;
      });
      cdp = await connect(endpoint);
      ({ product: version } = await cdp.send("Browser.getVersion"));
    } catch (error) {
      throw new Unavailable(`Cannot start headless Chromium with DevTools. ${error.message}`);
    }

    console.log("INFO Google Maps iframe responses are stubbed; third-party map availability is excluded.");
    await checkPages(cdp, origin);
  } finally {
    const cleanup = await Promise.allSettled([
      (async () => {
        try {
          await stopBrowser(browser, cdp);
        } finally {
          await fs.rm(profile, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 });
        }
      })(),
      (async () => {
        if (!server || server.stopped) return;
        server.child.kill();
        await waitFor("the production preview to exit", () => server.stopped, { ms: 5000, signal: null });
      })(),
    ]);
    for (const result of cleanup) {
      if (result.status === "rejected") {
        console.error(`FAIL Cleanup: ${result.reason.message}`);
        process.exitCode = 1;
      }
    }
  }
  interruption.signal.throwIfAborted();
  if (!process.exitCode) {
    console.log(`PASS ${version}: ${maintainedPages.length} maintained pages, one first-visit load with an active Service Worker, and nested 404 rendering, assets, and links.`);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => interruption.abort(new Error(`Interrupted by ${signal}`)));
}
main().catch((error) => {
  console.error(`${error instanceof Unavailable ? "UNAVAILABLE" : "FAIL"} ${error.message}`);
  process.exitCode = 1;
});
