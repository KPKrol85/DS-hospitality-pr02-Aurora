const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const projectRoot = process.cwd();
const inputRoot = path.join(projectRoot, "assets", "img-src");
const outputRoot = path.join(projectRoot, "assets", "img");
const rasterExtensions = new Set([".jpg", ".jpeg", ".png"]);
const modernFormats = ["webp", "avif"];
const managedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const compatibilitySuffix = /-(\d+)x(\d+)$/i;

const profileWidths = {
  hero: [800, 1200, 1600, 2000],
  about: [400, 700, 1000, 1400],
  contact: [400, 700, 1000, 1400],
  "tour-index": [400, 700, 1000, 1400],
  tours: [400, 800, 1200, 1600],
};

const conservativeFolders = new Set(["icons", "screenshots", "shortcuts", "logo"]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

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

function getRelativeSegments(relativePath) {
  return relativePath.split(path.sep).filter(Boolean);
}

function getProfile(segments) {
  const [topLevel] = segments;

  if (profileWidths[topLevel]) {
    return { kind: "responsive", widths: profileWidths[topLevel] };
  }

  if (topLevel === "tours" && segments.length > 1) {
    return { kind: "responsive", widths: profileWidths.tours };
  }

  if (conservativeFolders.has(topLevel)) {
    return { kind: "conservative", widths: [] };
  }

  return { kind: "conservative", widths: [] };
}

function getBaseName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function getFallbackExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".jpeg" ? ".jpg" : extension;
}

function parseCompatibilityVariant(filePath) {
  const match = getBaseName(filePath).match(compatibilitySuffix);
  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

async function getVariantSpecs(filePath, relativePath) {
  const metadata = await sharp(filePath).metadata();
  const segments = getRelativeSegments(relativePath);
  const profile = getProfile(segments);
  const existingVariant = parseCompatibilityVariant(filePath);

  if (existingVariant) {
    return [existingVariant];
  }

  if (profile.kind !== "responsive") {
    return [
      {
        width: metadata.width || null,
        height: metadata.height || null,
        preserveName: true,
      },
    ];
  }

  const maxWidth = metadata.width || null;
  const widths = profile.widths.filter((width) => !maxWidth || width <= maxWidth);
  const safeWidths = widths.length ? widths : [maxWidth].filter(Boolean);

  return safeWidths.map((width) => {
    const height = metadata.width && metadata.height ? Math.round((metadata.height / metadata.width) * width) : null;
    return { width, height, preserveName: false };
  });
}

function buildTargetBasename(relativePath, variant) {
  const extension = path.extname(relativePath);
  const dirname = path.dirname(relativePath);
  const name = path.basename(relativePath, extension);

  if (compatibilitySuffix.test(name) || variant.preserveName || !variant.width || !variant.height) {
    return path.join(dirname, name);
  }

  return path.join(dirname, `${name}-${variant.width}x${variant.height}`);
}

function getExpectedTargets(relativePath, variant, fallbackExtension, profileKind) {
  const baseOutput = buildTargetBasename(relativePath, variant);
  const targets = [path.join(outputRoot, `${baseOutput}${fallbackExtension}`)];

  if (profileKind === "responsive") {
    for (const format of modernFormats) {
      targets.push(path.join(outputRoot, `${baseOutput}.${format}`));
    }
  }

  return targets;
}

function deleteIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function isManagedRaster(filePath) {
  return managedExtensions.has(path.extname(filePath).toLowerCase());
}

async function writeFallback(sourcePath, outputPath, variant) {
  const extension = path.extname(outputPath).toLowerCase();
  let pipeline = sharp(sourcePath, { failOn: "none" }).rotate();

  if (variant.width && variant.height) {
    pipeline = pipeline.resize({
      width: variant.width,
      height: variant.height,
      fit: "cover",
      withoutEnlargement: true,
    });
  }

  if (extension === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  } else {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  }

  await pipeline.toFile(outputPath);
}

async function writeModern(sourcePath, outputPath, variant, format) {
  let pipeline = sharp(sourcePath, { failOn: "none" }).rotate();

  if (variant.width && variant.height) {
    pipeline = pipeline.resize({
      width: variant.width,
      height: variant.height,
      fit: "cover",
      withoutEnlargement: true,
    });
  }

  if (format === "webp") {
    pipeline = pipeline.webp({ quality: 80 });
  } else {
    pipeline = pipeline.avif({ quality: 60 });
  }

  await pipeline.toFile(outputPath);
}

async function main() {
  if (!fs.existsSync(inputRoot)) {
    console.error("Missing assets/img-src directory. Run npm run images:bootstrap first.");
    process.exit(1);
  }

  const inputFiles = getFiles(inputRoot).filter((filePath) => rasterExtensions.has(path.extname(filePath).toLowerCase()));
  const expectedOutputs = new Set();
  const plans = [];

  for (const sourcePath of inputFiles) {
    const relativePath = path.relative(inputRoot, sourcePath);
    const segments = getRelativeSegments(relativePath);
    const profile = getProfile(segments);
    const fallbackExtension = getFallbackExtension(sourcePath);
    const variants = await getVariantSpecs(sourcePath, relativePath);

    for (const variant of variants) {
      const targets = getExpectedTargets(relativePath, variant, fallbackExtension, profile.kind);
      targets.forEach((targetPath) => expectedOutputs.add(targetPath));
      plans.push({ sourcePath, relativePath, profileKind: profile.kind, variant, targets });
    }
  }

  const managedOutputDirectories = new Set(
    inputFiles.map((filePath) => path.join(outputRoot, path.dirname(path.relative(inputRoot, filePath))))
  );

  for (const directoryPath of managedOutputDirectories) {
    if (!fs.existsSync(directoryPath)) {
      continue;
    }

    for (const filePath of getFiles(directoryPath)) {
      if (!isManagedRaster(filePath)) {
        continue;
      }
      if (!expectedOutputs.has(filePath)) {
        deleteIfExists(filePath);
      }
    }
  }

  let generatedCount = 0;

  for (const plan of plans) {
    for (const targetPath of plan.targets) {
      ensureDir(path.dirname(targetPath));
      deleteIfExists(targetPath);

      const extension = path.extname(targetPath).toLowerCase();
      if (extension === ".webp" || extension === ".avif") {
        await writeModern(plan.sourcePath, targetPath, plan.variant, extension.slice(1));
      } else {
        await writeFallback(plan.sourcePath, targetPath, plan.variant);
      }

      generatedCount += 1;
    }
  }

  console.log(`Image build completed. Sources: ${inputFiles.length}, generated files: ${generatedCount}`);
}

main().catch((error) => {
  console.error(`Image build failed: ${error.message}`);
  process.exit(1);
});
