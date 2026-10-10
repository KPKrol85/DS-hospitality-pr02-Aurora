# Aurora Travel

## PL

### Przegląd projektu

Aurora Travel to wielostronicowy, statyczny serwis biura podróży w języku polskim, zbudowany z ręcznie pisanego HTML, modularnego CSS i bundlowanego JavaScriptu. Repozytorium zawiera 12 stron w katalogu głównym: stronę główną, listę wycieczek, widok szczegółów wycieczki, galerię, stronę o firmie, kontakt, stronę podziękowania, 404, stronę offline oraz trzy strony prawne.

Projekt nie posiada backendu ani bazy danych. Treść jest dostarczana jako statyczny HTML uzupełniony dwoma plikami JSON pobieranymi w przeglądarce, a formularz kontaktowy korzysta z obsługi formularzy po stronie hostingu statycznego. Stan użytkownika (motyw, akceptacja informacji o projekcie) jest przechowywany wyłącznie lokalnie w przeglądarce.

Zgodnie z treścią informacji o projekcie wyświetlanej na stronach, serwis ma charakter demonstracyjny i został przygotowany przez KP_Code Digital Studio jako przykładowa realizacja dla branży hotelarskiej i turystycznej.

### Wersja online

https://ds-hospitality-pr02-aurora.netlify.app/

Jest to adres produkcyjny potwierdzony przez właściciela projektu i adres kanoniczny zadeklarowany w znacznikach `canonical`, w `sitemap.xml`, w `robots.txt`, w polu `homepage` w `package.json` oraz w stałej `productionDomain` w `scripts/check-asset-integrity.js`. Repozytorium nie zawiera informacji pozwalającej ustalić, której rewizji odpowiada opublikowana wersja.

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
- Vitest ze środowiskiem jsdom (testy regresji w katalogu `tests/`)

**Hosting statyczny**

- `_headers`, `site.webmanifest`, `robots.txt`, `sitemap.xml`
- Atrybuty formularza Netlify (`data-netlify`, `netlify-honeypot`) w `contact.html`

Projekt nie posiada zależności runtime; wszystkie pakiety są zadeklarowane jako `devDependencies`.

### Architektura

- **Strony.** Każda strona w katalogu głównym jest samodzielnym dokumentem HTML, który ładuje źródła kanoniczne: `css/style.css` oraz `js/script.js` jako moduł ES (`<script type="module">`). Kopie stron publikowane w `dist/` odwołują się do wygenerowanych plików `css/style.min.css` i `js/script.min.js`. Oba zestawy odwołań są wymuszane przez `scripts/check-css-assets.js`.
- **CSS.** `css/style.css` jest jedynym punktem wejścia i importuje osiem modułów z `css/modules/` (`tokens`, `base`, `layout`, `components`, `sections`, `fonts`, `subpages`, `utilities`). Podczas developmentu przeglądarka rozwiązuje te importy natywnie. PostCSS wstawia importy w miejscu, dodaje prefiksy i minifikuje wynik do `dist/css/style.min.css`.
- **JavaScript.** `js/script.js` składa 14 modułów funkcjonalnych z `js/features/`. Każdy z nich eksportuje funkcję `init*`, która kończy działanie, gdy nie znajdzie swojego elementu w DOM, dzięki czemu ten sam kod obsługuje wszystkie strony. Pomocniczy moduł `catalogue-picture.js` eksportuje `createCataloguePicture`, z którego korzystają `gallery.js` i `tour-detail.js`. Podczas developmentu przeglądarka ładuje te moduły bezpośrednio; esbuild buduje z nich bundle `dist/js/script.min.js`.
- **Dane.** `assets/data/tours.json` zawiera 6 wycieczek i jest pobierany przez `js/features/tour-detail.js`; `assets/data/gallery-data.json` zawiera 36 pozycji i jest pobierany przez `js/features/gallery.js`. Lista ofert na `tours.html` pozostaje statycznym HTML-em.
- **Obrazy.** `assets/img-src/` jest źródłem, `assets/img/` wynikiem generowanym przez `scripts/build-images.js`. Skrypt tworzy warianty szerokości według profilu katalogu oraz pliki `webp` i `avif` obok formatu zapasowego.
- **Service Worker.** `service-worker.js` leży w katalogu głównym, jest kopiowany do katalogu głównego `dist/` i rejestrowany po zdarzeniu `load` wyłącznie przez produkcyjny bundle, który esbuild buduje z flagą `--define:__AURORA_PRODUCTION__=true`. Źródła ładowane podczas developmentu go nie rejestrują, a Service Workera pozostawionego na tym samym originie przez wersję produkcyjną wyrejestrowują.
- **Pakowanie.** `scripts/build-dist.js` umieszcza w pustym katalogu `dist/` kopie stron HTML z odwołaniami przepisanymi na pliki produkcyjne, katalog `assets/` bez źródeł obrazów `assets/img-src/`, `service-worker.js` oraz pliki hostingu statycznego; strony w katalogu głównym pozostają niezmienione. Pliki CSS i JS generują następnie `build:css` i `build:js` bezpośrednio w `dist/`.

### Struktura projektu

