# Third-Party Notices — Aurora Travel

## Purpose and scope

Aurora Travel is a proprietary demonstration project by KP_Code Digital Studio, governed by the [KP_CODE Proprietary Project License 1.0](LICENSE.md). Third-party materials are excluded from that license and remain subject to their own licenses and terms. Their original authors and rights holders retain their respective rights. This index does not replace, restrict, or expand upstream license terms.

**Informacja po polsku:** Dokument wskazuje źródła, autorów i warunki wykorzystania materiałów zewnętrznych w Aurora Travel. Licencja własnościowa projektu nie obejmuje tych materiałów. Ich odrębne licencje pozostają wiążące; niniejszy indeks ich nie zastępuje ani nie zmienia.

Fonts, inline SVG artwork, and exported graphics are redistributed with the project. Google Maps and Netlify Forms are external services. Development tools are listed separately from materials delivered to website visitors.

This index is maintained in the repository. The production build copies the license texts under [assets/fonts/](assets/fonts/) and [assets/licenses/](assets/licenses/), but does not publish this Markdown file or the image inputs under [assets/img-src/](assets/img-src/).

## Fonts

### Inter

- **Redistributed file:** [Inter-VariableFont.woff2](assets/fonts/Inter-VariableFont.woff2).
- **Author and rights holder:** Rasmus Andersson; The Inter Project Authors.
- **Upstream project:** [rsms/inter](https://github.com/rsms/inter).
- **Distribution source:** [Inter in Google Fonts](https://github.com/google/fonts/tree/main/ofl/inter).
- **License:** SIL Open Font License 1.1; preserved in [Inter-OFL.txt](assets/fonts/Inter-OFL.txt).
- **Copyright in the upstream OFL notice:** Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter).

The redistributed WOFF2 is a modified webfont subset covering Latin and Latin Extended, prepared with fontTools as described in the [pipeline notes](docs/pipeline-notes.md#font-preload). The weight axis is retained; the optical-size axis is fixed at 14. It is not an unchanged upstream binary. Its embedded copyright states 2016, as does the [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/inter/METADATA.pb); the separate OFL notice states 2020. Both original notices are retained.

### Manrope

- **Redistributed file:** [Manrope-VariableFont.woff2](assets/fonts/Manrope-VariableFont.woff2).
- **Author and rights holder:** Mikhail Sharanda; The Manrope Project Authors.
- **Upstream project:** [googlefonts/manrope](https://github.com/googlefonts/manrope).
- **Distribution source:** [Manrope in Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope).
- **License:** SIL Open Font License 1.1; preserved in [Manrope-OFL.txt](assets/fonts/Manrope-OFL.txt).
- **Copyright in the upstream OFL notice:** Copyright 2018 The Manrope Project Authors (https://github.com/googlefonts/manrope).

The redistributed WOFF2 is a modified webfont subset covering Latin and Latin Extended, prepared with fontTools with the weight axis retained, as described in the [pipeline notes](docs/pipeline-notes.md#font-preload). It is not an unchanged upstream binary. Its embedded copyright states 2019, as does the [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/manrope/METADATA.pb); the separate OFL notice states 2018. Both original notices are retained.

## Icons

The icon artwork is embedded directly as inline SVG in the maintained HTML pages and copied into production HTML. It is not loaded through an icon CDN, third-party stylesheet, or installed icon package. The versions from which the artwork was originally copied are not established.

### Heroicons

- **Provider:** [Heroicons by Tailwind Labs](https://github.com/tailwindlabs/heroicons).
- **Copyright:** Copyright (c) Tailwind Labs, Inc.
- **License:** MIT; complete upstream notice preserved in [heroicons-LICENSE.txt](assets/licenses/heroicons-LICENSE.txt).
- **Upstream license:** [Heroicons LICENSE](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE).

| Artwork | Upstream source | Local usage |
|---|---|---|
| sun | [24px outline sun](https://github.com/tailwindlabs/heroicons/blob/master/optimized/24/outline/sun.svg) | Theme toggle on all 12 maintained HTML pages, for example [index.html](index.html) |
| moon | [24px outline moon](https://github.com/tailwindlabs/heroicons/blob/master/optimized/24/outline/moon.svg) | Theme toggle on all 12 maintained HTML pages |
| bars-3, probable adaptation | [24px outline bars-3](https://github.com/tailwindlabs/heroicons/blob/master/optimized/24/outline/bars-3.svg) | Navigation toggle on all 12 maintained HTML pages |

The sun and moon path data match upstream. The navigation icon has the corresponding three bar segments split into separate paths for animation, with a changed stroke width. Its geometry strongly supports an adaptation of bars-3; its original source history is not independently established.

### Tabler Icons

- **Provider and author:** [Tabler Icons](https://github.com/tabler/tabler-icons), Paweł Kuna.
- **Copyright in the preserved upstream license:** Copyright (c) 2020-2026 Paweł Kuna.
- **License:** MIT; complete upstream notice preserved in [tabler-icons-LICENSE.txt](assets/licenses/tabler-icons-LICENSE.txt).
- **Upstream license:** [Tabler Icons LICENSE](https://github.com/tabler/tabler-icons/blob/main/LICENSE).

| Artwork | Upstream source | Local usage |
|---|---|---|
| phone | [filled/phone](https://github.com/tabler/tabler-icons/blob/main/icons/filled/phone.svg) | Contact details in all page footers |
| mail | [filled/mail](https://github.com/tabler/tabler-icons/blob/main/icons/filled/mail.svg) | Contact details in all page footers |
| brand-linkedin | [filled/brand-linkedin](https://github.com/tabler/tabler-icons/blob/main/icons/filled/brand-linkedin.svg) | Social links in all page footers |
| brand-facebook | [filled/brand-facebook](https://github.com/tabler/tabler-icons/blob/main/icons/filled/brand-facebook.svg) | Social links in all page footers |
| brand-github | [filled/brand-github](https://github.com/tabler/tabler-icons/blob/main/icons/filled/brand-github.svg) | Social links in all page footers |
| brand-x | [outline/brand-x](https://github.com/tabler/tabler-icons/blob/main/icons/outline/brand-x.svg) | Social links in all page footers |
| x | [outline/x](https://github.com/tabler/tabler-icons/blob/main/icons/outline/x.svg) | Lightbox close control in [gallery.html](gallery.html) and [tour.html](tour.html) |
| square-rounded-arrow-left | [filled/square-rounded-arrow-left](https://github.com/tabler/tabler-icons/blob/main/icons/filled/square-rounded-arrow-left.svg) | Previous-image control in both lightboxes |
| square-rounded-arrow-right | [filled/square-rounded-arrow-right](https://github.com/tabler/tabler-icons/blob/main/icons/filled/square-rounded-arrow-right.svg) | Next-image control in both lightboxes |

These SVG path data match upstream; some local markup also retains Tabler class names, for example in [contact.html](contact.html). Presentation attributes and markup differ from upstream files.

The simple CSS chevron in [components.css](css/modules/components.css) has no established third-party source and is not attributed to an icon provider here.

## Photography and Canva-exported graphics

The project owner confirms that the photographic compositions were prepared and exported using Canva Pro. Source rasters are held in [assets/img-src/](assets/img-src/), with published derivatives in [assets/img/](assets/img/), including the hero, about, contact, tour-index, and tour photography.

The owner also confirms that the Aurora Travel logo was developed in Canva Pro from an existing design/template, supplemented by the owner's visual elements and changes. The logo and brand are used for a fictional demonstration project. The composition is not represented as an entirely original illustration, and the owner claims neither exclusive ownership of third-party Canva elements nor registered trademark rights derived from them.

Related branding is held in [logo assets](assets/img/logo/) and [application icons](assets/img/icons/). The SVG logo and Safari pinned-tab variant share path geometry. Canva export metadata is present in the source [logo PNG](assets/img-src/logo/logo-256.png), [favicon PNG](assets/img-src/icons/favicon-1024x1024.png), the three [shortcut PNGs](assets/img-src/shortcuts/), and both [screenshot JPGs](assets/img-src/screenshots/). This supports the stated export tooling, not independent verification of every element, individual license, or auxiliary graphic.

Embedded Canva library content remains subject to its applicable terms, including the [Canva Content License Agreement](https://www.canva.com/policies/content-license-agreement/). Rights remain with the respective contributors and licensors. The proprietary project license does not claim ownership of independently licensed Canva elements or grant additional rights to extract, redistribute, or reuse them.

## Third-party brand marks

The footer includes LinkedIn, Facebook, GitHub, and X symbols rendered using the Tabler SVG artwork identified above. Their brand names and marks remain the property of their respective rights holders. The MIT license for the icon artwork does not grant ownership of, or additional trademark rights in, those marks. References to Google Maps and Netlify likewise identify their respective external services.

## External services

- **Google Maps:** [contact.html](contact.html) uses a user-activated iframe created by [map.js](js/features/map.js). The map is requested only after the visitor selects “Wyświetl mapę”. Google supplies the map content externally; its implementation and map data are not bundled with Aurora. Use remains subject to Google's terms and [map attribution guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/).
- **Netlify Forms:** The contact form in [contact.html](contact.html) uses Netlify's hosting-side submission handling. This is an external service, not a redistributed client library. See the [Netlify Forms documentation](https://docs.netlify.com/manage/forms/setup/).

## Development tooling

Build and test dependencies are declared in [package.json](package.json) and resolved in [package-lock.json](package-lock.json). They remain governed by their own licenses. The current build publishes static site assets and bundles the project's local JavaScript modules; it does not copy `node_modules/` into the production package. Using a development tool does not by itself mean that the tool or its dependency tree is redistributed to website visitors.
