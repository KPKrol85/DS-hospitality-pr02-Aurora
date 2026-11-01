// The publication contract that build:stage (build-dist.js) applies and check:css-assets
// (check-css-assets.js) verifies. tests/csp.test.js stages its dist/ fixtures with pageAssetReferences.

// The maintained root pages, in the order build:stage publishes them. The root *.html files must
// match this list exactly: build:stage fails on a missing page and on an undeclared one, so a new
// page is published only after it is added here.
const maintainedPages = [
  "404.html",
  "about.html",
  "contact.html",
  "cookies.html",
  "dziekuje.html",
  "gallery.html",
  "index.html",
  "offline.html",
  "polityka-prywatnosci.html",
  "regulamin.html",
  "tour.html",
  "tours.html",
];

// The maintained pages load the canonical sources. build:stage replaces each source tag, which
// every page must contain exactly once, with its production tag in the dist/ copy; on
// rootRelativePages both tags use root-relative URLs (pageAssetReferences).
const assetReferences = [
  {
    source: { file: "css/style.css", tag: '<link rel="stylesheet" href="css/style.css" />' },
    production: { file: "css/style.min.css", tag: '<link rel="stylesheet" href="css/style.min.css" />' },
  },
  {
    source: { file: "js/script.js", tag: '<script type="module" src="js/script.js"></script>' },
    production: { file: "js/script.min.js", tag: '<script src="js/script.min.js"></script>' },
  },
];

// The host also serves 404.html for every unknown URL, at any path depth, where document-relative
// URLs would resolve below the requested path. Its asset and link URLs therefore start at the site
// root, and so do its entry tags. The other pages are served only at their own root-level paths.
const rootRelativePages = ["404.html"];

// The entry tag pairs of one page: assetReferences, with root-relative URLs on rootRelativePages.
function pageAssetReferences(page) {
  if (!rootRelativePages.includes(page)) return assetReferences;

  const toRootRelative = ({ file, tag }) => ({ file, tag: tag.replace(`"${file}"`, `"/${file}"`) });
  return assetReferences.map(({ source, production }) => ({
    source: toRootRelative(source),
    production: toRootRelative(production),
  }));
}

module.exports = { maintainedPages, assetReferences, rootRelativePages, pageAssetReferences };
