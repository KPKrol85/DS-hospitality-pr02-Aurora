# Aurora — Final Technical Front-End Audit

**Audit date:** 2026-10-31
**Project type:** Static multi-page website (12 Polish-language pages for the fictional travel brand Aurora Travel, presented as a KP_Code Digital Studio demonstration project) with vanilla ES modules, modular CSS, a Service Worker, a Node-based build and validation toolchain, a Vitest/jsdom regression suite and a manual Netlify-oriented deployment of `dist/`
**Audit mode:** Final repository and implementation review
**Current readiness:** Blocked

## 1. Executive assessment

Aurora is a coherent, well-engineered static site. Canonical sources, the generated `dist/` package and the approval records (`_headers`, `service-worker-bundles.json`) have explicit owners, and they are enforced by build guards, project-specific checks and a 303-test regression suite. Runtime quality is good. In headless Chromium, all 12 production pages loaded under the enforced Content-Security-Policy with no console errors, exceptions or failed same-origin requests, and no page overflowed horizontally at 375 px or 768 px.

One release blocker exists. The committed `service-worker-bundles.json` does not match the CSS bundle that the committed sources produce with the lockfile-pinned toolchain. As a result, `npm run build`, and therefore the documented `npm run predeploy:check` deployment gate, fails on the current revision. This is a release-gate defect, not a runtime one, and the project's documented cache-version update procedure resolves it.

The remaining findings are contained P2 issues:

- an unsolicited reload on the first production visit;
- a broken 404 page on nested unknown paths;
- one offer that the region filter classifies inconsistently;
- overlay semantics;
- gaps in the no-JavaScript baseline;
- stale legal and README statements;
- public-copy polish;
- a timing-sensitive test gate.

Once the bundle record is corrected, the project fits continued development and portfolio presentation within its documented demonstration scope.

## 2. Audit scope and verification

### Areas inspected

- Project context: `README.md`, `AGENTS.md`, `docs/settings.md`, `docs/pipeline-notes.md`, `docs/CHANGELOG.md`, archived plan, audit and improvement records (used as context only and re-verified where referenced)
- All 12 maintained root HTML pages: head metadata, JSON-LD validity and types, heading outlines, landmarks, ID uniqueness and ID references, images, forms, links and utility pages
- `js/script.js` and all 15 modules in `js/features/`
- `css/style.css` and `css/modules/`, targeted at tokens, visibility and `[hidden]` rules, reduced motion, accordion, tabs, navigation, tour cards and gallery filters
- `service-worker.js`, `service-worker-bundles.json`, `_headers`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `assets/data/*.json`, the published assets and font licences
- Build and validation scripts: `scripts/site-build-contract.js`, `scripts/build-dist.js`, `scripts/clean-dist.js` and `scripts/images-bootstrap.js`. Read statically; the other checkers were exercised through `npm run build`.
- `package.json`, `package-lock.json`, `vitest.config.mjs`, `postcss.config.js` and the test inventory in `tests/`
- Git state: clean working tree on `kodek/frontend-audit-standard-fa96da` at `8243f45`, and the history of `css/` and `service-worker-bundles.json`

### Verification performed

- `npm test` — partially passed. 23 files and 303 tests ran: 298 passed and 5 failed, all with `Test timed out in 5000ms`. The failures were 2 in `tests/csp.test.js`, 1 in `tests/theme-bootstrap.test.js` and 2 in `tests/typography-roles.test.js`.
- `npx vitest run tests/csp.test.js tests/theme-bootstrap.test.js tests/typography-roles.test.js --testTimeout=120000 --hookTimeout=120000` — executed and passed (45/45).
- `npm run build` — executed and failed at its final step, `check:sw-bundles`, because the CSS SHA-256 was `8900dd27…` against the recorded `5f982a5b…` for `aurora-1.45`. The JS bundle matched. Every earlier step passed:
  - `build:stage`, `verify:css` and `verify:js`;
  - `check:css-assets`;
  - `check:assets` and `check:assets:dist`;
  - `check:csp` and `check:csp:dist`;
  - `check:tour-catalogue`.
