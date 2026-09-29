import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A <source> with width descriptors takes its slot from its own sizes attribute and uses 100vw
// without one, whatever the <img> declares. Every width-described candidate list of a picture
// therefore carries the same sizes value, derived from the layout that renders the picture.
// The pictures built in js/features/ are covered by gallery.test.js and tour-detail.test.js.
const projectRoot = resolve(import.meta.dirname, "..");
const pages = readdirSync(projectRoot)
  .filter((entry) => entry.endsWith(".html"))
  .sort();

// Slots of the static pages. The .container is about 92vw wide up to its 1200px maximum; the
// column rules are in css/modules/sections.css, components.css and subpages.css.
const pageSlots = [
  // .cards-grid: three columns from 1280px (at most 358px), two from 768px, one below.
  ["index.html", ".cards-grid picture", 3, "(min-width: 1280px) 360px, (min-width: 768px) 46vw, 92vw"],
  // .tour-card--detailed: a 460px media column from 1024px and a 360px one from 760px.
  ["tours.html", ".tour-list picture", 6, "(min-width: 1024px) 460px, (min-width: 760px) 360px, 92vw"],
  // .about-grid: the 1fr column of 1.6fr / 1fr from 760px (image at most 415px), full width below.
  ["about.html", ".about-highlight picture", 1, "(min-width: 1280px) 420px, (min-width: 760px) 33vw, 92vw"],
  // .contact-grid__inner: the 0.95fr column of 0.95fr / 1.2fr from 760px (image at most 472px),
  // full width below, less the article's 48px padding.
  ["contact.html", ".contact-media", 1, "(min-width: 1280px) 480px, (min-width: 760px) 38vw, calc(92vw - 48px)"],
];

function readPage(page) {
  return new DOMParser().parseFromString(readFileSync(join(projectRoot, page), "utf8"), "text/html");
}

function widthDescribed(picture) {
  return Array.from(picture.querySelectorAll(":scope > source, :scope > img")).filter((element) =>
    /\s\d+w\s*(,|$)/.test(element.getAttribute("srcset") || "")
  );
}

function label(element) {
  const firstCandidate = element.getAttribute("srcset").trim().split(/\s+/)[0];
  return `<${element.localName}${element.type ? ` type="${element.type}"` : ""}> ${firstCandidate}`;
}

describe("responsive image sizes", () => {
  it.each(pages)("%s declares one sizes value on every width-described candidate list of a picture", (page) => {
    readPage(page)
      .querySelectorAll("picture")
      .forEach((picture) => {
        const elements = widthDescribed(picture);
        // Placeholders filled by script, such as tour.html's main image, have no candidates yet.
        if (!elements.length) return;
        elements.forEach((element) => {
          expect(element.hasAttribute("sizes"), `${page}: ${label(element)} has no sizes`).toBe(true);
        });
        expect(new Set(elements.map((element) => element.getAttribute("sizes"))).size, `${page}: ${label(elements[0])} picture`).toBeLessThanOrEqual(1);
      });
  });

  it.each(pageSlots)("%s gives %s the slot of its layout", (page, selector, count, sizes) => {
    const pictures = Array.from(readPage(page).querySelectorAll(selector));

    expect(pictures).toHaveLength(count);
    pictures.forEach((picture) => {
      const elements = widthDescribed(picture);
      expect(elements.filter((element) => element.localName === "source").length).toBeGreaterThanOrEqual(2);
      elements.forEach((element) => {
        expect(element.getAttribute("sizes"), `${page}: ${label(element)}`).toBe(sizes);
      });
    });
  });
});
