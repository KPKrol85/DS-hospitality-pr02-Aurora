const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// Standard:
// - development source stylesheet: css/style.css
// - production stylesheet: css/style.min.css
const devCssPath = path.join(projectRoot, 'css', 'style.css');
const prodCssPath = path.join(projectRoot, 'css', 'style.min.css');
const prodJsPath = path.join(projectRoot, 'js', 'script.min.js');

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

if (!fs.existsSync(devCssPath)) {
  console.error('Missing development stylesheet: css/style.css');
  process.exit(1);
}

if (!fs.existsSync(prodCssPath)) {
  console.error('Missing production stylesheet: css/style.min.css');
  process.exit(1);
}

if (!fs.existsSync(prodJsPath)) {
  console.error('Missing production script: js/script.min.js');
  process.exit(1);
}

const missingProdReferences = [];
const missingProdScriptReferences = [];
for (const page of htmlPages) {
  const htmlPath = path.join(projectRoot, page);
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes('href="css/style.min.css"')) {
    missingProdReferences.push(page);
  }
  if (!html.includes('src="js/script.min.js"')) {
    missingProdScriptReferences.push(page);
  }
}


const serviceWorkerPath = path.join(projectRoot, 'service-worker.js');
const serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');
if (!serviceWorkerContent.includes('/css/style.min.css')) {
  console.error('Service Worker STATIC_ASSETS must include /css/style.min.css');
  process.exit(1);
}

if (serviceWorkerContent.includes('/css/style.css')) {
  console.error('Service Worker STATIC_ASSETS contains legacy /css/style.css reference');
  process.exit(1);
}

if (!serviceWorkerContent.includes('/js/script.min.js')) {
  console.error('Service Worker STATIC_ASSETS must include /js/script.min.js');
  process.exit(1);
}

if (serviceWorkerContent.includes('/js/script.js')) {
  console.error('Service Worker STATIC_ASSETS contains legacy /js/script.js reference');
  process.exit(1);
}

if (missingProdReferences.length > 0) {
  console.error(
    `Expected production CSS reference (css/style.min.css) missing in: ${missingProdReferences.join(', ')}`
  );
  process.exit(1);
}

if (missingProdScriptReferences.length > 0) {
  console.error(
    `Expected production JS reference (js/script.min.js) missing in: ${missingProdScriptReferences.join(', ')}`
  );
  process.exit(1);
}

console.log('CSS/JS asset check passed: dev=css/style.css, prod=css/style.min.css, js/script.min.js');