- Toolchain comparison (read-only script) — all 270 `package-lock.json` entries matched the installed `node_modules` versions, with 0 mismatches.
- CSS reproduction in a scratch directory (no repository files touched):
  - The HEAD CSS taken from Git blobs (LF) produced the same hash as the CRLF checkout (`8900dd27…`).
  - Commit `16089a9` reproduced its own `aurora-1.44` record with the same toolchain.
- Browser checks (headless Chrome 156 over CDP; a fresh profile per load; external hosts blocked; `dist/` served by `node scripts/preview-server.js dist --port 8792` with the `/*` headers of `dist/_headers`):
  - **Smoke test at 1280×800:** all 12 pages returned 200 and showed no console errors, exceptions or HTTP errors. The only failed requests were 2 on `contact.html`, from the Google Maps embed blocked by the offline resolver.
  - **First production visit:** every page loaded twice once the Service Worker took control. On `contact.html`, input typed after the first `load` event was empty after the reload.
  - **Unknown paths:** a single-segment unknown path rendered the styled 404 page. A nested one (`/oferty/malediwy/2026`) rendered unstyled, with 404 responses for its CSS, JS, fonts and icons.
  - **JavaScript disabled:** FAQ answers and two testimonial panels stayed hidden, and 7 gallery filter buttons showed above an empty gallery.
  - **JavaScript enabled:**
    - region filter results;
    - the consent label `innerText`;
    - lightbox attributes and accessibility role;
    - horizontal overflow on all 12 pages at 375×812 and 768×1024 (none at page level).
- `npm run predeploy:check` — not executed as one command. Its two components were executed separately (above).
- `npm run build:images`, `npm run images:bootstrap` and `npm run record:sw-bundles` — not executed, because they write tracked files.
- `dist/`, the Vitest cache directory created in the worktree's `node_modules/` and the temporary Chrome profile were all created during this audit and removed afterwards.

### Verification limitations

- No live URL was supplied, so no deployed environment was inspected, and the deployed revision is unknown.
- Browser verification used Chromium only. No Firefox, Safari, physical device or assistive-technology testing was performed.
- Contrast compliance was not fully verified because reliable computed-style analysis was not available. Only the project's action-colour contract test, which covers one token pair, ran as part of `npm test`.
- Dark theme, reduced motion, forced colours, zoom and print were not exercised in the browser during this audit.
- Netlify Forms processing, Netlify Pretty URLs and the Google Maps embed cannot be reproduced locally and were not verified.
- The provenance and licensing of the photographs could not be determined from the repository.
- Test timing depends on machine load, so the timeout failures were reproduced in this environment only.

## 3. Verified strengths

- **Explicit source and publication contracts.** `scripts/site-build-contract.js` declares the page inventory and the entry-tag pairs, and `build:stage` and `check:css-assets` enforce both. Minified bundles exist only in the ignored `dist/`. Every check that compares sources with the package passed in this audit.
- **Hardened script policy.** `_headers` replaces `'unsafe-inline'` with SHA-256 hashes of the three theme-bootstrap variants and adds `object-src 'none'` and `base-uri 'self'`. `check:csp` and `check:csp:dist` passed, and the policy produced no violations across the 12 production pages.
- **Defensive initialization.** `js/script.js` (`runInitializer()`) isolates each feature's synchronous and asynchronous failures. Two runtime flags take effect only after setup succeeds:
  - `reveal-ready` (`js/features/reveal.js`), which hides unrevealed content;
  - `data-nav-ready` (`js/features/nav.js`), which reveals the navigation toggle.

  Content therefore stays visible when the bundle or a feature fails.
- **Safe rendering of catalogue data.** Images are built through DOM properties (`js/features/catalogue-picture.js`). Tour descriptions pass through an allow-list sanitizer (`js/features/tour-detail.js`, `sanitizeTourHtml()`). Loading and unavailable states are announced in dedicated `role="status"` regions.
- **Scoped Service Worker.**
  - Caches are versioned.
  - Failed, opaque and non-HTML navigation responses are not cached (`service-worker.js:55-84`).
  - Old caches are deleted only on activation.
  - Registration happens only in the production bundle.
  - Development unregisters leftover workers.
  - The bundle-to-version record is a real safeguard: it detected the P0 below.
