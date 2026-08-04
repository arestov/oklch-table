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
| TC-02 | Core | — | — | missing |
| TC-03 | Core | — | — | missing |
| TC-04 | Core | `src/core/workspace/commands.test.ts` | `preserves stable identity and background role through duplicate and delete` | automated |
| TC-05 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-06 | Core | `src/core/workspace/commands.test.ts` | `preserves stable identity and background role through duplicate and delete` | automated |
| TC-07 | Core | `src/core/workspace/commands.test.ts` | `keeps the last valid preview when a draft becomes invalid` | automated |
| TC-08 | Core | `src/core/workspace/commands.test.ts` | `accepts one edit once, then leaves the already accepted edit unchanged` | automated |
| TC-09 | Feedback | `src/core/feedback/coordinator.test.ts` | `debounces to one checkpoint and cleans up its timer` | automated |
| TC-10 | Core | `src/core/workspace/commands.test.ts` | `accepts one edit once, then leaves the already accepted edit unchanged` | automated |
| TC-11 | Core | — | — | missing |
| TC-12 | Feedback | — | — | missing |
| TC-13 | Core | — | — | missing |
| TC-14 | Feedback | `src/core/feedback/coordinator.test.ts` | `debounces to one checkpoint and cleans up its timer` | automated |
| TC-15 | Core | — | — | missing |
| TC-16 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-17 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-18 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated |
| TC-19 | Browser | — | — | missing |
| TC-20 | Browser | — | — | missing |
| TC-21 | Browser | — | — | missing |
| TC-22 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-23 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-24 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-25 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated |

## Screen reader suite

`pnpm test:screen-reader` is intentionally separate from the ordinary browser
suite. It launches NVDA through Guidepup and therefore requires a Windows
machine with NVDA installed and the Guidepup environment prepared. It is not
part of `pnpm verify`; a missing OS-level screen-reader setup must not make the
ordinary local hook unstable.
