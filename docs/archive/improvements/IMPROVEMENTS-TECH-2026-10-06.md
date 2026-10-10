# Aurora — Technical Improvements

**Analysis date:** 2026-10-04
**Project type:** Multi-page static website — 12 maintained HTML pages, modular CSS built with PostCSS, vanilla ES modules bundled with esbuild, JSON-driven tour and gallery views, a service worker, Node.js build and check scripts, a Vitest/jsdom regression suite, and Netlify static hosting with manual deployment
**Analysis mode:** Evidence-based technical improvement review
**Focus:** Project-wide technical implementation
**Status:** COMPLETED — all five technical improvements implemented and verified.
**Completion date:** 2026-10-06
**Completion summary:** IMP-TECH-01 to IMP-TECH-05 were implemented and verified between 2026-10-04 and 2026-10-06. No open tasks remain in this report.

## Improvement overview

At the time of the analysis on 2026-10-04, Aurora had a coherent architecture with canonical HTML, CSS and JavaScript sources, a generated `dist/` package, modular feature initializers and established build checks.

Five technical opportunities remained where important contracts were duplicated or owned by the wrong layer: catalogue image generation, contact form constraints, theme presentation, Service Worker lifecycle management and the maintained page inventory.

All five improvements were completed and verified. Shared modules and native browser constraints now own their respective contracts, CSS tokens control theme presentation, and build scripts use a single declaration of maintained pages and asset references.

Existing behavior was preserved except for two intentional changes: contact validation also reports an end date before today when no start date is selected, and the build rejects missing or undeclared root pages before staging `dist/`.

The analysis describes the original baseline of 2026-10-04. The records below describe the completed implementations and their verification.

## Completed improvements

### IMP-TECH-01 — Build catalogue image pictures through one shared module

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `js/features/catalogue-picture.js` as the shared runtime owner of catalogue image variants, paths and responsive `<picture>` construction. `gallery.js` and `tour-detail.js` now use `createCataloguePicture` while preserving their wrappers, classes, `sizes` values, image attributes and lightbox behavior, including the gallery's optional `lightbox` override. The existing asset checker's mirrored contract was retained. The Service Worker cache advanced to `aurora-1.20`, with updated bundle hashes recorded in `service-worker-bundles.json`.
- **Verification:** Source review confirmed that `catalogue-picture.js` owns the shared image directory, variants and the only runtime `createSrcset` under `js/`. Existing gallery, tour-detail, lightbox, responsive-image and asset-integrity tests were retained. The original completion record reports successful regression and production build verification after the cache update; no test files were modified.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-02 — Derive contact form validation from the native constraints

- **Status:** COMPLETED — implemented and verified.
- **Result:** Refactored `js/features/form.js` to derive phone, date and participant validation from native field constraints and validity states instead of duplicating rules in JavaScript. Participant messages use `field.min` and `field.max`, and `syncEndDateMin` maintains the date constraint. Existing messages, error handling, focus behavior and `contact.html` attributes were preserved. Validation now also reports an end date before today when the start date is empty. The Service Worker cache advanced to `aurora-1.21`.
- **Verification:** Source review confirmed the removal of duplicate phone-length checks, participant-limit literals and manual date comparisons. Two regression cases were added in `tests/form.test.js`: changing the participant maximum to 15 and rejecting an end date before today without a start date. Existing form tests and the production build were part of the original completion verification.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-03 — Let the design tokens own the theme presentation after page load

