const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const productionDomain = 'https://ds-hospitality-pr02-aurora.netlify.app';

// By default the maintained pages in the project root are checked; with --dist, the
// production package that npm run build generates in dist/.
const checkDist = process.argv.includes('--dist');
const siteRoot = checkDist ? path.join(projectRoot, 'dist') : projectRoot;
const siteLabel = checkDist ? 'dist/' : 'the project root';

// Stylesheet and runtime image references resolve as URLs, the way the browser resolves
// them: parent segments stop at the site root, so ../../assets/ in dist/css/style.min.css
// means dist/assets/, not the assets/ directory of the sources.
const siteOrigin = 'https://aurora.invalid';

// Views that build image paths in the browser from JSON data read from the checked root.
// The paths below mirror js/features/catalogue-picture.js, which builds the pictures of both
// views; tests/asset-integrity.test.js compares them with the paths the views render.
const tourImageDirectory = 'assets/img/tours/';
const responsiveImageSizes = ['400x260', '800x520', '1200x780', '1600x1040'];

const runtimeImageViews = [
  {
    dataFile: 'assets/data/gallery-data.json',
    page: 'gallery.html',
    module: 'js/features/gallery.js',
    records: 'gallery records',
    images: 'gallery images',
    collectPictures: collectGalleryPictures,
  },
  {
    dataFile: 'assets/data/tours.json',
    page: 'tour.html',
    module: 'js/features/tour-detail.js',
    records: 'tours',
    images: 'tour images',
    collectPictures: collectTourPictures,
  },
];