- **Consistent markup across pages.** No page has duplicate IDs or dangling `aria-controls`, `aria-labelledby`, `aria-describedby`, `for` or fragment references, and every JSON-LD block parses. Every `target="_blank"` link carries `rel="noopener noreferrer"`. Utility pages are `noindex`, and `sitemap.xml` matches the eight indexable pages.
- **Accessible form.** Native constraints drive validation. Errors use per-field `aria-live` regions linked through `aria-describedby`, plus `aria-invalid`. The form includes a honeypot, and the page states who receives submissions.
- **Honest demonstration positioning.** A persistent footer disclosure appears on all 12 pages, the FAQ and legal pages explain the fictional brand, and the JSON-LD separates the fictional `Brand` from the real `Organization` that holds the contact data.
- **Broad regression coverage.** The suite covers data-driven views, keyboard and focus handling, Service Worker routing and caching, CSS contracts, the theme bootstrap, font preloads and the checker scripts themselves. Correctness failures were absent: every failure in this audit was a timeout.

## 4. P0 — Critical risks

### [P0-01] Committed Service Worker bundle record does not match the committed CSS, so the production build fails

- **Classification:** Contract mismatch
- **Affected area:** Build, deployment gate, Service Worker cache versioning
- **Evidence:** `service-worker-bundles.json:2-4`, `service-worker.js:1`, `package.json` — `scripts.build` (final step `check:sw-bundles`), `scripts.predeploy:check`
- **Current behavior:** `npm run build` on the committed revision ends with `Service Worker bundle check failed`. The CSS bundle built from the committed `css/` sources hashes to `8900dd27…`, but `aurora-1.45` records `5f982a5b…`.
  - The installed toolchain matches `package-lock.json` exactly.
  - LF and CRLF sources produce the same bytes.
  - The previous commit (`16089a9`, `aurora-1.44`) reproduces its own record with the same toolchain.
  - The CSS and the record were last changed together in `2bdc2e2`, so the recorded hash does not correspond to the committed CSS.
- **Impact:** The documented release workflow says to deploy only the `dist/` of a passing `npm run predeploy:check`, and that check cannot currently pass. If a package with these CSS bytes were published under the already-used `aurora-1.45` cache name, returning visitors could keep a different cached stylesheet.
- **Recommended direction:** Complete the documented intentional cache-version update for the committed CSS. Raise `VERSION` in `service-worker.js`, record the bundles with `npm run record:sw-bundles` and rebuild. Then commit the record together with the worker.
- **Verification criteria:** On a clean checkout with the lockfile toolchain, `npm run build` exits 0, and `check:sw-bundles` reports that both bundles match the recorded version.
- **Status:** COMPLETED — verified.
- **Resolution:** Raised `VERSION` to `aurora-1.46` and recorded both bundles with `npm run record:sw-bundles`: the CSS hash changed to `8900dd27…` and the JS hash `ab803a5c…` stayed unchanged. No application CSS or JavaScript changed.
- **Verification:** On a clean worktree at `f5bd29e`, with the installed toolchain matching `package-lock.json`, `npm run build` first reproduced the CSS-only mismatch. After recording, it exited 0, and `check:sw-bundles` confirmed both bundles for `aurora-1.46`.

## 5. P1 — Important issues worth fixing next

None detected.

## 6. P2 — Minor refinements

### [P2-01] First production visit reloads the page and discards early interaction

