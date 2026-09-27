import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The pages preload the self-hosted variable fonts between the theme bootstrap and the stylesheet,
// so the fonts are requested while the stylesheet downloads, and with the URLs of the @font-face
// rules, so the stylesheet's font requests reuse the preloaded files.
// - Manrope (15 KB: the logo text and the h1 of every initial view) is preloaded on every page.
// - Inter (85 KB: the body text) is preloaded only on index.html, where the stylesheet already
//   shares the connection with the hero image. On the other pages the preload delayed the
//   stylesheet and the first paint on a throttled connection, so they deliberately omit it.
const projectRoot = resolve(import.meta.dirname, "..");
const pages = readdirSync(projectRoot)
  .filter((entry) => entry.endsWith(".html"))
  .sort();

const inter = "assets/fonts/Inter-VariableFont.woff2";
const manrope = "assets/fonts/Manrope-VariableFont.woff2";
const interPreloadPages = new Set(["index.html"]);

function expectedPreloads(page) {
  return interPreloadPages.has(page) ? [inter, manrope] : [manrope];
}

// Resolves a reference the way the browser does for a file at the given site path.
function sitePath(reference, from) {
  return new URL(reference, new URL(from, "https://aurora.test/")).pathname;
}

function readPage(page, root = projectRoot) {
  return new DOMParser().parseFromString(readFileSync(join(root, page), "utf8"), "text/html");
}

// rel keywords are case-insensitive, so REL="Preload" counts as well.
function preloadsOf(document) {
  return Array.from(document.querySelectorAll("link[rel]")).filter((link) =>
    link.getAttribute("rel").toLowerCase().split(/\s+/).includes("preload")
  );
}

// The theme bootstrap and the head elements up to the first stylesheet.
function bootstrapToStylesheet(document) {
  const bootstrap = Array.from(document.head.querySelectorAll("script:not([src])")).find(
    (script) => script.type.toLowerCase() !== "application/ld+json"
  );
  if (!bootstrap) return ["no theme bootstrap"];

  const elements = Array.from(document.head.children);
  const start = elements.indexOf(bootstrap);
  const end = elements.findIndex((element, index) => index > start && element.matches('link[rel~="stylesheet"]'));
  return elements
    .slice(start, end === -1 ? undefined : end + 1)
    .map((element) =>
      element === bootstrap ? "theme bootstrap" : `<${element.localName} rel="${element.getAttribute("rel")}" href="${element.getAttribute("href")}">`
    );
}

function expectedHead(page, stylesheet) {
  return [
    "theme bootstrap",
    ...expectedPreloads(page).map((href) => `<link rel="preload" href="${href}">`),
    `<link rel="stylesheet" href="${stylesheet}">`,
  ];
}

describe("font preload hints", () => {
  it("name the files of the @font-face rules in css/modules/fonts.css", () => {
    const fontCss = readFileSync(join(projectRoot, "css/modules/fonts.css"), "utf8");
    const fontFaceUrls = Array.from(fontCss.matchAll(/url\("([^"]+)"\)/g), ([, url]) => url);
    // The development stylesheet imports fonts.css, and postcss-import inlines its URLs unchanged
    // into css/style.min.css; from both locations they name the files that the pages preload.
    for (const stylesheet of ["css/modules/fonts.css", "css/style.min.css"]) {
      expect(fontFaceUrls.map((url) => sitePath(url, stylesheet)).sort(), stylesheet).toEqual([`/${inter}`, `/${manrope}`]);
    }
    for (const href of [inter, manrope]) {
      expect(existsSync(join(projectRoot, href)), href).toBe(true);
    }
  });

  it("preload Manrope on every maintained page and Inter only on index.html, each once", () => {
    expect(pages.filter((page) => interPreloadPages.has(page))).toEqual([...interPreloadPages]);

    for (const page of pages) {
      const hrefs = preloadsOf(readPage(page)).map((link) => link.getAttribute("href"));
      expect(hrefs, page).toEqual(expectedPreloads(page));
      expect(hrefs.map((href) => sitePath(href, page)), page).toEqual(expectedPreloads(page).map((href) => `/${href}`));
    }
  });

  it("request each font like the stylesheet does: as a font/woff2 font in CORS mode without credentials", () => {
    for (const page of pages) {
      for (const link of preloadsOf(readPage(page))) {
        const label = `${page} ${link.getAttribute("href")}`;
        expect(link.getAttribute("rel"), label).toBe("preload");
        expect(link.getAttribute("as"), label).toBe("font");
        expect(link.getAttribute("type"), label).toBe("font/woff2");
        // Font requests always use CORS, also on the same origin. A preload without crossorigin, or
        // with use-credentials, does not match them, and the font is downloaded twice.
        expect(link.hasAttribute("crossorigin"), label).toBe(true);
        expect(["", "anonymous"], label).toContain(link.getAttribute("crossorigin").toLowerCase());
      }
    }
  });

  it("follow the theme bootstrap in the head and precede the stylesheet", () => {
    for (const page of pages) {
      expect(bootstrapToStylesheet(readPage(page)), page).toEqual(expectedHead(page, "css/style.css"));
    }
  });

  describe("in the dist/ package", () => {
    let siteRoot;

    // Stages the maintained pages with the real build:stage script in a temporary directory, so the
    // tests neither need nor change the project's dist/.
    beforeAll(() => {
      siteRoot = mkdtempSync(join(tmpdir(), "aurora-font-preload-"));
      for (const entry of readdirSync(projectRoot)) {
        if (!entry.startsWith(".") && statSync(join(projectRoot, entry)).isFile()) {
          copyFileSync(join(projectRoot, entry), join(siteRoot, entry));
        }
      }
      cpSync(join(projectRoot, "assets/fonts"), join(siteRoot, "assets/fonts"), { recursive: true });

      const result = spawnSync(process.execPath, [join(projectRoot, "scripts/build-dist.js")], { cwd: siteRoot, encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
    });

    afterAll(() => {
      rmSync(siteRoot, { recursive: true, force: true });
    });

    it("keep each page's preloads unchanged and in place before the production stylesheet", () => {
      for (const page of pages) {
        const source = preloadsOf(readPage(page)).map((link) => link.outerHTML);
        const production = readPage(page, join(siteRoot, "dist"));

        expect(preloadsOf(production).map((link) => link.outerHTML), page).toEqual(source);
        expect(bootstrapToStylesheet(production), page).toEqual(expectedHead(page, "css/style.min.css"));
      }
    });

    it("resolve every preload to a font file in dist/assets/fonts/", () => {
      for (const page of pages) {
        for (const link of preloadsOf(readPage(page, join(siteRoot, "dist")))) {
          const path = sitePath(link.getAttribute("href"), page);
          expect(path, `dist/${page}`).toMatch(/^\/assets\/fonts\/[^/]+\.woff2$/);
          expect(existsSync(join(siteRoot, "dist", path)), `dist/${page} ${path}`).toBe(true);
        }
      }
    });
  });
});
