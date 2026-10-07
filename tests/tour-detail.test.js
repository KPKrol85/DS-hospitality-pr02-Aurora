import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTourDetail } from "../js/features/tour-detail.js";
import { flushPromises, mountFromPage, readJson, setUrl, srcsetCandidates, stubFetchError, stubFetchJson } from "./helpers.js";

const tours = readJson("assets/data/tours.json");

function field(name) {
  return document.querySelector(`[data-tour-${name}]`);
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

  it("keeps the placeholder content and reports a failed request", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const placeholder = document.querySelector("main").innerHTML;
    setUrl("/tour.html?id=maroko");
    stubFetchError();

    initTourDetail();
    await flushPromises();

    expect(document.querySelector("main").innerHTML).toBe(placeholder);
    expect(consoleError).toHaveBeenCalledWith("Błąd ładowania danych wycieczki", expect.any(TypeError));
    expect(field("enquiry").getAttribute("href")).toBe("contact.html");
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
