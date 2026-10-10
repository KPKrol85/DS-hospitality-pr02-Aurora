import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// The action colour pairs a solid background, --action-bg, with the label colour --action-fg. The
// default button, the active gallery filter and the skip link paint their labels with this pair
// instead of white on the brand gradient, whose light end left labels below 4.5:1. Both theme
// editions define the pair as opaque colours, so its token values are the rendered colours and
// must reach 4.5:1, the WCAG 2.x ratio for normal-size text.
const modulesDir = resolve(import.meta.dirname, "../css/modules");
const consumers = [
  ["components.css", ".btn"],
  ["subpages.css", ".gallery-filter.is-active"],
  ["utilities.css", ".skip-link"],
];

// The merged declarations of the top-level rules with exactly the given selector in a CSS module.
function ruleDeclarations(module, selector) {
  const declarations = {};
  const css = readFileSync(join(modulesDir, module), "utf8");
  postcss.parse(css, { from: module }).walkRules((rule) => {
    if (rule.parent.type !== "root" || rule.selector !== selector) return;
    rule.walkDecls((decl) => {
      declarations[decl.prop] = decl.value;
    });
  });
  return declarations;
}

// WCAG 2.x relative luminance of an opaque #rrggbb colour.
function luminance(hex) {
  const channels = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i).slice(1);
  const [r, g, b] = channels.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("action colour contract", () => {
  it("pairs an opaque action background and label colour at 4.5:1 or more in both theme editions", () => {
    const light = ruleDeclarations("tokens.css", ":root");
    const darkOverrides = ruleDeclarations("tokens.css", '[data-theme="dark"]');
    expect(Object.keys(darkOverrides), "the dark edition redefines the pair").toEqual(expect.arrayContaining(["--action-bg", "--action-fg"]));

    for (const [theme, tokens] of Object.entries({ light, dark: { ...light, ...darkOverrides } })) {
      const background = tokens["--action-bg"];
      const label = tokens["--action-fg"];
      expect(background, `${theme} --action-bg`).toMatch(/^#[\da-f]{6}$/i);
      expect(label, `${theme} --action-fg`).toMatch(/^#[\da-f]{6}$/i);
      expect(contrast(background, label), theme).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("paints the default button, the active gallery filter and the skip link with the action pair", () => {
    for (const [module, selector] of consumers) {
      const declarations = ruleDeclarations(module, selector);
      expect(declarations.background, selector).toBe("var(--action-bg)");
      expect(declarations.color, selector).toBe("var(--action-fg)");
    }
  });
});