- **Classification:** Defect
- **Affected area:** Service Worker lifecycle, UX
- **Evidence:** `js/features/service-worker-lifecycle.js:14-18`, `service-worker.js:26`
- **Current behavior:** Activation calls `self.clients.claim()`. The page listens for `controllerchange` without checking whether a controller existed before, and reloads unconditionally. In a fresh profile, all 12 production pages loaded twice. On `contact.html`, the reload followed the first `load` event by about 225 ms on localhost and cleared text typed into `#name`.
- **Impact:** Every first-time visitor sees an unrequested reload. Any interaction that starts before the worker activates is lost. On real networks, where precaching takes longer, the window widens.
- **Recommended direction:** Reload on `controllerchange` only when it replaces an existing controller, for example after the update banner's `SKIP_WAITING`. Leave the first claim without a reload.
- **Verification criteria:** A fresh-profile visit to any `dist/` page produces one main-frame load. The update-banner flow still reloads once after "Odśwież".
- **Status:** COMPLETED — verified.
- **Resolution:** The `controllerchange` handler now tracks the page's controller and reloads only when a new worker replaces it, or takes over after "Odśwież" on that page; the existing guard still prevents a second reload, and `clients.claim()` and the update banner are unchanged. The changed JS bundle was released under `aurora-1.47`, and `tests/service-worker-lifecycle.test.js` covers both paths.
- **Verification:** Under `npm run preview:dist` in headless Chrome 156, a fresh context per page loaded all 12 pages once (twice at the unchanged HEAD), and text typed on `contact.html` was kept. The update-banner flow reloaded exactly once after "Odśwież" and left only the `aurora-1.47` caches; `npm test` passed 308/308 and `npm run predeploy:check` exited 0.

### [P2-02] 404 page breaks on nested unknown paths

- **Classification:** Defect
- **Affected area:** Routing, error handling
- **Evidence:** `404.html:63`, `404.html:74`, `404.html:133`, `404.html:253`
- **Current behavior:** `404.html` uses document-relative URLs for its stylesheet, script, images and recovery links. For `/oferty/malediwy/2026`, the production preview returned the 404 page with status 404. The CSS, JS, fonts, logo and favicons then failed with 404, the page rendered in the default serif font, and "Wróć na stronę główną" resolved to `/oferty/malediwy/index.html`, another 404. A single-segment unknown path rendered correctly.
- **Impact:** Mistyped or outdated multi-segment URLs show an unstyled error page whose recovery links lead to further errors.
- **Recommended direction:** Make `404.html` resolve its assets and links from the site root. The project already requires deployment at the domain root, and `base-uri 'self'` permits that approach. Keep the build's asset-reference contract consistent with the change.
- **Verification criteria:** Under `npm run preview:dist`, a two- or three-segment unknown path renders the styled 404 page with status 404, no failed asset requests and working home and offers links.

### [P2-03] Maldives offer is labelled Asia but filtered as Oceania

- **Classification:** Defect
- **Affected area:** Tour filtering, catalogue consistency
- **Evidence:** `tours.html:204`, `tours.html:279`, `tours.html:314`, `scripts/check-tour-catalogue.js:198`
- **Current behavior:** The card, the home page and `assets/data/tours.json` all label the offer "Azja • Malediwy", but its `data-region="ocean"` maps to the filter option "Oceania". In the browser, "Azja" showed only the Tokyo offer, and "Oceania" showed the offer labelled Asia. The catalogue check deliberately compares the visible label but not the filter value.
- **Impact:** A user filtering by Asia misses an offer the site itself labels as Asian, so the filter contradicts the visible content.
- **Recommended direction:** Align the Maldives filter value with its visible region, or relabel both consistently. Optionally, extend the catalogue check so that filter values agree with the visible region.
- **Verification criteria:** Selecting the region shown on each card's label includes that card, and no card appears under a region its label contradicts.

### [P2-04] Overlay components lack complete dialog and focus semantics

- **Classification:** Defect
- **Affected area:** Accessibility (lightbox, mobile navigation)
- **Evidence:** `gallery.html:206`, `tour.html:316`, `js/features/lightbox.js:41-51`, `js/features/nav.js:27-32`, `js/features/nav.js:62-72`
- **Current behavior:**
  - **Lightbox:** The modal lightbox traps focus and closes on Escape, but the overlay has no `role="dialog"`, no `aria-modal` and no accessible name. Chromium exposed it as `generic` while open.
  - **Mobile navigation:** The open navigation's focus trap cycles only through the navigation links. The visible close control, the toggle that becomes an "X", is unreachable by Tab, so Escape is the only keyboard way to close it.
