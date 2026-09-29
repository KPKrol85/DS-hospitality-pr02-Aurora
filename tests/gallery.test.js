import { beforeEach, describe, expect, it, vi } from "vitest";
import { initGallery } from "../js/features/gallery.js";
import { initGalleryFilters } from "../js/features/gallery-filters.js";
import { mountFromPage, readJson, stubFetchError, stubFetchJson } from "./helpers.js";

const galleryData = readJson("assets/data/gallery-data.json");

function galleryEl() {
  return document.querySelector("[data-gallery]");
}

function figures() {
  return Array.from(galleryEl().querySelectorAll(":scope > figure"));
}

function filterButtons() {
  return Array.from(document.querySelectorAll("[data-gallery-filter]"));
}

function filterButton(filter) {
  return document.querySelector(`[data-gallery-filter="${filter}"]`);
}

function visibleFigures() {
  return figures().filter((figure) => !figure.classList.contains("is-hidden"));
}

function pressedFilters() {
  return filterButtons()
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.dataset.galleryFilter);
}

// Mirrors js/script.js on gallery.html: the filters start once the figures are rendered.
async function renderGallery(items) {
  stubFetchJson(items);
  await initGallery();
  initGalleryFilters();
}

beforeEach(() => {
  mountFromPage("gallery.html", ".gallery-filters", "[data-gallery]");
});

describe("initGallery", () => {
  it("renders one figure per record, in data order", async () => {
    const fetchMock = stubFetchJson(galleryData);

    await initGallery();

    expect(fetchMock).toHaveBeenCalledWith("assets/data/gallery-data.json");
    expect(figures()).toHaveLength(galleryData.length);
    expect(figures().map((figure) => figure.dataset.country)).toEqual(galleryData.map((item) => item.country));
    expect(figures().map((figure) => figure.querySelector("figcaption").textContent)).toEqual(galleryData.map((item) => item.caption));
  });

  it("builds the picture sources from the record's base path", async () => {
    stubFetchJson(galleryData);

    await initGallery();

    // First record: islandia/islandia-01.
    const picture = figures()[0].querySelector("picture");
    const [avif, webp, img] = picture.children;
    const path = "assets/img/tours/islandia/islandia-01";
    // The .gallery-grid column slot. A <source> without its own sizes would use 100vw.
    const sizes = "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 560px) 46vw, 92vw";

    expect(avif.tagName).toBe("SOURCE");
    expect(avif.type).toBe("image/avif");
    expect(avif.getAttribute("srcset")).toBe(`${path}-400x260.avif 400w, ${path}-800x520.avif 800w, ${path}-1200x780.avif 1200w, ${path}-1600x1040.avif 1600w`);
    expect(avif.getAttribute("sizes")).toBe(sizes);
    expect(webp.type).toBe("image/webp");
    expect(webp.getAttribute("srcset")).toBe(`${path}-400x260.webp 400w, ${path}-800x520.webp 800w, ${path}-1200x780.webp 1200w, ${path}-1600x1040.webp 1600w`);
    expect(webp.getAttribute("sizes")).toBe(sizes);
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe(`${path}-1200x780.jpg`);
    expect(img.getAttribute("srcset")).toBe(`${path}-400x260.jpg 400w, ${path}-800x520.jpg 800w, ${path}-1200x780.jpg 1200w, ${path}-1600x1040.jpg 1600w`);
    expect(img.getAttribute("sizes")).toBe(sizes);
    expect(img.getAttribute("width")).toBe("1200");
    expect(img.getAttribute("height")).toBe("780");
    // jsdom does not reflect the loading property to the attribute, as browsers do.
    expect(img.loading).toBe("lazy");

    figures().forEach((figure, index) => {
      expect(figure.querySelector("img").getAttribute("src")).toBe(`assets/img/tours/${galleryData[index].base}-1200x780.jpg`);
      figure.querySelectorAll("source, img").forEach((element) => {
        expect(element.getAttribute("sizes")).toBe(sizes);
      });
    });
  });

  it("keeps the alt text, caption and lightbox source of every record", async () => {
    stubFetchJson(galleryData);

    await initGallery();

    figures().forEach((figure, index) => {
      const item = galleryData[index];
      const img = figure.querySelector("img");

      expect(img.alt).toBe(item.alt);
      expect(img.alt).toMatch(/\p{L}/u);
      expect(img.dataset.lightboxSrc).toBe(item.lightbox);
      expect(img.dataset.caption).toBe(item.caption);
    });
  });

  it("wraps each image in a native button that triggers the lightbox", async () => {
    stubFetchJson(galleryData);

    await initGallery();

    figures().forEach((figure, index) => {
      const button = figure.firstElementChild;

      expect(button.tagName).toBe("BUTTON");
      expect(button.type).toBe("button");
      expect(button.classList.contains("gallery-item")).toBe(true);
      expect(button.hasAttribute("data-lightbox-trigger")).toBe(true);
      expect(button.querySelector("img[data-lightbox-src]")).not.toBeNull();
      expect(button.getAttribute("aria-label")).toBe(`Otwórz zdjęcie: ${galleryData[index].alt}`);
    });
  });

  it("falls back to the caption, a generic label and the derived lightbox source", async () => {
    const [first, second] = structuredClone(galleryData);
    const placeholderAlt = { ...first, alt: "...", lightbox: undefined };
    const undescribed = { ...second, alt: "", caption: "" };

    await renderGallery([placeholderAlt, undescribed]);

    const [withCaption, withoutText] = figures();
    expect(withCaption.querySelector("button").getAttribute("aria-label")).toBe(`Otwórz zdjęcie: ${first.caption}`);
    expect(withCaption.querySelector("img").dataset.lightboxSrc).toBe(`assets/img/tours/${first.base}-1600x1040.jpg`);
    expect(withoutText.querySelector("button").getAttribute("aria-label")).toBe("Otwórz zdjęcie");
    expect(withoutText.querySelector("img").alt).toBe("");
    expect(withoutText.querySelector("figcaption").textContent).toBe("");
  });

  it.each([
    ["an empty array", []],
    ["a non-array value", {}],
  ])("leaves the gallery empty for %s", async (_label, data) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetchJson(data);

    await initGallery();
    initGalleryFilters();

    expect(galleryEl().children).toHaveLength(0);
    expect(consoleError).not.toHaveBeenCalled();
    // The filters stay in their static markup state.
    expect(filterButtons().some((button) => button.hasAttribute("aria-pressed"))).toBe(false);
  });

  it.each([
    ["an HTTP error", () => stubFetchJson(galleryData, 500), "HTTP 500"],
    ["a network failure", () => stubFetchError(), "Failed to fetch"],
  ])("empties the gallery and reports %s without rejecting", async (_label, stub, message) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    stub();

    await expect(initGallery()).resolves.toBeUndefined();

    expect(galleryEl().children).toHaveLength(0);
    expect(consoleError).toHaveBeenCalledWith("Błąd ładowania galerii", expect.objectContaining({ message }));
  });
});

