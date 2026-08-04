# OKLCH table test coverage

This matrix records the currently executable coverage for TC-01 through TC-25
from the implementation plan. A row is marked `missing` when the repository
does not yet contain a test with assertions for that exact behaviour; it is not
represented as covered merely because a related UI is present.

| Layer | Responsibility |
| --- | --- |
| Domain | Color parsing, analysis and semantic projection/diff |
| Core | Drafts, accepted revisions and workspace transactions |
| Browser | Keyboard, focus, popovers, live regions and clipboard |
| Screen reader | Optional Guidepup acceptance flows |

| TC | Level | Test file | Exact test | Status |
| --- | --- | --- | --- | --- |
| TC-01 | Browser | `tests/e2e/app.spec.ts` | `adds a color and keeps the workspace accessible` | automated |
| TC-02 | Core | `src/core/workspace/commands.test.ts` | `adds a valid CSS draft with a generated stable ID and resets the next draft` | automated |
| TC-03 | Browser | — | — | missing |
| TC-04 | Browser | — | — | missing |
| TC-05 | Browser | — | — | missing |
| TC-06 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated |
| TC-07 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-08 | Core | `src/core/workspace/commands.test.ts` | `preserves stable identity and background role through duplicate and delete` | automated |
| TC-09 | Core | `src/core/workspace/commands.test.ts` | `accepts the idle boundary as exactly one transaction` | automated |
| TC-10 | Core | `src/core/workspace/commands.test.ts` | `accepts one edit once, then leaves the already accepted edit unchanged` | automated |
| TC-11 | Feedback | `src/core/feedback/english-announcement.test.ts` | `renders edit, APCA, WCAG, and color-vision sections in deterministic order` | automated |
| TC-12 | Feedback | — | — | missing |
| TC-13 | Feedback | — | — | missing |
| TC-14 | Feedback | `src/core/feedback/english-announcement.test.ts` | `renders edit, APCA, WCAG, and color-vision sections in deterministic order` | automated |
| TC-15 | Feedback | — | — | missing |
| TC-16 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-17 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-18 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-19 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-20 | Browser | — | — | missing |
| TC-21 | Browser | `tests/e2e/app.spec.ts` | `keeps invalid input focused and publishes only an alert` | automated |
| TC-22 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-23 | Browser | `tests/e2e/app.spec.ts` | `keeps each opened popover accessible and restores its trigger focus` | automated |
| TC-24 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-25 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated |

## Screen reader suite

`pnpm test:screen-reader` is intentionally separate from the ordinary browser
suite. It launches NVDA through Guidepup and therefore requires a Windows
machine with NVDA installed and the Guidepup environment prepared. It is not
part of `pnpm verify`; a missing OS-level screen-reader setup must not make the
ordinary local hook unstable.

Before native acceptance, run the Guidepup setup commands in an interactive
Windows session with permission to create its local assets:

```text
npx @guidepup/setup setup
npx @guidepup/setup install
```

Native status at the latest verification: **blocked externally**. NVDA is
installed, but Guidepup could not create its required
`AppData\\Local\\guidepup` preferences/assets under the sandboxed session. The
screen-reader test therefore remains a failing acceptance gate until those
OS-level prerequisites are provisioned; it is not counted as automated pass
coverage in the matrix.
