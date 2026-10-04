# Aurora — Quality Improvements

**Analysis date:** 2026-10-01
**Project type:** Multi-page static website — 12 hand-written HTML pages, modular CSS built with PostCSS, vanilla ES modules bundled with esbuild, JSON-driven tour and gallery views, a service worker, a Vitest/jsdom regression suite, and Netlify static hosting with manual deployment
**Analysis mode:** Evidence-based quality improvement review
**Focus:** Project-wide quality
**Status:** COMPLETED — all five selected quality improvements were implemented and verified.
**Completion date:** 2026-10-04

## Improvement overview

At the time of the analysis, Aurora already had a strong verification base for a static site. `npm run build` ran nine repository checks against the sources and the `dist/` package. These covered the built bundles, the asset references, the CSP hashes, the tour catalogue and the Service Worker bundle record. `npm test` ran 13 Vitest files. They covered the data-driven views (tour filtering, the gallery, tour detail rendering with HTML sanitization, contact form validation), the CSS contracts (buttons, focus, typography, control fonts, responsive `sizes`), the theme bootstrap, the font preloads, and the asset-integrity and CSP checkers. The development plan, the daily audit and the UI improvement report were all closed and archived in `docs/archive/`, and no plan item was open.

Automated protection was thinner where the behaviour is interactive, production-only or at a data boundary:

- The keyboard and focus handling of the lightbox and the mobile navigation had been checked only in a browser.
- The service worker runs only in the production package and had no automated test.
- The initializer isolation that keeps content visible when JavaScript fails had been checked only by manual injected-failure runs.
- The home page restated three catalogue offers outside the catalogue check.
- The tour detail view inserted catalogue text into HTML attributes without escaping it.

The five improvements below targeted these points. All five were implemented and verified between 2026-10-02 and 2026-10-04. Regression tests now cover the lightbox, the navigation, the service worker and the initialization chain, the build's catalogue check covers the home page, and the tour detail page builds its images through the DOM. Aurora's architecture and conventions were kept. No open tasks remain in this document.

## Completed improvements

Each record keeps the original analysis of 2026-10-01 together with its outcome. **Status**, **Result** and **Completion evidence** describe the completed state. **Baseline evidence** and **Baseline** describe the state before implementation; their line references point to the files as they stood on 2026-10-01. **Implemented improvement**, **Achieved quality value** and **Implemented scope** describe the work that was performed, and **Verification criteria** lists the criteria used to verify it. **Impact** and **Effort** are the original estimates.

### IMP-QUALITY-01 — Protect the keyboard and focus contract of the lightbox and the mobile navigation

- **Status:** COMPLETED — implemented and verified.
- **Result:** Regression tests now protect the documented lightbox and mobile-navigation keyboard, focus and state contracts.
- **Affected area:** The shared lightbox on `gallery.html` and `tour.html`, and the mobile navigation drawer on all 12 pages.
- **Baseline evidence:** `js/features/lightbox.js:28-30`, `lightbox.js:41-78`, `lightbox.js:86-127`; `js/features/nav.js:11-75`; overlay markup `gallery.html:202-236`, `tour.html:326-360`; navigation markup `index.html:130`, `index.html:148`; documented behaviour `README.md:24`, `README.md:27`, `README.md:239`; browser-only verification of the related fixes in `docs/archive/plans/PLAN-2026-09-28.md:89` and `:98`; `tests/gallery.test.js:109-124`.
- **Baseline (2026-10-01):**
  - **Lightbox:** It opens from native thumbnail buttons and moves focus to the close button. It traps Tab and Shift+Tab among the close, previous and next buttons, and locks and then restores `body` overflow. Escape closes it and returns focus to the trigger. Arrow keys step only through images that the active gallery filter leaves visible.
  - **Navigation drawer:** It sets `aria-expanded`, focuses the first link, traps Tab, closes on Escape or a link click with focus returned to the previously focused element, and resets when the 900 px media query starts to match.
  - **Verification at baseline:** The lightbox filter fix (PH3-01) and the thumbnail controls (PH3-02) had been verified in a browser. No test called `initLightbox` or `initNav`. The gallery tests checked only that the rendered thumbnails are lightbox trigger buttons.
