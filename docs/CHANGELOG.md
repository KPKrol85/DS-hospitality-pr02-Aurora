# Changelog

All significant changes to this project are documented in this file.

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

### Changed

- **Breaking:** Replaced the initial MIT license with the bilingual KP_CODE Proprietary Project License 1.0, and synchronized the README license sections and package metadata to `UNLICENSED`. Reuse of the repository is no longer covered by MIT terms and requires the rights stated in `LICENSE`.
- Updated the cookies policy using the KP_Code template, aligned with Aurora Travel's verified storage technologies and third-party integrations.
- Updated the privacy policy using the KP_Code template, aligned with actual form processing, data recipients, and browser storage.
- Consolidated shared legal-page styling into `css/modules/legal.css`, including responsive and accessible table presentation.
- Updated the terms of use using the KP_Code template, aligned with Aurora Travel's demonstrational scope, active contact form, and proprietary licensing.
- Updated the Service Worker notification with Polish text, theme-aware styling, accessible controls and consistent layering. Updated the Service Worker cache to `aurora-1.11`.
- Removed unreachable JavaScript, form markup and theme CSS, enabled tour-specific contact form prefill, and standardized UI layering with design tokens. Updated the Service Worker cache to `aurora-1.12`.

### Fixed

- Fixed contact form phone validation rejecting the field's own `+48 600 900 700` placeholder format: corrected the double-escaped `pattern` in `contact.html` and the space/hyphen strip expression in `js/features/form.js`, so digits, an optional leading `+`, spaces, and hyphens are accepted with at least seven characters excluding spaces and hyphens, identically with and without JavaScript. Aligned the field `title` and error message with this rule, rebuilt `js/script.min.js`, and raised the service worker `VERSION` to `aurora-1.4` so returning visitors receive the updated bundle.
- Fixed tour offers stating different names, durations, and prices across pages: synchronized the six `tours.html` listing cards (title, `N dni` duration, price, `data-days`, `data-price`), the contact form tour select (all six offers, with catalogue IDs as option values), and the homepage Tokio and Maldives durations with the canonical catalogue `assets/data/tours.json`, and added `scripts/check-tour-catalogue.js` (`npm run check:tour-catalogue`), run by `npm run build`, which fails when the listing cards or the contact select drift from the catalogue.
- Fixed unmatched-path routing by removing the `_redirects` catch-all rule that served `index.html` with HTTP 200, allowing Netlify to use the maintained `404.html` page for unknown URLs with HTTP 404. Updated the Polish and English README sections to reflect the corrected routing and deployment configuration.
- Fixed lightbox navigation to respect active gallery filters, keeping previous/next buttons, arrow keys, and swipe gestures within visible images while preserving correct navigation after filter changes. Updated the Service Worker cache version to `aurora-1.7`.
- Improved gallery and tour thumbnail accessibility with native buttons, descriptive Polish labels, visible keyboard focus, and reliable lightbox activation via click, Enter, and Space. Preserved responsive images, filtered navigation, and focus restoration. Updated the Service Worker cache to `aurora-1.8`.
- Fixed the static tours counter and mobile navigation fallback when JavaScript is unavailable. The page now displays the correct initial offer count, keeps the mobile drawer collapsed until activated, and preserves desktop navigation without scripting. Updated the Service Worker cache to `aurora-1.9`.
- Fixed reveal visibility when JavaScript fails by isolating feature initializers and enabling animations only after successful reveal setup. Preserved gallery animations and reduced-motion behaviour. Updated the Service Worker cache to `aurora-1.10`.

### Security

- Added static-hosting security response headers in `_headers`, covering Content-Security-Policy, Strict-Transport-Security, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.

### Documentation

- Added bilingual Polish and English project documentation in `README.md` covering features, technology stack, project structure, build, deployment, and maintenance ownership.
- Added `settings.md` and `pipeline-notes.md` documenting every npm script, the recommended development workflow, and the canonical source versus generated-output ownership rules.

### Build and Tooling

- Added a PostCSS build for `css/style.css` using `postcss-import`, `autoprefixer`, and `cssnano`, and an esbuild bundle for `js/script.js` targeting ES2018, each with a watch script.
- Added a `dist` packaging step that clears `dist/`, runs the full build, and copies the root HTML pages, `assets/`, production CSS and JS, service worker, manifest, `robots.txt`, `sitemap.xml`, `_headers`, and `_redirects`.
- Added a manual `sharp` image pipeline that generates `assets/img/` output from `assets/img-src/` sources and is kept outside the default build chain.
- Added a `_redirects` rule that serves `/index.html` with status 200 for unmatched paths on static hosting.
- Refactored the build pipeline to separate development sources from production output: updated all 12 HTML pages to load canonical CSS and JavaScript, moved PostCSS and esbuild minification exclusively to `dist/css/` and `dist/js/`, and removed the tracked source-tree `.min` files. Updated `npm run build` to produce a complete deployable `dist/`, aligned the asset verification scripts with both development and production paths, and preserved `npm run dist` as an alias. Separated development and production Service Worker handling, raised the cache version to `aurora-1.5`, and synchronized the build documentation.
- Excluded `assets/img-src/` from the production `dist/` package while preserving all runtime assets and development image sources, reducing the package size from approximately 174 MB to 75 MB.
- Added SHA-256 validation for production CSS and JavaScript bundles against a tracked Service Worker cache reference, preventing builds with changed bundles and an unchanged cache version. Added an explicit reference-update command and raised the Service Worker version to `aurora-1.6`.

### Testing

- Added build verification scripts that fail when `css/style.min.css` still contains `@import` or sourcemap references, or when `js/script.min.js` still contains module syntax.
- Added an asset integrity check that scans HTML references, `srcset` candidates, JSON-LD and social-image URLs, and web manifest entries for missing files and invalid JSON.
- Added a CSS/JS asset check that enforces production asset references on every page and rejects legacy source paths in the service worker precache list.