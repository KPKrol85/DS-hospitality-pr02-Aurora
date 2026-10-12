import { createCataloguePicture } from "./catalogue-picture.js";
import { getLightboxTriggerLabel } from "./lightbox.js";

const GALLERY_DATA_URL = "assets/data/gallery-data.json";
// Destinations of the gallery-data.json country keys: the chapter heading, the region line of the
// matching offer in tours.json and its tour.html id. The keys predate the tour ids, so the mapping is
// explicit. A country without an entry still gets a chapter, headed by its key, without region or link.
const GALLERY_DESTINATIONS = {
  islandia: { name: "Islandia", region: "Europa • Islandia", tourId: "islandia" },
  maledivy: { name: "Malediwy", region: "Azja • Malediwy", tourId: "malediwy" },
  maroko: { name: "Maroko", region: "Afryka • Maroko", tourId: "maroko" },
  "new-york": { name: "Nowy Jork", region: "Ameryka Północna • USA", tourId: "nowy-jork" },
  patagonia: { name: "Patagonia", region: "Ameryka Południowa • Argentyna / Chile", tourId: "patagonia" },
  tokio: { name: "Tokio", region: "Azja • Japonia", tourId: "tokio-kyoto" },
};

// Photograph slots of a .gallery-chapter (css/modules/subpages.css) in the .container, which is about
// 92vw wide up to its 1200px maximum, with 16px gaps. The lead spans the container below 1024px and
// four of six columns from 1024px (at most 795px), beside the chapter header. The supporting
// photographs pair up below 760px; from 760px they run in rows of three, and a closing row of two or
// one shares the full width. A photograph left without a partner below 760px spans the row.
const GALLERY_LEAD_SIZES = "(min-width: 1280px) 795px, (min-width: 1024px) calc(61.33vw - 5px), 92vw";
const GALLERY_ROW_SIZES = {
  3: "(min-width: 1280px) 390px, (min-width: 760px) calc(30.67vw - 11px)",
  2: "(min-width: 1280px) 592px, (min-width: 760px) calc(46vw - 8px)",
  1: "(min-width: 1280px) 1200px, (min-width: 760px) 92vw",
};

const GALLERY_STATE_MESSAGES = {
  loading: "Ładowanie galerii…",
  unavailable: "Nie udało się wczytać galerii. Sprawdź połączenie z internetem i odśwież stronę.",
};

// The gallery moves from loading to loaded, or to unavailable when the data cannot be loaded or
// holds no records. The filters stay hidden until figures exist for them to filter.
export async function initGallery() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;

  const setState = createGalleryStateView(gallery);
  setState("loading");

  try {
    const response = await fetch(GALLERY_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const items = await response.json();
    if (!Array.isArray(items) || !items.length) {
      throw new TypeError("gallery-data.json has no records");
    }

    renderGallery(gallery, items);
    setState("loaded");
  } catch (error) {
    console.error("Błąd ładowania galerii", error);
    gallery.replaceChildren();
    setState("unavailable");
  }
}

// The state message sits in a polite status region of its own, so rendering the chapters is
// not announced as one large change.
function createGalleryStateView(gallery) {
  const panel = document.querySelector("[data-gallery-state]");
  const status = document.querySelector("[data-gallery-status]");
  const filters = document.querySelector("[data-gallery-filters]");

  return (state) => {
    const isLoaded = state === "loaded";

    gallery.hidden = !isLoaded;
    if (panel) panel.hidden = isLoaded;
    if (status) status.textContent = GALLERY_STATE_MESSAGES[state] || "";
    if (filters) filters.hidden = !isLoaded;
  };
}

function renderGallery(gallery, items) {
  const fragment = document.createDocumentFragment();

  groupByCountry(items).forEach((chapterItems, country) => {
    fragment.appendChild(createGalleryChapter(country, chapterItems, fragment.childElementCount + 1));
  });

  gallery.replaceChildren(fragment);
}

// Chapters follow the first appearance of each country in the data, and photographs keep their data
// order within a chapter; the first one leads.
function groupByCountry(items) {
  const groups = new Map();

  items.forEach((item) => {
    const country = item.country;
    if (!groups.has(country)) groups.set(country, []);
    groups.get(country).push(item);
  });

  return groups;
}

// One chapter per destination: place label, h2 under the page h1 and a link to the matching offer,
// then the photographs. The filters show or hide the chapter as a whole through its data-country.
function createGalleryChapter(country, items, number) {
  const destination = Object.hasOwn(GALLERY_DESTINATIONS, country) ? GALLERY_DESTINATIONS[country] : null;
  const name = destination ? destination.name : String(country ?? "");
  const headingId = `gallery-chapter-${number}`;

  const chapter = document.createElement("section");
  chapter.className = "gallery-chapter";
  chapter.dataset.country = country;
  chapter.setAttribute("aria-labelledby", headingId);

  const header = document.createElement("header");
  header.className = "gallery-chapter__header";

  if (destination) {
    const region = document.createElement("p");
    region.className = "gallery-chapter__region type-place-label";
    region.textContent = destination.region;
    header.append(region);
  }

  const heading = document.createElement("h2");
  heading.className = "gallery-chapter__title type-section-title";
  heading.id = headingId;
  heading.textContent = name;
  header.append(heading);

  if (destination) {
    const link = document.createElement("a");
    link.className = "gallery-chapter__link btn btn--text";
    link.href = `tour.html?id=${destination.tourId}`;
    const context = document.createElement("span");
    context.className = "visually-hidden";
    context.textContent = `: ${name}`;
    link.append("Zobacz ofertę wyjazdu", context);
    header.append(link);
  }

  chapter.append(header, ...items.map((item, index) => createGalleryFigure(item, index === 0, getPhotoSizes(index, items.length))));
  return chapter;
}

// Mirrors the chapter grid in css/modules/subpages.css for the photograph at index of count.
function getPhotoSizes(index, count) {
  if (index === 0) return GALLERY_LEAD_SIZES;

  const isUnpaired = index % 2 === 1 && index === count - 1;
  const rowStart = index - ((index - 1) % 3);
  const rowLength = Math.min(3, count - rowStart);
  return `${GALLERY_ROW_SIZES[rowLength]}, ${isUnpaired ? "92vw" : "calc(46vw - 8px)"}`;
}

function createGalleryFigure(item, isLead, sizes) {
  const figure = document.createElement("figure");
  figure.className = isLead ? "gallery-photo gallery-photo--lead reveal" : "gallery-photo reveal";
  figure.dataset.country = item.country;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "gallery-item";
  button.dataset.lightboxTrigger = "";
  button.setAttribute("aria-label", getLightboxTriggerLabel(item.alt, item.caption));

  // A record may name its own lightbox image; without one the picture derives it from the base.
  const image = { base: item.base, alt: item.alt || "", caption: item.caption || "" };
  button.append(createCataloguePicture(image, { sizes, lightboxSrc: item.lightbox }));

  const figcaption = document.createElement("figcaption");
  figcaption.className = "type-small";
  figcaption.textContent = item.caption || "";

  figure.append(button, figcaption);
  return figure;
}
