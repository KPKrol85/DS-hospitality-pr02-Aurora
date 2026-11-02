import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initNav } from "../js/features/nav.js";
import { mountFromPage } from "./helpers.js";

describe("mobile navigation", () => {
  let toggle;
  let links;
  let mediaQuery;
  let documentListeners;

  beforeEach(() => {
    // The whole header, so the focus order around the toggle is the page's own.
    mountFromPage("index.html", "[data-header]");
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

  // jsdom has no sequential focus navigation, so a Tab the module leaves alone moves focus here
  // as a browser would: to the adjacent link or button of the header.
  function pressTab(shiftKey = false) {
    const event = pressKey("Tab", shiftKey);
    if (!event.defaultPrevented) {
      const order = Array.from(document.querySelectorAll("[data-header] a[href], [data-header] button"));
      order[order.indexOf(document.activeElement) + (shiftKey ? -1 : 1)]?.focus();
    }
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

  // The prevented steps are the module's focus trap; the others are emulated by pressTab().
  it("moves focus on Tab from the last link to the toggle and then to the first link", () => {
    openNav();
    links.at(-1).focus();

    expect(pressTab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(toggle);

    expect(pressTab().defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(links[0]);
  });

  it("moves focus on Shift+Tab from the first link to the toggle and then to the last link", () => {
    openNav();

    expect(pressTab(true).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(toggle);

    expect(pressTab(true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(links.at(-1));
  });

  it("closes on toggle activation from the focus cycle and keeps focus on the toggle", () => {
    openNav();
    links.at(-1).focus();
    pressTab();

    // Enter and Space on the native button arrive as a click.
    toggle.click();

    expectClosed();
    expect(document.activeElement).toBe(toggle);
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
