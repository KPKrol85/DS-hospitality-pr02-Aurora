const fs = require("fs");
const path = require("path");

const distPath = path.join(process.cwd(), "dist");

fs.rmSync(distPath, { recursive: true, force: true });

console.log("Cleaned dist/");
