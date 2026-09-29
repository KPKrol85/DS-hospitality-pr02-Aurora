import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// Browsers give native controls their own typography instead of inheriting it (Chromium: 13.33 px
// Arial with line-height: normal, and a monospace font in textareas and date inputs). One base rule
// makes button, input, select and textarea inherit the font family, size and line height of their
// context, so component rules set only intentional differences, such as the accordion's heading font.
const modulesDir = resolve(import.meta.dirname, "../css/modules");
const controls = ["button", "input", "select", "textarea"];
const inheritedProperties = ["font-family", "font-size", "line-height"];

function parseModule(name) {
  return postcss.parse(readFileSync(join(modulesDir, name), "utf8"), { from: name });
}

function isBaseControlRule(rule) {
  return rule.selectors.some((selector) => controls.includes(selector));
}

describe("native control typography", () => {
  it("is inherited through one top-level rule in base.css", () => {
    const rules = [];
    parseModule("base.css").walkRules((rule) => {
      if (isBaseControlRule(rule)) rules.push(rule);
    });

    expect(rules).toHaveLength(1);
    const [rule] = rules;
    expect(rule.parent.type).toBe("root");
    expect([...rule.selectors].sort()).toEqual([...controls].sort());
    // Only these three properties: the font shorthand would also pass the weight, style and other
    // font properties of the surrounding text on to every control.
    expect(rule.nodes.filter((node) => node.type === "decl").map((decl) => `${decl.prop}: ${decl.value}`)).toEqual(
      inheritedProperties.map((property) => `${property}: inherit`)
    );
  });

  it("is not restored again by component rules", () => {
    // A local copy only repeats the base rule.
    const localCopies = [];
    for (const name of readdirSync(modulesDir).filter((entry) => entry.endsWith(".css"))) {
      parseModule(name).walkDecls((decl) => {
        const restoresInheritance = decl.value.trim() === "inherit" && ["font", ...inheritedProperties].includes(decl.prop);
        const inBaseRule = name === "base.css" && decl.parent.type === "rule" && isBaseControlRule(decl.parent);
        if (restoresInheritance && !inBaseRule) {
          localCopies.push(`${name}:${decl.source.start.line} ${decl.parent.selector} { ${decl.prop}: ${decl.value} }`);
        }
      });
    }

    expect(localCopies).toEqual([]);
  });
});
