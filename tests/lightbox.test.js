import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initGallery } from "../js/features/gallery.js";
import { initGalleryFilters } from "../js/features/gallery-filters.js";
import { initLightbox } from "../js/features/lightbox.js";
import { initTourDetail } from "../js/features/tour-detail.js";
import { flushPromises, mountFromPage, readJson, setUrl, stubFetchJson } from "./helpers.js";

const galleryData = readJson("assets/data/gallery-data.json");
const tours = readJson("assets/data/tours.json");
let documentListeners;

beforeEach(() => {
  documentListeners = vi.spyOn(document, "addEventListener");
});

afterEach(() => {
  // These initializers have no teardown; keep document handlers out of the next test.
  for (const [type, listener, options] of documentListeners.mock.calls) {
    document.removeEventListener(type, listener, options);
  }
  document.body.style.overflow = "";
});

function pressKey(key, shiftKey = false) {
  const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
  document.activeElement.dispatchEvent(event);
  return event;
}

function expectPreview(img) {
  const preview = document.querySelector("[data-lightbox-image]");
  expect(preview.getAttribute("src")).toBe(img.dataset.lightboxSrc);
  expect(preview.alt).toBe(img.alt);
  expect(document.querySelector("[data-lightbox-caption]").textContent).toBe(img.dataset.caption);
}

describe("lightbox on gallery.html", () => {
  let overlay;
  let close;
  let next;
  let trigger;

  beforeEach(async () => {
    mountFromPage("gallery.html", ".gallery-filters", "[data-gallery]", "[data-lightbox]");
    stubFetchJson(galleryData);
    // The delegated lightbox handler is ready before the asynchronous gallery renders.
    initLightbox();
    await initGallery();
    initGalleryFilters();
    overlay = document.querySelector("[data-lightbox]");
    close = overlay.querySelector("[data-lightbox-close]");
    next = overlay.querySelector("[data-lightbox-next]");
    trigger = document.querySelector("[data-gallery] [data-lightbox-trigger]");
  });

  it.each(["", "scroll"])("opens from a native button and restores overflow %j on close", (overflow) => {
    document.body.style.overflow = overflow;
    expect(trigger).toBeInstanceOf(HTMLButtonElement);
    expect(trigger.type).toBe("button");
    expect(overlay.hidden).toBe(true);
    trigger.focus();

    trigger.click();

    expect(overlay.hidden).toBe(false);
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe("hidden");
    expectPreview(trigger.querySelector("img"));

    close.click();

    expect(overlay.hidden).toBe(true);
    expect(document.body.style.overflow).toBe(overflow);
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape and returns focus to the activating button", () => {
    const activatingButton = document.querySelectorAll("[data-gallery] [data-lightbox-trigger]")[1];
    document.body.style.overflow = "auto";
    activatingButton.focus();
    activatingButton.click();
    next.focus();

    pressKey("Escape");

    expect(overlay.hidden).toBe(true);
    expect(document.activeElement).toBe(activatingButton);
    expect(document.body.style.overflow).toBe("auto");
  });

  it.each([false, true])("wraps focus at the Tab boundary (shiftKey=%s)", (shiftKey) => {
    trigger.click();
    const from = shiftKey ? close : next;
    const to = shiftKey ? next : close;
    from.focus();

    // jsdom does not perform native Tab traversal; this checks the boundary handler only.
    const event = pressKey("Tab", shiftKey);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(to);
  });

  it.each([...new Set(galleryData.map((item) => item.country))])("wraps both arrow keys through only visible %s images", (country) => {
    document.querySelector(`[data-gallery-filter="${country}"]`).click();
    const figures = Array.from(document.querySelectorAll("[data-gallery] figure"));
    const visible = figures.filter((figure) => !figure.classList.contains("is-hidden"));
    const images = visible.map((figure) => figure.querySelector("img"));
    expect(images.length).toBeGreaterThan(1);
    expect(images).toHaveLength(galleryData.filter((item) => item.country === country).length);
    expect(visible.every((figure) => figure.dataset.country === country)).toBe(true);
    expect(figures.some((figure) => figure.classList.contains("is-hidden"))).toBe(true);
    visible[0].querySelector("button").click();
    expectPreview(images[0]);

    for (let step = 1; step <= images.length; step += 1) {
      pressKey("ArrowRight");
      expectPreview(images[step % images.length]);
    }
    for (let step = 1; step <= images.length; step += 1) {
      pressKey("ArrowLeft");
      expectPreview(images[(images.length - step) % images.length]);
    }
  });
});

describe("lightbox on tour.html", () => {
  it("excludes the main image from activation and the gallery sequence", async () => {
    mountFromPage("tour.html", "main", "[data-lightbox]");
    setUrl("/tour.html?id=maroko");
    stubFetchJson(tours);
    initTourDetail();
    initLightbox();
    await flushPromises();

    const overlay = document.querySelector("[data-lightbox]");
    const mainImage = document.querySelector("[data-tour-main-image] img");
    const images = Array.from(document.querySelectorAll("[data-tour-gallery] img"));
    expect(images).toHaveLength(tours.find((tour) => tour.id === "maroko").images.length);
    expect(images.length).toBeGreaterThan(1);
    expect(mainImage.closest("[data-gallery]")).toBeNull();
    expect(mainImage.closest("[data-lightbox-trigger]")).toBeNull();
    mainImage.click();
    expect(overlay.hidden).toBe(true);

    images[0].closest("button").click();
    expect(overlay.hidden).toBe(false);
    expectPreview(images[0]);

    // The main image duplicates the first thumbnail's source. Checking the step after
    // wrap detects an extra main-image entry even when the wrap image looks identical.
    for (let step = 1; step <= images.length + 1; step += 1) {
      pressKey("ArrowRight");
      expectPreview(images[step % images.length]);
    }
    overlay.querySelector("[data-lightbox-close]").click();
    images[0].closest("button").click();
    for (let step = 1; step <= images.length + 1; step += 1) {
      pressKey("ArrowLeft");
      expectPreview(images[(2 * images.length - step) % images.length]);
    }
  });
});