```text
.
├─ assets/
│  ├─ data/                  # tours.json, gallery-data.json
│  ├─ fonts/                 # Inter-VariableFont.woff2, Manrope-VariableFont.woff2
│  ├─ img/                   # wygenerowane obrazy (jpg/webp/avif) oraz icons, logo, og-img, screenshots, shortcuts
│  └─ img-src/               # źródła rastrowe dla pipeline'u obrazów (niepublikowane)
├─ css/
│  ├─ modules/               # tokens, base, layout, components, sections, fonts, subpages, legal, utilities
│  └─ style.css              # punkt wejścia CSS
├─ js/
│  ├─ features/              # moduły funkcjonalne init*
│  └─ script.js              # punkt wejścia JS
├─ scripts/                  # skrypty build, pakowania, walidacji i podglądu lokalnego
├─ tests/                    # testy regresji Vitest (jsdom)
├─ docs/
│  ├─ archive/               # zakończone plany, audyty i raporty usprawnień
│  │  ├─ audits/
│  │  ├─ improvements/
│  │  └─ plans/
│  ├─ CHANGELOG.md
│  ├─ pipeline-notes.md
│  └─ settings.md
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
├─ service-worker-bundles.json
├─ site.webmanifest
├─ robots.txt
├─ sitemap.xml
├─ _headers
├─ postcss.config.js
├─ vitest.config.mjs
├─ .gitignore
├─ AGENTS.md
├─ CLAUDE.md
├─ LICENSE.md
├─ README.md
├─ package.json
└─ package-lock.json
```

Drzewo obejmuje pliki wersjonowane w Git. Katalogi `dist/` — paczka produkcyjna generowana przez `npm run build` — oraz `node_modules/` powstają lokalnie i są wykluczone z Git przez `.gitignore`.

### Instalacja

```bash
npm install
```

Repozytorium zawiera `package-lock.json` w formacie `lockfileVersion: 3`. Wymagane są Node.js i npm; repozytorium nie deklaruje wymaganej wersji Node.js (brak pola `engines` oraz plików `.nvmrc` i `.node-version`). Pakiety testowe deklarują własne wymagania: Vitest 5 — Node.js `^22.12.0 || ^24.0.0 || >=26.0.0`, jsdom 30 — `^22.22.2 || ^24.15.0 || >=26.0.0`; build produkcyjny z nich nie korzysta. Projekt nie korzysta ze zmiennych środowiskowych.

### Development lokalny

Strony w katalogu głównym ładują bezpośrednio źródła kanoniczne: `css/style.css`, którego dyrektywy `@import` przeglądarka rozwiązuje do plików w `css/modules/`, oraz `js/script.js` jako moduł ES wraz z modułami z `js/features/`. Zmiany w tych plikach są widoczne po odświeżeniu strony, bez kroku budowania. Development nie korzysta z plików `*.min.css` ani `*.min.js`.

Podgląd źródeł uruchamia `npm run preview:source` pod adresem `http://127.0.0.1:8181/` — lokalny serwer bez zależności, który udostępnia wyłącznie strony i zasoby witryny. Otwarcie plików przez `file://` nie wystarcza: ładowanie modułów ES oraz pobieranie `assets/data/*.json` przez `fetch()` wymagają HTTP.

Service Worker nie jest rejestrowany podczas developmentu, ponieważ jego lista precache wskazuje pliki produkcyjne istniejące wyłącznie w `dist/`. Podgląd produkcyjny działa domyślnie na innym porcie, czyli pod innym originem, dlatego jego Service Worker nie kontroluje podglądu źródeł. Jeżeli na tym samym originie działał wcześniej produkcyjny Service Worker (np. po podglądzie `dist/` pod tym samym adresem), źródła developerskie go wyrejestrowują; od następnego przeładowania strona nie jest już przez niego kontrolowana.

