# Aurora — Design Improvements

**Analysis date:** 2026-10-10
**Completed:** 2026-10-31
**Status:** COMPLETED — all nine improvements implemented and verified; the design improvement cycle is closed and archived.
**Scope:** Project-wide design.

## Overview

The evidence-based design review of 2026-10-10 assessed Aurora Travel, a 12-page Polish demonstration site of a boutique travel agency prepared by KP_Code Digital Studio. It found a calm, accessible base with a mature token system, but a generic "soft card" template: elevated panels for every role, one repeated section pattern, framed photography and decorative lift on static content, none of which expressed the premium travel-planning positioning of the copy.

Of three creative directions (A — Atlas Aurory, B — Zorza nocą, C — Laguna), the approved direction was **Atlas Aurory**: an editorial, cartographic system built from the project's own material (places, routes, days, itineraries, the map motif and the warm paper ground), with equal light and dark editions and elevation reserved for operable surfaces and overlays. Its guiding hierarchy is destination image → place and route → offer facts → one invitation to enquire. The boundaries excluded a rebrand, new fonts, frameworks, libraries, routes and data schemas, and fabricated claims.

The nine improvements were implemented as separately reviewable slices between 2026-10-10 and 2026-10-13: IMP-DESIGN-01 and 02 on 2026-10-10, IMP-DESIGN-03 to 06 on 2026-10-11, IMP-DESIGN-07 and 08 on 2026-10-12 and IMP-DESIGN-09 on 2026-10-13. The Service Worker cache advanced from `aurora-1.30` to `aurora-1.44`. The project owner accepted IMP-DESIGN-04 visually on 2026-10-30 and gave the final visual approval (PASS) of IMP-DESIGN-09 on 2026-10-31. IMP-DESIGN-03 was completed under an owner-revised scope.

## Design prerequisites

