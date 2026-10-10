# Changelog

All significant changes to Aurora Travel are documented in this file.

This is the canonical record of significant completed changes. Evaluate each implementation task for a changelog update and record verified changes when its scope permits. If the task excludes this file, report any required update without editing it. Omit routine cleanup, pending work and unsupported claims.

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

Judge by impact, not by file count: a visually small change is recorded when it changes user-visible or accessibility behavior, and editing a file is not by itself a reason for an entry.

Not recorded: improvement-report status updates and archiving, commit-only or tracking-document bookkeeping, temporary verification probes, minor wording corrections in internal documentation, and isolated cosmetic or implementation details, such as a single spacing or border correction, that do not change behavior, accessibility, or a shared component contract.

When an implementation task is defined, apply this policy and state `Changelog: yes` or `Changelog: no`. Add an entry only within an approved task marked `Changelog: yes`; this policy does not authorize changelog edits outside that scope.

## [Unreleased]

### Added

- Added the initial Aurora Travel static site implementation covering the home, tours, tour detail, gallery, about, contact, thank-you, 404, offline, and Polish legal pages.
- Added data-driven tour listings with filtering by trip type and region, sorting by price and duration, and a polite live result counter.
- Added a tour detail view rendered from `assets/data/tours.json` based on a URL query parameter.
- Added a gallery rendered from `assets/data/gallery-data.json` with destination filtering and a shared lightbox used by both the gallery and the tour detail view.
- Added client-side contact form validation with per-field error messages, `aria-invalid` state, and e-mail, phone, participant-count, and start/end date rules, submitted through static Netlify form handling with a honeypot field.
- Added a light/dark theme toggle that persists the selected theme in `localStorage`.
- Added keyboard-accessible mobile navigation and lightbox with focus trapping, `Escape` dismissal, and focus return to the triggering element.
- Added reduced-motion handling that disables animations, transitions, and reveal transforms when `prefers-reduced-motion: reduce` is set.
- Added a service worker with versioned static and HTML caches, cache-first delivery for static assets, network-first delivery for HTML, `offline.html` fallback, and cleanup of caches from previous versions on activation.
- Added an in-page update notice that activates a waiting service worker and reloads the page once the controller changes.
- Added a web app manifest with standard and maskable icons, application shortcuts, and store screenshots.
- Added a dismissible project notice that discloses the demonstration character of the site and stores acceptance in `localStorage`.
- Added responsive image delivery with `avif`, `webp`, and `jpg` variants, self-hosted variable fonts, and lazy loading for images and the embedded map.
- Added SEO metadata for indexable pages, including canonical URLs, Open Graph and Twitter Card tags, JSON-LD structured data, `robots.txt`, and `sitemap.xml`, with `noindex` applied to the 404, offline, thank-you, and tour detail pages.
- Added 88 automated regression tests with Vitest and jsdom for tour filtering, gallery rendering, tour details and contact form validation, replacing the placeholder `npm test` command.
- Added an empty-result state to the tour listing: when the type and region filters match no offer, a message replaces the empty list together with a button that restores both filters, shows every offer in the chosen sort order and returns focus to the type filter. Updated the Service Worker cache to `aurora-1.24`.
- Added an enquiry action to the tour detail view: the "Zapytaj o ofertę" button links to the contact form with the viewed offer preselected once the offer is loaded from the catalogue, and to the plain contact form otherwise. Updated the Service Worker cache to `aurora-1.25`.
- Added loading and unavailable-data states to the tour detail view and the gallery: a valid offer is no longer shown as "not found" while its data loads or when the request fails, the detail view offers a retry of the current page and a link to the offer list, and the gallery hides its filters until images are available; state messages are announced through a dedicated polite status region instead of the whole gallery grid. Updated the Service Worker cache to `aurora-1.26`.

### Changed

