# Aurora Pipeline Notes

- Detected CSS entrypoint: `css/style.css`
- Detected JS entrypoint: `js/script.js`

## Source ownership

| Role | Path | Tracked | Notes |
|---|---|---|---|
| Maintained pages | 12 root `*.html` files | yes | Load the canonical sources; never modified by the build; declared in `scripts/site-build-contract.js` |
| Build contract | `scripts/site-build-contract.js` | yes | Declares the maintained page inventory (`maintainedPages`) and the two source-to-production entry tag pairs (`assetReferences`); read by `build:stage` and `check:css-assets`, and for the tag pairs by `tests/csp.test.js` |
| CSS source | `css/style.css` and `css/modules/` | yes | Loaded directly by the maintained pages |
| JS source | `js/script.js` and `js/features/` | yes | Loaded directly as ES modules by the maintained pages |
| Service worker | `service-worker.js` | yes | Copied unchanged to `dist/`; registered only by the production bundle |
| Security headers | `_headers` | yes | Approved Netlify headers, including the Content-Security-Policy with the SHA-256 hashes of the inline scripts; copied unchanged to `dist/`; never written by the build |
| Bundle approval record | `service-worker-bundles.json` | yes | SHA-256 of both bundles approved for the worker's `VERSION`; read by `npm run build`, written only by `npm run record:sw-bundles`; not published |
| Production pages | `dist/*.html` | no | Copies of the maintained pages with the two asset references rewritten |
| Production CSS | `dist/css/style.min.css` | no | PostCSS with `postcss-import`, `autoprefixer`, `cssnano` |
| Production JS | `dist/js/script.min.js` | no | esbuild `--bundle --minify --target=es2018 --define:__AURORA_PRODUCTION__=true` |

- Minified CSS and JS are generated only in `dist/`. `.gitignore` excludes `/dist/`, `/css/style.min.css`, and `/js/script.min.js`, and `check:css-assets` fails when either obsolete source-tree bundle exists.
- Build output is never a build input: every build starts from an empty `dist/` and reads only the canonical sources.

## Asset references

Maintained pages (development):

```html
<link rel="stylesheet" href="css/style.css" />
<script type="module" src="js/script.js"></script>
```

Their copies in `dist/` (production):

```html
<link rel="stylesheet" href="css/style.min.css" />
<script src="js/script.min.js"></script>
```

- `assetReferences` in `scripts/site-build-contract.js` is the only declaration of these two tag pairs. `scripts/build-dist.js` applies it and `scripts/check-css-assets.js` verifies both sides against it.
- `scripts/build-dist.js` replaces each exact source tag once in each page copy. It fails when a page contains a source tag zero or several times, or still mentions `css/style.css` or `js/script.js` after the rewrite.
- Development needs an HTTP server rooted at the project directory; module scripts and `fetch()` do not work over `file://`. The browser resolves the `@import` rules of `css/style.css` and the module imports of `js/script.js` natively.
- `css/modules/fonts.css` references `../../assets/fonts/*.woff2` and `css/modules/subpages.css` references `../../assets/img/about/mapa.svg`. In development they resolve from `/css/modules/` to `/assets/…`. `postcss-import` inlines them into `/css/style.min.css` unchanged, where URL resolution stops the extra `../` at the site root, so production resolves to the same `/assets/…` files. Like the root-relative Service Worker paths, this requires deployment at the domain root.

## Font preload

`css/modules/fonts.css` declares the two self-hosted variable fonts with `font-display: swap`: Manrope (`--font-heading`, the logo text and the headings, 15 KB) and Inter (`--font-base`, the body text, 85 KB). Every page uses both in its initial view, but without a hint the browser requests them only after it has downloaded and applied the stylesheet. The maintained pages therefore preload them between the theme bootstrap and the stylesheet:

```html
<!-- index.html only -->
<link rel="preload" href="assets/fonts/Inter-VariableFont.woff2" as="font" type="font/woff2" crossorigin />
<!-- every page -->
<link rel="preload" href="assets/fonts/Manrope-VariableFont.woff2" as="font" type="font/woff2" crossorigin />
```