- **Impact:** Screen-reader users get no announcement that a modal opened or what it contains. Keyboard users cannot reach the visible control that closes the menu.
- **Recommended direction:** Give the lightbox overlay dialog semantics and an accessible name. Include the navigation toggle in the open-menu focus cycle.
- **Verification criteria:** With the lightbox open, the accessibility tree exposes a named modal dialog. With the mobile menu open, Tab and Shift+Tab reach the toggle, and activating it closes the menu and restores focus.

### [P2-05] No-JavaScript baseline hides FAQ answers and shows inert gallery filters

- **Classification:** Defect
- **Affected area:** Progressive enhancement
- **Evidence:** `about.html:306`, `index.html:414`, `index.html:421`, `gallery.html:181`, `js/features/gallery.js:70-77`, `css/modules/base.css:3-5`
- **Current behavior:** With script execution disabled:
  - All four FAQ answers, including the "Is Aurora Travel real?" disclosure, stay hidden through the static `hidden` attribute, and their buttons do nothing.
  - Two of the three testimonial panels stay hidden.
  - `gallery.html` shows seven filter buttons above an empty gallery, with no explanatory message.

  The project otherwise guards no-JS states deliberately (`reveal-ready`, `data-nav-ready`).
- **Impact:** Content is unreachable, and controls look interactive but do nothing, which is inconsistent with the project's own enhancement pattern.
- **Recommended direction:** Ship expanded or visible static states and collapse them only after initialization, as the reveal and navigation features do. Hide the gallery filters until the gallery renders, and provide a short no-JS message for the data-driven gallery.
- **Verification criteria:** With JavaScript disabled, FAQ answers and testimonials are readable, and `gallery.html` shows no non-functional controls. With JavaScript enabled, behaviour is unchanged.

### [P2-06] Cookies policy names Cache Storage keys that the site does not use

- **Classification:** Content integrity risk
- **Affected area:** Legal content, PWA
- **Evidence:** `cookies.html:347`, `cookies.html:355`, `service-worker.js:1-4`
- **Current behavior:** The storage table's "Nazwa lub klucz" column lists `aurora-1.3_static` and `aurora-1.3_html`, while the worker creates `aurora-1.45_static` and `aurora-1.45_html`. Every `VERSION` change widens the gap, and no check ties the two together.
- **Impact:** A public legal document dated 31.10.2026 misstates the names of the storage the site actually writes.
- **Recommended direction:** Describe the cache names by their stable pattern, with the version as a variable part, or keep the table synchronised with `VERSION` as part of the cache-version procedure.
- **Verification criteria:** The cache names in `cookies.html` match the names `service-worker.js` creates for the current and any future `VERSION`.

### [P2-07] Featured offer images on the home page lack intrinsic dimensions and lazy loading

- **Classification:** Contract mismatch
- **Affected area:** Images, performance, documentation contract
- **Evidence:** `index.html:280-289`, `index.html:322-331`, `index.html:364-373`, `css/modules/sections.css:202-208`, `README.md:239-240`
- **Current behavior:** The three featured-offer `<img>` elements have no `width`, `height` or `loading` attributes. Inside `.cards-grid`, CSS resets the card picture to `aspect-ratio: auto` and `height: auto`, so no space is reserved before the images load. The README states that inline images carry explicit dimensions and that non-hero images load lazily.
- **Impact:** This is a source-visible layout-shift and eager-download risk on the home page, contrary to the documented image contract. It was not measured.
- **Recommended direction:** Give these images the same intrinsic `width`/`height` and lazy-loading treatment as the other non-hero images.
- **Verification criteria:** Every content `<img>` in `index.html` other than the hero declares `width`, `height` and `loading="lazy"`, matching the README.

