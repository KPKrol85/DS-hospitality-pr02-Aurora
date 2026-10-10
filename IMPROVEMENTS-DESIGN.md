# Aurora — Design Improvements

**Analysis date:** 2026-10-10
**Project type:** Multi-page static website: 12 hand-written Polish HTML pages, modular CSS, ES-module JavaScript, JSON-driven tour detail and gallery views and PWA support. It presents a demonstration boutique travel agency, "Aurora Travel", prepared by KP_Code Digital Studio as a sample for the hospitality and tourism sector, as the project notice and `README.md` state.
**Status:** Proposed — awaiting owner review; no implementation authorized
**Analysis mode:** Evidence-based creative design review
**Focus:** Project-wide design

## 1. Methodology and evidence

**Documentation reviewed:** `AGENTS.md`, `CLAUDE.md`, `README.md` (Polish section), `docs/CHANGELOG.md`, the archived improvement reports `docs/archive/improvements/IMPROVEMENTS-UI-2026-10-01.md`, `-UX-2026-10-08.md`, `-QUALITY-2026-10-04.md`, `-TECH-2026-10-06.md` and `-WORKFLOW-2026-10-10.md`, and keyword searches of `docs/archive/plans/PLAN-2026-09-28.md` and `docs/archive/audits/daily-AUDIT-2026-09-22.md`. The repository has no `CONTEXT-PROJECT.md`, active `PLAN.md`, active `IMPROVEMENTS-*.md`, earlier `IMPROVEMENTS-DESIGN.md` or archived design report, so no approved or completed design work had to be excluded. Completed UI work (control typography, image `sizes`, the button contract, focus tokens and typographic roles) is treated as the current baseline and is not proposed again.

**Source reviewed:** `css/style.css` and all nine modules in `css/modules/`; the `<main>` markup of `index.html`, `tours.html`, `tour.html`, `gallery.html`, `about.html`, `contact.html`, `regulamin.html` and `404.html`, plus the shared header, footer and theme bootstrap; the sanitizer in `js/features/tour-detail.js`; `assets/data/tours.json` and `assets/data/gallery-data.json`; `assets/img/logo/logo.svg`, `assets/img/about/mapa.svg`, `site.webmanifest`, `_headers` and `LICENSE.md`; both font files (fontTools); and the bottom-right corners of all 42 production photographs at one width each, plus three tracked raster sources (sharp crops).

**Runtime and visual evidence:** I served the sources read-only with the project's own `node scripts/preview-server.js source --port 8191` and drove headless Chrome 154 over CDP from scratch scripts outside the repository. Settings: DPR 1, `prefers-reduced-motion: reduce`, project notice pre-accepted and theme set through `localStorage`. For full-page captures the reveal state was removed and lazy images loaded.

Captured sets:

- nine pages at 1440 × 900 and 390 × 844 in the light theme;
- six pages at 1440 px in the dark theme;
- `index.html` at 600, 768, 1024 and 1920 px;
- `index.html` and `tour.html?id=islandia` at 390 px in the dark theme.

Of these, I inspected directly:

- **Light theme, 1440 px:** full pages of `index.html`, `tours.html`, `tour.html?id=islandia`, `gallery.html`, `about.html` and `contact.html`, plus enlarged gallery sections; the first viewports of `index.html`, `regulamin.html` and `404.html`.
- **Light theme, other widths:** the full page of `index.html` and `tours.html` at 390 px, the first viewports of `index.html` and `gallery.html` at 390 px, and the first viewports of `index.html` at 600, 768 and 1920 px.
- **Dark theme:** the full page of `index.html` at 1440 px; the first viewports of `tours.html` and `about.html` at 1440 px and of `tour.html?id=islandia` at 390 px.

Computed geometry and rendered fonts (`CSS.getPlatformFontsForNode`) were recorded for every captured set. Rendered button pixels were sampled on `index.html` at 1440 px in both themes.

**Evidence labels:** `Source` (canonical files), `Runtime` (values measured in the running preview), `Visual` (screenshots I inspected directly), `Historical` (archived reports and changelog) and `Design judgment` (professional interpretation, not a defect claim).

**Main limitations:**

- Only Chromium on Windows at DPR 1 was checked.
- The custom fonts do not render (see prerequisite P-1), so typographic judgments describe the system fallback face.
- The embedded Google map was blocked by the offline resolver of the test browser and was not seen.
- Hover and focus states were assessed from source, not captured.
- Photographs were judged visually; their origin and rights are unknown.

## 2. Executive design assessment

Aurora already has a calm, orderly base. The warm paper ground (`#f8f7f2`) with navy ink (`#0c1b33`) and a restrained teal is pleasant in light mode. A complete dark theme exists, and the token system (fluid type scale, typographic roles, spacing, radii, focus) is mature after the UI cycle. Header, footer and page heroes are consistent, and the structure is accessible. The content is also richer than the presentation suggests. Six offers carry region lines ("Europa • Islandia"), durations, prices and day-by-day itineraries, `about.html` has a process timeline, and subpage heroes carry a world-map motif.

The principal limitation is that the visual language is a generic "soft card" template that does not express the positioning the copy claims ("Biuro podróży klasy premium", concierge 24/7, "podróże szyte na miarę"):

- **Cards for every role.** Principles, offers, quotations, the CTA, form fields, data states, legal text and whole tour pages are all white 20 px panels with drop shadows.
- **Identical section pattern.** Every home section repeats eyebrow → heading → divider → equal grid.
- **Framed photography.** Photographs sit inside cards instead of leading.
- **Watermarked imagery.** Every photograph carries a burned-in logo badge, and the set mixes saturated resort imagery with generic office stock.

Without the logo, the site would read as a neutral template.

The project-specific opportunity is to turn the travel material Aurora already owns into an identity. Places, routes, days, itineraries and a map motif can carry an editorial, cartographic design: paper and ink, place labels, route lines and destination-true photography. The recommended direction, **Atlas Aurory**, does this within the existing architecture, without new libraries or a rebrand. Three confirmed prerequisites need resolution first: font glyph coverage, contrast of white labels on the brand gradient, and accuracy of image captions and alt text.

