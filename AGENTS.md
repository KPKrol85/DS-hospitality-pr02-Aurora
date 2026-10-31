# Aurora — Agent Instructions

This file defines a small set of stable project guardrails for coding agents working on Aurora.

The current task and the current repository are the primary sources of truth. Do not treat this file as a substitute for inspecting the implementation.

## Core principles

- Act as a senior software engineer and use professional engineering judgment.
- Inspect the relevant current files before making decisions or changes.
- Work only within the approved task scope.
- Do not fix unrelated issues or expand the task without approval.
- Prefer clear, maintainable solutions over unnecessary complexity or mechanical preservation of weaker patterns.
- Treat existing architecture and conventions as the current baseline, not as permanent restrictions.

## Project safeguards

- Edit canonical source files only. Never hand-edit generated `dist/` output or minified assets.
- Preserve existing functionality unless the task intentionally changes it.
- Preserve accessibility, responsive behavior, SEO, and light/dark/system theme support when affected by a change.
- Preserve established ARIA, `data-*`, navigation, form, storage, PWA, and interaction contracts unless the approved task explicitly changes them.
- Keep public-facing site content in Polish unless the task explicitly requires otherwise.
- Do not add or update dependencies unless technically justified and within the approved scope.
- Do not create additional process, workflow, architecture, or maintenance documentation unless the task requires it.

## Verification

Use verification appropriate to the scope and risk of the change.

- Prefer focused checks for focused changes.
- Use existing project commands and current repository tooling.
- Verify affected behavior directly when practical.
- Do not weaken checks merely to obtain a passing result.
- Never claim verification passed unless it was actually performed successfully.

## Changelog conventions

Treat `docs/CHANGELOG.md` as the source of truth for changelog structure, entry policy, and categorization.

- Write entries in concise, professional, technical English.
- Use one short, factual sentence per entry, beginning with a past-tense action verb.
- Describe meaningful changes and their impact, not implementation steps or individual file edits.
- Avoid verbose explanations, repetitive descriptions, and unnecessary technical details.
- Group entries under the appropriate existing headings.
- Exclude routine documentation updates, audit tracking, temporary checks, and insignificant cosmetic changes.
- Preserve significant project history when reorganizing existing entries.

For implementation tasks, apply the entry policy in `docs/CHANGELOG.md` and determine `Changelog: yes` or `Changelog: no`.

Edit the changelog only when explicitly authorized within the approved task scope.

## Development plan lifecycle

Treat the root `PLAN.md` as the current development plan and `docs/archive/plans/` as the historical plan archive.

- Keep active tasks detailed enough to define scope, dependencies, and completion criteria.
- At plan closure, reduce verified completed tasks to concise, single-line checklist entries.
- Preserve original task identifiers, titles, phase structure, and historical relationships.
- Do not mark incomplete or unverified tasks as completed.
- Explicitly carry unresolved work into a subsequent plan when closing the current planning cycle.
- Keep completed plans short, professional, technical, and factual.
- Remove implementation narratives, repeated verification logs, and obsolete task instructions from completed plans.
- Include a `Completion` section with the verified task count and links to relevant project documentation.

Archived plans should follow a consistent structure: project heading, period, completion status, brief scope summary, completed task checklist grouped by phase, and completion references.

Preserve historical records and archive completed plans under `docs/archive/plans/` using dated filenames.

Update, close, or archive plans only within the explicitly approved task scope.

## Completed improvement records

After an approved improvement is implemented and verified, replace its detailed proposal with a concise completion record.

Use this format in `IMPROVEMENTS-*.md`:

```markdown
### IMP-CATEGORY-XX — Original improvement title

- **Status:** COMPLETED — implemented and verified.
- **Result:** Brief description of the implemented result.
- **Verification:** Actual checks, results, and relevant limitations.
- **Impact:** Original impact rating.
- **Effort:** Original effort rating.
```

- Write in concise, professional, technical English, prioritizing clarity and factual accuracy.
- Limit **Result** and **Verification** to 1–3 short sentences each.
- Preserve original identifiers, titles, impact, effort, and significant verification evidence.
- Remove obsolete proposals, implementation plans, and acceptance criteria after verified completion.
- Avoid repetitive explanations, implementation narratives, and unnecessary technical details.
- Keep unresolved, blocked, or unverified improvements unchanged.
- Never claim completion or verification without supporting evidence.

Update and archive improvement records only within the explicitly approved task scope.

## Audit and review lifecycle

The initial formats of `AUDIT.md`, `daily-AUDIT.md`, and `REVIEW.md` are defined by their respective prompts. Preserve these formats while reports are active.

At approved closure, convert reports into concise, professional, technical English records that are factual and easy to read.

### Final audits — AUDIT.md

Use five sections:

1. Scope and assessment
2. Closed findings
3. Final verification
4. Limitations
5. Final assessment

For each completed finding, retain the original title and identifier with three short fields:

- **Status:** COMPLETED — verified.
- **Resolution:** Actual implemented result.
- **Verification:** Actual checks and results.

Limit Resolution and Verification to 1–2 concise sentences each.

### Daily audits — daily-AUDIT.md

Archive as an `Audit Completion Record` containing:

- Project, original audit date, completion date, status, and brief scope.
- Original findings grouped by P0, P1, P2, and optional categories.
- One concise `[x]` checklist entry per verified finding, describing its resolution and essential verification.
- A `Completion` section summarizing results, limitations, and the original rating when applicable.
- A `References` section linking relevant project documentation.

Preserve unresolved findings with their actual status.

### Technical reviews — REVIEW.md

Archive completed reviews as concise records containing:

- Project, review dates, status, and original scope.
- Original findings and recommendations with their final statuses.
- Brief resolutions and significant verification evidence.
- Unresolved recommendations and relevant limitations.
- References to related project documentation.

Review closure does not imply that every recommendation was implemented.

### Archival safeguards

- Archive reports only after their closure criteria are satisfied.
- Preserve all original findings, identifiers, titles, classifications, severity, and order.
- Preserve significant historical evidence, conclusions, and original ratings.
- Distinguish historical verification from checks performed during closure.
- Remove obsolete proposals, repeated explanations, and redundant test logs.
- Never mark unverified findings as completed.
- Do not repeat technical verification solely for editorial closure.
- Archive using dated filenames and the project's established directories.
- Keep historical findings in archived reports; new audits assess the current repository independently.
- Update documentation references only within the approved scope.

Close, edit, or archive reports only within the explicitly approved task scope.

## Documentation standards

All project documentation, including archived records, must be concise, professional, technical, factual, and easy to read.

- Keep content proportional to its purpose and required structure.
- Preserve essential findings, decisions, verification evidence, limitations, and historical accuracy.
- Remove redundant explanations, repetitive test logs, obsolete instructions, and unnecessary implementation narratives.
- Summarize completed work by its verified results, not by the chronological history of implementation.
- Prefer short, clear sentences and compact sections without sacrificing technical accuracy.

## Delivery safety

Do not stage, commit, push, tag, deploy, create or modify branches or worktrees, or perform other repository-delivery actions unless the project owner explicitly requests them.

## Reporting

After implementation, report concisely:

- what changed;
- which files were changed;
- what was actually verified;
- what was not verified;
- any relevant limitation or issue intentionally left outside scope.

Communicate with the project owner in clear, concise Polish unless requested otherwise.