- **Breaking:** Replaced the initial MIT license with the bilingual KP_CODE Proprietary Project License 1.0, and synchronized the README license sections and package metadata to `UNLICENSED`. Reuse of the repository is no longer covered by MIT terms and requires the rights stated in `LICENSE`.
- Updated the cookies policy using the KP_Code template, aligned with Aurora Travel's verified storage technologies and third-party integrations.
- Updated the privacy policy using the KP_Code template, aligned with actual form processing, data recipients, and browser storage.
- Consolidated shared legal-page styling into `css/modules/legal.css`, including responsive and accessible table presentation.
- Updated the terms of use using the KP_Code template, aligned with Aurora Travel's demonstrational scope, active contact form, and proprietary licensing.
- Updated the Service Worker notification with Polish text, theme-aware styling, accessible controls and consistent layering. Updated the Service Worker cache to `aurora-1.11`.
- Removed unreachable JavaScript, form markup and theme CSS, enabled tour-specific contact form prefill, and standardized UI layering with design tokens. Updated the Service Worker cache to `aurora-1.12`.
- Extended asset integrity checks to cover runtime-generated gallery and tour images, lightbox assets, and local CSS resources in both source and production builds.
- Replaced inline script permissions with SHA-256 CSP hashes for the theme bootstrap and added automated CSP verification for source and production builds.
- Optimized variable font loading with selective preload hints for Manrope and Inter, and updated the Service Worker to refresh cached pages.
- Standardized native control typography across the site and updated the Service Worker cache to `aurora-1.14`.
- Aligned responsive image `sizes` with the actual layout across tour cards, galleries, tour details, about and contact views, and updated the Service Worker cache to `aurora-1.15`.
- Standardized the shared button variant and size contract across the site and updated the Service Worker cache to `aurora-1.16`.
- Consolidated keyboard focus styling into a shared, theme-aware token system and updated the Service Worker cache to `aurora-1.17`.
- Introduced shared typographic roles for page titles, section headings, leads and body text, unified heading dividers across the site, and updated the Service Worker cache to `aurora-1.18`.
- Consolidated the responsive catalogue image `<picture>` markup of the gallery and tour detail views into one shared runtime module, and updated the Service Worker cache to `aurora-1.20`.
- Derived the contact form's phone, date and participant-count validation messages from the native field constraints instead of restating the rules in JavaScript, so an end date before today is also reported while no start date is chosen, and updated the Service Worker cache to `aurora-1.21`.
- Moved the post-load light/dark presentation to the design tokens: the stylesheet derives the root background from `--bg` and sets each theme's `color-scheme`, while the theme toggle no longer restates the theme colours and only switches and stores the theme and removes the head bootstrap's first-paint inline styles. Updated the Service Worker cache to `aurora-1.22`.
- Moved the Service Worker lifecycle and update notice out of the JavaScript entry module into a dedicated lifecycle feature module, which the entry module now starts while production registration, update activation and reload, and development unregistration stay unchanged. Updated the Service Worker cache to `aurora-1.23`.
- Changed the contact form to clear a field's validation message and `aria-invalid` state as soon as the corrected value satisfies its constraints, without waiting for the field to lose focus, while fields without an error are still validated only on blur and submit. Updated the Service Worker cache to `aurora-1.27`.

### Fixed

- Fixed contact form phone validation rejecting the field's own `+48 600 900 700` placeholder format: corrected the double-escaped `pattern` in `contact.html` and the space/hyphen strip expression in `js/features/form.js`, so digits, an optional leading `+`, spaces, and hyphens are accepted with at least seven characters excluding spaces and hyphens, identically with and without JavaScript. Aligned the field `title` and error message with this rule, rebuilt `js/script.min.js`, and raised the service worker `VERSION` to `aurora-1.4` so returning visitors receive the updated bundle.
- Fixed tour offers stating different names, durations, and prices across pages: synchronized the six `tours.html` listing cards (title, `N dni` duration, price, `data-days`, `data-price`), the contact form tour select (all six offers, with catalogue IDs as option values), and the homepage Tokio and Maldives durations with the canonical catalogue `assets/data/tours.json`, and added `scripts/check-tour-catalogue.js` (`npm run check:tour-catalogue`), run by `npm run build`, which fails when the listing cards or the contact select drift from the catalogue.
- Fixed unmatched-path routing by removing the `_redirects` catch-all rule that served `index.html` with HTTP 200, allowing Netlify to use the maintained `404.html` page for unknown URLs with HTTP 404. Updated the Polish and English README sections to reflect the corrected routing and deployment configuration.
- Fixed lightbox navigation to respect active gallery filters, keeping previous/next buttons, arrow keys, and swipe gestures within visible images while preserving correct navigation after filter changes. Updated the Service Worker cache version to `aurora-1.7`.
- Improved gallery and tour thumbnail accessibility with native buttons, descriptive Polish labels, visible keyboard focus, and reliable lightbox activation via click, Enter, and Space. Preserved responsive images, filtered navigation, and focus restoration. Updated the Service Worker cache to `aurora-1.8`.
- Fixed the static tours counter and mobile navigation fallback when JavaScript is unavailable. The page now displays the correct initial offer count, keeps the mobile drawer collapsed until activated, and preserves desktop navigation without scripting. Updated the Service Worker cache to `aurora-1.9`.
- Fixed reveal visibility when JavaScript fails by isolating feature initializers and enabling animations only after successful reveal setup. Preserved gallery animations and reduced-motion behaviour. Updated the Service Worker cache to `aurora-1.10`.
- Fixed the home page featured-offer links landing on `tours.html` with the chosen offer card and its title hidden under the sticky header: the listing cards now stop below the header through a `scroll-margin-top` derived from the header height token. Updated the Service Worker cache to `aurora-1.28`.
- Fixed production URL references that still pointed to an outdated Netlify origin: the canonical, Open Graph, Twitter Card and JSON-LD URLs of the maintained pages, the service address in the terms of use, `robots.txt`, `sitemap.xml`, the `productionDomain` constant of the asset integrity check and the README now use the owner-confirmed production URL `https://ds-hospitality-pr02-aurora.netlify.app/`, already declared as `homepage` in `package.json`. Updated the Service Worker cache to `aurora-1.29`.

