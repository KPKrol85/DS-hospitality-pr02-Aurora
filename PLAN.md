# Aurora Travel — Development Plan

**Last reviewed:** 2026-09-22
**Project type:** Multi-page static website — hand-written HTML, modular CSS built with PostCSS, ES modules bundled with esbuild, service worker, static-hosting configuration (`_headers`)
**Plan status:** Active

## Planning principles

- The plan reflects the repository state verified on 2026-09-22. Every open item is traceable to current source evidence or to a finding in `daily-AUDIT.md` that was re-verified against the implementation.
- Canonical source ownership is `css/style.css` → `dist/css/style.min.css`, `js/script.js` → `dist/js/script.min.js`, `assets/img-src/` → `assets/img/`. Plan and implement against the canonical source; the maintained pages load `css/style.css` and `js/script.js` directly, and the minified bundles are untracked output generated only in `dist/`.
- Any change under `css/` or `js/` reaches production through `npm run build`, which regenerates `dist/`, and a raised `VERSION` in `service-worker.js` recorded with `npm run record:sw-bundles` for that change to reach returning visitors; since `PH2-03`, the build fails while a changed bundle is not recorded under a new `VERSION`.
- A main item is checked only when every required subtask is complete and its completion condition holds.
- Completed significant changes are recorded in `docs/CHANGELOG.md`. Pending work stays in this file only.

## Verified baseline

- All four repository verification scripts pass against the current tree: `scripts/verify-built-css.js`, `scripts/verify-built-js.js`, `scripts/check-css-assets.js` and `scripts/check-asset-integrity.js` (12 HTML files scanned).
- The working tree is clean and no runtime blockers were identified.
- Canonical-versus-generated ownership, defensive module initialization, the token-based theme and reduced-motion contract, and page metadata consistency across all 12 pages were confirmed in `daily-AUDIT.md` and require no plan work.

## Current priorities

1. `PH1-01` — Correct the phone field validation escaping that blocks contact form submission.
2. `PH1-02` — Establish one canonical tour catalogue source.
3. `PH2-01` — Align the unmatched-path routing contract with the maintained 404 page.
4. `PH2-02` — Exclude the raster source tree from the distribution package.

## Phase 1 — Public content and conversion integrity

**Goal:** Make the contact form accept the input it demonstrates, and make every offer surface state the same catalogue facts.

- [x] **PH1-01 — Correct phone field validation escaping** — **Priority:** High
  - [x] fix the `pattern` attribute in `contact.html:278`, where `^[0-9+\\-\\s]{7,}$` resolves to a class of digits, `+`, a literal backslash and the letter `s`, so that it matches the documented rule (digits, `+`, spaces, hyphens)
  - [x] fix the strip expression `/[\\s-]/g` in `js/features/form.js:100` so the minimum-length check ignores spaces and hyphens instead of backslashes and the letter `s`
  - [x] keep the `pattern`, the `title` attribute and the JS error message describing one identical rule
  - [x] rebuild the production bundle with `npm run build:js`
  - **Completion condition:** the field's own placeholder `+48 600 900 700` and the form `600-900-700` both submit, a six-character value is still rejected, and the behaviour is the same with and without JavaScript
  - **Source:** `daily-AUDIT.md` — P1-01

- [x] **PH1-02 — Establish one canonical tour catalogue source** — **Priority:** High
  - [x] confirm `assets/data/tours.json` as the canonical catalogue; it is the only machine-readable definition and already drives `tour.html` through `js/features/tour-detail.js`
  - [x] resolve the current contradictions before fixing the source: `islandia` (`Islandia Fjord Moments` 9 dni / 19 000 on the listing versus `Islandia Arctic Wonders` 7 dni / 13 000 in the data), `malediwy` (32 000 versus 18 000), `patagonia` (14 dni / 28 000 versus 10 dni / 19 500), `tokio-kyoto` (12 dni versus 9 dni)
  - [x] derive the `tours.html` listing cards — `data-days`, `data-price`, title, duration and price text — from the canonical source, or keep them hand-written and add a repository check that fails on drift
  - [x] extend the required "Wybrana wycieczka" select in `contact.html:286` to all six offers and align its option values with the catalogue ids (`maroko`, `nowy-jork`, `islandia`, `patagonia`, `tokio-kyoto`, `malediwy`)
  - [x] correct the duration claim in the Tokio card copy in `index.html:317` ("Dwutygodniowy program")
  - [x] add one check that fails when offer name, duration, price or the offer set differ between `assets/data/tours.json`, the listing cards and the contact select, and run it from `npm run build`
  - **Completion condition:** every surface states the same name, duration and price per offer, all six offers are selectable in the contact form, and the drift check runs in the build
  - **Source:** `daily-AUDIT.md` — P1-02