## 3. Current design identity

### Brand and first impression

- **Source:** The mark is a palm and airplane in a circle, drawn in a single colour, `#0cc0df` (`logo.svg`). That colour is not a design token: it appears as a literal in `.logo:hover` (`css/modules/layout.css`). The manifest `theme_color` is `#0c2d48`, also outside the tokens.
- **Visual:** The first viewport at 1440 px shows a split hero: eyebrow, two-line title, lead and two pill buttons on the left, and a rounded, framed resort photograph on the right. At 1920 px the same 556 × 417 px image sits inside the 1200 px container, and the next section already starts in the first viewport.
- **Design judgment:** The first impression is tidy and friendly, but it does not distinguish a premium travel atelier from any well-made template.

### Typography and editorial hierarchy

- **Source:** Manrope (headings) and Inter (body) are declared. The role ladder runs from `--type-page-title` (`--fs-7`) to `--type-small` (`--fs-2`), and `--fs-8` is used only for the home hero below 760 px.
- **Runtime:**
  - At 1440 px the home `h1` is 41.6 px, the same as the `h1` of the tours, about, contact, legal and 404 pages.
  - Offer titles are 16.8 px in both the 384 px home cards and the 1200 px listing cards.
  - Tour facts ("7 dni • od 13 000 PLN / os.") are set at body size.
  - Rendered glyphs come almost entirely from Segoe UI (prerequisite P-1).
- **Design judgment:** The hierarchy is consistent but flat. There is no display voice for the brand moment, and the decision data of a travel offer (place, days, price) is styled as running text.

### Composition and rhythm

- **Runtime (index, 1440 px):** The hero image is 556 × 417 px. Below it come four equal 288 × 213 px feature cards and three equal 384 × 507 px offer cards, then the testimonials card with two floating 72 px icon circles and a centred 760 px CTA card. At 390 px the home page is 6,021 px tall: the features stack to 767 px and the offers to 1,491 px.
- **Runtime (other pages):**
  - The listing shows six identical 1200 × 371 px horizontal cards with a 460 × 345 px image and 138 px of empty space between the facts and the actions.
  - The tour detail is one 1200 × 1,981 px elevated panel.
  - The gallery is a uniform grid of 36 tiles: 4,598 px tall at 1440 px and 11,604 px at 390 px.
- **Design judgment:** Repeated equal grids give every section the same weight. No moment of emphasis or quiet is composed, and offers, the core content, carry less presence than section headings.

### Colour and material language

- **Source:** One elevated surface, `--bg-elev`, serves very different roles: feature and tour cards, `.section--muted`, `.tour-detail`, contact columns, `.legal` and `.legal__toc`, `.data-state` and `.utility-page__card`. Shadows from `--shadow-sm`/`--shadow-md` sit on static content and on every form field.
- **Runtime:** The contact inputs compute `0 18px 40px rgba(6,17,35,.12)`. The light "muted" section renders `rgba(255,255,255,.945)`, lighter than the page itself.
- **Source:** The dark theme swaps `--primary` and `--primary-alt`, so `--gradient-primary` runs light-to-dark instead of dark-to-light. The sand colour of the map motif (`#edcaae`) is the only warm accent and appears nowhere else.
- **Visual:** The dark edition reads as a direct inversion: near-black ground, slightly lighter cards and the same shadows, which barely register.
- **Design judgment:** The material system has no roles. Elevation does not tell content from controls from overlays, and the warm paper quality of the light theme is never developed.

### Imagery and visual storytelling

- **Source and Visual:** All 42 production photographs carry a teal Aurora badge burned into the bottom-right corner. These are the hero, about, contact, the three home offer images and the 36 tour images. The badge is also present in the tracked raster sources in `assets/img-src/`.
- **Visual (crops):** Crop ratios differ by role, so the badge shows as a stray teal dot at varying positions in hero, card and thumbnail corners, or is partly cut off. The ratios are:
  - 16:11 and 16:12 for the hero;
  - 4:3 for offer, tour and about images;
  - 400:260 for gallery tiles.
- **Visual (consistency):** The set mixes visual languages:
  - heavily saturated resort and landscape photographs;
  - a generic office meeting in front of a map wall (about);
  - a smiling call-centre agent with a headset (contact);
  - a New York offer image showing lower Manhattan with the former World Trade Center towers.
- **Source:** The hero photograph (infinity pool and canopy bed) is not tied to any catalogue destination.
- **Visual (gallery):** It is a contact sheet, with no destination storytelling.

### Components and interface expression

- **Source:** Gradient pill buttons (`.btn`), ghost and text variants, uppercase pill tabs, shadowed select filters, gallery chips with the gradient active state, an accordion, a timeline with dots and a left rule (`about.html`), breadcrumbs, eyebrows, and a shared 40 px hairline heading divider.
- **Design judgment:** The heading divider and the about timeline are the two quiet, ownable motifs. Most other components share the same pill-and-shadow vocabulary, so controls and content look alike.

### Motion

- **Source:** Sections and nested cards reveal with a 40 px fade-up (0.6 s), and buttons lift 2 px on hover. Hover lift and zoom also apply to two non-interactive elements:
  - the feature cards, which contain no focusable element, so their `:focus-within` branch never applies (Runtime check);
  - the static hero picture.

  `.hero__media` references an undefined `--shadow` token (Runtime: computed `box-shadow: none`). Reduced motion is respected.
- **Design judgment:** Motion is uniform and mostly decorative. Lift on static content suggests an interactivity that does not exist.

### Responsive art direction

- **Runtime and Visual:** Below 760 px the desktop columns stack.
  - At 390 px the hero image starts at y ≈ 590 px and is 246 px tall, so it appears as a secondary element at the bottom of the first viewport.
  - Between 480 and 759 px a 16% opacity logo watermark appears behind the hero lead (seen at 600 px).
  - Offers become tall single cards, and the gallery becomes one 11,604 px column.
- **Design judgment:** Mobile is a correct collapse of the desktop layout rather than an intentional composition. No breakpoint gets its own image crop.

### Closing composition

