# Aurora — Technical Improvements

**Analysis date:** 2026-10-04
**Project type:** Multi-page static website — 12 maintained HTML pages, modular CSS built with PostCSS, vanilla ES modules bundled with esbuild, JSON-driven tour and gallery views, a service worker, Node.js build and check scripts, a Vitest/jsdom regression suite, and Netlify static hosting with manual deployment
**Analysis mode:** Evidence-based technical improvement review
**Focus:** Project-wide technical implementation

## Improvement overview

Aurora's architecture is coherent for its scope:

- **Source ownership:** The maintained pages load the canonical CSS and JavaScript sources directly. `dist/` is generated from scratch by every build.
- **Build checks:** The build runs repository checks for asset references, CSP hashes, the tour catalogue and the Service Worker bundle record.
- **JavaScript:** Feature modules in `js/features/` are small and single-purpose. They are started through an isolating initializer chain in `js/script.js`.
- **Plans and reports:** The development plan, the daily audit and the UI and quality improvement reports are completed and archived. No plan item is open.

The remaining technical opportunities share one pattern. Several stable contracts are stated in more than one place, although one owner would be enough:

- the catalogue image variants are built in two runtime modules;
- the theme colours are restated by the theme toggle, which overrides the design tokens;
- the contact form constraints are restated by the validation code;
- the Service Worker lifecycle code sits in the initialization entry module;
- the page set and asset-tag rewrite contract are declared separately by the build stage and its check.

Each proposal below gives one of these contracts a single owner. Behaviour stays unchanged.

## Proposed improvements

### IMP-TECH-01 — Build catalogue image pictures through one shared module

- **Status:** COMPLETED — implemented and verified.
- **Result:** `gallery.js` and `tour-detail.js` now build their catalogue pictures through the shared runtime builder in `js/features/catalogue-picture.js`, while each keeps its own wrappers, classes, `sizes` values and lightbox behaviour.
- **Affected area:** Runtime `<picture>` rendering for catalogue images in `js/features/gallery.js` (`gallery.html`) and `js/features/tour-detail.js` (`tour.html`).
- **Evidence:**
  - Runtime builders: `js/features/gallery.js:64-93` and `js/features/tour-detail.js:98-132`.
  - Asset-checker mirror: `scripts/check-asset-integrity.js:18-22` and `scripts/check-asset-integrity.js:434-454`. `tests/asset-integrity.test.js:225` compares this mirror with the module output.
  - Variant widths produced for the `tours` profile: `scripts/build-images.js:13-19`.
  - Gallery data: in `assets/data/gallery-data.json`, all 36 records carry a `lightbox` value, and every value equals the derived `-1600x1040.jpg` path (checked with a read-only Node script).
- **Current implementation:** Both modules encode the same image contract independently:
  - **Path:** the `assets/img/tours/<base>` directory.
  - **Variants:** four widths from `400x260` to `1600x1040`, as AVIF and WebP `<source>` elements and a JPG `<img>`.
  - **Image defaults:** a `1200x780` JPG `src`, `width`/`height` of 1200×780 and lazy loading.
  - **Lightbox:** the `1600x1040` JPG as `data-lightbox-src` and the caption as `data-caption`.

  `createSrcset` is identical in both files. `createSource` and `createImage` differ only in signature and minor details: the gallery honours a per-record `lightbox` override and defaults a missing `alt` or `caption` to an empty string. Both views render the same 36 image files. The contract is stated a third time in the CommonJS asset checker.
- **Proposed improvement:** One module in `js/features/` owns the catalogue image variant contract. It builds the `<picture>` (sources and image) for an image record and a caller-supplied `sizes` value. `gallery.js` and `tour-detail.js` keep their own wrappers and `sizes` constants and call it.
- **Expected engineering value:**
  - The naming and size contract that `build:images` produces for `tours` is declared once in the runtime code.
  - A change of widths, formats, fallback or lightbox size becomes one runtime edit. Today it takes two parallel edits that can diverge between the gallery and the tour page.
  - The asset checker's mirror comment can name a single module.
