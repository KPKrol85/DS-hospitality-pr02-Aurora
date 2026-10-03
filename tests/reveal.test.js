import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initReveal } from "../js/features/reveal.js";

describe("reveal fail-safe", () => {
  let elements;

  beforeEach(() => {
    document.documentElement.classList.remove("reveal-ready");
    document.body.innerHTML = '<section class="reveal"></section><p class="reveal"></p><div class="reveal"></div>';
    elements = Array.from(document.querySelectorAll(".reveal"));
  });

  afterEach(() => {
    document.documentElement.classList.remove("reveal-ready");
  });

  it("reveals every element without adding reveal-ready when IntersectionObserver is missing", () => {
    // Preserve the original global for Vitest cleanup, then remove the property: the module uses `in`.
    vi.stubGlobal("IntersectionObserver", undefined);
    delete window.IntersectionObserver;
    expect("IntersectionObserver" in window).toBe(false);

    initReveal();

    elements.forEach((element) => expect(element.classList.contains("is-visible")).toBe(true));
    expect(document.documentElement.classList.contains("reveal-ready")).toBe(false);
  });

  it("disconnects partial observation, never adds reveal-ready and rethrows the original error", () => {
    const error = new Error("Observation failed");
    const observer = {
      observe: vi.fn().mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw error; }),
      disconnect: vi.fn(),
    };
    vi.stubGlobal("IntersectionObserver", vi.fn(function () { return observer; }));
    const addClass = vi.spyOn(document.documentElement.classList, "add");
    let caughtError;

    try {
      initReveal();
    } catch (caught) {
      caughtError = caught;
    }

    expect(caughtError).toBe(error);
    expect(observer.observe.mock.calls).toEqual([[elements[0]], [elements[1]]]);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(addClass).not.toHaveBeenCalledWith("reveal-ready");
    expect(document.documentElement.classList.contains("reveal-ready")).toBe(false);
  });

  it("adds reveal-ready only after observing every element and reveals intersecting entries", () => {
    let onIntersection;
    const readyDuringSetup = [];
    const observer = {
      observe: vi.fn(() => {
        readyDuringSetup.push(document.documentElement.classList.contains("reveal-ready"));
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    const Observer = vi.fn(function (callback) {
      onIntersection = callback;
      readyDuringSetup.push(document.documentElement.classList.contains("reveal-ready"));
      return observer;
    });
    vi.stubGlobal("IntersectionObserver", Observer);

    initReveal();

    expect(Observer).toHaveBeenCalledTimes(1);
    expect(observer.observe.mock.calls).toEqual(elements.map((element) => [element]));
    expect(readyDuringSetup).toEqual([false, false, false, false]);
    expect(document.documentElement.classList.contains("reveal-ready")).toBe(true);
    elements.forEach((element) => expect(element.classList.contains("is-visible")).toBe(false));

    onIntersection([
      { target: elements[0], isIntersecting: false },
      { target: elements[1], isIntersecting: true },
      { target: elements[2], isIntersecting: true },
    ]);

    expect(elements.map((element) => element.classList.contains("is-visible"))).toEqual([false, true, true]);
    expect(observer.unobserve.mock.calls).toEqual([[elements[1]], [elements[2]]]);
    expect(observer.disconnect).not.toHaveBeenCalled();
  });
});
