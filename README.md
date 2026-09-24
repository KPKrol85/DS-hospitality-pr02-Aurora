# Aurora Travel

## PL

### Przegląd projektu

Aurora Travel to wielostronicowy, statyczny serwis biura podróży w języku polskim, zbudowany z ręcznie pisanego HTML, modularnego CSS i bundlowanego JavaScriptu. Repozytorium zawiera 12 stron w katalogu głównym: stronę główną, listę wycieczek, widok szczegółów wycieczki, galerię, stronę o firmie, kontakt, stronę podziękowania, 404, stronę offline oraz trzy strony prawne.

Projekt nie posiada backendu ani bazy danych. Treść jest dostarczana jako statyczny HTML uzupełniony dwoma plikami JSON pobieranymi w przeglądarce, a formularz kontaktowy korzysta z obsługi formularzy po stronie hostingu statycznego. Stan użytkownika (motyw, akceptacja informacji o projekcie) jest przechowywany wyłącznie lokalnie w przeglądarce.

Zgodnie z treścią informacji o projekcie wyświetlanej na stronach, serwis ma charakter demonstracyjny i został przygotowany przez KP_Code Digital Studio jako przykładowa realizacja dla branży hotelarskiej i turystycznej.

### Wersja online

https://hospitality-pr02-aurora.netlify.app/

Jest to adres kanoniczny zadeklarowany w znacznikach `canonical`, w `sitemap.xml`, w `robots.txt` oraz w stałej `productionDomain` w `scripts/check-asset-integrity.js`. Adres został sprawdzony podczas przygotowania tej dokumentacji i zwraca stronę główną projektu; repozytorium nie zawiera informacji pozwalającej ustalić, której rewizji odpowiada opublikowana wersja.

### Kluczowe funkcje

- Filtrowanie ofert na `tours.html` po typie i regionie oraz sortowanie po cenie i liczbie dni; liczba dopasowanych ofert jest aktualizowana w obszarze `role="status" aria-live="polite"`. Karty ofert są statycznym HTML-em opisanym atrybutami `data-type`, `data-region`, `data-price` i `data-days`.
- Widok szczegółów wycieczki (`tour.html`) renderowany z `assets/data/tours.json` na podstawie parametru `?id=`, z sanitizacją opisów opartą na liście dozwolonych znaczników.
- Galeria (`gallery.html`) renderowana z `assets/data/gallery-data.json` wraz z filtrowaniem po kierunku (przyciski z `aria-pressed`).
- Wspólny lightbox dla galerii i galerii w widoku wycieczki: otwieranie klawiszem `Enter` lub `Space`, nawigacja strzałkami, zamknięcie klawiszem `Escape`, pułapka fokusu, powrót fokusu do elementu wyzwalającego, przesunięcie dotykiem oraz przełączanie trybu pełnoekranowego.
- Przełącznik motywu jasny/ciemny zapisywany w `localStorage`, uzupełniony skryptem w `<head>`, który ustawia motyw z zapisanej preferencji lub `prefers-color-scheme` przed załadowaniem arkusza stylów.
- Walidacja formularza kontaktowego po stronie klienta: pola wymagane, format e-mail, minimalna długość numeru telefonu, data rozpoczęcia nie wcześniejsza niż dzisiaj, data zakończenia nie wcześniejsza niż data rozpoczęcia, liczba osób w zakresie 1–12 oraz zgoda RODO. Komunikaty trafiają do powiązanych obszarów `aria-live`, a pola otrzymują `aria-invalid`.
- Nawigacja mobilna z pułapką fokusu, zamknięciem klawiszem `Escape`, blokadą przewijania i powrotem fokusu.
- Zakładki z nawigacją strzałkami oraz akordeon FAQ sterowany atrybutem `aria-expanded`.
- Animacje pojawiania się elementów oparte na `IntersectionObserver`, z awaryjnym ujawnieniem treści przy braku wsparcia.
- Service Worker z wersjonowanymi cache'ami, strategią cache-first dla zasobów statycznych, network-first dla HTML i stroną `offline.html` jako zapasową.
- Baner aktualizacji aplikacji, który aktywuje oczekującego Service Workera i przeładowuje stronę po zmianie kontrolera.
- Zamykana informacja o projekcie z zapisem akceptacji w `localStorage`.

### Stack technologiczny

**Runtime**

- HTML
- CSS z własnymi właściwościami i podziałem na moduły
- JavaScript w modułach ES

**Build i tooling**

- Node.js oraz skrypty npm
- PostCSS (`postcss`, `postcss-cli`) z wtyczkami `postcss-import`, `autoprefixer`, `cssnano`
- esbuild (bundling i minifikacja, target `es2018`)
- sharp (generowanie wariantów obrazów)

