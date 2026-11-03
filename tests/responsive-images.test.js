import { existsSync, readdirSync, readFileSync } from "node:fs";
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

// Pixel size from the frame header (SOF0 to SOF15 except DHT, JPG and DAC) of a JPEG file.
function jpegSize(path) {
  const bytes = readFileSync(path);
  for (let offset = 2; offset + 9 < bytes.length; offset += 2 + bytes.readUInt16BE(offset + 2)) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    }
  }
  throw new Error(`${path} has no JPEG frame header`);
}

// Pixel size from the first chunk of a WebP file: the VP8X canvas, or the frame header of a
// lossy (VP8) or lossless (VP8L) bitstream.
function webpSize(path) {
  const bytes = readFileSync(path);
  if (bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP") {
    throw new Error(`${path} is not a WebP file`);
  }
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X") return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
  if (chunk === "VP8 ") return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  throw new Error(`${path} starts with an unknown WebP chunk "${chunk}"`);
}

// Pixel size from the image spatial extents property (meta > iprp > ipco > ispe) of an AVIF file.
function avifSize(path) {
  const bytes = readFileSync(path);
  const box = (type, start, end) => {
    for (let offset = start, size; offset + 8 <= end; offset += size) {
      size = bytes.readUInt32BE(offset);
      if (size < 8) break;
      if (bytes.toString("latin1", offset + 4, offset + 8) === type) return [offset + 8, offset + size];
    }
    throw new Error(`${path} has no ${type} box`);
  };
  const [metaStart, metaEnd] = box("meta", 0, bytes.length);
  // meta and ispe are full boxes: a 4-byte version and flags field precedes their content.
  const [iprpStart, iprpEnd] = box("iprp", metaStart + 4, metaEnd);
  const [ipcoStart, ipcoEnd] = box("ipco", iprpStart, iprpEnd);
  const [ispe] = box("ispe", ipcoStart, ipcoEnd);
  return [bytes.readUInt32BE(ispe + 4), bytes.readUInt32BE(ispe + 8)];
}

const imageSize = { "image/avif": avifSize, "image/webp": webpSize, "image/jpeg": jpegSize };

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

// The home hero loads eagerly at high priority and every other content image lazily. Width and
// height describe the fallback src file, so the box is reserved before any candidate loads.
describe("home page image loading", () => {
  const home = readPage("index.html");
  const images = Array.from(home.querySelectorAll("main img")).map((img) => [img.getAttribute("src"), img]);
  const contentImages = images.filter(([, img]) => !img.closest(".hero__media"));

  it("index.html treats the three featured offers as content images", () => {
    const featured = Array.from(home.querySelectorAll(".cards-grid .tour-card picture img"));

    expect(featured).toHaveLength(3);
    expect(featured.every((img) => contentImages.some(([, content]) => content === img))).toBe(true);
  });

  it("index.html loads the hero image eagerly at high priority", () => {
    const hero = images.filter(([, img]) => img.closest(".hero__media"));

    expect(hero).toHaveLength(1);
    expect(hero[0][1].getAttribute("loading")).toBe("eager");
    expect(hero[0][1].getAttribute("fetchpriority")).toBe("high");
  });

  it.each(contentImages)("index.html loads %s lazily", (src, img) => {
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it.each(images)("index.html declares the pixel size of %s", (src, img) => {
    expect([img.getAttribute("width"), img.getAttribute("height")]).toEqual(jpegSize(join(projectRoot, src)).map(String));
  });
});

// The featured pictures keep aspect-ratio: auto, so the loaded candidate's own ratio replaces the
// box that width and height reserved, and any other ratio moves the cards when it loads. Every
// candidate of every format therefore has the ratio of the src file, with the height rounded to
// the nearest whole pixel: 400 x 263 and 1000 x 657 for a 700 x 460 src.
describe("featured offer image candidates", () => {
  const pictures = Array.from(readPage("index.html").querySelectorAll(".cards-grid .tour-card picture"));
  const lists = pictures.flatMap((picture) => {
    const [srcWidth, srcHeight] = jpegSize(join(projectRoot, picture.querySelector("img").getAttribute("src")));
    return widthDescribed(picture).map((element) => ({
      type: element.getAttribute("type") ?? "image/jpeg",
      candidates: element.getAttribute("srcset").trim().split(/\s*,\s*/).map((candidate) => candidate.split(/\s+/)),
      srcWidth,
      srcHeight,
    }));
  });
  const candidates = lists.flatMap(({ type, candidates, srcWidth, srcHeight }) =>
    candidates.map(([url, descriptor]) => [url, descriptor, type, srcWidth, srcHeight])
  );

  it("index.html lists four width candidates in each of the nine featured candidate lists", () => {
    expect(pictures).toHaveLength(3);
    expect(lists.map(({ candidates }) => candidates.length)).toEqual(Array(9).fill(4));
  });

  it.each(candidates)("index.html lists %s at %s in the ratio of its src", (url, descriptor, type, srcWidth, srcHeight) => {
    const path = join(projectRoot, url);
    expect(existsSync(path), `${url} is missing`).toBe(true);
    const [width, height] = imageSize[type](path);
    expect(width, `${url} width`).toBe(Number.parseInt(descriptor, 10));
    expect(height, `${url} height`).toBe(Math.round((width * srcHeight) / srcWidth));
  });
});
