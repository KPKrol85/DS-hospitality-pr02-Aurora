# Aurora — Technical Improvements

**Analysis date:** 2026-10-04
**Project type:** Multi-page static website — 12 maintained HTML pages, modular CSS built with PostCSS, vanilla ES modules bundled with esbuild, JSON-driven tour and gallery views, a service worker, Node.js build and check scripts, a Vitest/jsdom regression suite, and Netlify static hosting with manual deployment
**Analysis mode:** Evidence-based technical improvement review
**Focus:** Project-wide technical implementation
**Status:** COMPLETED — all five selected technical improvements were implemented and verified.
**Completion date:** 2026-10-06

## Improvement overview

At the time of the analysis, Aurora's architecture was coherent for its scope:

- **Source ownership:** The maintained pages loaded the canonical CSS and JavaScript sources directly. `dist/` was generated from scratch by every build.
- **Build checks:** The build ran repository checks for asset references, CSP hashes, the tour catalogue and the Service Worker bundle record.
- **JavaScript:** Feature modules in `js/features/` were small and single-purpose. They were started through an isolating initializer chain in `js/script.js`.
- **Plans and reports:** The development plan, the daily audit and the UI and quality improvement reports were completed and archived. No plan item was open.

The remaining technical opportunities shared one pattern. Several stable contracts were stated in more than one place, although one owner would have been enough:

- the catalogue image variants were built in two runtime modules;
- the theme colours were restated by the theme toggle, which overrode the design tokens;
- the contact form constraints were restated by the validation code;
- the Service Worker lifecycle code sat in the initialization entry module;
- the page set and asset-tag rewrite contract were declared separately by the build stage and its check.

The five improvements below gave each of these contracts a single owner. All five were implemented and verified between 2026-10-04 and 2026-10-06. One shared runtime module now builds the catalogue pictures, the contact form messages follow the native field constraints, the design tokens own the post-load theme presentation, a dedicated feature module owns the Service Worker lifecycle, and one build contract declares the maintained pages and entry tags for the build stage and its check. Existing behaviour was kept, with two deliberate exceptions: the contact form now also reports an end date before today while no start date is chosen (IMP-TECH-02), and the build now fails when the root pages differ from the declared page inventory (IMP-TECH-05). No open tasks remain in this document.

## Completed improvements

Each record keeps the original analysis of 2026-10-04 together with its outcome. **Status**, **Result** and **Completion evidence** describe the completed state; **Completion evidence** cites the current repository. **Baseline evidence** and **Baseline** describe the state before implementation; their line references point to the files as they stood on 2026-10-04. **Implemented improvement**, **Achieved engineering value** and **Implemented scope** describe the work that was performed, and **Verification criteria** lists the acceptance criteria set in the analysis for verifying it. **Impact** and **Effort** are the original estimates.

### IMP-TECH-01 — Build catalogue image pictures through one shared module

- **Status:** COMPLETED — implemented and verified.
- **Result:** `gallery.js` and `tour-detail.js` now build their catalogue pictures through the shared runtime builder in `js/features/catalogue-picture.js`, while each keeps its own wrappers, classes, `sizes` values and lightbox behaviour.
- **Affected area:** Runtime `<picture>` rendering for catalogue images in `js/features/gallery.js` (`gallery.html`) and `js/features/tour-detail.js` (`tour.html`).
- **Baseline evidence:**
  - Runtime builders: `js/features/gallery.js:64-93` and `js/features/tour-detail.js:98-132`.
  - Asset-checker mirror: `scripts/check-asset-integrity.js:18-22` and `scripts/check-asset-integrity.js:434-454`. `tests/asset-integrity.test.js:225` compared this mirror with the module output.
  - Variant widths produced for the `tours` profile: `scripts/build-images.js:13-19`.
  - Gallery data: in `assets/data/gallery-data.json`, all 36 records carried a `lightbox` value, and every value equalled the derived `-1600x1040.jpg` path (checked with a read-only Node script during the analysis).
