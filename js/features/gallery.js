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

  const picture = document.createElement("picture");
  picture.append(createSource(item.base, "avif"), createSource(item.base, "webp"), createImage(item));
  button.append(picture);

  const figcaption = document.createElement("figcaption");
  figcaption.textContent = item.caption || "";

  figure.append(button, figcaption);
  return figure;
}

function createSource(base, format) {
  const source = document.createElement("source");
  source.type = `image/${format}`;
  source.srcset = createSrcset(base, format);
  source.sizes = GALLERY_IMAGE_SIZES;
  return source;
}

function createImage(item) {
  const img = document.createElement("img");
  const basePath = `assets/img/tours/${item.base}`;

  img.src = `${basePath}-1200x780.jpg`;
  img.srcset = createSrcset(item.base, "jpg");
  img.sizes = GALLERY_IMAGE_SIZES;
  img.width = 1200;
  img.height = 780;
  img.alt = item.alt || "";
  img.loading = "lazy";
  img.dataset.lightboxSrc = item.lightbox || `${basePath}-1600x1040.jpg`;
  img.dataset.caption = item.caption || "";

  return img;
}

function createSrcset(base, format) {
  const basePath = `assets/img/tours/${base}`;

  return [`${basePath}-400x260.${format} 400w`, `${basePath}-800x520.${format} 800w`, `${basePath}-1200x780.${format} 1200w`, `${basePath}-1600x1040.${format} 1600w`].join(", ");
}
