const STORAGE_KEY = "kp-travel-theme";
const USER_THEMES = ["light", "dark"];

export function initThemeToggle() {
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;

  let stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }

  const inlineTheme = document.documentElement.getAttribute("data-theme") || "light";
  const initial = USER_THEMES.includes(stored) ? stored : inlineTheme;
  applyTheme(initial);
  removeBootstrapStyles();

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || inlineTheme || "light";
    const next = nextTheme(current);
    applyTheme(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  });

  function applyTheme(value) {
    document.documentElement.setAttribute("data-theme", value);
  }

  // The inline bootstrap paints the first frame with inline theme styles, before the stylesheet
  // applies. Once data-theme is set, the design tokens own the background and colour scheme, so
  // only these properties are removed and any other inline style stays.
  function removeBootstrapStyles() {
    document.documentElement.style.removeProperty("background-color");
    document.documentElement.style.removeProperty("color-scheme");

    if (document.body) {
      document.body.style.removeProperty("background-color");
    }
  }

  function nextTheme(current) {
    const index = USER_THEMES.indexOf(current);
    if (index === -1) return USER_THEMES[0];
    return USER_THEMES[(index + 1) % USER_THEMES.length];
  }
}
