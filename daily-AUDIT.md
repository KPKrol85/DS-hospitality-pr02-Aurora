# Daily Front-End Audit — Aurora

**Audit date:** 2026-09-22
**Project type:** Multi-page static website (hand-written HTML, modular CSS built with PostCSS, ES modules bundled with esbuild, service worker, Netlify static hosting configuration)
**Audit mode:** Static repository review

## Overall assessment

The implementation is coherent and the architecture is stable. Source-of-truth ownership is clearly defined (`css/style.css` → `css/style.min.css`, `js/script.js` → `js/script.min.js`, `assets/img-src/` → `assets/img/`), the repository ships its own verification scripts, and all four of them pass against the current tree. Module initialization is defensive throughout, metadata is internally consistent across all twelve pages, and every asset reference in HTML, JSON data and the web manifest resolves.

The unresolved risk is concentrated in two areas: public content integrity and the deployment contract. The tour catalogue exists in three places that already contradict each other on price, duration and name, and the contact form's phone validation rejects the exact format its own placeholder demonstrates, which blocks submission on the primary conversion path. The `_redirects` catch-all makes the project's own `404.html` unreachable, and `dist/` currently carries the entire 100 MB raster source tree.

No runtime blockers were found. The project is ready for normal continued development once the P1 items are addressed.

## Verified strengths

- Indexing metadata is consistent across the whole site: `index,follow` plus a canonical URL on the eight pages listed in `sitemap.xml`, and `noindex,follow` with no canonical on `404.html`, `offline.html`, `dziekuje.html` and `tour.html`. No contradiction was found between `sitemap.xml`, `robots.txt` and the per-page directives.
- Repository-owned integrity tooling is real and currently green: `scripts/check-asset-integrity.js` (HTML references, `srcset` candidates, JSON-LD and social-image URLs, manifest entries), `scripts/check-css-assets.js`, `scripts/verify-built-css.js` and `scripts/verify-built-js.js` all pass.
- Every image path generated at runtime resolves. All 36 entries in `assets/data/gallery-data.json` and all 36 images across the 6 tours in `assets/data/tours.json` have complete `avif`/`webp`/`jpg` sets at all four widths under `assets/img/tours/`.
- Gallery filter controls and data are fully aligned: the six `data-gallery-filter` values in `gallery.html:183` match the six `country` values in `assets/data/gallery-data.json` exactly, with no orphan on either side.
- Module initialization is defensive. Every feature in `js/features/` early-returns when its DOM hooks are absent, and every `localStorage` access is wrapped in `try/catch` (`js/features/theme.js:9`, `js/features/project-notice.js:10`).
- Tabs and accordion use native buttons with correct ARIA wiring and JS state synchronization: `role="tablist"`/`tab`/`tabpanel`, `aria-controls`, `aria-labelledby`, roving `tabindex` and `aria-selected` kept in sync (`index.html:411`, `js/features/tabs.js:31`, `about.html:299`).
- The service worker separates static and HTML caches under one version prefix, deletes non-current caches on activate, uses network-first for HTML with an `offline.html` fallback, and validates status and content type before caching (`service-worker.js:14`, `service-worker.js:61`, `service-worker.js:73`).
- CSS is token-driven with a light/dark theme contract, a global `:focus-visible` ring, and a `prefers-reduced-motion` block that neutralizes animations, transitions and reveal transforms (`css/modules/base.css:67`).
- The demonstration character of the site is disclosed on every page through the `data-project-notice` section, and the disclosure is readable without JavaScript.

## P0 — Critical risks

None detected.

## P1 — Important issues worth fixing next

### [P1-01] Phone validation rejects the format the field itself demonstrates