## Phase 2 — Deployment and delivery contracts

**Goal:** Make what is deployed, and what returning visitors receive, match what the repository declares.

- [x] **PH2-01 — Align unmatched-path routing with the maintained 404 page** — **Priority:** High
  - [x] decide which contract holds: the catch-all `/* /index.html 200` in `_redirects`, or the maintained `404.html` with its `noindex,follow` directive; the site is multi-page and static with no client-side router, so the rewrite currently serves no routing purpose — **decided:** `404.html` holds
  - [x] if `404.html` holds, remove the catch-all rule so unmatched paths fall through to it with a 404 status — `_redirects` removed, since the catch-all was its only rule
  - **Not applicable:** removing `404.html` and retaining the catch-all rewrite was rejected because the `404.html` contract was selected
  - [x] update the deployment and SEO sections of `README.md` to state the contract that actually holds
  - **Completion condition:** exactly one unmatched-path contract exists in the repository and the documentation describes it
  - **Verification:** static inspection of `_redirects`, `404.html` and the affected README sections; runtime behaviour on the host cannot be verified from the repository
  - **Source:** `daily-AUDIT.md` — P1-03

- [x] **PH2-02 — Exclude the raster source tree from the distribution package** — **Priority:** High
  - [x] exclude `assets/img-src/` from the recursive `assets/` copy in `scripts/build-dist.js:105`; it is the build-input tree for `scripts/build-images.js`, and no HTML, CSS, JS, JSON or manifest file references it
  - [x] keep every referenced production asset under `assets/img/`, `assets/data/` and `assets/fonts/` in the package
  - [x] update the dist contents list in `docs/pipeline-notes.md` to state the exclusion
  - **Completion condition:** `npm run dist` produces a `dist/` tree without `assets/img-src/`, and `node scripts/check-asset-integrity.js` still passes
  - **Verification:** `npm run dist` passed with `check:assets` and `check:assets:dist`; `dist/assets/` matches `assets/` without `img-src/` file for file, and `dist/` is 75 MB instead of about 174 MB
  - **Source:** `daily-AUDIT.md` — P1-04

- [x] **PH2-03 — Tie service worker cache invalidation to the built bundles** — **Priority:** Medium
  - [x] make a bundle change detectable: fail the build when `dist/css/style.min.css` or `dist/js/script.min.js` changed and `VERSION` in `service-worker.js:1` did not — both bundles are untracked build output, so a change must be detected against a recorded reference rather than Git history — or revalidate the two precached bundles at runtime instead of serving them cache-first under fixed filenames — **decided:** build-time detection; the tracked record `service-worker-bundles.json` pairs `VERSION` with the SHA-256 of both generated bundles, and the caching strategies are unchanged
  - [x] implement the rule in `scripts/check-css-assets.js` or a dedicated script, and run it from `npm run build` — dedicated `scripts/check-sw-bundles.js`, run as `check:sw-bundles` at the end of `npm run build`; `npm run record:sw-bundles` writes the record only under a `VERSION` that advances the recorded one
  - [x] establish the approved baseline: `VERSION` raised from `aurora-1.5` to `aurora-1.6` and both bundle hashes recorded for it
  - **Completion condition:** a CSS or JS rebuild cannot ship without invalidating the cached bundle for returning visitors
  - **Verification:** the check fails on a rebuilt bundle with an unchanged `VERSION` and passes once the version advances — an unchanged rebuild passed; a changed CSS bundle and a changed JS bundle under `aurora-1.6` failed, and `record:sw-bundles` refused to record them under the same version; a raised `VERSION` without a new record failed; `aurora-1.7` recorded through `record:sw-bundles` passed; the temporary changes were reverted and the final `npm run build` passed under `aurora-1.6`
  - **Source:** `daily-AUDIT.md` — P2-05