### Security

- Added static-hosting security response headers in `_headers`, covering Content-Security-Policy, Strict-Transport-Security, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
- Built the tour detail images through DOM properties instead of HTML strings, so catalogue image paths, alt texts, captions and thumbnail labels are inserted as literal values and cannot inject markup. Updated the Service Worker cache to `aurora-1.19`.

### Documentation

- Added bilingual Polish and English project documentation in `README.md` covering features, technology stack, project structure, build, deployment, and maintenance ownership.
- Added `settings.md` and `pipeline-notes.md` documenting every npm script, the recommended development workflow, and the canonical source versus generated-output ownership rules.
- Corrected README documentation links and aligned the Polish and English project structure trees with the actual repository layout.
- Assigned each workflow fact one owning document: `docs/settings.md` for the commands and the development, verification, and deployment workflow, and `docs/pipeline-notes.md` for the build, packaging, CSP, and Service Worker cache-version contracts, with the Polish and English README sections summarizing and linking to them. Corrected stale README statements about the published `dist/` contents, the Service Worker version, the license file and metadata, and the project trees, and removed a point-in-time build result.

### Build and Tooling

- Added a PostCSS build for `css/style.css` using `postcss-import`, `autoprefixer`, and `cssnano`, and an esbuild bundle for `js/script.js` targeting ES2018, each with a watch script.
- Added a `dist` packaging step that clears `dist/`, runs the full build, and copies the root HTML pages, `assets/`, production CSS and JS, service worker, manifest, `robots.txt`, `sitemap.xml`, `_headers`, and `_redirects`.
- Added a manual `sharp` image pipeline that generates `assets/img/` output from `assets/img-src/` sources and is kept outside the default build chain.
- Added a `_redirects` rule that serves `/index.html` with status 200 for unmatched paths on static hosting.
- Refactored the build pipeline to separate development sources from production output: updated all 12 HTML pages to load canonical CSS and JavaScript, moved PostCSS and esbuild minification exclusively to `dist/css/` and `dist/js/`, and removed the tracked source-tree `.min` files. Updated `npm run build` to produce a complete deployable `dist/`, aligned the asset verification scripts with both development and production paths, and preserved `npm run dist` as an alias. Separated development and production Service Worker handling, raised the cache version to `aurora-1.5`, and synchronized the build documentation.
- Excluded `assets/img-src/` from the production `dist/` package while preserving all runtime assets and development image sources, reducing the package size from approximately 174 MB to 75 MB.
- Added SHA-256 validation for production CSS and JavaScript bundles against a tracked Service Worker cache reference, preventing builds with changed bundles and an unchanged cache version. Added an explicit reference-update command and raised the Service Worker version to `aurora-1.6`.
- Declared the maintained page inventory and the source-to-production CSS and JavaScript entry tags once in `scripts/site-build-contract.js`, shared by `build:stage` and `check:css-assets`. The build now fails before staging when a declared page is missing or a root HTML page is undeclared, so an unlisted page can no longer be published unverified; the production output is unchanged.
- Added `npm run predeploy:check`, which runs the complete Vitest regression suite and, only when every test passes, the unchanged `npm run build`, and made it the documented pre-deployment check in place of the conditional, per-area `npm test` triggers; `npm run build` and `npm run dist` still do not run the tests.
- Added a dependency-free local preview server, `scripts/preview-server.js`, with `npm run preview:source` for the maintained sources at `http://127.0.0.1:8181/` and `npm run preview:dist` for the built `dist/` at `http://127.0.0.1:8182/`, which sends the `/*` headers of `dist/_headers`, including the Content-Security-Policy, and answers unmatched paths with `dist/404.html` and HTTP 404. The build, the contents of `dist/` and the manual deployment workflow are unchanged.

### Testing

- Extended the tour catalogue check to the featured offer cards on `index.html`, which must link to a valid `tours.html` listing card and match its catalogue offer in title and numeric `<N> dni` durations, and added regression tests that run the checker against a temporary site.
- Added regression tests for initializer failure isolation, gallery initialization ordering after rejection, and the reveal fail-safe and reveal-ready contracts.
- Added Service Worker regression tests that run the production `service-worker.js` against in-memory Cache Storage and a mocked network, covering install precaching, cleanup of previous-version caches on activation, request routing, network-first HTML caching with cached-page and `offline.html` fallbacks, cache-first static asset caching rules, and `SKIP_WAITING` update activation.
- Added jsdom regression tests for lightbox and mobile-navigation keyboard handling, focus trapping and restoration, scroll locking, filtered image navigation, tour main-image exclusion, and drawer dismissal on link clicks and desktop media-query changes.
- Added build verification scripts that fail when `css/style.min.css` still contains `@import` or sourcemap references, or when `js/script.min.js` still contains module syntax.
- Added an asset integrity check that scans HTML references, `srcset` candidates, JSON-LD and social-image URLs, and web manifest entries for missing files and invalid JSON.
- Added a CSS/JS asset check that enforces production asset references on every page and rejects legacy source paths in the service worker precache list.