- **Classification:** Defect
- **Evidence:** `contact.html:278`, `js/features/form.js:100`
- **Current behavior:** The `pattern` attribute is written as `^[0-9+\\-\\s]{7,}$`. The doubled backslashes make the character class resolve to digits, `+`, a literal backslash and the letter `s` — space and hyphen are not in it. Compiled and tested against the attribute value as stored in the file, `"+48 600 900 700"` (the field's own `placeholder`) and `"600-900-700"` both fail, while `"600900700"` passes. The same double-escaping appears in the JS length check, where `/[\\s-]/g` strips backslashes, `s` and hyphens but not whitespace. With JavaScript enabled, `validateField` reads `field.validity.patternMismatch` and calls `event.preventDefault()`, so submission is blocked; with JavaScript disabled the native `pattern` blocks it as well, because `novalidate` is only added by `initForm`.
- **Impact:** The phone field is optional, but any visitor who fills it in the demonstrated international format cannot submit the contact form — the site's only lead-capture path. The error that is shown, "min. 7 znaków, mogą być spacje i myślniki", contradicts the rule that rejected the input, leaving no way for the user to work out what is wrong.
- **Recommended direction:** Correct the escaping in both the `pattern` attribute and the strip expression so the character class matches the documented rule (digits, `+`, spaces, hyphens), and keep the attribute, the `title`, and the JS error message describing the same rule.

### [P1-02] Tour catalogue is duplicated across three sources that already contradict each other

- **Classification:** Contract mismatch
- **Evidence:** `tours.html:274` / `tours.html:311` vs `assets/data/tours.json:213`; `contact.html:286`
- **Current behavior:** The same offers are defined independently in the hard-coded cards in `tours.html`, in `assets/data/tours.json` (which `js/features/tour-detail.js` renders on `tour.html`), and in the required "Wybrana wycieczka" select in `contact.html`. Four of the six offers already disagree: Malediwy shows "Od 32 000 PLN / os." on the listing and "od 18 000 PLN / os." on the detail page; Patagonia shows 14 dni / 28 000 versus 10 days / 19 500; Tokio shows 12 dni versus 9 days (and "Dwutygodniowy program" in `index.html:317`); Islandia shows "Islandia Fjord Moments" 9 dni / 19 000 versus "Islandia Arctic Wonders" 7 days / 13 000. The contact select lists only four of the six offers — Maroko and Islandia are absent — and its option values (`tokio`, `nyc`) match neither the `tours.json` ids (`tokio-kyoto`, `nowy-jork`) nor the card ids.
- **Impact:** A visitor who opens an offer from the listing and then its detail page is shown a different price, duration or name for the same product. Two of the six advertised offers cannot be selected in a required form field, so those enquiries have to be filed as "Inna / indywidualna". Every future catalogue edit has to be repeated in three places, and the current state shows that this has already failed.
- **Recommended direction:** Make `assets/data/tours.json` the single catalogue source and derive the listing cards and the contact select from it, or — if the cards must stay hand-written — add a repository check that fails when name, duration, price or offer set drift between the three.

### [P1-03] Catch-all rewrite makes the project's own 404 page unreachable

- **Classification:** Contract mismatch
- **Evidence:** `_redirects:1`, `404.html`
- **Current behavior:** `_redirects` contains the single rule `/* /index.html 200`. The rule is intentional and documented (`README.md:183`, `docs/CHANGELOG.md`), but the repository also maintains a full `404.html` with its own hero, copy and `noindex,follow` directive, and `README.md:208` documents that page as part of the metadata contract. Because the rewrite returns the homepage with HTTP 200 for every path that has no matching file, no request can reach `404.html`. This is a multi-page static site with no client-side router, so the rewrite serves no routing purpose.
- **Impact:** Mistyped or stale URLs render the homepage instead of the error page that was built for them, and they answer 200, so crawlers treat arbitrary URLs on an indexable domain as valid duplicate homepage content. The maintained `404.html` is dead weight that looks live.
- **Recommended direction:** Decide which contract holds. Either drop the catch-all so unmatched paths fall through to `404.html` with a 404 status, or remove `404.html` and the documentation that presents it as active. Runtime behaviour on the host was not verified in this audit.

### [P1-04] Distribution build ships the 100 MB raster source tree

- **Classification:** Contract mismatch
- **Evidence:** `scripts/build-dist.js:63`, `settings.md`, `assets/img-src/`
- **Current behavior:** `build-dist.js` copies `assets/` recursively into `dist/`. That directory contains `assets/img-src/` — 184 files, 100 MB — which `settings.md` and `README.md:324` both define as the build-input source tree consumed by `scripts/build-images.js`, not as deployable output. No HTML, CSS, JS, JSON or manifest file in the project references `assets/img-src/`; a repository-wide search returns only the image pipeline scripts. Production images live in `assets/img/` (74 MB).
- **Impact:** `dist/` is roughly 174 MB instead of roughly 74 MB, so every deployment carries more than twice the necessary payload, and full-resolution unoptimized source photographs (individual files up to 2.5 MB) become publicly fetchable on the deployed origin.
- **Recommended direction:** Exclude `assets/img-src/` from the directory copy in the packaging step so `dist/` contains only the production asset tree the site actually references.

## P2 — Minor refinements

### [P2-01] Lightbox navigation ignores the active gallery filter

- **Classification:** Defect
- **Evidence:** `js/features/lightbox.js:21`, `js/features/gallery-filters.js:23`
- **Current behavior:** `collectImages()` selects every `[data-gallery] img[data-lightbox-src]` in the document. Filtering hides figures by adding `.is-hidden`, which resolves to `display: none` (`css/modules/subpages.css:302`), but `querySelectorAll` still returns those elements. The previous/next controls, the arrow keys and the swipe gestures therefore cycle through all 36 gallery images regardless of the filter in effect.
- **Impact:** A visitor who filters the gallery to one destination and opens an image is carried into photographs from destinations they filtered out, with a caption that contradicts the active filter button state.
- **Recommended direction:** Have `collectImages()` restrict the set to currently visible figures so the lightbox sequence matches what is on screen.

### [P2-02] Gallery and tour images are keyboard-focusable but not exposed as controls

- **Classification:** Defect
- **Evidence:** `js/features/gallery.js:74`, `js/features/tour-detail.js:110`
- **Current behavior:** Both renderers give each `<img>` `tabindex="0"` and a `cursor: pointer` style, and `js/features/lightbox.js:98` opens the lightbox on Enter or Space. The element keeps its implicit image role and carries no accessible name beyond the photo's `alt` text, no `role`, and no indication that activating it does anything.
- **Impact:** Screen reader and keyboard users reach 36 focus stops on the gallery page that are announced as plain images, with no signal that they are activatable or what activating them does.
- **Recommended direction:** Wrap each thumbnail in a native `button` (or give the focusable element a button role and an accessible name that states the action) so the control is announced as one.

### [P2-03] Static markup ships JavaScript-dependent states with no non-JS fallback

- **Classification:** Defect
- **Evidence:** `tours.html:217`, `css/modules/layout.css:124`
- **Current behavior:** The results counter is hard-coded to `0` in the markup and corrected only by `initToursFilters` on `DOMContentLoaded`, so the served HTML states "Dopasowane oferty: 0" while six offer cards are present below it. Separately, `.nav` is styled as a fixed drawer panel with a background and shadow and is hidden only by the `hidden` attribute that `js/features/nav.js:13` sets; no CSS rule hides it below the 900px breakpoint. Without the bundle, the mobile drawer stays permanently open over the page content while `.nav__toggle` remains visible, keeps `aria-expanded="false"`, and does nothing. No `<noscript>` element exists anywhere in the project.
- **Impact:** With JavaScript unavailable, the tours page contradicts its own content and the mobile layout presents a permanently open overlay driven by a control that reports a state it cannot change.
- **Recommended direction:** Ship the counter's true static value (or omit the number until JS sets it), and let CSS own the collapsed state of the mobile drawer so the `hidden` attribute only reflects an interaction that is actually available.

### [P2-04] All revealed content depends on one unguarded initialization chain

- **Classification:** Source-visible risk
- **Evidence:** `css/modules/utilities.css:76`, `js/script.js:16`
- **Current behavior:** The inline head script adds the `js` class unconditionally, and `html.js .reveal { opacity: 0; transform: translateY(40px) }` then hides every `.reveal` element until `initReveal` adds `is-visible`. `initReveal` is the tenth call in a single unguarded `DOMContentLoaded` handler, after nine other initializers. A throw in any of them, or a failure to load `js/script.min.js` at all, leaves the class applied and `is-visible` never added.
- **Impact:** A single JavaScript failure hides nearly all page content site-wide rather than degrading one feature; only elements pre-marked `reveal is-visible`, such as the home hero, would remain.
- **Recommended direction:** Isolate the initializers from each other, or tie the hidden state to reveal initialization actually having started rather than to the presence of JavaScript.

### [P2-05] Cached CSS and JS can only be invalidated by a manual version bump

- **Classification:** Source-visible risk
- **Evidence:** `service-worker.js:1`, `service-worker.js:8`, `service-worker.js:55`
- **Current behavior:** `VERSION` is the hand-maintained constant `"aurora-1.3"` and both cache names derive from it. `css/style.min.css` and `js/script.min.js` are precached under fixed, unhashed filenames and served cache-first with no revalidation. Rebuilding either file without editing `service-worker.js` leaves the worker byte-identical, so no `updatefound` event fires and returning visitors keep the previously cached bundle indefinitely. `scripts/check-css-assets.js` verifies that the precache list names the production paths but does not check that the version advanced.
- **Impact:** A CSS or JS fix can ship to the host and never reach existing visitors, and the mismatch is silent because the update banner only appears when the worker file itself changes.
- **Recommended direction:** Tie cache invalidation to the built assets — for example by failing the build when the production bundles changed and `VERSION` did not, or by adding a revalidation step for the two precached bundles.

### [P2-06] Service worker update banner is English-only and bypasses the theme

- **Classification:** Defect
- **Evidence:** `js/script.js:56`, `js/script.js:59`
- **Current behavior:** The banner injected into these `lang="pl"` pages reads "New version available." with "Refresh" and "Dismiss" buttons and an English `aria-label`. It is positioned and coloured entirely through an inline `cssText` string with literal hex values (`#1f2937`, `#fff`, `#111827`) and `z-index:9999`, so it uses neither the design tokens nor the light/dark theme, and it sits above every layer defined in CSS.
- **Impact:** The only runtime UI the site generates itself is in the wrong language for its audience, is announced in English by assistive technology inside a Polish document, and renders with fixed dark-grey chrome in both themes.
- **Recommended direction:** Move the banner's copy into Polish alongside the rest of the interface and style it from the existing stylesheet and tokens instead of inline literals.

### [P2-07] Dead code paths and unreachable rules remain in the shipped output

- **Classification:** Maintenance risk
- **Evidence:** `js/features/tours-filters.js:53`, `js/features/form.js:147`, `contact.html:328`, `css/modules/tokens.css:112`
- **Current behavior:** `initFiltersDropdowns()` is an empty exported function that `js/script.js:21` still imports and calls. `prefillFromQuery` reads a `?tour=` parameter that nothing links to — the six "Zapytaj o ofertę" buttons in `tours.html` all point at bare `contact.html`. The `.form__success` message is only ever set to `hidden = true` by `js/features/form.js:49` and has no code path that shows it, since submission navigates to `dziekuje.html`. The `[data-theme="auto"]` block is unreachable because both the inline bootstrap and `js/features/theme.js:2` only ever set `light` or `dark`, and it is present in the built `css/style.min.css`. The layering tokens `--z-header`, `--z-overlay` and `--z-modal` are defined and never used; every layer instead uses a raw value (20, 90, 850, 900, 1000, 1200, and 9999 inline in JS).
- **Impact:** The code suggests capabilities that do not exist — a per-offer prefill, an in-page success state, an auto theme, a token-governed layering scale — which misleads the next change to those areas and keeps unreachable rules in the production stylesheet.
- **Recommended direction:** Remove the unreachable function, markup and CSS block, or complete the behaviour they imply; and either use the layering tokens for the real stacking contexts or drop them.

## Extra quality improvements

### Automated test coverage for the data-driven views

- **Evidence:** `package.json` defines `test` as a placeholder that exits 1, and the only executable checks are the four static verification scripts. The filtering, sorting, tour rendering and form validation logic in `js/features/` has no automated coverage.
- **Potential value:** The two P1 content findings (catalogue drift, phone pattern) are exactly the class of defect a small unit or DOM-level test suite catches before release, and the data files provide ready-made fixtures.
- **Scope boundary:** Optional. The project already has meaningful repository-level verification, and this is an addition to it rather than a correction of anything currently broken.

### Extend asset integrity checking to runtime-generated paths

- **Evidence:** `scripts/check-asset-integrity.js` scans HTML tags, JSON-LD, social images and the manifest. The image paths built in `js/features/gallery.js:79` and `js/features/tour-detail.js:76`, and the `url()` references in `css/modules/fonts.css`, fall outside it.
- **Potential value:** Those paths currently all resolve, as verified in this audit, but nothing in the build would report it if a renamed directory broke them; the check would then cover the full asset surface rather than the static half.
- **Scope boundary:** Optional. It broadens existing tooling and changes no runtime behaviour.

### Replace `script-src 'unsafe-inline'` with a hash for the theme bootstrap

- **Evidence:** `_headers` sets `script-src 'self' 'unsafe-inline'`. The only inline script in the project is the theme bootstrap repeated in each page head; the JSON-LD blocks are not affected by `script-src`.
- **Potential value:** Pinning that one script by hash would remove the blanket allowance for inline script execution while keeping the flash-of-wrong-theme prevention intact.
- **Scope boundary:** Optional. The current header set is already a deliberate, functioning security baseline, and no injection path was found in this audit.

### Preload the self-hosted variable fonts

- **Evidence:** `css/modules/fonts.css` declares two self-hosted `woff2` variable fonts with `font-display: swap`, and no page contains a `rel="preload"` link.
- **Potential value:** The fonts are only discovered after the stylesheet parses, so preloading them would shorten the swap window on first visit.
- **Scope boundary:** Optional. No measurement was taken in this audit, so the benefit is stated as a loading-order property, not as a quantified improvement.

## Verification performed

- Inspected repository structure, `package.json`, `settings.md`, `pipeline-notes.md`, `README.md`, `docs/CHANGELOG.md`, `.gitignore`, `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `postcss.config.js` and `service-worker.js`.
- Inspected all 12 root HTML pages, all 8 CSS modules, `js/script.js`, all 14 modules in `js/features/`, both JSON data files, and all 8 scripts in `scripts/`.
- Ran the repository's own read-only checks, all of which passed: `node scripts/check-asset-integrity.js` (12 HTML files scanned), `node scripts/check-css-assets.js`, `node scripts/verify-built-css.js`, `node scripts/verify-built-js.js`.
- Cross-checked, with read-only Node scripts run outside the repository: every image path generated from `assets/data/gallery-data.json` and `assets/data/tours.json` against the files in `assets/img/tours/` (0 missing); gallery filter values against data `country` values; tours listing card attributes and visible text against `tours.json` and the `contact.html` select; `sitemap.xml` entries against per-page `robots` and canonical tags.
- Compiled the `contact.html` `pattern` attribute and the `js/features/form.js` strip expression directly from the repository text and tested them against representative phone inputs, including the field's own placeholder value.
- Spot-checked that the tracked production bundles are in sync with source: `js/script.min.js` contains the current feature set including `project-notice`, and `css/style.min.css` contains the current selectors from every CSS module.
- Ran `git status` and `git log` read-only. The working tree is clean.
- Not run: `npm run build`, `npm run dist` and `npm run build:images`, because they overwrite tracked output; `npm test`, which is a placeholder that exits 1; any dependency installation.
- Runtime and external verification limitations: no browser, no device or assistive-technology testing, and no request was made to the deployed origin. Findings about no-JavaScript rendering, the `_redirects` behaviour on the host, Netlify form processing, and service worker cache behaviour are derived from source and configuration only, and are labelled accordingly.

## Senior rating

**Rating:** 7/10

The engineering foundation is above average for a static multi-page site: clear canonical-versus-generated ownership, verification scripts that are real and currently green, defensive module initialization, a coherent token-based CSS system with working theme and reduced-motion handling, a correctly scoped service worker, and metadata that holds together across every page. Nothing is structurally broken and the architecture supports continued work without rework.

The rating is held back by defects that reach the user rather than by architectural shortcomings: an escaping bug that blocks the only conversion path for a realistic input, a catalogue duplicated three ways that already publishes contradictory prices and durations, a hosting rule that silently disables the project's own error page, and a deployment payload carrying the entire build-input tree. These are all contained and individually small to correct, but they are current, evidenced, and visible in production behaviour.