**Walidacja**

- Własne skrypty Node w katalogu `scripts/`

**Hosting statyczny**

- `_headers`, `_redirects`, `site.webmanifest`, `robots.txt`, `sitemap.xml`
- Atrybuty formularza Netlify (`data-netlify`, `netlify-honeypot`) w `contact.html`

Projekt nie posiada zależności runtime; wszystkie pakiety są zadeklarowane jako `devDependencies`.

### Architektura

- **Strony.** Każda strona w katalogu głównym jest samodzielnym dokumentem HTML i odwołuje się do `css/style.min.css` oraz `js/script.min.js`. Obecność tych odwołań jest wymuszana przez `scripts/check-css-assets.js`.
- **CSS.** `css/style.css` jest jedynym punktem wejścia i importuje osiem modułów z `css/modules/` (`tokens`, `base`, `layout`, `components`, `sections`, `fonts`, `subpages`, `utilities`). PostCSS wstawia importy w miejscu, dodaje prefiksy i minifikuje wynik do `css/style.min.css`.
- **JavaScript.** `js/script.js` składa 14 modułów funkcjonalnych z `js/features/`. Każdy moduł eksportuje funkcję `init*`, która kończy działanie, gdy nie znajdzie swojego elementu w DOM, dzięki czemu ten sam bundle obsługuje wszystkie strony. esbuild buduje `js/script.min.js`.
- **Dane.** `assets/data/tours.json` zawiera 6 wycieczek i jest pobierany przez `js/features/tour-detail.js`; `assets/data/gallery-data.json` zawiera 36 pozycji i jest pobierany przez `js/features/gallery.js`. Lista ofert na `tours.html` pozostaje statycznym HTML-em.
- **Obrazy.** `assets/img-src/` jest źródłem, `assets/img/` wynikiem generowanym przez `scripts/build-images.js`. Skrypt tworzy warianty szerokości według profilu katalogu oraz pliki `webp` i `avif` obok formatu zapasowego.
- **Service Worker.** `service-worker.js` leży w katalogu głównym i jest rejestrowany z `js/script.js` po zdarzeniu `load`.
- **Pakowanie.** `scripts/build-dist.js` kopiuje zestaw plików przeznaczonych do wdrożenia do katalogu `dist/`.

### Struktura projektu

```text
.
├─ assets/
│  ├─ data/                  # tours.json, gallery-data.json
│  ├─ fonts/                 # Inter-VariableFont.woff2, Manrope-VariableFont.woff2
│  ├─ img/                   # wygenerowane obrazy (jpg/webp/avif) oraz icons, logo, og-img, screenshots, shortcuts
│  └─ img-src/               # źródła rastrowe dla pipeline'u obrazów
├─ css/
│  ├─ modules/               # tokens, base, layout, components, sections, fonts, subpages, utilities
│  ├─ style.css              # punkt wejścia CSS
│  └─ style.min.css          # wygenerowany arkusz produkcyjny
├─ js/
│  ├─ features/              # moduły funkcjonalne init*
│  ├─ script.js              # punkt wejścia JS
│  └─ script.min.js          # wygenerowany bundle produkcyjny
├─ scripts/                  # skrypty build, pakowania i walidacji
├─ docs/
│  └─ CHANGELOG.md
├─ index.html
├─ tours.html
├─ tour.html
├─ gallery.html
├─ about.html
├─ contact.html
├─ dziekuje.html
├─ 404.html
├─ offline.html
├─ cookies.html
├─ regulamin.html
├─ polityka-prywatnosci.html
├─ service-worker.js
├─ site.webmanifest
├─ robots.txt
├─ sitemap.xml
├─ _headers
├─ _redirects
├─ postcss.config.js
├─ settings.md
├─ pipeline-notes.md
├─ LICENSE
├─ package.json
└─ package-lock.json
```

### Instalacja

```bash
npm install
```

Repozytorium zawiera `package-lock.json` w formacie `lockfileVersion: 3`. Wymagane są Node.js i npm; repozytorium nie deklaruje wymaganej wersji Node.js (brak pola `engines` oraz plików `.nvmrc` i `.node-version`). Projekt nie korzysta ze zmiennych środowiskowych.

### Development lokalny

Automatyczne przebudowywanie plików produkcyjnych podczas pracy nad źródłami:

```bash
npm run watch:css
npm run watch:js
```

Strony ładują wyłącznie `css/style.min.css` i `js/script.min.js`, więc zmiany w `css/style.css`, `css/modules/`, `js/script.js` i `js/features/` są widoczne dopiero po przebudowaniu tych plików.

