# Aurora

## PL

### Przegląd projektu
Aurora to wielostronicowa, statyczna strona internetowa biura podróży, oparta na HTML, modularnym CSS i bundlowanym JavaScript. Repozytorium zawiera strony ofertowe, podstronę szczegółów wycieczki, galerię, formularz kontaktowy oraz komplet stron prawnych i technicznych (m.in. offline i 404).

### Kluczowe funkcje
- Wielostronicowa struktura serwisu (`index.html`, `tours.html`, `tour.html`, `gallery.html`, `about.html`, `contact.html` oraz strony prawne).
- Filtrowanie i sortowanie ofert wycieczek po typie, regionie, cenie i długości.
- Dynamiczne renderowanie szczegółów wycieczki na podstawie parametru URL i danych z `assets/data/tours.json`.
- Dynamiczna galeria zasilana przez `assets/data/gallery-data.json` + filtrowanie po kierunku.
- Lightbox dla zdjęć galerii i zdjęć w widoku szczegółów wycieczki.
- Przełącznik motywu (light/dark) z zapisem preferencji w `localStorage`.
- Walidacja formularza kontaktowego po stronie klienta (w tym walidacja dat, e-maila, telefonu i liczby osób).
- Service Worker z cache statycznych zasobów, strategią network-first dla HTML i stroną `offline.html`.
- Manifest aplikacji webowej (`site.webmanifest`) z ikonami, shortcutami i screenshotami.

### Stack technologiczny
**Runtime / frontend**
- HTML5
- CSS (architektura modułowa + wygenerowany `css/style.min.css`)
- JavaScript ES Modules (`js/features/*`)

**Tooling i build**
- Node.js + npm scripts
- PostCSS (`postcss-import`, `autoprefixer`, `cssnano`)
- esbuild (bundle + minifikacja JS)
- sharp (pipeline generowania wariantów obrazów)

### Struktura projektu
```text
.
├─ assets/
│  ├─ data/                 # dane dla widoku ofert i galerii
│  ├─ img/                  # wygenerowane zasoby obrazów (jpg/webp/avif)
│  ├─ img-src/              # źródła obrazów do pipeline'u
│  └─ fonts/
├─ css/
│  ├─ modules/              # podział stylów na warstwy (base/layout/components/sections...)
│  ├─ style.css             # wejście CSS
│  └─ style.min.css         # build CSS
├─ js/
│  ├─ features/             # moduły funkcjonalne (nawigacja, filtry, lightbox, formularz...)
│  ├─ script.js             # wejście JS
│  └─ script.min.js         # build JS
├─ scripts/                 # skrypty build/verify/dist/images
├─ *.html                   # strony serwisu
├─ service-worker.js
├─ site.webmanifest
├─ _headers
├─ _redirects
└─ package.json
```

### Instalacja i konfiguracja
```bash
npm install
```

### Development lokalny
Budowanie i obserwacja assetów:
```bash
npm run watch:css
npm run watch:js
```

Dodatkowe operacje developerskie:
```bash
npm run build:images
npm run check:assets
```

### Build produkcyjny
```bash
npm run build
npm run dist
```

- `npm run build` buduje CSS i JS oraz uruchamia kontrole integralności assetów.
- `npm run dist` czyści katalog dystrybucyjny, wykonuje pełny build i przygotowuje wynik przez `scripts/build-dist.js`.

### Deployment
Repozytorium zawiera konfigurację charakterystyczną dla hostingu statycznego:
- `_redirects` (fallback trasowania do `index.html`).
- `_headers` (CSP, HSTS i dodatkowe nagłówki bezpieczeństwa).
- Formularz kontaktowy zawiera atrybuty `data-netlify="true"` i honeypot (`netlify-honeypot`), co wskazuje integrację ze statycznym przetwarzaniem formularzy.

### Dostępność
W kodzie zaimplementowano m.in.:
- skip link do głównej treści,
- semantyczne landmarki (`header`, `nav`, `main`, `footer`),
- atrybuty ARIA w kluczowych elementach interaktywnych (menu mobilne, lightbox, liczniki wyników),
- komunikaty walidacyjne formularza z `aria-invalid` oraz powiązaniem pól z kontenerami błędów.

### SEO
Zaobserwowane elementy SEO:
- meta description i canonical na stronach indeksowanych,
- Open Graph i Twitter Cards,
- dane strukturalne JSON-LD (`WebSite`, `WebPage`, `CollectionPage`, `ContactPage`, `BreadcrumbList`, `TravelAgency`),
- pliki `robots.txt` i `sitemap.xml`.

### Wydajność
Wdrożone techniki:
- responsywne obrazy (`picture`, `srcset`, `sizes`) w wielu formatach (`jpg`, `webp`, `avif`),
- lazy loading obrazów i iframe mapy,
- minifikacja CSS/JS,
- pre-cache kluczowych zasobów przez Service Worker.

### Utrzymanie projektu
- Punkty wejścia frontendu: `css/style.css` oraz `js/script.js`.
- Logika funkcjonalna jest rozdzielona na moduły w `js/features`.
- Dane treściowe galerii i ofert są utrzymywane w `assets/data/*.json`.
- Pipeline obrazów i weryfikacje builda znajdują się w katalogu `scripts/`.

