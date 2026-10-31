# Changelog

All significant changes to Aurora Travel are documented in this file.

## Entry policy

A change is significant when a future maintainer or the project owner would reasonably need to know that one of the following changed:

- user-visible behavior, including meaningful UI, UX, or public content changes;
- accessibility behavior or accessibility contracts;
- build behavior, build guards, or npm scripts;
- test infrastructure or verification tooling;
- the dependency set;
- deployment or hosting workflow;
- PWA, service-worker, cache, or offline behavior;
- architecture, sources of truth, or important project maintenance contracts.

Judge by impact, not by file count. A small visual change is recorded when it affects behavior, accessibility, or a shared component contract. Editing a file alone does not justify an entry.

Not recorded: improvement-report status updates and archiving, commit-only or tracking-document changes, temporary verification probes, minor internal documentation corrections, and isolated cosmetic adjustments without broader impact.

For each implementation task, determine `Changelog: yes` or `Changelog: no`. Add entries only when authorized within the approved task scope.

## [Unreleased]

### Added

- Added the Aurora Travel static website with 12 pages covering travel offers, gallery, company information, contact, legal documents, and utility states.
- Added tour filtering by type and region, price and duration sorting, and an accessible live results counter.
- Added catalogue-driven tour details using `assets/data/tours.json`.
- Added a destination-filtered gallery using `assets/data/gallery-data.json` and a shared interactive lightbox.
- Added a Netlify-compatible contact form with honeypot protection and accessible client-side validation.
- Added persistent light and dark themes with system-preference fallback.
- Added accessible mobile navigation and lightbox controls with keyboard support, focus trapping, and focus restoration.
- Added reduced-motion support for animations, transitions, and reveal effects.
- Added PWA support with versioned Service Worker caches, offline fallback, and an application update notice.
- Added a web app manifest with standard and maskable icons, installation screenshots, and application shortcuts.
- Added responsive AVIF/WebP/JPEG images, self-hosted variable fonts, and lazy loading.
- Added canonical URLs, Open Graph and Twitter metadata, JSON-LD, sitemap, and page-specific indexing rules.
- Added empty-result handling for tour filters with reset and focus restoration.
- Added loading, retry, and unavailable-data states for the gallery and tour details.

### Changed

- **Breaking:** Replaced the MIT license with the bilingual KP_CODE Proprietary Project License 1.0 and updated package licensing metadata.
- Updated the terms, privacy policy, and cookies policy to reflect actual functionality, data processing, and project ownership.
- Consolidated legal-page styling with responsive tables and accessible presentation.
- Replaced the dismissible project notice with persistent demonstration disclosures in the footer.
- Attributed real contact details, including the corrected `12/31` address, to KP_Code Digital Studio.
- Converted the contact form, FAQ, and contact CTAs from fictional travel enquiries to inquiries about the website project.
- Aligned public content, metadata, structured data, and legal information with Aurora Travel's fictional character.
- Updated contact shortcuts and confirmation messaging to identify KP_Code Digital Studio as the recipient.
- Localized the Service Worker update notice and integrated it with the theme and layering system.
- Separated Service Worker lifecycle handling into a dedicated JavaScript module.
- Consolidated form validation messages around native field constraints and immediate error-state clearing.
- Standardized native control typography, button variants, and responsive image sizing.
- Unified keyboard focus styling through shared theme-aware tokens.
- Introduced shared typography roles for page titles, section headings, leads, and body text.
- Consolidated responsive gallery and tour image markup into a shared runtime module.
- Improved theme initialization, background colors, and native control presentation across light and dark modes.
- Introduced the Atlas Aurory color system with semantic surface, text, border, action, and brand tokens.
- Established consistent flat, raised, and overlay surfaces across editorial content and interactive components.
- Refined hover states, elevation, and motion while preserving keyboard focus and reduced-motion behavior.
- Introduced editorial display typography and distinct visual treatments for destinations, prices, and durations.
- Reworked the home hero into a responsive editorial composition with an uncropped photograph.
- Reorganized featured travel offers into an editorial layout with catalogue-aligned details.
- Rebuilt the tour listing as responsive destination rows with prominent photography and offer information.
- Restructured tour details into an editorial layout separating essential facts, photography, and itinerary.
- Presented tour itineraries and the company timeline as vertical routes with shared markers.
- Rebuilt the tour detail gallery with a responsive lead-image composition.
- Reorganized the main gallery into destination-based photographic chapters.
- Refined home-page principles, testimonials, and the closing CTA into a consistent editorial layout.
- Added explicit illustrative-content disclosure to testimonials and removed generic external review links.
- Replaced the oversized decorative map image with a lightweight original SVG motif across subpages and utility pages.
- Updated gallery captions and descriptions to reflect illustrative photography without attributing images to fictional clients.
- Updated the Service Worker cache to `aurora-1.45` for the demonstration-content and contact changes.