### [P2-08] Deployment gate depends on default 5-second test timeouts

- **Classification:** Maintenance risk
- **Affected area:** Testing, deployment workflow
- **Evidence:** `vitest.config.mjs:11-17`, `package.json` — `scripts.predeploy:check`, `tests/csp.test.js`, `tests/theme-bootstrap.test.js`, `tests/typography-roles.test.js`
- **Current behavior:** These tests spawn checker processes or parse all 12 pages, and they run under Vitest's default 5 s per-test timeout. In this audit, a full `npm test` failed 5 of 303 tests by timeout, while the same 45 tests passed with a raised timeout.
- **Impact:** `npm run predeploy:check` can stop a deployment for timing reasons unrelated to correctness, which erodes trust in the gate.
- **Recommended direction:** Give the subprocess-spawning and full-page-parsing tests explicit timeouts proportionate to their work, or reduce their per-test process spawning, without relaxing their assertions.
- **Verification criteria:** `npm test` passes repeatedly at default settings on the development machine under normal load, with no change to what the affected tests assert.
- **Status:** COMPLETED — verified.
- **Resolution:** Set suite timeouts at about four times the slowest test of a full baseline run: 20 s for `tests/csp.test.js` (5.1 s) and 15 s for `tests/asset-integrity.test.js`, `tests/theme-bootstrap.test.js` and the role-contract suite of `tests/typography-roles.test.js` (2.4–3.5 s). The global 5 s default and every assertion are unchanged, and `tests/build-stage.test.js`, `tests/font-preload.test.js` and `tests/tour-catalogue.test.js` (slowest 1.4–1.8 s) keep that default.
- **Verification:** After the change, `npm test` passed 303/303 without timeout overrides. `npm run predeploy:check`, started at 96% CPU load, exited 0 with 303/303 tests and every build check passing.

### [P2-09] README contradicts the repository on font licences, structured data and CSS modules

- **Classification:** Documentation mismatch
- **Affected area:** Documentation, licensing and attribution, SEO
- **Evidence:** `README.md:273`, `README.md:546`, `README.md:221`, `README.md:494`, `README.md:64`, `README.md:337`, `docs/pipeline-notes.md:47`
- **Current behavior:** Both language sections of the README contradict the repository in three places:
  - **Font licences:** The README states that no font licence files exist, but `assets/fonts/Inter-OFL.txt` and `assets/fonts/Manrope-OFL.txt` are tracked and published, as `docs/pipeline-notes.md` states correctly.
  - **Structured data:** The README lists `TravelAgency` among the JSON-LD types, but the pages now use `Brand` and `Organization`.
  - **CSS modules:** The README says `css/style.css` imports eight modules and omits `legal.css`, but it imports nine.
- **Impact:** The README misrepresents the project's licence compliance for third-party fonts and its public structured data.
- **Recommended direction:** Align these README statements with the current files in both language sections.
- **Verification criteria:** The README's attribution, JSON-LD and CSS-module statements match `assets/fonts/`, the JSON-LD blocks and `css/style.css`.

### [P2-10] Public copy contains visible typographic and consistency errors

- **Classification:** Content integrity risk
- **Affected area:** Public content (Polish)
- **Evidence:** `contact.html:312`, `cookies.html:219`, `regulamin.html:233`, `polityka-prywatnosci.html:226`, `index.html:164`, `about.html:176`, `about.html:253`
- **Current behavior:**
  - **Stray spaces:** 27 inline links or code elements are followed by a line break before punctuation, which renders as a space before the mark. Most are on the legal pages. The browser rendered the form's consent label as "…zgodnie z polityką prywatności ."
  - **English tooltip:** The theme toggle carries `title="Toggle theme"` on all 12 pages.
  - **Contradictory years:** The About page says "Od 2010 roku" next to "14 lat doświadczenia". The archived design report records this as an open owner decision.
- **Impact:** Visible polish defects in the legal text and on the main form, an English tooltip on a Polish site, and an internal factual contradiction.
- **Recommended direction:** Remove the whitespace between inline elements and the following punctuation. Localise or remove the tooltip. Make the founding year and the experience figure agree.
- **Verification criteria:** No rendered text contains a space before punctuation after an inline element, no English `title` remains, and the two About figures are consistent.