- **Implemented improvement:** Focused jsdom regression tests were added for both components. They mount the overlay and navigation markup from the maintained pages and assert the focus, keyboard and state contract described above.
- **Achieved quality value:** A change to these modules, or to the markup they read, now fails `npm test` instead of depending on a manual keyboard pass. These modules carry the site's documented focus trapping and focus return, and the lightbox code had already needed two fixes.
- **Implemented scope:**
  - Two test files were added in `tests/`, using the existing helpers (`mountFromPage`, `stubFetchJson`, `vi.stubGlobal` for `matchMedia`).
  - No file in `js/` or any page was changed, so no bundle or `VERSION` change followed.
  - Swipe gestures, fullscreen and native Tab traversal stayed outside the scope, because jsdom does not emulate them. The focus-trap tests exercise the explicit Tab boundary handlers only.
- **Verification criteria:**
  - **Opening the lightbox:** Activating a gallery thumbnail button unhides the overlay, focuses the close button and sets `body` overflow to `hidden`. Closing restores the previous overflow value.
  - **Closing the lightbox:** Escape closes it and returns focus to the activating button.
  - **Filtered navigation:** With a destination filter applied, ArrowRight and ArrowLeft wrap through that destination's images only.
  - **Lightbox focus trap:** Tab on the last control focuses the first, and Shift+Tab on the first focuses the last.
  - **Tour page:** The main image on `tour.html` is not part of the lightbox sequence.
  - **Opening the drawer:** Activating the navigation toggle sets `aria-expanded="true"`, focuses the first navigation link and locks scrolling.
  - **Drawer focus trap:** Tab and Shift+Tab wrap at the ends of the link list.
  - **Closing the drawer:** Escape closes it and returns focus to the toggle. A link click closes it, and a desktop media-query change closes it.
  - **Suite:** `npm test` passes.
- **Completion evidence:** `tests/lightbox.test.js` covers the lightbox on `gallery.html` (including every destination filter) and on `tour.html`; `tests/nav.test.js` covers the mobile navigation drawer.
- **Impact:** High
- **Effort:** Medium

### IMP-QUALITY-02 — Add regression tests for the service worker caching strategies

- **Status:** COMPLETED — implemented and verified.
- **Result:** Regression tests now protect the Service Worker install, cache lifecycle, request routing, offline fallback and update-activation behaviour.
- **Affected area:** `service-worker.js`, which provides the offline fallback, cache cleanup and update activation of the production package.
- **Baseline evidence:** `service-worker.js:10-33` (install, activate, `SKIP_WAITING`), `service-worker.js:35-53` (request routing), `service-worker.js:55-84` (`cacheFirst`, `networkFirst`); `js/script.js:124-150` (registration only in the production bundle, unregistration in development); `scripts/check-css-assets.js:112-192` (static check of the precache list only); `README.md:210`, `README.md:264-268`.
- **Baseline (2026-10-01):**
  - **Install:** The worker precaches six URLs under a `VERSION`-named static cache.
  - **Activate:** It deletes every cache except the current static and HTML caches.
  - **HTML requests:** These are served network-first. Successful `text/html` responses are cached, and when the network fails the worker answers with the cached page or with `offline.html`.
  - **Static requests:** Styles, scripts, images, fonts and precached paths are served cache-first. Only non-opaque 2xx responses are cached.
  - **Updates:** The `SKIP_WAITING` message activates a waiting worker.
  - **Verification at baseline:** Development pages never register the worker. The build checked only that the precache entries exist in `dist/`. No test ran the worker's event handlers.
- **Implemented improvement:** A focused test file was added that runs the real `service-worker.js` against in-memory stand-ins for the worker global scope, Cache Storage and `fetch`, and asserts the documented strategies.
- **Achieved quality value:** The worker's behaviour reaches returning visitors through their caches and is never exercised during development. A regression in the fallback chain, the cacheability rules or the cleanup, which previously would have been noticed only on the deployed site, now fails `npm test`.
- **Implemented scope:**
  - Tests only, using Node built-ins already available to the suite and no new dependency.
  - `service-worker.js` was not changed, so no `VERSION` change followed.
  - The update banner and the reload on `controllerchange` in `js/script.js` stayed outside the scope. That branch exists only in the production bundle, and testing it would require a source refactor.
