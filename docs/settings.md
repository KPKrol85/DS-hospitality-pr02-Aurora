# settings.md

## package.json scripts

`package.json` was detected in the project. Below is a script-by-script explanation based on the current repository state.

| Script | Command | What it does | When to use it |
|---|---|---|---|
| `test` | `vitest run` | Runs the Vitest regression suite in `tests/` once, in a jsdom environment, as configured in `vitest.config.mjs`. It covers tour filtering and sorting, gallery rendering and filtering, tour detail rendering and HTML sanitization, and contact form validation and tour prefill. The tests import the modules in `js/features/`, mount markup from the maintained HTML pages, use the data in `assets/data/`, mock `fetch`, and fix the current date. It also runs `scripts/check-asset-integrity.js` against small sites written to a temporary directory, with image paths taken from the output of `gallery.js` and `tour-detail.js`, and `scripts/check-csp.js` against copies of the maintained pages and `_headers`. Each variant of the theme bootstrap runs while jsdom parses its page, with stored, system, and unavailable theme preferences, followed by the theme toggle. The font preload hints are checked in the maintained pages and in the copies that `scripts/build-dist.js` stages from them in a temporary directory. It is not part of `build`. | Run after changing those modules, their pages, the JSON data, the theme bootstrap, the font preload hints or `css/modules/fonts.css`, or the asset integrity or CSP checker, and before a production build that ships such a change. |
| `clean` | `node scripts/clean-dist.js` | Removes the existing `dist/` output directory. | Runs first in `build`; run it on its own before calling `build:stage` directly. |
| `images:bootstrap` | `node scripts/images-bootstrap.js` | Performs a one-time bootstrap copy of existing raster assets from `assets/img/` into `assets/img-src/`, preserving folder structure and skipping SVG and non-raster files. | Use once when initializing the standardized image workflow, or again with a clean source tree if you need to repopulate `img-src`. |
| `build:images` | `node scripts/build-images.js` | Generates production-ready raster output from `assets/img-src/` into `assets/img/`, preserving folder structure and current naming conventions. This command is intentionally manual and is not part of the default build chain. | Use only after adding or updating source raster images in `assets/img-src/`. |
| `build:stage` | `node scripts/build-dist.js` | Stages the production package into an empty `dist/`: copies of the root HTML pages with `<link rel="stylesheet" href="css/style.css" />` and `<script type="module" src="js/script.js"></script>` rewritten to `<link rel="stylesheet" href="css/style.min.css" />` and `<script src="js/script.min.js"></script>`, the `assets/` directory, `service-worker.js`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, and `_headers`. Fails when `dist/` is not empty, a required file is missing, or a page does not contain each source reference exactly once. The root pages are never modified. | Runs as the second step of `build`. |
| `build:css` | `postcss css/style.css -o dist/css/style.min.css && npm run verify:css` | Builds the production stylesheet from the source entry file into `dist/css/` and then verifies the generated output. | Runs in `build`; run it on its own to refresh the stylesheet in an existing `dist/`. |
| `verify:css` | `node scripts/verify-built-css.js` | Checks whether `dist/css/style.min.css` exists and whether the built CSS no longer contains source-only patterns such as unresolved `@import` rules or sourcemap references. | Run after CSS generation or when validating the production stylesheet. |
| `build:js` | `esbuild js/script.js --bundle --minify --target=es2018 --define:__AURORA_PRODUCTION__=true --outfile=dist/js/script.min.js && npm run verify:js` | Bundles and minifies the JavaScript entrypoint into `dist/js/` with the production flag that enables Service Worker registration, and then verifies the generated file. | Runs in `build`; run it on its own to refresh the bundle in an existing `dist/`. |
| `verify:js` | `node scripts/verify-built-js.js` | Checks whether `dist/js/script.min.js` exists, whether the built output no longer contains source-module syntax, and whether the production flag was substituted. | Run after JS generation or when validating the production bundle. |
| `watch:css` | `postcss css/style.css -o dist/css/style.min.css --watch` | Watches the source CSS entry and rebuilds `dist/css/style.min.css` on change. | Use only while previewing an existing `dist/`; source development needs no rebuilds. |
| `watch:js` | `esbuild js/script.js --bundle --minify --target=es2018 --define:__AURORA_PRODUCTION__=true --outfile=dist/js/script.min.js --watch` | Watches JS source files and rebuilds `dist/js/script.min.js` on change. | Use only while previewing an existing `dist/`; source development needs no rebuilds. |
| `check:css-assets` | `node scripts/check-css-assets.js` | Checks that the 12 maintained pages load `css/style.css` and `js/script.js` (ES module) and none of the minified files; that `css/style.min.css` and `js/script.min.js` do not exist in the source tree; that the 12 pages in `dist/` load `css/style.min.css` and `js/script.min.js` and none of the source entry points; that `dist/css/` and `dist/js/` contain only the generated bundles; and that `dist/service-worker.js` precaches `/css/style.min.css` and `/js/script.min.js`, contains no legacy source paths, precaches only files present in `dist/`, and is the worker the bundle registers. | Runs in `build`; run it after changing asset references, page tags, or the service worker. |
| `build` | `npm run clean && npm run build:stage && npm run build:css && npm run build:js && npm run check:css-assets && npm run check:assets && npm run check:assets:dist && npm run check:csp && npm run check:csp:dist && npm run check:tour-catalogue && npm run check:sw-bundles` | Primary build: cleans `dist/`, stages the production files, generates the production CSS and JS, verifies the sources and the finished package, including the Content-Security-Policy hashes of the inline scripts, and finally checks that the generated bundles are the ones recorded for the Service Worker `VERSION`. It modifies no source files, never writes `service-worker-bundles.json`, and does not regenerate raster images. | Use as the normal build, pre-deploy verification, and deployment packaging command. |
| `check:assets` | `node scripts/check-asset-integrity.js` | Scans the root HTML pages for broken `href`, `src`, and `srcset` references, `og:image`, `twitter:image`, and JSON-LD URLs on the production domain, and `site.webmanifest` entries. It also checks the local `url()` and `@import` references of the linked stylesheets and the modules they import (the self-hosted fonts and the map SVG), and every image file that `js/features/gallery.js` and `js/features/tour-detail.js` build from `assets/data/gallery-data.json` and `assets/data/tours.json`: the four sizes in AVIF, WebP, and JPG and the lightbox image. A missing, unreadable, or malformed data file and an unusable image base also fail the check. Stylesheet and runtime paths resolve as in the browser. | Run after editing HTML, CSS, or the gallery or tour data, after changing asset names, or before shipping. |
| `check:assets:dist` | `node scripts/check-asset-integrity.js --dist` | Runs the same scan against the pages, `dist/css/style.min.css`, and the data files and assets in `dist/`; a reference only counts when its file exists inside `dist/`, and `../` segments stop at the site root, so `../../assets/` in the production stylesheet resolves to `dist/assets/`. | Runs in `build`; run it on its own to re-check an existing `dist/`. |
| `check:csp` | `node scripts/check-csp.js` | Treats `_headers` as the approved policy and never writes it. Hashes every inline `<script>` of the root HTML pages as the browser does (SHA-256 of the script text, with CRLF and CR line endings read as LF) and fails when a hash is missing from `script-src` or `script-src` approves a hash that no page uses; when `script-src` contains `'unsafe-inline'` or a nonce, lacks `'self'`, or is overridden by `script-src-elem` or `script-src-attr`; when the site-wide `/*` rule does not hold exactly one Content-Security-Policy; or when a page has an inline event handler, a `javascript:` URL, an unterminated `<script>`, or a script file from another origin. JSON-LD blocks and same-origin script files need no hash. | Runs in `build`; run it after changing an inline script, a page head, or `_headers`. A new or changed inline script needs a reviewed hash in `_headers`; see `docs/pipeline-notes.md`. |
| `check:csp:dist` | `node scripts/check-csp.js --dist` | Runs the same check for the pages in `dist/` against `dist/_headers`, the policy published with them, and also fails when `dist/_headers` is missing or its Content-Security-Policy differs from `_headers`. | Runs in `build`; run it on its own to re-check an existing `dist/`. |
| `check:tour-catalogue` | `node scripts/check-tour-catalogue.js` | Compares the tour listing cards in `tours.html` (name, duration, price, `data-days`, `data-price`, tour detail link), the contact form tour select in `contact.html` (option values and labels), and the featured offer cards in `index.html` (listing link, title, numeric durations) against the canonical catalogue `assets/data/tours.json`, and fails on any missing, duplicate, unknown, or mismatched offer. A featured card is resolved through its `tours.html#<anchor>` link: the anchor must match a valid listing card, the card title must equal the catalogue `name` of that listing card's offer, and every numeric `<N> dni` duration in the card text must equal its `days`. A duration written out in words, such as `Dziewięciodniowy`, is not parsed as a number and stays unchecked. | Run after editing `assets/data/tours.json`, the tour listing cards, the contact form tour select, or the featured offer cards in `index.html`. |
| `check:sw-bundles` | `node scripts/check-sw-bundles.js` | Reads the tracked approval record `service-worker-bundles.json` and fails when it is missing or malformed, when `dist/service-worker.js` or either bundle is missing, when `VERSION` in `dist/service-worker.js` differs from the recorded version, or when the SHA-256 of `dist/css/style.min.css` or `dist/js/script.min.js` differs from the recorded hash. It never writes the record. | Runs as the last step of `build`; run it on its own to re-check an existing `dist/`. |
| `record:sw-bundles` | `node scripts/check-sw-bundles.js --record` | Writes `VERSION` from `service-worker.js` and the SHA-256 of the two bundles in `dist/` to `service-worker-bundles.json`. Refuses when `VERSION` does not advance the recorded version of the same name, when the existing record is missing or malformed, or when either bundle is missing, so it cannot replace the hashes of a recorded version. `npm run record:sw-bundles -- --init` creates the first record and refuses when one exists. | Only in an intentional cache version update, after raising `VERSION`; follow it with `npm run build`. |
| `dist` | `npm run build` | Backward-compatible alias of `build`; it runs the same pipeline once. | Use where older instructions call for `npm run dist`. |

