# Aurora — UX Improvements

**Analysis date:** 2026-10-07
**Project type:** Multi-page static website — 12 maintained root HTML pages, modular CSS, vanilla ES modules bundled with esbuild, JSON-driven tour detail and gallery views, production Service Worker, Netlify static hosting with Netlify form handling
**Analysis mode:** Evidence-based UX improvement review
**Focus:** Project-wide UX
**Status:** COMPLETED — all five UX improvements implemented and verified.
**Completion date:** 2026-10-08
**Completion summary:** IMP-UX-01 to IMP-UX-05 were implemented and verified between 2026-10-07 and 2026-10-08. No open tasks remain in this report.

## Improvement overview

At the time of the analysis on 2026-10-07, Aurora supported the main visitor journey from discovering and filtering travel offers to viewing their details and submitting an enquiry. The project already had established keyboard navigation, form validation, catalogue filtering and accessible lightbox interactions.

Five UX gaps remained: missing feedback for empty filter results, no direct enquiry action on tour detail pages, unclear loading and unavailable-data states, validation errors persisting after correction, and offer links landing behind the sticky header.

All five improvements were subsequently completed and verified. Visitors can now recover from empty filter results, enquire directly about a selected offer, distinguish loading and data failures from missing offers, receive immediate validation-error recovery and navigate to fully visible offer cards.

Existing accessibility, responsive layout, filtering, form submission and PWA contracts were preserved. The analysis describes the original baseline of 2026-10-07; the records below document completed implementations and verification.

## Completed improvements

### IMP-UX-01 — Give the tour listing an empty-result state with a way back to all offers

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added a dedicated empty-result message and "Pokaż wszystkie oferty" button to `tours.html`. When type and region filters match no offer, the message replaces the empty list. Resetting restores both filters, displays all six offers in the selected sort order, updates the result counter and returns focus to the type filter. Without JavaScript, all offers remain visible and the empty state stays hidden. Existing filtering and catalogue contracts were preserved. The Service Worker cache advanced to `aurora-1.24`.
- **Verification:** `tests/tours-filters.test.js` covers empty results, recovery when filters match again, reset behavior across sorting modes, result counts, focus restoration and the no-JavaScript fallback. The implementation is recorded in commit `4fd41a6`. Existing filter and sort behavior remains protected by regression tests.
- **Impact:** High
- **Effort:** Small

### IMP-UX-02 — Let visitors send an enquiry for the offer they are viewing on the detail page

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added a "Zapytaj o ofertę" action to the header of `tour.html`. After a catalogue offer loads successfully, the button links to `contact.html?tour=<id>`, reusing the existing contact-form preselection contract. Without JavaScript, with a missing or unknown ID, or after a failed request, the action remains a plain link to `contact.html`. Existing form logic and catalogue behavior were preserved. The Service Worker cache advanced to `aurora-1.25`.
- **Verification:** `tests/tour-detail.test.js` verifies the enquiry link for every catalogue offer and the plain-contact fallback for missing IDs, unknown offers and unsuccessful loading. The implementation is recorded in commit `9965b4d`. No changes to contact-form preselection logic were required.
- **Impact:** High
- **Effort:** Small

### IMP-UX-03 — Distinguish loading and unavailable data from "offer not found" in the JSON-driven views

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added explicit loading, loaded and unavailable-data states to `tour.html` and `gallery.html`. Tour details show a loading message while catalogue data is pending, reserve "offer not found" for missing or unknown IDs, and provide retry and listing actions when data is unavailable. The gallery hides filters until images load and displays a dedicated failure message when data cannot be used. State changes use separate polite status regions instead of announcing entire content grids. Existing sanitization, image rendering, lightbox behavior and no-JavaScript fallbacks were preserved. Service Worker caching of JSON responses was not changed. The cache advanced to `aurora-1.26`.
- **Verification:** `tests/tour-detail.test.js` and `tests/gallery.test.js` cover delayed requests, network failures, non-OK responses, invalid or structurally unsuitable JSON, successful recovery from loading, missing-offer handling, filter visibility and polite status announcements. Tour retry behavior is tested against the current document URL. The implementation is recorded in commit `daea4f9`. Offline JSON availability through the Service Worker was outside this improvement's scope.
- **Impact:** Medium
- **Effort:** Medium