- **Verification criteria:**
  - **Install:** The install event adds exactly the `STATIC_ASSETS` list to the current static cache.
  - **Activate:** Activation deletes the caches of an earlier version (for example `aurora-1.17_static`) and keeps both current caches.
  - **Non-GET requests:** A non-GET request is not intercepted.
  - **HTML online:** A successful HTML response is returned and cached, while a non-HTML or non-2xx response to an HTML request is returned but not cached.
  - **HTML offline:** When the network fails, an HTML request returns the cached copy if one exists, otherwise `offline.html`.
  - **Static requests:** A cached static request is answered without calling `fetch`. An opaque or non-2xx static response is not cached.
  - **Updates:** A `SKIP_WAITING` message calls `skipWaiting()`.
  - **Suite:** `npm test` passes.
- **Completion evidence:** `tests/service-worker.test.js` runs the production worker against in-memory Cache Storage and a mocked network, with a test group for each criterion above.
- **Impact:** High
- **Effort:** Medium

### IMP-QUALITY-03 — Protect initializer isolation and the reveal-ready contract

- **Status:** COMPLETED — implemented and verified.
- **Result:** Regression tests now protect initializer failure isolation and the reveal fail-safe contract.
- **Affected area:** Page initialization in `js/script.js` and the reveal animation gate, which together decide whether page content stays visible when part of the JavaScript fails.
- **Baseline evidence:** `js/script.js:16-55`; `js/features/reveal.js:1-39`; `css/modules/utilities.css:97-116`; manual verification of PH3-04 in `docs/archive/plans/PLAN-2026-09-28.md:109-113`.
- **Baseline (2026-10-01):**
  - **Initializer isolation:** `runInitializer` wraps each of the 15 initializers, reports a synchronous throw or an asynchronous rejection through `console.error("Błąd inicjalizacji: …")` and lets the others continue. On `gallery.html` it chains gallery rendering, gallery filters and reveal, and reveal still runs when the gallery fails.
  - **Reveal gate:** `.reveal` elements are hidden only under `html.reveal-ready`. `initReveal` adds that class only after every element is observed, reveals everything directly when `IntersectionObserver` is missing, and disconnects without adding the class when observation throws.
  - **Verification at baseline:** The PH3-04 contract had been verified with manual missing-bundle and injected-failure runs. No test imported `js/script.js` or `js/features/reveal.js`.
- **Implemented improvement:** Regression tests were added for this contract. They run the real `js/script.js` with mocked feature modules, one of which throws and one of which rejects, and run `initReveal` with a missing, a working and a failing `IntersectionObserver`.
- **Achieved quality value:** A regression of this contract risks site-wide hidden content rather than one broken feature, and it stays silent until a failure occurs — the case a test catches and a visual review does not. Such a regression now fails `npm test`.
- **Implemented scope:**
  - Tests were added in `tests/` using Vitest module mocks and global stubs. `js/script.js`, `reveal.js` and the CSS were not changed.
  - The production-only Service Worker branch of `js/script.js` stayed outside the scope. jsdom provides no `navigator.serviceWorker`, so that branch is skipped in the tests.
- **Verification criteria:**
  - **Isolation:** After `DOMContentLoaded`, with one initializer throwing synchronously and another rejecting, every other initializer is called and each failure is reported once with its name.
  - **Gallery page:** With `data-page="gallery"` and a rejecting gallery initializer, the gallery filters and reveal initializers still run, in that order.
  - **Missing observer:** Without `IntersectionObserver`, every `.reveal` element receives `is-visible` and `<html>` does not receive `reveal-ready`.
  - **Failing observer:** When `observe` throws, `reveal-ready` is not added and the observer is disconnected.
  - **Working observer:** When observation succeeds, `reveal-ready` is added.
  - **Suite:** `npm test` passes.
- **Completion evidence:** `tests/script-initializers.test.js` covers synchronous, asynchronous and simultaneous initializer failures and the gallery-page ordering; `tests/reveal.test.js` covers the missing, failing and working observer cases.
- **Impact:** High
- **Effort:** Small

### IMP-QUALITY-04 — Extend the tour catalogue check to the home page featured offers