function getHtmlFiles(rootDir) {
  return fs
    .readdirSync(rootDir)
    .filter((entry) => entry.endsWith('.html'))
    .sort();
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

function isIgnoredReference(value) {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;

  return /^(https?:|mailto:|tel:|#|javascript:)/i.test(normalized) || normalized.startsWith('//');
}

function resolveLocalPath(refValue, htmlFilePath) {
  const cleanValue = stripQueryAndHash(refValue.trim());
  if (!cleanValue) return null;

  if (cleanValue.startsWith('/')) {
    return path.join(siteRoot, cleanValue.replace(/^\//, ''));
  }

  if (cleanValue.startsWith('assets/')) {
    return path.join(siteRoot, cleanValue);
  }

  return path.resolve(path.dirname(htmlFilePath), cleanValue);
}

// Only files inside the checked root count, so the dist/ package cannot pass on a
// reference that escapes it to a file present only in the sources.
function existsInSiteRoot(resolvedPath) {
  const relativePath = path.relative(siteRoot, resolvedPath);
  const isInside = relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
  return isInside && fs.existsSync(resolvedPath);
}

function checkFileReference({
  sourceFile,
  line,
  tag,
  attribute,
  originalValue,
  resolvedPath,
  brokenReferences,
}) {
  if (!resolvedPath) return;
  if (existsInSiteRoot(resolvedPath)) return;

  const relativeMissing = path.relative(projectRoot, resolvedPath);
  brokenReferences.push(
    `BROKEN: ${sourceFile}:${line} -> <${tag} ${attribute}="${originalValue}"> (missing file: ${relativeMissing})`
  );
}

function parseAttributes(tagContent) {
  const attributes = {};
  const attrRegex = /(\w[\w:-]*)\s*=\s*(["'])(.*?)\2/g;
  let attrMatch;

  while ((attrMatch = attrRegex.exec(tagContent)) !== null) {
    attributes[attrMatch[1].toLowerCase()] = attrMatch[3];
  }

  return attributes;
}

function extractSrcsetUrls(srcset) {
  return srcset
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .map((candidate) => candidate.split(/\s+/)[0])
    .filter(Boolean);
}

function isProductionDomainUrl(urlValue) {
  return urlValue.startsWith(`${productionDomain}/`);
}

function validateProductionDomainAsset(urlValue, sourceFile, line, context, brokenReferences) {
  if (!isProductionDomainUrl(urlValue)) return;

  const pathname = stripQueryAndHash(urlValue.slice(productionDomain.length));
  if (!pathname || pathname === '/') return;

  const resolvedPath = path.join(siteRoot, pathname.replace(/^\//, ''));
  if (!existsInSiteRoot(resolvedPath)) {
    const relativeMissing = path.relative(projectRoot, resolvedPath);
    brokenReferences.push(
      `BROKEN: ${sourceFile}:${line} -> ${context}="${urlValue}" (missing file: ${relativeMissing})`
    );
  }
}

function walkJsonLd(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) walkJsonLd(item, visitor);
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      visitor(key, nested);
      walkJsonLd(nested, visitor);
    }
  }
}

function checkManifestFile(manifestPath, sourceHtml, brokenReferences) {
  const manifestRelative = path.relative(projectRoot, manifestPath);

  if (!existsInSiteRoot(manifestPath)) {
    brokenReferences.push(
      `BROKEN: ${sourceHtml} -> <link rel="manifest"> (missing file: ${manifestRelative})`
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    brokenReferences.push(`BROKEN: ${manifestRelative} -> invalid JSON (${error.message})`);
    return;
  }

  function walkManifest(value, currentPath) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walkManifest(item, `${currentPath}[${index}]`));
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    for (const [key, nested] of Object.entries(value)) {
      const nestedPath = currentPath ? `${currentPath}.${key}` : key;

      if (key === 'src' && typeof nested === 'string' && nested.trim()) {
        const resolvedPath = resolveLocalPath(nested, manifestPath);
        if (!resolvedPath || existsInSiteRoot(resolvedPath)) continue;

        const missing = path.relative(projectRoot, resolvedPath);
        brokenReferences.push(
          `BROKEN: ${manifestRelative} -> ${nestedPath}="${nested}" (missing file: ${missing})`
        );
      }

      walkManifest(nested, nestedPath);
    }
  }

  walkManifest(manifest, '');
}

function checkHtmlFile(htmlName, brokenReferences, manifestRefs, stylesheetRefs) {
  const htmlPath = path.join(siteRoot, htmlName);
  const htmlFile = path.relative(projectRoot, htmlPath);
  const html = fs.readFileSync(htmlPath, 'utf8');

  const tagRegex = /<(link|script|img|source|a|meta)\b[^>]*>/gi;
  let tagMatch;

  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const fullTag = tagMatch[0];
    const tag = tagMatch[1].toLowerCase();
    const attrs = parseAttributes(fullTag);
    const line = getLineNumber(html, tagMatch.index);

    const checkAttribute = (attribute, value) => {
      if (isIgnoredReference(value)) return;

      const resolvedPath = resolveLocalPath(value, htmlPath);
      checkFileReference({
        sourceFile: htmlFile,
        line,
        tag,
        attribute,
        originalValue: value,
        resolvedPath,
        brokenReferences,
      });
    };

    if (tag === 'link' && attrs.href) {
      checkAttribute('href', attrs.href);

      if (typeof attrs.rel === 'string' && attrs.rel.toLowerCase().split(/\s+/).includes('manifest')) {
        const manifestPath = resolveLocalPath(attrs.href, htmlPath);
        if (manifestPath) {
          manifestRefs.add(`${manifestPath}::${htmlFile}`);
        }
      }

      if (typeof attrs.rel === 'string' && attrs.rel.toLowerCase().split(/\s+/).includes('stylesheet')) {
        const stylesheetPath = resolveSiteUrl(attrs.href, htmlPath);
        if (stylesheetPath) {
          stylesheetRefs.add(stylesheetPath);
        }
      }
    }

    if (tag === 'script' && attrs.src) {
      checkAttribute('src', attrs.src);
    }

    if (tag === 'img' && attrs.src) {
      checkAttribute('src', attrs.src);
    }

    if (tag === 'source' && attrs.srcset) {
      const urls = extractSrcsetUrls(attrs.srcset);
      for (const url of urls) {
        checkAttribute('srcset', url);
      }
    }

    if (tag === 'a' && attrs.href) {
      checkAttribute('href', attrs.href);
    }

    if (tag === 'meta') {
      const property = (attrs.property || '').toLowerCase();
      const name = (attrs.name || '').toLowerCase();
      const content = attrs.content || '';
      if (property === 'og:image') {
        validateProductionDomainAsset(content, htmlFile, line, 'meta[property="og:image"]', brokenReferences);
      }
      if (name === 'twitter:image') {
        validateProductionDomainAsset(content, htmlFile, line, 'meta[name="twitter:image"]', brokenReferences);
      }
    }
  }

  const jsonLdRegex = /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    const jsonText = jsonLdMatch[2].trim();
    if (!jsonText) continue;
    const line = getLineNumber(html, jsonLdMatch.index);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      brokenReferences.push(
        `BROKEN: ${htmlFile}:${line} -> <script type="application/ld+json"> invalid JSON (${error.message})`
      );
      continue;
    }

    walkJsonLd(parsed, (_key, value) => {
      if (typeof value !== 'string') return;
      validateProductionDomainAsset(value, htmlFile, line, 'JSON-LD URL', brokenReferences);
    });
  }
}

function toSiteUrl(filePath) {
  return `${siteOrigin}/${path.relative(siteRoot, filePath).split(path.sep).join('/')}`;
}

// Returns the file in the checked root that a reference names, resolved against the URL of
// the file that contains or requests it, or null for another origin or a non-file URL
// such as data:.
function resolveSiteUrl(refValue, baseFilePath) {
  let url;
  try {
    url = new URL(refValue, toSiteUrl(baseFilePath));
  } catch {
    return null;
  }
  if (url.origin !== siteOrigin) return null;

  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // A malformed percent escape is looked up as written.
  }
  return path.join(siteRoot, ...pathname.split('/'));
}

