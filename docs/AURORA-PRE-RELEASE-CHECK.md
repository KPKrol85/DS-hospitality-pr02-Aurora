# Aurora Travel — PRE-RELEASE CHECK

**Project:** DS-hospitality-pr02-Aurora
**Brand:** Aurora Travel
**Project type:** DEMONSTRATION
**Author / owner:** Kamil Król — KP_Code Digital Studio
**Start date:** 2026-11-06
**Status:** IN PROGRESS
**Objective:** Final project verification before release and creation of a Git tag.

> **Rule:** All checkboxes start unchecked (`[ ]`). Confirm each item's applicability to this project. If a feature does not exist (for example PWA, a form, or FAQ), record `N/A` with a reason in the audit results; do not mark it as tested. Adapt page counts, tool names, and commands to the actual project.

---

## 1. GitHub Actions — CI

- [x] GitHub correctly detects the CI workflow.
- [x] The workflow runs automatically after a `push` to the primary branch.
- [x] Dependency installation succeeds in CI.
- [x] Quality and integrity checks pass (linting: N/A — no lint script configured).
- [x] All configured automated tests pass.
- [x] Source reference checks pass, if available.
- [x] The production build completes successfully.
- [x] Production reference checks pass, if available.
- [x] The entire workflow reports **SUCCESS**.

## 2. PWA — Manifest

- [ ] The manifest is valid, if the project provides a PWA.
- [ ] `name` and `short_name` are correct.
- [ ] `start_url` points to the intended page.
- [ ] `scope` matches the application's structure.
- [ ] `display` is configured appropriately.
- [ ] `theme_color` and `background_color` are appropriate.
- [ ] All icons exist and render correctly.
- [ ] PWA installation works on a mobile device.
- [ ] The installed application launches correctly.

## 3. PWA — Shortcuts

- [ ] All existing manifest shortcuts have been reviewed.
- [ ] Shortcut names are clear and current.
- [ ] Every shortcut opens the intended destination.
- [ ] No outdated addresses or links remain.
- [ ] Shortcut icons exist and have the correct parameters.
- [ ] Shortcuts work when launched from the installed PWA.

## 4. PWA — Screenshots

- [ ] The manifest contains the appropriate `screenshots` section.
- [ ] All existing screenshots have been reviewed.
- [ ] Screenshots show the project's current appearance.
- [ ] Image aspect ratios, resolutions, and formats have been verified.
- [ ] Image paths are correct.
- [ ] New mobile screenshots have been prepared where necessary.
- [ ] New desktop screenshots have been prepared where necessary.
- [ ] The manifest has been reverified after any screenshot replacement.
- [ ] Separate portfolio screenshots have been checked for currency, if present.

## 5. PWA — Service Worker and Offline

- [ ] The Service Worker registers successfully.
- [ ] Production assets are cached correctly.
- [ ] The site works offline within its intended scope.
- [ ] The offline fallback page or view works correctly, if present.
- [ ] Application updates do not leave outdated assets in use.
- [ ] Application behavior after reconnecting to the internet has been verified.
- [ ] The Service Worker reports no console errors.

## 6. KP_Code Digital Studio Standard

- [ ] The demonstration brand is clearly identified as fictional, if applicable.
- [ ] KP_Code Digital Studio authorship is correctly attributed, if applicable.
- [ ] Demonstration notices appear in the appropriate locations on all required pages.
- [ ] Footers are visually and textually consistent.
- [ ] Contact details are assigned to the correct recipient.
- [ ] Published phone, email, and address information is current, if present.
- [ ] `tel:` and `mailto:` links work, if present.
- [ ] Appropriate subpages contain discreet demonstration notices, where required.
- [ ] No statements contradict the project's actual business or demonstration status.
- [ ] No unnecessary banners, modals, or repeated demonstration messages remain.

## 7. Contact Form

- [ ] The form displays correctly on desktop.
- [ ] The form displays correctly on mobile.
- [ ] The submit button is correctly positioned and readable.
- [ ] All fields have appropriate labels.
- [ ] Required-field validation works.
- [ ] The inquiry-type selector works, if present.
- [ ] Privacy-policy consent works, if required.
- [ ] The anti-spam mechanism works, if used.
- [ ] reCAPTCHA or another bot-protection mechanism works in production, if used.
- [ ] The form-handling service receives an actual test submission.
- [ ] The form delivers messages to the intended recipient.
- [ ] The success page or confirmation message works correctly.
- [ ] The form produces no browser console errors.

## 8. FAQ and CTA

- [ ] All FAQ questions are current, if the section exists.
- [ ] Answers match the project's nature and applicable standards.
- [ ] The FAQ is keyboard operable.
- [ ] The FAQ matches its JSON-LD structured data, if implemented.
- [ ] All CTA buttons open the intended destinations.
- [ ] CTAs do not imply nonexistent services or features.
- [ ] Final CTAs are correctly aligned on all relevant subpages.
- [ ] Buttons wrap correctly on mobile devices.
- [ ] No broken links remain.

## 9. Responsiveness and Visual Appearance

Check key views at approximately 375 px, 768 px, and 1280 px, plus 320 px for narrow screens; adapt the scope to the project.

