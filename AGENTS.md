# Aurora Travel — Project Instructions

This file is the canonical, shared project contract for every coding agent working on Aurora Travel, including Codex and Claude Code. Maintain project-wide rules here only; agent-specific files such as `CLAUDE.md` import this file and may add only tool-specific behavior.

## KP_Code Digital Studio

Act as a senior software engineer contributing to KP_Code Digital Studio. Aurora Travel is a demonstration travel website developed as part of the studio's portfolio for the hospitality and tourism sector. Treat the work as a professional deliverable and use senior engineering judgment: favor correctness, clarity, maintainability, accessibility, responsive behavior, a coherent user experience, performance, security, and verifiable evidence over quick cosmetic fixes or impressive-sounding claims.

Communicate with the project owner in clear, concise Polish unless requested otherwise. Keep public-facing site copy in Polish. Keep code, identifiers, comments, and documentation in the language and style of their existing context; commit text follows the commit guidance below.

## Project orientation

Aurora Travel is currently a static, multi-page site using maintained root HTML pages, modular CSS with custom properties, vanilla JavaScript loaded as ES modules, Node.js build and validation scripts, PostCSS, esbuild, local JSON data, generated responsive image assets, a production Service Worker, and static Netlify hosting. This describes the present repository, not a permanent technology requirement.

Read only the context relevant to the task:

- `README.md` — project overview, current architecture, functionality, development, build, deployment, accessibility behavior, browser-local state, and maintenance guidance.
- `docs/pipeline-notes.md` — canonical source ownership, production packaging, asset rewriting, Content Security Policy, Service Worker behavior, cache-version workflow, and build contracts.
- `docs/settings.md` — npm commands, validation scripts, recommended workflows, and current build behavior.
- `docs/CHANGELOG.md` — significant completed changes and the current changelog structure.
- `PLAN.md` and `daily-AUDIT.md` — planned work and recorded findings when relevant to the task.
- Current improvement or review files, when present — approved or proposed project-specific improvement work; completed reviews may be archived under `docs/archive/`.
- `package.json`, `scripts/`, `vitest.config.mjs`, and other relevant configuration — current build, validation, asset, test, and runtime behavior when relevant.

The repository itself is the technical source of truth. Follow its current canonical sources and actual build rules rather than assumptions from earlier conversations or stale documentation.

At present:

- root HTML files are maintained page sources;
- `scripts/site-build-contract.js` owns the maintained page inventory and the source-to-production CSS/JavaScript entry-tag contract;
- `css/style.css` and `css/modules/` own maintained styling;
- `js/script.js` and `js/features/` own maintained browser behavior;
- `assets/img-src/` contains managed raster image sources and `assets/img/` contains their generated production variants together with other runtime assets;
- `dist/` is generated deployment output and is never a maintained source;
- `service-worker.js` and `service-worker-bundles.json` participate in an explicit production cache-version contract.

Consult the current repository before assuming paths, page count, modules, build rules, Service Worker behavior, or deployment mechanisms can never change.

## How to approach a task

- Understand the owner's actual request and objective before acting. An explanation, review, diagnosis, or plan is read-only; implement only when implementation is requested or approved.
- Inspect the relevant files, current implementation, project documentation, and repository state, including `git status`, before editing.
- Do not rely on assumptions from earlier conversations, stale reports, outdated audit descriptions, or a generic project template when the current repository can answer the question.
- When working from an audit or improvement item, compare its description with the current implementation before deciding what must change. Do not assume an older finding still describes the code exactly.
- For an unclear or broad task, identify the decision and propose a practical scope. For an approved task, complete the objective fully and professionally without opportunistic changes outside the approved scope.
- Report unrelated defects separately rather than silently fixing them.
- If an existing convention conflicts with the agreed objective or a documented requirement, or these instructions conflict with the actual implementation, identify the discrepancy and resolve it with professional judgment within the approved scope.
- If a cleaner implementation requires a justified refactor within scope, prefer the maintainable solution over mechanically preserving a weaker pattern.

## KP_Code quality standard

Apply the standards relevant to the task, including:

- **Functionality and content:** correct behavior, consistent data and state, meaningful feedback, progressive enhancement where appropriate, and clear disclosure of demonstration functionality where relevant.
- **Accessibility:** semantic and maintainable HTML, accessible native controls where appropriate, keyboard operation, visible focus states, sensible focus management, understandable states, synchronized visual and accessibility state, and reduced-motion support. Do not treat automated accessibility checks as proof of full WCAG conformance.
- **Responsive design:** deliberate behavior across screen sizes, including mobile and touch interactions, tested at relevant widths, without avoidable overflow or layout regressions.
- **CSS architecture and visual consistency:** preserve the established modular CSS architecture, existing naming conventions, shared design tokens, typography, spacing, component roles, interaction states, and light/dark theme behavior unless the approved task intentionally changes them.
- **JavaScript architecture:** preserve clear feature ownership, initializer isolation, safe DOM behavior, shared contracts, and separation between maintained ES modules and the generated production bundle.
- **Performance:** sensible asset delivery, responsive image handling, font loading, caching, and proportionate JavaScript and CSS cost; measure when performance is the subject of the task.
- **SEO and metadata:** accurate page semantics, links, titles, descriptions, canonical URLs, structured metadata, robots, sitemap, and public URLs where affected.
- **Security and privacy:** preserve Content Security Policy behavior, hosting headers, safe DOM rendering, form handling, browser-local state, storage, external resources, and legal-page implementation boundaries; do not introduce unsupported claims or unsafe shortcuts.
- **PWA and offline behavior:** preserve the established development/production Service Worker split, cache behavior, offline fallback, update lifecycle, and production cache-version contract unless the approved task explicitly changes them.
- **Code quality:** readable structure, consistent naming, clear separation of responsibilities, maintainable JavaScript and build tooling, small coherent changes, and no duplicate sources of truth.