- **Baseline (2026-10-04):** Both modules encoded the same image contract independently:
  - **Path:** the `assets/img/tours/<base>` directory.
  - **Variants:** four widths from `400x260` to `1600x1040`, as AVIF and WebP `<source>` elements and a JPG `<img>`.
  - **Image defaults:** a `1200x780` JPG `src`, `width`/`height` of 1200×780 and lazy loading.
  - **Lightbox:** the `1600x1040` JPG as `data-lightbox-src` and the caption as `data-caption`.

  `createSrcset` was identical in both files. `createSource` and `createImage` differed only in signature and minor details: the gallery honoured a per-record `lightbox` override and defaulted a missing `alt` or `caption` to an empty string. Both views rendered the same 36 image files. The contract was stated a third time in the CommonJS asset checker.
- **Implemented improvement:** `js/features/catalogue-picture.js` now owns the catalogue image variant contract. Its exported `createCataloguePicture` builds the `<picture>` (sources and image) for an image record and a caller-supplied `sizes` value, with an optional lightbox source. `gallery.js` and `tour-detail.js` kept their own wrappers and `sizes` constants and call it.
- **Achieved engineering value:**
  - The naming and size contract that `build:images` produces for `tours` is declared once in the runtime code.
  - A change of widths, formats, fallback or lightbox size is one runtime edit. At baseline it took two parallel edits that could diverge between the gallery and the tour page.
  - The asset checker's mirror comment names a single module.
- **Implemented scope:**
  - One new module was added. `gallery.js` and `tour-detail.js` were reduced to their view-specific markup: figure, button, figcaption and `tour-gallery__*` classes.
  - `getLightboxTriggerLabel` stayed in `lightbox.js`, and the per-view `sizes` values and the support for the gallery `lightbox` override were kept. The redundant `lightbox` values were left in the data; removing them was outside this improvement programme.
  - The CommonJS mirror in `scripts/check-asset-integrity.js` was kept, because the existing comparison test protects it; only its comments changed.
  - The JavaScript architecture description in `README.md` was updated to name the shared module.
  - The change altered `dist/js/script.min.js`, so it followed the documented `VERSION` and `npm run record:sw-bundles` workflow.
- **Verification criteria:**
  - **Single declaration:** The variant list and the `assets/img/tours/` prefix appear in exactly one file under `js/`, and `createSrcset` exists once.
  - **Unchanged output:** For the catalogue data, `gallery.html` and `tour.html` render the same elements, classes and image attributes as before the change: `src`, `srcset`, `sizes`, `width`, `height`, `alt`, `loading`, `data-lightbox-src` and `data-caption`.
  - **Tests:** The existing gallery, tour detail, lightbox, responsive-image and asset-integrity tests pass without modification.
  - **Build:** `npm run build` passes after the cache version update.
- **Completion evidence:** `js/features/catalogue-picture.js` declares `CATALOGUE_IMAGE_DIRECTORY` and `CATALOGUE_IMAGE_VARIANTS` and holds the only `createSrcset` under `js/`. `gallery.js` and `tour-detail.js` import `createCataloguePicture`, and `gallery.js` passes each record's `lightbox` value as `lightboxSrc`. The comments in `scripts/check-asset-integrity.js` name `catalogue-picture.js` as the mirrored module. The implementing change modified no test file. The Service Worker cache was advanced to `aurora-1.20`, with the new bundle hashes recorded in `service-worker-bundles.json`.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-02 — Derive contact form validation from the native constraints

- **Status:** COMPLETED — implemented and verified.
- **Result:** Contact form validation now derives the phone, date and participant rules from the native field constraints (the `contact.html` attributes and the runtime date minimums) instead of restating them in JavaScript, and `form.js` only selects the custom message for the reported validity state.
- **Affected area:** Contact form validation in `js/features/form.js` and the constraint attributes of `contact.html`.
- **Baseline evidence:**
  - Runtime `min` values: `js/features/form.js:16-31`.
  - `validateField`: `js/features/form.js:74-128`, especially `:91-93`, `:95-99`, `:101-112` and `:114-119`.
  - Constraint attributes: `contact.html:266`, `contact.html:277-280`, `contact.html:303`, `contact.html:308` and `contact.html:314`.
  - Recorded drift: `docs/CHANGELOG.md:45`.
  - Tests at baseline: `tests/form.test.js:114-157` and `tests/form.test.js:215-243`.
