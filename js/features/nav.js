const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initNav() {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  if (!nav || !toggle) return;

  let isOpen = false;
  let focusable = [];
  let lastFocused = null;
  const mq = window.matchMedia("(min-width: 900px)");

  const syncNavVisibility = () => {
    if (mq.matches) {
      nav.hidden = false;
    } else if (!isOpen) {
      nav.hidden = true;
    }
  };

  mq.addEventListener("change", () => {
    if (mq.matches) {
      isOpen = false;
      document.body.style.overflow = "";
      toggle.setAttribute("aria-expanded", "false");
    }
    syncNavVisibility();
  });

  syncNavVisibility();

  const openNav = () => {
    isOpen = true;
    nav.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    lastFocused = document.activeElement;
    focusable = Array.from(nav.querySelectorAll(focusableSelectors));
    focusable[0]?.focus();
  };

  const closeNav = () => {
    isOpen = false;
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (!mq.matches) {
      nav.hidden = true;
    }
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
    if (link) {
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
}
