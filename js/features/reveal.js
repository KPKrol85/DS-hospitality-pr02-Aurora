// CSS hides unrevealed .reveal elements only under this class, so content stays visible
// whenever reveal is not set up: no JavaScript, a missing bundle or a failure below.
const READY_CLASS = "reveal-ready";

export function initReveal() {
  const elements = Array.from(document.querySelectorAll(".reveal"));

  if (!elements.length) return;

  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -20px 0px",
    },
  );

  try {
    elements.forEach((el) => observer.observe(el));
  } catch (error) {
    // Leave no partial observation behind; without READY_CLASS every element stays visible.
    observer.disconnect();
    throw error;
  }

  document.documentElement.classList.add(READY_CLASS);
}
