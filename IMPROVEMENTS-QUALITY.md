# Aurora — Quality Improvements

**Analysis date:** 2026-10-01
**Project type:** Multi-page static website — 12 hand-written HTML pages, modular CSS built with PostCSS, vanilla ES modules bundled with esbuild, JSON-driven tour and gallery views, a service worker, a Vitest/jsdom regression suite, and Netlify static hosting with manual deployment
**Analysis mode:** Evidence-based quality improvement review
**Focus:** Project-wide quality

## Improvement overview

Aurora already has a strong verification base for a static site. `npm run build` runs nine repository checks against the sources and the `dist/` package. These cover the built bundles, the asset references, the CSP hashes, the tour catalogue and the Service Worker bundle record. `npm test` runs 13 Vitest files. They cover the data-driven views (tour filtering, the gallery, tour detail rendering with HTML sanitization, contact form validation), the CSS contracts (buttons, focus, typography, control fonts, responsive `sizes`), the theme bootstrap, the font preloads, and the asset-integrity and CSP checkers. The development plan, the daily audit and the UI improvement report are all closed and archived in `docs/archive/`. No open plan item exists.

Automated protection is thinner where the behaviour is interactive, production-only or at a data boundary:

- The keyboard and focus handling of the lightbox and the mobile navigation was checked only in a browser.
- The service worker runs only in the production package and has no automated test.
- The initializer isolation that keeps content visible when JavaScript fails was checked only by manual injected-failure runs.
- The home page restates three catalogue offers outside the catalogue check.
- The tour detail view inserts catalogue text into HTML attributes without escaping it.

The five proposals below target these points. Each one keeps the current architecture and conventions.

## Proposed improvements

### IMP-QUALITY-01 — Protect the keyboard and focus contract of the lightbox and the mobile navigation

- **Status:** COMPLETED — implemented and verified.
- **Result:** Regression tests now protect the documented lightbox and mobile-navigation keyboard, focus and state contracts.
- **Affected area:** The shared lightbox on `gallery.html` and `tour.html`, and the mobile navigation drawer on all 12 pages.
- **Evidence:** `js/features/lightbox.js:28-30`, `lightbox.js:41-78`, `lightbox.js:86-127`; `js/features/nav.js:11-75`; overlay markup `gallery.html:202-236`, `tour.html:326-360`; navigation markup `index.html:130`, `index.html:148`; documented behaviour `README.md:24`, `README.md:27`, `README.md:239`; browser-only verification of the related fixes in `docs/archive/plans/PLAN-2026-09-28.md:89` and `:98`; `tests/gallery.test.js:109-124`.
- **Current implementation:**
  - **Lightbox:** It opens from native thumbnail buttons and moves focus to the close button. It traps Tab and Shift+Tab among the close, previous and next buttons, and locks and then restores `body` overflow. Escape closes it and returns focus to the trigger. Arrow keys step only through images that the active gallery filter leaves visible.
  - **Navigation drawer:** It sets `aria-expanded`, focuses the first link, traps Tab, closes on Escape or a link click with focus returned to the previously focused element, and resets when the 900 px media query starts to match.
  - **Verification so far:** The lightbox filter fix (PH3-01) and the thumbnail controls (PH3-02) were verified in a browser. No test calls `initLightbox` or `initNav`. The gallery tests check only that the rendered thumbnails are lightbox trigger buttons.
- **Proposed improvement:** Add focused jsdom regression tests for both components. They should mount the overlay and navigation markup from the maintained pages and assert the focus, keyboard and state contract described above.
- **Expected quality value:** A change to these modules, or to the markup they read, would fail `npm test` instead of depending on a manual keyboard pass. These modules carry the site's documented focus trapping and focus return. The lightbox code has already needed two fixes.
- **Implementation scope:**
  - Add one or two test files in `tests/` using the existing helpers (`mountFromPage`, `stubFetchJson`, `vi.stubGlobal` for `matchMedia`).
  - Change no file in `js/` or any page, so no bundle or `VERSION` change follows.
  - Swipe gestures, fullscreen and native Tab traversal stay outside the scope, because jsdom does not emulate them.
