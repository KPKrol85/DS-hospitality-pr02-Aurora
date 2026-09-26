const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initNav() {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  if (!nav || !toggle) return;

  let isOpen = false;
  let focusable = [];
  let lastFocused = null;
  const mq = window.matchMedia("(min-width: 900px)");

  // CSS shows the drawer below 900px only while the toggle is aria-expanded, and the desktop
  // navigation always, so this module changes only the expanded state, scroll lock and focus.
  const setExpanded = (expanded) => {
    isOpen = expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    document.body.style.overflow = expanded ? "hidden" : "";
  };

  mq.addEventListener("change", () => {
    if (mq.matches && isOpen) {
      setExpanded(false);
    }
  });

  const openNav = () => {
    lastFocused = document.activeElement;
    setExpanded(true);
    focusable = Array.from(nav.querySelectorAll(focusableSelectors));
    focusable[0]?.focus();
  };

  const closeNav = () => {
    setExpanded(false);
    if (lastFocused) {
      lastFocused.focus();
    }
  };

  toggle.addEventListener("click", () => {
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  nav.addEventListener("click", (event) => {
    const link = event.target instanceof HTMLElement ? event.target.closest("a") : null;
    if (link && isOpen) {
      closeNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      closeNav();
      return;
    }
    if (event.key === "Tab" && focusable.length) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  toggle.setAttribute("data-nav-ready", "");
}
