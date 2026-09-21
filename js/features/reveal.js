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

  elements.forEach((el) => observer.observe(el));
}
