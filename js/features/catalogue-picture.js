// Responsive <picture> of a catalogue image, shared by gallery.js and tour-detail.js. The image
// base names a file set that npm run build:images produces in assets/img/tours/ for the `tours`
// profile: every variant below as AVIF, WebP and JPG. scripts/check-asset-integrity.js mirrors
// this contract independently to verify the files.
const CATALOGUE_IMAGE_DIRECTORY = "assets/img/tours/";
const CATALOGUE_IMAGE_VARIANTS = ["400x260", "800x520", "1200x780", "1600x1040"];

// The picture is built through the DOM, so alt texts, captions and image bases from the catalogue
// data become literal attribute values and are never parsed as markup. sizes describes the slot
// of the calling view and applies to every source and the img. The lightbox opens the 1600x1040
// JPG unless the caller passes its own lightboxSrc. Wrappers and classes belong to the caller.
export function createCataloguePicture({ base, alt, caption = "" }, { sizes, lightboxSrc }) {
  const basePath = `${CATALOGUE_IMAGE_DIRECTORY}${base}`;

  const picture = document.createElement("picture");
  picture.append(createSource(basePath, "avif", sizes), createSource(basePath, "webp", sizes), createImage(basePath, alt, caption, sizes, lightboxSrc));
  return picture;
}

function createSource(basePath, format, sizes) {
  const source = document.createElement("source");
  source.type = `image/${format}`;
  source.srcset = createSrcset(basePath, format);
  source.sizes = sizes;
  return source;
}

function createImage(basePath, alt, caption, sizes, lightboxSrc) {
  const img = document.createElement("img");
  img.src = `${basePath}-1200x780.jpg`;
  img.srcset = createSrcset(basePath, "jpg");
  img.sizes = sizes;
  img.width = 1200;
  img.height = 780;
  img.alt = alt;
  // Browsers reflect the attribute and the property to each other. Both are set so that DOM
  // implementations without the loading property, such as jsdom, expose the same value.
  img.setAttribute("loading", "lazy");
  img.loading = "lazy";
  img.dataset.lightboxSrc = lightboxSrc || `${basePath}-1600x1040.jpg`;
  img.dataset.caption = caption;
  return img;
}

function createSrcset(basePath, format) {
  return CATALOGUE_IMAGE_VARIANTS.map((variant) => `${basePath}-${variant}.${format} ${variant.split("x")[0]}w`).join(", ");
}
