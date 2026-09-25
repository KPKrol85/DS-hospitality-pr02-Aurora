const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = process.cwd();

// Tracked approval record: the Service Worker VERSION and the SHA-256 of each generated
// bundle released under it. npm run build only reads it; npm run record:sw-bundles writes
// it, and only under a VERSION that advances the recorded one.
const referenceFile = "service-worker-bundles.json";
const referencePath = path.join(projectRoot, referenceFile);

// The worker precaches these under fixed URLs and serves them cache-first, so returning
// visitors receive new bytes only after VERSION changes.
const bundles = ["dist/css/style.min.css", "dist/js/script.min.js"];

// A name and a dot-separated number, such as aurora-1.6.
const versionPattern = /^([a-z][a-z0-9-]*)-(\d+(?:\.\d+)*)$/;
const sha256Pattern = /^[0-9a-f]{64}$/;

function fail(lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}

function parseVersion(value) {
  const match = typeof value === "string" ? value.match(versionPattern) : null;
  return match ? { prefix: match[1], numbers: match[2].split(".").map(Number) } : null;
}

// Positive when a is the later version of the same series, so aurora-1.10 follows aurora-1.9.
function compareVersions(a, b) {
  const length = Math.max(a.numbers.length, b.numbers.length);
  for (let index = 0; index < length; index++) {
    const difference = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function readWorkerVersion(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail([`Missing ${relativePath}.`]);
  }

  const match = fs.readFileSync(fullPath, "utf8").match(/^const VERSION = "([^"]*)";/m);
  if (!match) {
    fail([`${relativePath}: no const VERSION = "<name>-<number>"; declaration found`]);
  }
  return match[1];
}

function hashBundles() {
  const hashes = {};
  for (const bundle of bundles) {
    const fullPath = path.join(projectRoot, bundle);
    if (!fs.existsSync(fullPath)) {
      fail([`Missing production bundle ${bundle}. Run npm run build.`]);
    }
    hashes[bundle] = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
  }
  return hashes;
}

function readReference() {
  if (!fs.existsSync(referencePath)) {
    fail([
      `Missing ${referenceFile}, the tracked record of the bundle hashes approved for the Service Worker VERSION.`,
      `Restore it from Git. npm run record:sw-bundles -- --init only creates the first record in a repository that has none.`,
    ]);
  }

  const content = fs.readFileSync(referencePath, "utf8");
  let reference;
  try {
    reference = JSON.parse(content);
  } catch (error) {
    fail([`${referenceFile} is not valid JSON: ${error.message}`]);
  }

  const problems = [];
  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const sameKeys = (value, keys) => Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");

  if (!isObject(reference) || !sameKeys(reference, ["version", "sha256"])) {
    problems.push('expected exactly the keys "version" and "sha256"');
  } else {
    if (!parseVersion(reference.version)) {
      problems.push(`"version" must look like aurora-1.6, found ${JSON.stringify(reference.version)}`);
    }
    if (!isObject(reference.sha256) || !sameKeys(reference.sha256, bundles)) {
      problems.push(`"sha256" must map exactly ${bundles.join(" and ")}`);
    } else {
      for (const bundle of bundles) {
        if (typeof reference.sha256[bundle] !== "string" || !sha256Pattern.test(reference.sha256[bundle])) {
          problems.push(`"sha256" of ${bundle} must be 64 lowercase hexadecimal characters`);
        }
      }
    }
  }

  if (problems.length > 0) {
    fail([`${referenceFile} is malformed:`, ...problems.map((problem) => `- ${problem}`), "Restore it from Git."]);
  }

  return { ...reference, eol: content.includes("\r\n") ? "\r\n" : "\n" };
}

// Fixed key order and indentation, so a record differs from the previous one only in its values.
function writeReference(version, hashes, eol) {
  const json = JSON.stringify({ version, sha256: hashes }, null, 2);
  fs.writeFileSync(referencePath, json.replace(/\n/g, eol) + eol);
}

// The shipped worker must carry the recorded VERSION and the generated bundles the recorded
// bytes; any difference means a bundle could change without invalidating the cache.
function check() {
  const reference = readReference();
  const workerVersion = readWorkerVersion("dist/service-worker.js");
  const hashes = hashBundles();
  const issues = [];

  if (workerVersion !== reference.version) {
    issues.push(`dist/service-worker.js VERSION is ${workerVersion}, but ${referenceFile} records ${reference.version}`);
  }
  for (const bundle of bundles) {
    if (hashes[bundle] !== reference.sha256[bundle]) {
      issues.push(`${bundle} SHA-256 is ${hashes[bundle]}, but ${reference.version} records ${reference.sha256[bundle]}`);
    }
  }

  if (issues.length > 0) {
    fail([
      "Service Worker bundle check failed:",
      ...issues.map((issue) => `- ${issue}`),
      "Returning visitors keep the cache-first bundles until VERSION changes. To release changed bundles:",
      `  1. raise VERSION in service-worker.js above ${reference.version}`,
      "  2. npm run record:sw-bundles",
      "  3. npm run build",
    ]);
  }

  console.log(
    `Service Worker bundle check passed: ${bundles.join(" and ")} match the SHA-256 recorded for ${reference.version}`
  );
}

// Records the current bundles under the VERSION in service-worker.js. The bundles come from
// the last build; the next npm run build confirms that a fresh build reproduces them.
function record(initial) {
  const version = readWorkerVersion("service-worker.js");
  const parsedVersion = parseVersion(version);
  if (!parsedVersion) {
    fail([`service-worker.js VERSION ${version} must look like aurora-1.6: a name, a hyphen, dot-separated numbers`]);
  }

  let eol = os.EOL;
  let previous = null;
  if (initial) {
    if (fs.existsSync(referencePath)) {
      fail([
        `${referenceFile} already exists; --init only creates the first record.`,
        "Raise VERSION in service-worker.js and run npm run record:sw-bundles instead.",
      ]);
    }
  } else {
    previous = readReference();
    eol = previous.eol;
    const recordedVersion = parseVersion(previous.version);
    if (parsedVersion.prefix !== recordedVersion.prefix || compareVersions(parsedVersion, recordedVersion) <= 0) {
      fail([
        `Refusing to record: service-worker.js VERSION ${version} does not advance the recorded ${previous.version}.`,
        `Bundle hashes are recorded only under a new VERSION. Raise VERSION in service-worker.js above ${previous.version} first.`,
      ]);
    }
  }

  const hashes = hashBundles();
  writeReference(version, hashes, eol);

  console.log(`Recorded ${referenceFile} for ${version}${previous ? ` (previously ${previous.version})` : ""}:`);
  for (const bundle of bundles) {
    const state = !previous ? "" : hashes[bundle] === previous.sha256[bundle] ? " (unchanged)" : " (changed)";
    console.log(`- ${bundle} ${hashes[bundle]}${state}`);
  }
  console.log("Run npm run build to confirm that a fresh build reproduces the recorded bundles.");
}

function main() {
  const args = process.argv.slice(2);
  const known = new Set(["--record", "--init"]);
  const unknown = args.filter((arg) => !known.has(arg));
  if (unknown.length > 0 || (args.includes("--init") && !args.includes("--record"))) {
    fail([
      `Unsupported arguments: ${args.join(" ")}`,
      "Usage: node scripts/check-sw-bundles.js [--record [--init]]",
    ]);
  }

  if (args.includes("--record")) {
    record(args.includes("--init"));
  } else {
    check();
  }
}

main();
