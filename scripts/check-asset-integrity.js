const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const productionDomain = 'https://hospitality-pr02-aurora.netlify.app';

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
    return path.join(projectRoot, cleanValue.replace(/^\//, ''));
  }

  if (cleanValue.startsWith('assets/')) {
    return path.join(projectRoot, cleanValue);
  }

  return path.resolve(path.dirname(htmlFilePath), cleanValue);
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
  if (fs.existsSync(resolvedPath)) return;

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

  const resolvedPath = path.join(projectRoot, pathname.replace(/^\//, ''));
  if (!fs.existsSync(resolvedPath)) {
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

  if (!fs.existsSync(manifestPath)) {
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
        if (!resolvedPath || fs.existsSync(resolvedPath)) continue;

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

function checkHtmlFile(htmlFile, brokenReferences, manifestRefs) {
  const htmlPath = path.join(projectRoot, htmlFile);
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

function main() {
  const htmlFiles = getHtmlFiles(projectRoot);
  const brokenReferences = [];
  const manifestRefs = new Set();

  for (const htmlFile of htmlFiles) {
    checkHtmlFile(htmlFile, brokenReferences, manifestRefs);
  }

  for (const entry of manifestRefs) {
    const [manifestPath, sourceHtml] = entry.split('::');
    checkManifestFile(manifestPath, sourceHtml, brokenReferences);
  }

  if (brokenReferences.length > 0) {
    console.error('Asset integrity check failed. Broken references found:');
    for (const issue of brokenReferences) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`Asset integrity check passed (${htmlFiles.length} HTML files scanned).`);
}

main();
