import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs scripts/check-csp.js against copies of the maintained pages and _headers written to a
// temporary directory, next to a dist/ package staged from them, so no test reads the real dist/
// or changes a project file.
const projectRoot = resolve(import.meta.dirname, "..");
const checker = resolve(projectRoot, "scripts/check-csp.js");
const pages = readdirSync(projectRoot)
  .filter((entry) => entry.endsWith(".html"))
  .sort();

// The two source references that build:stage rewrites in the dist/ copies of the pages.
const productionReferences = [
  ['<link rel="stylesheet" href="css/style.css" />', '<link rel="stylesheet" href="css/style.min.css" />'],
  ['<script type="module" src="js/script.js"></script>', '<script src="js/script.min.js"></script>'],
];

let siteRoot;

function createSite() {
  const root = mkdtempSync(join(tmpdir(), "aurora-csp-"));
  mkdirSync(join(root, "dist"));

  for (const page of pages) {
    const html = readFileSync(join(projectRoot, page), "utf8");
    writeFileSync(join(root, page), html);
    writeFileSync(
      join(root, "dist", page),
      productionReferences.reduce((copy, [source, production]) => copy.replace(source, production), html)
    );
  }
  copyFileSync(join(projectRoot, "_headers"), join(root, "_headers"));
  copyFileSync(join(projectRoot, "_headers"), join(root, "dist/_headers"));

  return root;
}

function read(relativePath) {
  return readFileSync(join(siteRoot, relativePath), "utf8");
}

function write(relativePath, content) {
  writeFileSync(join(siteRoot, relativePath), content);
}

// Replaces the first match of search, and fails when the fixture no longer contains it.
function edit(relativePath, search, replacement) {
  const content = read(relativePath);
  const updated = content.replace(search, () => replacement);
  expect(updated, `${relativePath} does not contain ${search}`).not.toBe(content);
  write(relativePath, updated);
}

// Line of the first occurrence of text, counting line breaks as the HTML parser does.
function lineOf(relativePath, text) {
  const content = read(relativePath);
  expect(content).toContain(text);
  return content.slice(0, content.indexOf(text)).split(/\r\n?|\n/).length;
}

function scriptSrc(relativePath) {
  return read(relativePath).match(/script-src ([^;]*);/)[1].split(" ");
}

function setScriptSrc(relativePath, sources) {
  edit(relativePath, /script-src [^;]*;/, `script-src ${sources.join(" ")};`);
}