- **Baseline (2026-10-04):** `contact.html` declared its constraints natively: `required`, `minlength="3"`, a phone `pattern` that already required at least seven characters excluding spaces and hyphens, and `min="1" max="12"` on the participant count. `form.js` set the date `min` values at runtime (today, then the end date no earlier than the start date).

  `validateField` read `valueMissing`, `typeMismatch`, `tooShort` and `patternMismatch`, and it already derived the name-length message from `field.minLength`. It restated the remaining rules in code, in branches keyed by field `id`:
  - the phone length rule, a second time, as `replace(/[\s-]/g, '').length < 7`;
  - the participant range, as the literals `1` and `12` in both the check and the message;
  - both date limits, as string comparisons instead of the `min` values it had just set.

  The CHANGELOG records a defect in which the phone rule was wrong in both the `pattern` and the JavaScript strip expression.
- **Implemented improvement:** `validateField` now selects each message from the field's native validity state, including `rangeUnderflow` and `rangeOverflow`. The field-specific message texts stayed in `form.js`. Numeric limits and the phone rule live only in the `contact.html` attributes and in the runtime `min` values that `form.js` maintains. The participant message reads its limits from the field's `min` and `max`, as the name-length message reads `minLength`. Before an end date is validated, its minimum is synchronized with the start date, or with today while no start date is chosen.
- **Achieved engineering value:**
  - Each constraint has one definition, and that definition governs both native validation without JavaScript and the JavaScript messages.
  - The no-JavaScript/JavaScript drift recorded in the CHANGELOG can no longer recur for the participant range or the dates.
  - Changing a limit in `contact.html` no longer requires a matching edit in `form.js`.
- **Implemented scope:**
  - `js/features/form.js` was changed and regression tests were added to `tests/form.test.js`. The `contact.html` attributes, message wording, error placement, `aria-invalid` handling, first-invalid-field focus, and tour prefill remained unchanged.
  - The analysis identified one case in which the native state was stricter than the baseline code: an end date before today while the start date was empty. The baseline code showed no message there, although the empty required start date still blocked submission. The implementation reports this case with the existing message for a date earlier than today.
  - The change altered the shipped bundle, so it followed the `VERSION` workflow.
- **Verification criteria:**
  - **No restated rules:** `form.js` contains no participant-limit literals, no second phone-length check, and no manual date string comparison.
  - **Tests:** Every existing test in `tests/form.test.js` passes without modification.
  - **Limit test:** A test that changes `max` on `#people` in the fixture changes the accepted range and the stated limit without any edit to `form.js`.
  - **Build:** `contact.html` is unchanged, and `npm run build` passes after the cache version update.
- **Completion evidence:** `js/features/form.js` reads `rangeUnderflow` for both dates and `rangeUnderflow` or `rangeOverflow` for the participant count, builds the participant message from `field.min` and `field.max`, and synchronizes the end-date minimum through `syncEndDateMin`; it contains no participant-limit literals, phone strip expression or date string comparison. The implementing change added two regression cases to `tests/form.test.js`: one raises `max` on `#people` to 15 and checks the accepted range and stated limit, and one rejects an end date before today while no start date is chosen. `contact.html` was not changed. The Service Worker cache was advanced to `aurora-1.21`.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-03 — Let the design tokens own the theme presentation after page load

