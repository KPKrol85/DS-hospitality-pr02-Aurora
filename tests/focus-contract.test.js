import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// Keyboard focus has one indicator: the global :focus-visible outline in base.css, drawn from the
// focus tokens in tokens.css. Bordered form controls use one ring variant instead, and the skip
// link's :focus rule only moves it into view. Any other focus rule may not restyle the control, so
// hover effects stay on :hover and no component draws a focus indicator of its own. :focus-within
// rules style a container rather than the focused control and are outside this contract.
const projectRoot = resolve(import.meta.dirname, "..");
const modulesDir = join(projectRoot, "css/modules");
const moduleNames = readdirSync(modulesDir).filter((entry) => entry.endsWith(".css"));
const focusTokens = ["--focus-color", "--focus-offset", "--focus-ring", "--focus-width"];

// :focus or :focus-visible, but not :focus-within.
const focusPseudo = /:focus(?:-visible)?(?![\w-])/;
const plainFocus = /:focus(?![\w-])/;
const literalColor =
  /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|\b(?:transparent|currentcolor|white|black|red|green|blue|gray|grey|silver|navy|teal|aqua|cyan|orange|yellow|purple)\b/i;

function parseModule(name) {
  return postcss.parse(readFileSync(join(modulesDir, name), "utf8"), { from: name });
}

function declarations(rule) {
  return rule.nodes.filter((node) => node.type === "decl");
}

function where(name, rule, decl) {
  return `${name}:${decl.source.start.line} ${rule.selector.replace(/\s+/g, " ")} { ${decl.prop}: ${decl.value} }`;
}

function isGlobalIndicator(name, rule) {
  return name === "base.css" && rule.selector === ":focus-visible";
}

// Every rule, in any module and media query, with :focus or :focus-visible in one of its selectors.
function focusRules() {
  const rules = [];
  for (const name of moduleNames) {
    parseModule(name).walkRules((rule) => {
      if (rule.selectors.some((selector) => focusPseudo.test(selector))) rules.push({ name, rule });
    });
  }
  return rules;
}

// What a focus rule other than the global indicator may declare: the ring variant (a transparent
// outline, the focus colour on the border, --focus-ring in front of a shadow token), full opacity
// for a control that rests translucent, because opacity fades its outline too, and a
// text-decoration reset.
function isAllowedFocusDeclaration(decl) {
  switch (decl.prop) {
    case "outline-color":
      return decl.value === "transparent";
    case "border-color":
      return decl.value === "var(--focus-color)";
    case "box-shadow":
      return /^var\(--focus-ring\)(?:,\s*var\(--shadow-[\w-]+\))?$/.test(decl.value);
    case "opacity":
      return decl.value === "1";
    case "text-decoration":
      return decl.value === "none";
    default:
      return false;
  }
}

function pageDocument(page) {
  return new DOMParser().parseFromString(readFileSync(join(projectRoot, page), "utf8"), "text/html");
}

