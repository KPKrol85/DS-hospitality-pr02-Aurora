import { initNav } from "./features/nav.js";
import { initThemeToggle } from "./features/theme.js";
import { initCompactHeader } from "./features/compact-header.js";
import { initReveal } from "./features/reveal.js";
import { initToursFilters, initFiltersDropdowns } from "./features/tours-filters.js";
import { initTabs } from "./features/tabs.js";
import { initAccordionFaq } from "./features/accordion-faq.js";
import { initForm } from "./features/form.js";
import { initAriaCurrent } from "./features/aria-current.js";
import { initLightbox } from "./features/lightbox.js";
import { initTourDetail } from "./features/tour-detail.js";
import { initGallery } from "./features/gallery.js";
import { initGalleryFilters } from "./features/gallery-filters.js";
import { initProjectNotice } from "./features/project-notice.js";

document.addEventListener("DOMContentLoaded", async () => {
  initNav();
  initThemeToggle();
  initCompactHeader();
  initToursFilters();
  initFiltersDropdowns();
  initTabs();
  initAccordionFaq();
  initForm();
  initAriaCurrent();

  if (document.body.dataset.page === "gallery") {
    await initGallery();
    initGalleryFilters();
  }

  initReveal();
  initTourDetail();
  initLightbox();
  initProjectNotice();
  updateYear();
});

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
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.style.cssText =
    "position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.75rem 1rem;background:#1f2937;color:#fff;border-radius:.5rem;box-shadow:0 6px 20px rgba(0,0,0,.2);font-size:.95rem;";

  const text = document.createElement("span");
  text.textContent = "New version available.";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:.5rem;align-items:center;";

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.textContent = "Refresh";
  refreshButton.style.cssText = "padding:.35rem .75rem;border:none;border-radius:.35rem;background:#fff;color:#111827;cursor:pointer;";

  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.setAttribute("aria-label", "Dismiss update notification");
  dismissButton.textContent = "Dismiss";
  dismissButton.style.cssText =
    "padding:.35rem .75rem;border:1px solid rgba(255,255,255,.45);border-radius:.35rem;background:transparent;color:#fff;cursor:pointer;";

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
}