- **Acceptance criteria:**
  - **Opening the lightbox:** Activating a gallery thumbnail button unhides the overlay, focuses the close button and sets `body` overflow to `hidden`. Closing restores the previous overflow value.
  - **Closing the lightbox:** Escape closes it and returns focus to the activating button.
  - **Filtered navigation:** With a destination filter applied, ArrowRight and ArrowLeft wrap through that destination's images only.
  - **Lightbox focus trap:** Tab on the last control focuses the first, and Shift+Tab on the first focuses the last.
  - **Tour page:** The main image on `tour.html` is not part of the lightbox sequence.
  - **Opening the drawer:** Activating the navigation toggle sets `aria-expanded="true"`, focuses the first navigation link and locks scrolling.
  - **Drawer focus trap:** Tab and Shift+Tab wrap at the ends of the link list.
  - **Closing the drawer:** Escape closes it and returns focus to the toggle. A link click closes it, and a desktop media-query change closes it.
  - **Suite:** `npm test` passes.
- **Impact:** High
- **Effort:** Medium

### IMP-QUALITY-02 — Add regression tests for the service worker caching strategies

- **Affected area:** `service-worker.js`, which provides the offline fallback, cache cleanup and update activation of the production package.
- **Evidence:** `service-worker.js:10-33` (install, activate, `SKIP_WAITING`), `service-worker.js:35-53` (request routing), `service-worker.js:55-84` (`cacheFirst`, `networkFirst`); `js/script.js:124-150` (registration only in the production bundle, unregistration in development); `scripts/check-css-assets.js:112-192` (static check of the precache list only); `README.md:210`, `README.md:264-268`.
- **Current implementation:**
  - **Install:** The worker precaches six URLs under a `VERSION`-named static cache.
  - **Activate:** It deletes every cache except the current static and HTML caches.
  - **HTML requests:** These are served network-first. Successful `text/html` responses are cached, and when the network fails the worker answers with the cached page or with `offline.html`.
  - **Static requests:** Styles, scripts, images, fonts and precached paths are served cache-first. Only non-opaque 2xx responses are cached.
  - **Updates:** The `SKIP_WAITING` message activates a waiting worker.
  - **Verification so far:** Development pages never register the worker. The build checks only that the precache entries exist in `dist/`. No test runs the worker's event handlers.
- **Proposed improvement:** Add a focused test file that runs the real `service-worker.js` against in-memory stand-ins for the worker global scope, Cache Storage and `fetch`, and asserts the documented strategies.
- **Expected quality value:** The worker's behaviour reaches returning visitors through their caches and is never exercised during development. A regression in the fallback chain, the cacheability rules or the cleanup would currently be noticed only on the deployed site.
- **Implementation scope:**
  - Add tests only, using Node built-ins already available to the suite and no new dependency.
  - Do not change `service-worker.js`, so no `VERSION` change follows.
  - The update banner and the reload on `controllerchange` in `js/script.js` stay outside the scope. That branch exists only in the production bundle, and testing it would require a source refactor.
- **Acceptance criteria:**
  - **Install:** The install event adds exactly the `STATIC_ASSETS` list to the current static cache.
  - **Activate:** Activation deletes the caches of an earlier version (for example `aurora-1.17_static`) and keeps both current caches.
  - **Non-GET requests:** A non-GET request is not intercepted.
  - **HTML online:** A successful HTML response is returned and cached, while a non-HTML or non-2xx response to an HTML request is returned but not cached.
  - **HTML offline:** When the network fails, an HTML request returns the cached copy if one exists, otherwise `offline.html`.
  - **Static requests:** A cached static request is answered without calling `fetch`. An opaque or non-2xx static response is not cached.
  - **Updates:** A `SKIP_WAITING` message calls `skipWaiting()`.
  - **Suite:** `npm test` passes.
- **Impact:** High
- **Effort:** Medium

### IMP-QUALITY-03 — Protect initializer isolation and the reveal-ready contract

- **Affected area:** Page initialization in `js/script.js` and the reveal animation gate, which together decide whether page content stays visible when part of the JavaScript fails.
- **Evidence:** `js/script.js:16-55`; `js/features/reveal.js:1-39`; `css/modules/utilities.css:97-116`; manual verification of PH3-04 in `docs/archive/plans/PLAN-2026-09-28.md:109-113`.
- **Current implementation:**
  - **Initializer isolation:** `runInitializer` wraps each of the 15 initializers, reports a synchronous throw or an asynchronous rejection through `console.error("Błąd inicjalizacji: …")` and lets the others continue. On `gallery.html` it chains gallery rendering, gallery filters and reveal, and reveal still runs when the gallery fails.
  - **Reveal gate:** `.reveal` elements are hidden only under `html.reveal-ready`. `initReveal` adds that class only after every element is observed, reveals everything directly when `IntersectionObserver` is missing, and disconnects without adding the class when observation throws.
  - **Verification so far:** The PH3-04 contract was verified with manual missing-bundle and injected-failure runs. No test imports `js/script.js` or `js/features/reveal.js`.