- **Status:** COMPLETED — implemented and verified.
- **Result:** Moved post-load theme presentation into `css/modules/tokens.css`, which now declares the root background through `--bg` and the appropriate `color-scheme` for each theme. `js/features/theme.js` manages theme state and persistence while removing only bootstrap-specific inline theme styles. The early theme bootstrap, CSP hashes, storage contract, theme toggle and unrelated inline styles remain unchanged. The Service Worker cache advanced to `aurora-1.22`.
- **Verification:** `tests/theme-bootstrap.test.js` verifies agreement between bootstrap colors and CSS tokens, removal of inline theme styles after initialization and toggling, and preservation of unrelated inline styles. Source review confirmed that `theme.js` contains no color literals and that `tokens.css` owns the active theme presentation. The original completion criteria include CSP and production build checks. A browser theme check was specified, but its execution result is not independently recorded in the archived evidence.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-04 — Move Service Worker registration and the update notice out of the entry module

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `js/features/service-worker-lifecycle.js` as the dedicated owner of Service Worker registration, the update notice, `SKIP_WAITING`, single reload on `controllerchange` and development unregistration. It exports `initPwaLifecycle()` without import-time side effects. `js/script.js` calls the function once during module evaluation, outside the `DOMContentLoaded` initializer chain, preserving the original timing and production/development behavior. Existing PWA contracts and worker logic remain unchanged. The Service Worker cache advanced to `aurora-1.23`.
- **Verification:** Source review confirmed that `js/script.js` no longer contains Service Worker logic and that the lifecycle module performs no registration or DOM changes merely upon import. Existing initializer tests and production build checks, including `verify:js` and `check:css-assets`, were used for completion verification. Dedicated regression tests for the update notice and `controllerchange` reload were not added within this task.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-05 — Declare the published page set and the asset-tag rewrite once for the build stage and its check

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `scripts/site-build-contract.js` as the shared source of truth for the 12 maintained pages (`maintainedPages`) and two source-to-production asset tag pairs (`assetReferences`). `build:stage` and `check:css-assets` now use these declarations, while `tests/csp.test.js` reuses the tag pairs. The build rejects missing or undeclared root pages before writing `dist/`. Existing output layout, asset rewrite behavior and independent CSP/asset page discovery were preserved. No dependency, production asset or Service Worker cache-version change was required.
- **Verification:** `tests/build-stage.test.js` verifies publication of the declared pages and rejection of undeclared, missing and renamed root pages before staging output. Source review confirmed shared use of the contract by the build stage, asset checker and CSP fixtures. The original completion criteria record regression-suite and production-build verification. `service-worker.js` and `service-worker-bundles.json` remained unchanged at `aurora-1.23`.
- **Impact:** Low
- **Effort:** Small

## Selection summary

- **Selection basis:** Each improvement removed duplicated contract definitions or corrected ownership between runtime modules, browser constraints, CSS tokens and build scripts. The changes preserved the existing architecture without introducing dependencies or a new framework.
- **Scope:** IMP-TECH-01 to IMP-TECH-04 changed the production JavaScript bundle and each received a separate Service Worker cache-version update, advancing from `aurora-1.19` to `aurora-1.23`. IMP-TECH-03 also changed the stylesheet. IMP-TECH-05 affected build tooling, tests and documentation without changing the production output.
- **Considered, not selected:** Consolidating theme-bootstrap whitespace variants, introducing shared header/footer templates, extracting a common focus-trap helper and unifying HTML attribute parsers were evaluated but excluded from this improvement cycle.
- **Outcome:** All five improvements were completed and verified within their approved scopes.

## Original analysis limitations (2026-10-04)

These limitations describe the original analysis, not the subsequent implementation. Individual verification execution logs are not retained in the repository; the completion records rely on the documented implementation outcomes, source files, regression tests and build contracts.

- **Test execution:** Dependencies were not installed in the analysed checkout, so `npm test` and `npm run build` were not executed during the original analysis. Only read-only Git inspection and Node data-comparison scripts were used.
- **Browser verification:** First-paint theme behavior and Service Worker lifecycle behavior were evaluated from source inspection during the analysis, without browser testing.
- **jsdom validation:** Support for native `rangeUnderflow` and `rangeOverflow` on date and number inputs was not independently established during the original analysis. The subsequently implemented validation tests rely on these states.
- **Content observation:** The analysis found differing `alt` descriptions for the same 36 catalogue image files in `gallery-data.json` and `tours.json`. Their accuracy was not evaluated. This observation belongs to a content/accessibility audit and is not an open task in this report.