- **Source and Visual:** The home page ends with a gradient CTA card. At 760 px and wider its copy is centred and its action sits on the right. The copy uses scarcity wording ("Rezerwuj podróż zanim zrobią to inni", "Ekskluzywne oferty mają ograniczoną dostępność"). A four-column footer follows.
- **Source:** The testimonial review icons link to the generic `https://tripadvisor.com` and `https://google.com` home pages.
- **Design judgment:** The finish is serviceable but not composed. Three consecutive boxed sections precede a footer that has a different, flatter material.

### Supporting-page consistency

- **Source:** The tours, tour detail, gallery, about, contact and three legal pages share `.page-hero` (breadcrumb, title, lead and the `mapa.svg` watermark at 12% opacity). The 404, thank-you and offline pages use one centred card.
- **Source:** `mapa.svg` is a 9,898,547-byte SVG wrapping two embedded PNG images in masks.
- **Visual:** The map is faint and centred without relation to the content. Legal pages are long white panels with a nested, also elevated table-of-contents panel and read proportionately.
- **Design judgment:** Continuity is good. The supporting pages only need the shared material, typography and motif, not bespoke compositions.

## 4. Design prerequisites

| Prerequisite | Evidence | Follow-up boundary |
| --- | --- | --- |
| **P-1 — Self-hosted fonts lack basic Latin glyphs** | **Source:** fontTools shows that `Inter-VariableFont.woff2` and `Manrope-VariableFont.woff2` each map only one of the 62 ASCII letters and digits (no lowercase letters, no digits), and `ó`/`Ó` are missing. The files are unchanged since the initial commit. **Runtime:** on all nine checked pages the `h1` renders mostly in Segoe UI (home `h1`: 6 glyphs from Manrope, 23 from Segoe UI). `.btn` labels render entirely or almost entirely in Segoe UI Semibold, and body text is mostly Segoe UI. | Separate font-repair task: complete Latin and Latin Extended files, or `unicode-range` subsets, plus updated preload hints and the Service Worker cache-version update the build contract requires. All typographic judgments and the acceptance of IMP-DESIGN-02 must be made after the repair. |
| **P-2 — White labels on the brand gradient and the dark skip link have low contrast** | **Runtime:** rendered background pixels behind the "Wycieczki" label give 4.26 → 2.61:1 against white in the light theme and 2.19 → 3.49:1 in the dark theme. **Source** (calculated from the tokens): white on `--gradient-primary` falls from 5.86:1 at `#0f6d8c` to 3.01:1 at the midpoint and 1.72:1 at `#6fd1ff`. The same pairing is used by `.gallery-filter.is-active` and, in the dark theme, by `.skip-link` (white on `#6fd1ff`, 1.72:1 calculated). These values are below the 4.5:1 ratio WCAG 2.x sets for normal-size text. No conformance audit was performed. | Resolve as a defect: either separately, before the colour work, or explicitly within the action-colour definition of IMP-DESIGN-01, with measured contrast in both themes. It must not be left inside an aesthetic change. |
| **P-3 — Image captions and alt text do not match the photographs** | **Source:** all 36 `gallery-data.json` captions are in English on a Polish site. **Visual:** several describe a different photograph. "Desert Dunes Adventure" shows a canyon waterfall. "Sakura Blossoms in Tokyo" shows pine trees. "Japanese Tea House" shows an aerial street crossing. "Brooklyn Bridge by Night" shows a daytime facade. "Yellow Cabs on 5th Avenue" shows a park lake. "Tokyo Night Skyline" shows a temple in daylight. **Source and Visual:** the New York card on `tours.html` uses the alt "Most Brookliński o świcie", but the photograph shows the Statue of Liberty. **Historical:** the TECH archive records that all 36 alt texts differ between the two data files. | Content and accessibility correction task: Polish captions and alt text matched to each photograph. Required before IMP-DESIGN-03 and IMP-DESIGN-07, where captions become visible editorial annotations. |
| **P-4 — Final photography and its rights are undecided** | **Source and Visual:** the burned-in badge is present in all 42 production photographs and in the sampled `assets/img-src/` sources, so clean masters are not in the repository. No per-image provenance or licence record was found, and `LICENSE.md` only excludes third-party photographs from its scope. The gallery lead claims the photographs were taken by clients and field photographers ("Kadry uchwycone przez naszych klientów i fotografów terenowych"), which the repository cannot verify. | Owner decision and sourcing task (see Section 10). Compositions that depend on imagery may be built and reviewed structurally, but final crop and balance approval requires approved assets. |

## 5. Creative design directions

The project supports three genuinely different directions, because its name, catalogue and existing assets point in different ways.

| Dimension | A — Atlas Aurory | B — Zorza nocą | C — Laguna |
| --- | --- | --- | --- |
| Philosophy | Travel as a planned route: the agency as cartographer and concierge. Editorial calm, paper and ink, information as ornament. | The brand name as a night sky: luxury after dark, luminous accents on deep ink, with the dark edition as the primary experience. | An immersive postcard: photography carries the story, with a bright resort palette and type set over images. |
| Typography | Manrope display tier used sparingly, Inter text, small-caps place labels, tabular figures for days and prices. | Same families, light display weights, wide-tracked caps, very sparse copy. | Oversized display type over photographs, minimal supporting text. |
| Colour / material | Warm paper and navy ink; deep teal for actions; brand cyan as the signature line colour; the map's sand as a warm accent. Hairlines instead of shadows. The dark edition is a designed "night chart". | Indigo-black ground, cyan and teal luminous gradients, translucent panels; the light edition becomes secondary. | White and turquoise, saturated lagoon gradients, full-bleed media, few surfaces. |
| Composition | Editorial grid with lead and supporting hierarchies, route-line sequences, captions as annotations. | Centred spotlight compositions with large empty fields. | Stacked full-bleed image bands with overlay panels. |
| Imagery | Destination-true photography with one consistent natural grade; works with fewer, better images. | Dusk, night and aurora imagery; suits Islandia, conflicts with the Maldives, Morocco and most daylight catalogue photographs. | Needs a large set of consistent, high-end photographs; the current set (watermarks, mixed grades) is unsuitable. |
| Components | Offers as entries, itinerary as a route, place labels and fact strips; elevation only for interactive surfaces and overlays. | Glowing outlines, glass panels, light-trail dividers. | Image cards with overlaid text and edge-to-edge strips. |
| Motion | Minimal: subtle reveal, no lift on static content. | Slow glows and gradient shifts; decorative-motion risk. | Zoom and parallax temptations; heavy media transitions. |
| Mobile | A single-column "travel journal" with readable labels and facts and art-directed crops. | A dark single column; contrast-sensitive. | Tall full-screen images lengthen an already 6,021 px home page. |
| Advantages | Builds on existing content, tokens and motifs; distinctive without trend; equal light and dark editions; text stays on calm ground. | Strong link to the name; memorable. | Immediate emotional appeal. |
| Trade-offs | Needs typographic discipline and the font repair; a quieter first impression than C. | Conflicts with sunny destinations and the system-driven default theme; glow and glass trend risk; demanding contrast; most imagery replaced. | Fully dependent on new photography and rights; text-over-image contrast; heavier pages; generic travel-template risk. |
| Technical implications | CSS tokens and modules plus targeted markup in existing pages; one new lightweight SVG motif; no libraries. | Token overhaul; a default-theme change touches the inline bootstrap, CSP hashes, `theme-color` and the manifest. | Art-directed `<picture>` everywhere, larger image budget, overlay contrast handling; carousel pressure. |