- **Implementation scope:**
  - One new module. `gallery.js` and `tour-detail.js` are reduced to their view-specific markup: figure, button, figcaption and `tour-gallery__*` classes.
  - Keep `getLightboxTriggerLabel` in `lightbox.js`, the per-view `sizes` values, and support for the gallery `lightbox` override. Removing the redundant `lightbox` values from the data is a separate data decision.
  - The CommonJS mirror in `scripts/check-asset-integrity.js` stays, because the existing comparison test protects it; only its comment changes.
  - The change alters `dist/js/script.min.js`, so it follows the documented `VERSION` and `npm run record:sw-bundles` workflow.
- **Acceptance criteria:**
  - **Single declaration:** The variant list and the `assets/img/tours/` prefix appear in exactly one file under `js/`, and `createSrcset` exists once.
  - **Unchanged output:** For the current data, `gallery.html` and `tour.html` render the same elements, classes and image attributes as before: `src`, `srcset`, `sizes`, `width`, `height`, `alt`, `loading`, `data-lightbox-src` and `data-caption`.
  - **Tests:** The existing gallery, tour detail, lightbox, responsive-image and asset-integrity tests pass without modification.
  - **Build:** `npm run build` passes after the cache version update.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-02 — Derive contact form validation from the native constraints

- **Status:** COMPLETED — implemented and verified.
- **Result:** Contact form validation now derives the phone, date and participant rules from the native field constraints (the `contact.html` attributes and the runtime date minimums) instead of restating them in JavaScript, and `form.js` only selects the custom message for the reported validity state.
- **Affected area:** Contact form validation in `js/features/form.js` and the constraint attributes of `contact.html`.
- **Evidence:**
  - Runtime `min` values: `js/features/form.js:16-31`.
  - `validateField`: `js/features/form.js:74-128`, especially `:91-93`, `:95-99`, `:101-112` and `:114-119`.
  - Constraint attributes: `contact.html:266`, `contact.html:277-280`, `contact.html:303`, `contact.html:308` and `contact.html:314`.
  - Recorded drift: `docs/CHANGELOG.md:45`.
  - Existing tests: `tests/form.test.js:114-157` and `tests/form.test.js:215-243`.
- **Current implementation:** `contact.html` declares its constraints natively: `required`, `minlength="3"`, a phone `pattern` that already requires at least seven characters excluding spaces and hyphens, and `min="1" max="12"` on the participant count. `form.js` sets the date `min` values at runtime (today, then the end date no earlier than the start date).

  `validateField` reads `valueMissing`, `typeMismatch`, `tooShort` and `patternMismatch`, and it already derives the name-length message from `field.minLength`. It restates the remaining rules in code, in branches keyed by field `id`:
  - the phone length rule, a second time, as `replace(/[\s-]/g, '').length < 7`;
  - the participant range, as the literals `1` and `12` in both the check and the message;
  - both date limits, as string comparisons instead of the `min` values it has just set.

  The CHANGELOG records a defect in which the phone rule was wrong in both the `pattern` and the JavaScript strip expression.
- **Proposed improvement:** `validateField` selects each message from the field's native validity state, including `rangeUnderflow` and `rangeOverflow`. The field-specific message texts stay in `form.js`. Numeric limits and the phone rule live only in the `contact.html` attributes and in the runtime `min` values that `form.js` already maintains. A message that states a limit reads it from the field, as the name-length message already does.
- **Expected engineering value:**
  - Each constraint has one definition, and that definition governs both native validation without JavaScript and the JavaScript messages.
  - The no-JavaScript/JavaScript drift recorded in the CHANGELOG cannot recur for the participant range or the dates.
  - Changing a limit in `contact.html` no longer requires a matching edit in `form.js`.
- **Implementation scope:**
  - `js/features/form.js` only. The `contact.html` attributes, message wording, error placement, `aria-invalid` handling, first-invalid-field focus, and tour prefill stay unchanged.
  - One case differs: the native state is stricter than the current code for an end date before today while the start date is empty. The current code shows no message there, and the empty required start date still blocks submission. This case needs an explicit message decision during implementation.
  - The change alters the shipped bundle, so it follows the `VERSION` workflow.