- **P-1 — Self-hosted fonts lacked basic Latin glyphs:** Resolved before IMP-DESIGN-02 by replacing both variable fonts with the official OFL Latin and Latin Extended subsets (SW `aurora-1.33`).
- **P-2 — White labels on the brand gradient and the dark skip link had low contrast:** Resolved within IMP-DESIGN-01; labels moved to a solid action colour with measured contrast of 5.86:1 in the light and 10.56:1 in the dark theme.
- **P-3 — Image captions and alt text did not match the photographs:** Addressed by IMP-DESIGN-03 and by an owner correction of the image descriptions on 2026-10-30; see [Remaining limitations](#remaining-limitations).
- **P-4 — Final photography and its rights were undecided:** Partly decided; see [Remaining limitations](#remaining-limitations).

## Completed improvements

### IMP-DESIGN-01 — Define the atlas material, colour and elevation language for both theme editions

- **Status:** COMPLETED — implemented and verified.
- **Result:** Established the Atlas Aurory colour, elevation and motion system across light and dark themes. Improved visual consistency, contrast and accessibility while preserving responsive and interaction contracts. SW `aurora-1.32`.
- **Verification:** Chromium checks across 12 pages, both themes and three widths. Build, production preview and 306/306 tests passed with extended timeouts. Other browsers and real devices not verified.
- **Impact:** High
- **Effort:** Medium

### IMP-DESIGN-02 — Give typography an editorial display tier and a travel-facts voice

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added editorial display, place-label and travel-facts typography roles. Strengthened hero and offer hierarchy, highlighted Malediwy Lagoon Escape and improved the readability of durations and prices. Preserved semantic and responsive contracts; SW `aurora-1.34`.
- **Verification:** Focused tests (25/25), Service Worker tests (34/34) and build passed. Chromium confirmed responsive typography, font rendering, both themes and 200% zoom. Full suite and other browsers not verified.
- **Impact:** High
- **Effort:** Medium

### IMP-DESIGN-03 — Image metadata and accessibility consistency

- **Status:** COMPLETED — implemented and verified.
- **Result:** The owner redefined the original proposal, "Establish a destination-true photography system without burned-in marks" (Effort: Large), as a metadata task and approved the current photographs with their embedded Aurora mark. Translated the 36 gallery captions into Polish, corrected the Shibuya description and replaced two placeholder Morocco alt texts, preserving the photographs, image pipeline and JSON contracts; the data files are outside the Service Worker cache, so its version was unchanged.
- **Verification:** JSON, asset-integrity, catalogue and focused regression checks passed (`tests/tour-detail.test.js` 28/28). Image-to-text accuracy was not visually verified, and 32 of the 36 shared images were left with conflicting descriptions across the two data files.
- **Impact:** High
- **Effort:** Small

### IMP-DESIGN-04 — Re-art-direct the home hero around one dominant photographic anchor

- **Status:** COMPLETED — implemented and verified.
- **Result:** Recomposed the responsive home hero around the uncropped 3:2 photograph, with balanced text and image proportions across desktop, tablet and mobile. Improved heading wrapping and spacing, removed redundant decorations, and updated responsive image sizing while preserving accessibility, theme and interaction contracts. SW `aurora-1.36`.
- **Verification:** Production build passed after the Service Worker cache update. Owner visual QA accepted at 1440, 1024 and 390 px in both themes on 2026-10-30, including typography, image presentation and responsive layout. Vitest, 200% zoom and other browser engines were not verified.
- **Impact:** High
- **Effort:** Medium

### IMP-DESIGN-05 — Present offers as editorial destination entries on the home page and the listing

- **Status:** COMPLETED — implemented and verified.
- **Result:** Recomposed the home featured offers around Malediwy Lagoon Escape as the lead entry with two secondary entries (05A), and the six listing cards as responsive editorial rows (05B), both with uncropped photography, catalogue region labels, larger titles and travel facts. Filtering, sorting, anchors, links, heading semantics and typography contracts were preserved, and `check:tour-catalogue` now verifies the region labels against `tours.json`. SW `aurora-1.38`.
- **Verification:** Focused Vitest runs passed 66/66 (05A) and 69/69 (05B), and catalogue validation and clean production builds passed for both stages. Owner visual QA passed for 05A and 05B; the full regression suite was not run.
- **Impact:** High
- **Effort:** Large

### IMP-DESIGN-06 — Shape the tour detail as a travel dossier with a route-line itinerary

- **Status:** COMPLETED — implemented and verified.
- **Result:** Rebuilt the tour detail as an editorial travel dossier on the page background: a header band, an uncropped lead photograph with the summary, a continuous route-line itinerary sharing its motif with the about timeline, a separate inclusions panel and an editorial gallery with lead and supporting photographs. Catalogue data, sanitization, semantic structure, enquiry links, loading states and lightbox contracts were preserved. SW `aurora-1.41`.
- **Verification:** Focused Vitest runs passed 57/57 (06A and 06B) and 58/58 (06C), and clean production builds passed for all three stages. Owner visual QA passed for all three stages, including responsive layouts and both themes; the full regression suite was not run.
- **Impact:** Medium
- **Effort:** Medium

### IMP-DESIGN-07 — Recompose the gallery as a destination-grouped photo journal

- **Status:** COMPLETED — implemented and verified.
- **Result:** Rendered the gallery as six destination chapters, each with a place label, an `h2`, a link to its offer through an explicit key-to-tour mapping, an uncropped lead photograph and supporting photographs in rows of three, two or one. Filters now hide whole chapters and `sizes` follow each slot, while the JSON schema, `aria-pressed` filters, lightbox buttons and order, data states and `lightbox.js` were preserved. SW `aurora-1.42`.
- **Verification:** Gallery and lightbox tests passed 37/37 (71/71 with the Service Worker tests), and the production build passed. Headless Chrome 154 at 390, 768 and 1440 px in both themes confirmed the layout, image slots, chapter filtering, keyboard order and lightbox sequence without overflow. The full suite, other browsers and owner visual QA were not run, and the caption-to-photo mismatches from IMP-DESIGN-03 were carried over.
- **Impact:** Medium
- **Effort:** Medium

### IMP-DESIGN-08 — Re-pace the home narrative after the offers: principles, testimony and closing invitation

- **Status:** COMPLETED — implemented and verified.
- **Result:** Replaced the four feature cards with a numbered, hairline-ruled principles list and recomposed the testimonials as one large quotation with quiet underlined tabs and a visible demonstration-content note. Replaced the gradient CTA with a hairline-bounded closing band with one "Wyślij zapytanie" action and removed the generic TripAdvisor and Google links, preserving tab ARIA and keyboard behaviour (`tabs.js` unchanged), headings, IDs and reveal. SW `aurora-1.43`.
- **Verification:** Focused Vitest runs passed 112/113 and 38/38 Service Worker and build-stage tests, and the production build passed; the single failure was a surface-role assertion for the removed `.tour-detail` rule, which also failed at HEAD. Headless Chrome 154 at 390, 768 and 1440 px in both themes confirmed the compositions, keyboard and focus behaviour, contrast, the forced-colors tab state and no overflow, and the 390 px page height fell from 5,953 to 5,522 px. The full suite, other browsers and owner visual QA were not run.
- **Impact:** Medium
- **Effort:** Medium

### IMP-DESIGN-09 — Replace the page-hero map watermark with a purpose-drawn cartographic motif

- **Status:** COMPLETED — implemented and verified.
- **Result:** Replaced the 9,898,547-byte raster-backed `mapa.svg` with an original 1,490-byte vector chart (curved grid, abstract contours, one cyan route and three markers), placed below the hero copy on mobile and beside it from 760 px on all eight subpage heroes, with a quieter variant on the three utility pages. HTML, content, accessibility contracts and legal print rules were preserved; the old asset was retired and the motif precached under SW `aurora-1.44`.
- **Verification:** 89/89 focused Vitest tests, asset, CSS and CSP checks and a clean production build passed, with the same pre-existing `.tour-detail` surface-role failure as at HEAD. Headless Chromium 147 confirmed all 11 pages at 390, 768 and 1440 px in both themes in source and production without overlap or overflow, plus utility keyboard focus, identical print emulation of the three legal pages and the offline fallback; the full suite, other browser engines and paginated print were not checked. The project owner gave the final visual approval (PASS) on 2026-10-31.
- **Impact:** Medium
- **Effort:** Medium

## Excluded defects

The original analysis recorded five defect-class observations outside the design scope. Their status was checked statically on 2026-10-31:

- **Undefined `--shadow` token in `.hero__media`:** no longer present.
- **`.form__field` transition declared as `var(--dur-2) s`:** no longer present.
- **`site.webmanifest` `theme_color` `#0c2d48` matching no token:** now `#f8f7f2`, the light `--bg` token, aligned in IMP-DESIGN-01.
- **Undefined `--text-muted` token in `.contact-details__label`:** still present in `css/modules/subpages.css`.
- **Unreferenced `assets/img/gallery/camera.svg` (1,886,768 bytes):** still present and unreferenced.

## Remaining limitations

- **Photography and rights (P-4):** The owner approved the existing photographs with their embedded Aurora mark when redefining IMP-DESIGN-03, and no photograph was replaced in this cycle. No per-image source or licence record exists, and the gallery lead still attributes the photographs to clients and field photographers.
- **Image descriptions (P-3):** IMP-DESIGN-03 and 07 closed without visual image-to-text verification and with conflicting cross-file descriptions. An owner correction on 2026-10-30 rewrote the alt texts and captions in both data files and seven alt texts in `index.html` and `tours.html`; a static comparison during closure found no conflicting subjects between the two data files for the 36 shared images (20 alt texts identical), but accuracy against the photographs was not re-verified.
- **Surface-role test:** The `.tour-detail` failure recorded in IMP-DESIGN-08 and 09 was addressed on 2026-10-30 by aligning the test with the current tour detail selectors, all of which exist in `css/modules/subpages.css`; the test was not re-run during closure.
- **Open owner content decisions:** The about statistics shown alongside "Od 2010 roku", the client-app and WhatsApp claims and the English offer names are unchanged, with no recorded owner decision.
- **Cross-page coverage:** The planned single cross-page review (12 pages at 390–1920 px, both themes, reduced motion, 200% zoom, keyboard and forced colours) was not recorded; coverage comes from per-improvement checks, none of which covers browser engines other than Chromium or real devices. Within this cycle, the full regression suite was last recorded passing in IMP-DESIGN-01, and `npm run predeploy:check` remains the deployment gate.

## Verification limitations

The original analysis used headless Chrome 154 on Windows at DPR 1, before the P-1 font repair; hover and focus states were assessed from source, and the embedded Google map was not seen. Verification results under individual improvements reflect checks recorded at implementation time, and the final approval of IMP-DESIGN-09 is the owner's confirmation, recorded without additional tests. Preparing this archive involved only editorial review and static repository inspection (Git history, text searches and a comparison of the two image data files); no application tests, production builds or browser checks were run for it.