Repozytorium nie zawiera skryptu serwera deweloperskiego. Podgląd należy uruchomić przez dowolny serwer HTTP obsługujący katalog główny projektu — rejestracja Service Workera oraz pobieranie `assets/data/*.json` przez `fetch()` nie działają przy otwarciu plików przez `file://`.

### Dostępne skrypty

- `npm run build:css` — buduje `css/style.min.css` z `css/style.css` przez PostCSS, a następnie uruchamia `verify:css`.
- `npm run build:js` — bunduje i minifikuje `js/script.js` do `js/script.min.js` przez esbuild, a następnie uruchamia `verify:js`.
- `npm run watch:css` / `npm run watch:js` — te same operacje w trybie obserwowania zmian, bez kroku weryfikacji.
- `npm run verify:css` — sprawdza, czy `css/style.min.css` istnieje i nie zawiera dyrektyw `@import` ani odwołań do map źródeł.
- `npm run verify:js` — sprawdza, czy `js/script.min.js` istnieje i nie zawiera składni `import` ani `export`.
- `npm run check:css-assets` — sprawdza, czy każda z 12 stron odwołuje się do zasobów produkcyjnych i czy lista precache w `service-worker.js` nie zawiera ścieżek źródłowych.
- `npm run check:assets` — skanuje strony HTML w poszukiwaniu brakujących plików w atrybutach `href`, `src` i `srcset`, w adresach `og:image` i `twitter:image`, w danych JSON-LD oraz w `site.webmanifest`.
- `npm run build` — `build:css`, `build:js`, `check:css-assets`, `check:assets`.
- `npm run clean` — usuwa katalog `dist/`.
- `npm run dist` — `clean`, `build`, a następnie pakowanie przez `scripts/build-dist.js`.
- `npm run images:bootstrap` — jednorazowo kopiuje istniejące pliki rastrowe z `assets/img/` do `assets/img-src/`.
- `npm run build:images` — generuje `assets/img/` z `assets/img-src/`; celowo pozostaje poza domyślnym łańcuchem `build`.
- `npm test` — skrypt zastępczy kończący się błędem; w projekcie nie skonfigurowano żadnego runnera testów.

Szczegółowy opis każdego skryptu i rekomendowany przebieg pracy zawiera [settings.md](settings.md).

### Build produkcyjny

```bash
npm run build
npm run dist
```

`npm run dist` przygotowuje katalog `dist/` zawierający: pliki `*.html` z katalogu głównego, katalog `assets/`, `css/style.min.css`, `js/script.min.js`, `service-worker.js` oraz — jeżeli istnieją — `_headers`, `_redirects`, `site.webmanifest`, `robots.txt` i `sitemap.xml`. Brak któregokolwiek z plików wymaganych (`css/style.min.css`, `js/script.min.js`, `service-worker.js`) przerywa pakowanie.

`dist/` jest wykluczony z repozytorium przez `.gitignore`. Pliki `css/style.min.css` i `js/script.min.js` są natomiast wersjonowane, ponieważ odwołują się do nich strony HTML.

Komendy `build` i `dist` nie były uruchamiane podczas przygotowania tej dokumentacji; ich wykonanie wymaga zainstalowanych zależności.

### Testy i walidacja

W projekcie nie skonfigurowano frameworka testowego ani testów jednostkowych czy przeglądarkowych — `npm test` jest skryptem zastępczym kończącym się błędem. Kontrolę jakości zapewniają cztery skrypty Node uruchamiane w ramach `npm run build`:

- `scripts/verify-built-css.js`
- `scripts/verify-built-js.js`
- `scripts/check-css-assets.js`
- `scripts/check-asset-integrity.js`

Wszystkie cztery skrypty zostały uruchomione bezpośrednio przez `node` na aktualnym stanie repozytorium podczas przygotowania tej dokumentacji i zakończyły się powodzeniem; kontrola integralności zasobów przeskanowała 12 plików HTML. Skrypty te nie wymagają zainstalowanych zależności i nie modyfikują plików. Nie przeprowadzono audytów dostępności, SEO ani wydajności.

### Wdrożenie

Repozytorium zawiera konfigurację hostingu statycznego, ale nie zawiera konfiguracji CI/CD ani pliku `netlify.toml`, więc publikacja nie jest zautomatyzowana z poziomu repozytorium.