- Manrope is preloaded on all 12 pages, so the logo and the headings are painted in it from the first paint instead of swapping, and reflowing, later. The small file did not measurably delay the first paint.
- Inter is preloaded only on `index.html`, where the stylesheet already shares the connection with the eagerly loaded hero image (`fetchpriority="high"`). On the other pages the stylesheet is the only early request, and in a throttled Chrome comparison the 85 KB preload delayed the stylesheet and the first paint, so there Inter is still discovered through the stylesheet.
- The hints follow the theme bootstrap, which still runs first, and precede the stylesheet. `crossorigin` is required although the fonts are same-origin: font requests use CORS mode, and a preload without it is not reused, so the font would be downloaded twice.
- `href` resolves from the page to `/assets/fonts/…`, the URL of the `@font-face` source both from `/css/modules/fonts.css` in development and from `/css/style.min.css` in production. `build:stage` copies the hints unchanged, so in `dist/` they resolve to `dist/assets/fonts/`.
- `check:assets` and `check:assets:dist` report a hint whose file is missing, like any other `<link href>`. `tests/font-preload.test.js` checks the page selection, the paths and attributes, one hint per font, the position between the bootstrap and the stylesheet, and the copies that `scripts/build-dist.js` stages.
- In production the Service Worker answers the preload requests (destination `font`) cache-first, like the stylesheet's font requests. The hints are part of the precached `index.html` and `offline.html`, so changing them requires a new `VERSION` (see [Service Worker cache version](#service-worker-cache-version)).
- Review the selection when a font file, the hero image, or the early requests of a page change.

## Build workflow

`npm run build` runs:

1. `clean` — `scripts/clean-dist.js` removes `dist/`.
2. `build:stage` — `scripts/build-dist.js` requires an empty `dist/` and root `*.html` files that match `maintainedPages` exactly, writes the rewritten copies of the declared pages, and copies `assets/` without `assets/img-src/`, `service-worker.js`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, and `_headers`. A missing file fails the build.
3. `build:css` — generates `dist/css/style.min.css`, then runs `verify:css`.
4. `build:js` — generates `dist/js/script.min.js`, then runs `verify:js`.
5. `check:css-assets`, `check:assets`, `check:assets:dist`, `check:csp`, `check:csp:dist`, `check:tour-catalogue` — verify the sources and the finished package (see [Content Security Policy for inline scripts](#content-security-policy-for-inline-scripts)).
6. `check:sw-bundles` — compares both generated bundles and the `VERSION` of `dist/service-worker.js` with `service-worker-bundles.json` (see [Service Worker cache version](#service-worker-cache-version)).

- The page inventory is explicit: before writing anything to `dist/`, `build:stage` compares the root `*.html` files with `maintainedPages` and fails on a declared page that is missing and on a root page that is not declared. A new page is therefore published, and verified by `check:css-assets`, only after it is added to `scripts/site-build-contract.js`. `check:csp` and `check:assets` still discover the root pages by directory scan.
- `npm run dist` is a backward-compatible alias that runs `npm run build` once.
- `watch:css` and `watch:js` regenerate only `dist/css/style.min.css` and `dist/js/script.min.js`; source development needs no rebuilds.
- `build:images` stays outside the build chain.

## Files included in dist

```text
dist/
├─ 404.html, about.html, contact.html, cookies.html, dziekuje.html, gallery.html,
│  index.html, offline.html, polityka-prywatnosci.html, regulamin.html, tour.html, tours.html
├─ css/
│  └─ style.min.css
├─ js/
│  └─ script.min.js
├─ assets/                   # recursive copy: data/, fonts/, img/
├─ service-worker.js
├─ site.webmanifest
├─ robots.txt
├─ sitemap.xml
└─ _headers
```

- `dist/css/` and `dist/js/` contain only the bundles; `css/style.css`, `css/modules/`, `js/script.js`, and `js/features/` are not published.
- No `_redirects` file is published; unmatched paths fall through to `404.html`.
- `assets/img-src/` is intentionally excluded from deployment. It stays in the repository as the development input that `build:images` reads to generate `assets/img/`; no page, stylesheet, script, data file, or manifest references it. `scripts/build-dist.js` skips exactly this directory during the `assets/` copy (`excludedPaths`), so every other file under `assets/` is still published.

## Service Worker

- Production: esbuild replaces `__AURORA_PRODUCTION__` with `true`, so the check in `initPwaLifecycle()` of `js/features/service-worker-lifecycle.js`, which `js/script.js` calls at module evaluation, folds and only the registration branch remains in `dist/js/script.min.js`: `navigator.serviceWorker.register("/service-worker.js")` after `load`, the update banner for a waiting worker, the `SKIP_WAITING` message, and the reload on `controllerchange`.
- The worker precaches `/`, `/index.html`, `/css/style.min.css`, `/js/script.min.js`, `/site.webmanifest`, and `/offline.html`, all of which exist in `dist/`. `offline.html` remains the offline fallback for HTML requests.
- Development: the unbundled sources leave the flag undeclared, so the maintained pages never register the worker, whose precache would fail on the absent bundles. They unregister any worker already registered on the origin, so an earlier production preview at the same address cannot keep serving the sources cache-first.
- `VERSION` names both caches, and activation deletes the caches of every other version. The build ties it to the generated bundles, as described in the next section.

## Service Worker cache version

The worker precaches `/css/style.min.css` and `/js/script.min.js` under fixed URLs and serves them cache-first, so returning visitors receive changed bundles only after `VERSION` changes and the new worker installs. `service-worker-bundles.json`, tracked in the repository root, is the approval record of which bundle bytes belong to which `VERSION`:

```json
{
  "version": "aurora-1.6",
  "sha256": {
    "dist/css/style.min.css": "<64 lowercase hexadecimal characters>",
    "dist/js/script.min.js": "<64 lowercase hexadecimal characters>"
  }
}
```

- The hashes are SHA-256 of the generated bytes in `dist/`, not of the sources, timestamps, or Git history. The record lives outside `dist/`, which every build deletes, and is not published.
- Every byte change counts, including one caused by a dependency update (esbuild, the PostCSS plugins, or the Browserslist data autoprefixer uses). Line endings of the source checkout (CRLF or LF) do not change the bundles.
- The check covers the two bundles only. Raise `VERSION` by hand when another file that the worker caches changes: the precached `site.webmanifest`, `index.html` (precached as `/` and `/index.html`) and `offline.html` (whose precached copy is the offline fallback), or images and fonts cached at runtime. A returning visitor's worker is replaced, and its precache refreshed, only when the worker script changes, so such a file would otherwise stay stale in the cache. The record must then be written again for the new `VERSION`, with the unchanged bundle hashes.

`npm run check:sw-bundles` runs as the last step of `npm run build`, reads the record, and never writes it. It fails when:

- `service-worker-bundles.json` is missing, is not valid JSON, or does not contain exactly a `version` of the form `<name>-<numbers>` (such as `aurora-1.6`) and a lowercase hexadecimal SHA-256 for each bundle;
- `dist/service-worker.js`, its `const VERSION = "…";` declaration, or either bundle is missing;
- `VERSION` in `dist/service-worker.js` differs from the recorded `version`;
- the SHA-256 of either bundle differs from the recorded value.

Raising `VERSION` does not approve a changed bundle: the check fails until the new hash is recorded under that version, and a new `VERSION` in `service-worker.js` without a matching record fails as well.

Intentional cache version update:

1. `npm run build` — generates the bundles; the bundle check reports the changed hash and stops the build.
2. Raise `VERSION` in `service-worker.js`, for example from `aurora-1.6` to `aurora-1.7`.
3. `npm run record:sw-bundles` — writes the new `VERSION` and the SHA-256 of the bundles now in `dist/` to `service-worker-bundles.json`.
4. `npm run build` — must pass; it confirms that a clean build reproduces the recorded bundles.
5. Commit `service-worker-bundles.json` together with `service-worker.js` and the source change.

`npm run record:sw-bundles` refuses to write when `VERSION` in `service-worker.js` does not advance the recorded version of the same name (numbers compare segment by segment, so `aurora-1.10` follows `aurora-1.9`), when the existing record is missing or malformed, or when either bundle is missing. It therefore cannot replace the hashes of a version already recorded. `npm run record:sw-bundles -- --init` creates the first record and refuses when one exists; a missing record is restored from Git, not recreated.

## Content Security Policy for inline scripts

`_headers` sets one Content-Security-Policy for every path (`/*`). Its `script-src` allows the site's own script files through `'self'` and, instead of `'unsafe-inline'`, only the inline scripts whose SHA-256 hash it lists. The only inline script is the theme bootstrap in the head of each page, which applies the stored or preferred theme before the stylesheet loads. It exists in three textual variants with the same behaviour — one on nine pages, one with extra blank lines in `contact.html`, and one with an extra blank line in `cookies.html` and `offline.html` — so `script-src` lists three hashes. The other directives, including `style-src 'self' 'unsafe-inline'`, are unaffected.

- A hash covers the exact text between `<script>` and `</script>`, indentation and blank lines included. The browser hashes that text after HTML parsing has turned CRLF and lone CR line endings into LF, so CRLF and LF checkouts produce the same hashes; `scripts/check-csp.js` normalizes line endings the same way before hashing with Node's `crypto`.
- JSON-LD blocks (`type="application/ld+json"`) are never executed and need no hash. Any other inline `<script>` counts as executable, whatever its type. Inline event handler attributes and `javascript:` URLs cannot be approved by a hash, so the policy blocks them.

`_headers` is the approved policy: the checks read it and never update it, so a new or changed inline script fails the build until its hash has been reviewed and added by hand. `npm run check:csp` hashes every inline script of the maintained pages and fails when:

- an inline script has no approved hash in `script-src`, or `script-src` approves a hash that no page uses;
- `script-src` contains `'unsafe-inline'` or a nonce, lacks `'self'`, or is overridden for inline scripts by `script-src-elem` or `script-src-attr`;
- `_headers` does not hold exactly one Content-Security-Policy, in the `/*` rule, with one `script-src` directive;
- a page has an inline event handler, a `javascript:` URL, an unterminated `<script>`, or a script file from another origin.

`npm run check:csp:dist` runs the same check for the pages in `dist/` against `dist/_headers`, the policy published with them, so a changed page in the package fails even when the sources are correct. It also fails when `dist/_headers` is missing or its Content-Security-Policy differs from `_headers`. Both checks run in `npm run build` after `build:stage` has staged the pages and `_headers`.

Changing an inline script:

1. Change the script in the maintained pages.
2. `npm run check:csp` — reports the hash of each script that is not approved.
3. Review the change. If it is intended, add the reported hash to `script-src` in `_headers` and remove the hashes the check then reports as unused.
4. `npm run build` — must pass.

A change to `_headers` alone leaves the pages and bundles unchanged, so `check:sw-bundles` requires no new `VERSION`. The Service Worker stores each cached HTML response with the headers it was served with, so a cached page keeps the policy it arrived with; the precached `offline.html` receives a changed policy when a new `VERSION` replaces the caches.

## Verification

`npm run build` runs the verification steps listed in [Build workflow](#build-workflow), and the first failing step stops it. What each `verify:*` and `check:*` command checks, and when to run it on its own, is documented per command in [settings.md](settings.md#packagejson-scripts). The contracts they enforce are specified above in [Source ownership](#source-ownership), [Asset references](#asset-references), [Files included in dist](#files-included-in-dist), [Service Worker cache version](#service-worker-cache-version), and [Content Security Policy for inline scripts](#content-security-policy-for-inline-scripts).

- The verify and check scripts load only Node.js built-in modules and project files, so they need no installed dependencies, and they never modify files. `scripts/check-sw-bundles.js` writes `service-worker-bundles.json` only in its `--record` mode, run as `npm run record:sw-bundles`.

## Deployment

- Hosting is Netlify with manual deployment: `dist/` is the complete site root and the only directory to publish. The repository contains no `netlify.toml` and no CI configuration.
- The deployment procedure, including the pre-deployment check whose `dist/` is published, is documented in [settings.md](settings.md#deployment).
