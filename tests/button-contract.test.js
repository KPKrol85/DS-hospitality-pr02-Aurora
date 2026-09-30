import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// .btn is one component with two independent axes: variants (.btn--ghost, .btn--text) change its
// colours, sizes (.btn--sm, .btn--lg) its font size, padding and minimum height, and .btn itself is
// the default of both. Its rules form the Buttons section of components.css. A context such as the
// hero or a tour card may place or widen a button but not size it, and every variant keeps the 1px
// border of .btn, so default and ghost buttons of one size have the same height everywhere.
const projectRoot = resolve(import.meta.dirname, "..");
const modulesDir = join(projectRoot, "css/modules");
const moduleNames = readdirSync(modulesDir).filter((entry) => entry.endsWith(".css"));
const pages = readdirSync(projectRoot).filter((entry) => entry.endsWith(".html"));
const scripts = ["js/script.js", ...readdirSync(join(projectRoot, "js/features")).map((entry) => `js/features/${entry}`)];

const variants = ["btn--ghost", "btn--text"];
const sizes = ["btn--sm", "btn--lg"];
const sizeProperties = ["font-size", "min-height", "padding"];

function readProjectFile(relativePath) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function parseModule(name) {
  return postcss.parse(readFileSync(join(modulesDir, name), "utf8"), { from: name });
}

// Properties that decide a button's box size.
function isSizing(prop) {
  return /^(font|font-size|line-height|(min-|max-)?(height|block-size)|padding(-.+)?)$/.test(prop);
}

// Border properties other than colour and radius change the border box.
function isBorderGeometry(prop) {
  return prop.startsWith("border") && !/(color|radius)$/.test(prop);
}

// "own" when the selector's subject is the button box itself (.btn, .btn--ghost:hover), "pseudo"
// for one of its pseudo-elements, "context" when it styles a button inside another element
// (.hero__actions .btn), and null for any other selector. The button selectors of this project
// have no combinators inside :is(), :not() or attribute values.
function buttonTarget(selector) {
  const compounds = selector.trim().split(/\s*[>+~]\s*|\s+/);
  const subject = compounds.at(-1);
  if (!/\.btn(?:--[\w-]+)?(?![\w-])/.test(subject)) return null;
  if (compounds.length > 1) return "context";
  return subject.includes("::") ? "pseudo" : "own";
}

function modifiersIn(selector) {
  return Array.from(selector.matchAll(/\.(btn--[\w-]+)/g), (match) => match[1]);
}

function declarations(rule) {
  return rule.nodes.filter((node) => node.type === "decl");
}

function findRule(root, selector) {
  const rules = [];
  root.walkRules((rule) => {
    if (rule.selector === selector && rule.parent.type === "root") rules.push(rule);
  });
  expect(rules, `one top-level ${selector} rule`).toHaveLength(1);
  return rules[0];
}

function usedModifiers() {
  const used = new Set();
  for (const page of pages) {
    const document = new DOMParser().parseFromString(readProjectFile(page), "text/html");
    document.querySelectorAll("[class]").forEach((element) => {
      element.classList.forEach((name) => name.startsWith("btn--") && used.add(name));
    });
  }
  for (const script of scripts) {
    for (const match of readProjectFile(script).matchAll(/\bbtn--[\w-]+/g)) used.add(match[0]);
  }
  return used;
}

function definedModifiers() {
  const defined = new Set();
  for (const name of moduleNames) {
    parseModule(name).walkRules((rule) => {
      rule.selectors.forEach((selector) => modifiersIn(selector).forEach((modifier) => defined.add(modifier)));
    });
  }
  return defined;
}

describe(".btn component contract", () => {
  it("defines exactly the modifiers that the pages and scripts use", () => {
    // Covers the former btn--primary and btn--secondary, which the markup used without any style.
    expect([...usedModifiers()].sort()).toEqual([...definedModifiers()].sort());
    expect([...definedModifiers()].sort()).toEqual([...variants, ...sizes].sort());
  });

  it("keeps button sizing out of context rules", () => {
    const contextSizing = [];
    for (const name of moduleNames) {
      parseModule(name).walkRules((rule) => {
        if (!rule.selectors.some((selector) => buttonTarget(selector) === "context")) return;
        declarations(rule)
          .filter((decl) => isSizing(decl.prop))
          .forEach((decl) => contextSizing.push(`${name}:${decl.source.start.line} ${rule.selector} { ${decl.prop}: ${decl.value} }`));
      });
    }

    expect(contextSizing).toEqual([]);
  });

  it("declares every button rule in one Buttons section of components.css", () => {
    const outside = [];
    for (const name of moduleNames.filter((entry) => entry !== "components.css")) {
      parseModule(name).walkRules((rule) => {
        if (rule.selectors.some((selector) => ["own", "pseudo"].includes(buttonTarget(selector)))) {
          outside.push(`${name}:${rule.source.start.line} ${rule.selector}`);
        }
      });
    }
    expect(outside).toEqual([]);

    // A top-level node belongs to the section when every rule in it targets a button or its
    // pseudo-elements; media queries count by their rules.
    const root = parseModule("components.css");
    const isButtonNode = (node) => {
      const rules = node.type === "rule" ? [node] : node.nodes.filter((child) => child.type === "rule");
      return rules.length > 0 && rules.every((rule) => rule.selectors.every((selector) => ["own", "pseudo"].includes(buttonTarget(selector))));
    };
    const nodes = root.nodes.filter((node) => node.type !== "comment");
    const flags = nodes.map(isButtonNode);
    const first = flags.indexOf(true);
    const last = flags.lastIndexOf(true);

    expect(flags.slice(first, last + 1).every(Boolean), "button rules are contiguous").toBe(true);
    const leadingComments = [];
    for (let index = root.index(nodes[first]) - 1; index >= 0 && root.nodes[index].type === "comment"; index--) {
      leadingComments.push(root.nodes[index].text);
    }
    expect(leadingComments, "the section starts under its Buttons heading").toContain("Buttons");
  });

  it("gives the default size and each size modifier a font size, padding and minimum height", () => {
    const root = parseModule("components.css");
    for (const selector of [".btn", ...sizes.map((size) => `.${size}`)]) {
      const props = declarations(findRule(root, selector)).map((decl) => decl.prop);
      expect(props, selector).toEqual(expect.arrayContaining(sizeProperties));
    }
    // A size changes only the size, so it keeps the border box of every variant.
    for (const size of sizes) {
      const props = declarations(findRule(root, `.${size}`)).map((decl) => decl.prop);
      expect(props.sort(), `.${size}`).toEqual([...sizeProperties].sort());
    }
  });

  it("gives default, ghost and text buttons the same border box", () => {
    const root = parseModule("components.css");
    const base = declarations(findRule(root, ".btn"));
    expect(base.filter((decl) => isBorderGeometry(decl.prop)).map((decl) => `${decl.prop}: ${decl.value}`)).toEqual(["border: 1px solid transparent"]);

    // Variant rules, including their states, may recolour the border but not resize the box.
    const variantGeometry = [];
    root.walkRules((rule) => {
      const isVariantRule = rule.selectors.some((selector) => buttonTarget(selector) === "own" && modifiersIn(selector).some((modifier) => variants.includes(modifier)));
      if (!isVariantRule) return;
      declarations(rule)
        .filter((decl) => isSizing(decl.prop) || isBorderGeometry(decl.prop))
        .forEach((decl) => variantGeometry.push(`${rule.selector} { ${decl.prop}: ${decl.value} }`));
    });
    expect(variantGeometry).toEqual([]);
  });
});
