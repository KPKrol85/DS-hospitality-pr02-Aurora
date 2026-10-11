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
  // .hero__grid: the 1.3fr column of 1fr / 1.3fr from 1280px (image at most 651px), 1.15fr of
  // 1fr / 1.15fr from 1024px, full width below.
  ["index.html", ".hero__media", 1, "(min-width: 1280px) 660px, (min-width: 1024px) 49vw, 92vw"],
  // Home: container C = min(1200px, 100vw - 2 * clamp(16px, 4vw, 48px)). Card borders take 2px.
  // Featured image: C - 2px below 1024px; (C - 24px gutter) / 2 - 2px above it.
  ["index.html", ".cards-grid .tour-card--featured picture", 1, "(min-width: 1296px) 586px, (min-width: 1200px) calc(50vw - 62px), (min-width: 1024px) calc(46vw - 14px), (min-width: 400px) calc(92vw - 2px), calc(100vw - 34px)"],
  // Secondary image: full card below 640px; 36% of its inner width above it, in a half-grid
  // column from 1024px. Container padding reaches 48px at 1200px; C reaches 1200px at 1296px.
  ["index.html", ".cards-grid .tour-card:not(.tour-card--featured) picture", 2, "(min-width: 1296px) 210.96px, (min-width: 1200px) calc(18vw - 22.32px), (min-width: 1024px) calc(16.56vw - 5.04px), (min-width: 640px) calc(33.12vw - 0.72px), (min-width: 400px) calc(92vw - 2px), calc(100vw - 34px)"],
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
