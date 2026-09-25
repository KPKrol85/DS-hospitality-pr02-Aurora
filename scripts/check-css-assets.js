const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, 'dist');

// Standard:
// - maintained pages load the canonical sources: css/style.css and js/script.js (ES module)
// - npm run build publishes copies of them to dist/ that load the generated bundles
//   dist/css/style.min.css and dist/js/script.min.js
// - minified bundles are generated only in dist/, never in the source directories
const sourceAssets = [
  { file: 'css/style.css', tag: '<link rel="stylesheet" href="css/style.css" />' },
  { file: 'js/script.js', tag: '<script type="module" src="js/script.js"></script>' },
];

const productionAssets = [
  { file: 'css/style.min.css', tag: '<link rel="stylesheet" href="css/style.min.css" />' },
  { file: 'js/script.min.js', tag: '<script src="js/script.min.js"></script>' },
];

const htmlPages = [
  '404.html',
  'index.html',
  'about.html',
  'contact.html',
  'tours.html',
  'tour.html',
  'offline.html',
  'dziekuje.html',
  'cookies.html',
  'regulamin.html',
  'polityka-prywatnosci.html',
  'gallery.html',
];

const issues = [];

function countOccurrences(content, value) {
  return content.split(value).length - 1;
}

// A page loads each asset of its own set exactly once and no asset of the other set.
function checkPage(pageLabel, html, expectedAssets, foreignAssets) {
  for (const { tag } of expectedAssets) {
    const count = countOccurrences(html, tag);
    if (count !== 1) {
      issues.push(`${pageLabel}: expected exactly one ${tag}, found ${count}`);
    }
  }

  for (const { file } of foreignAssets) {
    if (html.includes(file)) {
      issues.push(`${pageLabel}: must not reference ${file}`);
    }
  }
}

function checkSources() {
  for (const { file } of sourceAssets) {
    if (!fs.existsSync(path.join(projectRoot, file))) {
      issues.push(`Missing canonical source: ${file}`);
    }
  }

  for (const { file } of productionAssets) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      issues.push(`Obsolete source-tree bundle: ${file} (minified CSS and JS are generated only in dist/; delete it)`);
    }
  }

  for (const page of htmlPages) {
    const htmlPath = path.join(projectRoot, page);
    if (!fs.existsSync(htmlPath)) {
      issues.push(`Missing maintained page: ${page}`);
      continue;
    }

    checkPage(page, fs.readFileSync(htmlPath, 'utf8'), sourceAssets, productionAssets);
  }
}

function checkProduction() {
  for (const { file } of productionAssets) {
    if (!fs.existsSync(path.join(distRoot, file))) {
      issues.push(`Missing production bundle: dist/${file}`);
    }

    // dist/css/ and dist/js/ hold only the generated bundles, never the development
    // entry points or module trees.
    const directory = path.posix.dirname(file);
    const directoryPath = path.join(distRoot, directory);
    const entries = fs.existsSync(directoryPath) ? fs.readdirSync(directoryPath) : [];
    for (const entry of entries) {
      if (entry !== path.posix.basename(file)) {
        issues.push(`Unexpected dist/${directory}/${entry}: only the generated bundle is published there`);
      }
    }
  }

  for (const page of htmlPages) {
    const htmlPath = path.join(distRoot, page);
    if (!fs.existsSync(htmlPath)) {
      issues.push(`Missing generated page: dist/${page}`);
      continue;
    }

    checkPage(`dist/${page}`, fs.readFileSync(htmlPath, 'utf8'), productionAssets, sourceAssets);
  }
}

// Resolves STATIC_ASSETS entries that are string literals or names of string constants
// declared in the worker (OFFLINE_URL); anything else is reported as unresolved.
function readPrecacheList(serviceWorkerContent) {
  const listMatch = serviceWorkerContent.match(/const STATIC_ASSETS = \[([^\]]*)\]/);
  if (!listMatch) return null;

  const constants = new Map();
  for (const [, name, value] of serviceWorkerContent.matchAll(/const (\w+) = "([^"]*)";/g)) {
    constants.set(name, value);
  }

  return listMatch[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const literal = entry.match(/^"([^"]*)"$/);
      return { entry, url: literal ? literal[1] : (constants.get(entry) ?? null) };
    });
}

function toDistFile(urlPath) {
  const relativePath = urlPath.replace(/^\//, '');
  return relativePath === '' || relativePath.endsWith('/') ? `${relativePath}index.html` : relativePath;
}

// Returns the number of precached files, all of which must exist in dist/.
function checkServiceWorker() {
  const serviceWorkerPath = path.join(distRoot, 'service-worker.js');
  if (!fs.existsSync(serviceWorkerPath)) {
    issues.push('Missing production Service Worker: dist/service-worker.js');
    return 0;
  }

  const serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');
  for (const { file } of sourceAssets) {
    if (serviceWorkerContent.includes(`/${file}`)) {
      issues.push(`Service Worker contains legacy /${file} reference`);
    }
  }

  const precacheEntries = readPrecacheList(serviceWorkerContent);
  if (!precacheEntries) {
    issues.push('dist/service-worker.js: STATIC_ASSETS precache list not found');
    return 0;
  }

  const precacheUrls = [];
  for (const { entry, url } of precacheEntries) {
    if (url === null) {
      issues.push(`dist/service-worker.js: cannot resolve STATIC_ASSETS entry ${entry}`);
    } else {
      precacheUrls.push(url);
    }
  }

  for (const { file } of productionAssets) {
    if (!precacheUrls.includes(`/${file}`)) {
      issues.push(`Service Worker STATIC_ASSETS must include /${file}`);
    }
  }

  for (const url of precacheUrls) {
    const distFile = toDistFile(url);
    if (!fs.existsSync(path.join(distRoot, distFile))) {
      issues.push(`Service Worker precaches ${url}, but dist/${distFile} does not exist`);
    }
  }

  // The production bundle must register the worker that was staged into dist/.
  const bundlePath = path.join(distRoot, 'js', 'script.min.js');
  if (fs.existsSync(bundlePath)) {
    const registration = fs.readFileSync(bundlePath, 'utf8').match(/serviceWorker\.register\((["'])([^"']+)\1/);
    if (!registration) {
      issues.push('dist/js/script.min.js does not register the Service Worker');
    } else if (!fs.existsSync(path.join(distRoot, toDistFile(registration[2])))) {
      issues.push(`dist/js/script.min.js registers ${registration[2]}, which is missing from dist/`);
    }
  }

  return precacheUrls.length;
}

function main() {
  if (!fs.existsSync(distRoot)) {
    console.error('Missing dist/. Run npm run build to generate the production package.');
    process.exit(1);
  }

  checkSources();
  checkProduction();
  const precacheCount = checkServiceWorker();

  if (issues.length > 0) {
    console.error('CSS/JS asset check failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `CSS/JS asset check passed: ${htmlPages.length} maintained pages load css/style.css and js/script.js, ` +
      `${htmlPages.length} dist/ pages load css/style.min.css and js/script.min.js, ` +
      `dist/service-worker.js precaches ${precacheCount} files present in dist/`
  );
}

main();
