const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "js", "script.min.js");

if (!fs.existsSync(outputPath)) {
  console.error("Missing built JS file: js/script.min.js");
  process.exit(1);
}

const content = fs.readFileSync(outputPath, "utf8");

if (/\bimport\b/.test(content) || /\bexport\b/.test(content)) {
  console.error("Built JS still contains import/export syntax: js/script.min.js");
  process.exit(1);
}

console.log("Built JS verification passed: js/script.min.js");
