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
import { initPwaLifecycle } from "./features/service-worker-lifecycle.js";

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

// Starts at module evaluation, outside the DOMContentLoaded initializer chain.
initPwaLifecycle();

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
