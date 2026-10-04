import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs scripts/check-tour-catalogue.js against a small site written to a temporary directory,
// so no test reads or changes the real catalogue or pages.
const checker = resolve(import.meta.dirname, "../scripts/check-tour-catalogue.js");

// The catalogue offers with the anchors of their tours.html listing cards. As on the real site,
// two anchors differ from the catalogue IDs, so a featured card reaches its offer only through
// the listing card it links to. Patagonia is listed but not featured.
const offers = [
  { id: "tokio-kyoto", anchor: "tokio", name: "Tokio & Kyoto Private Edition", days: 9, priceFrom: "od 24 000 PLN / os." },
  { id: "malediwy", anchor: "malediwy", name: "Malediwy Lagoon Escape", days: 7, priceFrom: "od 18 000 PLN / os." },
  { id: "nowy-jork", anchor: "nyc", name: "New York City Break Platinum", days: 5, priceFrom: "od 15 000 PLN / os." },
  { id: "patagonia", anchor: "patagonia", name: "Patagonia Signature Expedition", days: 10, priceFrom: "od 19 500 PLN / os." },
];

// The featured offer cards of index.html. The Tokio card states its duration only in words.
const featuredCards = [
  { anchor: "tokio", title: "Tokio &amp; Kyoto Private Edition", text: "Dziewięciodniowy program z przewodnikiem i prywatnymi transferami." },
  { anchor: "malediwy", title: "Malediwy Lagoon Escape", text: "7 dni w willi na wodzie z prywatnym butlerem." },
  { anchor: "nyc", title: "New York City Break Platinum", text: "5 dni z apartamentem przy Central Parku." },
];

const validAnchors = "#tokio, #malediwy, #nyc, #patagonia";

function page(lines) {
  return ["<!doctype html>", '<html lang="pl">', "<body>", ...lines, "</body>", "</html>", ""].join("\n");
}

function escapeText(text) {
  return text.replaceAll("&", "&amp;");
}

function listingPage() {
  return page(
    offers.flatMap(({ id, anchor, name, days, priceFrom }) => [
      `<article class="tour-card tour-card--detailed" id="${anchor}" data-days="${days}" data-price="${priceFrom.replace(/\D/g, "")}">`,
      `  <h2 class="tour-card__title">${escapeText(name)}</h2>`,
      '  <ul class="tour-card__meta">',
      `    <li>${days} dni</li>`,
      `    <li>${priceFrom}</li>`,
      "  </ul>",
      `  <a href="tour.html?id=${id}" class="btn btn--ghost btn--sm">Szczegóły oferty</a>`,
      "</article>",
    ])
  );
}

function contactPage() {
  return page([
    '<select name="tour" required>',
    '  <option value="">Wybierz ofertę</option>',
    ...offers.map(({ id, name }) => `  <option value="${id}">${escapeText(name)}</option>`),
    '  <option value="custom">Inna podróż</option>',
    "</select>",
  ]);
}

// As on the real page, an "item <n>" comment precedes each card, which locates its start tag.
function homePage() {
  return page(
    featuredCards.flatMap(({ anchor, title, text }, position) => [
      `<!-- item ${position + 1} -->`,
      '<article class="tour-card reveal">',
      '  <img src="assets/img/tour-index/tour.jpg" alt="" />',
      '  <div class="tour-card__body">',
      `    <h3 class="tour-card__title">${title}</h3>`,
      `    <p class="tour-card__text type-small">${text}</p>`,
      `    <a class="btn btn--text" href="tours.html#${anchor}">Poznaj szczegóły</a>`,
      "  </div>",
      "</article>",
    ])
  );
}

let siteRoot;

function read(relativePath) {
  return readFileSync(join(siteRoot, relativePath), "utf8");
}

function write(relativePath, content) {
  const filePath = join(siteRoot, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

// Replaces the first match of search (every match of a global pattern), and fails when the
// fixture no longer contains it.
function edit(relativePath, search, replacement) {
  const content = read(relativePath);
  const updated = content.replace(search, () => replacement);
  expect(updated, `${relativePath} does not contain ${search}`).not.toBe(content);
  write(relativePath, updated);
}

// Line of the first occurrence of text.
function lineOf(relativePath, text) {
  const content = read(relativePath);
  expect(content).toContain(text);
  return content.slice(0, content.indexOf(text)).split("\n").length;
}

function runChecker() {
  const result = spawnSync(process.execPath, [checker], { cwd: siteRoot, encoding: "utf8" });
  const issues = result.stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));

  return { status: result.status, stdout: result.stdout, stderr: result.stderr, issues };
}

beforeEach(() => {
  siteRoot = mkdtempSync(join(tmpdir(), "aurora-tour-catalogue-"));
  write("assets/data/tours.json", JSON.stringify(offers.map(({ anchor, ...tour }) => tour), null, 2));
  write("tours.html", listingPage());
  write("contact.html", contactPage());
  write("index.html", homePage());
});

afterEach(() => {
  rmSync(siteRoot, { recursive: true, force: true });
});

