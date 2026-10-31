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

When an approved improvement is implemented and verified, replace its detailed proposal with a concise completion record.

Use this format in `IMPROVEMENTS-*.md`:

```markdown
### IMP-CATEGORY-XX — Original improvement title

- **Status:** COMPLETED — implemented and verified.
- **Result:** Concise description of the actual implementation and preserved contracts.
- **Verification:** Checks performed, actual results, and relevant limitations.
- **Impact:** Original impact rating.
- **Effort:** Original effort rating.
```

Keep completion records short, professional, and factual. Limit **Result** and **Verification** to 1–3 concise sentences each, covering only essential changes, actual checks, and relevant limitations. Avoid lengthy implementation narratives, repetition, and unnecessary technical details.

Preserve the original identifier, title, impact, and effort. Remove obsolete proposal details, evidence, implementation plans, and acceptance criteria only after verified completion.

Keep open or incomplete proposals unchanged. Never claim completion or verification without evidence. Update improvement records only within the approved task scope.

## Audit and review lifecycle

The initial structure of `AUDIT.md`, `daily-AUDIT.md`, and `REVIEW.md` is defined by their respective audit and review prompts.

Preserve these original formats. The following rules apply only during approved remediation, closure, and archival.

Write completion records in concise, professional, technical English, preserving original terminology and document structure.

### Finding completion

- Preserve every original finding, including `P0-*`, `P1-*`, `P2-*`, and optional `O-*` items.
- Retain original identifiers, titles, severity or category, and order.
- Keep unresolved, blocked, or unverified findings open.
- After implementation and verification, replace detailed proposals with concise completion records.

Use this format:

```markdown
- **Status:** COMPLETED — verified.
- **Resolution:** Brief description of the implemented result and preserved contracts.
- **Verification:** Actual checks, results, and relevant limitations.
```

Keep Resolution and Verification to 1–2 concise, factual sentences each. Avoid repetitive implementation narratives, unnecessary technical details, and duplicated test logs.

### Report closure

- Preserve the original scope, findings, and significant verification evidence.
- Remove obsolete implementation instructions and redundant descriptions after verified completion.
- Distinguish historical verification from checks performed during closure.
- Retain unresolved limitations without presenting them as completed work.
- Do not treat review recommendations as implemented changes without verification.
- Do not repeat completed verification solely for editorial closure.
- Closing a review does not imply that every recommendation was implemented; unresolved actions must retain their status and remain traceable.

For final audits, retain a concise scope and assessment, completed findings, final verification, limitations, and final assessment.

For daily audits and reviews, preserve their original prompt-defined structure while applying the same completion-record standard.

### Archival

- Archive reports only after their closure criteria are satisfied.
- Preserve all original findings and their final status.
- Use dated filenames and the project's established archive structure.
- Keep historical findings in archived reports; new reports assess the current repository state independently.
- Update affected documentation references within the approved task scope.

Never delete findings solely because they were resolved. Never claim completion or verification without supporting evidence.

Apply these rules only within the explicitly approved documentation scope.

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
