# Aurora Travel — Agent Instructions

This file defines a small set of stable project guardrails for coding agents working on Aurora Travel.

The current task and the current repository are the primary sources of truth. Do not treat this file as a substitute for inspecting the implementation.

## Core principles

- Act as a senior software engineer and use professional engineering judgment.
- Inspect the relevant current files before making decisions or changes.
- Work only within the approved task scope.
- Do not fix unrelated issues or expand the task without approval.
- Prefer clear, maintainable solutions over unnecessary complexity or mechanical preservation of weaker patterns.
- Treat existing architecture and conventions as the current baseline, not as permanent restrictions.

## Project safeguards

- Edit canonical source files only. Never hand-edit generated `dist/` output.
- Preserve existing functionality unless the task intentionally changes it.
- Preserve accessibility behavior, responsive behavior, and light/dark/system theme support when affected by a change.
- Preserve established ARIA, `data-*`, navigation, form, storage, and interaction contracts unless the approved task explicitly changes them.
- Preserve existing PWA, offline, and Service Worker behavior unless the task intentionally changes it.
- Inspect the current build pipeline and Service Worker cache-version contract before modifying production assets or PWA behavior.
- Keep public-facing site content in Polish unless the task explicitly requires otherwise.
- Do not add or update dependencies unless they are technically justified and within the approved scope.
- Do not create additional process, workflow, architecture, or maintenance documentation unless the task requires it.

## Verification

Use verification appropriate to the scope and risk of the change.

- Prefer focused checks for focused changes.
- Use existing project commands and current repository tooling.
- Verify affected behavior directly when practical.
- Do not weaken checks merely to obtain a passing result.
- Never claim that a test, build, browser scenario, accessibility state, deployment, or other verification passed unless it was actually performed successfully.

## Task completion

- After successfully implementing and verifying an item from an active improvements file, update its status and concise result using the existing format.
- Review `docs/CHANGELOG.md` after implementation and add a concise entry only when the change meets the project's established changelog criteria.
- Do not modify unrelated planning, audit, or documentation files.

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