Po `npm run build` podgląd wersji produkcyjnej uruchamia `npm run preview:dist`: serwuje `dist/` jako katalog główny pod adresem `http://127.0.0.1:8182/`, dodaje do odpowiedzi nagłówki reguły `/*` z `dist/_headers`, w tym Content-Security-Policy, a na nieistniejące ścieżki odpowiada stroną `404.html` ze statusem 404. Nie zastępuje `npm run predeploy:check` i nie odtwarza wszystkich funkcji Netlify, m.in. obsługi formularzy. Zmianę portu, zatrzymanie serwera i pozostałe ograniczenia opisuje [docs/settings.md](docs/settings.md#local-preview). Komendy `npm run watch:css` i `npm run watch:js` odświeżają `dist/css/style.min.css` i `dist/js/script.min.js` w istniejącym katalogu `dist/` — nie są potrzebne do pracy nad źródłami.

### Dostępne skrypty

Komendy potrzebne w codziennej pracy:

- `npm test` — uruchamia testy regresji Vitest; podczas pracy cały pakiet albo wybrane pliki.
- `npm run predeploy:check` — kontrola przed każdym wdrożeniem: pełny pakiet testów, a tylko po jego powodzeniu `npm run build`.
- `npm run build` — tworzy od zera paczkę produkcyjną w `dist/` i weryfikuje źródła oraz paczkę; `npm run dist` jest jego aliasem. Żadna z tych dwóch komend nie uruchamia testów.
- `npm run preview:source` i `npm run preview:dist` — lokalny podgląd źródeł (`http://127.0.0.1:8181/`) oraz zbudowanej paczki `dist/` z jej nagłówkami i stroną 404 (`http://127.0.0.1:8182/`).
- `npm run build:images` — generuje `assets/img/` z `assets/img-src/` po zmianie obrazów źródłowych; celowo pozostaje poza łańcuchem `build`.

Pozostałe skrypty to etapy i kontrole uruchamiane przez `npm run build` (`clean`, `build:stage`, `build:css`, `build:js`, `verify:*`, `check:*`), tryby obserwowania `watch:css` i `watch:js` do podglądu istniejącego `dist/`, `record:sw-bundles` do zapisu zatwierdzonej wersji cache'u Service Workera oraz `images:bootstrap`. Polecenie, działanie i moment użycia każdego skryptu, a także rekomendowany przebieg pracy, opisuje [docs/settings.md](docs/settings.md#packagejson-scripts).

### Build produkcyjny

```bash
npm run build
```

`npm run build` tworzy katalog `dist/` od zera, wyłącznie ze źródeł kanonicznych: przygotowuje kopie stron z odwołaniami przepisanymi na pliki produkcyjne, generuje zminifikowane CSS i JS, a następnie sprawdza źródła i gotową paczkę, w tym skróty CSP skryptów inline zatwierdzone w `_headers` oraz zgodność bundli i `VERSION` Service Workera z rejestrem `service-worker-bundles.json`. Pierwszy nieudany krok przerywa build. Komenda nie modyfikuje plików źródłowych, nie uruchamia testów regresji i wymaga zainstalowanych zależności. `npm run dist` pozostaje jej aliasem dla zgodności wstecznej.

Katalog `dist/` jest kompletnym katalogiem głównym publikacji i jedynym miejscem, w którym powstają zminifikowane bundle CSS i JS; jest wykluczony z Git. Nie trafiają do niego źródła developerskie, w tym `assets/img-src/` — źródła rastrowe dla `npm run build:images` — ani wersjonowany w Git rejestr zatwierdzeń `service-worker-bundles.json`.

Kolejność etapów buildu opisuje sekcja [Build workflow](docs/pipeline-notes.md#build-workflow), a dokładną zawartość paczki — sekcja [Files included in dist](docs/pipeline-notes.md#files-included-in-dist) w `docs/pipeline-notes.md`.

### Testy i walidacja

Podczas pracy można uruchamiać cały pakiet testów regresji albo — zależnie od zakresu zmian — wybrane pliki:

```bash
npm test
npm test -- tests/form.test.js
```

Przed każdym wdrożeniem, niezależnie od zakresu zmian, należy uruchomić kontrolę przedwdrożeniową:

```bash
npm run predeploy:check
```

Wykonuje ona pełny `npm test`, a dopiero po powodzeniu wszystkich testów `npm run build`; niepowodzenie testu kończy ją niezerowym kodem wyjścia, zanim `dist/` zostanie wyczyszczony i zbudowany ponownie. Osobne uruchamianie `npm test` przed nią nie jest potrzebne. `npm run build` i `npm run dist` nie uruchamiają testów i pozostają dostępne niezależnie.

Testy (Vitest, środowisko jsdom, katalog `tests/`) importują rzeczywiste moduły z `js/features/`, znaczniki wczytują z utrzymywanych stron HTML, a dane — z `assets/data/*.json`. `fetch` jest mockowany, a bieżąca data ustalona, więc pakiet nie wykonuje żądań sieciowych i nie zależy od dnia ani strefy czasowej. Obejmuje m.in. widoki oparte na danych i formularz kontaktowy, obsługę klawiatury i fokusu, inicjalizację stron, produkcyjny `service-worker.js`, kontrakty CSS, bootstrap motywu i wskazówki preload fontów, a także skrypty kontrolne i etap `build:stage` uruchamiane na plikach tymczasowych. Pełny zakres pakietu opisuje [docs/settings.md](docs/settings.md#packagejson-scripts). Testy nie trafiają do `dist/`, a w projekcie nie ma testów przeglądarkowych.

Kontrole źródeł i paczki produkcyjnej (`verify:*`, `check:*`) są częścią `npm run build`. Zakres każdej z nich opisuje [docs/settings.md](docs/settings.md#packagejson-scripts), a kontrakty, które egzekwują — [docs/pipeline-notes.md](docs/pipeline-notes.md). Nie przeprowadzono audytów dostępności, SEO ani wydajności.

### Wdrożenie

Repozytorium zawiera konfigurację hostingu statycznego, ale nie zawiera konfiguracji CI/CD ani pliku `netlify.toml`, więc publikacja nie jest zautomatyzowana z poziomu repozytorium.

- `404.html` — utrzymywana strona błędu. Netlify serwuje plik `404.html` z katalogu głównego publikacji ze statusem HTTP 404 dla każdej ścieżki, której nie odpowiada żaden plik. Repozytorium nie zawiera pliku `_redirects` ani reguł przepisywania ścieżek, więc istniejące strony są serwowane bezpośrednio z odpowiadających im plików HTML, a `npm run build` kopiuje `404.html` do katalogu głównego `dist/`.
- `_headers` — Content-Security-Policy (m.in. `default-src 'self'`, `script-src 'self'` ze skrótami SHA-256 trzech wariantów bootstrapu motywu zamiast `'unsafe-inline'`, `object-src 'none'`, `frame-src https://www.google.com` dla osadzonej mapy), Strict-Transport-Security, `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy i Cross-Origin-Opener-Policy.
- Formularz w `contact.html` używa `method="POST"`, `action="dziekuje.html"`, `data-netlify="true"`, `netlify-honeypot="bot-field"` oraz ukrytego pola `form-name` — jest to sposób obsługi formularzy właściwy dla Netlify.
- Wdrożenie jest ręczne: katalog `dist/` wygenerowany przez zakończone powodzeniem `npm run predeploy:check` publikuje się w Netlify jako katalog główny publikacji. Katalogu głównego repozytorium nie należy publikować — jego strony ładują niezminifikowane źródła i nie rejestrują Service Workera.

### Dostępność

Zaimplementowane mechanizmy:

- skip link do treści głównej oraz semantyczne landmarki `header`, `nav`, `main`, `footer`,
- automatyczne oznaczanie aktywnego odnośnika atrybutem `aria-current="page"`,
- pułapka fokusu, obsługa klawisza `Escape` i powrót fokusu w nawigacji mobilnej oraz w lightboxie,
- zakładki z nawigacją strzałkami i zarządzaniem atrybutem `tabindex`, akordeon oparty na `aria-expanded`,
- komunikaty walidacji formularza w obszarach `aria-live="polite"` powiązanych przez `aria-describedby`, wraz z `aria-invalid` na polach,
- licznik dopasowanych ofert ogłaszany jako obszar `aria-live` oraz stany ładowania i niedostępnych danych widoku wycieczki i galerii ogłaszane w osobnych obszarach `role="status"` (bez ogłaszania całej zawartości galerii),
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
- `service-worker.js` nazywa dwa cache'e — statyczny i HTML — stałą `VERSION`, której bieżąca wartość jest zdefiniowana w tym pliku. Podczas instalacji zapisuje w cache'u stronę główną, oba bundle produkcyjne, manifest i `offline.html`; dokładną listę precache opisuje [docs/pipeline-notes.md](docs/pipeline-notes.md#service-worker).
- Bundle `/css/style.min.css` i `/js/script.min.js` mają stałe adresy i są serwowane z cache'u, więc powracający użytkownicy otrzymują ich nową treść dopiero po zmianie `VERSION`. `npm run build` kończy się błędem, gdy wygenerowany bundle albo `VERSION` różni się od wartości zatwierdzonych w wersjonowanym w Git rejestrze `service-worker-bundles.json`.
- Service Workera rejestruje wyłącznie produkcyjny bundle `dist/js/script.min.js`; strony ładujące źródła podczas developmentu go nie rejestrują.
- Żądania HTML są obsługiwane strategią network-first z zapisem odpowiedzi w cache'u HTML i zwrotem `offline.html`, gdy sieć jest niedostępna. Zasoby o typie `style`, `script`, `image` i `font` są obsługiwane strategią cache-first.
- Podczas aktywacji usuwane są cache'e spoza bieżącej wersji.
- Nowa wersja Service Workera wyzwala w aplikacji baner z akcją odświeżenia; baner wysyła komunikat `SKIP_WAITING`, a zmiana kontrolera powoduje przeładowanie strony.

Instalowalność aplikacji nie była weryfikowana w przeglądarce.

### Wydajność

- Obrazy responsywne w `picture` z `srcset` i `sizes` w formatach `avif`, `webp` i `jpg`, generowane przez pipeline w szerokościach zdefiniowanych per katalog.
- Jawne atrybuty `width` i `height` na obrazach generowanych i osadzonych w HTML.
- `loading="eager"` i `fetchpriority="high"` na obrazie hero strony głównej; `loading="lazy"` na pozostałych obrazach oraz na ramce mapy w `contact.html`.
- Samodzielnie hostowane kroje zmienne w formacie `woff2` z `font-display: swap`.
- Wskazówki `<link rel="preload">` między bootstrapem motywu a arkuszem stylów: krój Manrope (logo i nagłówki) na wszystkich stronach, krój Inter (tekst) tylko na `index.html`. Przeglądarka pobiera te fonty równolegle z arkuszem stylów, zamiast odkrywać je dopiero po jego przetworzeniu. Na pozostałych stronach Inter jest nadal odkrywany przez arkusz, ponieważ jego wstępne pobieranie opóźniało arkusz i pierwsze renderowanie przy wolnym łączu.
- Minifikacja CSS (`cssnano`) i JS (esbuild) w paczce produkcyjnej `dist/`.
- Brak zależności runtime po stronie przeglądarki.
- Cache-first dla zasobów statycznych w Service Workerze.

Poza porównaniem ładowania fontów w Chrome, na którym oparto wybór wskazówek preload, nie przeprowadzono pomiarów wydajności; dokumentacja nie podaje wyników liczbowych ani wartości docelowych.

### Dane i trwałość stanu

- Treść ofert i galerii jest utrzymywana w statycznych plikach `assets/data/tours.json` i `assets/data/gallery-data.json`, pobieranych przez `fetch()` w przeglądarce.
- Projekt nie zawiera backendu, bazy danych, kont użytkowników ani synchronizacji między urządzeniami.
- Dane trwałe ograniczają się do `localStorage` w przeglądarce: klucz `kp-travel-theme` (wybrany motyw) oraz `aurora-project-notice-accepted` (akceptacja informacji o projekcie). Odczyty i zapisy są zabezpieczone blokami `try/catch`.
- Service Worker przechowuje odpowiedzi w Cache Storage pod nazwami zależnymi od stałej `VERSION`.
- Dane formularza kontaktowego opuszczają przeglądarkę wyłącznie przez obsługę formularzy hostingu statycznego; repozytorium nie zawiera kodu przetwarzającego te zgłoszenia.

### Utrzymanie projektu

- Źródłami są `css/style.css` wraz z `css/modules/` oraz `js/script.js` wraz z `js/features/`. Pliki `dist/css/style.min.css` i `dist/js/script.min.js` są wynikiem builda: nie są wersjonowane i nie należy ich edytować ręcznie — powstają od nowa przy każdym `npm run build`.
- Obrazy rastrowe należy zmieniać w `assets/img-src/`, a następnie uruchamiać `npm run build:images`. Skrypt usuwa z `assets/img/` zarządzane pliki rastrowe, których nie przewiduje bieżący plan generowania. Pliki SVG i inne nierastrowe nie są objęte pipeline'em.
- Wartości `id` w `assets/data/tours.json` muszą odpowiadać odnośnikom `tour.html?id=` w `tours.html`. Wartości `base` w `assets/data/gallery-data.json` są rozwiązywane względem `assets/img/tours/`.
- Nową stronę HTML w katalogu głównym należy dodać do listy `maintainedPages` w `scripts/site-build-contract.js` — bez tego `npm run build` kończy się błędem i nie publikuje strony — a jeżeli ma być indeksowana, także do `sitemap.xml`. Strona musi zawierać znaczniki wejściowe CSS i JS, które build przepisuje w jej kopii w `dist/`, oraz wskazówki preload fontów sprawdzane przez `npm test`; wymagania opisują sekcje [Asset references](docs/pipeline-notes.md#asset-references) i [Font preload](docs/pipeline-notes.md#font-preload).
- `_headers` jest zatwierdzoną polityką bezpieczeństwa i żaden skrypt go nie aktualizuje. Zmiana bootstrapu motywu albo nowy skrypt inline wymaga przeglądu i ręcznej aktualizacji skrótów SHA-256 w `script-src`; do tego czasu build kończy się błędem. Procedurę opisuje [docs/pipeline-notes.md](docs/pipeline-notes.md#content-security-policy-for-inline-scripts).
- Zmiana bundli wymaga podniesienia `VERSION` w `service-worker.js` i zapisania nowej wersji w `service-worker-bundles.json` przez `npm run record:sw-bundles`; build to wymusza. Po zmianie innych plików przechowywanych w cache'u Service Workera `VERSION` trzeba podnieść tak samo, choć build tego nie wykrywa. Procedurę aktualizacji opisuje [docs/pipeline-notes.md](docs/pipeline-notes.md#service-worker-cache-version).
- Komendy i przebieg pracy — od developmentu po wdrożenie — opisuje [docs/settings.md](docs/settings.md), kontrakty buildu, paczki `dist/`, CSP i Service Workera — [docs/pipeline-notes.md](docs/pipeline-notes.md), a historię zmian — [docs/CHANGELOG.md](docs/CHANGELOG.md).

### Licencja

Projekt jest objęty Własnościową Licencją Projektu KP_CODE w wersji 1.0, której pełną i wiążącą treść zawiera plik [LICENSE.md](LICENSE.md). Copyright © 2026 Kamil Król — KP_Code. Metadane pakietu deklarują `"license": "SEE LICENSE IN LICENSE.md"` i `"private": true`.

### Atrybucje

- Kroje pisma: samodzielnie hostowane pliki zmienne `Inter-VariableFont.woff2` i `Manrope-VariableFont.woff2` w `assets/fonts/`. Repozytorium nie zawiera plików licencyjnych tych krojów.
- Mapa na stronie `contact.html` jest osadzona jako ramka Map Google i uwzględniona w dyrektywie `frame-src` w `_headers`.

## EN

### Project Overview

Aurora Travel is a multi-page static travel-agency website in Polish, built from hand-written HTML, modular CSS, and a bundled JavaScript entry point. The repository contains 12 pages in the project root: home, tour listing, tour detail, gallery, about, contact, thank-you, 404, offline, and three legal pages.

The project has no backend and no database. Content is delivered as static HTML supplemented by two JSON files fetched in the browser, and the contact form relies on static-hosting form handling. User state (theme, project-notice acknowledgement) is stored only in the browser.

According to the project notice rendered on the pages, the site is a demonstration project prepared by KP_Code Digital Studio as a sample implementation for the hospitality and travel sector.

### Live Version

https://ds-hospitality-pr02-aurora.netlify.app/

This is the production address confirmed by the project owner and the canonical origin declared in the `canonical` tags, in `sitemap.xml`, in `robots.txt`, in the `homepage` field of `package.json`, and in the `productionDomain` constant in `scripts/check-asset-integrity.js`. The repository contains no information that would identify which revision the published version corresponds to.

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
- Vitest with a jsdom environment (regression tests in `tests/`)

**Static hosting**

- `_headers`, `site.webmanifest`, `robots.txt`, `sitemap.xml`
- Netlify form attributes (`data-netlify`, `netlify-honeypot`) in `contact.html`

The project has no runtime dependencies; every package is declared under `devDependencies`.

### Architecture

- **Pages.** Each root-level page is a standalone HTML document that loads the canonical sources: `css/style.css` and `js/script.js` as an ES module (`<script type="module">`). The copies published to `dist/` reference the generated `css/style.min.css` and `js/script.min.js`. Both sets of references are enforced by `scripts/check-css-assets.js`.
- **CSS.** `css/style.css` is the single entry point and imports eight modules from `css/modules/` (`tokens`, `base`, `layout`, `components`, `sections`, `fonts`, `subpages`, `utilities`). During development the browser resolves these imports natively. PostCSS inlines the imports, adds prefixes, and minifies the result into `dist/css/style.min.css`.
- **JavaScript.** `js/script.js` composes 14 feature modules from `js/features/`. Each of them exports an `init*` function that returns early when its element is not present in the DOM, so the same code serves every page. The shared helper module `catalogue-picture.js` exports `createCataloguePicture`, which `gallery.js` and `tour-detail.js` use. During development the browser loads these modules directly; esbuild bundles them into `dist/js/script.min.js`.
- **Data.** `assets/data/tours.json` holds 6 tours and is fetched by `js/features/tour-detail.js`; `assets/data/gallery-data.json` holds 36 entries and is fetched by `js/features/gallery.js`. The offer list on `tours.html` remains static HTML.
- **Images.** `assets/img-src/` is the source tree and `assets/img/` is the output generated by `scripts/build-images.js`. The script produces width variants according to a per-directory profile plus `webp` and `avif` files alongside the fallback format.
- **Service Worker.** `service-worker.js` lives in the project root, is copied to the root of `dist/`, and is registered after the `load` event only by the production bundle, which esbuild builds with `--define:__AURORA_PRODUCTION__=true`. The sources loaded during development do not register it, and they unregister a worker left on the same origin by a production build.
- **Packaging.** `scripts/build-dist.js` places copies of the HTML pages with their references rewritten to the production files, the `assets/` directory without the `assets/img-src/` image sources, `service-worker.js`, and the static-hosting files into an empty `dist/` directory; the root pages stay unchanged. `build:css` and `build:js` then generate the CSS and JS directly in `dist/`.

### Project Structure

```text
.
├─ assets/
│  ├─ data/                  # tours.json, gallery-data.json
│  ├─ fonts/                 # Inter-VariableFont.woff2, Manrope-VariableFont.woff2
│  ├─ img/                   # generated images (jpg/webp/avif) plus icons, logo, og-img, screenshots, shortcuts
│  └─ img-src/               # raster sources for the image pipeline (not published)
├─ css/
│  ├─ modules/               # tokens, base, layout, components, sections, fonts, subpages, legal, utilities
│  └─ style.css              # CSS entry point
├─ js/
│  ├─ features/              # init* feature modules
│  └─ script.js              # JS entry point
├─ scripts/                  # build, packaging, validation, and local preview scripts
├─ tests/                    # Vitest (jsdom) regression tests
├─ docs/
│  ├─ archive/               # completed plans, audits, and improvement reports
│  │  ├─ audits/
│  │  ├─ improvements/
│  │  └─ plans/
│  ├─ CHANGELOG.md
│  ├─ pipeline-notes.md
│  └─ settings.md
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
├─ service-worker-bundles.json
├─ site.webmanifest
├─ robots.txt
├─ sitemap.xml
├─ _headers
├─ postcss.config.js
├─ vitest.config.mjs
├─ .gitignore
├─ AGENTS.md
├─ CLAUDE.md
├─ LICENSE.md
├─ README.md
├─ package.json
└─ package-lock.json
```

The tree shows the files tracked in Git. The `dist/` directory — the production package generated by `npm run build` — and `node_modules/` are created locally and excluded from Git by `.gitignore`.

### Installation

```bash
npm install
```

The repository ships a `package-lock.json` with `lockfileVersion: 3`. Node.js and npm are required; the repository does not declare a required Node.js version (no `engines` field, no `.nvmrc`, no `.node-version`). The test packages declare their own requirements: Vitest 5 needs Node.js `^22.12.0 || ^24.0.0 || >=26.0.0` and jsdom 30 needs `^22.22.2 || ^24.15.0 || >=26.0.0`; the production build does not use them. The project uses no environment variables.

### Local Development

The root pages load the canonical sources directly: `css/style.css`, whose `@import` rules the browser resolves to the files in `css/modules/`, and `js/script.js` as an ES module together with the modules in `js/features/`. Changes to these files are visible on reload, with no build step. Development uses no `*.min.css` or `*.min.js` file.

`npm run preview:source` starts the source preview at `http://127.0.0.1:8181/` — a dependency-free local server that exposes only the site's pages and assets. Opening the files over `file://` is not enough: ES module loading and `fetch()` of `assets/data/*.json` require HTTP.

The Service Worker is not registered during development, because its precache list points to production files that exist only in `dist/`. The production preview uses a different port by default, and therefore a different origin, so its Service Worker does not control the source preview. If a production Service Worker was previously active on the same origin (for example after previewing `dist/` at the same address), the development sources unregister it; from the next reload the page is no longer controlled by it.

After `npm run build`, `npm run preview:dist` previews the production build: it serves `dist/` as the origin root at `http://127.0.0.1:8182/`, adds the headers of the `/*` rule in `dist/_headers`, including the Content-Security-Policy, to its responses, and answers unknown paths with `404.html` and status 404. It does not replace `npm run predeploy:check` and does not reproduce every Netlify feature, for example form handling. [docs/settings.md](docs/settings.md#local-preview) describes port overrides, stopping the server, and the remaining limitations. `npm run watch:css` and `npm run watch:js` refresh `dist/css/style.min.css` and `dist/js/script.min.js` inside an existing `dist/` — they are not needed when working on the sources.

### Available Scripts

Commands needed in day-to-day work:

- `npm test` — runs the Vitest regression suite; during development the whole suite or selected files.
- `npm run predeploy:check` — the check before every deployment: the complete test suite and, only when it passes, `npm run build`.
- `npm run build` — builds the production package in `dist/` from scratch and verifies the sources and the package; `npm run dist` is its alias. Neither of the two runs the tests.
- `npm run preview:source` and `npm run preview:dist` — local preview of the sources (`http://127.0.0.1:8181/`) and of the built `dist/` package with its headers and 404 page (`http://127.0.0.1:8182/`).
- `npm run build:images` — generates `assets/img/` from `assets/img-src/` after source images change; deliberately kept outside the `build` chain.

The remaining scripts are the stages and checks that `npm run build` runs (`clean`, `build:stage`, `build:css`, `build:js`, `verify:*`, `check:*`), the `watch:css` and `watch:js` watch modes for previewing an existing `dist/`, `record:sw-bundles` for recording an approved Service Worker cache version, and `images:bootstrap`. [docs/settings.md](docs/settings.md#packagejson-scripts) documents the command, behavior, and intended use of every script, as well as the recommended workflow.

### Production Build

```bash
npm run build
```

`npm run build` recreates `dist/` from scratch, from the canonical sources only: it stages copies of the pages with their references rewritten to the production files, generates the minified CSS and JS, and then checks the sources and the finished package, including the CSP hashes of the inline scripts approved in `_headers` and the match between the bundles, the Service Worker `VERSION`, and the `service-worker-bundles.json` record. The first failing step stops the build. The command modifies no source files, does not run the regression tests, and requires installed dependencies. `npm run dist` remains its alias for backward compatibility.

`dist/` is the complete publish root and the only place where the minified CSS and JS bundles are generated; it is excluded from Git. Development sources do not reach it, including `assets/img-src/` — the raster sources for `npm run build:images` — and neither does the Git-tracked approval record `service-worker-bundles.json`.

The [Build workflow](docs/pipeline-notes.md#build-workflow) section of `docs/pipeline-notes.md` describes the order of the build stages, and its [Files included in dist](docs/pipeline-notes.md#files-included-in-dist) section the exact package contents.

### Testing and Validation

During development, run the whole regression suite or — depending on the scope of the change — selected files:

```bash
npm test
npm test -- tests/form.test.js
```

Before every deployment, whatever changed, run the pre-deployment check:

```bash
npm run predeploy:check
```

It runs the complete `npm test` and only after every test passes `npm run build`; a failing test ends it with a non-zero exit code before `dist/` is cleaned and rebuilt. There is no need to run `npm test` separately before it. `npm run build` and `npm run dist` do not run the tests and remain usable on their own.

The tests (Vitest, jsdom environment, `tests/` directory) import the actual modules from `js/features/`, load their markup from the maintained HTML pages and their data from `assets/data/*.json`. `fetch` is mocked and the current date is fixed, so the suite makes no network requests and does not depend on the day or time zone. It covers, among other things, the data-driven views and the contact form, keyboard and focus handling, page initialization, the production `service-worker.js`, the CSS contracts, the theme bootstrap and the font preload hints, as well as the checker scripts and the `build:stage` step run against temporary files. [docs/settings.md](docs/settings.md#packagejson-scripts) describes the full scope of the suite. The tests do not reach `dist/`, and the project has no browser tests.

The source and production package checks (`verify:*`, `check:*`) are part of `npm run build`. [docs/settings.md](docs/settings.md#packagejson-scripts) describes the scope of each, and [docs/pipeline-notes.md](docs/pipeline-notes.md) the contracts they enforce. No accessibility, SEO, or performance audits were carried out.

### Deployment

The repository contains static-hosting configuration but no CI/CD configuration and no `netlify.toml`, so publishing is not automated from within the repository.

- `404.html` — the maintained error page. Netlify serves `404.html` from the root of the publish directory, with HTTP status 404, for any path that matches no file. The repository contains no `_redirects` file and no rewrite rules, so existing pages are served directly from their HTML files, and `npm run build` copies `404.html` to the root of `dist/`.
- `_headers` — Content-Security-Policy (including `default-src 'self'`, `script-src 'self'` with the SHA-256 hashes of the three theme bootstrap variants instead of `'unsafe-inline'`, `object-src 'none'`, and `frame-src https://www.google.com` for the embedded map), Strict-Transport-Security, `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, and Cross-Origin-Opener-Policy.
- The form in `contact.html` uses `method="POST"`, `action="dziekuje.html"`, `data-netlify="true"`, `netlify-honeypot="bot-field"`, and a hidden `form-name` field — the form-handling convention used by Netlify.
- Deployment is manual: publish the `dist/` directory produced by a passing `npm run predeploy:check` to Netlify as the publish root. Do not publish the repository root — its pages load the unminified sources and do not register the Service Worker.

### Accessibility

Implemented mechanisms:

- a skip link to the main content and semantic `header`, `nav`, `main`, and `footer` landmarks,
- automatic marking of the active link with `aria-current="page"`,
- focus trapping, `Escape` handling, and focus return in the mobile navigation and the lightbox,
- tabs with arrow-key navigation and `tabindex` management, and an accordion driven by `aria-expanded`,
- form validation messages in `aria-live="polite"` regions associated through `aria-describedby`, together with `aria-invalid` on the fields,
- the matched-offer counter announced as an `aria-live` region, and the loading and unavailable-data states of the tour detail view and the gallery announced in dedicated `role="status"` regions (without announcing the whole gallery content),
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
- `service-worker.js` names two caches — one for static assets and one for HTML — with a `VERSION` constant whose current value is defined in that file. On install, it caches the home page, both production bundles, the manifest, and `offline.html`; [docs/pipeline-notes.md](docs/pipeline-notes.md#service-worker) lists the exact precache entries.
- The bundles `/css/style.min.css` and `/js/script.min.js` have fixed URLs and are served from the cache, so returning visitors receive new bundle contents only after `VERSION` changes. `npm run build` fails when a generated bundle or `VERSION` differs from the values approved in the Git-tracked record `service-worker-bundles.json`.
- Only the production bundle `dist/js/script.min.js` registers the Service Worker; pages that load the sources during development do not.
- HTML requests are served network-first, storing responses in the HTML cache and returning `offline.html` when the network is unavailable. Requests whose destination is `style`, `script`, `image`, or `font` are served cache-first.
- On activation, caches outside the current version are deleted.
- A new Service Worker version triggers an in-page banner with a refresh action; the banner posts a `SKIP_WAITING` message, and the controller change reloads the page.

Installability was not verified in a browser.

### Performance

- Responsive images in `picture` with `srcset` and `sizes` in the `avif`, `webp`, and `jpg` formats, generated by the pipeline at per-directory widths.
- Explicit `width` and `height` attributes on generated and inline HTML images.
- `loading="eager"` and `fetchpriority="high"` on the home-page hero image; `loading="lazy"` on the remaining images and on the map iframe in `contact.html`.
- Self-hosted variable fonts in `woff2` with `font-display: swap`.
- `<link rel="preload">` hints between the theme bootstrap and the stylesheet: the Manrope typeface (logo and headings) on every page, the Inter typeface (body text) on `index.html` only. The browser downloads these fonts in parallel with the stylesheet instead of discovering them only after processing it. On the other pages Inter is still discovered through the stylesheet, because preloading it delayed the stylesheet and the first paint on a slow connection.
- CSS minification (`cssnano`) and JS minification (esbuild) in the `dist/` production package.
- No runtime dependencies on the browser side.
- Cache-first delivery of static assets in the Service Worker.

Apart from the Chrome comparison of font loading that the preload selection is based on, no performance measurements were taken; this documentation gives no figures or target values.

### Data and State Persistence

- Tour and gallery content is maintained in the static files `assets/data/tours.json` and `assets/data/gallery-data.json`, fetched with `fetch()` in the browser.
- The project contains no backend, no database, no user accounts, and no cross-device synchronization.
- Persistent data is limited to browser `localStorage`: the `kp-travel-theme` key (selected theme) and `aurora-project-notice-accepted` (project-notice acknowledgement). Reads and writes are wrapped in `try/catch`.
- The Service Worker stores responses in Cache Storage under names derived from the `VERSION` constant.
- Contact form data leaves the browser only through the static host's form handling; the repository contains no code that processes those submissions.

### Project Maintenance

- The sources are `css/style.css` together with `css/modules/`, and `js/script.js` together with `js/features/`. `dist/css/style.min.css` and `dist/js/script.min.js` are build output: they are not tracked and must not be edited by hand — every `npm run build` regenerates them.
- Raster images should be changed in `assets/img-src/`, followed by `npm run build:images`. The script removes managed raster files from `assets/img/` that the current generation plan no longer expects. SVG and other non-raster files are outside the pipeline.
- The `id` values in `assets/data/tours.json` must match the `tour.html?id=` links in `tours.html`. The `base` values in `assets/data/gallery-data.json` resolve against `assets/img/tours/`.
- A new root-level HTML page must be added to the `maintainedPages` list in `scripts/site-build-contract.js` — otherwise `npm run build` fails without publishing it — and, if it is meant to be indexed, to `sitemap.xml`. The page must contain the CSS and JS entry tags that the build rewrites in its `dist/` copy, and the font preload hints that `npm test` checks; the [Asset references](docs/pipeline-notes.md#asset-references) and [Font preload](docs/pipeline-notes.md#font-preload) sections describe the requirements.
- `_headers` is the approved security policy, and no script updates it. A change to the theme bootstrap or a new inline script requires a review and a manual update of the SHA-256 hashes in `script-src`; until then the build fails. [docs/pipeline-notes.md](docs/pipeline-notes.md#content-security-policy-for-inline-scripts) describes the procedure.
- A bundle change requires raising `VERSION` in `service-worker.js` and recording the new version in `service-worker-bundles.json` with `npm run record:sw-bundles`; the build enforces this. After a change to other files kept in the Service Worker cache, `VERSION` must be raised the same way, although the build does not detect it. [docs/pipeline-notes.md](docs/pipeline-notes.md#service-worker-cache-version) describes the update procedure.
- [docs/settings.md](docs/settings.md) documents the commands and the workflow from development to deployment, [docs/pipeline-notes.md](docs/pipeline-notes.md) the build, `dist/` package, CSP, and Service Worker contracts, and [docs/CHANGELOG.md](docs/CHANGELOG.md) the change history.

### License

The project is covered by the KP_CODE Proprietary Project License, version 1.0, whose full and binding terms are contained in the [LICENSE.md](LICENSE.md) file. Copyright © 2026 Kamil Król — KP_Code. The package metadata declares `"license": "SEE LICENSE IN LICENSE.md"` and `"private": true`.

### Attributions

- Typefaces: the self-hosted variable font files `Inter-VariableFont.woff2` and `Manrope-VariableFont.woff2` in `assets/fonts/`. The repository includes no license files for these typefaces.
- The map on `contact.html` is embedded as a Google Maps frame and is accounted for by the `frame-src` directive in `_headers`.
