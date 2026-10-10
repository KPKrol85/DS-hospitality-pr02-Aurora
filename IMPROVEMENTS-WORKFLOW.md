# Aurora — Workflow Improvements

**Analysis date:** 2026-10-09
**Project type:** Multi-page static website — 12 maintained root HTML pages, modular CSS built with PostCSS, vanilla ES modules bundled with esbuild, production Service Worker, custom Node.js build and check scripts, Vitest/jsdom regression suite, Netlify static hosting with manual deployment of `dist/`
**Analysis mode:** Evidence-based workflow improvement review
**Focus:** Project-wide workflow

## Improvement overview

Aurora's build workflow is explicit and largely self-enforcing. `npm run build` (`package.json:33`) is the single packaging command: it rebuilds `dist/` from an empty directory and ends with fail-fast checks of the sources and the package, including the CSP hash approval (`check:csp`, `check:csp:dist`) and the Service Worker bundle approval record (`check:sw-bundles`). The page inventory and entry tags are declared once in `scripts/site-build-contract.js`, and the approval records `_headers` and `service-worker-bundles.json` are read but never written by the build. Deployment is intentionally manual (`docs/pipeline-notes.md:185-188`), the repository has no CI configuration, and none is proposed. The cache-version workflow needs no change: since the bundle record was introduced (`36ec378`), every commit that changed a precached page also raised `VERSION`.

The remaining opportunities lie around the build rather than inside it:

- the same workflow facts are restated in up to four documents, and the README copies have already drifted from the technical notes;
- the documented rule for when to run `npm test` describes a much smaller suite than the 20 test files in `tests/`;
- the deployed contract (`_headers`, 404 routing) cannot be observed locally, so it has been checked either with an ad hoc server or not at all;
- two conventions that `AGENTS.md` and the KP_Code standards rely on, the archive policy for completed reports and the changelog criteria, exist only as practice.

Confirmed defects observed during the analysis are not presented as improvements. The stale README statements cited in IMP-WORKFLOW-02 are documentation defects in their own right. Three further defects fall outside every proposal and should be routed to a fix or an audit:

- `package.json:12` declares `homepage` as `https://ds-hospitality-pr02-aurora.netlify.app/`, while the canonical tags, `sitemap.xml`, `robots.txt:4` and `README.md:15` use `https://hospitality-pr02-aurora.netlify.app/`;
- the "intentionally tracked" comment in `.gitignore:118` and `.gitignore:123` still lists `LICENSE` and `_redirects`, which were renamed and removed;
- `docs/settings.md:35` tells a new checkout to run `npm run images:bootstrap` to populate `assets/img-src/`, although that directory is tracked with all 184 raster sources, so the command copies nothing.

## Proposed improvements

### IMP-WORKFLOW-01 — Make the regression suite an unconditional part of the pre-deployment check

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `npm run predeploy:check` (`npm test && npm run build`) to enforce regression tests before production builds. Updated `docs/settings.md` and bilingual README. Existing `build`, `dist`, and deployment workflows remain unchanged.
- **Verification:** 296/296 tests and production build passed. Failure handling verified. Two runs encountered CPU-related test timeouts; all tests passed with an extended CLI timeout.
- **Impact:** High
- **Effort:** Small

### IMP-WORKFLOW-02 — Give each workflow fact one owning document and let the README summarize and link

- **Status:** COMPLETED — implemented and verified.
- **Result:** Consolidated command documentation in `docs/settings.md` and build, CSP, and Service Worker contracts in `docs/pipeline-notes.md`. Simplified bilingual README, corrected outdated information, and aligned project trees and license references.
- **Verification:** All 55 relative links and anchors validated; project trees and PL/EN consistency checked. Tests and build not run (documentation-only changes).
- **Impact:** High
- **Effort:** Medium

### IMP-WORKFLOW-03 — Add a dependency-free local preview that serves `dist/` with its `_headers` and 404 page

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added dependency-free `scripts/preview-server.js` with `npm run preview:source` (project sources at `127.0.0.1:8181`) and `npm run preview:dist` (`dist/` at the origin root on `127.0.0.1:8182`, with the `/*` headers of `dist/_headers` and `dist/404.html` for unmatched paths). Updated `docs/settings.md` and bilingual README. Build, `dist/` contents, CSP and Service Worker remain unchanged.
- **Verification:** HTTP checks of both modes (251), startup and failure checks (35) and headless Chrome checks (23: no CSP violations, bundles loaded, Service Worker registered, source preview uncontrolled, 404 page) passed. 296/296 tests passed with a longer CLI-only timeout and `npm run build` passed; the standard `predeploy:check` failed on CPU-related 5 s test timeouts.
- **Impact:** Medium
- **Effort:** Medium

### IMP-WORKFLOW-04 — Standardize concise completed improvement records

