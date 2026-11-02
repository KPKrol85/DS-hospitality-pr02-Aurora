import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTabs } from "../js/features/tabs.js";
import { mountFromPage } from "./helpers.js";

const componentsCss = postcss.parse(readFileSync(resolve(import.meta.dirname, "../css/modules/components.css"), "utf8"));

// jsdom applies no stylesheet, so visibility follows the hidden attribute of the element and its
// ancestors, as the global [hidden] rule does in the browser.
function isShown(element) {
  return element.closest("[hidden]") === null;
}

function declarationsOf(selector) {
  let declarations;
  componentsCss.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      declarations = Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((decl) => [decl.prop, decl.value]));
    }
  });
  return declarations;
}

describe("testimonial tabs on index.html", () => {
  let group;
  let tabs;
  let panels;

  beforeEach(() => {
    mountFromPage("index.html", "[data-tabs]");
    group = document.querySelector("[data-tabs]");
    tabs = Array.from(group.querySelectorAll('[role="tab"]'));
    panels = Array.from(group.querySelectorAll('[role="tabpanel"]'));
  });

  function expectSelected(index) {
    tabs.forEach((tab, tabIndex) => {
      expect(tab.getAttribute("aria-selected")).toBe(String(tabIndex === index));
      expect(tab.getAttribute("tabindex")).toBe(tabIndex === index ? "0" : "-1");
    });
    panels.forEach((panel, panelIndex) => expect(isShown(panel)).toBe(panelIndex === index));
  }

  function pressKey(key) {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    document.activeElement.dispatchEvent(event);
    return event;
  }

  it("ships every testimonial visible and in order, so they read without JavaScript", () => {
    expect(tabs).toHaveLength(3);
    expect(panels).toHaveLength(3);
    panels.forEach((panel) => expect(isShown(panel)).toBe(true));
    expect(panels.map((panel) => panel.querySelector(".testimonials__author").textContent)).toEqual(["Anna i Tomasz", "Marta", "Rodzina Kowalskich"]);
    tabs.forEach((tab, index) => {
      expect(tab.getAttribute("aria-controls")).toBe(panels[index].id);
      expect(panels[index].getAttribute("aria-labelledby")).toBe(tab.id);
    });
    expect(group.hasAttribute("data-tabs-ready")).toBe(false);
  });

  it("hides the tab list and spaces the stacked testimonials until the tabs are ready", () => {
    expect(group.querySelector('[role="tablist"]').classList.contains("tabs__list")).toBe(true);
    expect(declarationsOf("[data-tabs]:not([data-tabs-ready]) .tabs__list")).toEqual({ display: "none" });
    expect(declarationsOf("[data-tabs]:not([data-tabs-ready]) .tabs__panel + .tabs__panel")).toEqual({ "margin-top": "var(--space-6)" });
  });

  it("selects the first tab, shows only its panel and marks the group ready once initialized", () => {
    initTabs();

    expectSelected(0);
    expect(group.hasAttribute("data-tabs-ready")).toBe(true);
  });

  it("starts from the tab that the markup selects", () => {
    tabs[0].setAttribute("aria-selected", "false");
    tabs[2].setAttribute("aria-selected", "true");

    initTabs();

    expectSelected(2);
  });

  it("selects a tab and its panel on click", () => {
    initTabs();

    tabs[1].click();
    expectSelected(1);

    tabs[2].click();
    expectSelected(2);
  });

  it("moves focus and selection with the arrow keys, wrapping at both ends", () => {
    initTabs();
    tabs[0].focus();

    expect(pressKey("ArrowRight").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[1]);
    expectSelected(1);

    pressKey("ArrowRight");
    expect(pressKey("ArrowRight").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[0]);
    expectSelected(0);

    expect(pressKey("ArrowLeft").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs[2]);
    expectSelected(2);
  });

  it("leaves other keys to the browser", () => {
    initTabs();
    tabs[0].focus();

    ["Tab", "Enter", "ArrowDown", "Home"].forEach((key) => {
      expect(pressKey(key).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(tabs[0]);
      expectSelected(0);
    });
  });

  it("keeps every testimonial visible and the group unmarked when a tab handler cannot be attached", () => {
    const error = new Error("Listener failed");
    vi.spyOn(tabs[2], "addEventListener").mockImplementation(() => {
      throw error;
    });

    expect(() => initTabs()).toThrow(error);

    panels.forEach((panel) => expect(isShown(panel)).toBe(true));
    expect(group.hasAttribute("data-tabs-ready")).toBe(false);
  });
});
