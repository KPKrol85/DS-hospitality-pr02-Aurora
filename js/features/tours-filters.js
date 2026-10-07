export function initToursFilters() {
  const form = document.querySelector("[data-filters]");
  const list = document.querySelector("[data-tours-list]");
  if (!form || !list) return;

  const typeSelect = form.querySelector("[data-filter-type]");
  const regionSelect = form.querySelector("[data-filter-region]");
  const sortSelect = form.querySelector("[data-sort]");
  const resultLabel = form.querySelector("[data-results-count]");
  const cards = Array.from(list.querySelectorAll("[data-type]"));
  const emptyState = document.querySelector("[data-tours-empty]");
  const resetButton = emptyState?.querySelector("[data-tours-reset]");

  const update = () => {
    const typeValue = typeSelect?.value || "all";
    const regionValue = regionSelect?.value || "all";
    const sortValue = sortSelect?.value || "price-asc";

    const filtered = cards.filter((card) => {
      const matchesType = typeValue === "all" || card.dataset.type === typeValue;
      const matchesRegion = regionValue === "all" || card.dataset.region === regionValue;
      return matchesType && matchesRegion;
    });

    cards.forEach((card) => {
      card.hidden = !filtered.includes(card);
    });

    const sorted = sortCards(filtered, sortValue);
    sorted.forEach((card) => list.appendChild(card));

    // An empty list keeps its minimum height, so it gives way to the empty state.
    const hasResults = filtered.length > 0;
    list.hidden = !hasResults;
    if (emptyState) {
      emptyState.hidden = hasResults;
    }

    if (resultLabel) {
      resultLabel.textContent = filtered.length.toString();
    }
  };

  // Restores both filters but keeps the chosen sort order. The control hides itself, so focus
  // moves to the first filter instead of staying on a hidden element.
  const resetFilters = () => {
    if (typeSelect) typeSelect.value = "all";
    if (regionSelect) regionSelect.value = "all";
    update();
    typeSelect?.focus();
  };

  typeSelect?.addEventListener("change", update);
  regionSelect?.addEventListener("change", update);
  sortSelect?.addEventListener("change", update);
  resetButton?.addEventListener("click", resetFilters);

  update();
}

function sortCards(cards, sortValue) {
  const sorted = [...cards];
  const [key, order] = sortValue.split("-");
  sorted.sort((a, b) => {
    const aValue = Number(a.dataset[key === "price" ? "price" : "days"]);
    const bValue = Number(b.dataset[key === "price" ? "price" : "days"]);
    return order === "asc" ? aValue - bValue : bValue - aValue;
  });
  return sorted;
}
