# Aurora Pipeline Notes

- Detected CSS entrypoint: `css/style.css`
- Detected JS entrypoint: `js/script.js`

## Source ownership

| Role | Path | Tracked | Notes |
|---|---|---|---|
| Maintained pages | 12 root `*.html` files | yes | Load the canonical sources; never modified by the build |
| CSS source | `css/style.css` and `css/modules/` | yes | Loaded directly by the maintained pages |
| JS source | `js/script.js` and `js/features/` | yes | Loaded directly as ES modules by the maintained pages |
| Service worker | `service-worker.js` | yes | Copied unchanged to `dist/`; registered only by the production bundle |
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

- `scripts/build-dist.js` replaces each exact source tag once in each page copy. It fails when a page contains a source tag zero or several times, or still mentions `css/style.css` or `js/script.js` after the rewrite.
- Development needs an HTTP server rooted at the project directory; module scripts and `fetch()` do not work over `file://`. The browser resolves the `@import` rules of `css/style.css` and the module imports of `js/script.js` natively.
- `css/modules/fonts.css` references `../../assets/fonts/*.woff2` and `css/modules/subpages.css` references `../../assets/img/about/mapa.svg`. In development they resolve from `/css/modules/` to `/assets/…`. `postcss-import` inlines them into `/css/style.min.css` unchanged, where URL resolution stops the extra `../` at the site root, so production resolves to the same `/assets/…` files. Like the root-relative Service Worker paths, this requires deployment at the domain root.

## Build workflow

`npm run build` runs:

1. `clean` — `scripts/clean-dist.js` removes `dist/`.
2. `build:stage` — `scripts/build-dist.js` requires an empty `dist/`, writes the rewritten page copies, and copies `assets/` without `assets/img-src/`, `service-worker.js`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, and `_headers`. A missing file fails the build.
3. `build:css` — generates `dist/css/style.min.css`, then runs `verify:css`.
4. `build:js` — generates `dist/js/script.min.js`, then runs `verify:js`.
5. `check:css-assets`, `check:assets`, `check:assets:dist`, `check:tour-catalogue` — verify the sources and the finished package.
6. `check:sw-bundles` — compares both generated bundles and the `VERSION` of `dist/service-worker.js` with `service-worker-bundles.json` (see [Service Worker cache version](#service-worker-cache-version)).

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

- Production: esbuild replaces `__AURORA_PRODUCTION__` with `true`, so the check in `js/script.js` folds and only the registration branch remains in `dist/js/script.min.js`: `navigator.serviceWorker.register("/service-worker.js")` after `load`, the update banner for a waiting worker, the `SKIP_WAITING` message, and the reload on `controllerchange`.
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
- The check covers the two bundles only. Raise `VERSION` by hand when another cache-first file changes: the precached `site.webmanifest`, or images and fonts cached at runtime. The record must then be written again for the new `VERSION`, with the unchanged bundle hashes.

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

## Verification

| Command | Scope |
|---|---|
| `npm run verify:css` | `dist/css/style.min.css` exists and contains no `@import` directive or sourcemap reference |
| `npm run verify:js` | `dist/js/script.min.js` exists, contains no `import`/`export` syntax, and has the production flag substituted |
| `npm run check:css-assets` | Maintained pages load the sources and no minified file; no minified bundle in the source tree; `dist/` pages load the bundles and no source entry point; `dist/css/` and `dist/js/` hold only the bundles; the Service Worker precache includes both bundles, contains no legacy source paths, and resolves to files in `dist/`; the bundle registers the staged worker |
| `npm run check:assets` | Root pages: `href`, `src`, `srcset`, `og:image`, `twitter:image`, JSON-LD URLs, and `site.webmanifest` entries |
| `npm run check:assets:dist` | The same scan for `dist/`; references must resolve to files inside `dist/` |
| `npm run check:tour-catalogue` | `tours.html` listing cards and the `contact.html` tour select match `assets/data/tours.json` |
| `npm run check:sw-bundles` | `VERSION` in `dist/service-worker.js` and the SHA-256 of `dist/css/style.min.css` and `dist/js/script.min.js` match `service-worker-bundles.json` |

## Deployment

- Hosting is Netlify with manual deployment. After a successful `npm run build`, publish the `dist/` directory as the site root. The repository contains no `netlify.toml` and no CI configuration.
- Do not publish the repository root: its pages load the unminified sources and do not register the Service Worker.
