import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initGallery } from "../js/features/gallery.js";
import { initTourDetail } from "../js/features/tour-detail.js";
import { flushPromises, mountFromPage, setUrl, stubFetchJson } from "./helpers.js";

// Runs scripts/check-asset-integrity.js against a small site written to a temporary
// directory, so no test reads or changes the real assets or dist/.
const checker = resolve(import.meta.dirname, "../scripts/check-asset-integrity.js");

const galleryRecords = [
  // An explicit lightbox path equal to the derived one, one without a lightbox path, and one
  // pointing outside the responsive variants.
  { country: "north", base: "north/north-01", alt: "North 1", caption: "North 1", lightbox: "assets/img/tours/north/north-01-1600x1040.jpg" },
  { country: "north", base: "north/north-02", alt: "North 2", caption: "North 2" },
  { country: "south", base: "south/south-01", alt: "South 1", caption: "South 1", lightbox: "assets/img/gallery/south-01-large.jpg" },
];

const tourRecords = [
  {
    id: "north-trip",
    name: "North",
    region: "North",
    days: 5,
    priceFrom: "od 1 000 PLN / os.",
    shortSummary: "<p>North</p>",
    longDescription: "<p>North</p>",
    images: [
      { base: "north/north-01", alt: "North 1", caption: "North 1" },
      { base: "north/north-03", alt: "North 3", caption: "North 3" },
    ],
  },
  {
    id: "south-trip",
    name: "South",
    region: "South",
    days: 7,
    priceFrom: "od 2 000 PLN / os.",
    shortSummary: "<p>South</p>",
    longDescription: "<p>South</p>",
    images: [{ base: "south/south-02", alt: "South 2", caption: "South 2" }],
  },
];

const sourceStylesheets = {
  "css/style.css": '@import "./modules/fonts.css";\n@import url("./modules/subpages.css");\n',
  "css/modules/fonts.css": '@font-face {\n  font-family: "Sans";\n  src: url("../../assets/fonts/Sans-VariableFont.woff2") format("woff2");\n}\n',
  "css/modules/subpages.css": [
    ".page-hero::before {",
    "  background-image: url(../../assets/img/about/map.svg);",
    "}",
    "/* .old { background-image: url(../../assets/img/about/old.svg); } */",
    '.select { background-image: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E"); }',
    ".clip { clip-path: url(#clip); }",
    ".remote { background-image: url('https://cdn.example.com/remote.png'); }",
    '.note::after { content: "url(../../assets/img/about/quoted.svg)"; }',
    "",
  ].join("\n"),
};

// The production stylesheet keeps the module-relative ../../assets/ URLs, which the
// browser resolves from /css/style.min.css to /assets/.
const productionStylesheet =
  '@font-face{font-family:Sans;src:url(../../assets/fonts/Sans-VariableFont.woff2) format("woff2")}' +
  ".page-hero:before{background-image:url(../../assets/img/about/map.svg)}" +
  '.select{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E")}';

function page(stylesheet) {
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    `<link rel="stylesheet" href="${stylesheet}" />`,
    '<link rel="manifest" href="site.webmanifest" />',
    "</head>",
    "<body>",
    '<img src="assets/img/hero/hero.jpg" alt="" />',
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

// Every image URL in the rendered markup, from the attributes the browser and the lightbox read.
function imageUrls(...containers) {
  const urls = new Set();

  for (const element of containers.flatMap((container) => Array.from(container.querySelectorAll("source, img")))) {
    for (const candidate of (element.getAttribute("srcset") || "").split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) urls.add(url);
    }
    for (const attribute of ["src", "data-lightbox-src"]) {
      const url = element.getAttribute(attribute);
      if (url) urls.add(url);
    }
  }

  return urls;
}

async function renderGalleryUrls(records) {
  mountFromPage("gallery.html", "[data-gallery]");
  stubFetchJson(records);
  await initGallery();

  const urls = imageUrls(document.querySelector("[data-gallery]"));
  document.body.replaceChildren();
  return urls;
}

