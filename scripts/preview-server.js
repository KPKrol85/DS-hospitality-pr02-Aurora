const fs = require("fs");
const http = require("http");
const path = require("path");
const { maintainedPages } = require("./site-build-contract");

// Development-only local preview, run as npm run preview:source or npm run preview:dist. It uses
// only Node.js built-in modules, listens on the loopback interface only, and is never published:
// build:stage does not copy scripts/.
const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const host = "127.0.0.1";

const usage = [
  "Usage: node scripts/preview-server.js <source|dist> [--port <number>]",
  "  npm run preview:source [-- --port <number>]",
  "  npm run preview:dist [-- --port <number>]",
].join("\n");

// The source preview serves only what the maintained pages load: the pages, the canonical CSS
// and JS, the runtime assets and the static site files. The repository configuration, scripts,
// tests, documentation, dist/, service-worker.js and assets/img-src/ are never served.
const sourceFiles = new Set([...maintainedPages, "site.webmanifest", "robots.txt", "sitemap.xml"]);
const sourceDirectories = ["css/", "js/", "assets/"];
const sourceExcludedDirectories = ["assets/img-src/"];

// dist/ is the complete published site root. Only _headers stays private: the host applies it
// instead of serving it.
const privateDistFiles = new Set(["_headers"]);

// The two previews use different default ports, so they never share an origin and the production
// Service Worker never controls the source preview.
const modes = {
  source: {
    label: "source",
    root: projectRoot,
    defaultPort: 8181,
    production: false,
    isPublic: (file) =>
      sourceFiles.has(file) ||
      (sourceDirectories.some((directory) => file.startsWith(directory)) &&
        !sourceExcludedDirectories.some((directory) => file.startsWith(directory))),
  },
  dist: {
    label: "production",
    root: distRoot,
    defaultPort: 8182,
    production: true,
    isPublic: (file) => !privateDistFiles.has(file),
  },
};

// Content types of the file formats the site uses. A file with any other extension is not served.
const contentTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArguments(args) {
  const [modeName, ...options] = args;
  if (!Object.hasOwn(modes, modeName)) {
    fail(`Unknown preview mode: ${modeName ?? "(none)"}\n${usage}`);
  }
  const mode = modes[modeName];
  if (options.length === 0) {
    return { modeName, mode, port: mode.defaultPort };
  }
  if (options.length !== 2 || options[0] !== "--port") {
    fail(`Unsupported arguments: ${options.join(" ")}\n${usage}`);
  }

  const port = /^\d{1,5}$/.test(options[1]) ? Number(options[1]) : NaN;
  if (!(port >= 1 && port <= 65535)) {
    fail(`Invalid port: ${options[1]}. Use a whole number from 1 to 65535, for example npm run preview:${modeName} -- --port 8282`);
  }
  return { modeName, mode, port };
}

function isValidHeader(name, value) {
  try {
    http.validateHeaderName(name);
    http.validateHeaderValue(name, value);
    return value !== "";
  } catch {
    return false;
  }
}

// Reads the headers of the site-wide /* rule from dist/_headers, the only rule the repository
// declares. As in scripts/check-csp.js, a line starting with / opens the rule for that path
// pattern, the "Name: value" lines below it are the rule's headers, and # starts a comment.
// Throws when the file is missing or malformed, or has no /* rule with a Content-Security-Policy.
function readHeaderRules() {
  let text;
  try {
    text = fs.readFileSync(path.join(distRoot, "_headers"), "utf8");
  } catch {
    throw new Error("dist/_headers is missing or unreadable. Run npm run build to recreate dist/.");
  }

  const rules = new Map();
  let ruleHeaders = null;
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    if (line.startsWith("/")) {
      if (rules.has(line)) {
        throw new Error(`dist/_headers line ${index + 1}: the rule for ${line} is declared twice.`);
      }
      ruleHeaders = [];
      rules.set(line, ruleHeaders);
      return;
    }

    const separator = line.indexOf(":");
    const name = separator > 0 ? line.slice(0, separator).trim() : "";
    const value = line.slice(separator + 1).trim();
    if (!ruleHeaders || !isValidHeader(name, value)) {
      throw new Error(`dist/_headers line ${index + 1} is not a "Name: value" header of a path rule: ${line}`);
    }
    ruleHeaders.push([name, value]);
  });

  const siteHeaders = rules.get("/*");
  if (!siteHeaders?.some(([name]) => name.toLowerCase() === "content-security-policy")) {
    throw new Error("dist/_headers has no /* rule with a Content-Security-Policy. Run npm run build to recreate dist/.");
  }
  return { siteHeaders, otherRules: [...rules.keys()].filter((rulePath) => rulePath !== "/*") };
}

