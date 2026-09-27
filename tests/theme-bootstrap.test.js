import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initThemeToggle } from "../js/features/theme.js";
import { mountFromPage } from "./helpers.js";

// Every maintained page applies the theme with an inline bootstrap in its head, which has to run
// while the page is parsed, before the stylesheet, so that the first paint uses the theme.
// _headers approves one hash per textual variant of the bootstrap, and each test runs every variant.
const projectRoot = resolve(import.meta.dirname, "..");
const pages = readdirSync(projectRoot)
  .filter((entry) => entry.endsWith(".html"))
  .sort();

const STORAGE_KEY = "kp-travel-theme";
const BACKGROUNDS = { light: "rgb(248, 247, 242)", dark: "rgb(5, 6, 10)" };

function readPage(page) {
  return readFileSync(resolve(projectRoot, page), "utf8");
}

function inlineScripts(document) {
  return Array.from(document.scripts).filter(
    (script) => !script.hasAttribute("src") && script.type.toLowerCase() !== "application/ld+json"
  );
}

// The distinct bootstrap texts, each with the first page that contains it.
function bootstrapVariants() {
  const variants = new Map();
  for (const page of pages) {
    const [bootstrap] = inlineScripts(new DOMParser().parseFromString(readPage(page), "text/html"));
    if (!variants.has(bootstrap.textContent)) {
      variants.set(bootstrap.textContent, page);
    }
  }
  return Array.from(variants, ([text, page]) => ({ text, page }));
}

// A matchMedia stand-in that reports the given system color scheme.
function systemPreference(scheme) {
  return (query) => ({ media: query, matches: query === "(prefers-color-scheme: dark)" && scheme === "dark" });
}

// Parses a maintained page with its inline scripts enabled, as the browser loads it, and returns
// the state the bootstrap leaves on <html>. jsdom fetches no external script and never executes
// JSON-LD, so the bootstrap is the only code that runs.
function loadPage(page, { stored = null, storage = "available", system = null }) {
  let stylesheetParsed = null;

  const dom = new JSDOM(readPage(page), {
    url: `https://aurora.test/${page}`,
    runScripts: "dangerously",
    beforeParse(window) {
      if (storage === "unavailable") {
        // Browsers that block site data throw on the first access to localStorage.
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new window.DOMException("The operation is insecure.", "SecurityError");
          },
        });
      } else {
        window.localStorage.clear();
        if (stored !== null) window.localStorage.setItem(STORAGE_KEY, stored);
      }
      if (system !== null) {
        window.matchMedia = systemPreference(system);
      }

      // Records whether the parser had reached the stylesheet when the theme was applied.
      const { setAttribute } = window.Element.prototype;
      window.Element.prototype.setAttribute = function (name, value) {
        if (this === window.document.documentElement && name === "data-theme") {
          stylesheetParsed = window.document.querySelector('link[rel="stylesheet"]') !== null;
        }
        return setAttribute.call(this, name, value);
      };
    },
  });

  const root = dom.window.document.documentElement;
  const state = {
    theme: root.getAttribute("data-theme"),
    jsClass: root.classList.contains("js"),
    background: root.style.backgroundColor,
    colorScheme: root.style.colorScheme,
    stylesheetParsed,
  };
  dom.window.close();
  return state;
}

describe("theme bootstrap", () => {
  it("is the one inline script of every page, in the head before any stylesheet or external script", () => {
    for (const page of pages) {
      const document = new DOMParser().parseFromString(readPage(page), "text/html");
      const scripts = inlineScripts(document);
      expect(scripts, page).toHaveLength(1);

      const [bootstrap] = scripts;
      expect(bootstrap.parentElement, page).toBe(document.head);
      // A classic inline script runs as soon as the parser reaches it; nothing is fetched first.
      expect(bootstrap.type, page).toBe("");
      expect(document.querySelector('link[rel="stylesheet"]'), page).not.toBeNull();
      const loadedBefore = Array.from(document.querySelectorAll('link[rel="stylesheet"], script[src]')).filter(
        (element) => element.compareDocumentPosition(bootstrap) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      expect(loadedBefore, page).toEqual([]);
    }
  });

  it.each([
    { name: "a stored light theme over a dark system preference", stored: "light", system: "dark", expected: "light" },
    { name: "a stored dark theme over a light system preference", stored: "dark", system: "light", expected: "dark" },
    { name: "the dark system preference when no theme is stored", system: "dark", expected: "dark" },
    { name: "the light system preference when no theme is stored", system: "light", expected: "light" },
    { name: "the system preference when localStorage is unavailable", storage: "unavailable", system: "dark", expected: "dark" },
  ])("applies $name while the page is parsed, before the stylesheet", ({ expected, ...conditions }) => {
    for (const { page } of bootstrapVariants()) {
      expect(loadPage(page, conditions), page).toEqual({
        theme: expected,
        jsClass: true,
        background: BACKGROUNDS[expected],
        colorScheme: expected,
        stylesheetParsed: false,
      });
    }
  });

  describe("followed by the theme toggle", () => {
    afterEach(() => {
      const root = document.documentElement;
      root.removeAttribute("data-theme");
      root.removeAttribute("style");
      root.classList.remove("js");
      document.body.removeAttribute("style");
    });

    // Runs a bootstrap in the test document, then initializes the toggle copied from its page.
    function bootstrapWithToggle({ text, page }) {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.removeAttribute("style");
      document.body.replaceChildren();
      new Function(text)();
      mountFromPage(page, "[data-theme-toggle]");
      initThemeToggle();
      return document.querySelector("[data-theme-toggle]");
    }

    function currentTheme() {
      const root = document.documentElement;
      const theme = root.getAttribute("data-theme");
      expect(root.style.backgroundColor).toBe(BACKGROUNDS[theme]);
      expect(document.body.style.backgroundColor).toBe(BACKGROUNDS[theme]);
      return theme;
    }

    it("switches and stores the theme that the bootstrap applied", () => {
      vi.stubGlobal("matchMedia", systemPreference("dark"));

      for (const variant of bootstrapVariants()) {
        localStorage.clear();
        const toggle = bootstrapWithToggle(variant);
        expect(currentTheme(), variant.page).toBe("dark");

        toggle.click();
        expect(currentTheme(), variant.page).toBe("light");
        expect(localStorage.getItem(STORAGE_KEY)).toBe("light");

        toggle.click();
        expect(currentTheme(), variant.page).toBe("dark");
        expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
      }
    });

    it("keeps switching when localStorage is unavailable", () => {
      const unavailable = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      };
      vi.stubGlobal("localStorage", { getItem: unavailable, setItem: unavailable });
      vi.stubGlobal("matchMedia", systemPreference("light"));

      for (const variant of bootstrapVariants()) {
        const toggle = bootstrapWithToggle(variant);
        expect(currentTheme(), variant.page).toBe("light");

        toggle.click();
        expect(currentTheme(), variant.page).toBe("dark");

        toggle.click();
        expect(currentTheme(), variant.page).toBe("light");
      }
    });
  });
});