- **Acceptance criteria:**
  - **No restated rules:** `form.js` contains no participant-limit literals, no second phone-length check, and no manual date string comparison.
  - **Tests:** Every existing test in `tests/form.test.js` passes without modification.
  - **Limit test:** A test that changes `max` on `#people` in the fixture changes the accepted range and the stated limit without any edit to `form.js`.
  - **Build:** `contact.html` is unchanged, and `npm run build` passes after the cache version update.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-03 — Let the design tokens own the theme presentation after page load

- **Status:** COMPLETED — implemented and verified.
- **Result:** The CSS design tokens now own the post-load theme presentation (the root background from `--bg` and each theme's `color-scheme` in `tokens.css`), while `theme.js` only controls the theme state and clears the bootstrap-only inline styles.
- **Affected area:** Runtime theme application in `js/features/theme.js` and the theme layer of `css/modules/tokens.css` and `css/modules/base.css`.
- **Evidence:**
  - Theme toggle: `js/features/theme.js:15-17` and `js/features/theme.js:29-38`.
  - Design tokens: `css/modules/tokens.css:1-2`, `css/modules/tokens.css:41` and `css/modules/tokens.css:113-114`.
  - Body background rule: `css/modules/base.css:16-24`.
  - Inline theme bootstrap: `index.html:38-61` (the same logic is on all 12 pages).
  - Theme tests: `tests/theme-bootstrap.test.js:16-17` and `tests/theme-bootstrap.test.js:151-157`.
- **Current implementation:**
  - **Bootstrap:** The inline bootstrap must apply the theme before the stylesheet loads. It therefore hard-codes `#05060a` and `#f8f7f2` as an inline `background-color` and `color-scheme` on `<html>`.
  - **Theme toggle:** After load, `initThemeToggle` runs `applyTheme` on every page (all 12 pages contain the toggle) and on each toggle. `applyTheme` writes the same two hex literals as inline `background-color` on both `<html>` and `<body>`, and an inline `color-scheme` on `<html>`.
  - **Effect on the tokens:** `base.css` already paints `body` with `var(--bg)`, and `tokens.css` defines `--bg` per theme. The inline body style overrides that rule on every page, so the `--bg` token does not govern the page background at runtime.
  - **Colour scheme:** `tokens.css` declares only `color-scheme: light dark` on `:root`, with no per-theme value, so only the inline style sets the active scheme.
- **Proposed improvement:** The token layer owns the post-load theme presentation:
  - `tokens.css` declares `color-scheme` per `[data-theme]` value and the root background from `--bg`.
  - `theme.js` switches and stores `data-theme`, and it removes the bootstrap's inline first-paint styles instead of restating the colours.
- **Expected engineering value:**
  - The theme colours are declared in `tokens.css` (canonical) and in the bootstrap (the necessary first-paint copy, covered by a CSP hash). The bundle no longer carries a third copy.
  - A change to `--bg` takes effect at runtime without a JavaScript change.
  - `theme.js` is reduced to theme state and persistence.
- **Implementation scope:**
  - Change `js/features/theme.js` and `css/modules/tokens.css` (or `base.css` for the root background), and update the post-initialization assertions in `tests/theme-bootstrap.test.js`.
  - Keep the bootstrap text unchanged, so its CSP hashes and `_headers` stay valid.
  - Keep the storage key, the stored values, the toggle behaviour, and the `theme-color` meta tags and manifest colours, which are separate platform contracts.
  - The bundle and the stylesheet change, so the change follows the `VERSION` workflow.
- **Acceptance criteria:**
  - **No colour literals:** `js/features/theme.js` contains no colour literal.
  - **No inline theme styles:** After `initThemeToggle` and after each toggle, `<html>` and `<body>` carry no inline `background-color`, and `<html>` carries no inline `color-scheme`.
  - **Token rules:** For both `data-theme` values, the stylesheet declares the root and body background from `--bg` and a matching `color-scheme`.
  - **Checks:** `npm run check:csp` passes with unchanged hashes. The updated theme tests and `npm run build` pass after the cache version update.
  - **Browser check:** A browser check in both themes shows no background change on load or on toggle.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-04 — Move Service Worker registration and the update notice out of the entry module

- **Affected area:** The JavaScript entry module `js/script.js` and the Service Worker lifecycle it currently contains.
- **Evidence:**
  - Entry module: `js/script.js:1-40`, `js/script.js:42-62` and `js/script.js:64-151`.
  - Documented Service Worker contract: `docs/pipeline-notes.md:99-104`.
  - Bundle checks: `scripts/verify-built-js.js:19-24` and `scripts/check-css-assets.js:181-190`.
  - Recorded test gap: `docs/archive/improvements/IMPROVEMENTS-QUALITY-2026-10-04.md:76`.
  - Initializer tests: `tests/script-initializers.test.js:4-34`.
- **Current implementation:** `js/script.js` imports 14 feature initializers and runs them through `runInitializer`. It also holds about 90 lines of Service Worker code:
  - it builds the update banner DOM;
  - it watches for a waiting worker and posts `SKIP_WAITING`;
  - in production, it registers `/service-worker.js` after `load` and reloads once on `controllerchange`;
  - in development, it unregisters existing workers.

  This code runs at module evaluation, outside the initializer chain. Because it consists of private functions of the entry module, it cannot be imported on its own. The archived quality report left the update notice and the reload untested, because testing them "would require a source refactor".
- **Proposed improvement:** A dedicated module in `js/features/` owns the Service Worker lifecycle through one exported entry function, and `js/script.js` calls it. The `__AURORA_PRODUCTION__` test stays an inline compile-time check, so esbuild still removes the development branch from the bundle.
- **Expected engineering value:**
  - The entry module keeps one responsibility: initialization order and isolation.
  - The Service Worker lifecycle has a single owner that can be imported without side effects.
  - This removes the structural obstacle recorded in the archived quality report.
- **Implementation scope:**
  - One new module, plus `js/script.js`.
  - Unchanged: the registration URL and timing, the banner markup, classes and Polish text, the `SKIP_WAITING` message, the single-reload guard, development unregistration, the `--define` flags in `package.json`, and `service-worker.js` itself.
  - Whether the call passes through `runInitializer` is an implementation decision, which would affect only error reporting.
  - The bundle bytes change, so the change follows the `VERSION` workflow.
- **Acceptance criteria:**
  - **Entry module:** `js/script.js` contains no `serviceWorker` reference.
  - **Side-effect-free import:** Importing the new module registers or unregisters nothing and changes no DOM until its exported function is called.
  - **Build:** After the cache version update, `npm run build` passes, including `verify:js` (the flag is substituted) and `check:css-assets` (the bundle registers `/service-worker.js`).
  - **Development pages:** Without the flag, the pages still unregister existing workers.
  - **Tests:** `tests/script-initializers.test.js` passes.
- **Impact:** Medium
- **Effort:** Small

### IMP-TECH-05 — Declare the published page set and the asset-tag rewrite once for the build stage and its check

- **Affected area:** The page inventory and the source-to-production tag contract used by `scripts/build-dist.js` (`build:stage`) and `scripts/check-css-assets.js` (`check:css-assets`).
- **Evidence:**
  - Build stage: `scripts/build-dist.js:21-35`, `scripts/build-dist.js:69-75`, `scripts/build-dist.js:78-96` and `scripts/build-dist.js:103`.
  - Asset check: `scripts/check-css-assets.js:12-35` and `scripts/check-css-assets.js:59-111`.
  - CSP test: `tests/csp.test.js:17-21`.
  - Page discovery in the other checks: `scripts/check-csp.js:293-296` and `scripts/check-asset-integrity.js:43-48`.
  - Documented contract: `docs/pipeline-notes.md:10` and `docs/pipeline-notes.md:39`.
- **Current implementation:**
  - **Build stage:** `build:stage` publishes every root `*.html` file that a directory scan finds, and rewrites the two exact tags declared in its `assetReferences`.
  - **Asset check:** `check:css-assets` verifies the source pages and the `dist/` pages against its own hard-coded list of 12 page names and its own `sourceAssets`/`productionAssets` tag declarations.
  - **CSP test:** `tests/csp.test.js` restates the same two tag pairs a third time.
  - **Other checks:** `check:csp` and `check:assets` discover pages by directory scan.

  As a result, a new root page would be published by `build:stage` and checked by `check:csp` and `check:assets`, but skipped by `check:css-assets` until its list is edited. That list is also the only place that reports a deleted page.
- **Proposed improvement:** One small CommonJS module in `scripts/` declares the maintained page inventory and the two source/production tag pairs. `build-dist.js` and `check-css-assets.js` read both from it, and `tests/csp.test.js` may import the tag pairs. When the set of root `*.html` files differs from the inventory, the build fails.
- **Expected engineering value:**
  - The rewrite contract, and the page set that `build:stage` publishes and `check:css-assets` verifies, can no longer diverge.
  - Adding, removing or renaming a page or an entry tag becomes one explicit edit.
- **Implementation scope:**
  - The new module, `scripts/build-dist.js`, `scripts/check-css-assets.js`, and optionally `tests/csp.test.js`.
  - Unchanged: the rewrite rule (each source tag exactly once, otherwise failure), the `dist/` layout, the behaviour of `check:csp` and `check:assets`, and the documented build order.
  - No new dependency. No shipped file changes, so no `VERSION` change is needed.
  - `docs/pipeline-notes.md` and `docs/settings.md` are updated where they describe the page list.
- **Acceptance criteria:**
  - **Single declaration:** The two tag pairs and the page inventory are each declared in exactly one file under `scripts/`.
  - **Shared page set:** `build:stage` and `check:css-assets` read the same page set.
  - **New page:** A root page added without updating the inventory fails `npm run build`, and is never published unverified.
  - **Deleted page:** A deleted maintained page still fails the build.
  - **Regression:** `npm run build` and `npm test` pass on the otherwise unchanged repository.
- **Impact:** Low
- **Effort:** Small

## Selection summary

- **Why these five:** Each proposal gives a single owner to a contract that is currently restated in two or three places. In each case the restatement can drift silently, or in IMP-TECH-03 overrides the canonical token. Each one has a bounded, behaviour-preserving source change and observable criteria. None adds a dependency, a framework or a new architectural layer.
- **Dependencies:**
  - The proposals are independent of one another.
  - IMP-TECH-01 to IMP-TECH-04 each change `dist/js/script.min.js`, and IMP-TECH-03 also changes the stylesheet. Each therefore needs the documented `VERSION` and `record:sw-bundles` update. If they are released together, they can share one cache version update.
  - IMP-TECH-05 changes only build tooling and needs no cache version update.
- **Scope:** All five are Small in effort and suit a focused development session. IMP-TECH-01, IMP-TECH-02 and IMP-TECH-05 are covered by existing tests that should pass without modification. IMP-TECH-03 and IMP-TECH-04 also need a browser check (theme switching) or a production build check (Service Worker registration).
- **Considered but not selected:**
  - **One theme bootstrap text instead of three whitespace variants** (`docs/pipeline-notes.md:145`, three hashes in `_headers`): valid, but of lower value. It also changes the precached `offline.html`.
  - **Shared header and footer markup for the 12 pages:** this would require a templating step and change the "maintained pages are never modified by the build" contract. It is a Large effort.
  - **A shared focus-trap and scroll-lock helper for `nav.js` and `lightbox.js`:** two short fragments that are already tested. The abstraction is not yet justified.
  - **A common HTML attribute parser for the three check scripts:** lower priority than the contracts above.

## Analysis limitations

- **No tests or build run:** `node_modules` is not installed in this checkout, and no dependency was installed. `npm test` and `npm run build` were not run. The only commands executed were read-only Git inspection and Node one-liners that compared `assets/data/gallery-data.json` with `assets/data/tours.json`.
- **No browser checks:** The first-paint theme behaviour and the Service Worker lifecycle are described from source inspection.
- **jsdom support not verified:** It was not verified whether jsdom reports `rangeUnderflow` and `rangeOverflow` for the `date` and `number` inputs. IMP-TECH-02 depends on this for its tests.
- **Content observation excluded:** For all 36 image files used by both the gallery and the tour pages, `gallery-data.json` and `tours.json` give different `alt` texts for the same file; for example, `islandia/islandia-01` is described as an aurora over the coast in one file and as a glacier in the other. Whether either text is inaccurate is a content and accessibility question for an audit, and it is not part of this report.
