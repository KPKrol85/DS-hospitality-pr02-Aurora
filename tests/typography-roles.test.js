import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { beforeEach, describe, expect, it } from "vitest";
import { initTourDetail } from "../js/features/tour-detail.js";
import { flushPromises, mountFromPage, readJson, setUrl, stubFetchJson } from "./helpers.js";

// Headings and running text take one of eight typographic roles, each mapped to one step of the
// fluid scale by a --type-* token in tokens.css; place labels and travel facts take one of two voice
// roles beside that ladder. body and p carry the body role; the other roles are
// classes defined once in base.css, which the pages put next to an element's component class. The
// properties a role declares belong to it, so no component rule sets them again on an element that
// has the role. Tour summaries and descriptions are sanitised HTML without classes, so their lead
// paragraph, headings and itinerary day numbers join their roles through descendant selectors in
// the role rules. One rule
// draws the divider under every heading that has one.
const projectRoot = resolve(import.meta.dirname, "..");
const modulesDir = join(projectRoot, "css/modules");
const moduleNames = readdirSync(modulesDir).filter((entry) => entry.endsWith(".css"));
const pages = readdirSync(projectRoot).filter((entry) => entry.endsWith(".html"));
const tours = readJson("assets/data/tours.json");

// From the largest step to the smallest.
const roles = ["display-hero", "display", "page-title", "section-title", "subsection-title", "lead", "body", "small"];
// The voices of travel information, beside the ladder.
const voiceRoles = ["place-label", "facts"];
const roleClasses = [...roles, ...voiceRoles].filter((role) => role !== "body").map((role) => `type-${role}`);
const headingRoles = ["type-display-hero", "type-display", "type-page-title", "type-section-title", "type-subsection-title"];

// The display tier is reserved for three titles: the home hero, the tour-detail title and the
// title of the one lead offer of the listing.
const displayUses = [
  { page: "index.html", selector: ".hero__content > h1", roleClass: "type-display-hero" },
  { page: "tour.html", selector: ".tour-detail__title", roleClass: "type-display" },
  { page: "tours.html", selector: ".tour-card--lead .tour-card__title", roleClass: "type-display" },
];

// Sanitised tour content cannot carry classes; these selectors give it its roles.
const tourHeading = ".tour-detail__content h3";
const tourLead = ".tour-detail__summary p:first-of-type";
const tourDayNumber = ".tour-detail__content .tour-itinerary strong";

function parseModule(name) {
  return postcss.parse(readFileSync(join(modulesDir, name), "utf8"), { from: name });
}

function declarations(rule) {
  return rule.nodes.filter((node) => node.type === "decl");
}

function valueOf(rule, prop) {
  return declarations(rule).find((decl) => decl.prop === prop)?.value;
}

function pageDocument(page) {
  return new DOMParser().parseFromString(readFileSync(join(projectRoot, page), "utf8"), "text/html");
}

function isKeyframe(rule) {
  return rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name);
}

// Every rule of every module, with the module name.
function allRules() {
  const rules = [];
  for (const name of moduleNames) {
    parseModule(name).walkRules((rule) => {
      if (!isKeyframe(rule)) rules.push({ name, rule });
    });
  }
  return rules;
}

function tokenValues() {
  const values = {};
  parseModule("tokens.css").walkRules((rule) => {
    if (rule.selector === ":root") declarations(rule).forEach((decl) => (values[decl.prop] = decl.value));
  });
  return values;
}

// The step N of var(--fs-N) that a role token maps to.
function scaleStep(role) {
  const value = tokenValues()[`--type-${role}`];
  const step = value?.match(/^var\(--fs-(\d)\)$/)?.[1];
  expect(step, `--type-${role} maps to one --fs-* step`).toBeDefined();
  return Number(step);
}

// The rule in base.css that defines a role class.
function roleRule(roleClass) {
  const rules = allRules().filter(({ rule }) => rule.selectors.includes(`.${roleClass}`));
  expect(rules, `one rule defines .${roleClass}`).toHaveLength(1);
  expect(rules[0].name).toBe("base.css");
  expect(rules[0].rule.parent.type).toBe("root");
  return rules[0].rule;
}

function baseRule(selector) {
  const rules = [];
  parseModule("base.css").walkRules((rule) => {
    if (rule.selector === selector && rule.parent.type === "root") rules.push(rule);
  });
  expect(rules, `one top-level ${selector} rule in base.css`).toHaveLength(1);
  return rules[0];
}