- [ ] The home page looks correct.
- [ ] All relevant subpages look correct.
- [ ] The contact form looks correct, if present.
- [ ] The FAQ looks correct, if present.
- [ ] The gallery works correctly, if present.
- [ ] Mobile navigation works correctly.
- [ ] Footers are responsive.
- [ ] The light theme works correctly, if present.
- [ ] The dark theme works correctly, if present.
- [ ] The system theme works correctly, if present.
- [ ] No unintended horizontal scrolling occurs.
- [ ] Images preserve their intended proportions.
- [ ] No visual regressions are present.

## 10. SEO and Metadata

- [ ] Every page has an appropriate `title`.
- [ ] `meta description` values are current.
- [ ] Canonical URLs are correct.
- [ ] Open Graph metadata matches the project's nature.
- [ ] Twitter/X metadata is current, if present.
- [ ] JSON-LD structured data is valid, if present.
- [ ] Fictional businesses are not presented as real operating companies, if applicable.
- [ ] `sitemap.xml` contains the correct URLs, if used.
- [ ] `robots.txt` is correct, if used.
- [ ] No outdated URLs remain.

## 11. Accessibility

- [ ] Keyboard navigation works.
- [ ] Interactive elements have visible focus states.
- [ ] Text contrast is appropriate.
- [ ] Forms have correct labels and feedback, if present.
- [ ] Images have appropriate alternative text.
- [ ] The heading hierarchy is logical.
- [ ] Interactive elements have appropriate accessible names.
- [ ] Available automated checks have been run.
- [ ] Key interactions have been verified manually.

## 12. Production Build and QA

- [ ] Project linting — PASS.
- [ ] Project automated tests — PASS.
- [ ] Source reference checks — PASS, if available.
- [ ] Production build — PASS.
- [ ] Production reference checks — PASS, if available.
- [ ] The build output directory contains all required files.
- [ ] Generated asset paths have been verified.
- [ ] The browser console has been checked for errors.
- [ ] A final Lighthouse audit has been performed, if planned.
- [ ] Basic performance metrics have been checked.
- [ ] No critical regressions have been found.

## 13. Legal Documents and Supporting Pages

- [ ] Terms reflect the project's actual nature, if present.
- [ ] The privacy policy accurately describes data processing.
- [ ] The cookies policy is current, if present.
- [ ] Informational pages contain correct details, if present.
- [ ] Career or recruitment content is not misleading, if present.
- [ ] The `404` page or error-handling behavior works correctly.
- [ ] The offline page or fallback behavior works correctly, if present.
- [ ] The README reflects the current project.
- [ ] The CHANGELOG contains required entries, if maintained.
- [ ] Documentation contains no outdated instructions.

---

## 14. Audit Report

**Phase one: analysis without modifying project files.**

- [ ] All in-scope areas have been audited.
- [ ] A PASS results list has been prepared.
- [ ] A FIX issues list has been prepared.
- [ ] Items requiring owner decisions have been identified as REVIEW.
- [ ] Every issue includes a file, location, or reproduction steps.
- [ ] Proposed fixes have been checked against the approved task scope.
- [ ] The project owner has approved the proposed fixes.

### Audit Results

**PASS:**
To be completed.

**FIX:**
To be completed.

**REVIEW:**
To be completed.

**N/A (not applicable):**
To be completed with explanations.

---

## 15. Post-Audit Fixes

**Perform this phase only if the audit identifies genuine issues.**

- [ ] A minimal change plan has been prepared.
- [ ] The owner has approved the plan.
- [ ] Only approved changes have been implemented.
- [ ] Unrelated components have not been modified.
- [ ] Applicable project standards have been preserved.
- [ ] Required tests have been rerun.
- [ ] Corrected elements have been verified in a browser, if applicable.
- [ ] Changes have been reviewed and accepted.

---

## 16. Final Release Gate

**Requirements before creating a Git tag.**

- [ ] All critical issues have been resolved.
- [ ] No unapproved release-blocking issues remain.
- [ ] The final production build passes.
- [ ] GitHub Actions reports SUCCESS for the final commit, if CI is used.
- [ ] The deployed production version has been verified.
- [ ] The production form has been tested, if present.
- [ ] The PWA works correctly, if present.
- [ ] PWA shortcuts and screenshots are current, if present.
- [ ] Applicable project standards have been preserved.
- [ ] Documentation is current.
- [ ] All approved changes have been committed.
- [ ] The Git working tree is clean.
- [ ] The project owner has approved the release.

### Git Tag

- [ ] The release version has been selected.
- [ ] A Git tag has been created.
- [ ] The tag has been pushed to GitHub.
- [ ] The repository tag has been verified.

---

## Final Status

**Audit:** PENDING
**Critical Issues:** UNKNOWN
**GitHub Actions:** PENDING FINAL VERIFICATION
**Production Verification:** PENDING
**Release Approval:** PENDING
**Git Tag:** NOT CREATED

**Project:** [PROJECT_IDENTIFIER]
**Owner:** [AUTHOR_OR_OWNER]

---

*KP_Code — verify before changing, keep fixes minimal, and obtain owner approval before release.*
