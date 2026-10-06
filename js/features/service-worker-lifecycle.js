let isRefreshing = false;

export function initPwaLifecycle() {
  if ("serviceWorker" in navigator) {
    // __AURORA_PRODUCTION__ is defined as true only in the production bundle (build:js
    // --define). Development loads the unbundled sources, which lack the bundles the
    // production worker precaches. Tested inline so esbuild drops the development branch.
    if (typeof __AURORA_PRODUCTION__ !== "undefined" && __AURORA_PRODUCTION__ === true) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("/service-worker.js");
          watchForWaitingServiceWorker(registration);

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (isRefreshing) return;
            isRefreshing = true;
            window.location.reload();
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