### IMP-UX-04 — Clear a field's validation error as soon as the input becomes valid

- **Status:** COMPLETED — implemented and verified.
- **Result:** Updated `js/features/form.js` to revalidate previously flagged fields on `input` and `change`, clearing error messages and `aria-invalid` immediately when corrected. Fields without existing errors continue to validate on blur and submit. Invalid values retain appropriate messages without unnecessary repeated announcements. Changing the start date also rechecks a flagged end date, while unchanged date minimums are no longer rewritten during editing. Native constraints, first-invalid-field focus, tour preselection and Netlify form submission remain unchanged. The Service Worker cache advanced to `aurora-1.27`.
- **Verification:** `tests/form.test.js` covers live error recovery for text, email, phone, select, date, number, textarea and consent controls. Additional cases verify persistent invalid values, unchanged messages, blur/submit behavior, focus handling and dependent date constraints. The implementation is recorded in commit `d8e12a8`. Existing form validation remains covered by the regression suite.
- **Impact:** Medium
- **Effort:** Small

### IMP-UX-05 — Land featured-offer links from the home page with the offer fully visible

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `scroll-margin-top: calc(var(--header-h) + var(--space-8))` to detailed tour cards in `css/modules/subpages.css`. Links such as `tours.html#tokio`, `#malediwy` and `#nyc` now position the selected card and its heading below the sticky header. The offset accommodates header resizing and reveal positioning without changing existing anchor links, filtering, animations, skip-link behavior or reduced-motion support. The Service Worker cache advanced to `aurora-1.28`.
- **Verification:** The implementation is recorded in commit `5583249` and confirmed by the current CSS rule. The original completion report records the target card settling 13–69 px below the compact 59 px header, depending on loading and animation timing, and 53 px below the full-height header without JavaScript. The existing catalogue checker continues to protect featured-offer anchor references. No dedicated automated scroll-position regression test was added, and browser positioning was not remeasured during this documentation review.
- **Impact:** Medium
- **Effort:** Small

## Selection summary

- **Selection basis:** The five improvements addressed consecutive stages of the visitor journey: discovering an offer, filtering results, viewing details, making an enquiry and recovering from form errors. They targeted observable interaction problems rather than introducing additional functionality outside the existing experience.
- **Dependencies:** All five were independently implementable and completed as separate changes. IMP-UX-02 and IMP-UX-03 both affected tour-detail rendering; the enquiry action was implemented before the explicit data-state handling.
- **Scope:** Four improvements were estimated as Small and one as Medium. Each changed production pages, CSS or JavaScript and followed the documented Service Worker cache-version workflow, advancing the cache from `aurora-1.23` to `aurora-1.28`.
- **Considered, not selected:** Visible participant-count and phone-format hints in the contact form, and a lightbox image-position indicator, were considered but excluded from this cycle. They are historical considerations, not open tasks in this report.
- **Outcome:** All five improvements were completed and verified within their approved scopes.

## Original analysis limitations (2026-10-07)

These limitations describe the original analysis, not the subsequent implementations. Completion records are supported by repository changes, regression tests and documented verification evidence. No tests, builds or browser checks were rerun specifically for this documentation standardization.

- **Browser coverage:** The original analysis used headless Chromium at 375 px and 1280 px against locally served development sources. Other browsers, real devices, assistive technology, the production `dist/` package and the deployed site were not checked.
- **Data failures:** Loading and failure states were reproduced using delayed or aborted JSON requests. Offline behavior through the Service Worker was inferred from source inspection, not observed in an offline browser session.
- **User outcomes:** No usability studies or analytics were available. Expected improvements to the visitor journey were based on observed interactions, not measured conversion or satisfaction results.