describe("keyboard focus contract", () => {
  it("defines the focus tokens once, with a theme colour and theme-independent geometry", () => {
    // Only :root declares focus tokens, so the dark theme cannot change the geometry, and no
    // other token is named after focus.
    const definitions = [];
    const references = new Set();
    for (const name of moduleNames) {
      parseModule(name).walkDecls((decl) => {
        if (/^--.*focus/.test(decl.prop)) definitions.push(`${name} ${decl.parent.selector} ${decl.prop}`);
        for (const match of decl.value.matchAll(/var\((--[\w-]*focus[\w-]*)/g)) references.add(match[1]);
      });
    }
    expect(definitions.sort()).toEqual(focusTokens.map((token) => `tokens.css :root ${token}`));
    expect([...references].filter((token) => !focusTokens.includes(token)), "references to undefined focus tokens").toEqual([]);

    const tokens = parseModule("tokens.css");
    const valueOf = (selector, prop) => {
      let value;
      tokens.walkRules((rule) => {
        if (rule.selector !== selector) return;
        declarations(rule)
          .filter((decl) => decl.prop === prop)
          .forEach((decl) => (value = decl.value));
      });
      return value;
    };
    // The colour follows a theme token that the dark theme redefines.
    const colorSource = valueOf(":root", "--focus-color").match(/^var\((--[\w-]+)\)$/)?.[1];
    expect(colorSource, "--focus-color refers to one theme token").toBeTruthy();
    expect(valueOf('[data-theme="dark"]', colorSource), `the dark theme redefines ${colorSource}`).toBeDefined();
    expect(valueOf(":root", "--focus-width")).toMatch(/^\d+(?:\.\d+)?px$/);
    expect(valueOf(":root", "--focus-offset")).toMatch(/^\d+(?:\.\d+)?px$/);
    expect(valueOf(":root", "--focus-ring")).toContain("var(--focus-color)");
  });

  it("draws the global :focus-visible indicator from the focus tokens", () => {
    const rules = [];
    parseModule("base.css").walkRules((rule) => {
      if (isGlobalIndicator("base.css", rule)) rules.push(rule);
    });
    expect(rules).toHaveLength(1);
    expect(rules[0].parent.type).toBe("root");

    const values = Object.fromEntries(declarations(rules[0]).map((decl) => [decl.prop, decl.value]));
    expect(Object.keys(values).sort()).toEqual(["outline", "outline-offset"]);
    expect(values.outline.split(/\s+/).sort()).toEqual(["solid", "var(--focus-color)", "var(--focus-width)"]);
    expect(values["outline-offset"]).toBe("var(--focus-offset)");
  });

  it("draws outlines only with the focus tokens and never removes them", () => {
    // outline: none would leave the ring variant without an indicator in forced-colors mode, which
    // drops box shadows; the variant makes the outline transparent instead.
    const offsets = [];
    const other = [];
    for (const name of moduleNames) {
      parseModule(name).walkDecls(/^outline/, (decl) => {
        const rule = decl.parent;
        if (decl.prop === "outline-offset") {
          offsets.push(decl);
          if (decl.value !== "var(--focus-offset)") other.push(where(name, rule, decl));
        } else if (decl.prop === "outline-color") {
          if (!["transparent", "var(--focus-color)"].includes(decl.value)) other.push(where(name, rule, decl));
        } else if (!isGlobalIndicator(name, rule)) {
          other.push(where(name, rule, decl));
        }
      });
    }
    expect(offsets.length).toBeGreaterThan(0);
    expect(other).toEqual([]);
  });

  it("lets focus rules draw only the indicator, on :focus-visible", () => {
    const violations = [];
    for (const { name, rule } of focusRules()) {
      if (isGlobalIndicator(name, rule)) continue;
      // The skip link is revealed on any focus, including focus moved by script.
      const isSkipLinkReveal = rule.selectors.length === 1 && rule.selectors[0] === ".skip-link:focus";
      if (!isSkipLinkReveal && rule.selectors.some((selector) => plainFocus.test(selector))) {
        violations.push(`${name}:${rule.source.start.line} ${rule.selector} uses :focus instead of :focus-visible`);
      }
      declarations(rule)
        .filter((decl) => !(isSkipLinkReveal && decl.prop === "transform"))
        .filter((decl) => !isAllowedFocusDeclaration(decl))
        .forEach((decl) => violations.push(where(name, rule, decl)));
    }
    expect(violations).toEqual([]);
  });

  it("keeps literal colours out of focus rules", () => {
    const literals = [];
    for (const { name, rule } of focusRules()) {
      declarations(rule)
        // The ring variant hides the outline, except in forced-colors mode.
        .filter((decl) => !(decl.prop === "outline-color" && decl.value === "transparent"))
        .filter((decl) => literalColor.test(decl.value))
        .forEach((decl) => literals.push(where(name, rule, decl)));
    }
    expect(literals).toEqual([]);

    // The fixed focus colours of the footer links and contact form fields, which ignored the theme.
    const css = moduleNames.map((name) => readFileSync(join(modulesDir, name), "utf8").replace(/\s+/g, "")).join("\n");
    expect(css).not.toContain("rgba(111,209,255,0.55)");
    expect(css).not.toContain("rgba(15,109,140,0.22)");
  });

  it("gives the bordered form controls the ring variant and the checkbox the global outline", () => {
    const rules = focusRules().filter(({ name, rule }) => !isGlobalIndicator(name, rule));
    const focusDeclarationsFor = (element) => {
      const props = new Set();
      for (const { rule } of rules) {
        const matches = rule.selectors.some((selector) => {
          const target = selector.replace(/:focus-visible/g, "");
          return focusPseudo.test(selector) && target.trim() !== "" && element.matches(target);
        });
        if (matches) declarations(rule).forEach((decl) => props.add(decl.prop));
      }
      return [...props].sort();
    };

    const controls = [];
    let checkboxes = 0;
    for (const page of ["contact.html", "tours.html"]) {
      const document = pageDocument(page);
      document.querySelectorAll(".form__field :is(input, select, textarea):not([type='hidden']), .filters__select").forEach((element) => {
        const name = `${page} ${element.tagName.toLowerCase()}[${element.getAttribute("type") || element.className}]`;
        if (element.matches("[type='checkbox']")) {
          checkboxes += 1;
          expect(focusDeclarationsFor(element), `${name} keeps the global outline`).toEqual([]);
        } else {
          controls.push(name);
          expect(focusDeclarationsFor(element), `${name} uses the ring variant`).toEqual(["border-color", "box-shadow", "outline-color"]);
        }
      });
    }
    expect(controls.length).toBeGreaterThan(0);
    expect(checkboxes).toBeGreaterThan(0);
  });

  it("keeps the hover lift of buttons off keyboard focus", () => {
    const lifts = [];
    parseModule("components.css").walkRules((rule) => {
      const moves = declarations(rule).some((decl) => decl.prop === "transform");
      if (moves && rule.selectors.some((selector) => /\.btn(?:--[\w-]+)?:hover/.test(selector))) lifts.push(rule);
    });
    expect(lifts.length, "buttons keep their hover lift").toBeGreaterThan(0);
    for (const rule of lifts) {
      expect(rule.selectors.filter((selector) => focusPseudo.test(selector)), rule.selector).toEqual([]);
    }
  });
});
