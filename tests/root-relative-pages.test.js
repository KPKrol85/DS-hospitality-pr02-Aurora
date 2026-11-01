import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The host serves 404.html for every unknown URL, also below nested paths such as
// /oferty/malediwy/2026, where a document-relative URL would resolve below the requested path. The
// pages in rootRelativePages therefore name every local file and page from the site root.
const projectRoot = resolve(import.meta.dirname, "..");
const { rootRelativePages } = createRequire(import.meta.filename)("../scripts/site-build-contract.js");

function readPage(page) {
  return new DOMParser().parseFromString(readFileSync(join(projectRoot, page), "utf8"), "text/html");
}

// The href, src and srcset URLs of a page as written, without fragment-only links within the page
// and URLs with a scheme (https:, mailto:, tel:).
function localUrls(document) {
  const urls = [];
  for (const element of document.querySelectorAll("[href], [src], [srcset]")) {
    for (const attribute of ["href", "src", "srcset"]) {
      if (!element.hasAttribute(attribute)) continue;
      const value = element.getAttribute(attribute).trim();
      const values = attribute === "srcset" ? value.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]) : [value];
      for (const url of values) {
        urls.push({ element: element.localName, attribute, url });
      }
    }
  }
  return urls.filter(({ url }) => !url.startsWith("#") && !/^[a-z][a-z\d+.-]*:/i.test(url));
}

describe("root-relative pages", () => {
  it("include the 404 page", () => {
    expect(rootRelativePages).toContain("404.html");
  });

  it("name every local file and page from the site root", () => {
    for (const page of rootRelativePages) {
      const urls = localUrls(readPage(page));
      expect(urls.length, page).toBeGreaterThan(0);
      for (const { element, attribute, url } of urls) {
        expect(url, `${page} <${element} ${attribute}="${url}">`).toMatch(/^\/(?!\/)/);
      }
    }
  });

  // A <base> element would also resolve the skip link's fragment against another document.
  it("keep the skip link a fragment of the same page", () => {
    for (const page of rootRelativePages) {
      const document = readPage(page);
      expect(document.querySelector("a.skip-link")?.getAttribute("href"), page).toBe("#main-content");
      expect(document.getElementById("main-content"), page).not.toBeNull();
      expect(document.querySelector("base"), page).toBeNull();
    }
  });
});
