import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initNav } from "../js/features/nav.js";
import { mountFromPage } from "./helpers.js";

describe("mobile navigation", () => {
  let toggle;
  let links;
  let mediaQuery;
  let documentListeners;

  beforeEach(() => {
    mountFromPage("index.html", "[data-nav-toggle]", "[data-nav]");
    toggle = document.querySelector("[data-nav-toggle]");
    links = Array.from(document.querySelectorAll("[data-nav] a[href]"));
    mediaQuery = new EventTarget();
    mediaQuery.matches = false;
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));
    documentListeners = vi.spyOn(document, "addEventListener");
    initNav();
  });

  afterEach(() => {
    // Removing the fixture alone does not remove initNav's document keydown handler.
    for (const [type, listener, options] of documentListeners.mock.calls) {
      document.removeEventListener(type, listener, options);
    }
    document.body.style.overflow = "";
  });

  function openNav() {
    // Programmatic click() does not focus the toggle in jsdom.
    toggle.focus();
    toggle.click();
  }

  function pressKey(key, shiftKey = false) {
    const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
    document.activeElement.dispatchEvent(event);
    return event;
  }

  function expectClosed() {
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
  }

  it("expands on toggle click, focuses the first link and locks scrolling", () => {
    expectClosed();

    openNav();

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(links[0]);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it.each([false, true])("wraps focus at the Tab boundary (shiftKey=%s)", (shiftKey) => {
    openNav();
    const first = links[0];
    const last = links.at(-1);
    (shiftKey ? first : last).focus();

    // Only the explicit focus trap is tested, not native browser Tab traversal.
    const event = pressKey("Tab", shiftKey);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(shiftKey ? last : first);
  });

  it("closes on Escape, unlocks scrolling and restores focus to the toggle", () => {
    openNav();
    links.at(-1).focus();

    pressKey("Escape");

    expectClosed();
    expect(document.activeElement).toBe(toggle);
  });

  it("closes on a navigation link click", () => {
    openNav();
    const link = links[1];
    // Keep the maintained href without asking jsdom to load another page.
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    link.focus();

    link.click();

    expectClosed();
    expect(document.activeElement).toBe(toggle);
  });

  it("closes when the desktop media query starts matching", () => {
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 900px)");
    openNav();

    mediaQuery.matches = true;
    mediaQuery.dispatchEvent(new Event("change"));

    expectClosed();
    links.at(-1).focus();
    expect(pressKey("Tab").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(links.at(-1));
  });
});