## 6. Recommended direction

**Recommendation: A — Atlas Aurory.**

**Rationale.** Aurora's real substance is travel planning: places, routes, durations, inclusions and a concierge who organizes them. Direction A makes that substance visible. It turns content the project already has (region lines in `tours.json`, day-by-day itineraries, the about timeline, the map motif, the warm paper ground) into the brand's visual vocabulary, so distinctiveness comes from the project's own material rather than from decoration. Both themes can be designed as equal editions, text stays on calm grounds where contrast can be controlled, and the work fits the vanilla CSS and HTML architecture.

**Strengths preserved:** the paper and navy palette, the token and typographic-role system, the button size contract and focus tokens, the heading divider, the timeline motif, header and footer structure, page-hero continuity, both themes, reduced-motion behaviour and every interaction contract (filters, tabs, accordion, lightbox, enquiry links, data states, PWA).

**Primary design objective:** replace the uniform card template with an editorial, cartographic system in which place, route and offer facts lead and elevation is reserved for what can be operated.

**Intentional boundaries:**

- No rebrand: the name, the mark and the Manrope/Inter pairing stay.
- No new fonts, frameworks, animation libraries, routes, features or data schemas.
- No change to DOM reading order, section IDs, `data-*` contracts or the catalogue checker's expectations without an explicit update in the same change.
- No fabricated claims, prices, testimonials or image provenance.
- Legal and utility pages receive only the shared system, not bespoke compositions.

**Guiding hierarchy:** destination image → place and route → offer facts → one invitation to enquire.

## 7. Prioritized design improvements

Priorities express design value and dependency, not defect severity. P1 items establish the direction or shape the main visitor journey; P2 items extend it to secondary compositions. The proposals do not authorize implementation. Acceptance criteria describe the verification of a future approved implementation, not the current state.

### IMP-DESIGN-01 — Define the atlas material, colour and elevation language for both theme editions

- **Status:** COMPLETED — implemented and verified (2026-10-10).
- **Result:** Completed the Atlas Aurory design system in three stages: colour and action contrast (01A), editorial and interactive surfaces with elevation (01B), and consistent hover and motion behavior (01C). Established cohesive light and ink-blue dark themes, removed misleading hover effects from static content, and improved visual hierarchy and accessibility. Preserved responsive layouts, keyboard focus, reduced-motion behavior and existing interaction contracts. Updated Service Worker to `aurora-1.32`.
- **Verification:** Chromium checks covered all 12 pages, two themes and three viewport widths (72 combinations), with no measured layout or interaction regressions. Contrast, keyboard focus, forced colours and reduced motion were verified. `npm run build` and production preview passed. The full test suite passed with extended timeouts (306/306); the default run had three timeouts in tests that passed separately. Firefox, Safari, real devices and assistive technologies were not verified.
- **Impact:** High
- **Effort:** Medium

### IMP-DESIGN-02 — Give typography an editorial display tier and a travel-facts voice

- **Status:** Proposed
- **Priority:** P1
- **Affected area:** Typographic tokens and roles (`tokens.css`, `base.css`); home hero title, tour-detail title, offer titles, eyebrows, region lines, durations, prices and itinerary day labels.
- **Evidence:** Source: `--type-page-title` (`--fs-7`) is the largest role, and `--fs-8` (max 3 rem) applies to the home hero only below 760 px. `.tour-card__title` uses `--fs-3`, and `.tour-detail__meta` and `.tour-card__meta` render facts as text runs. `tours.json` holds `region`, `days` and `priceFrom` for every offer. Runtime: home `h1` 41.6 px equals every subpage `h1` at 1440 px; offer titles are 16.8 px in 384 px and 1200 px cards; tour facts are set at the 16.8 px body size. Historical: IMP-UI-05 established the role ladder and its test.
- **Current state:** One consistent ladder from page title to small text, no display tier, and offer facts and place names set as body or small text.
- **Design judgment:** The home brand moment has no more typographic presence than a 404 page. Place, duration and price, the facts a traveller compares, are visually indistinguishable from description.
- **Proposed improvement:** Extend the role system with:
  - a display tier, used only for the home hero, the tour-detail title and a lead offer;
  - a "place label" role for region lines and eyebrows, read as atlas labelling;
  - a "facts" role for durations, prices and day numbers, with lining tabular figures and a consistent unit treatment ("dni", "PLN / os.");
  - tuned heading tracking and weights for the repaired Manrope.

  All within the existing families.