describe("check-tour-catalogue.js", () => {
  it("passes when the featured index.html cards match the offers of the listing cards they link to", () => {
    const { status, stdout, stderr } = runChecker();

    expect(status, stderr).toBe(0);
    expect(stdout).toContain(
      "Tour catalogue check passed (4 offers in assets/data/tours.json match the tours.html listing cards, the contact.html tour select, and the 3 featured offers in index.html)."
    );
  });

  it("reports a featured card title that differs from the catalogue name of its offer", () => {
    edit("index.html", ">New York City Break Platinum</h3>", ">New York City Break</h3>");

    const { status, issues } = runChecker();

    // tours.html#nyc resolves through its listing card to the catalogue record nowy-jork.
    expect(status).toBe(1);
    expect(issues).toEqual([
      `index.html:${lineOf("index.html", "New York City Break</h3>")} [nowy-jork, featured card -> tours.html#nyc] name is "New York City Break", expected "New York City Break Platinum" (from name)`,
    ]);
  });

  it("reports each numeric duration in a featured card that differs from the catalogue days", () => {
    edit("index.html", "7 dni w willi", "8 dni w willi");
    // Markup and entities inside a statement do not hide it.
    edit("index.html", "5 dni z apartamentem", "<strong>4</strong>&nbsp;dni z apartamentem");

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      `index.html:${lineOf("index.html", "8 dni")} [malediwy, featured card -> tours.html#malediwy] visible duration is "8 dni", expected "7 dni" (from days)`,
      `index.html:${lineOf("index.html", "<strong>4</strong>")} [nowy-jork, featured card -> tours.html#nyc] visible duration is "4 dni", expected "5 dni" (from days)`,
    ]);
  });

  it("reports a featured card whose anchor matches no listing card", () => {
    // The catalogue ID instead of the anchor of the offer's listing card.
    edit("index.html", 'href="tours.html#nyc"', 'href="tours.html#nowy-jork"');

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      `index.html:${lineOf("index.html", "tours.html#nowy-jork")} [featured card -> tours.html#nowy-jork] anchor #nowy-jork matches no valid listing card in tours.html; valid listing anchors: ${validAnchors}`,
    ]);
  });

  it("does not resolve a featured card through a listing card that fails the listing check", () => {
    edit("tours.html", 'href="tour.html?id=malediwy"', 'href="tour.html?id=maledivy"');

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      `tours.html:${lineOf("tours.html", "tour.html?id=maledivy")} [card #malediwy] tour detail link uses unknown catalogue ID "maledivy"; catalogue IDs: tokio-kyoto, malediwy, nowy-jork, patagonia`,
      'tours.html [malediwy] no listing card links to tour.html?id=malediwy ("Malediwy Lagoon Escape")',
      `index.html:${lineOf("index.html", "tours.html#malediwy")} [featured card -> tours.html#malediwy] anchor #malediwy matches no valid listing card in tours.html; valid listing anchors: #tokio, #nyc, #patagonia`,
    ]);
  });

  it("does not compare a duration written out in words, but still checks that card's title and anchor", () => {
    // "Dziesięciodniowy" (ten-day) contradicts the nine catalogue days, but states no number.
    edit("index.html", "Dziewięciodniowy", "Dziesięciodniowy");

    const spelledOut = runChecker();
    expect(spelledOut.status, spelledOut.stderr).toBe(0);

    edit("index.html", ">Tokio &amp; Kyoto Private Edition</h3>", ">Tokio &amp; Kyoto</h3>");

    const title = runChecker();
    expect(title.status).toBe(1);
    expect(title.issues).toEqual([
      `index.html:${lineOf("index.html", "Tokio &amp; Kyoto</h3>")} [tokio-kyoto, featured card -> tours.html#tokio] name is "Tokio & Kyoto", expected "Tokio & Kyoto Private Edition" (from name)`,
    ]);

    // Without a resolved offer the title cannot be compared, so only the link is reported.
    edit("index.html", 'href="tours.html#tokio"', 'href="tours.html#tokyo"');

    const anchor = runChecker();
    expect(anchor.status).toBe(1);
    expect(anchor.issues).toEqual([
      `index.html:${lineOf("index.html", "tours.html#tokyo")} [featured card -> tours.html#tokyo] anchor #tokyo matches no valid listing card in tours.html; valid listing anchors: ${validAnchors}`,
    ]);
  });

  it("reports a featured card that does not link to exactly one listing card anchor", () => {
    edit("index.html", '<a class="btn btn--text" href="tours.html#tokio">', '<a href="tours.html#malediwy">Malediwy</a> <a class="btn btn--text" href="tours.html#tokio">');
    edit("index.html", 'href="tours.html#malediwy">Poznaj', 'href="tour.html?id=malediwy">Poznaj');
    edit("index.html", 'href="tours.html#nyc"', 'href="tours.html"');

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      `index.html:${lineOf("index.html", "<!-- item 1 -->") + 1} [featured card] has links to different listing cards (tours.html#malediwy, tours.html#tokio)`,
      `index.html:${lineOf("index.html", "<!-- item 2 -->") + 1} [featured card] has no link to its listing card (tours.html#<anchor>)`,
      `index.html:${lineOf("index.html", 'href="tours.html"')} [featured card -> tours.html] link has no anchor; expected tours.html#<anchor> of the offer's listing card`,
    ]);
  });

  it("fails when index.html has no featured offer card to check", () => {
    edit("index.html", /tour-card reveal/g, "offer-card reveal");

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual(["index.html [featured offers] no featured offer card (article.tour-card) found"]);
  });
});