## Recommended workflow

### Local development
1. `npm install`
2. Run `npm run images:bootstrap` once to populate `assets/img-src/`
3. Serve the project root over HTTP (ES modules and `fetch()` do not work over `file://`) and work on the source files. The pages load `css/style.css` and `js/script.js` directly, so changes are visible on reload without any build or watch command.
4. The source pages do not register the Service Worker. They unregister a production worker left on the same origin, for example by a `dist/` preview served at the same address.
5. Run `npm run build:images` only after changing raster images in `assets/img-src/`

### Production preview
1. `npm run build`
2. Serve `dist/` over HTTP.
3. Optionally run `npm run watch:css` and/or `npm run watch:js` to refresh the bundles in `dist/`. HTML and asset changes need another `npm run build`. The production Service Worker serves the bundles cache-first, so bypass it while previewing rebuilt bundles.

### Pre-deployment check and distribution build
1. If you changed raster image sources, run `npm run build:images` first.
2. If you changed the data-driven views (`js/features/`, their pages, or `assets/data/`), run `npm test`.
3. `npm run build`
4. Review failures from:
   - `build:stage`
   - `verify:css`
   - `verify:js`
   - `check:css-assets`
   - `check:assets`
   - `check:assets:dist`
   - `check:csp`
   - `check:csp:dist`
   - `check:tour-catalogue`
   - `check:sw-bundles`
