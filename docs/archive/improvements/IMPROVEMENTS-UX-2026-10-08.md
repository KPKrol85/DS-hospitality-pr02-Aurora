# Aurora — UX Improvements

**Analysis date:** 2026-10-07
**Completed:** 2026-10-08
**Status:** COMPLETED — all five selected improvements implemented and verified.
**Scope:** Project-wide UX.

## Overview

Five UX improvements were completed between 2026-10-07 and 2026-10-08 along the main visitor journey: recovering from empty filter results, enquiring directly about a viewed offer, distinguishing loading and unavailable data from a missing offer, clearing corrected form errors immediately and landing featured-offer links below the sticky header.

Existing accessibility, responsive layout, filtering, form submission, no-JavaScript fallbacks and PWA contracts were preserved. Each improvement shipped as a separate change with its own Service Worker cache-version update.

## Completed improvements

### IMP-UX-01 — Give the tour listing an empty-result state with a way back to all offers

- **Status:** COMPLETED — implemented and verified.
- **Result:** When type and region filters match no offer, `tours.html` shows a message with a "Pokaż wszystkie oferty" button in place of the empty list. Resetting restores both filters, shows all six offers in the selected sort order, updates the result counter and returns focus to the type filter; without JavaScript all offers stay visible and the message stays hidden. Service Worker cache: `aurora-1.24`.
- **Verification:** `tests/tours-filters.test.js` covers empty results, recovery when filters match again, reset across sorting modes, result counts, focus restoration and the no-JavaScript fallback; existing filter and sort tests were retained.
- **Impact:** High
- **Effort:** Small

### IMP-UX-02 — Let visitors send an enquiry for the offer they are viewing on the detail page

- **Status:** COMPLETED — implemented and verified.
- **Result:** `tour.html` gained a "Zapytaj o ofertę" header action that, once a catalogue offer loads, links to `contact.html?tour=<id>` through the existing contact-form preselection contract. Without JavaScript, with a missing or unknown ID, or after a failed request it remains a plain link to `contact.html`. Service Worker cache: `aurora-1.25`.
- **Verification:** `tests/tour-detail.test.js` checks the enquiry link for every catalogue offer and the plain-contact fallback for missing IDs, unknown offers and failed loading. Contact-form preselection logic required no change.
- **Impact:** High
- **Effort:** Small

### IMP-UX-03 — Distinguish loading and unavailable data from "offer not found" in the JSON-driven views

- **Status:** COMPLETED — implemented and verified.
- **Result:** `tour.html` and `gallery.html` now have explicit loading, loaded and unavailable-data states. Tour details reserve "offer not found" for missing or unknown IDs and offer retry and listing actions when data is unavailable; the gallery keeps its filters hidden until images load and shows a dedicated failure message. State changes are announced through separate polite status regions rather than the content grids, and sanitization, image rendering, lightbox behavior and Service Worker JSON caching were unchanged. Service Worker cache: `aurora-1.26`.
- **Verification:** `tests/tour-detail.test.js` and `tests/gallery.test.js` cover delayed requests, network failures, non-OK responses, invalid or structurally unsuitable JSON, recovery from loading, missing offers, filter visibility and polite announcements; tour retry is tested against the current document URL. Offline JSON availability through the Service Worker was outside scope.
- **Impact:** Medium
- **Effort:** Medium

### IMP-UX-04 — Clear a field's validation error as soon as the input becomes valid

- **Status:** COMPLETED — implemented and verified.
- **Result:** Previously flagged fields are revalidated on `input` and `change`, clearing the message and `aria-invalid` as soon as the value is corrected, while other fields still validate on blur and submit. Unchanged invalid values are not re-announced, a start-date change rechecks a flagged end date, and unchanged date minimums are no longer rewritten during editing. Native constraints, first-invalid-field focus, tour preselection and Netlify submission were unchanged. Service Worker cache: `aurora-1.27`.
- **Verification:** `tests/form.test.js` covers live recovery for text, email, phone, select, date, number, textarea and consent controls, plus persistent invalid values, unchanged messages, blur and submit behavior, focus handling and dependent date constraints.
- **Impact:** Medium
- **Effort:** Small

### IMP-UX-05 — Land featured-offer links from the home page with the offer fully visible

- **Status:** COMPLETED — implemented and verified.
- **Result:** Detailed tour cards received `scroll-margin-top: calc(var(--header-h) + var(--space-8))`, so links such as `tours.html#tokio`, `#malediwy` and `#nyc` place the card and its heading below the sticky header, allowing for header resizing and reveal offsets. Anchor links, filtering, animations, skip-link and reduced-motion behavior were unchanged. Service Worker cache: `aurora-1.28`.
- **Verification:** The completion record reports the card settling 13–69 px below the 59 px compact header, depending on loading and animation timing, and 53 px below the full-height header without JavaScript. The catalogue checker still protects the anchor references; no automated scroll-position test was added, and positioning was not remeasured for this archive.
- **Impact:** Medium
- **Effort:** Small

## Verification limitations

The original analysis ran headless Chromium at 375 px and 1280 px against locally served development sources; other browsers, real devices, assistive technology, the production `dist/` package and the deployed site were not checked. Loading and failure states were reproduced by delaying or aborting JSON requests, while offline behavior through the Service Worker was inferred from source. No usability studies or analytics were available, so expected user benefit was reasoned, not measured.

The completion records rely on repository changes, regression tests and documented verification evidence; the archive does not record test-run output. Preparing this archive involved only editorial review and static repository inspection; no application tests, production builds or browser checks were run for it.
