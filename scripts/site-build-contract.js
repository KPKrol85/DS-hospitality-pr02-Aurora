// The publication contract that build:stage (build-dist.js) applies and check:css-assets
// (check-css-assets.js) verifies. tests/csp.test.js stages its dist/ fixtures with assetReferences.

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
// every page must contain exactly once, with its production tag in the dist/ copy.
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

module.exports = { maintainedPages, assetReferences };
