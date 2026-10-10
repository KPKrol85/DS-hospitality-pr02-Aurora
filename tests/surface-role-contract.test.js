import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// Every surface takes the material of its role (Material roles in tokens.css). Editorial blocks sit on
// their ground with no shadow and no raised or overlay surface; interactive surfaces rest on
// --bg-elev with --shadow-raised; overlays use --bg-overlay with --shadow-overlay; and bordered form
// controls rest without a shadow, on a --border-control edge, so the focus ring is their only shadow.
// Both theme editions define the role shadows, so the dark edition never falls back to the light
// edition's navy values, which barely register on its ground.
const modulesDir = resolve(import.meta.dirname, "../css/modules");

const editorial = [
  ["components.css", ".feature-card"],
  ["components.css", ".testimonials"],
  ["layout.css", ".section--muted"],
  ["sections.css", ".cta"],
  ["subpages.css", ".tours-empty"],
  ["subpages.css", ".data-state"],
  ["subpages.css", ".tour-detail"],
  ["subpages.css", ".contact-grid__inner > article"],
  ["subpages.css", ".about-values > li"],
  ["subpages.css", ".about-highlight"],
  ["subpages.css", ".utility-page__card"],
  ["legal.css", ".legal"],
  ["legal.css", ".legal__toc"],
];
const interactive = [
  ["components.css", ".tour-card"],
  ["components.css", ".testimonials__icon"],
  ["subpages.css", ".contact-grid__inner > article:has(> .form)"],
];
const overlays = [
  ["layout.css", ".nav"],
  ["components.css", ".project-notice__inner"],
  ["components.css", ".sw-update-banner"],
];
const controls = [
  ["components.css", ".form__field input"],
  ["components.css", ".form__field select"],
  ["components.css", ".form__field textarea"],
  ["components.css", ".filters__select"],
];

function parseModule(module) {
  return postcss.parse(readFileSync(join(modulesDir, module), "utf8"), { from: module });
}

function inPrint(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && parent.name === "media" && /\bprint\b/.test(parent.params)) return true;
  }
  return false;
}

// The rules whose selector list contains the selector: only the top-level ones for the resting
// state, or every rule outside print styles.
function rulesFor(module, selector, { topLevelOnly }) {
  const rules = [];
  parseModule(module).walkRules((rule) => {
    if (!rule.selectors.includes(selector) || inPrint(rule)) return;
    if (topLevelOnly && rule.parent.type !== "root") return;
    rules.push(rule);
  });
  return rules;
}

function restingDeclarations(module, selector) {
  const declarations = {};
  for (const rule of rulesFor(module, selector, { topLevelOnly: true })) {
    rule.walkDecls((decl) => {
      declarations[decl.prop] = decl.value;
    });
  }
  return declarations;
}

function where(module, decl) {
  return `${module}:${decl.source.start.line} ${decl.parent.selector.replace(/\s+/g, " ")} { ${decl.prop}: ${decl.value} }`;
}

describe("surface role contract", () => {
  it("defines the role shadows in both theme editions and the control edge once", () => {
    const light = restingDeclarations("tokens.css", ":root");
    const dark = restingDeclarations("tokens.css", '[data-theme="dark"]');
    for (const token of ["--shadow-raised", "--shadow-overlay"]) {
      expect(light[token], `light ${token}`).toBeTruthy();
      expect(dark[token], `dark ${token}`).toBeTruthy();
      expect(dark[token], `dark ${token} differs from light`).not.toBe(light[token]);
    }
    expect(light["--border-control"]).toContain("var(--muted)");
  });

  it("keeps editorial surfaces flat: no shadow and no raised or overlay surface", () => {
    const violations = [];
    for (const [module, selector] of editorial) {
      const rules = rulesFor(module, selector, { topLevelOnly: false });
      expect(rules.length, `${module} ${selector}`).toBeGreaterThan(0);
      for (const rule of rules) {
        rule.walkDecls((decl) => {
          const shadow = decl.prop === "box-shadow" && decl.value !== "none";
          const raised = /^background/.test(decl.prop) && /var\(--bg-(elev|overlay)\)/.test(decl.value);
          if (shadow || raised) violations.push(where(module, decl));
        });
      }
    }
    expect(violations).toEqual([]);
  });

  it("raises interactive surfaces with --bg-elev and --shadow-raised", () => {
    for (const [module, selector] of interactive) {
      const declarations = restingDeclarations(module, selector);
      expect(declarations.background, selector).toBe("var(--bg-elev)");
      expect(declarations["box-shadow"], selector).toBe("var(--shadow-raised)");
    }
  });

  it("separates overlays with --bg-overlay, a hairline and --shadow-overlay", () => {
    for (const [module, selector] of overlays) {
      const declarations = restingDeclarations(module, selector);
      expect(declarations.background, selector).toBe("var(--bg-overlay)");
      expect(declarations.border, selector).toBe("1px solid var(--border)");
      expect(declarations["box-shadow"], selector).toBe("var(--shadow-overlay)");
    }
  });

  it("rests bordered form controls on the control edge without a shadow", () => {
    for (const [module, selector] of controls) {
      const declarations = restingDeclarations(module, selector);
      expect(declarations.border, selector).toBe("1px solid var(--border-control)");
      expect(declarations["box-shadow"], selector).toBeUndefined();
    }
  });
});