// The CSP hash source of a script text.
function hashSource(text) {
  return `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
}

// The scripts of a page as an HTML parser reads them. jsdom's DOMParser, like a browser,
// normalizes line endings while parsing, so textContent is the text that the browser hashes.
function parsedScripts(html) {
  const scripts = Array.from(new DOMParser().parseFromString(html, "text/html").scripts);
  return {
    inline: scripts.filter((script) => !script.hasAttribute("src") && script.type.toLowerCase() !== "application/ld+json"),
    jsonLd: scripts.filter((script) => script.type.toLowerCase() === "application/ld+json"),
    external: scripts.filter((script) => script.hasAttribute("src")),
  };
}

// The hash source of the theme bootstrap, the only inline script of a maintained page.
function bootstrapHash(relativePath) {
  const { inline } = parsedScripts(read(relativePath));
  expect(inline).toHaveLength(1);
  return hashSource(inline[0].textContent);
}

function runChecker(...args) {
  const result = spawnSync(process.execPath, [checker, ...args], { cwd: siteRoot, encoding: "utf8" });
  const issues = result.stderr
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));

  return { status: result.status, stdout: result.stdout, stderr: result.stderr, issues };
}

function notApproved(location, hash, startTag = "<script>", policy = "_headers") {
  return `${location} -> inline ${startTag} hashes to ${hash}, which script-src in ${policy} does not approve`;
}

beforeEach(() => {
  siteRoot = createSite();
});

afterEach(() => {
  rmSync(siteRoot, { recursive: true, force: true });
});

describe("check-csp.js", () => {
  it("accepts the bootstrap variants of the maintained pages in the sources and in dist/", () => {
    const counts = pages.map((page) => parsedScripts(read(page)));
    const total = (kind) => counts.reduce((sum, scripts) => sum + scripts[kind].length, 0);
    const hashes = new Set(pages.map(bootstrapHash));
    const summary =
      `approves the ${hashes.size} hashes of ${total("inline")} inline scripts in ${pages.length} HTML files in`;
    const exempt = `${total("jsonLd")} JSON-LD blocks and ${total("external")} same-origin external scripts need no hash.`;

    const source = runChecker();
    expect(source.status, source.stderr).toBe(0);
    expect(source.stdout).toContain(`CSP check passed: script-src in _headers ${summary} the project root; ${exempt}`);

    const production = runChecker("--dist");
    expect(production.status, production.stderr).toBe(0);
    expect(production.stdout).toContain(`CSP check passed: dist/_headers matches _headers, and its script-src ${summary} dist/; ${exempt}`);
  });

  it("approves exactly the hashes that an HTML parser computes for the bootstraps", () => {
    const approved = scriptSrc("_headers").filter((source) => source.startsWith("'sha256-"));

    expect(new Set(approved)).toEqual(new Set(pages.map(bootstrapHash)));
    expect(approved).toHaveLength(new Set(approved).size);
  });

  it("hashes the script text with CRLF and lone CR line endings read as LF, like the browser", () => {
    const lf = read("index.html").replace(/\r\n?/g, "\n");
    write("index.html", lf.replace(/\n/g, "\r\n"));
    write("index-lf.html", lf);
    write("index-cr.html", lf.replace(/\n/g, "\r"));
    const standard = bootstrapHash("index.html");
    expect(bootstrapHash("index-lf.html")).toBe(standard);
    expect(bootstrapHash("index-cr.html")).toBe(standard);

    const accepted = runChecker();
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(accepted.stdout).toContain(`inline scripts in ${pages.length + 2} HTML files`);

    // The hash of the stored CRLF bytes approves a text that the browser never hashes.
    const storedBytesHash = hashSource(read("index.html").match(/<script>([\s\S]*?)<\/script>/)[1]);
    expect(storedBytesHash).not.toBe(standard);
    setScriptSrc("_headers", scriptSrc("_headers").map((source) => (source === standard ? storedBytesHash : source)));

    const rejected = runChecker();
    expect(rejected.status).toBe(1);
    expect(rejected.issues).toContain(notApproved(`index.html:${lineOf("index.html", "<script>")}`, standard));
    expect(rejected.issues).toContain(notApproved(`index-cr.html:${lineOf("index-cr.html", "<script>")}`, standard));
    expect(rejected.issues).toContain(
      `_headers:2 -> script-src approves ${storedBytesHash}, which no inline script in the project root has; remove it`
    );
  });

  it("rejects a changed bootstrap until its new hash is approved, however small the change", () => {
    const contactHash = bootstrapHash("contact.html");
    edit("index.html", 'theme = "light";', 'theme = "dark";');
    edit("contact.html", "(function () {", "(function () { ");

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      notApproved(`contact.html:${lineOf("contact.html", "<script>")}`, bootstrapHash("contact.html")),
      notApproved(`index.html:${lineOf("index.html", "<script>")}`, bootstrapHash("index.html")),
      `_headers:2 -> script-src approves ${contactHash}, which no inline script in the project root has; remove it`,
    ]);
  });

  it("rejects a policy that no longer approves a bootstrap in use", () => {
    const offlineHash = bootstrapHash("offline.html");
    setScriptSrc("_headers", scriptSrc("_headers").filter((source) => source !== offlineHash));

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      notApproved(`cookies.html:${lineOf("cookies.html", "<script>")}`, offlineHash),
      notApproved(`offline.html:${lineOf("offline.html", "<script>")}`, offlineHash),
    ]);
  });

  it("rejects 'unsafe-inline' in script-src, next to the hashes or instead of them", () => {
    const unsafeInline = "_headers:2 -> script-src contains 'unsafe-inline'; inline scripts are approved only by their SHA-256 hashes";
    setScriptSrc("_headers", [...scriptSrc("_headers"), "'unsafe-inline'"]);

    const alongside = runChecker();
    expect(alongside.status).toBe(1);
    expect(alongside.issues).toEqual([unsafeInline]);

    setScriptSrc("_headers", ["'self'", "'unsafe-inline'"]);

    const instead = runChecker();
    expect(instead.status).toBe(1);
    expect(instead.issues[0]).toBe(unsafeInline);
    expect(instead.issues.slice(1)).toHaveLength(pages.length);
  });

  it("rejects an unexpected inline script, whatever its type, and one without an end tag", () => {
    edit("about.html", "</body>", "<script>window.analytics = [];</script>\n</body>");
    edit("tours.html", "</body>", '<script type="module">import "./js/extra.js";</script>\n</body>');
    edit("gallery.html", "</body>", '<script type="application/json">{"filters":[]}</script>\n</body>');
    write("dziekuje.html", `${read("dziekuje.html")}<script>`);

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      `dziekuje.html:${read("dziekuje.html").split(/\r\n?|\n/).length} -> <script> has no </script> end tag, so the rest of the page is its text`,
      notApproved(`about.html:${lineOf("about.html", "<script>window.analytics")}`, hashSource("window.analytics = [];")),
      notApproved(
        `gallery.html:${lineOf("gallery.html", '<script type="application/json">')}`,
        hashSource('{"filters":[]}'),
        '<script type="application/json">'
      ),
      notApproved(
        `tours.html:${lineOf("tours.html", '<script type="module">')}`,
        hashSource('import "./js/extra.js";'),
        '<script type="module">'
      ),
    ]);
  });

  it("rejects inline event handlers and javascript: URLs, which no hash can approve", () => {
    edit("index.html", "</body>", '<img src="assets/img/icons/favicon.svg" alt="" onerror="this.remove()" />\n</body>');
    edit("regulamin.html", "</body>", '<a href=" javascript:history.back()">Wróć</a>\n</body>');

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toEqual([
      `index.html:${lineOf("index.html", "<img src=\"assets/img/icons/favicon.svg\"")} -> <img onerror> is an inline event handler, which the policy blocks; attach the listener from a script file`,
      `regulamin.html:${lineOf("regulamin.html", "<a href=\" javascript:")} -> <a href=" javascript:history.back()"> is a javascript: URL, which the policy blocks`,
    ]);
  });

  it("does not treat JSON-LD blocks as executable scripts", () => {
    const jsonLd = pages.reduce((sum, page) => sum + parsedScripts(read(page)).jsonLd.length, 0);
    edit("index.html", '"name": "Aurora Travel"', '"name": "Aurora Travel Studio"');
    edit("404.html", "</head>", '<script type="Application/LD+JSON">{"@type": "Thing"}</script>\n</head>');

    const { status, stdout, stderr } = runChecker();

    expect(status, stderr).toBe(0);
    expect(stdout).toContain(`; ${jsonLd + 1} JSON-LD blocks and`);
  });

  it("needs no hash for same-origin external scripts, which script-src allows through 'self'", () => {
    edit("about.html", "</body>", '<script src="/js/extra.js" defer>/* ignored */</script>\n</body>');

    const accepted = runChecker();
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(accepted.stdout).toContain(`${pages.length + 1} same-origin external scripts need no hash.`);

    edit("tours.html", "</body>", '<script src="https://cdn.example.com/widget.js"></script>\n</body>');
    setScriptSrc("_headers", scriptSrc("_headers").filter((source) => source !== "'self'"));

    const rejected = runChecker();
    expect(rejected.status).toBe(1);
    expect(rejected.issues).toEqual([
      `tours.html:${lineOf("tours.html", "<script src=\"https:")} -> <script src="https://cdn.example.com/widget.js"> is not a same-origin script; script-src approves external scripts only through 'self'`,
      `_headers:2 -> script-src lacks 'self', which ${pages.length + 1} external scripts need (first at 404.html:${lineOf("404.html", "<script type=\"module\"")})`,
    ]);
  });

  it("reports a missing or stale dist/_headers while _headers is correct", () => {
    rmSync(join(siteRoot, "dist/_headers"));
    expect(runChecker().status).toBe(0);

    const missing = runChecker("--dist");
    expect(missing.status).toBe(1);
    expect(missing.issues).toEqual([
      "dist/_headers is missing, so dist/ would be published without its Content-Security-Policy; run npm run build",
    ]);

    // A package staged before the policy was narrowed.
    write("dist/_headers", read("_headers").replace(/script-src [^;]*;/, "script-src 'self' 'unsafe-inline';"));

    const stale = runChecker("--dist");
    expect(stale.status).toBe(1);
    expect(stale.issues.slice(0, 2)).toEqual([
      "dist/_headers:2 -> the Content-Security-Policy differs from _headers:2 in script-src, so dist/ is stale or was edited after the build; run npm run build",
      "dist/_headers:2 -> script-src contains 'unsafe-inline'; inline scripts are approved only by their SHA-256 hashes",
    ]);

    // Any other difference is a stale policy as well, even though it approves every bootstrap.
    write("dist/_headers", read("_headers").replace("object-src 'none'", "object-src 'self'"));

    const edited = runChecker("--dist");
    expect(edited.status).toBe(1);
    expect(edited.issues).toEqual([
      "dist/_headers:2 -> the Content-Security-Policy differs from _headers:2 in object-src, so dist/ is stale or was edited after the build; run npm run build",
    ]);
  });

  it("reports a changed bootstrap in dist/ while the maintained pages are approved", () => {
    edit("dist/offline.html", "var theme;", "var theme = null;");

    expect(runChecker().status).toBe(0);
    const { status, issues } = runChecker("--dist");

    expect(status).toBe(1);
    expect(issues).toEqual([
      notApproved(`dist/offline.html:${lineOf("dist/offline.html", "<script>")}`, bootstrapHash("dist/offline.html"), "<script>", "dist/_headers"),
    ]);
  });

  it("reports a missing _headers and a missing dist/", () => {
    rmSync(join(siteRoot, "_headers"));

    const source = runChecker();
    expect(source.status).toBe(1);
    expect(source.issues).toEqual(["_headers is missing; restore the approved policy from Git"]);

    const production = runChecker("--dist");
    expect(production.status).toBe(1);
    expect(production.issues).toEqual(["_headers is missing, so the policy in dist/ cannot be compared with the approved one"]);

    rmSync(join(siteRoot, "dist"), { recursive: true });

    const noPackage = runChecker("--dist");
    expect(noPackage.status).toBe(1);
    expect(noPackage.stderr).toContain("Missing dist/. Run npm run build to generate the production package.");
  });

  it.each([
    [
      "script-src-elem, which would override script-src",
      (headers) => headers.replace("style-src", "script-src-elem 'self' 'unsafe-inline'; style-src"),
      "_headers:2 -> script-src-elem takes precedence over script-src for inline scripts; keep their approval in script-src",
    ],
    [
      "a nonce source",
      (headers) => headers.replace("script-src 'self'", "script-src 'self' 'nonce-aurora'"),
      "_headers:2 -> script-src contains 'nonce-aurora'; a nonce in a static policy approves any inline script that repeats it",
    ],
    [
      "a hash of another algorithm",
      (headers) => headers.replace("script-src 'self'", `script-src 'self' 'sha384-${"A".repeat(64)}'`),
      `_headers:2 -> script-src contains 'sha384-${"A".repeat(64)}'; this check verifies only 'sha256-<base64 digest>' sources`,
    ],
    [
      "a policy without script-src",
      (headers) => headers.replace(/script-src [^;]*; /, ""),
      "_headers:2 -> expected one script-src directive, found 0",
    ],
    [
      "a policy that applies to one page only",
      (headers) => headers.replace("/*", "/index.html"),
      "_headers -> expected one Content-Security-Policy in the site-wide /* rule, found line 2 under /index.html",
    ],
  ])("rejects %s", (_description, change, issue) => {
    write("_headers", change(read("_headers")));

    const { status, issues } = runChecker();

    expect(status).toBe(1);
    expect(issues).toContain(issue);
  });
});
