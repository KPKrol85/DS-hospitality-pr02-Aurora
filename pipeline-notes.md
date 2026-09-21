# Aurora Pipeline Notes

- Detected CSS entrypoint: `css/style.css`
- Detected JS entrypoint: `js/script.js`

## Final npm scripts

- `clean`
- `build:css`
- `verify:css`
- `build:js`
- `verify:js`
- `watch:css`
- `watch:js`
- `check:css-assets`
- `check:assets`
- `build`
- `dist`
- `test`

## Files included in dist

- Root HTML files discovered in the project root (`*.html`)
- `assets/`
- `css/style.min.css`
- `js/script.min.js`
- `service-worker.js`
- `site.webmanifest`
- `robots.txt`
- `sitemap.xml`
- `_headers`
- `_redirects`

## Scripts added or changed

- Added `clean` to remove `dist/`
- Added `dist` to run `clean`, reuse the existing build pipeline, and copy deployable files into `dist/`
- Kept existing build/minification scripts unchanged

## Files modified

- `package.json`
- `scripts/clean-dist.js`
- `scripts/build-dist.js`
- `scripts/verify-built-css.js`
- `scripts/verify-built-js.js`
- `scripts/check-css-assets.js`
- `service-worker.js`
- `index.html`
- `about.html`
- `contact.html`
- `tours.html`
- `tour.html`
- `offline.html`
- `cookies.html`
- `regulamin.html`
- `polityka-prywatnosci.html`
- `gallery.html`
- `404.html`
- `dziekuje.html`
- `pipeline-notes.md`