- **Expected value:** A recognizable editorial voice, a clear top-level hierarchy, and offer data that can be scanned and compared at a glance.
- **Implementation scope:** New or adjusted `--type-*` tokens and role classes, applied in markup through role classes as the IMP-UI-05 contract requires. Semantic heading levels, sanitized tour content (descendant selectors only) and the button size contract stay unchanged. `tests/typography-roles.test.js` is extended for the new roles.
- **Dependencies:** P-1; IMP-DESIGN-01 for label and fact colours.
- **Acceptance criteria:**
  - `CSS.getPlatformFontsForNode` reports Manrope or Inter for all glyphs of the hero title, a section title, body text and a button label.
  - The home hero title is visibly larger than every subpage `h1` at 390, 1024 and 1440 px and wraps to at most three lines without a single-word last line.
  - Durations and prices use the facts role on `index.html`, `tours.html` and `tour.html`, with aligned figures in the listing.
  - Region lines use the place-label role wherever shown.
  - Heading levels are unchanged; text reflows without overlap at 200% zoom; both themes are checked.
- **Impact:** High
- **Effort:** Medium

### IMP-DESIGN-03 — Establish a destination-true photography system without burned-in marks

- **Status:** Proposed
- **Priority:** P1
- **Affected area:** Photography in `assets/img-src/` and its generated output in `assets/img/` (hero, tour-index, tours, about, contact); image roles on `index.html`, `tours.html`, `tour.html`, `gallery.html`, `about.html` and `contact.html`.
- **Evidence:** Source and Visual: the corner badge is present in all 42 production photographs and in the sampled sources; crop ratios are 16:11 and 16:12 (hero), 4:3 (cards, tour main image, about) and 400:260 (gallery). Visual: the badge appears as a stray teal dot in hero, card and thumbnail corners. The set mixes saturated HDR resort imagery with generic office stock (about meeting, contact headset agent) and a New York image showing the former World Trade Center towers; the hero image is not linked to a catalogue destination. Source: `scripts/build-images.js` generates four widths in AVIF, WebP and JPG per image (`README.md`).
- **Current state:** Photography is a heterogeneous stock-like collection, stamped with the logo, with role-specific ratios but no defined focal points or grading.
- **Design judgment:** A raster stamp reads as a stock watermark and undermines a premium editorial presentation. Brand presence should come from the layout, not from marks inside photographs. Generic office imagery contradicts the boutique-concierge narrative, and inconsistent grading prevents the pages from feeling curated.
- **Proposed improvement:** Write and adopt a photography direction covering:
  - natural light and one consistent warm, restrained grade;
  - destination-true subjects for each offer (an establishing place image, an experience image and a detail);
  - people only where authentic or clearly representative;
  - no burned-in marks;
  - defined roles with ratios and focal points: a hero landscape with a separate portrait mobile crop, offer entries, the tour lead image, gallery lead and supporting tiles, and about/contact;
  - an asset register (role, ratio, focal point, Polish alt, caption, source and licence).

  Image sourcing itself is a later authorized task.
- **Expected value:** A curated, credible visual story and a coherent atmosphere across pages. Clean images allow the compositions in IMP-DESIGN-04 to 07 to use photography as the lead element.
- **Implementation scope:** Replacement masters in `assets/img-src/`, regenerated with `npm run build:images`. The `gallery-data.json` and `tours.json` schemas stay unchanged, and base names are kept where possible. `<picture>` markup may gain art-directed `media` sources for the hero. The asset-integrity and responsive-image checks stay green. Slices: direction brief; hero and offer images; tour galleries per destination; about/contact.
- **Dependencies:** P-3 and P-4; owner approval of sourcing and rights.
- **Acceptance criteria:**
  - No production photograph contains a burned-in mark (visual review of every image in every role crop).
  - Every image has a recorded source and licence.
  - Each offer's images depict its destination, as confirmed by the owner, and match Polish alt text and captions.
  - Focal subjects stay inside the visible box at 390, 768, 1440 and 1920 px.
  - Grading reads as one set when the home, listing and gallery pages are compared side by side in both themes.
  - Per-variant file sizes stay within the range of the current variants unless the owner accepts a difference.
  - The asset-integrity check and `tests/responsive-images.test.js` pass.
- **Impact:** High
- **Effort:** Large

### IMP-DESIGN-04 — Re-art-direct the home hero around one dominant photographic anchor

- **Status:** Proposed
- **Priority:** P1
- **Affected area:** The `.hero` section of `index.html` and the hero rules in `css/modules/sections.css`.
- **Evidence:** Source: `.hero__grid` is a 1.1fr/1fr split from 760 px. `.hero__media` is a rounded framed picture with a hover lift and zoom. `.hero__logo` is a 16% opacity logo shown only between 480 and 759 px. The image is eager with `fetchpriority="high"`. Runtime: image 556 × 417 px at both 1440 and 1920 px; at 390 px it starts at y ≈ 590 px and is 246 px tall. Visual: at 600 px the watermark sits behind the lead text; at 1920 px the next section appears in the first viewport.
- **Current state:** Copy and image share the hero with similar weight, the photograph is boxed like a card, and mobile shows it last.
- **Design judgment:** "Świat w zasięgu Twojej podróży" deserves one dominant visual anchor. The current split hero, like many templates, does not establish an image-led brand moment, and the breakpoint-specific watermark adds clutter.
- **Proposed improvement:** Recompose the hero so the approved photograph is the dominant anchor (a wide or bleeding composition within the section), with title, lead and the two existing actions on a calm paper zone rather than over uncontrolled image areas. Add an optional true place caption in the place-label role, and use art-directed crops per breakpoint, including a mobile crop that brings the image into the first view. The 480–759 px watermark and the non-interactive hover lift are removed.
- **Expected value:** A distinctive first impression that carries the promise of travel, with clearer hierarchy at every width.
- **Implementation scope:** Hero markup and styles only. Keep the `h1` → lead → actions → image DOM order, the LCP attributes with updated `sizes` (responsive-image tests), the alt text, reduced-motion behaviour and both themes. Header, navigation and the following sections are out of scope.
- **Dependencies:** IMP-DESIGN-01, IMP-DESIGN-02, IMP-DESIGN-03 (approved hero image and crops), P-1, P-2.
- **Acceptance criteria:**
  - At 390, 768, 1024, 1440 and 1920 px the photograph is the largest element of the hero, and title, lead and both actions remain within the first viewport at 390 × 844 and 1440 × 900.
  - No hero text sits on photographic pixels unless its rendered contrast measures at least 4.5:1.
  - The image focal point is visible in every crop.
  - DOM order and the LCP attributes are unchanged in kind.
  - No hero element transforms on hover or under reduced motion.
  - Both themes and 200% zoom show no overlap.