## Phase 3 — Interaction quality and no-JavaScript resilience

**Goal:** Make interactive behaviour match what is on screen, and make the served markup correct when the bundle does not run.

- [x] **PH3-01 — Restrict lightbox navigation to visible gallery items** — **Priority:** Medium
  - [x] exclude figures hidden by the active gallery filter from `collectImages()` in `js/features/lightbox.js`
  - [x] keep the current image valid when the visible set changes
  - **Completion condition:** with a destination filter applied, the previous/next controls, arrow keys and swipe gestures stay within the filtered set
  - **Verification:** filtered navigation, wraparound and tour gallery passed browser checks; `npm run build` passed under `aurora-1.7`
  - **Source:** `daily-AUDIT.md` — P2-01

- [x] **PH3-02 — Expose gallery and tour thumbnails as real controls** — **Priority:** Medium
  - [x] replace focusable images with native buttons carrying descriptive Polish accessible names
  - [x] preserve lightbox activation through click, Enter and Space
  - [x] preserve responsive `picture` sources, `sizes` and lazy loading
  - [x] add visible focus styling to the canonical stylesheet
  - **Completion condition:** each thumbnail is announced as a control with an action-oriented name and opens the lightbox through mouse and keyboard activation
  - **Verification:** accessibility, activation, focus restoration and responsive layout passed browser checks; `npm run build` passed under `aurora-1.8`
  - **Source:** `daily-AUDIT.md` — P2-02

- [x] **PH3-03 — Make the served markup correct without JavaScript** — **Priority:** Medium
  - [x] correct the static results counter in `tours.html` to six offers
  - [x] let CSS keep the mobile navigation collapsed below 900px
  - [x] limit `js/features/nav.js` to available interaction states and expose the toggle only after initialization
  - **Completion condition:** without JavaScript, the tours page shows a correct count and the mobile drawer does not cover the content
  - **Verification:** no-JS, missing-bundle and responsive navigation checks passed; `npm run build` passed under `aurora-1.9`
  - **Source:** `daily-AUDIT.md` — P2-03

- [x] **PH3-04 — Decouple reveal visibility from the single initialization chain** — **Priority:** Medium
  - [x] activate reveal visibility rules only after successful initialization through `reveal-ready`
  - [x] isolate synchronous and asynchronous initializers in `js/script.js`
  - **Completion condition:** a failed initializer or missing JavaScript bundle leaves page content visible
  - **Verification:** missing-bundle, injected-failure and animation regression checks passed; `npm run build` passed under `aurora-1.10`
  - **Source:** `daily-AUDIT.md` — P2-04

## Phase 4 — Runtime UI consistency and dead code removal

**Goal:** Bring the only self-generated runtime UI into the site's language and design system, and remove code that implies capabilities the project does not have.

- [x] **PH4-01 — Bring the service worker update banner into the site language and design system** — **Priority:** Low
  - [x] translate the banner text, both button labels and the `aria-label` in `js/script.js:56` and `js/script.js:59` into Polish, matching the `lang="pl"` documents they appear in
  - [x] replace the inline `cssText` literals (`#1f2937`, `#fff`, `#111827`) with rules in the canonical stylesheet, using the existing design tokens and light/dark theme variables
  - [x] place the banner inside the layering scale used by the rest of the interface instead of the inline `z-index:9999`
  - **Completion condition:** the banner reads in Polish and renders correctly in both themes with no inline colour literals
  - **Depends on:** `PH4-02` for the layering-token decision
  - **Verification:** Polish copy, themes, responsive layout, keyboard, layering and SW update flow passed browser checks; `npm run build` passed under `aurora-1.11`
  - **Source:** `daily-AUDIT.md` — P2-06

