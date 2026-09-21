const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");

const requiredFiles = [
  "css/style.min.css",
  "js/script.min.js",
  "service-worker.js",
];

const optionalRootFiles = [
  "_headers",
  "_redirects",
  "site.webmanifest",
  "robots.txt",
  "sitemap.xml",
];

function ensureFileExists(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required deployment file: ${relativePath}`);
    process.exit(1);
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

  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

function getHtmlFiles() {
  return fs
    .readdirSync(projectRoot)
    .filter((entry) => entry.endsWith(".html"))
    .sort();
}

function main() {
  const htmlFiles = getHtmlFiles();
  const includedFiles = [];

  fs.mkdirSync(distRoot, { recursive: true });

  for (const relativePath of requiredFiles) {
    ensureFileExists(relativePath);
    copyFile(relativePath);
    includedFiles.push(relativePath);
  }

  copyDirectory("assets");
  includedFiles.push("assets/");

  for (const htmlFile of htmlFiles) {
    copyFile(htmlFile);
    includedFiles.push(htmlFile);
  }

  for (const relativePath of optionalRootFiles) {
    if (!fs.existsSync(path.join(projectRoot, relativePath))) {
      continue;
    }

    copyFile(relativePath);
    includedFiles.push(relativePath);
  }

  console.log("Dist build completed.");
  console.log(`Included: ${includedFiles.join(", ")}`);
}

main();