- **Proposed improvement:** Add regression tests for this contract. They should run the real `js/script.js` with mocked feature modules, one of which throws and one of which rejects, and run `initReveal` with a missing, a working and a failing `IntersectionObserver`.
- **Expected quality value:** If this contract regresses, the risk is site-wide hidden content rather than one broken feature. The regression would also stay silent until a failure occurs, which is the case a test catches and a visual review does not.
- **Implementation scope:**
  - Add tests in `tests/` using Vitest module mocks and global stubs. No change to `js/script.js`, `reveal.js` or CSS.
  - The production-only Service Worker branch of `js/script.js` stays outside the scope. jsdom provides no `navigator.serviceWorker`, so that branch is skipped in the tests.
- **Acceptance criteria:**
  - **Isolation:** After `DOMContentLoaded`, with one initializer throwing synchronously and another rejecting, every other initializer is called and each failure is reported once with its name.
  - **Gallery page:** With `data-page="gallery"` and a rejecting gallery initializer, the gallery filters and reveal initializers still run, in that order.
  - **Missing observer:** Without `IntersectionObserver`, every `.reveal` element receives `is-visible` and `<html>` does not receive `reveal-ready`.
  - **Failing observer:** When `observe` throws, `reveal-ready` is not added and the observer is disconnected.
  - **Working observer:** When observation succeeds, `reveal-ready` is added.
  - **Suite:** `npm test` passes.
- **Impact:** High
- **Effort:** Small

### IMP-QUALITY-04 — Extend the tour catalogue check to the home page featured offers

- **Affected area:** The three featured offer cards on `index.html` and `scripts/check-tour-catalogue.js` (`npm run check:tour-catalogue`, run by `npm run build`).
- **Evidence:** `index.html:287-321`, `index.html:325-359`, `index.html:363-397` (card titles, durations in the card text, `tours.html#tokio`, `#malediwy`, `#nyc` links); `scripts/check-tour-catalogue.js:198-200`, `check-tour-catalogue.js:278-284`; `scripts/check-asset-integrity.js:55` (fragments are stripped, so link anchors are not validated); earlier home page drift corrected in `docs/archive/plans/PLAN-2026-09-28.md:47` and recorded in `docs/CHANGELOG.md` (Fixed: tour offers stating different names, durations and prices).
- **Current implementation:**
  - **What the check covers:** It compares the `tours.html` listing cards and the `contact.html` tour select with `assets/data/tours.json`.
  - **What it does not cover:** It names the listing cards' `id` attributes as anchors linked from `index.html`, but it does not read `index.html`.
  - **Home page cards:** These state the offer names and durations in their own text ("Dziewięciodniowy program…", "7 dni…", "5 dni…") and link to listing anchors.
  - **Current state and gaps:** These currently match the catalogue (verified for this analysis). No check would report a renamed offer, a changed duration or a broken anchor on the home page. The home page Tokio duration has drifted before.
- **Proposed improvement:** Make the catalogue check also verify each featured home page card against the catalogue:
  - **Link:** The card's `tours.html#<anchor>` link must resolve to a listing card.
  - **Title:** The title must equal the catalogue name of the offer that card links to.
  - **Duration:** Any numeric "<N> dni" statement in the card text must equal the catalogue `days`.
- **Expected quality value:** Every surface that restates catalogue facts is checked by the build, and the gap on the surface with a recorded drift history is closed.
- **Implementation scope:**
  - Change `scripts/check-tour-catalogue.js`, reusing its existing parsing helpers.
  - Add a focused test that runs the script against pages written to a temporary directory, as `tests/asset-integrity.test.js` and `tests/csp.test.js` do for their checkers.
  - Update the check's description in `README.md`, `docs/settings.md` and `docs/pipeline-notes.md`.
  - Leave the page content, the set of featured offers and the listing and contact rules unchanged.
  - The spelled-out Tokio duration ("Dziewięciodniowy") cannot be compared numerically. It stays an explicitly documented limitation unless the owner decides to restate it.
- **Acceptance criteria:**
  - **Current repository:** `npm run check:tour-catalogue` passes on the current repository and names `index.html` in its success message.
  - **Failure cases:** In the test fixture, the check fails with a file and line reference in each of these cases:
    - a home card title differs from the catalogue name of its offer;
    - a numeric duration differs from the catalogue `days`;
    - a card links to an anchor that matches no listing card.
  - **Suite and build:** `npm test` and `npm run build` pass.
- **Impact:** Medium
- **Effort:** Small

### IMP-QUALITY-05 — Treat catalogue text as text when building tour detail image markup

