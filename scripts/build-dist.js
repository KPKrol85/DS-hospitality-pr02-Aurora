const fs = require("fs");
const path = require("path");
const { maintainedPages, assetReferences } = require("./site-build-contract");

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");

// Stages the production package. The CSS and JS bundles are not copied: build:css and
// build:js generate them into dist/css/ and dist/js/ after this step.
const requiredFiles = [
  "service-worker.js",
  "site.webmanifest",
  "robots.txt",
  "sitemap.xml",
  "_headers",
];

// Build inputs inside a copied directory that are never published. assets/img-src/
// holds the raster sources that build:images turns into assets/img/.
const excludedPaths = ["assets/img-src"];

// Development entry points that no published page may reference.
const sourceEntryPoints = assetReferences.map(({ source }) => source.file);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureFileExists(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required deployment file: ${relativePath}`);
  }
}

function copyFile(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const targetPath = path.join(distRoot, relativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function copyDirectory(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const targetPath = path.join(distRoot, relativePath);
  const excludedSources = new Set(excludedPaths.map((excludedPath) => path.join(projectRoot, excludedPath)));

  // Rejecting an excluded directory also skips everything beneath it.
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    filter: (source) => !excludedSources.has(source),
  });
}

function getHtmlFiles() {
  return fs
    .readdirSync(projectRoot)
    .filter((entry) => entry.endsWith(".html"))
    .sort();
}

// The root pages must be exactly the declared maintained pages: a deleted page fails the
// build, and a new page is published only once it is declared, which also makes
// check:css-assets verify it. Runs before anything is written to dist/.
function checkPageInventory() {
  const rootPages = getHtmlFiles();
  const missingPages = maintainedPages.filter((page) => !rootPages.includes(page));
  const undeclaredPages = rootPages.filter((page) => !maintainedPages.includes(page));

  if (missingPages.length > 0 || undeclaredPages.length > 0) {
    fail(
      [
        "Root HTML pages do not match maintainedPages in scripts/site-build-contract.js:",
        ...missingPages.map((page) => `- ${page} is declared but missing; restore it or remove it from maintainedPages`),
        ...undeclaredPages.map((page) => `- ${page} is not declared; add it to maintainedPages to publish it`),
      ].join("\n")
    );
  }
}

// Each page must contain every source reference exactly once, so a page whose tags
// changed fails the build instead of shipping a reference the rewrite skipped.
function toProductionHtml(htmlFile) {
  let html = fs.readFileSync(path.join(projectRoot, htmlFile), "utf8");

  for (const { source, production } of assetReferences) {
    const parts = html.split(source.tag);
    if (parts.length !== 2) {
      fail(`${htmlFile}: expected exactly one ${source.tag}, found ${parts.length - 1}`);
    }
    html = parts.join(production.tag);
  }

  for (const entryPoint of sourceEntryPoints) {
    if (html.includes(entryPoint)) {
      fail(`${htmlFile}: still references the development entry point ${entryPoint} after rewriting`);
    }
  }

  return html;
}

function main() {
  if (fs.existsSync(distRoot) && fs.readdirSync(distRoot).length > 0) {
    fail("dist/ is not empty. Run npm run clean first; npm run build does this before staging.");
  }

  checkPageInventory();
  const productionPages = maintainedPages.map((htmlFile) => [htmlFile, toProductionHtml(htmlFile)]);
  const includedFiles = [];

  requiredFiles.forEach(ensureFileExists);
  fs.mkdirSync(distRoot, { recursive: true });

  for (const [htmlFile, html] of productionPages) {
    fs.writeFileSync(path.join(distRoot, htmlFile), html);
    includedFiles.push(htmlFile);
  }

  copyDirectory("assets");
  includedFiles.push("assets/");

  for (const relativePath of requiredFiles) {
    copyFile(relativePath);
    includedFiles.push(relativePath);
  }

  console.log("Dist staging completed. build:css and build:js generate the bundles next.");
  console.log(`Included: ${includedFiles.join(", ")}`);
  console.log(`Excluded: ${excludedPaths.map((excludedPath) => `${excludedPath}/`).join(", ")}`);
}

main();
