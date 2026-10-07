import { beforeEach, describe, expect, it } from "vitest";
import { initToursFilters } from "../js/features/tours-filters.js";
import { mountFromPage } from "./helpers.js";

// Card ids in tours.html ordered by their data-price and data-days values. Malediwy and
// Islandia both last 7 days and keep their markup order.
const PRICE_ASC = ["maroko", "islandia", "nyc", "malediwy", "patagonia", "tokio"];
const PRICE_DESC = ["tokio", "patagonia", "malediwy", "nyc", "islandia", "maroko"];
const DAYS_ASC = ["nyc", "malediwy", "islandia", "maroko", "tokio", "patagonia"];
const DAYS_DESC = ["patagonia", "tokio", "maroko", "malediwy", "islandia", "nyc"];

function cards() {
  return Array.from(document.querySelectorAll("[data-tours-list] > [data-type]"));
}

// Ids of the cards a visitor sees, in DOM order.
function visibleIds() {
  return cards()
    .filter((card) => !card.hidden)
    .map((card) => card.id);
}

function resultCount() {
  return document.querySelector("[data-results-count]").textContent;
}

function list() {
  return document.querySelector("[data-tours-list]");
}

function emptyState() {
  return document.querySelector("[data-tours-empty]");
}

function resetButton() {
  return document.querySelector("[data-tours-empty] [data-tours-reset]");
}

function filterSelect(name) {
  return document.querySelector(`[data-filters] select[name="${name}"]`);
}

function choose(name, value) {
  const select = filterSelect(name);
  select.value = value;
  expect(select.value, `tours.html has no ${name} option "${value}"`).toBe(value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("initToursFilters", () => {
  beforeEach(() => {
    mountFromPage("tours.html", "[data-filters]", "[data-tours-list]", "[data-tours-empty]");
    initToursFilters();
  });

  it("shows every offer by ascending price on load", () => {
    expect(visibleIds()).toEqual(PRICE_ASC);
    expect(cards().every((card) => !card.hidden)).toBe(true);
    expect(resultCount()).toBe("6");
    expect(list().hidden).toBe(false);
    expect(emptyState().hidden).toBe(true);
  });

  it("filters by tour type", () => {
    choose("type", "objazdowe");

    expect(visibleIds()).toEqual(["islandia", "patagonia"]);
    expect(resultCount()).toBe("2");
    expect(cards().filter((card) => card.hidden)).toHaveLength(4);
  });

  it("filters by region", () => {
    choose("region", "ameryka");

    expect(visibleIds()).toEqual(["nyc", "patagonia"]);
    expect(resultCount()).toBe("2");
  });

  it("combines the type and region filters", () => {
    choose("type", "city");
    expect(visibleIds()).toEqual(["nyc", "tokio"]);

    choose("region", "ameryka");
    expect(visibleIds()).toEqual(["nyc"]);
    expect(resultCount()).toBe("1");
  });

  it("hides every card, reports zero and shows the empty state in place of the list when no offer matches", () => {
    choose("type", "city");
    choose("region", "europa");

    expect(visibleIds()).toEqual([]);
    expect(cards().every((card) => card.hidden)).toBe(true);
    expect(resultCount()).toBe("0");
    expect(list().hidden).toBe(true);
    expect(emptyState().hidden).toBe(false);
  });

  it("hides the empty state again as soon as an offer matches", () => {
    choose("type", "city");
    choose("region", "europa");

    choose("region", "azja");

    expect(visibleIds()).toEqual(["tokio"]);
    expect(resultCount()).toBe("1");
    expect(list().hidden).toBe(false);
    expect(emptyState().hidden).toBe(true);
  });

  it("restores every offer when both filters return to all", () => {
    choose("type", "city");
    choose("region", "europa");

    choose("type", "all");
    choose("region", "all");

    expect(visibleIds()).toEqual(PRICE_ASC);
    expect(resultCount()).toBe("6");
    expect(list().hidden).toBe(false);
    expect(emptyState().hidden).toBe(true);
  });

  it.each([
    ["price-asc", PRICE_ASC],
    ["price-desc", PRICE_DESC],
    ["days-asc", DAYS_ASC],
    ["days-desc", DAYS_DESC],
  ])("resets type and region from the empty state and keeps the %s order", (sort, expected) => {
    choose("type", "city");
    choose("region", "europa");
    // Chosen while no card is shown, so the reset itself has to apply the order.
    choose("sort", sort);

    resetButton().click();

    expect(filterSelect("type").value).toBe("all");
    expect(filterSelect("region").value).toBe("all");
    expect(filterSelect("sort").value).toBe(sort);
    expect(cards().map((card) => card.id)).toEqual(expected);
    expect(visibleIds()).toEqual(expected);
    expect(resultCount()).toBe("6");
    expect(list().hidden).toBe(false);
    expect(emptyState().hidden).toBe(true);
  });

  it("moves focus from the hidden reset control to the type filter", () => {
    choose("type", "city");
    choose("region", "europa");
    resetButton().focus();
    expect(document.activeElement).toBe(resetButton());

    resetButton().click();

    expect(document.activeElement).toBe(filterSelect("type"));
    expect(emptyState().contains(document.activeElement)).toBe(false);
  });

  it.each([
    ["price-asc", PRICE_ASC],
    ["price-desc", PRICE_DESC],
    ["days-asc", DAYS_ASC],
    ["days-desc", DAYS_DESC],
  ])("reorders the cards in the DOM for %s", (sort, expected) => {
    choose("sort", sort);

    expect(cards().map((card) => card.id)).toEqual(expected);
    expect(resultCount()).toBe("6");
  });

  it("keeps the chosen order within filtered results", () => {
    choose("sort", "price-desc");
    choose("region", "ameryka");
    expect(visibleIds()).toEqual(["patagonia", "nyc"]);

    choose("sort", "days-desc");
    choose("region", "all");
    choose("type", "objazdowe");
    expect(visibleIds()).toEqual(["patagonia", "islandia"]);
    expect(resultCount()).toBe("2");
  });
});

describe("tours.html without JavaScript", () => {
  beforeEach(() => {
    mountFromPage("tours.html", "main");
  });

  it("shows every card and keeps the empty state hidden next to the list", () => {
    expect(cards()).toHaveLength(6);
    expect(cards().every((card) => !card.hidden)).toBe(true);
    expect(resultCount()).toBe("6");
    expect(list().hidden).toBe(false);
    expect(emptyState().hidden).toBe(true);
    // Outside [data-tours-list], whose cards the catalogue check reads, but in the same section.
    expect(list().contains(emptyState())).toBe(false);
    expect(emptyState().closest("section")).toBe(list().closest("section"));
    expect(resetButton().localName).toBe("button");
    expect(resetButton().type).toBe("button");
  });
});