- `_redirects` — reguła `/* /index.html 200` jako zachowanie zapasowe dla nieodnalezionych ścieżek.
- `_headers` — Content-Security-Policy (m.in. `default-src 'self'`, `object-src 'none'`, `frame-src https://www.google.com` dla osadzonej mapy), Strict-Transport-Security, `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy i Cross-Origin-Opener-Policy.
- Formularz w `contact.html` używa `method="POST"`, `action="dziekuje.html"`, `data-netlify="true"`, `netlify-honeypot="bot-field"` oraz ukrytego pola `form-name` — jest to sposób obsługi formularzy właściwy dla Netlify.
- Do wdrożenia przeznaczony jest katalog `dist/` generowany przez `npm run dist`.

### Dostępność

Zaimplementowane mechanizmy:

- skip link do treści głównej oraz semantyczne landmarki `header`, `nav`, `main`, `footer`,
- automatyczne oznaczanie aktywnego odnośnika atrybutem `aria-current="page"`,
- pułapka fokusu, obsługa klawisza `Escape` i powrót fokusu w nawigacji mobilnej oraz w lightboxie,
- zakładki z nawigacją strzałkami i zarządzaniem atrybutem `tabindex`, akordeon oparty na `aria-expanded`,
- komunikaty walidacji formularza w obszarach `aria-live="polite"` powiązanych przez `aria-describedby`, wraz z `aria-invalid` na polach,
- licznik dopasowanych ofert oraz kontener galerii ogłaszane jako obszary `aria-live`,
- przyciski filtrów galerii z `aria-pressed`,
- widoczne style `:focus-visible`,
- obsługa `prefers-reduced-motion: reduce` w `css/modules/base.css` i `css/modules/layout.css`.

Nie przeprowadzono formalnego audytu zgodności, dlatego dokumentacja nie deklaruje zgodności z WCAG.

### SEO

- Unikalne tytuły i opisy meta na wszystkich stronach oraz atrybut `lang="pl"` w każdym dokumencie.
- Znaczniki `canonical` na stronach indeksowanych.
- `robots` z wartością `index,follow` na ośmiu stronach oraz `noindex,follow` na `tour.html`, `dziekuje.html`, `404.html` i `offline.html`.
- Open Graph oraz Twitter Cards (`summary_large_image`) z bezwzględnymi adresami obrazu podglądu.
- Dane strukturalne JSON-LD: `WebSite`, `WebPage`, `TravelAgency`, `PostalAddress`, `CollectionPage`, `AboutPage`, `ContactPage`, `BreadcrumbList` i `ListItem`.
- `robots.txt` ze wskazaniem mapy witryny oraz `sitemap.xml` z ośmioma adresami.

### PWA i obsługa offline

- `site.webmanifest` deklaruje nazwę, `start_url`, `scope`, tryb `standalone`, kolory, ikony 192 i 512 px (w tym warianty `maskable`), trzy skróty aplikacji i dwa zrzuty ekranu. Manifest jest podpięty we wszystkich 12 stronach.
- `service-worker.js` używa stałej `VERSION` (obecnie `aurora-1.4`) do nazwania dwóch cache'ów: statycznego i HTML. Podczas instalacji precache obejmuje `/`, `/index.html`, `/css/style.min.css`, `/js/script.min.js`, `/site.webmanifest` i `/offline.html`.
- Żądania HTML są obsługiwane strategią network-first z zapisem odpowiedzi w cache'u HTML i zwrotem `offline.html`, gdy sieć jest niedostępna. Zasoby o typie `style`, `script`, `image` i `font` są obsługiwane strategią cache-first.
- Podczas aktywacji usuwane są cache'e spoza bieżącej wersji.
- Nowa wersja Service Workera wyzwala w aplikacji baner z akcją odświeżenia; baner wysyła komunikat `SKIP_WAITING`, a zmiana kontrolera powoduje przeładowanie strony.

Instalowalność aplikacji nie była weryfikowana w przeglądarce.

### Wydajność

- Obrazy responsywne w `picture` z `srcset` i `sizes` w formatach `avif`, `webp` i `jpg`, generowane przez pipeline w szerokościach zdefiniowanych per katalog.
- Jawne atrybuty `width` i `height` na obrazach generowanych i osadzonych w HTML.
- `loading="eager"` i `fetchpriority="high"` na obrazie hero strony głównej; `loading="lazy"` na pozostałych obrazach oraz na ramce mapy w `contact.html`.
- Samodzielnie hostowane kroje zmienne w formacie `woff2` z `font-display: swap`.
- Minifikacja CSS (`cssnano`) i JS (esbuild).
- Brak zależności runtime po stronie przeglądarki.
- Cache-first dla zasobów statycznych w Service Workerze.

Nie przeprowadzono pomiarów wydajności, dlatego dokumentacja nie zawiera wyników ani wartości docelowych.

### Dane i trwałość stanu

- Treść ofert i galerii jest utrzymywana w statycznych plikach `assets/data/tours.json` i `assets/data/gallery-data.json`, pobieranych przez `fetch()` w przeglądarce.
- Projekt nie zawiera backendu, bazy danych, kont użytkowników ani synchronizacji między urządzeniami.
- Dane trwałe ograniczają się do `localStorage` w przeglądarce: klucz `kp-travel-theme` (wybrany motyw) oraz `aurora-project-notice-accepted` (akceptacja informacji o projekcie). Odczyty i zapisy są zabezpieczone blokami `try/catch`.
- Service Worker przechowuje odpowiedzi w Cache Storage pod nazwami zależnymi od stałej `VERSION`.
- Dane formularza kontaktowego opuszczają przeglądarkę wyłącznie przez obsługę formularzy hostingu statycznego; repozytorium nie zawiera kodu przetwarzającego te zgłoszenia.

### Utrzymanie projektu

- Źródłami są `css/style.css` wraz z `css/modules/` oraz `js/script.js` wraz z `js/features/`. Plików `css/style.min.css` i `js/script.min.js` nie należy edytować ręcznie — są generowane, ale wersjonowane, więc po zmianie źródeł wymagają przebudowania i zatwierdzenia w repozytorium.
- Obrazy rastrowe należy zmieniać w `assets/img-src/`, a następnie uruchamiać `npm run build:images`. Skrypt usuwa z `assets/img/` zarządzane pliki rastrowe, których nie przewiduje bieżący plan generowania. Pliki SVG i inne nierastrowe nie są objęte pipeline'em.
- Wartości `id` w `assets/data/tours.json` muszą odpowiadać odnośnikom `tour.html?id=` w `tours.html`. Wartości `base` w `assets/data/gallery-data.json` są rozwiązywane względem `assets/img/tours/`.
- Nową stronę HTML w katalogu głównym należy dodać do listy `htmlPages` w `scripts/check-css-assets.js`, a jeżeli ma być indeksowana — także do `sitemap.xml`.
- Po zmianie zasobów objętych cache'owaniem należy podnieść stałą `VERSION` w `service-worker.js`.
- Notatki o pipeline i zawartości paczki dystrybucyjnej znajdują się w [pipeline-notes.md](pipeline-notes.md), a historia zmian w [docs/CHANGELOG.md](docs/CHANGELOG.md).

### Licencja

Projekt jest objęty Własnościową Licencją Projektu KP_CODE w wersji 1.0, której pełną i wiążącą treść zawiera plik [LICENSE](LICENSE). Copyright © 2026 Kamil Król — KP_Code. Metadane pakietu deklarują `"license": "UNLICENSED"` i `"private": true`.

### Atrybucje

- Kroje pisma: samodzielnie hostowane pliki zmienne `Inter-VariableFont.woff2` i `Manrope-VariableFont.woff2` w `assets/fonts/`. Repozytorium nie zawiera plików licencyjnych tych krojów.
- Mapa na stronie `contact.html` jest osadzona jako ramka Map Google i uwzględniona w dyrektywie `frame-src` w `_headers`.

## EN

### Project Overview

Aurora Travel is a multi-page static travel-agency website in Polish, built from hand-written HTML, modular CSS, and a bundled JavaScript entry point. The repository contains 12 pages in the project root: home, tour listing, tour detail, gallery, about, contact, thank-you, 404, offline, and three legal pages.

The project has no backend and no database. Content is delivered as static HTML supplemented by two JSON files fetched in the browser, and the contact form relies on static-hosting form handling. User state (theme, project-notice acknowledgement) is stored only in the browser.

According to the project notice rendered on the pages, the site is a demonstration project prepared by KP_Code Digital Studio as a sample implementation for the hospitality and travel sector.

### Live Version

https://hospitality-pr02-aurora.netlify.app/

This is the canonical origin declared in the `canonical` tags, in `sitemap.xml`, in `robots.txt`, and in the `productionDomain` constant in `scripts/check-asset-integrity.js`. The address was checked while preparing this documentation and returns the project home page; the repository contains no information that would identify which revision the published version corresponds to.

### Key Features

- Offer filtering on `tours.html` by type and region, plus sorting by price and number of days; the matched-offer count is updated inside a `role="status" aria-live="polite"` region. Offer cards are static HTML annotated with `data-type`, `data-region`, `data-price`, and `data-days`.
- Tour detail view (`tour.html`) rendered from `assets/data/tours.json` based on the `?id=` parameter, with description sanitisation driven by an allow-list of tags.
- Gallery (`gallery.html`) rendered from `assets/data/gallery-data.json` with destination filtering (buttons carrying `aria-pressed`).
- A shared lightbox for the gallery and the tour-detail gallery: opening with `Enter` or `Space`, arrow-key navigation, `Escape` to close, focus trapping, focus return to the triggering element, touch swiping, and fullscreen toggling.
- Light/dark theme toggle persisted in `localStorage`, complemented by a `<head>` script that applies the stored preference or `prefers-color-scheme` before the stylesheet loads.
- Client-side contact form validation: required fields, e-mail format, minimum phone length, start date not earlier than today, end date not earlier than the start date, participant count within 1–12, and the RODO consent checkbox. Messages are written into associated `aria-live` regions and fields receive `aria-invalid`.
- Mobile navigation with focus trapping, `Escape` dismissal, scroll locking, and focus return.
- Tabs with arrow-key navigation and an FAQ accordion driven by `aria-expanded`.
- Reveal-on-scroll animations based on `IntersectionObserver`, with a fallback that reveals content when the API is unavailable.
- Service Worker with versioned caches, cache-first delivery for static assets, network-first delivery for HTML, and `offline.html` as the fallback.
- An application update banner that activates a waiting Service Worker and reloads the page once the controller changes.
- A dismissible project notice whose acknowledgement is stored in `localStorage`.

### Tech Stack

**Runtime**

- HTML
- CSS with custom properties and a module split
- JavaScript in ES modules

**Build and tooling**

- Node.js and npm scripts
- PostCSS (`postcss`, `postcss-cli`) with the `postcss-import`, `autoprefixer`, and `cssnano` plugins
- esbuild (bundling and minification, `es2018` target)
- sharp (image variant generation)

**Validation**

- Custom Node scripts in `scripts/`

**Static hosting**

- `_headers`, `_redirects`, `site.webmanifest`, `robots.txt`, `sitemap.xml`
- Netlify form attributes (`data-netlify`, `netlify-honeypot`) in `contact.html`

The project has no runtime dependencies; every package is declared under `devDependencies`.

### Architecture

- **Pages.** Each root-level page is a standalone HTML document referencing `css/style.min.css` and `js/script.min.js`. The presence of these references is enforced by `scripts/check-css-assets.js`.
- **CSS.** `css/style.css` is the single entry point and imports eight modules from `css/modules/` (`tokens`, `base`, `layout`, `components`, `sections`, `fonts`, `subpages`, `utilities`). PostCSS inlines the imports, adds prefixes, and minifies the result into `css/style.min.css`.
- **JavaScript.** `js/script.js` composes 14 feature modules from `js/features/`. Each module exports an `init*` function that returns early when its element is not present in the DOM, so a single bundle serves every page. esbuild produces `js/script.min.js`.
- **Data.** `assets/data/tours.json` holds 6 tours and is fetched by `js/features/tour-detail.js`; `assets/data/gallery-data.json` holds 36 entries and is fetched by `js/features/gallery.js`. The offer list on `tours.html` remains static HTML.
- **Images.** `assets/img-src/` is the source tree and `assets/img/` is the output generated by `scripts/build-images.js`. The script produces width variants according to a per-directory profile plus `webp` and `avif` files alongside the fallback format.
- **Service Worker.** `service-worker.js` lives in the project root and is registered from `js/script.js` after the `load` event.
- **Packaging.** `scripts/build-dist.js` copies the deployable file set into the `dist/` directory.

### Project Structure

```text
.
├─ assets/
│  ├─ data/                  # tours.json, gallery-data.json
│  ├─ fonts/                 # Inter-VariableFont.woff2, Manrope-VariableFont.woff2
│  ├─ img/                   # generated images (jpg/webp/avif) plus icons, logo, og-img, screenshots, shortcuts
│  └─ img-src/               # raster sources for the image pipeline
├─ css/
│  ├─ modules/               # tokens, base, layout, components, sections, fonts, subpages, utilities
│  ├─ style.css              # CSS entry point
│  └─ style.min.css          # generated production stylesheet
├─ js/
│  ├─ features/              # init* feature modules
│  ├─ script.js              # JS entry point
│  └─ script.min.js          # generated production bundle
├─ scripts/                  # build, packaging, and validation scripts
├─ docs/
│  └─ CHANGELOG.md
├─ index.html
├─ tours.html
├─ tour.html
├─ gallery.html
├─ about.html
├─ contact.html
├─ dziekuje.html
├─ 404.html
├─ offline.html
├─ cookies.html
├─ regulamin.html
├─ polityka-prywatnosci.html
├─ service-worker.js
├─ site.webmanifest
├─ robots.txt
├─ sitemap.xml
├─ _headers
├─ _redirects
├─ postcss.config.js
├─ settings.md
├─ pipeline-notes.md
├─ LICENSE
├─ package.json
└─ package-lock.json
```

### Installation

```bash
npm install
```

The repository ships a `package-lock.json` with `lockfileVersion: 3`. Node.js and npm are required; the repository does not declare a required Node.js version (no `engines` field, no `.nvmrc`, no `.node-version`). The project uses no environment variables.

### Local Development

Rebuild the production files automatically while working on the sources:

```bash
npm run watch:css
npm run watch:js
```

The pages load only `css/style.min.css` and `js/script.min.js`, so changes in `css/style.css`, `css/modules/`, `js/script.js`, and `js/features/` become visible only after those files are rebuilt.

The repository contains no development-server script. Preview the site through any HTTP server rooted at the project directory — Service Worker registration and `fetch()` of `assets/data/*.json` do not work when the files are opened over `file://`.

### Available Scripts

- `npm run build:css` — builds `css/style.min.css` from `css/style.css` via PostCSS, then runs `verify:css`.
- `npm run build:js` — bundles and minifies `js/script.js` into `js/script.min.js` via esbuild, then runs `verify:js`.
- `npm run watch:css` / `npm run watch:js` — the same operations in watch mode, without the verification step.
- `npm run verify:css` — checks that `css/style.min.css` exists and contains no `@import` directives or sourcemap references.
- `npm run verify:js` — checks that `js/script.min.js` exists and contains no `import` or `export` syntax.
- `npm run check:css-assets` — checks that all 12 pages reference the production assets and that the precache list in `service-worker.js` contains no source paths.
- `npm run check:assets` — scans the HTML pages for missing files in `href`, `src`, and `srcset` attributes, in `og:image` and `twitter:image` URLs, in JSON-LD data, and in `site.webmanifest`.
- `npm run build` — `build:css`, `build:js`, `check:css-assets`, `check:assets`.
- `npm run clean` — removes the `dist/` directory.
- `npm run dist` — `clean`, `build`, then packaging via `scripts/build-dist.js`.
- `npm run images:bootstrap` — performs a one-time copy of existing raster files from `assets/img/` into `assets/img-src/`.
- `npm run build:images` — generates `assets/img/` from `assets/img-src/`; deliberately kept outside the default `build` chain.
- `npm test` — a placeholder script that exits with an error; no test runner is configured in the project.

A per-script breakdown and the recommended workflow are documented in [settings.md](settings.md).

### Production Build

```bash
npm run build
npm run dist
```

`npm run dist` prepares a `dist/` directory containing the root `*.html` files, the `assets/` directory, `css/style.min.css`, `js/script.min.js`, `service-worker.js`, and — when present — `_headers`, `_redirects`, `site.webmanifest`, `robots.txt`, and `sitemap.xml`. A missing required file (`css/style.min.css`, `js/script.min.js`, `service-worker.js`) aborts packaging.

`dist/` is excluded from the repository by `.gitignore`. `css/style.min.css` and `js/script.min.js`, by contrast, are tracked, because the HTML pages reference them.

The `build` and `dist` commands were not executed while preparing this documentation; running them requires installed dependencies.

### Testing and Validation

No test framework and no unit or browser tests are configured in the project — `npm test` is a placeholder that exits with an error. Quality control is provided by four Node scripts executed as part of `npm run build`:

- `scripts/verify-built-css.js`
- `scripts/verify-built-js.js`
- `scripts/check-css-assets.js`
- `scripts/check-asset-integrity.js`

All four scripts were executed directly with `node` against the current repository state while preparing this documentation and completed successfully; the asset integrity check scanned 12 HTML files. These scripts require no installed dependencies and modify no files. No accessibility, SEO, or performance audits were carried out.

### Deployment

The repository contains static-hosting configuration but no CI/CD configuration and no `netlify.toml`, so publishing is not automated from within the repository.

- `_redirects` — the `/* /index.html 200` rule acts as the fallback for unmatched paths.
- `_headers` — Content-Security-Policy (including `default-src 'self'`, `object-src 'none'`, and `frame-src https://www.google.com` for the embedded map), Strict-Transport-Security, `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, and Cross-Origin-Opener-Policy.
- The form in `contact.html` uses `method="POST"`, `action="dziekuje.html"`, `data-netlify="true"`, `netlify-honeypot="bot-field"`, and a hidden `form-name` field — the form-handling convention used by Netlify.
- The deployable output is the `dist/` directory produced by `npm run dist`.

### Accessibility

Implemented mechanisms:

- a skip link to the main content and semantic `header`, `nav`, `main`, and `footer` landmarks,
- automatic marking of the active link with `aria-current="page"`,
- focus trapping, `Escape` handling, and focus return in the mobile navigation and the lightbox,
- tabs with arrow-key navigation and `tabindex` management, and an accordion driven by `aria-expanded`,
- form validation messages in `aria-live="polite"` regions associated through `aria-describedby`, together with `aria-invalid` on the fields,
- the matched-offer counter and the gallery container announced as `aria-live` regions,
- gallery filter buttons carrying `aria-pressed`,
- visible `:focus-visible` styles,
- `prefers-reduced-motion: reduce` handling in `css/modules/base.css` and `css/modules/layout.css`.

No formal conformance audit was carried out, so this documentation makes no WCAG conformance claim.

### SEO

- Unique titles and meta descriptions on every page, and a `lang="pl"` attribute on every document.
- `canonical` tags on the indexable pages.
- `robots` set to `index,follow` on eight pages and to `noindex,follow` on `tour.html`, `dziekuje.html`, `404.html`, and `offline.html`.
- Open Graph and Twitter Cards (`summary_large_image`) with absolute preview-image URLs.
- JSON-LD structured data: `WebSite`, `WebPage`, `TravelAgency`, `PostalAddress`, `CollectionPage`, `AboutPage`, `ContactPage`, `BreadcrumbList`, and `ListItem`.
- `robots.txt` pointing to the sitemap, and `sitemap.xml` listing eight URLs.

### PWA and Offline Support

- `site.webmanifest` declares the name, `start_url`, `scope`, `standalone` display mode, colors, 192 and 512 px icons (including `maskable` variants), three application shortcuts, and two screenshots. The manifest is linked from all 12 pages.
- `service-worker.js` uses a `VERSION` constant (currently `aurora-1.4`) to name two caches, one for static assets and one for HTML. On install, the precache covers `/`, `/index.html`, `/css/style.min.css`, `/js/script.min.js`, `/site.webmanifest`, and `/offline.html`.
- HTML requests are served network-first, storing responses in the HTML cache and returning `offline.html` when the network is unavailable. Requests whose destination is `style`, `script`, `image`, or `font` are served cache-first.
- On activation, caches outside the current version are deleted.
- A new Service Worker version triggers an in-page banner with a refresh action; the banner posts a `SKIP_WAITING` message, and the controller change reloads the page.

Installability was not verified in a browser.

### Performance

- Responsive images in `picture` with `srcset` and `sizes` in the `avif`, `webp`, and `jpg` formats, generated by the pipeline at per-directory widths.
- Explicit `width` and `height` attributes on generated and inline HTML images.
- `loading="eager"` and `fetchpriority="high"` on the home-page hero image; `loading="lazy"` on the remaining images and on the map iframe in `contact.html`.
- Self-hosted variable fonts in `woff2` with `font-display: swap`.
- CSS minification (`cssnano`) and JS minification (esbuild).
- No runtime dependencies on the browser side.
- Cache-first delivery of static assets in the Service Worker.

No performance measurements were taken, so this documentation contains no results or target values.

### Data and State Persistence

- Tour and gallery content is maintained in the static files `assets/data/tours.json` and `assets/data/gallery-data.json`, fetched with `fetch()` in the browser.
- The project contains no backend, no database, no user accounts, and no cross-device synchronization.
- Persistent data is limited to browser `localStorage`: the `kp-travel-theme` key (selected theme) and `aurora-project-notice-accepted` (project-notice acknowledgement). Reads and writes are wrapped in `try/catch`.
- The Service Worker stores responses in Cache Storage under names derived from the `VERSION` constant.
- Contact form data leaves the browser only through the static host's form handling; the repository contains no code that processes those submissions.

### Project Maintenance

- The sources are `css/style.css` together with `css/modules/`, and `js/script.js` together with `js/features/`. `css/style.min.css` and `js/script.min.js` must not be edited by hand — they are generated but tracked, so source changes require a rebuild and a commit of the regenerated files.
- Raster images should be changed in `assets/img-src/`, followed by `npm run build:images`. The script removes managed raster files from `assets/img/` that the current generation plan no longer expects. SVG and other non-raster files are outside the pipeline.
- The `id` values in `assets/data/tours.json` must match the `tour.html?id=` links in `tours.html`. The `base` values in `assets/data/gallery-data.json` resolve against `assets/img/tours/`.
- A new root-level HTML page must be added to the `htmlPages` list in `scripts/check-css-assets.js` and, if it is meant to be indexed, to `sitemap.xml`.
- Raise the `VERSION` constant in `service-worker.js` after changing cached assets.
- Pipeline notes and the contents of the distribution package are documented in [pipeline-notes.md](pipeline-notes.md), and the change history in [docs/CHANGELOG.md](docs/CHANGELOG.md).

### License

The project is covered by the KP_CODE Proprietary Project License, version 1.0, whose full and binding terms are contained in the [LICENSE](LICENSE) file. Copyright © 2026 Kamil Król — KP_Code. The package metadata declares `"license": "UNLICENSED"` and `"private": true`.

### Attributions

- Typefaces: the self-hosted variable font files `Inter-VariableFont.woff2` and `Manrope-VariableFont.woff2` in `assets/fonts/`. The repository includes no license files for these typefaces.
- The map on `contact.html` is embedded as a Google Maps frame and is accounted for by the `frame-src` directive in `_headers`.