- **Affected area:** The image markup that `js/features/tour-detail.js` builds from `assets/data/tours.json` on `tour.html`.
- **Evidence:** `js/features/tour-detail.js:44-53` (`innerHTML` assignment), `tour-detail.js:85-92` (`aria-label` interpolation), `tour-detail.js:94-135` (`alt`, `data-caption` and image paths interpolated into an HTML template); DOM-property construction of the same attributes in `js/features/gallery.js:42-87`; `scripts/check-asset-integrity.js:418-427` (image bases are checked for path characters, not for quotes or `<`); `tests/tour-detail.test.js:151-168` (sanitizer test covering only the summary and description); `assets/data/tours.json:152` (a caption containing an apostrophe).
- **Current implementation:**
  - **Descriptions:** The tour descriptions pass through an allow-list sanitizer.
  - **Image markup:** Image `alt` texts, captions, the derived button label and the image base are inserted into double-quoted attributes of an HTML string without escaping, and the string is then assigned to `innerHTML`.
  - **Gallery comparison:** The gallery builds the same attributes through DOM properties, so its catalogue text is never parsed as markup.
  - **Current data:** It renders correctly, because no value contains a double quote, `<` or `&`. One caption already contains an apostrophe, which is safe only because the attributes are double-quoted.
- **Proposed improvement:** Ensure that `alt`, caption, label and path values from the catalogue reach the tour detail DOM as literal attribute values. Either escape them before interpolation or set them through DOM properties as `gallery.js` does. Add a regression test with HTML-special characters.
- **Expected quality value:** A routine catalogue edit, such as a quoted hotel name in an `alt` text, can no longer truncate attributes or inject markup into the tour page. The protection then no longer depends on the Content-Security-Policy from `_headers`, which only the Netlify deployment applies and a local development server does not.
- **Implementation scope:**
  - Change `js/features/tour-detail.js` and add one test in `tests/tour-detail.test.js`.
  - Keep these unchanged: the rendered structure, the classes, the `sizes` values, the description sanitizer and its allow-list, and the lightbox trigger contract. The existing tour detail, asset-integrity and typography tests must pass unchanged.
  - The change alters `dist/js/script.min.js`, so it ships through the documented `VERSION` and `npm run record:sw-bundles` workflow.
- **Acceptance criteria:**
  - **Image attributes:** For a catalogue image whose `alt` and `caption` contain `"`, `<`, `>`, `&` and `'`, the rendered `img.alt` and `img.dataset.caption` equal the source strings.
  - **Button label:** The thumbnail button's `aria-label` equals `Otwórz zdjęcie: <alt>`.
  - **Picture structure:** No element or attribute appears in the picture or button beyond the current structure.
  - **Existing tests:** All existing tests pass without modification.
  - **Build:** `npm run build` passes after the cache version update.
- **Impact:** Medium
- **Effort:** Small

## Selection summary

- **Selection criteria:**
  - Each proposal protects behaviour that already works and is documented, but is verified only manually or not at all.
  - The protected behaviours are focus management, offline delivery, failure isolation, catalogue consistency, and integrity at the boundary between data and markup.
  - The set favours focused tests and one small source safeguard over new tooling, and introduces no dependency.
- **Quality areas:**
  - Accessibility regression protection (01).
  - Runtime resilience and offline behaviour (02, 03).
  - Content and data integrity (04, 05).
  - Security-relevant DOM insertion (05).
- **Dependencies and independence:**
  - All five can be implemented independently and in any order.
  - 01, 02 and 03 change only `tests/`.
  - 04 changes a build script and its documentation, none of it shipped to `dist/`.
  - 05 is the only proposal that changes a shipped bundle and therefore needs a new Service Worker `VERSION`.
- **Considered but not selected:**
  - Tests for `scripts/check-sw-bundles.js` were considered. This release gate runs in every build and was verified scenario by scenario under PH2-03, so it ranked below the five selected items. It remains a reasonable next candidate.
- **Scope:** Each proposal has a bounded scope and observable criteria. Together they form a realistic candidate backlog for focused development work. No completion time is implied.

## Analysis limitations

- **No tests run:** `node_modules` is not installed in the analysed checkout and no dependency was installed. `npm test` and `npm run build` were therefore not run, and the current pass state of the suite is taken from the project documentation, not observed. The only command executed was `node scripts/check-tour-catalogue.js`, which passed.
- **No browser checks:** No browser, device or assistive-technology checks were made. The behaviour described for the lightbox, the navigation, the service worker and the initialization chain comes from source inspection.
- **Defect-class observations excluded:** Observations of that kind made during the analysis were left out of this report. They belong in an audit.
