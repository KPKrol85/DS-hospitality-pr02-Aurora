const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();

// Canonical catalogue and the static pages that restate its offers.
const catalogueFile = "assets/data/tours.json";
const listingFile = "tours.html";
const contactFile = "contact.html";

// Contact select options that are not catalogue offers: the empty required-field
// placeholder and the custom inquiry option.
const nonCatalogueOptionValues = new Set(["", "custom"]);

const namedEntities = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
]);

const issues = [];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

// Blanks HTML comments but keeps their line breaks, so commented-out markup is
// skipped and reported line numbers stay correct.
function blankComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, " "));
}

function getLineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function addIssue(location, subject, message) {
  issues.push(`${location} [${subject}] ${message}`);
}

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body) => {
    if (body[0] !== "#") {
      return namedEntities.get(body) ?? entity;
    }

    const codePoint = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
  });
}

// Collapses whitespace runs, including non-breaking spaces, into single spaces.
function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

// Visible text of an HTML fragment: tags removed, entities decoded, whitespace collapsed.
function toText(html) {
  return collapseWhitespace(decodeEntities(html.replace(/<[^>]*>/g, "")));
}

function parseAttributes(tagContent) {
  const attributes = {};
  const attrRegex = /([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
  let match;

  while ((match = attrRegex.exec(tagContent)) !== null) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[3]);
  }

  return attributes;
}

function hasClass(element, className) {
  return (element.attributes.class || "").split(/\s+/).includes(className);
}

// Finds elements by tag name pattern. Elements matched by one pattern must not
// nest, which holds for every element this check reads.
function findElements(html, tagPattern, offset = 0) {
  const elements = [];
  const elementRegex = new RegExp(`<(${tagPattern})\\b([^>]*)>([\\s\\S]*?)</\\1\\s*>`, "gi");
  let match;

  while ((match = elementRegex.exec(html)) !== null) {
    const [, tagName, tagContent, inner] = match;
    elements.push({
      index: offset + match.index,
      innerIndex: offset + match.index + tagName.length + tagContent.length + 2,
      attributes: parseAttributes(tagContent),
      inner,
    });
  }

  return elements;
}

// Amount stated in a price text such as "od 19 500 PLN / os.".
function parsePriceAmount(priceText) {
  const match = priceText.match(/\d{1,3}(?:\s\d{3})+|\d+/);
  return match ? Number(match[0].replace(/\s/g, "")) : null;
}

// Catalogue ID that a link opens on the tour detail page, or null for any other link.
function getDetailLinkId(href) {
  if (!href) return null;

  let url;
  try {
    url = new URL(href, "https://aurora.invalid/");
  } catch {
    return null;
  }

  return url.pathname === "/tour.html" ? (url.searchParams.get("id") ?? "") : null;
}

function loadCatalogue() {
  let records;
  try {
    records = JSON.parse(readProjectFile(catalogueFile));
  } catch (error) {
    addIssue(catalogueFile, "catalogue", `cannot be read as JSON (${error.message})`);
    return [];
  }

  if (!Array.isArray(records) || records.length === 0) {
    addIssue(catalogueFile, "catalogue", "must be a non-empty array of tours");
    return [];
  }

  const seenIds = new Set();

  return records.map((record, position) => {
    const { id, name, days, priceFrom } = record ?? {};
    const subject = typeof id === "string" && id ? `record ${position + 1}, ${id}` : `record ${position + 1}`;
    const priceAmount = typeof priceFrom === "string" ? parsePriceAmount(priceFrom) : null;

    if (typeof id !== "string" || !id) {
      addIssue(catalogueFile, subject, "id must be a non-empty string");
    } else if (seenIds.has(id)) {
      addIssue(catalogueFile, subject, `duplicate id "${id}"`);
    }
    seenIds.add(id);

    if (typeof name !== "string" || !collapseWhitespace(name)) {
      addIssue(catalogueFile, subject, "name must be a non-empty string");
    }

    if (!Number.isInteger(days) || days < 1) {
      addIssue(catalogueFile, subject, `days must be a positive integer, found ${JSON.stringify(days)}`);
    }

    if (priceAmount === null) {
      addIssue(catalogueFile, subject, `priceFrom must state a numeric amount, found ${JSON.stringify(priceFrom)}`);
    }

    return { id, name: collapseWhitespace(String(name)), days, priceFrom: collapseWhitespace(String(priceFrom)), priceAmount };
  });
}