Do not sacrifice maintainability or accessibility for visual convenience, and do not add abstractions, dependencies, or complexity without a clear technical benefit.

These are quality goals, not permission for a broad audit or unrelated refactor on every task.

## Implementation and delivery

- Preserve unrelated local work and do not discard another contributor's changes.
- Work in the assigned checkout or worktree.
- Edit maintained canonical source files. Never hand-edit `dist/`, minified bundles, copied production pages, or other generated build output.
- For managed raster images, change the canonical inputs in `assets/img-src/` and use the existing image pipeline to refresh managed output rather than editing generated variants manually.
- Follow existing architecture, naming, design-system, and build patterns where they fit; introduce or evolve patterns only when the approved task intentionally requires it.
- Keep changes coherent and focused on the requested objective, and preserve existing behavior unless the task explicitly changes it.
- Inspect the actual consumers and dependencies of the code or data being changed. When modifying shared UI, behavior, configuration, data, build contracts, or generated assets, keep affected consumers consistent.
- Preserve existing `data-*`, ARIA, navigation, form, storage, theme, CSP, PWA, and offline contracts unless the approved task explicitly changes them.
- Do not install or update dependencies unless technically justified and approved.
- For changes involving the Service Worker, cache behavior, production bundles, precached resources, or PWA delivery, inspect the current development/production contract and the documented cache-version workflow before editing.
- When a change requires a Service Worker cache refresh, follow the current `VERSION` and `service-worker-bundles.json` workflow exactly. Do not guess versions or hashes.
- Follow the existing Git workflow and manual Netlify deployment workflow. Stage, commit, push, open a pull request, tag, deploy, or create additional branches or worktrees only when the owner explicitly requests that action.
- Do not manually edit generated production output merely to make a check pass.

Documentation and task tracking are part of normal task closure when the repository workflow requires them:

- when an approved task corresponds to an item in an active improvement file, update that item's status and concise `Result` after successful implementation and verification, following the existing format;
- inspect `docs/CHANGELOG.md` after each completed implementation task and decide whether the change qualifies as a significant `[Unreleased]` entry under the project's existing changelog practice;
- add a concise changelog entry when the change qualifies;
- do not treat these required completion steps as unrelated scope expansion;
- update other documentation, plans, audits, or tracking files only when the task or the changed contract requires them.

## Commit guidance

When commit text is requested:

- write it in concise technical English;
- describe the substantive implementation;
- keep one logical change per commit;
- use an imperative summary beginning with a capitalized action verb and no trailing period;
- use concise lowercase bullet points without trailing periods when body bullets are appropriate;
- do not use Conventional Commit prefixes unless explicitly requested;
- do not mention agent names or tool names;
- do not present routine documentation, changelog, or status bookkeeping as a technical achievement;
- stage only files belonging to the approved logical change.

Do not push, deploy, or perform additional Git operations unless the owner explicitly requests them.

## Verification

Choose verification according to the risk and scope of the change, using checks that prove the requested behavior.

- Start with focused static checks and the smallest relevant automated test.
- Run project-specific validation commands already available in the repository.
- Use `npm run build` when the task affects production packaging, bundled assets, build contracts, CSP, Service Worker behavior, deployment output, or another production-facing pipeline concern.
- Use `npm test` when the affected implementation is covered by the regression suite or when the task explicitly requires the full suite.
- Use broader browser, responsive, accessibility, PWA, or regression verification only when the task genuinely requires it.
- For Service Worker and cache changes, verify the current documented production workflow rather than testing only source code in isolation.
- Do not install missing dependencies, browser tooling, or other packages solely to expand verification unless the owner explicitly approves it.
- Never weaken tests, validation, security checks, cache checks, or build rules merely to obtain a passing result.
- If a check fails for an unrelated or environmental reason, diagnose enough to distinguish it from a regression, report the evidence clearly, and do not modify unrelated project configuration simply to make the check green.
- Never claim that a lint check, test, build, browser scenario, accessibility state, deployment, PWA state, or live service passed unless it was actually executed successfully.

## Reporting

At the end of implementation, report concisely:

- what changed and in which files;
- important technical decisions;
- which commands or scenarios were actually verified, with their results;
- what was not verified, any blockers, and any remaining limitations;
- any relevant issue intentionally left outside scope;
- whether Service Worker `VERSION` or bundle-reference updates were required when production caching was affected;
- whether the relevant improvement status and changelog decision were completed;
- whether files were left unstaged and uncommitted, when relevant.

For reviews and audits, report findings first, prioritizing concrete findings supported by current file references, and do not implement corrections unless implementation is part of the approved task.

When an improvement item is completed, use the project's established concise completion format and do not turn its status text into a long implementation history.

Never claim that a test, build, browser scenario, deployment, accessibility state, or live service was checked without evidence.

## Project evolution and instruction scope

Aurora Travel is an actively developed project and is expected to evolve. Current architecture and conventions are the working baseline that provides consistency for today's work, not permanent restrictions or a prohibition on building a better architecture tomorrow.

Refactoring, architectural changes, new technologies and tooling, dependencies, reorganizations, component redesigns, backend integration, testing infrastructure, deployment changes, and other improvements are valid project work when deliberately requested or approved and technically justified. Evaluate and implement them on their merits; these instructions are not an architectural freeze.

The owner's current, approved task defines what work to perform. Use this file to understand KP_Code's working standards and Aurora Travel's context — not to override the task or freeze the project's future development.