### Roadmap
- Rozszerzenie testów automatycznych dla modułów JS (np. filtry, walidacja formularza, lightbox).
- Dodanie lintingu i formatowania kodu jako stałego elementu pipeline'u.
- Ujednolicenie i dokumentacja wersjonowania cache Service Workera przy release.
- Rozszerzenie walidacji integralności assetów o kontrole metadanych SEO i manifestu.

### Licencja
Projekt jest udostępniony na licencji MIT (`LICENSE`).

## EN

### Project Overview
Aurora is a multi-page static travel-agency website built with HTML, modular CSS, and bundled JavaScript. The repository includes offer pages, a tour detail page, a gallery, a contact form, and supporting legal/technical pages (including offline and 404).

### Key Features
- Multi-page site structure (`index.html`, `tours.html`, `tour.html`, `gallery.html`, `about.html`, `contact.html`, plus legal pages).
- Tour offer filtering and sorting by type, region, price, and duration.
- Dynamic tour detail rendering based on URL parameters and `assets/data/tours.json`.
- Dynamic gallery powered by `assets/data/gallery-data.json` with destination filtering.
- Lightbox for gallery images and images in the tour detail view.
- Light/dark theme toggle with preference persistence in `localStorage`.
- Client-side contact form validation (including date, email, phone, and participant count rules).
- Service Worker with static asset caching, network-first strategy for HTML, and `offline.html` fallback.
- Web app manifest (`site.webmanifest`) with icons, shortcuts, and screenshots.

### Tech Stack
**Runtime / frontend**
- HTML5
- CSS (modular architecture + generated `css/style.min.css`)
- JavaScript ES Modules (`js/features/*`)

**Tooling and build**
- Node.js + npm scripts
- PostCSS (`postcss-import`, `autoprefixer`, `cssnano`)
- esbuild (JS bundling + minification)
- sharp (image variant generation pipeline)

### Project Structure
```text
.
├─ assets/
│  ├─ data/                 # data for tours and gallery views
│  ├─ img/                  # generated image assets (jpg/webp/avif)
│  ├─ img-src/              # source images for the pipeline
│  └─ fonts/
├─ css/
│  ├─ modules/              # style layers (base/layout/components/sections...)
│  ├─ style.css             # CSS entry
│  └─ style.min.css         # CSS build output
├─ js/
│  ├─ features/             # feature modules (navigation, filters, lightbox, form...)
│  ├─ script.js             # JS entry
│  └─ script.min.js         # JS build output
├─ scripts/                 # build/verify/dist/image scripts
├─ *.html                   # site pages
├─ service-worker.js
├─ site.webmanifest
├─ _headers
├─ _redirects
└─ package.json
```

### Setup and Installation
```bash
npm install
```

### Local Development
Build/watch assets during development:
```bash
npm run watch:css
npm run watch:js
```

Additional developer operations:
```bash
npm run build:images
npm run check:assets
```

### Production Build
```bash
npm run build
npm run dist
```

- `npm run build` compiles CSS/JS and runs asset integrity checks.
- `npm run dist` cleans distribution output, runs the full build, and prepares artifacts via `scripts/build-dist.js`.

### Deployment
The repository includes static-hosting deployment configuration:
- `_redirects` (routing fallback to `index.html`).
- `_headers` (CSP, HSTS, and additional security headers).
- The contact form uses `data-netlify="true"` and `netlify-honeypot`, indicating static form handling integration.

### Accessibility
Implemented accessibility patterns include:
- a skip link to main content,
- semantic landmarks (`header`, `nav`, `main`, `footer`),
- ARIA attributes on key interactive elements (mobile navigation, lightbox, result counters),
- form validation feedback with `aria-invalid` and field-to-error associations.

### SEO
Verified SEO implementation includes:
- meta description and canonical tags on indexable pages,
- Open Graph and Twitter Card metadata,
- JSON-LD structured data (`WebSite`, `WebPage`, `CollectionPage`, `ContactPage`, `BreadcrumbList`, `TravelAgency`),
- `robots.txt` and `sitemap.xml`.

### Performance
Implemented performance-oriented patterns:
- responsive images (`picture`, `srcset`, `sizes`) across multiple formats (`jpg`, `webp`, `avif`),
- lazy loading for images and embedded map iframe,
- minified CSS/JS assets,
- Service Worker pre-caching for core static assets.

### Project Maintenance
- Frontend entry points: `css/style.css` and `js/script.js`.
- Functional logic is split into feature modules under `js/features`.
- Content data for tours and gallery is maintained in `assets/data/*.json`.
- Image pipeline and build verification logic are located in `scripts/`.

### Roadmap
- Add automated tests for key JS modules (filters, form validation, lightbox).
- Add linting/formatting as a standard part of the pipeline.
- Standardize and document Service Worker cache-versioning during releases.
- Extend asset integrity checks with SEO/manifest metadata validation.

### License
This project is released under the MIT License (`LICENSE`).