// Stylesheet tokens that can name a file. Comments and other strings are matched whole, so
// a commented-out rule or text such as content: "url(x)" is skipped. Groups: 1 "@import"
// before url(); 2-4 url() value in double quotes, single quotes or unquoted; 5-6 @import
// string in double or single quotes.
const cssReferenceRegex = new RegExp(
  [
    String.raw`/\*[\s\S]*?(?:\*/|$)`,
    String.raw`(@import\s*)?(?<![\w-])url\(\s*(?:"((?:[^"\\\n]|\\[\s\S])*)"|'((?:[^'\\\n]|\\[\s\S])*)'|((?:[^"'()\\\s]|\\[\s\S])*))\s*\)`,
    String.raw`@import\s*(?:"((?:[^"\\\n]|\\[\s\S])*)"|'((?:[^'\\\n]|\\[\s\S])*)')`,
    String.raw`"(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*'`,
  ].join('|'),
  'gi'
);

// Replaces the CSS escapes in a url() or string value with the characters they stand for.
function unescapeCss(value) {
  return value.replace(/\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|(\r\n|[\r\n\f])|([\s\S]))/gi, (_escape, hex, _newline, character) => {
    if (hex) {
      const codePoint = parseInt(hex, 16);
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\uFFFD';
    }
    return character ?? '';
  });
}

