import { createCataloguePicture } from "./catalogue-picture.js";
import { getLightboxTriggerLabel } from "./lightbox.js";

const GALLERY_DATA_URL = "assets/data/gallery-data.json";
// Column widths of .gallery-grid (css/modules/subpages.css) in the .container, which is about 92vw
// wide up to its 1200px maximum: three columns from 1024px (at most (1200px - 2 gaps) / 3 = 389px),
// two from 560px, one below. Every <source> and the <img> share this value.
const GALLERY_IMAGE_SIZES = "(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 560px) 46vw, 92vw";

export async function initGallery() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;

  try {
    const response = await fetch(GALLERY_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const items = await response.json();
    if (!Array.isArray(items) || !items.length) {
      gallery.replaceChildren();
      return;
    }

    renderGallery(gallery, items);
  } catch (error) {
    console.error("Błąd ładowania galerii", error);
    gallery.replaceChildren();
  }
}

function renderGallery(gallery, items) {
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    fragment.appendChild(createGalleryFigure(item));
  });

  gallery.replaceChildren(fragment);
}

function createGalleryFigure(item) {
  const figure = document.createElement("figure");
  figure.className = "reveal";
  figure.dataset.country = item.country;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "gallery-item";
  button.dataset.lightboxTrigger = "";
  button.setAttribute("aria-label", getLightboxTriggerLabel(item.alt, item.caption));

  // A record may name its own lightbox image; without one the picture derives it from the base.
  const image = { base: item.base, alt: item.alt || "", caption: item.caption || "" };
  button.append(createCataloguePicture(image, { sizes: GALLERY_IMAGE_SIZES, lightboxSrc: item.lightbox }));

  const figcaption = document.createElement("figcaption");
  figcaption.textContent = item.caption || "";

  figure.append(button, figcaption);
  return figure;
}
