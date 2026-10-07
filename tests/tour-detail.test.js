import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTourDetail } from "../js/features/tour-detail.js";
import {
  flushPromises,
  mountFromPage,
  readJson,
  setUrl,
  srcsetCandidates,
  stubFetchDeferred,
  stubFetchError,
  stubFetchJson,
  stubFetchMalformedJson,
} from "./helpers.js";

const tours = readJson("assets/data/tours.json");

const loadingMessage = "Ładowanie szczegółów oferty…";
const unavailableMessage = "Nie udało się wczytać szczegółów oferty. Sprawdź połączenie z internetem i spróbuj ponownie.";
// Static not-found and no-selection wording of tour.html.
const notFoundTexts = ["Nie znaleziono lub nie wybrano oferty", "Mogła nie zostać wybrana lub już nie istnieje", "Brak wybranej oferty"];

function field(name) {
  return document.querySelector(`[data-tour-${name}]`);
}

function statePanel() {
  return document.querySelector("[data-tour-state]");
}

function toursLink() {
  return field("state-actions").querySelector('a[href="tours.html"]');
}

// jsdom applies no stylesheet, so visibility follows the hidden attribute of the element and its
// ancestors, as the global [hidden] rule does in the browser.
function isShown(element) {
  return element.closest("[hidden]") === null;
}

// The text of main without its hidden subtrees.
function shownText() {
  const copy = document.querySelector("main").cloneNode(true);
  copy.querySelectorAll("[hidden]").forEach((element) => element.remove());
  return copy.textContent;
}

// Parses catalogue markup the way the page does, for comparison with the rendered content.
function parsed(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.innerHTML;
}

function candidates(path, format) {
  return [`${path}-400x260.${format} 400w`, `${path}-800x520.${format} 800w`, `${path}-1200x780.${format} 1200w`, `${path}-1600x1040.${format} 1600w`];
}

// The main image and the thumbnails render at different widths, so each context declares its own
// slot on every source and the img. A <source> without its own sizes would use 100vw.
const mainImageSizes = "(min-width: 1280px) 520px, (min-width: 900px) 43vw, calc(92vw - 48px)";
const thumbnailSizes = "(min-width: 1280px) 375px, (min-width: 700px) 31vw, (min-width: 480px) 46vw, calc(92vw - 48px)";

function sizesOf(picture) {
  return Array.from(picture.querySelectorAll("source, img")).map((element) => element.getAttribute("sizes"));
}

// Element names and attribute names of a rendered subtree, without the attribute values.
function structureOf(element) {
  return {
    tag: element.localName,
    attributes: element.getAttributeNames().sort(),
    children: Array.from(element.children, structureOf),
  };
}

const sourceStructure = { tag: "source", attributes: ["sizes", "srcset", "type"], children: [] };
const pictureStructure = {
  tag: "picture",
  attributes: ["class"],
  children: [
    sourceStructure,
    sourceStructure,
    {
      tag: "img",
      attributes: ["alt", "data-caption", "data-lightbox-src", "height", "loading", "sizes", "src", "srcset", "width"],
      children: [],
    },
  ],
};

async function renderTour(pathAndQuery, catalogue = tours) {
  setUrl(pathAndQuery);
  const fetchMock = stubFetchJson(catalogue);
  initTourDetail();
  await flushPromises();
  return fetchMock;
}

