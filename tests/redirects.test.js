import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// _redirects keeps the URLs published before three pages received English file names: the host
// answers each former path with a permanent redirect to the renamed page. The host's Pretty URLs
// processing also published the former pages without .html, so both forms are redirected.
const projectRoot = resolve(import.meta.dirname, "..");
const { maintainedPages } = createRequire(import.meta.filename)("../scripts/site-build-contract.js");

const renamedPages = [
  { from: "/dziekuje.html", to: "/thank-you.html" },
  { from: "/polityka-prywatnosci.html", to: "/privacy-policy.html" },
  { from: "/regulamin.html", to: "/terms.html" },
];

// Each former page URL with and without .html, and the page it redirects to.
const formerUrls = renamedPages.flatMap(({ from, to }) => [
  { from, to },
  { from: from.replace(/\.html$/, ""), to },
]);

function read(relativePath) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

// The rules of a Netlify _redirects file: the fields of each line that is neither empty nor a
// # comment.
function redirectRules() {
  return read("_redirects")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split(/\s+/));
}

describe("_redirects", () => {
  it("declares exactly the permanent redirects of the renamed pages", () => {
    expect(redirectRules()).toEqual(formerUrls.map(({ from, to }) => [from, to, "301"]));
  });

  // The host applies a rule without the ! force flag only when no published file matches its path.
  it("redirects from paths without a page to maintained pages", () => {
    for (const { from, to } of formerUrls) {
      expect(maintainedPages, from).not.toContain(from.slice(1));
      expect(existsSync(join(projectRoot, from.slice(1))), `${from} exists and would be served instead of redirected`).toBe(false);
      expect(maintainedPages, to).toContain(to.slice(1));
    }
  });

  it("leaves no maintained page or sitemap entry pointing to a former URL", () => {
    for (const file of [...maintainedPages, "sitemap.xml"]) {
      const content = read(file);
      for (const { from } of renamedPages) {
        expect(content.includes(from.slice(1)), `${file} references ${from.slice(1)}`).toBe(false);
      }
    }
  });
});