async function renderTourUrls(tours) {
  mountFromPage("tour.html", "main");
  const urls = new Set();

  for (const tour of tours) {
    setUrl(`/tour.html?id=${tour.id}`);
    stubFetchJson(tours);
    initTourDetail();
    await flushPromises();
    imageUrls(document.querySelector("[data-tour-main-image]"), document.querySelector("[data-tour-gallery]")).forEach((url) => urls.add(url));
  }

  document.body.replaceChildren();
  return urls;
}

// Image files the fixture needs, taken from what the runtime modules render for its data.
let galleryUrls;
let tourUrls;

beforeAll(async () => {
  galleryUrls = await renderGalleryUrls(galleryRecords);
  tourUrls = await renderTourUrls(tourRecords);
  vi.unstubAllGlobals();
  setUrl("/");
});

let siteRoot;

function writeFiles(root, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(root, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
}

function assetFiles() {
  const files = {
    "assets/data/gallery-data.json": JSON.stringify(galleryRecords, null, 2),
    "assets/data/tours.json": JSON.stringify(tourRecords, null, 2),
    "assets/fonts/Sans-VariableFont.woff2": "",
    "assets/img/about/map.svg": "<svg></svg>",
    "assets/img/hero/hero.jpg": "",
    "assets/img/icons/icon-192.png": "",
  };
  for (const url of [...galleryUrls, ...tourUrls]) {
    files[url] = "";
  }
  return files;
}

// A source tree and the dist/ package built from it, both complete.
function createSite() {
  const root = mkdtempSync(join(tmpdir(), "aurora-asset-integrity-"));
  const manifest = JSON.stringify({ icons: [{ src: "assets/img/icons/icon-192.png", sizes: "192x192" }] });

  writeFiles(root, { ...assetFiles(), ...sourceStylesheets, "index.html": page("css/style.css"), "site.webmanifest": manifest });
  cpSync(join(root, "assets"), join(root, "dist/assets"), { recursive: true });
  writeFiles(root, { "dist/index.html": page("css/style.min.css"), "dist/css/style.min.css": productionStylesheet, "dist/site.webmanifest": manifest });

  return root;
}

function remove(relativePath) {
  rmSync(join(siteRoot, relativePath), { recursive: true });
}

function write(relativePath, content) {
  writeFiles(siteRoot, { [relativePath]: content });
}

function runChecker(...args) {
  const result = spawnSync(process.execPath, [checker, ...args], { cwd: siteRoot, encoding: "utf8" });
  // Diagnostics use platform separators; the assertions use forward slashes.
  const normalize = (output) => output.replaceAll("\\", "/");
  const stdout = normalize(result.stdout);
  const stderr = normalize(result.stderr);
  const broken = stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- BROKEN: "))
    .map((line) => line.slice("- BROKEN: ".length));

  return { status: result.status, stdout, stderr, broken };
}

// The files reported missing by the diagnostics of one data file.
function missingFiles(broken, dataFile) {
  return broken.filter((line) => line.startsWith(dataFile)).map((line) => line.match(/\(missing file: (.+)\)$/)[1]);
}

beforeEach(() => {
  siteRoot = createSite();
});

afterEach(() => {
  rmSync(siteRoot, { recursive: true, force: true });
});

describe("check-asset-integrity.js", () => {
  it("passes when every referenced file exists in the sources and in dist/", () => {
    const source = runChecker();
    expect(source.status).toBe(0);
    expect(source.stdout).toContain("Asset integrity check passed (1 HTML files, 3 stylesheets, 3 gallery images and 3 tour images scanned in the project root).");

    const production = runChecker("--dist");
    expect(production.status).toBe(0);
    expect(production.stdout).toContain("Asset integrity check passed (1 HTML files, 1 stylesheet, 3 gallery images and 3 tour images scanned in dist/).");
  });

  it("requires exactly the image files that gallery.js and tour-detail.js render, each once per image", () => {
    for (const url of new Set([...galleryUrls, ...tourUrls])) {
      remove(url);
    }

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    const galleryMissing = missingFiles(broken, "assets/data/gallery-data.json");
    const tourMissing = missingFiles(broken, "assets/data/tours.json");
    expect(new Set(galleryMissing)).toEqual(galleryUrls);
    expect(galleryMissing).toHaveLength(galleryUrls.size);
    expect(new Set(tourMissing)).toEqual(tourUrls);
    expect(tourMissing).toHaveLength(tourUrls.size);
  });

  it("reports a missing gallery image variant with its record and attribute", () => {
    remove("assets/img/tours/north/north-02-800x520.webp");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual([
      'assets/data/gallery-data.json[1] (base "north/north-02") -> gallery.html <source type="image/webp" srcset> "assets/img/tours/north/north-02-800x520.webp" (missing file: assets/img/tours/north/north-02-800x520.webp)',
    ]);
  });

  it("reports a missing lightbox image once, whether it is explicit or derived", () => {
    remove("assets/img/gallery/south-01-large.jpg");
    remove("assets/img/tours/north/north-02-1600x1040.jpg");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual([
      'assets/data/gallery-data.json[1] (base "north/north-02") -> gallery.html <img srcset>, <img data-lightbox-src> "assets/img/tours/north/north-02-1600x1040.jpg" (missing file: assets/img/tours/north/north-02-1600x1040.jpg)',
      'assets/data/gallery-data.json[2] (base "south/south-01") -> gallery.html <img data-lightbox-src> "assets/img/gallery/south-01-large.jpg" (missing file: assets/img/gallery/south-01-large.jpg)',
    ]);
  });

  it("reports missing tour detail images in every tour with the tour ID and image index", () => {
    remove("assets/img/tours/north/north-03-400x260.avif");
    remove("assets/img/tours/south/south-02-1200x780.jpg");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual([
      'assets/data/tours.json[0] (id "north-trip") images[1] (base "north/north-03") -> tour.html <source type="image/avif" srcset> "assets/img/tours/north/north-03-400x260.avif" (missing file: assets/img/tours/north/north-03-400x260.avif)',
      'assets/data/tours.json[1] (id "south-trip") images[0] (base "south/south-02") -> tour.html <img srcset>, <img src> "assets/img/tours/south/south-02-1200x780.jpg" (missing file: assets/img/tours/south/south-02-1200x780.jpg)',
    ]);
  });

  it("reports a missing font referenced from an imported stylesheet", () => {
    remove("assets/fonts/Sans-VariableFont.woff2");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual([
      'css/modules/fonts.css:3 -> url("../../assets/fonts/Sans-VariableFont.woff2") (missing file: assets/fonts/Sans-VariableFont.woff2)',
    ]);
  });

  it("reports a missing CSS image and ignores data, fragment, external, string and commented-out URLs", () => {
    remove("assets/img/about/map.svg");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual(["css/modules/subpages.css:2 -> url(../../assets/img/about/map.svg) (missing file: assets/img/about/map.svg)"]);
  });

  it("reports a missing imported stylesheet", () => {
    remove("css/modules/subpages.css");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual(['css/style.css:2 -> @import url("./modules/subpages.css") (missing file: css/modules/subpages.css)']);
  });

  it("reports files missing from dist/ even when their source copies exist", () => {
    remove("dist/assets/fonts/Sans-VariableFont.woff2");
    remove("dist/assets/img/tours/south/south-02-400x260.webp");

    expect(runChecker().status).toBe(0);
    const { status, broken } = runChecker("--dist");

    expect(status).toBe(1);
    expect(broken).toEqual([
      "dist/css/style.min.css:1 -> url(../../assets/fonts/Sans-VariableFont.woff2) (missing file: dist/assets/fonts/Sans-VariableFont.woff2)",
      'dist/assets/data/tours.json[1] (id "south-trip") images[0] (base "south/south-02") -> tour.html <source type="image/webp" srcset> "assets/img/tours/south/south-02-400x260.webp" (missing file: dist/assets/img/tours/south/south-02-400x260.webp)',
    ]);
  });

  it("checks dist/ against its own copy of the data", () => {
    write("dist/assets/data/gallery-data.json", JSON.stringify([...galleryRecords, { country: "east", base: "east/east-01" }]));

    expect(runChecker().status).toBe(0);
    const { status, broken } = runChecker("--dist");

    expect(status).toBe(1);
    // Twelve variants; the src and the derived lightbox image are among them.
    expect(missingFiles(broken, "dist/assets/data/gallery-data.json[3]")).toHaveLength(12);
  });

  it("reports malformed, unreadable and missing data files", () => {
    write("assets/data/gallery-data.json", '[{ "base": "north/north-01", }]');
    remove("assets/data/tours.json");
    mkdirSync(join(siteRoot, "assets/data/tours.json"));
    remove("dist/assets/data/tours.json");

    const source = runChecker();
    expect(source.status).toBe(1);
    expect(source.broken).toHaveLength(2);
    expect(source.broken[0]).toMatch(/^assets\/data\/gallery-data\.json -> invalid JSON \(.+\)$/);
    expect(source.broken[1]).toMatch(/^assets\/data\/tours\.json -> cannot be read \(.*EISDIR.*\)$/);

    const production = runChecker("--dist");
    expect(production.status).toBe(1);
    expect(production.broken).toEqual(["dist/assets/data/tours.json -> missing data file (fetched by js/features/tour-detail.js on tour.html)"]);
  });

  it("reports records whose image paths cannot be built", () => {
    write(
      "assets/data/gallery-data.json",
      JSON.stringify([null, { country: "north" }, { base: "../north/north-01" }, { base: "north/north 01" }, { ...galleryRecords[0], lightbox: 5 }])
    );
    write("assets/data/tours.json", JSON.stringify([{ id: "no-images" }, { id: "bad-image", images: ["north/north-01", { base: "/north/north-01" }] }, { base: "north" }, "tour"]));

    const { status, stderr, broken } = runChecker();

    expect(status).toBe(1);
    expect(stderr).not.toMatch(/\n\s+at /);
    const expectedBase = '(expected a relative path below assets/img/tours/, such as "<folder>/<name>")';
    expect(broken).toEqual([
      "assets/data/gallery-data.json[0] -> expected a gallery record object, found null",
      `assets/data/gallery-data.json[1] -> unusable image base (missing) ${expectedBase}`,
      `assets/data/gallery-data.json[2] -> unusable image base "../north/north-01" ${expectedBase}`,
      `assets/data/gallery-data.json[3] -> unusable image base "north/north 01" ${expectedBase}`,
      'assets/data/gallery-data.json[4] (base "north/north-01") -> unusable lightbox 5 (expected a path string)',
      'assets/data/tours.json[0] (id "no-images") -> expected an images array, found nothing',
      'assets/data/tours.json[1] (id "bad-image") images[0] -> expected an image object, found string "north/north-01"',
      `assets/data/tours.json[1] (id "bad-image") images[1] -> unusable image base "/north/north-01" ${expectedBase}`,
      "assets/data/tours.json[2] -> expected an images array, found nothing",
      'assets/data/tours.json[3] -> expected a tour object, found string "tour"',
    ]);
  });

  it("still reports broken page references and manifest entries", () => {
    remove("assets/img/hero/hero.jpg");
    remove("assets/img/icons/icon-192.png");

    const { status, broken } = runChecker();

    expect(status).toBe(1);
    expect(broken).toEqual([
      'index.html:8 -> <img src="assets/img/hero/hero.jpg"> (missing file: assets/img/hero/hero.jpg)',
      'site.webmanifest -> icons[0].src="assets/img/icons/icon-192.png" (missing file: assets/img/icons/icon-192.png)',
    ]);
  });
});