describe("initTourDetail", () => {
  beforeEach(() => {
    mountFromPage("tour.html", "main");
  });

  it("ships the enquiry action as a plain link to the contact form", () => {
    const link = field("enquiry");

    expect(link.localName).toBe("a");
    expect(link.getAttribute("href")).toBe("contact.html");
    expect(link.classList.contains("btn")).toBe(true);
    expect(link.textContent.trim()).toBe("Zapytaj o ofertę");
    expect(document.querySelectorAll("[data-tour-enquiry]")).toHaveLength(1);
  });

  it.each(tours.map((tour) => [tour.id, tour]))("renders %s from tours.json", async (id, tour) => {
    const fetchMock = await renderTour(`/tour.html?id=${id}`);

    expect(fetchMock).toHaveBeenCalledWith("assets/data/tours.json");
    expect(field("title").textContent).toBe(tour.name);
    expect(field("breadcrumb-current").textContent).toBe(tour.name);
    expect(field("region").textContent).toBe(tour.region);
    expect(field("days").textContent).toBe(`${tour.days} dni`);
    expect(field("price").textContent).toBe(tour.priceFrom);
    expect(field("summary").textContent.trim()).not.toBe("");
    expect(field("summary").innerHTML).toBe(parsed(tour.shortSummary));
    expect(field("content").textContent.trim()).not.toBe("");
    expect(field("content").innerHTML).toBe(parsed(tour.longDescription));
    expect(field("enquiry").getAttribute("href")).toBe(`contact.html?tour=${tour.id}`);
  });

  it("ignores whitespace around the id", async () => {
    await renderTour("/tour.html?id=%20patagonia%20");

    expect(field("title").textContent).toBe("Patagonia Signature Expedition");
    expect(field("enquiry").getAttribute("href")).toBe("contact.html?tour=patagonia");
  });

  it("renders the first catalogue image as the main picture", async () => {
    const tour = tours.find((entry) => entry.id === "maroko");
    const [first] = tour.images;
    const path = `assets/img/tours/${first.base}`;

    await renderTour("/tour.html?id=maroko");

    const container = field("main-image");
    const sources = container.querySelectorAll("source");
    const images = container.querySelectorAll("img");

    expect(images).toHaveLength(1);
    expect(container.querySelector("button")).toBeNull();
    expect(sources[0].getAttribute("type")).toBe("image/avif");
    expect(srcsetCandidates(sources[0])).toEqual(candidates(path, "avif"));
    expect(sources[1].getAttribute("type")).toBe("image/webp");
    expect(srcsetCandidates(sources[1])).toEqual(candidates(path, "webp"));
    expect(images[0].getAttribute("src")).toBe(`${path}-1200x780.jpg`);
    expect(srcsetCandidates(images[0])).toEqual(candidates(path, "jpg"));
    expect(sizesOf(container)).toEqual([mainImageSizes, mainImageSizes, mainImageSizes]);
    expect(images[0].alt).toBe(first.alt);
    expect(images[0].dataset.lightboxSrc).toBe(`${path}-1600x1040.jpg`);
    expect(images[0].dataset.caption).toBe(first.caption);
  });

  it("renders every catalogue image as a lightbox button in the gallery", async () => {
    const tour = tours.find((entry) => entry.id === "maroko");

    await renderTour("/tour.html?id=maroko");

    const buttons = Array.from(field("gallery").querySelectorAll(":scope > button"));
    expect(buttons).toHaveLength(tour.images.length);

    buttons.forEach((button, index) => {
      const image = tour.images[index];
      const img = button.querySelector("img");

      expect(button.type).toBe("button");
      expect(button.classList.contains("tour-gallery__button")).toBe(true);
      expect(button.hasAttribute("data-lightbox-trigger")).toBe(true);
      expect(img.getAttribute("src")).toBe(`assets/img/tours/${image.base}-1200x780.jpg`);
      expect(sizesOf(button)).toEqual([thumbnailSizes, thumbnailSizes, thumbnailSizes]);
      expect(img.alt).toBe(image.alt);
      expect(img.dataset.lightboxSrc).toBe(`assets/img/tours/${image.base}-1600x1040.jpg`);
      expect(img.dataset.caption).toBe(image.caption);
    });

    expect(buttons[0].getAttribute("aria-label")).toBe(`Otwórz zdjęcie: ${tour.images[0].alt}`);
    // maroko-05 has the placeholder alt "...", so its label falls back to the caption.
    expect(tour.images[4].alt).toBe("...");
    expect(buttons[4].getAttribute("aria-label")).toBe(`Otwórz zdjęcie: ${tour.images[4].caption}`);
  });

  it.each(["/tour.html", "/tour.html?id=", "/tour.html?id=%20%20"])("keeps the placeholder content for %s without requesting data", async (pathAndQuery) => {
    const placeholder = document.querySelector("main").innerHTML;

    const fetchMock = await renderTour(pathAndQuery);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelector("main").innerHTML).toBe(placeholder);
    expect(field("title").textContent).toBe("Nie znaleziono lub nie wybrano oferty");
    expect(field("enquiry").getAttribute("href")).toBe("contact.html");
  });

  it("keeps the placeholder content for an id missing from the catalogue", async () => {
    const placeholder = document.querySelector("main").innerHTML;

    const fetchMock = await renderTour("/tour.html?id=atlantyda");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(document.querySelector("main").innerHTML).toBe(placeholder);
    expect(field("gallery").children).toHaveLength(0);
    expect(field("enquiry").getAttribute("href")).toBe("contact.html");
  });

  it("shows a loading state, and no not-found content, until the catalogue arrives", async () => {
    setUrl("/tour.html?id=maroko");
    const request = stubFetchDeferred();
    const tour = tours.find((entry) => entry.id === "maroko");

    const pending = initTourDetail();

    expect(request.fetchMock).toHaveBeenCalledWith("assets/data/tours.json");
    expect(isShown(statePanel())).toBe(true);
    expect(isShown(field("status"))).toBe(true);
    expect(field("status").textContent).toBe(loadingMessage);
    expect(isShown(field("state-actions"))).toBe(false);
    expect(isShown(field("container"))).toBe(false);
    notFoundTexts.forEach((text) => expect(shownText()).not.toContain(text));
    expect(field("breadcrumb-current").textContent).toBe("Szczegóły oferty");
    expect(document.activeElement).toBe(document.body);

    request.respondJson(tours);
    await pending;

    expect(isShown(field("container"))).toBe(true);
    expect(isShown(statePanel())).toBe(false);
    expect(field("status").textContent).toBe("");
    expect(field("title").textContent).toBe(tour.name);
    expect(field("breadcrumb-current").textContent).toBe(tour.name);
    expect(field("enquiry").getAttribute("href")).toBe("contact.html?tour=maroko");
    expect(document.activeElement).toBe(document.body);
  });

  it("returns from loading to the static not-found content for an id missing from the catalogue", async () => {
    const placeholder = document.querySelector("main").innerHTML;
    setUrl("/tour.html?id=atlantyda");
    const request = stubFetchDeferred();

    const pending = initTourDetail();
    expect(isShown(field("container"))).toBe(false);
    expect(field("status").textContent).toBe(loadingMessage);

    request.respondJson(tours);
    await pending;

    expect(document.querySelector("main").innerHTML).toBe(placeholder);
    expect(isShown(field("container"))).toBe(true);
    expect(isShown(statePanel())).toBe(false);
    expect(field("title").textContent).toBe("Nie znaleziono lub nie wybrano oferty");
    expect(field("breadcrumb-current").textContent).toBe("Brak wybranej oferty");
  });

  it.each([
    ["a network failure", () => stubFetchError(), TypeError],
    ["an HTTP 500 response", () => stubFetchJson(tours, 500), Error],
    ["an HTTP 404 response", () => stubFetchJson(tours, 404), Error],
    ["a response that is not JSON", () => stubFetchMalformedJson(), SyntaxError],
    ["a catalogue that is not an array", () => stubFetchJson({ tours }), TypeError],
    ["a null catalogue", () => stubFetchJson(null), TypeError],
  ])("shows the unavailable state, not the not-found content, after %s", async (_label, stub, errorType) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setUrl("/tour.html?id=maroko");
    stub();

    await initTourDetail();

    expect(isShown(field("container"))).toBe(false);
    expect(isShown(statePanel())).toBe(true);
    expect(field("status").textContent).toBe(unavailableMessage);
    notFoundTexts.forEach((text) => expect(shownText()).not.toContain(text));
    expect(isShown(field("state-actions"))).toBe(true);
    expect(isShown(field("retry"))).toBe(true);
    expect(toursLink().getAttribute("href")).toBe("tours.html");
    expect(field("breadcrumb-current").textContent).toBe("Szczegóły oferty");
    expect(field("enquiry").getAttribute("href")).toBe("contact.html");
    expect(consoleError).toHaveBeenCalledWith("Błąd ładowania danych wycieczki", expect.any(errorType));
    expect(document.activeElement).toBe(document.body);
  });

  it("moves from loading to unavailable in the same status region", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setUrl("/tour.html?id=maroko");
    const request = stubFetchDeferred();
    const status = field("status");

    const pending = initTourDetail();
    expect(isShown(status)).toBe(true);

    request.fail();
    await pending;

    expect(field("status")).toBe(status);
    expect(status.textContent).toBe(unavailableMessage);
  });

  it("retries by reloading the current document, fragment included, from a native button", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setUrl("/tour.html?id=nyc&utm_source=newsletter#galeria");
    stubFetchError();
    const reload = vi.fn();

    await initTourDetail({ reload });

    const retry = field("retry");
    expect(retry.localName).toBe("button");
    expect(retry.type).toBe("button");
    expect(retry.classList.contains("btn")).toBe(true);
    expect(retry.textContent.trim()).toBe("Spróbuj ponownie");
    expect(reload).not.toHaveBeenCalled();

    retry.click();

    expect(reload).toHaveBeenCalledOnce();
    // The URL is left as it is; only the reload retries the request.
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe("/tour.html?id=nyc&utm_source=newsletter#galeria");
    expect(toursLink().localName).toBe("a");
    expect(toursLink().classList.contains("btn")).toBe(true);
  });

  it("announces only the state message, politely, and never the tour content", async () => {
    const status = field("status");

    expect(status.getAttribute("role")).toBe("status");
    expect(document.querySelector('[aria-live="assertive"], [role="alert"]')).toBeNull();
    expect(Array.from(document.querySelectorAll('[role="status"], [aria-live]'))).toEqual([status]);
    expect(isShown(statePanel())).toBe(false);

    await renderTour("/tour.html?id=maroko");

    expect(status.children).toHaveLength(0);
    expect(status.textContent).toBe("");
    expect(field("container").closest('[role="status"], [aria-live]')).toBeNull();
    expect(field("state-actions").closest('[role="status"], [aria-live]')).toBeNull();
  });

  it("strips disallowed elements and attributes from the catalogue markup", async () => {
    const tour = {
      ...structuredClone(tours[0]),
      shortSummary:
        '<p class="lead" style="color:red" onclick="alert(1)">Tekst <strong data-note="x">pogrubiony</strong> i <em>kursywa</em><br>dalej</p>' +
        '<ul class="tour-summary-list" id="list" onmouseover="alert(2)"><li>Punkt</li></ul>',
      longDescription:
        '<h3 id="plan">Plan</h3><ol class="tour-itinerary" data-step="1"><li>Dzień 1</li></ol>' +
        '<script>alert(3)</script><img src="x" onerror="alert(4)"><a href="javascript:alert(5)">Link</a><iframe src="https://example.com"></iframe>',
    };

    await renderTour(`/tour.html?id=${tour.id}`, [tour]);

    expect(field("summary").innerHTML).toBe('<p>Tekst <strong>pogrubiony</strong> i <em>kursywa</em><br>dalej</p><ul class="tour-summary-list"><li>Punkt</li></ul>');
    // Disallowed elements are replaced by their text content.
    expect(field("content").innerHTML).toBe('<h3>Plan</h3><ol class="tour-itinerary"><li>Dzień 1</li></ol>alert(3)Link');
    expect(field("content").querySelector("script, img, a, iframe")).toBeNull();
  });

  it("renders image alt texts and captions with HTML-special characters as literal values", async () => {
    const alt = `Taras "Riad" <img src=x onerror="alert(1)"> & 'Atlas' >`;
    const caption = `Kolacja "pod gwiazdami" </picture><button aria-label='x'>& więcej</button> >`;
    const [first] = tours[0].images;
    const tour = { ...structuredClone(tours[0]), images: [{ ...first, alt, caption }] };
    const path = `assets/img/tours/${first.base}`;

    await renderTour(`/tour.html?id=${tour.id}`, [tour]);

    const mainImage = field("main-image");
    const thumbnails = Array.from(field("gallery").children);
    expect(Array.from(mainImage.children, structureOf)).toEqual([pictureStructure]);
    expect(thumbnails.map(structureOf)).toEqual([
      { tag: "button", attributes: ["aria-label", "class", "data-lightbox-trigger", "type"], children: [pictureStructure] },
    ]);
    expect(thumbnails[0].getAttribute("aria-label")).toBe(`Otwórz zdjęcie: ${alt}`);

    [mainImage, thumbnails[0]].forEach((context) => {
      const img = context.querySelector("img");

      expect(context.textContent.trim()).toBe("");
      expect(img.alt).toBe(alt);
      expect(img.dataset.caption).toBe(caption);
      expect(img.getAttribute("src")).toBe(`${path}-1200x780.jpg`);
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.dataset.lightboxSrc).toBe(`${path}-1600x1040.jpg`);
    });
  });
});
