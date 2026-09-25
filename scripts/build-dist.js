const fs = require("fs");
const path = require("path");

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

// The maintained pages load the canonical sources. Only their published copies are
// rewritten to load the generated bundles.
const assetReferences = [
  {
    source: '<link rel="stylesheet" href="css/style.css" />',
    production: '<link rel="stylesheet" href="css/style.min.css" />',
  },
  {
    source: '<script type="module" src="js/script.js"></script>',
    production: '<script src="js/script.min.js"></script>',
  },
];

// Development entry points that no published page may reference.
const sourceEntryPoints = ["css/style.css", "js/script.js"];

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

// Each page must contain every source reference exactly once, so a page whose tags
// changed fails the build instead of shipping a reference the rewrite skipped.
function toProductionHtml(htmlFile) {
  let html = fs.readFileSync(path.join(projectRoot, htmlFile), "utf8");

  for (const { source, production } of assetReferences) {
    const parts = html.split(source);
    if (parts.length !== 2) {
      fail(`${htmlFile}: expected exactly one ${source}, found ${parts.length - 1}`);
    }
    html = parts.join(production);
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

  const productionPages = getHtmlFiles().map((htmlFile) => [htmlFile, toProductionHtml(htmlFile)]);
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