- **Status:** COMPLETED — implemented and verified.
- **Result:** Scope revised by the project owner from documenting the archive convention to a completion-record standard. Added a `Completed improvement records` section to `AGENTS.md` that defines the Status, Result, Verification, Impact and Effort format, preserves the original identifier, title and ratings, and leaves open proposals unchanged; removed the redundant status-update rule from `Task completion`. The archive workflow and archived files remain unchanged.
- **Verification:** Documentation review of the section against the approved wording, of `AGENTS.md` for conflicting completion rules and intact safeguards, and of this report for unchanged IMP-WORKFLOW-01, 02, 03 and 05; `git diff --check` and full diff review passed. Tests and build not run (documentation-only change).
- **Impact:** Medium
- **Effort:** Small

### IMP-WORKFLOW-05 — State the changelog's inclusion, ordering and release rules in the changelog itself

- **Affected workflow:** Changelog maintenance after implementation and at manual deployment.
- **Evidence:**
  - `AGENTS.md:41` admits entries "only when the change meets the project's established changelog criteria", but the only criterion in the repository is `docs/CHANGELOG.md:3` ("All significant changes ...").
  - `docs/CHANGELOG.md:86-92` (`Testing`) lists the newest entry first, with IMP-QUALITY-04 at `:86` above the original entries at `:90-92`. `Added` (`:9-26`), `Changed` (`:30-49`), `Fixed` (`:53-60`) and `Build and Tooling` (`:75-82`) append the newest entry last.
  - Every entry since the first commit sits under `[Unreleased]` (`docs/CHANGELOG.md:5`). The repository has no tags, and `package.json:3` has stayed at `1.0.0` while the Service Worker cache reached `aurora-1.28`.
  - `README.md:17` and `:324` state that the repository contains no information identifying which revision the live site was published from. Deployment is manual (`docs/pipeline-notes.md:187`).
- **Current workflow:** Whether a change gets an entry, and where in its section, is decided per task from the existing entries. Manual deployments leave no trace in the repository, so the changelog cannot tell which entries are live, even though every shipped bundle change already carries its own Service Worker `VERSION`.
- **Proposed improvement:** Add a short rules block under the title of `docs/CHANGELOG.md` that covers three points: what qualifies for an entry, the order of entries within a section, and how `[Unreleased]` is closed when the owner publishes `dist/`. On deployment, the entries move into a dated section identified by the deployed Service Worker `VERSION`.
- **Expected practical value:** The criteria that `AGENTS.md` refers to can be checked within the repository. Entry order no longer depends on which section an author imitates. The changelog records which changes are live, closing the gap the README itself describes.
- **Implementation scope:** `docs/CHANGELOG.md` only: the rules block, plus one reordering of the `Testing` section if it does not match the stated order. Existing entries are otherwise unchanged, and no release section is created until the owner's next deployment. Deployment stays manual; no tags or release automation are introduced. If the global KP_Code CHANGELOG standard already defines these criteria, the block references that standard instead of restating it; any refinement of the global standard itself is a separate change outside this repository.
- **Acceptance criteria:** `docs/CHANGELOG.md` states the inclusion criteria, the in-section order and the release-closing rule, so that `AGENTS.md:41` can be followed without information from outside the repository. Every section follows the stated order. After the next manual deployment, the entries it shipped sit under a dated section that names the deployed `VERSION`, and `[Unreleased]` holds only changes that are not yet deployed.
- **Impact:** Medium
- **Effort:** Small

## Selection summary

- **Selection basis:** Each proposal targets a step that the repository history shows being repeated or reconstructed by hand: deciding whether the tests apply, synchronizing up to four copies of the workflow documentation, setting up a preview server, choosing an archive shape, and choosing where a changelog entry goes.
- **Processes strengthened:** pre-deployment verification (01, 03), documentation maintenance (02, 05) and the report lifecycle (04).
- **Dependencies:** IMP-WORKFLOW-02 reduces the README edits that 01 and 03 require; implemented first, it leaves those two with documentation changes in `docs/settings.md` only. Otherwise all five can be implemented independently and in any order.
- **Scope:** Four Small or Medium documentation and configuration changes and one Medium dependency-free script. None of them changes `css/`, `js/`, the pages or the contents of `dist/`, so none requires a Service Worker `VERSION` update. Together they form a reasonable candidate backlog for a focused working day; completion time is not guaranteed.
- **Considered, not selected:**
  - CI or automated deployment: manual deployment is the documented model, and nothing shows a need for automation.
  - Lint or format tooling: there is no existing configuration and no recorded defect class that points to it.
  - Extending `check:sw-bundles` to the precached pages: this is a safeguard that belongs to the Quality category, and no bump has been missed since the record existed.
  - A Node.js version declaration: `README.md:129` already documents the requirement, so the value is low.

## Analysis limitations

- The analysis was static. No project command was run; `npm test` and `npm run build` were not executed, so their current pass state and the suite's run time, which is relevant to IMP-WORKFLOW-01, are unverified. The only commands run were read-only Git inspection and text searches.
- The global KP_Code README, CHANGELOG and archive standards are not in the repository. If they prescribe README script detail (IMP-WORKFLOW-02) or changelog rules (IMP-WORKFLOW-05), the project-local changes must be reconciled with them.
- The live site was not requested. The statement that the deployed revision cannot be identified comes from `README.md:17`.
- Commit counts and diff sizes describe the history up to `8dcb845`.
