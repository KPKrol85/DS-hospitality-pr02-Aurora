import { beforeEach, describe, expect, it, vi } from "vitest";
import { initMap } from "../js/features/map.js";
import { mountFromPage } from "./helpers.js";

const MAP_URL = "https://www.google.com/maps?q=ul.+Marynarki+Wojennej+12%2F31,+33-100+Tarnów&output=embed";
const MAP_TITLE = "Mapa biura autora projektu, KP_Code Digital Studio";
const map = () => document.querySelector("[data-map]");
const button = () => map().querySelector("[data-map-load]");
const fallback = () => map().querySelector("[data-map-fallback]");

beforeEach(() => {
  mountFromPage("contact.html", ".contact-details", "[data-map]");
});

describe("user-activated contact map", () => {
  it("ships the address, external-service information and no-JavaScript fallback without an iframe", () => {
    expect(document.querySelector(".contact-details").textContent).toContain("Marynarki Wojennej 12/31");
    expect(map().querySelector("iframe")).toBeNull();
    const info = document.getElementById(button().getAttribute("aria-describedby"));
    expect(info.textContent).toContain("Google Maps");
    expect(info.textContent).toContain("cookies");
    expect(button().type).toBe("button");
    expect(button().textContent).toBe("Wyświetl mapę");
    expect(button().hidden).toBe(true);
    expect(fallback().hidden).toBe(false);
    expect(fallback().textContent).toContain("JavaScript");
    // The URL is inert data; no resource-bearing attribute or connection hint uses Google.
    expect(map().querySelector("[src], [srcset], link[href]")).toBeNull();
  });

  it("enables the native button without starting the external integration", () => {
    initMap();

    expect(button().hidden).toBe(false);
    expect(button().hasAttribute("tabindex")).toBe(false);
    expect(fallback().hidden).toBe(true);
    expect(map().querySelector("iframe")).toBeNull();
    expect(map().hasAttribute("data-map-loaded")).toBe(false);
  });

  it("creates the intended, named iframe and moves focus to it only after activation", () => {
    initMap();
    button().focus();
    button().click();

    const iframe = map().querySelector("iframe");
    expect(iframe.src).toBe(new URL(MAP_URL).href);
    expect(iframe.title).toBe(MAP_TITLE);
    expect(iframe.getAttribute("loading")).toBe("lazy");
    expect(iframe.getAttribute("referrerpolicy")).toBe("no-referrer-when-downgrade");
    expect(map().hasAttribute("data-map-loaded")).toBe(true);
    expect(document.activeElement).toBe(iframe);
  });

  it("does not duplicate the iframe or its request after repeated initialization and activation", () => {
    initMap();
    initMap();
    const trigger = button();
    trigger.click();
    const iframe = map().querySelector("iframe");
    trigger.click();
    initMap();
    trigger.click();

    expect(map().querySelectorAll("iframe")).toHaveLength(1);
    expect(map().querySelector("iframe")).toBe(iframe);
  });

  it("keeps the static fallback when the activation listener cannot be attached", () => {
    const error = new Error("Listener failed");
    vi.spyOn(button(), "addEventListener").mockImplementation(() => { throw error; });

    expect(() => initMap()).toThrow(error);
    expect(button().hidden).toBe(true);
    expect(fallback().hidden).toBe(false);
    expect(map().querySelector("iframe")).toBeNull();
  });

  it("leaves an incomplete integration inactive", () => {
    map().removeAttribute("data-map-src");
    initMap();

    expect(button().hidden).toBe(true);
    expect(fallback().hidden).toBe(false);
    expect(map().querySelector("iframe")).toBeNull();
  });

  it("does nothing on a page without a map", () => {
    document.body.replaceChildren();
    expect(() => initMap()).not.toThrow();
  });
});
