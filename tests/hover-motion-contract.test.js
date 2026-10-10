import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// Hover follows the material roles (tokens.css). Editorial content and images that open nothing have
// no hover state and no pointer cursor, so they never look operable. Interactive elements change
// colour, edge or surface on hover; buttons rise at most to --shadow-raised, and no hover adds a
// text shadow or a larger elevation. Movement on hover is limited to fine pointers and to
// prefers-reduced-motion: no-preference, so a reduced-motion preference removes it while state
// transforms (the skip link, the menu icon, the theme icons) keep working.
const modulesDir = resolve(import.meta.dirname, "../css/modules");
const moduleNames = readdirSync(modulesDir).filter((entry) => entry.endsWith(".css"));

// Static components: editorial blocks, sections and pictures that open nothing. .tour-gallery__item
// is also the main tour image, which is not a lightbox trigger.
const staticClasses = [
  "about-highlight",
  "about-values",
  "contact-media",
  "cta",
  "data-state",
  "feature-card",
  "hero__media",
  "legal",
  "legal__toc",
  "page-hero",
  "section--muted",
  "testimonials",
  "timeline",
  "tour-detail",
  "tour-detail__image",
  "tour-gallery__item",
  "tours-empty",
  "utility-page__card",
];
const hoverPseudo = /:hover|:focus-within/;
const movement = /^(transform|translate|scale|rotate)$/;

function parseModule(name) {
  return postcss.parse(readFileSync(join(modulesDir, name), "utf8"), { from: name });
}

function where(name, rule, decl) {
  const target = decl ? ` { ${decl.prop}: ${decl.value} }` : "";
  return `${name}:${(decl || rule).source.start.line} ${rule.selector.replace(/\s+/g, " ")}${target}`;
}

// Every rule outside print styles, with the media queries around it.
function allRules() {
  const rules = [];
  for (const name of moduleNames) {
    parseModule(name).walkRules((rule) => {
      const media = [];
      for (let parent = rule.parent; parent; parent = parent.parent) {
        if (parent.type === "atrule" && parent.name === "media") media.push(parent.params.replace(/\s+/g, " "));
      }
      if (media.some((params) => /\bprint\b/.test(params))) return;
      rules.push({ name, rule, media });
    });
  }
  return rules;
}

const compounds = (selector) => selector.trim().split(/\s*[>+~]\s*|\s+/);
const classesOf = (compound) => Array.from(compound.replace(/:not\([^)]*\)/g, "").matchAll(/\.([\w-]+)/g), (match) => match[1]);
const declarations = (rule) => rule.nodes.filter((node) => node.type === "decl");

describe("hover and motion contract", () => {
  it("gives static content no hover state and no pointer cursor", () => {
    const violations = [];
    for (const { name, rule } of allRules()) {
      for (const selector of rule.selectors) {
        const parts = compounds(selector);
        // A hover or focus-within state on a static element.
        parts
          .filter((part) => hoverPseudo.test(part) && classesOf(part).some((cls) => staticClasses.includes(cls)))
          .forEach(() => violations.push(where(name, rule)));
        // A pointer or zoom cursor on a static element.
        if (classesOf(parts.at(-1)).some((cls) => staticClasses.includes(cls))) {
          declarations(rule)
            .filter((decl) => decl.prop === "cursor" && /pointer|zoom/.test(decl.value))
            .forEach((decl) => violations.push(where(name, rule, decl)));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("moves elements on hover only for fine pointers without a reduced-motion preference", () => {
    const moving = [];
    const unguarded = [];
    for (const { name, rule, media } of allRules()) {
      if (!rule.selectors.some((selector) => hoverPseudo.test(selector))) continue;
      for (const decl of declarations(rule).filter((decl) => movement.test(decl.prop) && decl.value !== "none")) {
        moving.push(decl);
        const guarded = media.some((params) => params.includes("(hover: hover)") && params.includes("(pointer: fine)") && params.includes("(prefers-reduced-motion: no-preference)"));
        if (!guarded) unguarded.push(where(name, rule, decl));
      }
    }
    expect(moving.length, "interactive elements keep their hover movement").toBeGreaterThan(0);
    expect(unguarded).toEqual([]);
  });

  it("raises hovered elements at most to --shadow-raised and adds no text shadow", () => {
    const violations = [];
    for (const { name, rule } of allRules()) {
      if (!rule.selectors.some((selector) => hoverPseudo.test(selector))) continue;
      declarations(rule)
        .filter((decl) => (decl.prop === "box-shadow" && decl.value !== "var(--shadow-raised)") || decl.prop === "text-shadow")
        .forEach((decl) => violations.push(where(name, rule, decl)));
    }
    expect(violations).toEqual([]);

    // The raised and overlay roles are the only elevation steps, in both theme editions.
    const shadowTokens = new Set();
    parseModule("tokens.css").walkDecls(/^--shadow/, (decl) => shadowTokens.add(decl.prop));
    expect([...shadowTokens].sort()).toEqual(["--shadow-overlay", "--shadow-raised"]);
  });
});