### Fixed

- Fixed phone validation that rejected the field's own international placeholder format.
- Corrected inconsistent tour names, durations, and prices against the canonical catalogue.
- Removed the catch-all rewrite that prevented the maintained 404 page from handling unmatched paths.
- Fixed lightbox navigation to respect active gallery filters.
- Improved gallery and tour thumbnail accessibility with native buttons and descriptive Polish labels.
- Corrected the initial tour results count and mobile navigation behavior when JavaScript is unavailable.
- Prevented JavaScript initialization failures from leaving revealed content permanently hidden.
- Corrected featured-offer anchor scrolling beneath the sticky header.
- Updated canonical, social, structured-data, and legal URLs to the confirmed Netlify production domain.
- Replaced incomplete Manrope and Inter font subsets with properly licensed Latin and Latin Extended variants.
- Corrected Polish gallery captions and inaccurate or placeholder image alternative text.
- Fixed the failing production build caused by a stale bundle record by releasing the current CSS bundle under Service Worker cache `aurora-1.46`.

### Security

- Added static-hosting security headers covering CSP, HSTS, framing, MIME handling, referrer, permissions, and origin isolation.
- Replaced broad inline-script permission with SHA-256 CSP hashes for the theme bootstrap.
- Prevented catalogue content from injecting markup by constructing tour images through DOM properties.

### Documentation

- Added bilingual README documentation covering project features, architecture, development, and deployment.
- Established `docs/settings.md` and `docs/pipeline-notes.md` as the canonical references for development commands, build contracts, and deployment behavior.
- Aligned documentation links and project structure descriptions with the maintained repository layout.

### Build and Tooling

- Added PostCSS and esbuild production pipelines for modular CSS and JavaScript.
- Added a manual Sharp image pipeline for responsive image generation.
- Separated canonical source files from generated production assets under `dist/`.
- Established the production packaging contract for maintained HTML pages, assets, metadata, and hosting configuration.
- Excluded raster source images from distribution, reducing package size from approximately 174 MB to 75 MB.
- Added SHA-256 bundle validation tied to Service Worker cache versions.
- Centralized the maintained HTML page inventory and source-to-production asset contracts.
- Added build guards for missing, undeclared, or incorrectly referenced project pages and assets.
- Added `predeploy:check` to require the complete regression suite before production builds.
- Added dependency-free source and production preview servers with separate origins and production-header simulation.
- Preserved manual Netlify CLI deployment as the project release workflow.

### Testing

- Introduced Vitest and jsdom regression coverage for catalogue filtering, gallery rendering, tour details, and form validation.
- Added catalogue consistency checks for listing cards and featured homepage offers.
- Extended asset integrity checks to runtime-generated images, fonts, and production resources.
- Added regression coverage for initialization isolation, reveal fallbacks, and failure states.
- Added keyboard, focus, navigation, and lightbox interaction tests.
- Added Service Worker tests for installation, caching strategies, offline behavior, and update activation.
- Added automated CSP checks for source and production builds.
- Added CSS regression checks for typography, colors, focus states, surfaces, and responsive image contracts.
- Added production asset verification for generated CSS, JavaScript, and referenced resources.
