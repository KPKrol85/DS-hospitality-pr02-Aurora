# Aurora — Technical Improvements

**Analysis date:** 2026-10-04
**Completed:** 2026-10-06
**Status:** COMPLETED — all five selected improvements implemented and verified.
**Scope:** Project-wide technical implementation.

## Overview

Five technical improvements were completed between 2026-10-04 and 2026-10-06. Each gave a single owner to a contract that had been duplicated or held by the wrong layer: catalogue picture generation, contact form constraints, post-load theme presentation, the Service Worker lifecycle and the maintained page inventory.

Existing architecture, the theme bootstrap and its CSP hashes, and PWA contracts were preserved, and no dependency or framework was introduced. Two behavior changes were intentional: contact validation also reports an end date before today when no start date is selected, and the build rejects missing or undeclared root pages before staging `dist/`.

## Completed improvements

### IMP-TECH-01 — Build catalogue image pictures through one shared module

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `js/features/catalogue-picture.js` (`createCataloguePicture`) as the single runtime owner of catalogue image paths, variants and responsive `<picture>` construction. The gallery and tour detail views keep their own wrappers, classes, `sizes`, image attributes and lightbox behavior, including the gallery's `lightbox` override, and the asset-integrity checker keeps its mirrored copy of the contract. Service Worker cache: `aurora-1.20`.
- **Verification:** Source review confirmed a single image directory and variant declaration and the only runtime `createSrcset` under `js/`. Existing gallery, tour-detail, lightbox, responsive-image and asset-integrity tests were kept unmodified; the original completion record reports passing regression and production-build verification after the cache update.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-02 — Derive contact form validation from the native constraints

- **Status:** COMPLETED — implemented and verified.
- **Result:** Phone, date and participant validation in `js/features/form.js` now reads native validity states instead of restating the rules; participant messages use `field.min` and `field.max`, and `syncEndDateMin` maintains the end-date minimum. Messages, error handling, focus behavior and `contact.html` attributes were preserved; as an intentional change, an end date before today is reported even without a start date. Service Worker cache: `aurora-1.21`.
- **Verification:** Source review confirmed removal of the duplicated phone-length check, participant-limit literals and manual date comparisons. Two regression cases were added: a participant maximum raised to 15 and a past end date without a start date. Existing form tests and the production build were part of the original completion verification.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-03 — Let the design tokens own the theme presentation after page load

- **Status:** COMPLETED — implemented and verified.
- **Result:** `css/modules/tokens.css` now owns the post-load root background (`--bg`) and each theme's `color-scheme`; `js/features/theme.js` manages only theme state and persistence and removes the bootstrap-only inline theme styles. The early theme bootstrap, its CSP hashes, the storage contract, the toggle and unrelated inline styles were unchanged. Service Worker cache: `aurora-1.22`.
- **Verification:** `tests/theme-bootstrap.test.js` checks that bootstrap colors match the tokens, that inline theme styles are removed after initialization and each toggle, and that unrelated inline styles are kept; source review confirmed that `theme.js` contains no color literals. CSP and production-build checks were among the completion criteria; the specified browser theme check has no independently recorded result.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-04 — Move Service Worker registration and the update notice out of the entry module

- **Status:** COMPLETED — implemented and verified.
- **Result:** `js/features/service-worker-lifecycle.js` now owns registration, the update notice, `SKIP_WAITING`, the single reload on `controllerchange` and development unregistration through `initPwaLifecycle()`, which has no import-time side effects. `js/script.js` calls it once at module evaluation, outside the `DOMContentLoaded` initializer chain, preserving the original timing, production and development behavior and worker logic. Service Worker cache: `aurora-1.23`.
- **Verification:** Source review confirmed that `js/script.js` contains no Service Worker logic and that importing the module registers nothing and changes no DOM. Completion relied on the existing initializer tests and production-build checks, including `verify:js` and `check:css-assets`; no dedicated tests for the update notice or the `controllerchange` reload were added.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-05 — Declare the published page set and the asset-tag rewrite once for the build stage and its check

- **Status:** COMPLETED — implemented and verified.
- **Result:** `scripts/site-build-contract.js` declares the 12 maintained pages (`maintainedPages`) and the two source-to-production asset tag pairs (`assetReferences`) once for `build:stage`, `check:css-assets` and the CSP test fixtures. The build now rejects missing or undeclared root pages before writing `dist/`. Output layout, asset rewriting and the independent CSP and asset page discovery were preserved; the production output and the `aurora-1.23` cache were unchanged.
- **Verification:** `tests/build-stage.test.js` covers publication of exactly the declared pages and rejection of undeclared, missing and renamed root pages before output is staged; source review confirmed shared use of the contract. The original completion criteria record regression-suite and production-build verification.
- **Impact:** Low
- **Effort:** Small

## Excluded defects

- **Catalogue image alt text (content observation):** The original analysis found that `gallery-data.json` and `tours.json` describe the same 36 image files with different `alt` texts. Their accuracy was not evaluated and belongs to a content and accessibility audit, not to this report. A static comparison on 2026-10-10 found all 36 pairs still differing.

## Verification limitations

The original analysis did not install dependencies or run `npm test`, `npm run build` or browser checks; only read-only Git inspection and Node data-comparison scripts were used, and first-paint theme behavior and the Service Worker lifecycle were assessed from source. jsdom support for `rangeUnderflow` and `rangeOverflow` on date and number inputs, on which the IMP-TECH-02 tests rely, was not independently established during the analysis.

Individual verification run logs are not retained in the repository; the completion records rely on documented outcomes, source files, regression tests and build contracts. Preparing this archive involved only editorial review and static repository inspection; no application tests, production builds or browser checks were run for it.
