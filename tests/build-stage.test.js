import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs scripts/build-dist.js (build:stage) against copies of the root files written to a temporary
// directory, so no test changes a project page or reads the real dist/.
const projectRoot = resolve(import.meta.dirname, "..");
const stager = resolve(projectRoot, "scripts/build-dist.js");
const { maintainedPages, assetReferences } = createRequire(import.meta.filename)("../scripts/site-build-contract.js");
const inventoryMismatch = "Root HTML pages do not match maintainedPages in scripts/site-build-contract.js:";

let siteRoot;

// The root pages and deployment files, next to an empty assets/ directory for the stage to copy.
function createSite() {
  const root = mkdtempSync(join(tmpdir(), "aurora-build-stage-"));
  for (const entry of readdirSync(projectRoot)) {
    if (!entry.startsWith(".") && statSync(join(projectRoot, entry)).isFile()) {
      copyFileSync(join(projectRoot, entry), join(root, entry));
    }
  }
  mkdirSync(join(root, "assets"));

  return root;
}

function read(relativePath) {
  return readFileSync(join(siteRoot, relativePath), "utf8");
}

function htmlFiles(relativePath) {
  return readdirSync(join(siteRoot, relativePath))
    .filter((entry) => entry.endsWith(".html"))
    .sort();
}

function runStage() {
  const result = spawnSync(process.execPath, [stager], { cwd: siteRoot, encoding: "utf8" });
  const issues = result.stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));

  return { status: result.status, stderr: result.stderr, issues };
}

beforeEach(() => {
  siteRoot = createSite();
});

afterEach(() => {
  rmSync(siteRoot, { recursive: true, force: true });
});

describe("build-dist.js page inventory", () => {
  it("publishes exactly the declared pages, each with both source tags rewritten", () => {
    const { status, stderr } = runStage();

    expect(status, stderr).toBe(0);
    expect(htmlFiles("dist")).toEqual([...maintainedPages].sort());
    for (const page of maintainedPages) {
      const expected = assetReferences.reduce((html, { source, production }) => html.replace(source.tag, production.tag), read(page));
      expect(read(`dist/${page}`), page).toBe(expected);
    }
  });

  it("rejects an undeclared root page before writing dist/, even when its tags are valid", () => {
    copyFileSync(join(siteRoot, "about.html"), join(siteRoot, "about-team.html"));

    const { status, stderr, issues } = runStage();

    expect(status).toBe(1);
    expect(stderr).toContain(inventoryMismatch);
    expect(issues).toEqual(["about-team.html is not declared; add it to maintainedPages to publish it"]);
    expect(existsSync(join(siteRoot, "dist"))).toBe(false);
  });

  it("rejects a missing declared page before writing dist/", () => {
    rmSync(join(siteRoot, "gallery.html"));

    const { status, stderr, issues } = runStage();

    expect(status).toBe(1);
    expect(stderr).toContain(inventoryMismatch);
    expect(issues).toEqual(["gallery.html is declared but missing; restore it or remove it from maintainedPages"]);
    expect(existsSync(join(siteRoot, "dist"))).toBe(false);
  });

  it("reports a renamed page as both missing and undeclared", () => {
    renameSync(join(siteRoot, "tours.html"), join(siteRoot, "wycieczki.html"));

    const { status, issues } = runStage();

    expect(status).toBe(1);
    expect(issues).toEqual([
      "tours.html is declared but missing; restore it or remove it from maintainedPages",
      "wycieczki.html is not declared; add it to maintainedPages to publish it",
    ]);
    expect(existsSync(join(siteRoot, "dist"))).toBe(false);
  });
});