// The production preview never starts without the published header policy and 404 page.
function checkProductionPackage() {
  if (!fs.statSync(distRoot, { throwIfNoEntry: false })?.isDirectory()) {
    fail("dist/ does not exist. Run npm run build first.");
  }
  for (const page of ["index.html", "404.html"]) {
    if (!fs.statSync(path.join(distRoot, page), { throwIfNoEntry: false })?.isFile()) {
      fail(`dist/${page} is missing. Run npm run build to recreate dist/.`);
    }
  }

  try {
    const { otherRules } = readHeaderRules();
    if (otherRules.length > 0) {
      console.warn(`dist/_headers also declares rules for ${otherRules.join(", ")}; the preview applies only the /* rule.`);
    }
  } catch (error) {
    fail(error.message);
  }
}

// Returns the requested path relative to the document root, with a trailing / served as
// index.html, or null for a request target that is not a well-formed path.
function parseRequestPath(url) {
  if (!url.startsWith("/")) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(url.split("?")[0]);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;
  return (pathname.endsWith("/") ? `${pathname}index.html` : pathname).slice(1);
}

// Resolves a request path to a servable regular file inside the document root, or null. The
// public-file rules apply to the canonical path that the file system reports, so encoded
// separators, dot segments, links, letter case, and Windows short names or trailing dots cannot
// reach a file outside the public set.
async function resolveFile(site, requestPath) {
  const segments = requestPath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === ".." || /[\\:]/.test(segment))) {
    return null;
  }

  let filePath;
  try {
    filePath = await fs.promises.realpath(path.join(site.root, ...segments));
    if (!(await fs.promises.stat(filePath)).isFile()) return null;
  } catch {
    return null;
  }

  const relativePath = path.relative(site.realRoot, filePath);
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  const file = relativePath.split(path.sep).join("/");
  const contentType = contentTypes[path.extname(file).toLowerCase()];
  return site.isPublic(file) && contentType ? { filePath, contentType } : null;
}

function send(request, response, statusCode, contentType, body) {
  response.writeHead(statusCode, { "Content-Type": contentType, "Content-Length": body.length });
  response.end(request.method === "HEAD" ? undefined : body);
}

function sendText(request, response, statusCode, message) {
  send(request, response, statusCode, contentTypes[".txt"], Buffer.from(`${message}\n`));
}

async function sendFile(request, response, statusCode, { filePath, contentType }) {
  let body;
  try {
    body = await fs.promises.readFile(filePath);
  } catch (error) {
    console.error(`Cannot read ${filePath}: ${error.message}`);
    sendText(request, response, 500, "500 Internal Server Error");
    return;
  }
  send(request, response, statusCode, contentType, body);
}

async function handleRequest(site, request, response) {
  // dist/ is read on every request, so a rebuild needs no restart. Every production response,
  // including errors and the 404 page, carries the headers of the /* rule.
  if (site.production) {
    let siteHeaders;
    try {
      ({ siteHeaders } = readHeaderRules());
    } catch (error) {
      console.error(error.message);
      sendText(request, response, 500, `500 Internal Server Error: ${error.message}`);
      return;
    }
    for (const [name, value] of siteHeaders) {
      response.appendHeader(name, value);
    }
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(request, response, 405, "405 Method Not Allowed");
    return;
  }

  const requestPath = parseRequestPath(request.url);
  if (requestPath === null) {
    sendText(request, response, 400, "400 Bad Request");
    return;
  }

  const file = await resolveFile(site, requestPath);
  if (file) {
    await sendFile(request, response, 200, file);
  } else if (site.production) {
    // Like the host, answer every unmatched path with the maintained 404 page.
    await sendFile(request, response, 404, { filePath: path.join(distRoot, "404.html"), contentType: contentTypes[".html"] });
  } else {
    sendText(request, response, 404, "404 Not Found");
  }
}

function main() {
  const { modeName, mode, port } = parseArguments(process.argv.slice(2));
  if (mode.production) {
    checkProductionPackage();
  }
  const site = { ...mode, realRoot: fs.realpathSync.native(mode.root) };

  const server = http.createServer((request, response) => {
    handleRequest(site, request, response).catch((error) => {
      console.error(error);
      if (response.headersSent) {
        response.destroy();
      } else {
        sendText(request, response, 500, "500 Internal Server Error");
      }
    });
  });

  // Never fall back to another port: the preview must stay on the origin it was started for.
  server.on("error", (error) => {
    const retry = `Stop the program using it or choose another port: npm run preview:${modeName} -- --port <number>`;
    if (error.code === "EADDRINUSE") fail(`Port ${port} on ${host} is already in use. ${retry}`);
    if (error.code === "EACCES") fail(`Permission denied for port ${port} on ${host}. ${retry}`);
    fail(`Cannot start the ${mode.label} preview: ${error.message}`);
  });

  server.listen(port, host, () => {
    console.log(`Aurora ${mode.label} preview of ${mode.production ? "dist/" : "the project root"}: http://${host}:${port}/`);
    console.log("Press Ctrl+C to stop.");
  });
}

main();
