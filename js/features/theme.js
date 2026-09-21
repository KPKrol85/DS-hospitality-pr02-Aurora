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

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || inlineTheme || "light";
    const next = nextTheme(current);
    applyTheme(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  });

  function applyTheme(value) {
    const background = value === "dark" ? "#05060a" : "#f8f7f2";
    document.documentElement.setAttribute("data-theme", value);
    document.documentElement.style.backgroundColor = background;
    document.documentElement.style.colorScheme = value;

    if (document.body) {
      document.body.style.backgroundColor = background;
    }
  }

  function nextTheme(current) {
    const index = USER_THEMES.indexOf(current);
    if (index === -1) return USER_THEMES[0];
    return USER_THEMES[(index + 1) % USER_THEMES.length];
  }
}
