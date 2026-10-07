import { createCataloguePicture } from "./catalogue-picture.js";
import { getLightboxTriggerLabel } from "./lightbox.js";

// Rendered widths inside the .tour-detail article (css/modules/subpages.css): the .container is
// about 92vw wide up to 1200px, and the article's padding takes 48px of it.
// Main image: the first of the 1.2fr / 1.4fr hero columns from 900px (at most 517px), full width below.
const TOUR_MAIN_IMAGE_SIZES = "(min-width: 1280px) 520px, (min-width: 900px) 43vw, calc(92vw - 48px)";
// Thumbnails: three columns from 900px (at most 373px); below, auto-fit columns of at least 180px
// give three columns from about 700px, two from about 480px and one below.
const TOUR_THUMBNAIL_SIZES = "(min-width: 1280px) 375px, (min-width: 700px) 31vw, (min-width: 480px) 46vw, calc(92vw - 48px)";

const TOUR_STATE_MESSAGES = {
  loading: "Ładowanie szczegółów oferty…",
  unavailable: "Nie udało się wczytać szczegółów oferty. Sprawdź połączenie z internetem i spróbuj ponownie.",
};
// Replaces the static "Brak wybranej oferty" while the offer is loading or its data is unavailable.
const TOUR_PENDING_BREADCRUMB = "Szczegóły oferty";

// Without a usable id the static article stays as it is. With one, the page moves through
// loading to loaded, to the static not-found content for an id missing from a loaded catalogue,
// or to unavailable when the catalogue cannot be loaded or used. reload retries by reloading the
// current document; tests pass their own, as jsdom cannot reload.
export function initTourDetail({ reload = () => window.location.reload() } = {}) {
  const params = new URLSearchParams(window.location.search);
  const rawTourId = params.get("id");
  const tourId = rawTourId ? rawTourId.trim() : "";

  if (!tourId) {
    return;
  }

  const setState = createTourStateView(reload);
  setState("loading");

  return fetch("assets/data/tours.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((tours) => {
      if (!Array.isArray(tours)) {
        throw new TypeError("tours.json is not an array");
      }

      const tour = tours.find((t) => t?.id === tourId);
      if (!tour) {
        setState("not-found");
        return;
      }

      fillTourContent(tour);
      setState("loaded");
    })
    .catch((err) => {
      console.error("Błąd ładowania danych wycieczki", err);
      setState("unavailable");
    });
}

// Shows one of the states loading, loaded, not-found and unavailable. The article holds the
// loaded offer or the static not-found content; the state panel holds the other two, with its
// message in a polite status region and its actions outside it.
function createTourStateView(reload) {
  const article = document.querySelector("[data-tour-container]");
  const panel = document.querySelector("[data-tour-state]");
  const status = document.querySelector("[data-tour-status]");
  const actions = document.querySelector("[data-tour-state-actions]");
  const retryButton = document.querySelector("[data-tour-retry]");
  const breadcrumb = document.querySelector("[data-tour-breadcrumb-current]");
  const staticBreadcrumb = breadcrumb?.textContent;

  retryButton?.addEventListener("click", () => reload());

  return (state) => {
    const isPending = state === "loading" || state === "unavailable";

    if (article) article.hidden = isPending;
    if (panel) panel.hidden = !isPending;
    if (status) status.textContent = TOUR_STATE_MESSAGES[state] || "";
    if (actions) actions.hidden = state !== "unavailable";

    if (breadcrumb && state !== "loaded") {
      breadcrumb.textContent = isPending ? TOUR_PENDING_BREADCRUMB : staticBreadcrumb;
    }
  };
}

function fillTourContent(tour) {
  document.querySelector("[data-tour-title]").textContent = tour.name;
  document.querySelector("[data-tour-region]").textContent = tour.region;
  document.querySelector("[data-tour-breadcrumb-current]").textContent = tour.name;
  document.querySelector("[data-tour-days]").textContent = `${tour.days} dni`;
  document.querySelector("[data-tour-price]").textContent = tour.priceFrom;
  document.querySelector("[data-tour-summary]").innerHTML = sanitizeTourHtml(tour.shortSummary);
  document.querySelector("[data-tour-content]").innerHTML = sanitizeTourHtml(tour.longDescription);

  // The static href is a plain contact.html; only a matched catalogue offer selects itself in the
  // form's tour field (form.js prefillFromQuery).
  const enquiryLink = document.querySelector("[data-tour-enquiry]");
  if (enquiryLink) {
    enquiryLink.href = `contact.html?${new URLSearchParams({ tour: tour.id })}`;
  }

  const mainImage = tour.images[0];
  const mainImageContainer = document.querySelector("[data-tour-main-image]");
  if (mainImage && mainImageContainer) {
    mainImageContainer.replaceChildren(createPicture(mainImage, TOUR_MAIN_IMAGE_SIZES));
  }

  const galleryEl = document.querySelector("[data-tour-gallery]");
  if (galleryEl && tour.images.length > 0) {
    galleryEl.replaceChildren(...tour.images.map((img) => createGalleryItem(img)));
  }
}

function sanitizeTourHtml(html) {
  const allowedTags = new Set(["P", "STRONG", "OL", "UL", "LI", "H3", "EM", "BR"]);
  const allowedAttrsByTag = {
    UL: new Set(["class"]),
    OL: new Set(["class"]),
  };

  const template = document.createElement("template");
  template.innerHTML = html;

  const elements = Array.from(template.content.querySelectorAll("*"));
  elements.forEach((el) => {
    if (!allowedTags.has(el.tagName)) {
      el.replaceWith(document.createTextNode(el.textContent || ""));
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const allowedAttrs = allowedAttrsByTag[el.tagName];
      const isAllowedAttr = allowedAttrs ? allowedAttrs.has(attr.name) : false;
      if (!isAllowedAttr) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return template.innerHTML;
}

// Gallery thumbnails open the lightbox; the main image reuses createPicture without a button.
function createGalleryItem(image) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tour-gallery__button";
  button.dataset.lightboxTrigger = "";
  button.setAttribute("aria-label", getLightboxTriggerLabel(image.alt, image.caption));
  button.append(createPicture(image, TOUR_THUMBNAIL_SIZES));
  return button;
}

// sizes is the slot of the calling context. Without a lightboxSrc, the lightbox opens the image
// derived from the base.
function createPicture(image, sizes) {
  const picture = createCataloguePicture(image, { sizes });
  picture.className = "tour-gallery__item";
  return picture;
}
