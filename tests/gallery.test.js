import { beforeEach, describe, expect, it, vi } from "vitest";
import { initGallery } from "../js/features/gallery.js";
import { initGalleryFilters } from "../js/features/gallery-filters.js";
import { mountFromPage, readJson, stubFetchDeferred, stubFetchError, stubFetchJson, stubFetchMalformedJson } from "./helpers.js";

const galleryData = readJson("assets/data/gallery-data.json");
const tours = readJson("assets/data/tours.json");

const loadingMessage = "Ładowanie galerii…";
const unavailableMessage = "Nie udało się wczytać galerii. Sprawdź połączenie z internetem i odśwież stronę.";

function galleryEl() {
  return document.querySelector("[data-gallery]");
}

function chapters() {
  return Array.from(galleryEl().querySelectorAll(":scope > .gallery-chapter"));
}

// Every photograph in DOM order, across the chapters.
function figures() {
  return Array.from(galleryEl().querySelectorAll(":scope > .gallery-chapter > figure"));
}

// Countries in order of first appearance: the chapter order.
function countriesOf(items) {
  return [...new Set(items.map((item) => item.country))];
}

// The slots of the chapter grid in css/modules/subpages.css, by position in a chapter of six.
const leadSizes = "(min-width: 1280px) 795px, (min-width: 1024px) calc(61.33vw - 5px), 92vw";
const rowOfThreeSizes = "(min-width: 1280px) 390px, (min-width: 760px) calc(30.67vw - 11px), calc(46vw - 8px)";
const rowOfTwoSizes = "(min-width: 1280px) 592px, (min-width: 760px) calc(46vw - 8px), calc(46vw - 8px)";
const unpairedRowOfTwoSizes = "(min-width: 1280px) 592px, (min-width: 760px) calc(46vw - 8px), 92vw";
const chapterOfSixSizes = [leadSizes, rowOfThreeSizes, rowOfThreeSizes, rowOfThreeSizes, rowOfTwoSizes, unpairedRowOfTwoSizes];

function filtersSection() {
  return document.querySelector("[data-gallery-filters]");
}

function statePanel() {
  return document.querySelector("[data-gallery-state]");
}

function statusEl() {
  return document.querySelector("[data-gallery-status]");
}

// jsdom applies no stylesheet, so visibility follows the hidden attribute of the element and its
// ancestors, as the global [hidden] rule does in the browser.
function isShown(element) {
  return element.closest("[hidden]") === null;
}

function filterButtons() {
  return Array.from(document.querySelectorAll("[data-gallery-filter]"));
}

function filterButton(filter) {
  return document.querySelector(`[data-gallery-filter="${filter}"]`);
}

function visibleChapters() {
  return chapters().filter((chapter) => !chapter.classList.contains("is-hidden"));
}

function visibleFigures() {
  return figures().filter((figure) => !figure.closest(".is-hidden"));
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
  mountFromPage("gallery.html", ".gallery-filters", "[data-gallery-state]", "[data-gallery]");
});

