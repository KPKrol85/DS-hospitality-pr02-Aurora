const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "dist", "js", "script.min.js");

if (!fs.existsSync(outputPath)) {
  console.error("Missing built JS file: dist/js/script.min.js");
  process.exit(1);
}

const content = fs.readFileSync(outputPath, "utf8");

if (/\bimport\b/.test(content) || /\bexport\b/.test(content)) {
  console.error("Built JS still contains import/export syntax: dist/js/script.min.js");
  process.exit(1);
}

// esbuild replaces the flag with a constant; a surviving identifier means the bundle
// was built without it and would never register the Service Worker.
if (content.includes("__AURORA_PRODUCTION__")) {
  console.error("Built JS was bundled without --define:__AURORA_PRODUCTION__=true: dist/js/script.min.js");
  process.exit(1);
}

console.log("Built JS verification passed: dist/js/script.min.js");