// Pseudo-classes of interaction states never match a parsed document; without them a selector
// still names the element it styles.
function staticSelector(selector) {
  return selector.replace(/:(?:hover|active|visited|focus-visible|focus-within|focus)(?![\w-])/g, "").trim();
}

// A selector of element names only (h1, p, body): the heading-level and body defaults of base.css,
// which a role class outranks.
function isTypeSelector(selector) {
  return /^[a-z][a-z0-9]*$/i.test(selector);
}

describe("typographic role contract", () => {
  it("maps each role to one step of the fluid scale, one step apart from page title to small", () => {
    const tokens = tokenValues();
    const steps = roles.map(scaleStep);
    steps.forEach((step) => expect(tokens[`--fs-${step}`], `--fs-${step} exists`).toBeDefined());
    expect(steps.slice(1).map((step, index) => steps[index] - step)).toEqual(roles.slice(1).map(() => 1));
    // Lead text is never set smaller than the running text it introduces.
    expect(scaleStep("lead")).toBeGreaterThanOrEqual(scaleStep("body"));
    // Place labels sit below small text; facts keep the size of the running text they stand out from.
    expect(scaleStep("place-label")).toBeLessThan(scaleStep("small"));
    expect(scaleStep("facts")).toBe(scaleStep("body"));
  });

  it("gives display titles tight balanced lines, place labels tracked capitals and facts aligned figures", () => {
    for (const roleClass of ["type-display-hero", "type-display"]) {
      const rule = roleRule(roleClass);
      expect(valueOf(rule, "line-height"), roleClass).toBe("var(--lh-tight)");
      expect(valueOf(rule, "letter-spacing"), roleClass).toBe("var(--ls-tight)");
      expect(valueOf(rule, "text-wrap"), roleClass).toBe("balance");
    }
    const placeLabel = roleRule("type-place-label");
    expect(valueOf(placeLabel, "text-transform")).toBe("uppercase");
    expect(valueOf(placeLabel, "letter-spacing")).toBe("var(--ls-ultra)");
    const facts = roleRule("type-facts");
    expect(valueOf(facts, "font-variant-numeric")).toBe("lining-nums tabular-nums");
    // Both voices are set in the heading family, apart from the Inter running text.
    expect(valueOf(placeLabel, "font-family")).toBe("var(--font-heading)");
    expect(valueOf(facts, "font-family")).toBe("var(--font-heading)");
  });

  it("defines each role class once, from its role token, and leaves heading weights to the heading roles", () => {
    for (const roleClass of roleClasses) {
      const rule = roleRule(roleClass);
      expect(valueOf(rule, "font-size"), roleClass).toBe(`var(--${roleClass})`);
      if (headingRoles.includes(roleClass)) expect(valueOf(rule, "font-weight"), roleClass).toMatch(/^var\(--fw-[\w-]+\)$/);
    }
    // No context selector restyles a role class: every selector naming one is its definition.
    const contextual = allRules()
      .flatMap(({ name, rule }) => rule.selectors.map((selector) => ({ name, selector })))
      .filter(({ selector }) => /\.type-/.test(selector) && !roleClasses.map((roleClass) => `.${roleClass}`).includes(selector));
    expect(contextual).toEqual([]);
  });

  it("gives body and paragraphs the body role, and each heading level the role of its level", () => {
    for (const selector of ["body", "p"]) {
      const rule = baseRule(selector);
      expect(valueOf(rule, "font-size"), selector).toBe("var(--type-body)");
      expect(valueOf(rule, "line-height"), selector).toBe("var(--lh-normal)");
    }
    expect(valueOf(baseRule("h1"), "font-size")).toBe("var(--type-page-title)");
    expect(valueOf(baseRule("h2"), "font-size")).toBe("var(--type-section-title)");
    expect(valueOf(baseRule("h3"), "font-size")).toBe("var(--type-subsection-title)");
  });

  it("gives equivalent headings and leads the same role on every page", () => {
    const withoutRole = [];
    const expectRole = (page, element, roleClass) => {
      if (!element.classList.contains(roleClass)) withoutRole.push(`${page} <${element.localName} class="${element.className}"> needs ${roleClass}`);
    };
    let sectionHeaders = 0;
    let legalHeadings = 0;
    for (const page of pages) {
      const document = pageDocument(page);
      // Every h1 is a title: the display tier where displayUses reserves it, the page title elsewhere.
      document.querySelectorAll("h1").forEach((element) => {
        const display = displayUses.find((use) => use.page === page && element.matches(use.selector));
        expectRole(page, element, display ? display.roleClass : "type-page-title");
      });
      document.querySelectorAll(".section__header > h2").forEach((element) => {
        sectionHeaders++;
        expectRole(page, element, "type-section-title");
      });
      document.querySelectorAll("[class*='__lead']").forEach((element) => expectRole(page, element, "type-lead"));
      // Legal documents keep their h2 above their h3.
      document.querySelectorAll(".legal__title").forEach((element) => {
        legalHeadings++;
        expect(element.localName).toBe("h2");
        expectRole(page, element, "type-section-title");
      });
      document.querySelectorAll(".legal__block-title").forEach((element) => {
        expect(element.localName).toBe("h3");
        expectRole(page, element, "type-subsection-title");
      });
      document.querySelectorAll("[class*='type-']").forEach((element) => {
        const assigned = roleClasses.filter((roleClass) => element.classList.contains(roleClass));
        expect(assigned.length, `${page} <${element.localName} class="${element.className}"> has one role`).toBeLessThanOrEqual(1);
      });
    }
    expect(withoutRole).toEqual([]);
    // index.html and about.html share the eyebrow and h2 section header.
    expect(sectionHeaders).toBeGreaterThanOrEqual(5);
    expect(legalHeadings).toBeGreaterThan(0);
    expect(scaleStep("section-title")).toBeGreaterThan(scaleStep("subsection-title"));
  });

  it("reserves the display tier for the home hero, the tour-detail title and the one lead offer", () => {
    const found = [];
    for (const page of pages) {
      const document = pageDocument(page);
      document.querySelectorAll(".type-display-hero, .type-display").forEach((element) => {
        const use = displayUses.find((entry) => entry.page === page && element.matches(entry.selector) && element.classList.contains(entry.roleClass));
        expect(use, `${page} <${element.localName} class="${element.className}"> may not take the display tier`).toBeDefined();
        found.push(use);
      });
    }
    expect(found.sort((a, b) => a.page.localeCompare(b.page))).toEqual([...displayUses].sort((a, b) => a.page.localeCompare(b.page)));
    // The lead offer is Malediwy Lagoon Escape, and its heading level stays that of the other offers.
    const listing = pageDocument("tours.html");
    expect(listing.querySelectorAll(".tour-card--lead")).toHaveLength(1);
    expect(listing.querySelector(".tour-card--lead .tour-card__title").textContent.trim()).toBe("Malediwy Lagoon Escape");
    expect(new Set(Array.from(listing.querySelectorAll(".tour-card__title"), (title) => title.localName))).toEqual(new Set(["h2"]));
  });

  it("sets region lines and eyebrows as place labels, and durations and prices as facts", () => {
    let labels = 0;
    for (const page of pages) {
      const document = pageDocument(page);
      document.querySelectorAll(".eyebrow, [data-tour-region]").forEach((element) => {
        labels++;
        expect(element.classList.contains("type-place-label"), `${page} ${element.outerHTML}`).toBe(true);
      });
    }
    expect(labels).toBeGreaterThan(0);

    for (const page of ["index.html", "tours.html", "tour.html"]) {
      const document = pageDocument(page);
      const facts = document.querySelectorAll(".tour-card__meta, .tour-detail__meta");
      expect(facts.length, `${page} shows durations and prices`).toBeGreaterThan(0);
      facts.forEach((element) => expect(element.classList.contains("type-facts"), `${page} ${element.outerHTML}`).toBe(true));
    }
    // Every featured offer and every listing entry states its duration and price in the same units.
    for (const page of ["index.html", "tours.html"]) {
      pageDocument(page)
        .querySelectorAll("article.tour-card")
        .forEach((card) => {
          const items = Array.from(card.querySelectorAll(".tour-card__meta.type-facts > li"), (item) => item.textContent.trim());
          expect(items, `${page} ${card.querySelector(".tour-card__title").textContent}`).toEqual([expect.stringMatching(/^\d+ dni$/), expect.stringMatching(/^Od \d{1,3}(?: \d{3})* PLN \/ os\.$/)]);
        });
    }
  });

  it("leaves the properties a role declares to the role", () => {
    const roleRules = roleClasses.map(roleRule);
    // The elements of each role, including the sanitised tour content that the role rules reach
    // through descendant selectors (the tour page's placeholder paragraph stands in for its lead).
    const members = [];
    for (const page of pages) {
      const document = pageDocument(page);
      roleRules.forEach((rule) => {
        const owned = declarations(rule).map((decl) => decl.prop);
        document.querySelectorAll(rule.selector).forEach((element) => members.push({ page, element, owned }));
      });
    }
    expect(members.length).toBeGreaterThan(0);

    const violations = [];
    for (const { name, rule } of allRules()) {
      if (roleClasses.some((roleClass) => rule.selectors.includes(`.${roleClass}`))) continue;
      for (const selector of rule.selectors) {
        if (selector.includes("::") || isTypeSelector(selector)) continue;
        const target = staticSelector(selector);
        if (!target) continue;
        for (const { page, element, owned } of members) {
          if (!element.matches(target)) continue;
          declarations(rule)
            .filter((decl) => owned.includes(decl.prop))
            .forEach((decl) => violations.push(`${name}:${decl.source.start.line} ${selector} { ${decl.prop}: ${decl.value} } on ${page} <${element.localName} class="${element.className}">`));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("draws the heading divider from one rule", () => {
    const documents = pages.map(pageDocument);
    const headings = documents.flatMap((document) => Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")));
    const isHeadingHost = (host) => /(?:^|[\s>+~])h[1-6](?![\w-])/.test(host) || headings.some((heading) => heading.matches(staticSelector(host)));

    // A pseudo-element exists only where a rule gives it content; the print stylesheet only hides one.
    const definitions = allRules().filter(({ rule }) => valueOf(rule, "content") !== undefined && rule.selectors.some((selector) => /::(?:after|before)$/.test(selector) && isHeadingHost(selector.replace(/::(?:after|before)$/, ""))));
    expect(definitions.map(({ name, rule }) => `${name} ${rule.selectors.join(", ")}`)).toEqual(["base.css .heading-divider::after, .tour-detail__content h3::after"]);

    // Only the headings that had a divider carry it, plus the home page's section headers, which
    // share the about page's eyebrow and h2 pattern.
    const withDivider = [".section__header > h2", ".about-section__title", ".feature-card__title", ".site-footer__grid h3"];
    for (const document of documents) {
      document.querySelectorAll(".heading-divider").forEach((element) => {
        expect(/^h[1-6]$/.test(element.localName), element.outerHTML).toBe(true);
        expect(withDivider.some((selector) => element.matches(selector)), element.outerHTML).toBe(true);
      });
      document.querySelectorAll(withDivider.join(", ")).forEach((element) => expect(element.classList.contains("heading-divider"), element.outerHTML).toBe(true));
    }
  });
});

describe("typographic roles of sanitised tour content", () => {
  beforeEach(() => {
    mountFromPage("tour.html", "main");
  });

  it("reaches the description headings, the summary lead and the day numbers through descendant selectors", () => {
    expect(roleRule("type-subsection-title").selectors).toContain(tourHeading);
    expect(roleRule("type-lead").selectors).toContain(tourLead);
    expect(roleRule("type-facts").selectors).toContain(tourDayNumber);
    const [divider] = allRules().filter(({ rule }) => rule.selectors.includes(".heading-divider::after"));
    expect(divider.rule.selectors).toContain(`${tourHeading}::after`);
  });

  it.each(tours.map((tour) => [tour.id]))("styles the rendered %s description without classes", async (id) => {
    setUrl(`/tour.html?id=${id}`);
    stubFetchJson(tours);
    initTourDetail();
    await flushPromises();

    const headings = document.querySelectorAll("[data-tour-content] h3");
    expect(headings.length).toBeGreaterThan(0);
    headings.forEach((heading) => {
      expect(heading.attributes).toHaveLength(0);
      expect(heading.matches(tourHeading)).toBe(true);
    });
    const lead = document.querySelector("[data-tour-summary] p");
    expect(lead.matches(tourLead)).toBe(true);
    const dayNumbers = document.querySelectorAll("[data-tour-content] .tour-itinerary strong");
    expect(dayNumbers.length).toBeGreaterThan(0);
    dayNumbers.forEach((dayNumber) => {
      expect(dayNumber.attributes).toHaveLength(0);
      expect(dayNumber.textContent).toMatch(/^Dzień \d+:$/);
      expect(dayNumber.matches(tourDayNumber)).toBe(true);
    });
  });

  it("cannot receive role classes, because the sanitiser removes them", async () => {
    const tour = {
      ...structuredClone(tours[0]),
      shortSummary: '<p class="type-lead">Wstęp</p>',
      longDescription: '<h3 class="type-subsection-title heading-divider">Plan</h3>',
    };
    setUrl(`/tour.html?id=${tour.id}`);
    stubFetchJson([tour]);
    initTourDetail();
    await flushPromises();

    expect(document.querySelector("[data-tour-summary]").innerHTML).toBe("<p>Wstęp</p>");
    expect(document.querySelector("[data-tour-content]").innerHTML).toBe("<h3>Plan</h3>");
  });
});