describe("initGallery", () => {
  it("renders one figure per record, in data order", async () => {
    const fetchMock = stubFetchJson(galleryData);

    await initGallery();

    expect(fetchMock).toHaveBeenCalledWith("assets/data/gallery-data.json");
    expect(galleryData).toHaveLength(36);
    expect(figures()).toHaveLength(galleryData.length);
    expect(galleryEl().querySelectorAll("figure")).toHaveLength(galleryData.length);
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
    // The lead slot of the chapter grid. A <source> without its own sizes would use 100vw.
    const sizes = leadSizes;

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
    });
    chapters().forEach((chapter) => {
      const chapterFigures = Array.from(chapter.querySelectorAll("figure"));
      expect(chapterFigures).toHaveLength(chapterOfSixSizes.length);
      chapterFigures.forEach((figure, index) => {
        figure.querySelectorAll("source, img").forEach((element) => {
          expect(element.getAttribute("sizes")).toBe(chapterOfSixSizes[index]);
        });
      });
    });
  });

  it("declares the slot of each photograph for chapters of other lengths", async () => {
    const islandia = galleryData.filter((item) => item.country === "islandia");
    const sizesOf = () => figures().map((figure) => figure.querySelector("img").getAttribute("sizes"));

    await renderGallery(islandia.slice(0, 1));
    expect(sizesOf()).toEqual([leadSizes]);

    // One supporting photograph: alone in its row from 760px and unpaired below.
    await renderGallery(islandia.slice(0, 2));
    expect(sizesOf()).toEqual([leadSizes, "(min-width: 1280px) 1200px, (min-width: 760px) 92vw, 92vw"]);

    // Three: one row of three, the last unpaired below 760px.
    await renderGallery(islandia.slice(0, 4));
    expect(sizesOf()).toEqual([leadSizes, rowOfThreeSizes, rowOfThreeSizes, "(min-width: 1280px) 390px, (min-width: 760px) calc(30.67vw - 11px), 92vw"]);

    // Four: a row of three, then one alone, paired below 760px.
    await renderGallery(islandia.slice(0, 5));
    expect(sizesOf()).toEqual([leadSizes, rowOfThreeSizes, rowOfThreeSizes, rowOfThreeSizes, "(min-width: 1280px) 1200px, (min-width: 760px) 92vw, calc(46vw - 8px)"]);
  });

  it("groups the photographs into one chapter per destination, in catalogue order", async () => {
    stubFetchJson(galleryData);

    await initGallery();

    expect(chapters()).toHaveLength(6);
    expect(galleryEl().children).toHaveLength(6);
    expect(chapters().map((chapter) => chapter.dataset.country)).toEqual(["islandia", "maledivy", "maroko", "new-york", "patagonia", "tokio"]);
    expect(chapters().map((chapter) => chapter.dataset.country)).toEqual(countriesOf(galleryData));
    chapters().forEach((chapter) => {
      const country = chapter.dataset.country;
      const chapterFigures = Array.from(chapter.querySelectorAll("figure"));
      expect(chapter.localName).toBe("section");
      expect(chapterFigures.map((figure) => figure.querySelector("img").getAttribute("src"))).toEqual(
        galleryData.filter((item) => item.country === country).map((item) => `assets/img/tours/${item.base}-1200x780.jpg`),
      );
      expect(chapterFigures.every((figure) => figure.dataset.country === country)).toBe(true);
    });
  });

  it("heads each chapter with its place label, an h2 named like its filter and a link to its offer", async () => {
    const tourIds = { islandia: "islandia", maledivy: "malediwy", maroko: "maroko", "new-york": "nowy-jork", patagonia: "patagonia", tokio: "tokio-kyoto" };
    stubFetchJson(galleryData);

    await initGallery();

    const headingIds = new Set();
    chapters().forEach((chapter) => {
      const country = chapter.dataset.country;
      const tour = tours.find((entry) => entry.id === tourIds[country]);
      const header = chapter.firstElementChild;
      const [region, heading, link] = header.children;
      const name = filterButton(country).textContent.trim();

      expect(tour, `tours.json has no offer for "${country}"`).toBeDefined();
      expect(header.localName).toBe("header");
      expect(header.children).toHaveLength(3);
      expect(region.localName).toBe("p");
      expect(region.classList.contains("type-place-label")).toBe(true);
      expect(region.textContent).toBe(tour.region);
      expect(heading.localName).toBe("h2");
      expect(heading.classList.contains("type-section-title")).toBe(true);
      expect(heading.textContent).toBe(name);
      expect(chapter.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(1);
      expect(chapter.getAttribute("aria-labelledby")).toBe(heading.id);
      headingIds.add(heading.id);
      expect(link.localName).toBe("a");
      expect(link.getAttribute("href")).toBe(`tour.html?id=${tour.id}`);
      expect(link.textContent).toBe(`Zobacz ofertę wyjazdu: ${name}`);
      expect(link.querySelector(".visually-hidden").textContent).toBe(`: ${name}`);
      expect(chapter.querySelectorAll("a")).toHaveLength(1);
    });
    expect(headingIds.size).toBe(6);
    expect(document.querySelectorAll('[id^="gallery-chapter-"]')).toHaveLength(6);
  });

  it("leads each chapter with its first photograph", async () => {
    stubFetchJson(galleryData);

    await initGallery();

    chapters().forEach((chapter) => {
      const leads = chapter.querySelectorAll(".gallery-photo--lead");
      const first = galleryData.find((item) => item.country === chapter.dataset.country);

      expect(leads).toHaveLength(1);
      expect(leads[0]).toBe(chapter.querySelector("figure"));
      expect(leads[0]).toBe(chapter.children[1]);
      expect(leads[0].querySelector("img").getAttribute("src")).toBe(`assets/img/tours/${first.base}-1200x780.jpg`);
    });
    expect(galleryEl().querySelectorAll(".gallery-photo--lead")).toHaveLength(6);
  });

  it("groups interleaved records without losing their order and heads an unknown destination by its key", async () => {
    const [islandia1, islandia2] = galleryData.filter((item) => item.country === "islandia");
    const [tokio1, tokio2] = galleryData.filter((item) => item.country === "tokio");
    const unknown = { ...islandia1, country: "lofoty", base: "lofoty/lofoty-01", lightbox: "assets/img/tours/lofoty/lofoty-01-1600x1040.jpg" };

    await renderGallery([tokio1, islandia1, unknown, tokio2, islandia2]);

    expect(chapters().map((chapter) => chapter.dataset.country)).toEqual(["tokio", "islandia", "lofoty"]);
    expect(figures().map((figure) => figure.querySelector("img").dataset.lightboxSrc)).toEqual([tokio1, tokio2, islandia1, islandia2, unknown].map((item) => item.lightbox));
    const unknownChapter = chapters()[2];
    expect(unknownChapter.querySelector("h2").textContent).toBe("lofoty");
    expect(unknownChapter.querySelector("header").children).toHaveLength(1);
    expect(unknownChapter.querySelector("a, .type-place-label")).toBeNull();
    expect(unknownChapter.querySelectorAll(".gallery-photo--lead")).toHaveLength(1);
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

  it("shows a loading state with the filters hidden until the data arrives", async () => {
    const request = stubFetchDeferred();

    const pending = initGallery();

    expect(request.fetchMock).toHaveBeenCalledWith("assets/data/gallery-data.json");
    expect(isShown(statePanel())).toBe(true);
    expect(statusEl().textContent).toBe(loadingMessage);
    expect(isShown(filtersSection())).toBe(false);
    expect(filterButtons().every((button) => !isShown(button))).toBe(true);
    expect(galleryEl().children).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);

    request.respondJson(galleryData);
    await pending;
    initGalleryFilters();

    expect(figures()).toHaveLength(galleryData.length);
    expect(isShown(galleryEl())).toBe(true);
    expect(isShown(statePanel())).toBe(false);
    expect(statusEl().textContent).toBe("");
    expect(isShown(filtersSection())).toBe(true);
    expect(pressedFilters()).toEqual(["all"]);

    filterButton("tokio").click();
    expect(visibleFigures().every((figure) => figure.dataset.country === "tokio")).toBe(true);
  });

  it.each([
    ["a network failure", () => stubFetchError(), "Failed to fetch"],
    ["an HTTP 500 response", () => stubFetchJson(galleryData, 500), "HTTP 500"],
    ["an HTTP 404 response", () => stubFetchJson(galleryData, 404), "HTTP 404"],
    ["a response that is not JSON", () => stubFetchMalformedJson(), "is not valid JSON"],
    ["a non-array value", () => stubFetchJson({ items: galleryData }), "gallery-data.json has no records"],
    ["a null value", () => stubFetchJson(null), "gallery-data.json has no records"],
    ["an empty array", () => stubFetchJson([]), "gallery-data.json has no records"],
  ])("shows the unavailable state and keeps the filters hidden after %s", async (_label, stub, message) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    stub();

    await expect(initGallery()).resolves.toBeUndefined();
    initGalleryFilters();

    expect(galleryEl().children).toHaveLength(0);
    expect(isShown(statePanel())).toBe(true);
    expect(statusEl().textContent).toBe(unavailableMessage);
    expect(isShown(filtersSection())).toBe(false);
    // The filters were never initialized, so they keep their static markup state.
    expect(filterButtons().some((button) => button.hasAttribute("aria-pressed"))).toBe(false);
    expect(consoleError).toHaveBeenCalledWith("Błąd ładowania galerii", expect.objectContaining({ message: expect.stringContaining(message) }));
  });

  it("moves from loading to unavailable in the same status region", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const request = stubFetchDeferred();
    const status = statusEl();

    const pending = initGallery();
    expect(isShown(status)).toBe(true);
    expect(status.textContent).toBe(loadingMessage);

    request.fail();
    await pending;

    expect(statusEl()).toBe(status);
    expect(status.textContent).toBe(unavailableMessage);
  });

  it("announces the state politely in its own region, not the rendered figures", async () => {
    expect(galleryEl().hasAttribute("aria-live")).toBe(false);
    expect(statusEl().getAttribute("role")).toBe("status");
    expect(document.querySelector('[aria-live="assertive"], [role="alert"]')).toBeNull();
    expect(Array.from(document.querySelectorAll('[role="status"], [aria-live]'))).toEqual([statusEl()]);
    expect(isShown(statePanel())).toBe(false);

    stubFetchJson(galleryData);
    await initGallery();

    expect(galleryEl().closest('[role="status"], [aria-live]')).toBeNull();
    expect(statusEl().children).toHaveLength(0);
    expect(galleryEl().contains(statusEl())).toBe(false);
  });
});