- **Status:** COMPLETED — implemented and verified.
- **Result:** The tour catalogue check now protects the links, titles and numeric durations of the featured home page offers.
- **Affected area:** The three featured offer cards on `index.html` and `scripts/check-tour-catalogue.js` (`npm run check:tour-catalogue`, run by `npm run build`).
- **Baseline evidence:** `index.html:287-321`, `index.html:325-359`, `index.html:363-397` (card titles, durations in the card text, `tours.html#tokio`, `#malediwy`, `#nyc` links); `scripts/check-tour-catalogue.js:198-200`, `check-tour-catalogue.js:278-284`; `scripts/check-asset-integrity.js:55` (fragments are stripped, so link anchors are not validated); earlier home page drift corrected in `docs/archive/plans/PLAN-2026-09-28.md:47` and recorded in `docs/CHANGELOG.md` (Fixed: tour offers stating different names, durations and prices).
- **Baseline (2026-10-01):**
  - **What the check covered:** It compared the `tours.html` listing cards and the `contact.html` tour select with `assets/data/tours.json`.
  - **What it did not cover:** It named the listing cards' `id` attributes as anchors linked from `index.html`, but it did not read `index.html`.
  - **Home page cards:** These state the offer names and durations in their own text ("Dziewięciodniowy program…", "7 dni…", "5 dni…") and link to listing anchors.
  - **State and gaps at baseline:** The cards matched the catalogue (verified for the analysis). No check would have reported a renamed offer, a changed duration or a broken anchor on the home page. The home page Tokio duration had drifted before.
- **Implemented improvement:** The catalogue check now also verifies each featured home page card against the catalogue:
  - **Link:** The card's `tours.html#<anchor>` link must resolve to a listing card.
  - **Title:** The title must equal the catalogue name of the offer that card links to.
  - **Duration:** Any numeric "<N> dni" statement in the card text must equal the catalogue `days`.
- **Achieved quality value:** Every surface that restates catalogue facts is now checked by the build, and the gap on the surface with a recorded drift history is closed.
- **Implemented scope:**
  - `scripts/check-tour-catalogue.js` was extended, building on its existing parsing helpers.
  - A focused test was added that runs the script against pages written to a temporary directory, as `tests/asset-integrity.test.js` and `tests/csp.test.js` do for their checkers.
  - The check's description was updated in `README.md`, `docs/settings.md` and `docs/pipeline-notes.md`.
  - The page content, the set of featured offers and the listing and contact rules were left unchanged.
  - The spelled-out Tokio duration ("Dziewięciodniowy") cannot be compared numerically. It remains an explicitly documented limitation unless the owner decides to restate it.
- **Verification criteria:**
  - **Current repository:** `npm run check:tour-catalogue` passes on the current repository and names `index.html` in its success message.
  - **Failure cases:** In the test fixture, the check fails with a file and line reference in each of these cases:
    - a home card title differs from the catalogue name of its offer;
    - a numeric duration differs from the catalogue `days`;
    - a card links to an anchor that matches no listing card.
  - **Suite and build:** `npm test` and `npm run build` pass.
- **Completion evidence:** `check:tour-catalogue` now reads `index.html` and reports the number of featured offers it checked there. `tests/tour-catalogue.test.js` covers the three failure cases above and also fails a card without exactly one listing link, a home page without featured cards, and a card linked to a listing card that fails its own check. A further test confirms that the written-out duration is skipped while that card's title and anchor are still checked; the limitation is stated in all three documentation files.
- **Impact:** Medium
- **Effort:** Small

### IMP-QUALITY-05 — Treat catalogue text as text when building tour detail image markup

- **Status:** COMPLETED — implemented and verified.
- **Result:** The tour detail page now inserts catalogue image paths, alt texts, captions and thumbnail labels as literal DOM values, so they can no longer be interpreted as markup.
- **Affected area:** The image markup that `js/features/tour-detail.js` builds from `assets/data/tours.json` on `tour.html`.
- **Baseline evidence:** `js/features/tour-detail.js:44-53` (`innerHTML` assignment), `tour-detail.js:85-92` (`aria-label` interpolation), `tour-detail.js:94-135` (`alt`, `data-caption` and image paths interpolated into an HTML template); DOM-property construction of the same attributes in `js/features/gallery.js:42-87`; `scripts/check-asset-integrity.js:418-427` (image bases are checked for path characters, not for quotes or `<`); `tests/tour-detail.test.js:151-168` (sanitizer test covering only the summary and description); `assets/data/tours.json:152` (a caption containing an apostrophe).
- **Baseline (2026-10-01):**
  - **Descriptions:** The tour descriptions pass through an allow-list sanitizer.
  - **Image markup:** Image `alt` texts, captions, the derived button label and the image base were inserted into double-quoted attributes of an HTML string without escaping, and the string was then assigned to `innerHTML`.
  - **Gallery comparison:** The gallery builds the same attributes through DOM properties, so its catalogue text is never parsed as markup.
  - **Data at baseline:** The catalogue rendered correctly, because no value contained a double quote, `<` or `&`. One caption already contained an apostrophe, which was safe only because the attributes were double-quoted.