describe("initGalleryFilters", () => {
  it("starts with every item visible and only the all filter pressed", async () => {
    await renderGallery(galleryData);

    expect(visibleFigures()).toHaveLength(galleryData.length);
    expect(pressedFilters()).toEqual(["all"]);
    expect(filterButtons().filter((button) => button.classList.contains("is-active"))).toEqual([filterButton("all")]);
    filterButtons().forEach((button) => {
      expect(button.getAttribute("aria-pressed")).toBe(button === filterButton("all") ? "true" : "false");
    });
  });

  it("shows only the items of each selected destination", async () => {
    await renderGallery(galleryData);

    const destinations = filterButtons().filter((button) => button.dataset.galleryFilter !== "all");
    expect(destinations).toHaveLength(6);

    destinations.forEach((button) => {
      const country = button.dataset.galleryFilter;
      button.click();

      const expected = galleryData.filter((item) => item.country === country).length;
      expect(expected, `gallery-data.json has no items for the "${country}" filter`).toBeGreaterThan(0);
      expect(visibleFigures()).toHaveLength(expected);
      expect(visibleFigures().every((figure) => figure.dataset.country === country)).toBe(true);
      expect(pressedFilters()).toEqual([country]);
      expect(filterButton("all").getAttribute("aria-pressed")).toBe("false");
    });
  });

  it("restores the whole gallery with the all filter", async () => {
    await renderGallery(galleryData);

    filterButton("tokio").click();
    filterButton("all").click();

    expect(visibleFigures()).toHaveLength(galleryData.length);
    expect(pressedFilters()).toEqual(["all"]);
  });

  it("falls back to all items when the selected destination has none", async () => {
    const islandia = galleryData.filter((item) => item.country === "islandia");
    await renderGallery(islandia);

    filterButton("tokio").click();

    expect(visibleFigures()).toHaveLength(islandia.length);
    expect(pressedFilters()).toEqual(["all"]);
    expect(filterButton("tokio").getAttribute("aria-pressed")).toBe("false");
    expect(filterButton("tokio").classList.contains("is-active")).toBe(false);
  });
});
