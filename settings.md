# settings.md

## package.json scripts

`package.json` was detected in the project. Below is a script-by-script explanation based on the current repository state.

| Script | Command | What it does | When to use it |
|---|---|---|---|
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder script that intentionally exits with an error. No automated test suite is configured in `package.json`. | Use only to confirm that no npm-based test runner has been implemented yet. |
| `clean` | `node scripts/clean-dist.js` | Removes the existing `dist/` output directory before a fresh distribution build. | Run before preparing a clean deployment package. |
| `images:bootstrap` | `node scripts/images-bootstrap.js` | Performs a one-time bootstrap copy of existing raster assets from `assets/img/` into `assets/img-src/`, preserving folder structure and skipping SVG and non-raster files. | Use once when initializing the standardized image workflow, or again with a clean source tree if you need to repopulate `img-src`. |
| `build:images` | `node scripts/build-images.js` | Generates production-ready raster output from `assets/img-src/` into `assets/img/`, preserving folder structure and current naming conventions. This command is intentionally manual and is not part of the default build chain. | Use only after adding or updating source raster images in `assets/img-src/`. |
| `build:css` | `postcss css/style.css -o css/style.min.css && npm run verify:css` | Builds production CSS from the source entry file and then verifies the generated output. | Use after any source CSS change when you need an updated production stylesheet. |
| `verify:css` | `node scripts/verify-built-css.js` | Checks whether `css/style.min.css` exists and whether the built CSS no longer contains source-only patterns such as unresolved `@import` rules. | Run after CSS generation or when validating the production stylesheet. |
| `build:js` | `esbuild js/script.js --bundle --minify --target=es2018 --outfile=js/script.min.js && npm run verify:js` | Bundles and minifies the JavaScript entrypoint and then verifies the generated file. | Use after editing JS source modules and before packaging or deployment. |
| `verify:js` | `node scripts/verify-built-js.js` | Checks whether `js/script.min.js` exists and whether the built output no longer contains source-module syntax. | Run after JS generation or when validating the production bundle. |
| `watch:css` | `postcss css/style.css -o css/style.min.css --watch` | Watches the source CSS entry and rebuilds `css/style.min.css` on change. | Use during CSS-focused development when you want automatic rebuilds. |
| `watch:js` | `esbuild js/script.js --bundle --minify --target=es2018 --outfile=js/script.min.js --watch` | Watches JS source files and rebuilds the production bundle on change. | Use during JS-focused development when you want automatic bundle updates. |
| `check:css-assets` | `node scripts/check-css-assets.js` | Validates CSS/JS asset expectations in the repo, including service worker references and production asset usage. | Run before deployment or after changing build output naming and asset references. |
| `build` | `npm run build:css && npm run build:js && npm run check:css-assets && npm run check:assets` | Standard application build for CSS and JS plus repository-level asset verification. It does not regenerate raster images. | Use as the normal local build and pre-deploy verification command. |
| `check:assets` | `node scripts/check-asset-integrity.js` | Scans source HTML files for broken asset references and reports integrity issues. | Run after editing HTML, changing asset names, or before shipping. |
| `dist` | `npm run clean && npm run build && node scripts/build-dist.js` | Cleans old output, runs the standard application build, and prepares the final `dist/` folder without regenerating raster images. | Use when preparing the project for deployment or final handoff, assuming `assets/img/` already contains current production-ready images. |

## Recommended workflow

### Local development
1. `npm install`
2. Run `npm run images:bootstrap` once to populate `assets/img-src/`
3. Work on source files
4. Use `npm run watch:css` and/or `npm run watch:js` when you want automatic rebuilds
5. Run `npm run build:images` only after changing raster images in `assets/img-src/`

### Pre-deployment check
1. `npm run build`
2. Review warnings or failures from:
   - `verify:css`
   - `verify:js`
   - `check:css-assets`
   - `check:assets`
3. If you changed raster image sources, run `npm run build:images` separately before packaging or deployment.

### Distribution build
1. `npm run dist`
2. Deploy the generated `dist/` directory with the expected static hosting setup

## Notes
- The source CSS entry is `css/style.css`.
- The production CSS file is `css/style.min.css`.
- The source JS entry is `js/script.js`.
- The production JS file is `js/script.min.js`.
- `assets/img-src/` is the source-of-truth directory for raster image inputs.
- `assets/img/` remains the production image directory consumed by HTML, CSS, JS, manifest files, and JSON data.
- Standard `build` and `dist` commands assume `assets/img/` is already up to date.
- The image pipeline preserves relative folder structure and keeps current deterministic file naming.
- The repository uses custom Node scripts in `scripts/` to enforce build integrity and packaging rules.
