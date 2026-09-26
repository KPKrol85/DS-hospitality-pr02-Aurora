import { initNav } from "./features/nav.js";
import { initThemeToggle } from "./features/theme.js";
import { initCompactHeader } from "./features/compact-header.js";
import { initReveal } from "./features/reveal.js";
import { initToursFilters } from "./features/tours-filters.js";
import { initTabs } from "./features/tabs.js";
import { initAccordionFaq } from "./features/accordion-faq.js";
import { initForm } from "./features/form.js";
import { initAriaCurrent } from "./features/aria-current.js";
import { initLightbox } from "./features/lightbox.js";
import { initTourDetail } from "./features/tour-detail.js";
import { initGallery } from "./features/gallery.js";
import { initGalleryFilters } from "./features/gallery-filters.js";
import { initProjectNotice } from "./features/project-notice.js";

document.addEventListener("DOMContentLoaded", () => {
  runInitializer("initNav", initNav);
  runInitializer("initThemeToggle", initThemeToggle);
  runInitializer("initCompactHeader", initCompactHeader);
  runInitializer("initToursFilters", initToursFilters);
  runInitializer("initTabs", initTabs);
  runInitializer("initAccordionFaq", initAccordionFaq);
  runInitializer("initForm", initForm);
  runInitializer("initAriaCurrent", initAriaCurrent);

  if (document.body.dataset.page === "gallery") {
    // The filters and reveal need the rendered figures. runInitializer never rejects, so reveal
    // still starts for the rest of the page when the gallery fails.
    runInitializer("initGallery", initGallery)
      .then(() => runInitializer("initGalleryFilters", initGalleryFilters))
      .then(() => runInitializer("initReveal", initReveal));
  } else {
    runInitializer("initReveal", initReveal);
  }

  runInitializer("initTourDetail", initTourDetail);
  runInitializer("initLightbox", initLightbox);
  runInitializer("initProjectNotice", initProjectNotice);
  runInitializer("updateYear", updateYear);
});

// Runs one initializer so that its synchronous throw or asynchronous rejection is reported
// without stopping the others. The returned promise fulfils once the initializer settles.
function runInitializer(name, init) {
  try {
    return Promise.resolve(init()).catch((error) => reportInitializerError(name, error));
  } catch (error) {
    reportInitializerError(name, error);
    return Promise.resolve();
  }
}

function reportInitializerError(name, error) {
  console.error(`Błąd inicjalizacji: ${name}`, error);
}

function updateYear() {
  const yearEl = document.getElementById("current-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

let isRefreshing = false;

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