- **Status:** COMPLETED — implemented and verified.
- **Result:** The CSS design tokens now own the post-load theme presentation (the root background from `--bg` and each theme's `color-scheme` in `tokens.css`), while `theme.js` only controls the theme state and clears the bootstrap-only inline styles.
- **Affected area:** Runtime theme application in `js/features/theme.js` and the theme layer of `css/modules/tokens.css` and `css/modules/base.css`.
- **Baseline evidence:**
  - Theme toggle: `js/features/theme.js:15-17` and `js/features/theme.js:29-38`.
  - Design tokens: `css/modules/tokens.css:1-2`, `css/modules/tokens.css:41` and `css/modules/tokens.css:113-114`.
  - Body background rule: `css/modules/base.css:16-24`.
  - Inline theme bootstrap: `index.html:38-61` (the same logic was on all 12 pages).
  - Theme tests: `tests/theme-bootstrap.test.js:16-17` and `tests/theme-bootstrap.test.js:151-157`.
- **Baseline (2026-10-04):**
  - **Bootstrap:** The inline bootstrap had to apply the theme before the stylesheet loaded. It therefore hard-coded `#05060a` and `#f8f7f2` as an inline `background-color` and `color-scheme` on `<html>`.
  - **Theme toggle:** After load, `initThemeToggle` ran `applyTheme` on every page (all 12 pages contained the toggle) and on each toggle. `applyTheme` wrote the same two hex literals as inline `background-color` on both `<html>` and `<body>`, and an inline `color-scheme` on `<html>`.
  - **Effect on the tokens:** `base.css` already painted `body` with `var(--bg)`, and `tokens.css` defined `--bg` per theme. The inline body style overrode that rule on every page, so the `--bg` token did not govern the page background at runtime.
  - **Colour scheme:** `tokens.css` declared only `color-scheme: light dark` on `:root`, with no per-theme value, so only the inline style set the active scheme.
- **Implemented improvement:** The token layer now owns the post-load theme presentation:
  - `tokens.css` declares `color-scheme` per `[data-theme]` value and the root background from `--bg`.
  - `theme.js` switches and stores `data-theme`, and it removes the bootstrap's inline first-paint styles instead of restating the colours. It removes only the theme properties, so other inline styles, such as a scroll lock, stay.
- **Achieved engineering value:**
  - The theme colours are declared in `tokens.css` (canonical) and in the bootstrap (the necessary first-paint copy, covered by a CSP hash). The bundle no longer carries a third copy.
  - A change to `--bg` takes effect at runtime without a JavaScript change.
  - `theme.js` is reduced to theme state, persistence and the hand-over from the bootstrap's first-paint styles.
- **Implemented scope:**
  - `js/features/theme.js` and `css/modules/tokens.css` were changed; the root background was declared in `tokens.css`, and `base.css` was not changed. The post-initialization assertions in `tests/theme-bootstrap.test.js` were updated and extended.
  - The bootstrap text was kept unchanged, so its CSP hashes and `_headers` stayed valid.
  - The storage key, the stored values, the toggle behaviour, and the `theme-color` meta tags and manifest colours, which are separate platform contracts, were kept.
  - The bundle and the stylesheet changed, so the change followed the `VERSION` workflow.
- **Verification criteria:**
  - **No colour literals:** `js/features/theme.js` contains no colour literal.
  - **No inline theme styles:** After `initThemeToggle` and after each toggle, `<html>` and `<body>` carry no inline `background-color`, and `<html>` carries no inline `color-scheme`.
  - **Token rules:** For both `data-theme` values, the stylesheet declares the root and body background from `--bg` and a matching `color-scheme`.
  - **Checks:** `npm run check:csp` passes with unchanged hashes. The updated theme tests and `npm run build` pass after the cache version update.
  - **Browser check:** A browser check in both themes shows no background change on load or on toggle.
- **Completion evidence:** `js/features/theme.js` contains no colour literal; it sets `data-theme` and removes only the inline `background-color` of `<html>` and `<body>` and the inline `color-scheme` of `<html>`. `css/modules/tokens.css` sets `background-color: var(--bg)` on `:root` and a `color-scheme` for `[data-theme="light"]` and `[data-theme="dark"]`, and `base.css` still paints `body` from `--bg`. `tests/theme-bootstrap.test.js` checks that the bootstrap's first-paint colours equal the theme tokens, that no inline theme style remains after initialization and after each toggle, and that other inline styles are kept. No page and no `_headers` entry was changed. The Service Worker cache was advanced to `aurora-1.22`.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-04 — Move Service Worker registration and the update notice out of the entry module

- **Status:** COMPLETED — implemented and verified.
- **Result:** `js/features/service-worker-lifecycle.js` now owns the Service Worker lifecycle (registration after `load`, the update notice, `SKIP_WAITING`, the single reload on `controllerchange` and development unregistration) through `initPwaLifecycle()`, which has no side effects on import, while `js/script.js` only calls it at module evaluation and the production and development behaviour is unchanged.
- **Affected area:** The JavaScript entry module `js/script.js` and the Service Worker lifecycle it contained at baseline, now in `js/features/service-worker-lifecycle.js`.
- **Baseline evidence:**
  - Entry module: `js/script.js:1-40`, `js/script.js:42-62` and `js/script.js:64-151`.
  - Documented Service Worker contract: `docs/pipeline-notes.md:99-104`.
  - Bundle checks: `scripts/verify-built-js.js:19-24` and `scripts/check-css-assets.js:181-190`.
  - Recorded test gap: `docs/archive/improvements/IMPROVEMENTS-QUALITY-2026-10-04.md:76`.
  - Initializer tests: `tests/script-initializers.test.js:4-34`.
- **Baseline (2026-10-04):** `js/script.js` imported 14 feature initializers and ran them through `runInitializer`. It also held about 90 lines of Service Worker code:
  - it built the update banner DOM;
  - it watched for a waiting worker and posted `SKIP_WAITING`;
  - in production, it registered `/service-worker.js` after `load` and reloaded once on `controllerchange`;
  - in development, it unregistered existing workers.

  This code ran at module evaluation, outside the initializer chain. Because it consisted of private functions of the entry module, it could not be imported on its own. The archived quality report left the update notice and the reload untested, because testing them "would require a source refactor".
- **Implemented improvement:** `js/features/service-worker-lifecycle.js` now owns the Service Worker lifecycle through one exported entry function, `initPwaLifecycle()`, and `js/script.js` calls it. The `__AURORA_PRODUCTION__` test stayed an inline compile-time check, now inside that function, so esbuild still removes the development branch from the bundle.
- **Achieved engineering value:**
  - The entry module keeps one responsibility: initialization order and isolation.
  - The Service Worker lifecycle has a single owner that can be imported without side effects.
  - The structural obstacle recorded in the archived quality report was removed. Tests for the update notice and the reload were not part of this improvement.
- **Implemented scope:**
  - One new module was added and `js/script.js` was changed. The Service Worker section of `docs/pipeline-notes.md` was updated to name the new module.
  - Unchanged: the registration URL and timing, the banner markup, classes and Polish text, the `SKIP_WAITING` message, the single-reload guard, development unregistration, the `--define` flags in `package.json`, and the worker logic in `service-worker.js`, whose only change was the `VERSION` update.
  - The analysis left open whether the call would pass through `runInitializer`. It does not: `js/script.js` calls `initPwaLifecycle()` directly at module evaluation, outside the `DOMContentLoaded` initializer chain, where the baseline code also ran.
  - The bundle bytes changed, so the change followed the `VERSION` workflow.
- **Verification criteria:**
  - **Entry module:** `js/script.js` contains no `serviceWorker` reference.
  - **Side-effect-free import:** Importing the new module registers or unregisters nothing and changes no DOM until its exported function is called.
  - **Build:** After the cache version update, `npm run build` passes, including `verify:js` (the flag is substituted) and `check:css-assets` (the bundle registers `/service-worker.js`).
  - **Development pages:** Without the flag, the pages still unregister existing workers.
  - **Tests:** `tests/script-initializers.test.js` passes.
- **Completion evidence:** `js/script.js` contains no `serviceWorker` reference and calls `initPwaLifecycle()` once at module evaluation. At module level, `js/features/service-worker-lifecycle.js` declares only the reload guard and its functions, and it exports `initPwaLifecycle`. `docs/pipeline-notes.md` describes the production flag folding in `initPwaLifecycle()`. The implementing change modified no test file. The Service Worker cache was advanced to `aurora-1.23`.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-05 — Declare the published page set and the asset-tag rewrite once for the build stage and its check

- **Status:** COMPLETED — implemented and verified.
- **Result:** `scripts/site-build-contract.js` now declares the 12 maintained pages (`maintainedPages`) and the two source-to-production entry tag pairs (`assetReferences`) once: `build:stage` publishes only the declared pages and fails before writing `dist/` when a declared page is missing or a root page is undeclared, `check:css-assets` verifies the same pages and derives its source and production assets from the same pairs, and `tests/csp.test.js` stages its `dist/` fixtures from the pairs while keeping its own page discovery; the `dist/` output is unchanged, so no `VERSION` update was needed.
- **Affected area:** The page inventory and the source-to-production tag contract used by `scripts/build-dist.js` (`build:stage`) and `scripts/check-css-assets.js` (`check:css-assets`).
- **Baseline evidence:**
  - Build stage: `scripts/build-dist.js:21-35`, `scripts/build-dist.js:69-75`, `scripts/build-dist.js:78-96` and `scripts/build-dist.js:103`.
  - Asset check: `scripts/check-css-assets.js:12-35` and `scripts/check-css-assets.js:59-111`.
  - CSP test: `tests/csp.test.js:17-21`.
  - Page discovery in the other checks: `scripts/check-csp.js:293-296` and `scripts/check-asset-integrity.js:43-48`.
  - Documented contract: `docs/pipeline-notes.md:10` and `docs/pipeline-notes.md:39`.
- **Baseline (2026-10-04):**
  - **Build stage:** `build:stage` published every root `*.html` file that a directory scan found, and rewrote the two exact tags declared in its `assetReferences`.
  - **Asset check:** `check:css-assets` verified the source pages and the `dist/` pages against its own hard-coded list of 12 page names and its own `sourceAssets`/`productionAssets` tag declarations.
  - **CSP test:** `tests/csp.test.js` restated the same two tag pairs a third time.
  - **Other checks:** `check:csp` and `check:assets` discovered pages by directory scan.

  As a result, a new root page would have been published by `build:stage` and checked by `check:csp` and `check:assets`, but skipped by `check:css-assets` until its list was edited. That list was also the only place that reported a deleted page.
- **Implemented improvement:** `scripts/site-build-contract.js`, a small CommonJS module, now declares the maintained page inventory and the two source/production tag pairs. `build-dist.js` and `check-css-assets.js` read both from it, and `tests/csp.test.js` imports the tag pairs. When the set of root `*.html` files differs from the inventory, the build fails before anything is written to `dist/`.
- **Achieved engineering value:**
  - The rewrite contract, and the page set that `build:stage` publishes and `check:css-assets` verifies, can no longer diverge.
  - Adding, removing or renaming a page or an entry tag is one explicit edit.
- **Implemented scope:**
  - The new module was added, `scripts/build-dist.js`, `scripts/check-css-assets.js` and `tests/csp.test.js` were changed, and `tests/build-stage.test.js` was added.
  - Unchanged: the rewrite rule (each source tag exactly once, otherwise failure), the `dist/` layout, the behaviour of `check:csp` and `check:assets`, and the documented build order.
  - No dependency was added. No shipped file changed, so no `VERSION` change was needed.
  - `README.md`, `docs/pipeline-notes.md` and `docs/settings.md` were updated where they describe the page list and the build contract.
- **Verification criteria:**
  - **Single declaration:** The two tag pairs and the page inventory are each declared in exactly one file under `scripts/`.
  - **Shared page set:** `build:stage` and `check:css-assets` read the same page set.
  - **New page:** A root page added without updating the inventory fails `npm run build`, and is never published unverified.
  - **Deleted page:** A deleted maintained page still fails the build.
  - **Regression:** `npm run build` and `npm test` pass on the otherwise unchanged repository.
- **Completion evidence:** `scripts/site-build-contract.js` exports `maintainedPages` (12 pages) and `assetReferences` (two tag pairs). `scripts/build-dist.js` and `scripts/check-css-assets.js` require both, and `tests/csp.test.js` reads `assetReferences`. `tests/build-stage.test.js` runs `build-dist.js` against copies of the root files and covers publication of exactly the declared pages, the rejection of an undeclared root page and of a missing declared page before `dist/` is written, and a renamed page reported as both missing and undeclared. `service-worker.js` and `service-worker-bundles.json` were not changed, and the cache remained at `aurora-1.23`.
- **Impact:** Low
- **Effort:** Small

## Selection summary

- **Why these five:** At the time of the analysis, each selected contract was restated in two or three places. In each case the restatement could drift silently, or, in IMP-TECH-03, overrode the canonical token. Each item had a bounded, behaviour-preserving source change and observable criteria. None added a dependency, a framework or a new architectural layer.
- **Dependencies and cache versions:**
  - The items were independent of one another and were implemented as separate changes, in numbered order.
  - IMP-TECH-01 to IMP-TECH-04 each changed `dist/js/script.min.js`, and IMP-TECH-03 also changed the stylesheet. The analysis allowed one shared cache version update for a joint release; instead, each item received its own `VERSION` and `record:sw-bundles` update, advancing the cache from `aurora-1.19` through `aurora-1.20`, `aurora-1.21` and `aurora-1.22` to `aurora-1.23`.
  - IMP-TECH-05 changed only build tooling, its tests and its documentation, and needed no cache version update.
- **Scope:** All five were estimated as Small in effort. The analysis expected IMP-TECH-01, IMP-TECH-02 and IMP-TECH-05 to be covered by existing tests, and IMP-TECH-03 and IMP-TECH-04 to need, in addition, a browser check (theme switching) or a production build check (Service Worker registration). During implementation, regression tests were added for IMP-TECH-02 (`tests/form.test.js`), IMP-TECH-03 (`tests/theme-bootstrap.test.js`) and IMP-TECH-05 (`tests/build-stage.test.js`).
- **Considered but not selected:** The following options were weighed during the 2026-10-04 analysis and left outside this programme. They are recorded as historical context, not as open tasks of this report.
  - **One theme bootstrap text instead of three whitespace variants** (`docs/pipeline-notes.md:145` as of 2026-10-04, three hashes in `_headers`): judged valid, but of lower value. It would also have changed the precached `offline.html`.
  - **Shared header and footer markup for the 12 pages:** this would have required a templating step and changed the "maintained pages are never modified by the build" contract. It was estimated as a Large effort.
  - **A shared focus-trap and scroll-lock helper for `nav.js` and `lightbox.js`:** the two fragments were short and already tested, so the abstraction was not judged justified.
  - **A common HTML attribute parser for the three check scripts:** ranked below the selected contracts.
- **Outcome:** All five selected items were completed within their bounded scopes and verified, as their **Status** records.

## Original analysis limitations (2026-10-04)

These limitations apply to the original analysis of 2026-10-04 and the baseline evidence recorded above, not to the completed improvements. Each improvement was verified separately when it was implemented, as its **Status** and **Result** record. The individual verification runs are not recorded in the repository, so **Completion evidence** cites the current source files, tests, documentation, changelog and commit history.

- **No tests or build run during the analysis:** `node_modules` was not installed in the analysed checkout, and no dependency was installed. `npm test` and `npm run build` were therefore not run during the analysis. The only commands executed were read-only Git inspection and Node one-liners that compared `assets/data/gallery-data.json` with `assets/data/tours.json`.
- **No browser checks during the analysis:** The first-paint theme behaviour and the Service Worker lifecycle were described from source inspection.
- **jsdom support not verified during the analysis:** It was not verified at the time whether jsdom reports `rangeUnderflow` and `rangeOverflow` for the `date` and `number` inputs. The implemented IMP-TECH-02 validation and its tests in `tests/form.test.js` rely on these states.
- **Content observation excluded:** During the analysis, for all 36 image files used by both the gallery and the tour pages, `gallery-data.json` and `tours.json` gave different `alt` texts for the same file; for example, `islandia/islandia-01` was described as an aurora over the coast in one file and as a glacier in the other. Whether either text is inaccurate is a content and accessibility question for an audit. It was not part of this report and is not an open task in it.
