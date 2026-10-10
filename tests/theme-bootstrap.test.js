import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import postcss from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initThemeToggle } from "../js/features/theme.js";
import { mountFromPage } from "./helpers.js";

// Every maintained page applies the theme with an inline bootstrap in its head, which has to run
// while the page is parsed, before the stylesheet, so that the first paint uses the theme.
// _headers approves one hash per textual variant of the bootstrap, and each test runs every variant.
// After initialization the theme tokens of the stylesheet own the presentation: the toggle only
// sets data-theme and removes the bootstrap's inline first-paint styles.
const projectRoot = resolve(import.meta.dirname, "..");
const pages = readdirSync(projectRoot)
  .filter((entry) => entry.endsWith(".html"))
  .sort();

const STORAGE_KEY = "kp-travel-theme";
const BACKGROUNDS = { light: "rgb(248, 247, 242)", dark: "rgb(11, 22, 40)" };

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

// The merged declarations of the top-level rules with exactly the given selector in a CSS module.
function ruleDeclarations(module, selector) {
  const declarations = {};
  const css = readFileSync(resolve(projectRoot, "css/modules", module), "utf8");
  postcss.parse(css, { from: module }).walkRules((rule) => {
    if (rule.parent.type !== "root" || rule.selector !== selector) return;
    rule.walkDecls((decl) => {
      declarations[decl.prop] = decl.value;
    });
  });
  return declarations;
}

// A color as an inline style serializes it, such as rgb(248, 247, 242) for #f8f7f2.
function serializedColor(value) {
  const probe = document.createElement("div");
  probe.style.backgroundColor = value;
  return probe.style.backgroundColor;
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

  it("paints the first frame with the theme tokens that own the presentation after initialization", () => {
    const rootTokens = ruleDeclarations("tokens.css", ":root");
    const themeTokens = {
      light: ruleDeclarations("tokens.css", '[data-theme="light"]'),
      dark: ruleDeclarations("tokens.css", '[data-theme="dark"]'),
    };

    expect(rootTokens["background-color"]).toBe("var(--bg)");
    expect(ruleDeclarations("base.css", "body")["background-color"]).toBe("var(--bg)");
    for (const theme of ["light", "dark"]) {
      expect(themeTokens[theme]["color-scheme"], theme).toBe(theme);
      // The handover from the bootstrap's inline styles to the tokens keeps the background.
      const bg = themeTokens[theme]["--bg"] ?? rootTokens["--bg"];
      expect(serializedColor(bg), theme).toBe(BACKGROUNDS[theme]);
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

    // Runs a bootstrap in the test document, checks the first-paint styles it leaves inline, runs
    // `beforeInit`, then initializes the toggle copied from its page.
    function bootstrapWithToggle({ text, page }, beforeInit = () => {}) {
      const root = document.documentElement;
      root.removeAttribute("data-theme");
      root.removeAttribute("style");
      document.body.removeAttribute("style");
      document.body.replaceChildren();
      new Function(text)();
      const theme = root.getAttribute("data-theme");
      expect(root.style.backgroundColor, page).toBe(BACKGROUNDS[theme]);
      expect(root.style.colorScheme, page).toBe(theme);
      beforeInit();
      mountFromPage(page, "[data-theme-toggle]");
      initThemeToggle();
      return document.querySelector("[data-theme-toggle]");
    }

    // Returns the active theme, which the stylesheet presents without inline theme styles.
    function currentTheme() {
      const root = document.documentElement;
      expect(root.style.getPropertyValue("background-color")).toBe("");
      expect(root.style.getPropertyValue("color-scheme")).toBe("");
      expect(document.body.style.getPropertyValue("background-color")).toBe("");
      return root.getAttribute("data-theme");
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

    it("removes only the theme properties from the inline styles", () => {
      vi.stubGlobal("matchMedia", systemPreference("light"));

      for (const variant of bootstrapVariants()) {
        localStorage.clear();
        // An inline body background is removed too, while other inline styles, such as the scroll
        // lock of the open navigation or lightbox, stay.
        const toggle = bootstrapWithToggle(variant, () => {
          document.documentElement.style.overflow = "hidden";
          document.body.style.backgroundColor = BACKGROUNDS.light;
          document.body.style.overflow = "hidden";
        });
        expect(currentTheme(), variant.page).toBe("light");
        expect(document.documentElement.style.overflow, variant.page).toBe("hidden");
        expect(document.body.style.overflow, variant.page).toBe("hidden");

        toggle.click();
        expect(currentTheme(), variant.page).toBe("dark");
        expect(document.documentElement.style.overflow, variant.page).toBe("hidden");
        expect(document.body.style.overflow, variant.page).toBe("hidden");
      }
    });
  });
});
