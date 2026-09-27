const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();

// _headers is the approved security policy: this check reads it and never writes it. The browser
// runs an inline script only when the SHA-256 hash of its text is a source of script-src, so
// every inline script in the checked pages must match an approved hash, and every approved hash
// must belong to one of them. A new or changed inline script fails the check until its hash has
// been reviewed and added to _headers by hand.
const headersFile = "_headers";

// The browser never executes a JSON-LD data block. Any other inline <script>, whatever its type,
// counts as executable and needs an approved hash.
const jsonLdType = "application/ld+json";

// A script element: the attributes of its start tag and, unless the end tag is missing, its
// text, which ends at the first </script> as in the HTML parser. HTML comments are not skipped,
// so a commented-out script is checked like any other.
const scriptPattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>(?:([\s\S]*?)<\/script\s*>)?/gi;
const startTagPattern = /<([a-z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
const attributePattern = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

const sha256SourcePattern = /^'sha256-([A-Za-z0-9+/]{43}=)'$/i;

const usage = "Usage: node scripts/check-csp.js [--dist]";

function fail(lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}

function toLabel(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

// Counts line breaks as the HTML parser does: CRLF, LF or a lone CR.
function getLineNumber(source, index) {
  return source.slice(0, index).split(/\r\n?|\n/).length;
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// The browser hashes the text of a script as parsed from the page, and HTML parsing turns CRLF
// and lone CR line endings into LF. Everything else, indentation and blank lines included, is
// part of the hash and is taken as written.
function hashScriptText(text) {
  const parsedText = text.replace(/\r\n?/g, "\n");
  return `sha256-${crypto.createHash("sha256").update(parsedText, "utf8").digest("base64")}`;
}

// Lowercase attribute names with their values; a valueless attribute has "". As in HTML, the
// first of two attributes with the same name wins.
function parseAttributes(source) {
  const attributes = new Map();
  for (const [, name, doubleQuoted, singleQuoted, unquoted] of source.matchAll(attributePattern)) {
    const key = name.toLowerCase();
    if (!attributes.has(key)) {
      attributes.set(key, doubleQuoted ?? singleQuoted ?? unquoted ?? "");
    }
  }
  return attributes;
}

// Replaces a range with spaces but keeps its line breaks, so line numbers stay correct.
function blank(source, start, end) {
  return source.slice(0, start) + source.slice(start, end).replace(/[^\r\n]/g, " ") + source.slice(end);
}

// Reads the site-wide Content-Security-Policy of a Netlify _headers file, where a line starting
// with / opens the rule for that path pattern, the "Name: value" lines below it are the rule's
// headers, and # starts a comment. Returns { file, line, value }, or null after reporting why the
// file has no single policy that applies to every page.
function readPolicy(headersPath, missingMessage, issues) {
  const file = toLabel(headersPath);
  if (!fs.existsSync(headersPath)) {
    issues.push(missingMessage);
    return null;
  }

  const policies = [];
  let rulePath = null;
  fs.readFileSync(headersPath, "utf8")
    .split(/\r?\n/)
    .forEach((text, index) => {
      const line = text.trim();
      if (!line || line.startsWith("#")) return;
      if (line.startsWith("/")) {
        rulePath = line;
        return;
      }
      const separator = line.indexOf(":");
      if (separator > 0 && line.slice(0, separator).trim().toLowerCase() === "content-security-policy") {
        policies.push({ file, line: index + 1, rulePath, value: line.slice(separator + 1).trim() });
      }
    });

  if (policies.length !== 1 || policies[0].rulePath !== "/*") {
    const found = policies.map(({ line, rulePath: owner }) => `line ${line} under ${owner ?? "no path"}`).join(", ");
    issues.push(`${file} -> expected one Content-Security-Policy in the site-wide /* rule, found ${found || "none"}`);
    return null;
  }
  return policies[0];
}

// A policy is a list of directives separated by ";", each a name followed by its sources.
function parseDirectives(value) {
  return value
    .split(";")
    .map((directive) => directive.trim().split(/\s+/))
    .filter(([name]) => name)
    .map(([name, ...sources]) => ({ name: name.toLowerCase(), sources }));
}

// dist/_headers is the copy of _headers that build:stage writes. Another policy there means that
// dist/ is stale or was edited after the build, and would not publish the approved policy.
function compareWithSourcePolicy(distPolicy, issues) {
  const sourceIssues = [];
  const sourcePolicy = readPolicy(
    path.join(projectRoot, headersFile),
    `${headersFile} is missing, so the policy in dist/ cannot be compared with the approved one`,
    sourceIssues
  );
  if (!sourcePolicy) {
    issues.push(...sourceIssues);
    return;
  }
  if (sourcePolicy.value === distPolicy.value) return;

  const toMap = (value) => new Map(parseDirectives(value).map(({ name, sources }) => [name, sources.join(" ")]));
  const source = toMap(sourcePolicy.value);
  const dist = toMap(distPolicy.value);
  const differing = [...new Set([...source.keys(), ...dist.keys()])].filter((name) => source.get(name) !== dist.get(name));
  issues.push(
    `${distPolicy.file}:${distPolicy.line} -> the Content-Security-Policy differs from ${sourcePolicy.file}:${sourcePolicy.line} ` +
      `in ${differing.length > 0 ? differing.join(", ") : "formatting"}, so dist/ is stale or was edited after the build; run npm run build`
  );
}

// Returns the approved hashes of script-src and whether it allows 'self'. Reports the sources and
// directives that would let an inline script run without a reviewed hash, or that this check
// cannot verify.
function readScriptSrc(policy, issues) {
  const at = `${policy.file}:${policy.line}`;
  const directives = parseDirectives(policy.value);

  for (const name of ["script-src-elem", "script-src-attr"]) {
    if (directives.some((directive) => directive.name === name)) {
      issues.push(`${at} -> ${name} takes precedence over script-src for inline scripts; keep their approval in script-src`);
    }
  }

  const scriptSrc = directives.filter((directive) => directive.name === "script-src");
  if (scriptSrc.length !== 1) {
    issues.push(`${at} -> expected one script-src directive, found ${scriptSrc.length}`);
    return null;
  }

  const approvedHashes = new Set();
  let allowsSelf = false;
  for (const source of scriptSrc[0].sources) {
    const keyword = source.toLowerCase();
    const hash = source.match(sha256SourcePattern);
    if (keyword === "'self'") {
      allowsSelf = true;
    } else if (keyword === "'unsafe-inline'") {
      issues.push(`${at} -> script-src contains 'unsafe-inline'; inline scripts are approved only by their SHA-256 hashes`);
    } else if (keyword.startsWith("'nonce-")) {
      issues.push(`${at} -> script-src contains ${source}; a nonce in a static policy approves any inline script that repeats it`);
    } else if (hash) {
      approvedHashes.add(`sha256-${hash[1]}`);
    } else if (/^'sha\d+-/.test(keyword)) {
      issues.push(`${at} -> script-src contains ${source}; this check verifies only 'sha256-<base64 digest>' sources`);
    }
  }

  return { at, file: policy.file, approvedHashes, allowsSelf };
}

// Collects the scripts of a page: the hash of each inline script, the JSON-LD blocks and the
// external scripts. Also reports inline code that no hash can approve, because script-src
// without 'unsafe-inline' blocks it: event handler attributes and javascript: URLs.
function scanPage(pagePath, scan, issues) {
  const file = toLabel(pagePath);
  const html = fs.readFileSync(pagePath, "utf8");
  // The page with the text of its script elements blanked, so the attribute scan reads tags only.
  let markup = html;

  for (const match of html.matchAll(scriptPattern)) {
    const [, attributeSource, text] = match;
    const location = `${file}:${getLineNumber(html, match.index)}`;
    const startTag = `<script${attributeSource}>`.replace(/\s+/g, " ");
    const textStart = match.index + "<script".length + attributeSource.length + 1;
    const attributes = parseAttributes(attributeSource);

    if (text === undefined) {
      issues.push(`${location} -> ${startTag} has no </script> end tag, so the rest of the page is its text`);
      markup = blank(markup, textStart, html.length);
      continue;
    }
    markup = blank(markup, textStart, textStart + text.length);

    if (attributes.has("src")) {
      scan.externalScripts.push({ location, src: attributes.get("src") });
    } else if (attributes.get("type")?.trim().toLowerCase() === jsonLdType) {
      scan.jsonLdBlocks += 1;
    } else {
      scan.inlineScripts.push({ location, startTag, hash: hashScriptText(text) });
    }
  }

  for (const match of markup.matchAll(startTagPattern)) {
    const [, tagName, attributeSource] = match;
    const tag = tagName.toLowerCase();
    const location = `${file}:${getLineNumber(markup, match.index)}`;
    for (const [name, value] of parseAttributes(attributeSource)) {
      if (/^on[a-z]/.test(name)) {
        issues.push(
          `${location} -> <${tag} ${name}> is an inline event handler, which the policy blocks; attach the listener from a script file`
        );
      } else if (/^javascript:/i.test(value.replace(/[\t\n\r]/g, "").trim())) {
        issues.push(`${location} -> <${tag} ${name}="${value}"> is a javascript: URL, which the policy blocks`);
      }
    }
  }
}

function checkApprovals(scan, scriptSrc, siteLabel, issues) {
  for (const { location, startTag, hash } of scan.inlineScripts) {
    if (!scriptSrc.approvedHashes.has(hash)) {
      issues.push(`${location} -> inline ${startTag} hashes to '${hash}', which script-src in ${scriptSrc.file} does not approve`);
    }
  }

  const usedHashes = new Set(scan.inlineScripts.map(({ hash }) => hash));
  for (const hash of scriptSrc.approvedHashes) {
    if (!usedHashes.has(hash)) {
      issues.push(`${scriptSrc.at} -> script-src approves '${hash}', which no inline script in ${siteLabel} has; remove it`);
    }
  }

  // 'self' covers paths on the site's own origin only; a scheme or a leading // or \\ names
  // another origin, or a data: or blob: URL.
  const sameOrigin = [];
  for (const { location, src } of scan.externalScripts) {
    if (/^(?:[a-z][a-z\d+.-]*:|[\\/]{2})/i.test(src.trim())) {
      issues.push(
        `${location} -> <script src="${src}"> is not a same-origin script; script-src approves external scripts only through 'self'`
      );
    } else {
      sameOrigin.push(location);
    }
  }
  if (sameOrigin.length > 0 && !scriptSrc.allowsSelf) {
    const needing = plural(sameOrigin.length, "external script needs", "external scripts need");
    issues.push(`${scriptSrc.at} -> script-src lacks 'self', which ${needing} (first at ${sameOrigin[0]})`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dist")) {
    fail([`Unsupported arguments: ${args.join(" ")}`, usage]);
  }

  // By default the maintained pages are checked against _headers. With --dist, the pages of the
  // production package are checked against dist/_headers, the policy published with them, which
  // must in turn match _headers.
  const checkDist = args.includes("--dist");
  const siteRoot = checkDist ? path.join(projectRoot, "dist") : projectRoot;
  const siteLabel = checkDist ? "dist/" : "the project root";

  if (!fs.existsSync(siteRoot)) {
    fail(["Missing dist/. Run npm run build to generate the production package."]);
  }

  const issues = [];
  const policy = readPolicy(
    path.join(siteRoot, headersFile),
    checkDist
      ? `dist/${headersFile} is missing, so dist/ would be published without its Content-Security-Policy; run npm run build`
      : `${headersFile} is missing; restore the approved policy from Git`,
    issues
  );
  if (policy && checkDist) {
    compareWithSourcePolicy(policy, issues);
  }
  const scriptSrc = policy && readScriptSrc(policy, issues);

  const pages = fs
    .readdirSync(siteRoot)
    .filter((entry) => entry.endsWith(".html"))
    .sort();
  if (pages.length === 0) {
    issues.push(`no HTML files found in ${siteLabel}`);
  }
  const scan = { inlineScripts: [], jsonLdBlocks: 0, externalScripts: [] };
  for (const page of pages) {
    scanPage(path.join(siteRoot, page), scan, issues);
  }

  if (scriptSrc) {
    checkApprovals(scan, scriptSrc, siteLabel, issues);
  }

  if (issues.length > 0) {
    fail([
      `CSP check failed for ${siteLabel}:`,
      ...issues.map((issue) => `- ${issue}`),
      `${headersFile} is the approved policy, and this check never changes it. Review a new or changed inline script before ` +
        "adding its hash to script-src there, remove hashes that no page uses, and run npm run build to publish both.",
    ]);
  }

  const hashCount = new Set(scan.inlineScripts.map(({ hash }) => hash)).size;
  const approvingPolicy = checkDist ? `${policy.file} matches ${headersFile}, and its script-src` : `script-src in ${policy.file}`;
  console.log(
    `CSP check passed: ${approvingPolicy} approves the ` +
      `${plural(hashCount, "hash", "hashes")} of ${plural(scan.inlineScripts.length, "inline script", "inline scripts")} ` +
      `in ${plural(pages.length, "HTML file", "HTML files")} in ${siteLabel}; ` +
      `${plural(scan.jsonLdBlocks, "JSON-LD block", "JSON-LD blocks")} and ` +
      `${plural(scan.externalScripts.length, "same-origin external script", "same-origin external scripts")} need no hash.`
  );
}

main();