### [P2-11] Leftover undefined token and unreferenced published asset

- **Classification:** Maintenance risk
- **Affected area:** CSS tokens, assets, packaging
- **Evidence:** `css/modules/subpages.css:649`, `assets/img/gallery/camera.svg`, `scripts/build-dist.js` — recursive `assets/` copy
- **Current behavior:**
  - **Undefined token:** `.contact-details__label` uses `var(--text-muted)`, which no module defines, so the declaration is invalid at computed-value time and the label inherits its colour.
  - **Unreferenced asset:** `assets/img/gallery/camera.svg` (1,886,768 bytes) is referenced nowhere, yet it is copied into every `dist/` package.

  Both items appear as open in the archived design report.
- **Impact:** The intended label styling silently does not apply, and a dead 1.9 MB file ships with each deployment.
- **Recommended direction:** Point the label at an existing semantic token and remove the unreferenced SVG.
- **Verification criteria:** No `var()` in `css/modules/` references an undefined custom property, and `camera.svg` is absent from the repository and from `dist/`.

## 7. Extra quality improvements

### Scripted browser smoke check of `dist/`

- **Relevant area:** Testing and validation
- **Current evidence:** The suite runs only in jsdom ("the project has no browser tests"). P2-01 and P2-02 are visible only in a real browser with the Service Worker and the production paths.
- **Potential value:** A repeatable check over `npm run preview:dist` would catch these classes of issue before deployment. It would cover console and CSP errors, main-frame load count on the first visit and nested-path 404 rendering. Node's built-in `WebSocket` and an installed Chrome make this possible without new dependencies.
- **Scope boundary:** Optional. It complements, and does not replace, `predeploy:check`.

### Load the tour-detail main image eagerly after measurement

- **Relevant area:** Images and performance
- **Current evidence:** `js/features/catalogue-picture.js:38-39` marks every catalogue image `loading="lazy"`, including the main image that `js/features/tour-detail.js:105` places at the top of `tour.html`.
- **Potential value:** If measurement confirms that it is the largest above-the-fold image, loading it without lazy deferral could shorten its display time.
- **Scope boundary:** Optional, and only after measurement. No loading problem was measured in this audit.

### Record photograph provenance

- **Relevant area:** Licence and attribution
- **Current evidence:** The archived design report states that no per-image source or licence record exists for the photographs in `assets/img-src/` and `assets/img/`.
- **Potential value:** A short provenance record would substantiate the rights to publish the portfolio imagery.
- **Scope boundary:** Optional documentation. This audit could not determine whether attribution is required.

## 8. Current readiness conclusion

**Status:** Blocked

The block is limited to the release gate. Under the documented workflow, the current revision cannot produce a deployable package, because `npm run build` fails on the stale `aurora-1.45` bundle record (P0-01).

The runtime itself showed no blocking problems in this audit. All production pages loaded cleanly under the enforced CSP, and the project-specific source and package checks passed.

After P0-01 is resolved with the documented cache-version update, the project would move to "Ready with minor refinements". The P2 findings are worth addressing before final portfolio presentation, most notably P2-01, P2-02 and P2-03.

This status is not a formal accessibility, security or cross-browser certification.

## 9. Senior rating

**Rating:** 7/10

The architecture and repository discipline are strong for a static demonstration site:

- explicit source and package ownership;
- hash-based CSP;
- defensive initialization;
- safe data rendering;
- a versioned Service Worker with a bundle-approval guard;
- 303 regression tests;
- runtime behaviour that was clean in Chromium.

The rating is held back by a release gate that fails on the committed revision. It is also held back by several user-visible rough edges:

- the first-visit reload;
- the nested-path 404;
- a filter inconsistency;
- overlay semantics;
- gaps in the no-JS baseline;
- stale public and README statements.

All of these are contained and individually small, and none requires architectural change.