- [ ] **PH4-02 — Remove or complete the unreachable code paths** — **Priority:** Low
  - [ ] remove the empty `initFiltersDropdowns()` export in `js/features/tours-filters.js:53` together with its import and call in `js/script.js:21`
  - [ ] either link the six "Zapytaj o ofertę" buttons in `tours.html` with `?tour=<catalogue id>` so `prefillFromQuery` has a caller, or remove `prefillFromQuery` from `js/features/form.js:147` — **Depends on:** `PH1-02` for option values that match the catalogue ids
  - [ ] remove the `.form__success` element in `contact.html:328` and its rule in `css/modules/components.css:440`, or give it a code path, given that submission navigates to `dziekuje.html`
  - [ ] remove the unreachable `[data-theme="auto"]` block in `css/modules/tokens.css:112`, or implement an auto theme in `js/features/theme.js` and the inline head bootstrap, which currently set only `light` or `dark`
  - [ ] either apply `--z-header`, `--z-overlay` and `--z-modal` to the real stacking contexts, which currently use raw values (20, 90, 850, 900, 1000, 1200), or remove the unused tokens
  - [ ] rebuild the production bundles so the removals reach the shipped `dist/css/style.min.css` and `dist/js/script.min.js`
  - **Completion condition:** no exported function, markup element, CSS block or token remains that implies behaviour the project does not implement, and the four verification scripts still pass
  - **Source:** `daily-AUDIT.md` — P2-07

## Phase 5 — Documentation contracts

**Goal:** Make the canonical README describe the repository as it is currently laid out.

- [ ] **PH5-01 — Correct the documentation links and project structure in `README.md`** — **Priority:** Low
  - [ ] update the `settings.md` and `pipeline-notes.md` links in both the PL and EN sections (`README.md:153`, `README.md:250`, `README.md:411`, `README.md:508`) to `docs/settings.md` and `docs/pipeline-notes.md`, which is where the files now live
  - [ ] update both project structure trees so `docs/` lists `CHANGELOG.md`, `settings.md` and `pipeline-notes.md`, and the two files no longer appear at the project root
  - [ ] list the root-level documentation files the repository actually tracks, or state explicitly that the tree is abridged
  - **Completion condition:** every relative documentation link in `README.md` resolves to an existing file, and both structure trees match the repository layout

## Optional future improvements

- [ ] **O-01 — Add automated coverage for the data-driven views**
  - **Value:** `package.json` defines `test` as a placeholder that exits 1, and the filtering, sorting, tour rendering and form validation logic in `js/features/` has no automated coverage. Both Phase 1 defects are the class a small unit or DOM-level suite catches, and `assets/data/tours.json` and `assets/data/gallery-data.json` provide ready fixtures.
  - **Scope boundary:** non-blocking; the four repository verification scripts already pass and cover repository-level integrity.

- [ ] **O-02 — Extend asset integrity checking to runtime-generated paths**
  - **Value:** `scripts/check-asset-integrity.js` scans HTML tags, `srcset` candidates, JSON-LD, social images and the manifest. The image paths built in `js/features/gallery.js:79` and `js/features/tour-detail.js`, and the `url()` references in `css/modules/fonts.css`, fall outside it; they resolve today, but a renamed directory would not be reported.
  - **Scope boundary:** non-blocking; broadens existing tooling and changes no runtime behaviour.

- [ ] **O-03 — Pin the theme bootstrap with a CSP hash**
  - **Value:** `_headers` sets `script-src 'self' 'unsafe-inline'`, and the only inline script in the project is the theme bootstrap repeated in each page head. A hash would remove the blanket allowance while keeping the flash-of-wrong-theme prevention intact.
  - **Scope boundary:** non-blocking; the current header set is a deliberate, functioning baseline and no injection path was identified.

- [ ] **O-04 — Preload the self-hosted variable fonts**
  - **Value:** the two `woff2` variable fonts declared in `css/modules/fonts.css` with `font-display: swap` are discovered only after the stylesheet parses, and no page contains a `rel="preload"` link.
  - **Scope boundary:** non-blocking; stated as a loading-order property, not a measured improvement.