- **Implemented improvement:** The `alt`, caption, label and path values from the catalogue now reach the tour detail DOM as literal attribute values. Of the two options considered — escaping before interpolation, or setting the values through DOM properties as `gallery.js` does — the DOM-property approach was implemented, and a regression test with HTML-special characters was added.
- **Achieved quality value:** A routine catalogue edit, such as a quoted hotel name in an `alt` text, can no longer truncate attributes or inject markup into the tour page. The protection no longer depends on the Content-Security-Policy from `_headers`, which only the Netlify deployment applies and a local development server does not.
- **Implemented scope:**
  - `js/features/tour-detail.js` was changed and one test was added in `tests/tour-detail.test.js`.
  - Kept unchanged: the rendered structure, the classes, the `sizes` values, the description sanitizer and its allow-list, and the lightbox trigger contract. The existing tour detail, asset-integrity and typography tests were required to pass unchanged.
  - The change altered `dist/js/script.min.js`, so it went through the documented `VERSION` and `npm run record:sw-bundles` workflow.
- **Verification criteria:**
  - **Image attributes:** For a catalogue image whose `alt` and `caption` contain `"`, `<`, `>`, `&` and `'`, the rendered `img.alt` and `img.dataset.caption` equal the source strings.
  - **Button label:** The thumbnail button's `aria-label` equals `Otwórz zdjęcie: <alt>`.
  - **Picture structure:** No element or attribute appears in the picture or button beyond the current structure.
  - **Existing tests:** All existing tests pass without modification.
  - **Build:** `npm run build` passes after the cache version update.
- **Completion evidence:** `js/features/tour-detail.js` creates the picture, its sources, the image and the thumbnail button with `document.createElement` and inserts them with `replaceChildren`; `innerHTML` remains only for the sanitized descriptions. `tests/tour-detail.test.js` adds a test with HTML-special alt and caption values, and no existing test was modified. The Service Worker cache was advanced to `aurora-1.19`, with the new bundle hashes recorded in `service-worker-bundles.json`.
- **Impact:** Medium
- **Effort:** Small

## Selection summary

- **Selection criteria:**
  - Each item protected behaviour that already worked and was documented, but had been verified only manually or not at all.
  - The protected behaviours are focus management, offline delivery, failure isolation, catalogue consistency, and integrity at the boundary between data and markup.
  - The set favoured focused tests and one small source safeguard over new tooling, and introduced no dependency.
- **Quality areas:**
  - Accessibility regression protection (01).
  - Runtime resilience and offline behaviour (02, 03).
  - Content and data integrity (04, 05).
  - Security-relevant DOM insertion (05).
- **Scope and delivery:**
  - The five items had no dependencies on one another and were implemented as separate changes, in numbered order.
  - 01, 02 and 03 changed only `tests/`.
  - 04 changed a build script, its documentation and `tests/`, none of it shipped to `dist/`.
  - 05 was the only item that changed a shipped bundle, and therefore the only one that required a new Service Worker `VERSION`.
- **Considered but not selected:**
  - Tests for `scripts/check-sw-bundles.js` were considered. This release gate runs in every build and was verified scenario by scenario under PH2-03, so it ranked below the five selected items and stayed outside this programme.
- **Outcome:** All five selected items were completed within their bounded scopes and verified against their criteria.

## Original analysis limitations

These limitations apply to the original analysis of 2026-10-01 and the baseline evidence recorded above, not to the completed improvements. Each improvement was verified separately when it was implemented, as its **Status** records.

- **No tests run during the analysis:** `node_modules` was not installed in the analysed checkout and no dependency was installed. `npm test` and `npm run build` were therefore not run, and the pass state of the suite at that time was taken from the project documentation, not observed. The only command executed was `node scripts/check-tour-catalogue.js`, which passed.
- **No browser checks during the analysis:** No browser, device or assistive-technology checks were made. The baseline behaviour described for the lightbox, the navigation, the service worker and the initialization chain comes from source inspection.
- **Defect-class observations excluded:** Observations of that kind made during the analysis were left out of this report. They belong in an audit.