- **Impact:** High
- **Effort:** Medium

### IMP-DESIGN-05 — Present offers as editorial destination entries on the home page and the listing

- **Status:** Proposed
- **Priority:** P1
- **Affected area:** The `.cards-grid` featured offers on `index.html`, the `.tour-card--detailed` entries on `tours.html` and the shared `.tour-card` styles.
- **Evidence:** Source: equal-width `.cards-grid` columns (two from 768 px, three from 1280 px); a padded `.tour-card` with an inner rounded image; `.tour-card--detailed` at 460 px plus 1fr; titles at `--fs-3`. `tours.json` provides a region for every offer, but the listing cards do not show it. The listing cards carry `id`, `data-type`, `data-region`, `data-days` and `data-price`. Runtime: home cards 384 × 507 px; listing entries 1200 × 371 px with a 460 × 345 px image, a 16.8 px title and a 138 px empty gap before the actions. Visual: six identical listing entries and three identical home cards.
- **Current state:** Offers are uniform cards in which title, place and facts have less presence than surrounding section headings, and no offer leads.
- **Design judgment:** The catalogue is the core content but reads like a product grid. The space in the listing entries is unused, while the facts that differentiate offers are small.
- **Proposed improvement:** Create one offer-entry composition shared by both pages:
  - the image as primary element;
  - the place label (region line);
  - a prominent title;
  - a facts strip (days, price-from);
  - one descriptive line and the existing actions.

  The home section uses a lead entry plus two secondary entries; which offer leads is an owner decision. The listing uses consistent editorial rows; alternating the media side at 1024 px and wider is optional and must not change DOM order. Card chrome follows IMP-DESIGN-01.
- **Expected value:** Offers become the visual centre of the journey, comparison is easier, and the destination story carries from the home page to the listing.
- **Implementation scope:**
  - Markup and styles of the offer entries on the two pages.
  - Preserve listing `id`s and `scroll-margin-top`, all `data-*` attributes, filtering, sorting, the empty-result state, the result counter, enquiry and detail links, heading levels (`h3` on the home page, `h2` on the listing), and responsive `sizes` updated with the layout.
  - The titles and "N dni" durations checked by `check:tour-catalogue` stay in sync. If region labels are added to the static cards, the checker is extended to cover them in the same change.
  - Slices: shared entry composition; home lead and secondary; listing rows.
- **Dependencies:** IMP-DESIGN-01, IMP-DESIGN-02; IMP-DESIGN-03 for final crops (structure may be built with current images, final approval only with approved assets).
- **Acceptance criteria:**
  - At 390, 768, 1024 and 1440 px every offer entry shows image, place label, title, days and price in that visual order, with the title in a larger role than body text.
  - The home page has exactly one lead entry.
  - The listing has no unused gap larger than the entry's internal spacing scale between facts and actions.
  - Filters, sorting, the empty state, the counter and anchor landings (`tours.html#tokio`, `#malediwy`, `#nyc`) behave as before.
  - `check:tour-catalogue`, `tests/tours-filters.test.js` and `tests/responsive-images.test.js` pass.
  - Both themes and keyboard order are verified.
- **Impact:** High
- **Effort:** Large

### IMP-DESIGN-06 — Shape the tour detail as a travel dossier with a route-line itinerary

- **Status:** Proposed
- **Priority:** P2
- **Affected area:** `tour.html` and the tour-detail rules in `css/modules/subpages.css` and `base.css`.
- **Evidence:** Source: one elevated `.tour-detail` panel holds the header, enquiry button, main image, summary, `ol.tour-itinerary` (`<strong>Dzień N:</strong>` items), `ul.tour-summary-list` inclusions and the gallery. The sanitizer in `js/features/tour-detail.js` allows `class` only on `UL` and `OL`. `about.html` already draws a route-like `.timeline` with dots and a left rule. Runtime: panel 1200 × 1,981 px at 1440 px; itinerary at 16.8 px; gallery tiles 373 × 243 px. Visual: Islandia detail at 1440 px in the light theme and at 390 px in the dark theme.
- **Current state:** The richest travel content (day-by-day route, inclusions, gallery) is a plain list inside one large card.
- **Design judgment:** The itinerary is Aurora's most characteristic content and the natural signature of an atlas identity, yet it has no visual form.
- **Proposed improvement:** Compose the detail as a dossier:
  - a header band with place label, display title, facts strip and the enquiry action;
  - the lead image with the summary;
  - the itinerary as a route line of numbered day stops, sharing one visual language with the about timeline;
  - inclusions as a distinct panel;
  - a gallery with a lead and supporting rhythm;
  - the page on the paper ground rather than inside one elevated card.
- **Expected value:** A memorable, scannable offer page that turns planning content into identity and links the about page and the tour pages through one motif.
- **Implementation scope:** Styles for the existing structure and classes. Keep the sanitizer allowlist unchanged unless a change is separately reviewed, along with the `tours.json` schema, the loading and unavailable states, the enquiry-link contract, the breadcrumb, lightbox behaviour and the heading structure. Update the about `.timeline` only to share the route motif.
- **Dependencies:** IMP-DESIGN-01, IMP-DESIGN-02; IMP-DESIGN-03 for final gallery images.
- **Acceptance criteria:**
  - For all six offers at 390, 768 and 1440 px in both themes, each itinerary day reads as a numbered stop on one continuous route line, and inclusions are visually distinct from the itinerary.
  - Place, title, days, price and enquiry action are visible together in the header band at 1440 px.
  - The about timeline and the itinerary share the same motif.
  - Loading, failure and not-found states render as before.
  - `tests/tour-detail.test.js` and `tests/lightbox.test.js` pass, and reading order is unchanged.
- **Impact:** Medium
- **Effort:** Medium