5. When `check:sw-bundles` reports a changed bundle hash and the change is intended, complete the cache version update:
   1. raise `VERSION` in `service-worker.js` above the version recorded in `service-worker-bundles.json`, for example from `aurora-1.6` to `aurora-1.7`;
   2. `npm run record:sw-bundles` to record the new version with the hashes of the bundles now in `dist/`;
   3. `npm run build`, which must pass;
   4. commit `service-worker-bundles.json` together with `service-worker.js` and the source change.
6. When `check:csp` reports an inline script without an approved hash, review the script. If the change is intended, add the reported hash to `script-src` in `_headers`, remove the hashes the check reports as unused, and run `npm run build`.
7. `check:sw-bundles` covers only the two bundles. When another file that the Service Worker caches changes (`site.webmanifest`, the precached `index.html` and `offline.html`, images, fonts), raise `VERSION` and run `npm run record:sw-bundles` and `npm run build` the same way.

### Deployment
1. Deploy `dist/` manually to Netlify as the publish directory. It is the complete site root, including `404.html`, `offline.html`, `service-worker.js`, and `_headers`.
2. Do not deploy the repository root: its pages load the unminified sources and do not register the Service Worker.

## Notes
- The canonical sources are the root HTML pages, `css/style.css` with `css/modules/`, `js/script.js` with `js/features/`, `service-worker.js`, and `assets/`.
- The source CSS entry is `css/style.css`; the production CSS file is `dist/css/style.min.css`.
- The source JS entry is `js/script.js`; the production JS file is `dist/js/script.min.js`.
- Minified CSS and JS are generated only in `dist/`. `css/style.min.css` and `js/script.min.js` are ignored in the source tree, and `check:css-assets` fails when they exist there.
- The maintained pages reference the sources; only their copies in `dist/` reference the minified files. `scripts/build-dist.js` rewrites the two references in the copies and never writes to the root pages.
- `dist/` is rebuilt from scratch by every `build`, and nothing in the build reads from `dist/`.
- Only the production bundle registers `service-worker.js`, because esbuild replaces `__AURORA_PRODUCTION__` with `true` and removes the development branch.
- `_headers` is the approved security policy, not build output. `check:csp` and `check:csp:dist` read it and never write it, and `build:stage` copies it unchanged to `dist/`. Its `script-src` approves the theme bootstrap by SHA-256 hashes instead of `'unsafe-inline'`; `docs/pipeline-notes.md` describes the contract.
- `service-worker-bundles.json` is a tracked approval record, not build output: it pairs the Service Worker `VERSION` with the SHA-256 of `dist/css/style.min.css` and `dist/js/script.min.js`. Only `record:sw-bundles` writes it, and only under a new `VERSION`; `docs/pipeline-notes.md` describes the format and the update workflow.
- `assets/img-src/` is the source-of-truth directory for raster image inputs.
- `assets/img/` remains the production image directory consumed by HTML, CSS, JS, manifest files, and JSON data.
- Standard `build` and `dist` commands assume `assets/img/` is already up to date.
- The image pipeline preserves relative folder structure and keeps current deterministic file naming.
- The repository uses custom Node scripts in `scripts/` to enforce build integrity and packaging rules.
- `tests/` and `vitest.config.mjs` are development-only: `js/script.js` does not import them and `build:stage` does not copy them, so they never reach `dist/`.
