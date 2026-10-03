import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mountFromPage } from "./helpers.js";

const initializers = vi.hoisted(() => ({
  initNav: vi.fn(),
  initThemeToggle: vi.fn(),
  initCompactHeader: vi.fn(),
  initReveal: vi.fn(),
  initToursFilters: vi.fn(),
  initTabs: vi.fn(),
  initAccordionFaq: vi.fn(),
  initForm: vi.fn(),
  initAriaCurrent: vi.fn(),
  initLightbox: vi.fn(),
  initTourDetail: vi.fn(),
  initGallery: vi.fn(),
  initGalleryFilters: vi.fn(),
  initProjectNotice: vi.fn(),
}));

vi.mock("../js/features/nav.js", () => ({ initNav: initializers.initNav }));
vi.mock("../js/features/theme.js", () => ({ initThemeToggle: initializers.initThemeToggle }));
vi.mock("../js/features/compact-header.js", () => ({ initCompactHeader: initializers.initCompactHeader }));
vi.mock("../js/features/reveal.js", () => ({ initReveal: initializers.initReveal }));
vi.mock("../js/features/tours-filters.js", () => ({ initToursFilters: initializers.initToursFilters }));
vi.mock("../js/features/tabs.js", () => ({ initTabs: initializers.initTabs }));
vi.mock("../js/features/accordion-faq.js", () => ({ initAccordionFaq: initializers.initAccordionFaq }));
vi.mock("../js/features/form.js", () => ({ initForm: initializers.initForm }));
vi.mock("../js/features/aria-current.js", () => ({ initAriaCurrent: initializers.initAriaCurrent }));
vi.mock("../js/features/lightbox.js", () => ({ initLightbox: initializers.initLightbox }));
vi.mock("../js/features/tour-detail.js", () => ({ initTourDetail: initializers.initTourDetail }));
vi.mock("../js/features/gallery.js", () => ({ initGallery: initializers.initGallery }));
vi.mock("../js/features/gallery-filters.js", () => ({ initGalleryFilters: initializers.initGalleryFilters }));
vi.mock("../js/features/project-notice.js", () => ({ initProjectNotice: initializers.initProjectNotice }));

describe("page initializer isolation", () => {
  let consoleError;
  let documentListeners;
  let year;

  beforeEach(() => {
    vi.resetModules();
    Object.values(initializers).forEach((initializer) => initializer.mockReset());
    document.body.dataset.page = "home";
    mountFromPage("index.html", "#current-year");
    year = document.getElementById("current-year");
    year.textContent = "pending";
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    documentListeners = vi.spyOn(document, "addEventListener");
  });

  afterEach(async () => {
    await flushPromises();
    // resetModules alone leaves the previous import's DOMContentLoaded listener attached.
    for (const [type, listener, options] of documentListeners.mock.calls) {
      if (type === "DOMContentLoaded") document.removeEventListener(type, listener, options);
    }
    delete document.body.dataset.page;
  });

  async function startPage() {
    await import("../js/script.js");
    Object.values(initializers).forEach((initializer) => expect(initializer).not.toHaveBeenCalled());
    expect(year.textContent).toBe("pending");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();
  }

  function expectInitializersCalled() {
    for (const [name, initializer] of Object.entries(initializers)) {
      const galleryOnly = name === "initGallery" || name === "initGalleryFilters";
      const expectedCalls = galleryOnly && document.body.dataset.page !== "gallery" ? 0 : 1;
      expect(initializer, name).toHaveBeenCalledTimes(expectedCalls);
    }
    // updateYear is local to script.js, so verify its real DOM effect.
    expect(year.textContent).toBe(String(new Date().getFullYear()));
  }

  it("continues all remaining initializers after a synchronous throw and reports it once", async () => {
    const error = new Error("Navigation setup failed");
    initializers.initNav.mockImplementation(() => { throw error; });

    await startPage();

    expectInitializersCalled();
    expect(consoleError.mock.calls).toEqual([["Błąd inicjalizacji: initNav", error]]);
  });

  it("continues all remaining initializers after a rejected promise and reports it once", async () => {
    const error = new Error("Theme setup failed");
    initializers.initThemeToggle.mockRejectedValue(error);

    await startPage();

    expectInitializersCalled();
    expect(consoleError.mock.calls).toEqual([["Błąd inicjalizacji: initThemeToggle", error]]);
  });

  it("isolates simultaneous synchronous and asynchronous failures and names each report", async () => {
    const navError = new Error("Navigation setup failed");
    const themeError = new Error("Theme setup failed");
    initializers.initNav.mockImplementation(() => { throw navError; });
    initializers.initThemeToggle.mockRejectedValue(themeError);

    await startPage();

    expectInitializersCalled();
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledWith("Błąd inicjalizacji: initNav", navError);
    expect(consoleError).toHaveBeenCalledWith("Błąd inicjalizacji: initThemeToggle", themeError);
  });

  it("handles gallery rejection and then runs gallery filters and reveal in order", async () => {
    document.body.dataset.page = "gallery";
    const error = new Error("Gallery setup failed");
    let rejectGallery;
    initializers.initGallery.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectGallery = reject;
    }));

    await startPage();

    expect(initializers.initGallery).toHaveBeenCalledTimes(1);
    expect(initializers.initGalleryFilters).not.toHaveBeenCalled();
    expect(initializers.initReveal).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();

    rejectGallery(error);
    await flushPromises();

    expectInitializersCalled();
    expect(consoleError.mock.calls).toEqual([["Błąd inicjalizacji: initGallery", error]]);
    expect(initializers.initGallery.mock.invocationCallOrder[0])
      .toBeLessThan(initializers.initGalleryFilters.mock.invocationCallOrder[0]);
    expect(initializers.initGalleryFilters.mock.invocationCallOrder[0])
      .toBeLessThan(initializers.initReveal.mock.invocationCallOrder[0]);
  });
});
