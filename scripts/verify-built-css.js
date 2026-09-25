const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "dist", "css", "style.min.css");

if (!fs.existsSync(outputPath)) {
  console.error("Missing built CSS file: dist/css/style.min.css");
  process.exit(1);
}

const content = fs.readFileSync(outputPath, "utf8");

if (/@import\b/i.test(content)) {
  console.error("Built CSS still contains @import directives: dist/css/style.min.css");
  process.exit(1);
}

if (/sourceMappingURL/i.test(content)) {
  console.error("Built CSS must not contain sourcemap references: dist/css/style.min.css");
  process.exit(1);
}

console.log("Built CSS verification passed: dist/css/style.min.css");