function checkCard(card, tour, subject, locate) {
  const title = findElements(card.inner, "h[1-6]", card.innerIndex).find((element) => hasClass(element, "tour-card__title"));
  const meta = findElements(card.inner, "ul", card.innerIndex).find((element) => hasClass(element, "tour-card__meta"));
  // The first two meta items state the duration and the price.
  const [durationItem, priceItem] = meta ? findElements(meta.inner, "li", meta.innerIndex) : [];

  // Durations use the "<days> dni" wording that tour-detail.js renders on tour.html.
  // Letter case is ignored where the listing capitalises the catalogue text ("Od" / "od").
  const checks = [
    { field: "data-days", element: card, actual: card.attributes["data-days"], expected: String(tour.days), source: "days" },
    { field: "data-price", element: card, actual: card.attributes["data-price"], expected: String(tour.priceAmount), source: "priceFrom" },
    { field: "name", element: title, actual: title && toText(title.inner), expected: tour.name, source: "name" },
    { field: "visible duration", element: durationItem, actual: durationItem && toText(durationItem.inner), expected: `${tour.days} dni`, source: "days", ignoreCase: true },
    { field: "visible price", element: priceItem, actual: priceItem && toText(priceItem.inner), expected: tour.priceFrom, source: "priceFrom", ignoreCase: true },
  ];

  for (const { field, element, actual, expected, source, ignoreCase } of checks) {
    const matches = typeof actual === "string" && (ignoreCase ? actual.toLowerCase() === expected.toLowerCase() : actual === expected);

    if (!matches) {
      const found = typeof actual === "string" ? `"${actual}"` : "missing";
      addIssue(locate((element || card).index), subject, `${field} is ${found}, expected "${expected}" (from ${source})`);
    }
  }
}

function checkListing(tours) {
  const html = blankComments(readProjectFile(listingFile));
  const locate = (index) => `${listingFile}:${getLineNumber(html, index)}`;
  const toursById = new Map(tours.map((tour) => [tour.id, tour]));
  const catalogueIds = tours.map((tour) => tour.id).join(", ");
  const listedCards = new Map();

  // Each article.tour-card is one offer. Its id attribute is a page anchor linked
  // from index.html; the catalogue ID comes from the card's tour detail link.
  const cards = findElements(html, "article").filter((element) => hasClass(element, "tour-card"));

  for (const card of cards) {
    const anchor = card.attributes.id ? `card #${card.attributes.id}` : "card";
    const detailLinks = findElements(card.inner, "a", card.innerIndex).filter((link) => getDetailLinkId(link.attributes.href) !== null);
    const linkedIds = [...new Set(detailLinks.map((link) => getDetailLinkId(link.attributes.href)))];

    if (linkedIds.length !== 1) {
      const problem = linkedIds.length === 0 ? "has no tour detail link (tour.html?id=<catalogue id>)" : `has tour detail links to different catalogue IDs (${linkedIds.join(", ")})`;
      addIssue(locate(card.index), anchor, problem);
      continue;
    }

    const [tourId] = linkedIds;
    const tour = toursById.get(tourId);

    if (!tour) {
      addIssue(locate(detailLinks[0].index), anchor, `tour detail link uses unknown catalogue ID "${tourId}"; catalogue IDs: ${catalogueIds}`);
      continue;
    }

    if (listedCards.has(tourId)) {
      addIssue(locate(card.index), `${tourId}, ${anchor}`, `duplicate listing card; the offer is already listed at ${locate(listedCards.get(tourId).index)}`);
      continue;
    }

    listedCards.set(tourId, card);
    checkCard(card, tour, `${tourId}, ${anchor}`, locate);
  }

  for (const tour of tours) {
    if (!listedCards.has(tour.id)) {
      addIssue(listingFile, tour.id, `no listing card links to tour.html?id=${tour.id} ("${tour.name}")`);
    }
  }
}

function checkContactSelect(tours) {
  const html = blankComments(readProjectFile(contactFile));
  const locate = (index) => `${contactFile}:${getLineNumber(html, index)}`;
  const select = findElements(html, "select").find((element) => element.attributes.name === "tour");

  if (!select) {
    addIssue(contactFile, "tour select", 'no <select name="tour"> found');
    return;
  }

  const toursById = new Map(tours.map((tour) => [tour.id, tour]));
  const catalogueIds = tours.map((tour) => tour.id).join(", ");
  const listedIds = new Set();

  for (const option of findElements(select.inner, "option", select.innerIndex)) {
    const label = toText(option.inner);
    const value = option.attributes.value ?? label;
    const tour = toursById.get(value);

    if (nonCatalogueOptionValues.has(value)) {
      continue;
    }

    if (!tour) {
      addIssue(locate(option.index), `option "${value}"`, `unknown catalogue ID (label "${label}"); catalogue IDs: ${catalogueIds}`);
    } else if (listedIds.has(value)) {
      addIssue(locate(option.index), value, "duplicate option");
    } else if (label !== tour.name) {
      addIssue(locate(option.index), value, `option label is "${label}", expected "${tour.name}" (from name)`);
    }

    listedIds.add(value);
  }

  for (const tour of tours) {
    if (!listedIds.has(tour.id)) {
      addIssue(locate(select.index), tour.id, `missing from the tour select (expected value "${tour.id}", label "${tour.name}")`);
    }
  }
}

function main() {
  const tours = loadCatalogue();

  if (issues.length === 0) {
    checkListing(tours);
    checkContactSelect(tours);
  }

  if (issues.length > 0) {
    console.error(`Tour catalogue check failed (${issues.length} ${issues.length === 1 ? "issue" : "issues"}; canonical source: ${catalogueFile}):`);
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`Tour catalogue check passed (${tours.length} offers in ${catalogueFile} match the ${listingFile} listing cards and the ${contactFile} tour select).`);
}

main();
