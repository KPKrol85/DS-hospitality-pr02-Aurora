const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "assets", "img");
const targetRoot = path.join(projectRoot, "assets", "img-src");
const rasterExtensions = new Set([".jpg", ".jpeg", ".png"]);
const force = process.argv.includes("--force");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    console.error("Missing assets/img directory.");
    process.exit(1);
  }

  ensureDir(targetRoot);

  let copiedCount = 0;
  let skippedCount = 0;

  for (const filePath of getFiles(sourceRoot)) {
    const extension = path.extname(filePath).toLowerCase();
    if (!rasterExtensions.has(extension)) {
      continue;
    }

    const relativePath = path.relative(sourceRoot, filePath);
    const targetPath = path.join(targetRoot, relativePath);

    if (!force && fs.existsSync(targetPath)) {
      skippedCount += 1;
      continue;
    }

    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(filePath, targetPath);
    copiedCount += 1;
  }

  console.log(`Image bootstrap completed. Copied: ${copiedCount}, skipped: ${skippedCount}`);
}

main();
