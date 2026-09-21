export function initGalleryFilters() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;

  const items = Array.from(gallery.querySelectorAll("figure[data-country]"));
  const buttons = Array.from(document.querySelectorAll("[data-gallery-filter]"));

  if (!items.length || !buttons.length) return;

  const setActiveButton = (button) => {
    buttons.forEach((btn) => {
      const isActive = btn === button;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const applyFilter = (filter) => {
    let hasVisible = false;

    items.forEach((item) => {
      const isVisible = filter === "all" || item.dataset.country === filter;
      item.classList.toggle("is-hidden", !isVisible);
      if (isVisible) hasVisible = true;
    });

    if (!hasVisible && filter !== "all") {
      const allButton = buttons.find((btn) => btn.dataset.galleryFilter === "all");
      if (allButton) {
        setActiveButton(allButton);
      }
      items.forEach((item) => item.classList.remove("is-hidden"));
    }
  };

  const onFilterClick = (button) => {
    const filter = button.dataset.galleryFilter || "all";
    setActiveButton(button);
    applyFilter(filter);
  };

  const initialBtn = buttons.find((btn) => btn.dataset.galleryFilter === "all") || buttons[0];
  if (initialBtn) {
    setActiveButton(initialBtn);
  }
  applyFilter("all");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => onFilterClick(btn));
  });
}
