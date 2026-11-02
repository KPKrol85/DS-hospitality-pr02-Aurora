import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initAccordionFaq } from "../js/features/accordion-faq.js";
import { mountFromPage } from "./helpers.js";

const componentsCss = postcss.parse(readFileSync(resolve(import.meta.dirname, "../css/modules/components.css"), "utf8"));

// jsdom applies no stylesheet, so visibility follows the hidden attribute of the element and its
// ancestors, as the global [hidden] rule does in the browser.
function isShown(element) {
  return element.closest("[hidden]") === null;
}

// The rules of components.css in source order, as [selector, declarations] for each selector.
function cssRules() {
  const rules = [];
  componentsCss.walkRules((rule) => {
    const declarations = Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((decl) => [decl.prop, decl.value]));
    rule.selectors.forEach((selector) => rules.push([selector, declarations]));
  });
  return rules;
}

describe("FAQ accordion on about.html", () => {
  let accordion;
  let buttons;
  let panels;

  beforeEach(() => {
    mountFromPage("about.html", "[data-accordion]");
    accordion = document.querySelector("[data-accordion]");
    buttons = Array.from(accordion.querySelectorAll("button"));
    panels = buttons.map((button) => document.getElementById(button.getAttribute("aria-controls")));
  });

  function expectExpanded(index, expanded) {
    expect(buttons[index].getAttribute("aria-expanded")).toBe(String(expanded));
    expect(isShown(panels[index])).toBe(expanded);
  }

  it("ships every answer open and labelled by its question, so it reads without JavaScript", () => {
    expect(buttons).toHaveLength(4);
    buttons.forEach((button, index) => {
      const panel = panels[index];

      expect(panel, `${button.id} controls no panel`).not.toBeNull();
      expect(accordion.contains(panel)).toBe(true);
      expect(panel.getAttribute("role")).toBe("region");
      expect(panel.getAttribute("aria-labelledby")).toBe(button.id);
      expect(panel.textContent.trim()).not.toBe("");
      expectExpanded(index, true);
    });
    expect(accordion.hasAttribute("data-accordion-ready")).toBe(false);
    // The demonstration disclosure and the contact links are part of the static answers.
    expect(panels[0].textContent).toContain("Aurora Travel to fikcyjna marka");
    expect(Array.from(panels[3].querySelectorAll("a"), (link) => link.getAttribute("href"))).toEqual(["contact.html", "mailto:kontakt@kp-code.pl"]);
  });

  it("shows the expand indicator, pointer cursor and hover colour only once the accordion is ready", () => {
    const rules = cssRules();
    const selectors = rules.map(([selector]) => selector);
    const declarationsOf = (selector) => rules.find(([candidate]) => candidate === selector)?.[1];

    expect(declarationsOf(".accordion:not([data-accordion-ready]) button")).toEqual({ cursor: "default" });
    expect(declarationsOf(".accordion:not([data-accordion-ready]) button::after")).toEqual({ content: "none" });
    // Same specificity as the expanded indicator, so the readiness rule must follow it.
    expect(selectors.indexOf(".accordion:not([data-accordion-ready]) button::after")).toBeGreaterThan(selectors.indexOf('.accordion button[aria-expanded="true"]::after'));
    expect(selectors.filter((selector) => selector.startsWith(".accordion") && selector.includes(":hover"))).toEqual([".accordion[data-accordion-ready] button:hover"]);
  });

  it("collapses every answer and marks the accordion ready once initialized", () => {
    initAccordionFaq();

    buttons.forEach((_button, index) => expectExpanded(index, false));
    expect(accordion.hasAttribute("data-accordion-ready")).toBe(true);
  });

  it("toggles each answer independently from its question", () => {
    initAccordionFaq();

    // Enter and Space activate a native button through the same click event.
    buttons[1].click();
    expectExpanded(1, true);
    [0, 2, 3].forEach((index) => expectExpanded(index, false));

    buttons[3].click();
    expectExpanded(1, true);
    expectExpanded(3, true);

    buttons[1].click();
    expectExpanded(1, false);
    expectExpanded(3, true);
  });

  it("keeps the questions as focusable native buttons inside their headings", () => {
    initAccordionFaq();

    buttons.forEach((button) => {
      expect(button.type).toBe("button");
      expect(button.parentElement.localName).toBe("h3");
      expect(button.hasAttribute("tabindex")).toBe(false);
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  it("leaves every answer open and the accordion unmarked when the click handler cannot be attached", () => {
    const error = new Error("Listener failed");
    vi.spyOn(accordion, "addEventListener").mockImplementation(() => {
      throw error;
    });

    expect(() => initAccordionFaq()).toThrow(error);

    buttons.forEach((_button, index) => expectExpanded(index, true));
    expect(accordion.hasAttribute("data-accordion-ready")).toBe(false);
  });
});
