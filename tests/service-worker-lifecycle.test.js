import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "./helpers.js";

// jsdom has no Service Worker API. The container, registration and workers below are EventTargets
// with the fields the module reads, and each test fires the browser's lifecycle events itself:
// updatefound and statechange while a worker installs, and controllerchange when a worker takes
// control of the page (clients.claim() on activation).
function createWorker(state) {
  const worker = new EventTarget();
  worker.state = state;
  worker.postMessage = vi.fn();
  return worker;
}

describe("production Service Worker lifecycle", () => {
  let container;
  let registration;
  let reload;
  let windowListeners;

  beforeEach(() => {
    // A fresh module per test, so its per-page reload state starts unset.
    vi.resetModules();
    vi.stubGlobal("__AURORA_PRODUCTION__", true);
    registration = new EventTarget();
    registration.installing = null;
    registration.waiting = null;
    container = new EventTarget();
    container.controller = null;
    container.register = vi.fn(async () => registration);
    Object.defineProperty(navigator, "serviceWorker", { value: container, configurable: true });
    reload = vi.fn();
    windowListeners = vi.spyOn(window, "addEventListener");
  });

  afterEach(() => {
    // Removing the stub alone leaves the module's load listener on window for the next test.
    for (const [type, listener, options] of windowListeners.mock.calls) {
      window.removeEventListener(type, listener, options);
    }
    delete navigator.serviceWorker;
  });

  // Runs the page's load event, after which the module registers the worker.
  async function loadPage({ controller = null, waiting = null } = {}) {
    container.controller = controller;
    registration.waiting = waiting;
    const { initPwaLifecycle } = await import("../js/features/service-worker-lifecycle.js");
    initPwaLifecycle({ reload });
    window.dispatchEvent(new Event("load"));
    await flushPromises();
    expect(container.register).toHaveBeenCalledWith("/service-worker.js");
  }

  // A worker found by registration or an update check installs and becomes the waiting worker.
  function install(worker) {
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    registration.installing = null;
    registration.waiting = worker;
    worker.state = "installed";
    worker.dispatchEvent(new Event("statechange"));
  }

  // The browser sets the controller and fires controllerchange in the same task.
  function takeControl(worker) {
    registration.waiting = null;
    worker.state = "activated";
    container.controller = worker;
    container.dispatchEvent(new Event("controllerchange"));
  }

  function refreshButton() {
    const buttons = document.querySelectorAll("#sw-update-banner button");
    return Array.from(buttons).find((button) => button.textContent === "Odśwież");
  }

  function acceptUpdate(worker) {
    refreshButton().click();
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({ type: "SKIP_WAITING" });
  }

  it("does not reload when the first worker claims a page without a controller", async () => {
    await loadPage();
    const firstWorker = createWorker("installing");

    install(firstWorker);
    expect(document.getElementById("sw-update-banner")).toBeNull();
    takeControl(firstWorker);

    expect(reload).not.toHaveBeenCalled();
    expect(document.getElementById("sw-update-banner")).toBeNull();
  });

  it("reloads once when the waiting worker replaces the controller after Odśwież", async () => {
    const newWorker = createWorker("installed");
    await loadPage({ controller: createWorker("activated"), waiting: newWorker });

    acceptUpdate(newWorker);
    // The reload waits until the new worker actually controls the page.
    expect(reload).not.toHaveBeenCalled();
    takeControl(newWorker);
    expect(reload).toHaveBeenCalledOnce();

    container.dispatchEvent(new Event("controllerchange"));
    takeControl(createWorker("installed"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("reloads once when another page's update banner replaces this page's controller", async () => {
    await loadPage({ controller: createWorker("activated") });
    const newWorker = createWorker("installing");

    install(newWorker);
    expect(refreshButton()).toBeDefined();
    takeControl(newWorker);
    expect(reload).toHaveBeenCalledOnce();

    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("tracks the controller from the first claim, so a later replacement reloads once", async () => {
    await loadPage();
    const firstWorker = createWorker("installing");
    install(firstWorker);
    takeControl(firstWorker);
    expect(reload).not.toHaveBeenCalled();
    const newWorker = createWorker("installing");

    install(newWorker);
    expect(refreshButton()).toBeDefined();
    // Accepted on another open page, so only the controller state tells this page to reload.
    takeControl(newWorker);
    expect(reload).toHaveBeenCalledOnce();

    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("reloads once when Odśwież lets the waiting worker take over a page loaded without a controller", async () => {
    const newWorker = createWorker("installed");
    await loadPage({ waiting: newWorker });

    acceptUpdate(newWorker);
    takeControl(newWorker);
    expect(reload).toHaveBeenCalledOnce();

    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });
});
