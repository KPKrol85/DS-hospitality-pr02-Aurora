import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vi } from "vitest";

// A path, not a URL: the jsdom environment replaces the global URL class.
const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

export function readJson(relativePath) {
  return JSON.parse(readProjectFile(relativePath));
}

// Copies the first element matching each selector from a maintained page into document.body,
// so the fixtures are the real markup rather than a hand-written copy of it.
export function mountFromPage(page, ...selectors) {
  const source = new DOMParser().parseFromString(readProjectFile(page), "text/html");

  selectors.forEach((selector) => {
    const element = source.querySelector(selector);
    if (!element) {
      throw new Error(`${page} has no element matching ${selector}`);
    }
    document.body.append(document.importNode(element, true));
  });
}

// Sets the page path and query string that the modules read from window.location.
export function setUrl(pathAndQuery) {
  window.history.replaceState(null, "", pathAndQuery);
}

function jsonResponse(body, status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => structuredClone(body),
  };
}

// Answers every fetch with a fresh copy of the given JSON body.
export function stubFetchJson(body, status = 200) {
  const fetchMock = vi.fn(async () => jsonResponse(body, status));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Answers every fetch with a successful response whose body is not valid JSON.
export function stubFetchMalformedJson() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token '<', \"<!doctype \"... is not valid JSON");
    },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Keeps every fetch pending until the test settles it, so the page can be inspected before the
// response arrives.
export function stubFetchDeferred() {
  let settle;
  const response = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  const fetchMock = vi.fn(() => response);
  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    respondJson: (body, status = 200) => settle.resolve(jsonResponse(body, status)),
    fail: (error = new TypeError("Failed to fetch")) => settle.reject(error),
  };
}

// Fails every fetch the way a network error does.
export function stubFetchError(error = new TypeError("Failed to fetch")) {
  const fetchMock = vi.fn(async () => {
    throw error;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Lets a promise chain that the module under test does not return run to completion.
export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Splits a srcset attribute into "url descriptor" candidates, ignoring the line breaks and
// indentation of template-built markup.
export function srcsetCandidates(element) {
  return element
    .getAttribute("srcset")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/).join(" "));
}