### IMP-DESIGN-07 — Recompose the gallery as a destination-grouped photo journal

- **Status:** Proposed
- **Priority:** P2
- **Affected area:** `gallery.html`, the rendering structure in `js/features/gallery.js` and the gallery rules in `css/modules/subpages.css`.
- **Evidence:** Source: 36 figures from `gallery-data.json` render into one `.gallery-grid` with 1, 2 or 3 columns, a 400:260 image ratio and `--fs-1` captions; sticky filter chips with `aria-pressed`. Gallery country keys (`maledivy`, `new-york`, `tokio`) differ from the tour IDs (`malediwy`, `nowy-jork`, `tokio-kyoto`). Runtime: 4,598 px tall at 1440 px and 11,604 px at 390 px. Visual: twelve identical rows with English captions.
- **Current state:** The gallery is an undifferentiated contact sheet ordered by destination, with no destination headings or link to the related offer.
- **Design judgment:** Destination grouping and rhythm would turn an archive into a visual journal that supports the offers.
- **Proposed improvement:** Group images by destination, each group opening with a place label and heading and an optional link to the matching offer (requires an explicit key mapping). Each group gets a lead image and supporting tiles in a varied but systematic rhythm, with Polish captions as quiet annotations. The filters keep their behaviour.
- **Expected value:** Stronger storytelling, visible connection between imagery and offers, and a less monotonous mobile scroll.
- **Implementation scope:** Gallery markup produced by `gallery.js` and its styles. Preserve the `gallery-data.json` schema, filter buttons and `aria-pressed`, the lightbox trigger buttons with Polish labels, the lightbox sequence matching the visible order, the data-state messages, responsive `sizes` and reduced motion. Heading levels nest under the page `h1`.
- **Dependencies:** P-3, IMP-DESIGN-03, IMP-DESIGN-01, IMP-DESIGN-02.
- **Acceptance criteria:**
  - With "Wszystkie" active, each of the six destinations is identifiable by its heading at 390, 768 and 1440 px, and each group has one lead image.
  - Filtering shows only the chosen group, and lightbox previous/next follow the visible order.
  - Captions are Polish and match the photographs.
  - `tests/gallery.test.js` and `tests/lightbox.test.js` pass (updated only for intended structure, not weakened).
  - Both themes and keyboard traversal are verified.
- **Impact:** Medium
- **Effort:** Medium

### IMP-DESIGN-08 — Re-pace the home narrative after the offers: principles, testimony and closing invitation

- **Status:** Proposed
- **Priority:** P2
- **Affected area:** The "Dlaczego Aurora Travel", "Opinie klientów" and CTA sections of `index.html` and their styles in `components.css` and `sections.css`.
- **Evidence:** Source: four `.feature-card` articles with icons and hover lift; tabs inside a `.testimonials` card; `.testimonials__icons` circles linking to `https://tripadvisor.com` and `https://google.com`; a 760 px gradient `.cta` card with scarcity copy. Runtime: features 4 × 288 × 213 px at 1440 px and 767 px stacked at 390 px. Visual: three consecutive eyebrow → heading → boxed-grid sections; at 760 px and wider the CTA's copy is centred and its action right-aligned.
- **Current state:** The second half of the home page repeats the same boxed pattern three times and ends on a generic gradient card.
- **Design judgment:** Principles are presented in a software-feature idiom, testimony has no weight as a moment, and the page ends without a composed finish.
- **Proposed improvement:** Re-pace the sections:
  - the principles as an annotated typographic list (ruled or numbered, no shadowed cards);
  - the testimony as one editorial quotation moment with the existing tabs restyled as quiet category labels;
  - the closing invitation as a calm full-width band that hands off to the footer with one primary action.

  Review-platform icons and copy changes follow the owner decisions in Section 10.
- **Expected value:** Clear moments of emphasis and quiet, a more credible tone, and a finished closing sequence.
- **Implementation scope:** Markup and styles of these three sections. Preserve the tabs' ARIA roles and keyboard behaviour, `aria-labelledby` IDs, heading levels and reveal behaviour. The footer structure is unchanged; only its relation to the closing band is designed.
- **Dependencies:** IMP-DESIGN-01, IMP-DESIGN-02; owner decision on testimonials, review links and CTA copy.
- **Acceptance criteria:**
  - At 390, 768 and 1440 px in both themes, the three sections use three distinct compositions, none of them a grid of shadowed cards.
  - The quotation is the dominant element of its section.
  - The closing band has exactly one primary action aligned with its copy.
  - Tabs remain operable by arrow keys with correct `aria-selected`.
  - No external review link points to a generic platform home page unless the owner confirms it.
  - The home page height at 390 px does not exceed the current 6,021 px.
- **Impact:** Medium
- **Effort:** Medium

### IMP-DESIGN-09 — Replace the page-hero map watermark with a purpose-drawn cartographic motif

- **Status:** Proposed
- **Priority:** P2
- **Affected area:** `.page-hero` on `about.html`, `tours.html`, `tour.html`, `gallery.html`, `contact.html`, `regulamin.html`, `polityka-prywatnosci.html` and `cookies.html`; the utility-page card on `404.html`, `dziekuje.html` and `offline.html`; `assets/img/about/mapa.svg`.
- **Evidence:** Source: `.page-hero::before` draws `mapa.svg` at 12% opacity, centred, at `clamp(220px, 26vw, 420px)`, on eight pages. The file is 9,898,547 bytes and wraps two embedded PNG images in SVG masks; its colour is sand `#edcaae`. Utility pages carry no motif. Visual: the map reads as a faint texture placed without relation to title or content in both themes.
- **Current state:** The cartographic idea exists but is a heavy raster texture used as a background watermark.
- **Design judgment:** The motif is the right idea for Aurora, but at 12% opacity and fixed centring it is decoration rather than identity. A real vector route-and-map motif could carry the direction across every supporting page at a fraction of the weight.
- **Proposed improvement:** Draw one lightweight vector motif: simplified map linework, route lines and place markers in the line and accent tokens from IMP-DESIGN-01. Place it deliberately in page heroes, aligned to the grid and never behind running text, with a reduced variant for utility pages. The legal pages receive only the shared motif and material.
- **Expected value:** A signature element that makes subpages recognizable without the logo, and a lighter asset in place of a 9.9 MB file.
- **Implementation scope:** A new SVG asset (vector, no embedded raster) and the page-hero and utility-page rules. Keep breadcrumb, title and lead structure, page content, print styles and both themes. `mapa.svg` is retired only after no reference remains, with the asset checks and the Service Worker precache rules checked.
- **Dependencies:** IMP-DESIGN-01.
- **Acceptance criteria:**
  - All eight page heroes and three utility pages show the motif at 390, 768 and 1440 px in both themes, without overlapping running text.
  - The motif asset contains no embedded raster data, and its size is recorded and approved.
  - It is decorative to assistive technology.
  - Print output of legal pages is unchanged.
  - `check:assets` and `check:css-assets` pass.