// Checks the local url() and @import references of a stylesheet and of the stylesheets it
// imports. Each stylesheet is read once, however many pages link it; a linked stylesheet
// that is missing is already reported by the page check.
function checkStylesheet(stylesheetPath, checkedStylesheets, brokenReferences) {
  if (checkedStylesheets.has(stylesheetPath) || !existsInSiteRoot(stylesheetPath)) return;
  checkedStylesheets.add(stylesheetPath);

  const stylesheetFile = path.relative(projectRoot, stylesheetPath);
  let css;
  try {
    css = fs.readFileSync(stylesheetPath, 'utf8');
  } catch (error) {
    brokenReferences.push(`BROKEN: ${stylesheetFile} -> cannot be read (${error.message})`);
    return;
  }

  const importedStylesheets = [];

  for (const match of css.matchAll(cssReferenceRegex)) {
    const [token, importPrefix, urlDouble, urlSingle, urlUnquoted, importDouble, importSingle] = match;
    const rawValue = urlDouble ?? urlSingle ?? urlUnquoted ?? importDouble ?? importSingle;
    if (rawValue === undefined) continue;

    // Empty and fragment-only values, such as url(#clip) for an SVG element, name no file.
    const value = unescapeCss(rawValue).trim();
    if (!value || value.startsWith('#')) continue;

    const resolvedPath = resolveSiteUrl(value, stylesheetPath);
    if (!resolvedPath) continue;

    if (!existsInSiteRoot(resolvedPath)) {
      const relativeMissing = path.relative(projectRoot, resolvedPath);
      brokenReferences.push(
        `BROKEN: ${stylesheetFile}:${getLineNumber(css, match.index)} -> ${token.replace(/\s+/g, ' ')} (missing file: ${relativeMissing})`
      );
    } else if (importPrefix !== undefined || importDouble !== undefined || importSingle !== undefined) {
      importedStylesheets.push(resolvedPath);
    }
  }

  for (const importedPath of importedStylesheets) {
    checkStylesheet(importedPath, checkedStylesheets, brokenReferences);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function describeJsonValue(value) {
  if (value === undefined) return 'nothing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value === 'object' ? 'an object' : `${typeof value} ${JSON.stringify(value)}`;
}

// The picture builder appends "-<size>.<format>" to assets/img/tours/<base> and lists the results in
// srcset attributes, so a base must be a relative path below that directory without
// whitespace, commas, a query, a fragment or dot segments.
function isUsableImageBase(base) {
  return (
    typeof base === 'string' &&
    !/[\s,?#\\:]/.test(base) &&
    base.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
  );
}

function describeUnusableBase(base) {
  const value = base === undefined ? '(missing)' : JSON.stringify(base);
  return `unusable image base ${value} (expected a relative path below ${tourImageDirectory}, such as "<folder>/<name>")`;
}

// URLs and attributes of the <picture> that catalogue-picture.js builds from an image base.
function getPictureReferences(base) {
  const basePath = `${tourImageDirectory}${base}`;
  const references = [];

  for (const format of ['avif', 'webp']) {
    for (const size of responsiveImageSizes) {
      references.push({ url: `${basePath}-${size}.${format}`, attribute: `<source type="image/${format}" srcset>` });
    }
  }
  for (const size of responsiveImageSizes) {
    references.push({ url: `${basePath}-${size}.jpg`, attribute: '<img srcset>' });
  }
  references.push({ url: `${basePath}-1200x780.jpg`, attribute: '<img src>' });

  return references;
}

function getDerivedLightboxUrl(base) {
  return `${tourImageDirectory}${base}-1600x1040.jpg`;
}

// gallery.js renders one picture per record. Its lightbox image is the record's lightbox
// path when one is set, and otherwise the 1600x1040 jpg of the base.
function collectGalleryPictures(records, dataLabel, brokenReferences) {
  const pictures = [];

  records.forEach((record, index) => {
    const recordLabel = `${dataLabel}[${index}]`;
    if (!isPlainObject(record)) {
      brokenReferences.push(`BROKEN: ${recordLabel} -> expected a gallery record object, found ${describeJsonValue(record)}`);
      return;
    }
    if (!isUsableImageBase(record.base)) {
      brokenReferences.push(`BROKEN: ${recordLabel} -> ${describeUnusableBase(record.base)}`);
      return;
    }

    const label = `${recordLabel} (base "${record.base}")`;
    const references = getPictureReferences(record.base);
    const lightbox = record.lightbox || getDerivedLightboxUrl(record.base);
    if (typeof lightbox === 'string') {
      references.push({ url: lightbox, attribute: '<img data-lightbox-src>' });
    } else {
      brokenReferences.push(`BROKEN: ${label} -> unusable lightbox ${JSON.stringify(record.lightbox)} (expected a path string)`);
    }

    pictures.push({ label, references });
  });

  return pictures;
}

// tour-detail.js renders every image of a tour as a gallery picture, and the first one again
// as the main image with the same paths. Its lightbox image is always the 1600x1040 jpg.
function collectTourPictures(tours, dataLabel, brokenReferences) {
  const pictures = [];

  tours.forEach((tour, index) => {
    let tourLabel = `${dataLabel}[${index}]`;
    if (!isPlainObject(tour)) {
      brokenReferences.push(`BROKEN: ${tourLabel} -> expected a tour object, found ${describeJsonValue(tour)}`);
      return;
    }
    if (typeof tour.id === 'string' && tour.id) {
      tourLabel += ` (id "${tour.id}")`;
    }
    if (!Array.isArray(tour.images)) {
      brokenReferences.push(`BROKEN: ${tourLabel} -> expected an images array, found ${describeJsonValue(tour.images)}`);
      return;
    }

    tour.images.forEach((image, imageIndex) => {
      const imageLabel = `${tourLabel} images[${imageIndex}]`;
      if (!isPlainObject(image)) {
        brokenReferences.push(`BROKEN: ${imageLabel} -> expected an image object, found ${describeJsonValue(image)}`);
        return;
      }
      if (!isUsableImageBase(image.base)) {
        brokenReferences.push(`BROKEN: ${imageLabel} -> ${describeUnusableBase(image.base)}`);
        return;
      }

      const references = getPictureReferences(image.base);
      references.push({ url: getDerivedLightboxUrl(image.base), attribute: '<img data-lightbox-src>' });
      pictures.push({ label: `${imageLabel} (base "${image.base}")`, references });
    });
  });

  return pictures;
}

// Reads a view's records from the checked root, so dist/ is checked against its own copy.
function readDataRecords(view, dataPath, dataLabel, brokenReferences) {
  if (!existsInSiteRoot(dataPath)) {
    brokenReferences.push(`BROKEN: ${dataLabel} -> missing data file (fetched by ${view.module} on ${view.page})`);
    return null;
  }

  let records;
  try {
    records = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (error) {
    const problem = error instanceof SyntaxError ? 'invalid JSON' : 'cannot be read';
    brokenReferences.push(`BROKEN: ${dataLabel} -> ${problem} (${error.message})`);
    return null;
  }

  if (!Array.isArray(records)) {
    brokenReferences.push(`BROKEN: ${dataLabel} -> expected an array of ${view.records}, found ${describeJsonValue(records)}`);
    return null;
  }

  return records;
}

// Checks every image file that a view requests for its data. Paths resolve against the page
// that renders the view, and a file named by several attributes of one picture (the
// 1200x780 jpg is the src and a srcset candidate) is reported once.
function checkRuntimeImageView(view, brokenReferences) {
  const dataPath = path.join(siteRoot, view.dataFile);
  const dataLabel = path.relative(projectRoot, dataPath);
  const pagePath = path.join(siteRoot, view.page);

  const records = readDataRecords(view, dataPath, dataLabel, brokenReferences);
  if (!records) return 0;

  const pictures = view.collectPictures(records, dataLabel, brokenReferences);

  for (const { label, references } of pictures) {
    const referencesByFile = new Map();

    for (const { url, attribute } of references) {
      if (isIgnoredReference(url)) continue;
      const resolvedPath = resolveSiteUrl(url, pagePath);
      if (!resolvedPath) continue;

      const entry = referencesByFile.get(resolvedPath) ?? { url, attributes: [] };
      entry.attributes.push(attribute);
      referencesByFile.set(resolvedPath, entry);
    }

    for (const [resolvedPath, { url, attributes }] of referencesByFile) {
      if (existsInSiteRoot(resolvedPath)) continue;

      const relativeMissing = path.relative(projectRoot, resolvedPath);
      brokenReferences.push(
        `BROKEN: ${label} -> ${view.page} ${attributes.join(', ')} "${url}" (missing file: ${relativeMissing})`
      );
    }
  }

  return pictures.length;
}

function main() {
  if (!fs.existsSync(siteRoot)) {
    console.error('Missing dist/. Run npm run build to generate the production package.');
    process.exit(1);
  }

  const htmlFiles = getHtmlFiles(siteRoot);
  const brokenReferences = [];
  const manifestRefs = new Set();
  const stylesheetRefs = new Set();

  if (htmlFiles.length === 0) {
    console.error(`Asset integrity check failed: no HTML files found in ${siteLabel}.`);
    process.exit(1);
  }

  for (const htmlFile of htmlFiles) {
    checkHtmlFile(htmlFile, brokenReferences, manifestRefs, stylesheetRefs);
  }

  for (const entry of manifestRefs) {
    const [manifestPath, sourceHtml] = entry.split('::');
    checkManifestFile(manifestPath, sourceHtml, brokenReferences);
  }

  const checkedStylesheets = new Set();
  for (const stylesheetPath of stylesheetRefs) {
    checkStylesheet(stylesheetPath, checkedStylesheets, brokenReferences);
  }

  const imageCounts = runtimeImageViews.map((view) => `${checkRuntimeImageView(view, brokenReferences)} ${view.images}`);

  if (brokenReferences.length > 0) {
    console.error('Asset integrity check failed. Broken references found:');
    for (const issue of brokenReferences) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  const stylesheetCount = `${checkedStylesheets.size} ${checkedStylesheets.size === 1 ? 'stylesheet' : 'stylesheets'}`;
  console.log(
    `Asset integrity check passed (${htmlFiles.length} HTML files, ${stylesheetCount}, ` +
      `${imageCounts.join(' and ')} scanned in ${siteLabel}).`
  );
}

main();
