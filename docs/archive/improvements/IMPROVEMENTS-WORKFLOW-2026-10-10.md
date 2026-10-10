# Aurora — Workflow Improvements

**Analysis date:** 2026-10-09
**Completed:** 2026-10-10
**Status:** COMPLETED — all five selected improvements implemented and verified.
**Scope:** Project-wide workflow.

## Overview

At the time of the analysis, the build was explicit and largely self-enforcing: `npm run build` rebuilt `dist/` from an empty directory with fail-fast source, package, CSP and Service Worker bundle checks, deployment was intentionally manual, and the cache-version workflow needed no change. The remaining gaps lay around the build: a conditional rule for running tests, workflow facts restated across several documents, no local view of the deployed `_headers` and 404 contract, and unwritten report and changelog conventions.

Five improvements were completed between 2026-10-09 and 2026-10-10 without CI, deployment automation, new dependencies or changes to the deployed site output, so no Service Worker cache-version update was required. IMP-WORKFLOW-04 and IMP-WORKFLOW-05 were completed under owner-approved revised scopes.

## Completed improvements

### IMP-WORKFLOW-01 — Make the regression suite an unconditional part of the pre-deployment check

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added `npm run predeploy:check` (`npm test && npm run build`) to the pre-deployment workflow: the full regression suite must pass before the production build starts, while `npm run build` itself still runs no tests. `docs/settings.md` and the bilingual README were updated; the existing `build`, `dist` and manual deployment workflow were unchanged.
- **Verification:** 296/296 tests and the production build passed, and failure handling was verified. Two runs hit CPU-related test timeouts; all tests passed with an extended CLI timeout.
- **Impact:** High
- **Effort:** Small

### IMP-WORKFLOW-02 — Give each workflow fact one owning document and let the README summarize and link

- **Status:** COMPLETED — implemented and verified.
- **Result:** `docs/settings.md` now owns command documentation and `docs/pipeline-notes.md` the build, CSP and Service Worker contracts, while the simplified bilingual README summarizes and links to them. Outdated README statements were corrected, and project trees and license references were aligned.
- **Verification:** All 55 relative links and anchors were validated, and the project trees and PL/EN consistency were checked. Tests and build were not run (documentation-only change).
- **Impact:** High
- **Effort:** Medium

### IMP-WORKFLOW-03 — Add a dependency-free local preview that serves `dist/` with its `_headers` and 404 page

- **Status:** COMPLETED — implemented and verified.
- **Result:** Added the dependency-free `scripts/preview-server.js` with `npm run preview:source` (sources at `127.0.0.1:8181`) and `npm run preview:dist` (`dist/` at the origin root on `127.0.0.1:8182`, with the `/*` headers of `dist/_headers` and `dist/404.html` for unmatched paths); `docs/settings.md` and the README were updated. Build, `dist/` contents, CSP and Service Worker were unchanged.
- **Verification:** HTTP checks of both modes (251), startup and failure checks (35) and headless Chrome checks (23: no CSP violations, bundles loaded, Service Worker registered, source preview uncontrolled, 404 page) passed. 296/296 tests passed with a longer CLI-only timeout and `npm run build` passed; the standard `predeploy:check` failed on CPU-related 5 s test timeouts.
- **Impact:** Medium
- **Effort:** Medium

### IMP-WORKFLOW-04 — Standardize concise completed improvement records

- **Status:** COMPLETED — implemented and verified.
- **Result:** The project owner revised the scope from documenting the archive convention to a completion-record standard. A `Completed improvement records` section in `AGENTS.md` defines the Status, Result, Verification, Impact and Effort format, preserves the original identifier, title and ratings, and leaves open proposals unchanged; the redundant status-update rule was removed from `Task completion`. The archive workflow and archived files were unchanged.
- **Verification:** Documentation review confirmed the approved wording, the absence of conflicting completion rules in `AGENTS.md`, intact safeguards and unchanged IMP-WORKFLOW-01, 02, 03 and 05 records; `git diff --check` and full diff review passed. Tests and build were not run (documentation-only change).
- **Impact:** Medium
- **Effort:** Small

### IMP-WORKFLOW-05 — Adopt the standard changelog entry policy

- **Status:** COMPLETED — implemented and verified.
- **Result:** The project owner revised the scope from changelog inclusion, ordering and release rules to adoption of the standard KP_Code entry policy. The Eternal Rest introduction and `Entry policy` section were added to `docs/CHANGELOG.md` directly before `[Unreleased]`, adapted only to the Aurora Travel name. Existing sections, categories and entries were unchanged; no ordering, release, deployment-recording or versioning rules were introduced, and `AGENTS.md` was unchanged.
- **Verification:** Documentation review confirmed the policy against the approved text and the Eternal Rest changelog, its position before `[Unreleased]`, and unchanged history, `AGENTS.md` and other improvement records; `git diff --check` and full diff review passed. Tests and build were not run (documentation-only change).
- **Impact:** Medium
- **Effort:** Small

## Excluded defects

The original analysis recorded three defects outside the five improvements:

- **Production domain:** `package.json` declared `homepage` as `https://ds-hospitality-pr02-aurora.netlify.app/`, while the canonical tags, `sitemap.xml`, `robots.txt` and `README.md` used `https://hospitality-pr02-aurora.netlify.app/`. A separate change after this cycle aligned all references on the `ds-hospitality-pr02-aurora` domain.
- **`.gitignore` comments:** The "intentionally tracked" comment listed `LICENSE` and `_redirects`, which had been renamed and removed. Not addressed in this cycle; still present on 2026-10-10.
- **Image bootstrap instruction:** `docs/settings.md` told a new checkout to run `npm run images:bootstrap` to populate `assets/img-src/`, although all 184 raster sources are tracked there, so the command copies nothing. Not addressed in this cycle; still present on 2026-10-10.

These are historical observations from the original analysis; their current status was checked statically only as stated.

## Verification limitations

The original analysis was static: no project command was run, so the pass state and run time of `npm test` and `npm run build` were unverified, and only read-only Git inspection and text searches were used. The global KP_Code README, changelog and archive standards were not part of the repository, and the live site was not checked.

Verification results under individual improvements reflect checks recorded at implementation time. Preparing this archive involved only editorial review and static repository inspection; no application tests, production builds or browser checks were run for it.
