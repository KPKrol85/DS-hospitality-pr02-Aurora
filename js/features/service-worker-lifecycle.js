let isRefreshing = false;
// Set when "Odśwież" on this page asks the waiting worker to take over.
let isUpdateAccepted = false;

// reload reloads the current document once a new worker controls it; tests pass their own, as
// jsdom cannot reload.
export function initPwaLifecycle({ reload = () => window.location.reload() } = {}) {
  if ("serviceWorker" in navigator) {
    // __AURORA_PRODUCTION__ is defined as true only in the production bundle (build:js
    // --define). Development loads the unbundled sources, which lack the bundles the
    // production worker precaches. Tested inline so esbuild drops the development branch.
    if (typeof __AURORA_PRODUCTION__ !== "undefined" && __AURORA_PRODUCTION__ === true) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("/service-worker.js");
          watchForWaitingServiceWorker(registration);

          // Activation calls clients.claim(), so a first visit also receives controllerchange when
          // the page gets its first controller; that page already runs the current bundles. Reload
          // once when a new worker replaces the page's controller (only after SKIP_WAITING from the
          // update banner of an open page), or when it takes over after "Odśwież" on a page loaded
          // without a controller, such as after a hard reload.
          let controller = navigator.serviceWorker.controller;

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            const replacedController = controller;
            controller = navigator.serviceWorker.controller;
            if (isRefreshing || (!replacedController && !isUpdateAccepted)) return;
            isRefreshing = true;
            reload();
          });
        } catch {

        }
      });
    } else {
      // Drop a worker left on this origin by a production build, so it cannot keep
      // serving the development sources cache-first.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {});
    }
  }
}

function promptServiceWorkerUpdate(registration) {
  if (document.getElementById("sw-update-banner")) return;

  const banner = document.createElement("div");
  banner.id = "sw-update-banner";
  banner.className = "sw-update-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");

  const text = document.createElement("span");
  text.className = "sw-update-banner__text";
  text.textContent = "Dostępna jest nowa wersja strony.";

  const actions = document.createElement("div");
  actions.className = "sw-update-banner__actions";

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "btn";
  refreshButton.textContent = "Odśwież";

  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "btn btn--ghost";
  dismissButton.setAttribute("aria-label", "Zamknij powiadomienie o aktualizacji");
  dismissButton.textContent = "Zamknij";

  refreshButton.addEventListener("click", () => {
    isUpdateAccepted = true;
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
  });

  dismissButton.addEventListener("click", () => {
    banner.remove();
  });

  actions.append(refreshButton, dismissButton);
  banner.append(text, actions);
  document.body.appendChild(banner);
}

function watchForWaitingServiceWorker(registration) {
  if (registration.waiting) {
    promptServiceWorkerUpdate(registration);
    return;
  }

  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        promptServiceWorkerUpdate(registration);
      }
    });
  });
}
