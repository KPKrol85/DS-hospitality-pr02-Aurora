export function initTourDetail() {
  const params = new URLSearchParams(window.location.search);
  const rawTourId = params.get("id");
  const tourId = rawTourId ? rawTourId.trim() : "";

  if (!tourId) {
    return;
  }

  fetch("assets/data/tours.json")
    .then((res) => res.json())
    .then((tours) => {
      const tour = tours.find((t) => t.id === tourId);
      if (!tour) {
        return;
      }

      fillTourContent(tour);
    })
    .catch((err) => {
      console.error("Błąd ładowania danych wycieczki", err);
    });
}

function fillTourContent(tour) {
  document.querySelector("[data-tour-title]").textContent = tour.name;
  document.querySelector("[data-tour-region]").textContent = tour.region;
  document.querySelector("[data-tour-breadcrumb-current]").textContent = tour.name;
  document.querySelector("[data-tour-days]").textContent = `${tour.days} dni`;
  document.querySelector("[data-tour-price]").textContent = tour.priceFrom;
  document.querySelector("[data-tour-summary]").innerHTML = sanitizeTourHtml(tour.shortSummary);
  document.querySelector("[data-tour-content]").innerHTML = sanitizeTourHtml(tour.longDescription);

  const mainImage = tour.images[0];
  const mainImageContainer = document.querySelector("[data-tour-main-image]");
  if (mainImage && mainImageContainer) {
    mainImageContainer.innerHTML = createPictureMarkup(mainImage.base, mainImage.alt, mainImage.caption);
  }

  const galleryEl = document.querySelector("[data-tour-gallery]");
  if (galleryEl && tour.images.length > 0) {
    galleryEl.innerHTML = tour.images.map((img) => createPictureMarkup(img.base, img.alt, img.caption)).join("");
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

function createPictureMarkup(base, alt, caption = "") {
  const basePath = `assets/img/tours/${base}`;

  return `
    <picture class="tour-gallery__item">
      <source
        srcset="
          ${basePath}-400x260.avif 400w,
          ${basePath}-800x520.avif 800w,
          ${basePath}-1200x780.avif 1200w,
          ${basePath}-1600x1040.avif 1600w"
        type="image/avif"
      />
      <source
        srcset="
          ${basePath}-400x260.webp 400w,
          ${basePath}-800x520.webp 800w,
          ${basePath}-1200x780.webp 1200w,
          ${basePath}-1600x1040.webp 1600w"
        type="image/webp"
      />
      <img
        src="${basePath}-1200x780.jpg"
        srcset="
          ${basePath}-400x260.jpg 400w,
          ${basePath}-800x520.jpg 800w,
          ${basePath}-1200x780.jpg 1200w,
          ${basePath}-1600x1040.jpg 1600w"
        sizes="(min-width: 900px) 360px, 100vw"
        width="1200"
        height="780"
        alt="${alt}"
        loading="lazy"
        data-lightbox-src="${basePath}-1600x1040.jpg"
data-caption="${caption}"
        tabindex="0"
      />
    </picture>
  `;
}