- **Impact:** Medium
- **Effort:** Medium

## 8. Suggested implementation sequence and dependencies

1. **Owner decisions:** approve Direction A and the decisions in Section 10.
2. **Prerequisites:**
   - P-1 font repair.
   - P-2 action and skip-link contrast, as a separate fix or as the first slice of IMP-DESIGN-01.
   - P-3 caption and alt correction.
   - P-4 photography sourcing and rights; this asset track can start immediately and run in parallel.
3. **Foundations:**
   - IMP-DESIGN-01 (material, colour and elevation, including the bootstrap, CSP, `theme-color` and manifest sync).
   - IMP-DESIGN-02 (typography, after P-1).
4. **Asset system:** IMP-DESIGN-03 (direction brief → masters → `npm run build:images`), in parallel with step 3.
5. **Primary journey compositions:** IMP-DESIGN-04 (needs the approved hero image), then IMP-DESIGN-05. Both can be built structurally earlier, but final visual approval waits for the step 4 assets.
6. **Independent secondary work:**
   - IMP-DESIGN-09 (motif, needs only IMP-DESIGN-01);
   - IMP-DESIGN-06 (dossier);
   - IMP-DESIGN-08 (home narrative, after the owner decision on testimonials).
7. **Asset-dependent secondary work:** IMP-DESIGN-07 (gallery, needs P-3 and IMP-DESIGN-03).
8. **Cross-page review:** all 12 pages at 390, 768, 1024, 1440 and 1920 px in both themes, reduced motion, 200% zoom, keyboard traversal and forced colours, compared against the guiding hierarchy.

Every slice that changes `css/` or `js/` changes the production bundles. It therefore needs the Service Worker `VERSION` update and `npm run record:sw-bundles`, as the build contract described in `README.md` requires. `npm run predeploy:check` remains the gate before deployment. Each proposal should be delivered as separately reviewable slices, never as one redesign change.

**Recommended verification per slice:**

- headless or real-browser screenshots at the widths and themes named in its acceptance criteria;
- rendered-font checks with `CSS.getPlatformFontsForNode`;
- rendered-pixel contrast sampling for any text on colour or image;
- DOM-order and keyboard checks for recomposed sections;
- the focused existing tests listed in each proposal.

The full suite is needed only at the pre-deployment gate.

## 9. Verification performed and limitations

**Performed:**

- **Commands and inspection:** read-only Git inspection (`git status`, `git log`) and source and documentation reads.
- **Font coverage:** fontTools coverage analysis of both font files.
- **Image corners:** sharp crops of the bottom-right corner of all 42 production photographs (one width each) and of three raster sources, run outside the repository with the main checkout's `node_modules`.
- **Preview server:** `node scripts/preview-server.js source --port 8191`, read-only, serving sources.
- **Headless Chrome (CDP):** headless Chrome 154 with a temporary profile, driven over CDP by scratch scripts in the session scratchpad:
  - first-viewport and full-page screenshots of 9 pages at 1440 and 390 px in the light theme, 6 pages at 1440 px in the dark theme, `index.html` at 600, 768, 1024 and 1920 px, and `index.html` and `tour.html?id=islandia` at 390 px in the dark theme;
  - computed geometry, rendered-font queries and pixel sampling behind the "Wycieczki" button label in both themes.

**Not performed:** `npm test`, `npm run build` and any other npm script. No real devices, Safari or Firefox, DPR above 1, assistive technology, live-site check, or captured hover and focus states. No formal contrast or WCAG audit; the ratios in P-2 are rendered samples and token calculations only. Image origin and rights, and the location of every photograph, were not verified.

**Observed but outside this design scope (defect-class, left for an audit):**

- `.hero__media` uses the undefined `--shadow` token (computed `none`).
- `.contact-details__label` uses the undefined `--text-muted` token.
- The `.form__field` transition declares `var(--dur-2) s`.
- `assets/img/gallery/camera.svg` (1,886,768 bytes) is not referenced.
- `site.webmanifest` declares `theme_color` `#0c2d48`, which matches no token.

No project file other than `IMPROVEMENTS-DESIGN.md` was created or modified. Screenshots and scripts stay in the session scratchpad and are not part of the repository.

## 10. Owner decisions required

- **Creative direction:** approve Direction A (Atlas Aurory) or choose B or C.
- **Photography:** source and approve watermark-free, destination-true images with recorded rights. Decide whether authentic team or office photographs exist, or whether people imagery should be removed from about and contact. Decide whether the gallery lead's claim that clients and field photographers took the photographs stays.
- **Brand mark and colour:** confirm that the logo stays unchanged and that its cyan `#0cc0df` may become a formal token and signature line colour.
- **Testimonials and review links:** keep the demonstration testimonials as they are, label them, or remove them; replace or remove the generic TripAdvisor and Google links.
- **Content claims shown in new compositions:** review the statistics ("14 lat doświadczenia", "86%", "120+"), which sit alongside "Od 2010 roku" on `about.html`. Review the client-app and WhatsApp claims and the scarcity wording of the home CTA before they gain more visual prominence.
- **Offer naming and lead offer:** decide whether the English offer names ("Private Edition", "Lagoon Escape", "Signature Expedition") remain on the Polish site, since they affect display typography, and which offer leads the home section.