describe("initGalleryFilters", () => {
  it("starts with every item visible and only the all filter pressed", async () => {
    await renderGallery(galleryData);

    expect(visibleChapters()).toHaveLength(6);
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
      // The whole chapter shows: its heading, offer link and every photograph; the others hide whole.
      expect(visibleChapters()).toHaveLength(1);
      const [chapter] = visibleChapters();
      expect(chapter.dataset.country).toBe(country);
      expect(chapter.querySelector("h2").textContent).toBe(button.textContent.trim());
      expect(chapter.querySelector("a").hasAttribute("href")).toBe(true);
      expect(chapter.querySelectorAll("figure")).toHaveLength(expected);
      chapters()
        .filter((other) => other !== chapter)
        .forEach((other) => expect(other.classList.contains("is-hidden")).toBe(true));
      expect(galleryEl().querySelectorAll(".is-hidden figure")).toHaveLength(galleryData.length - expected);
      expect(pressedFilters()).toEqual([country]);
      expect(filterButton("all").getAttribute("aria-pressed")).toBe("false");
    });
  });

  it("restores the whole gallery with the all filter", async () => {
    await renderGallery(galleryData);

    filterButton("tokio").click();
    filterButton("all").click();

    expect(visibleChapters()).toHaveLength(6);
    expect(visibleFigures()).toHaveLength(galleryData.length);
    expect(pressedFilters()).toEqual(["all"]);
  });

  it("falls back to all items when the selected destination has none", async () => {
    const islandia = galleryData.filter((item) => item.country === "islandia");
    await renderGallery(islandia);

    filterButton("tokio").click();

    expect(chapters()).toHaveLength(1);
    expect(visibleChapters()).toHaveLength(1);
    expect(visibleFigures()).toHaveLength(islandia.length);
    expect(pressedFilters()).toEqual(["all"]);
    expect(filterButton("tokio").getAttribute("aria-pressed")).toBe("false");
    expect(filterButton("tokio").classList.contains("is-active")).toBe(false);
  });
});
