# OKLCH table test coverage

The suites below provide explicit coverage for TC-01 through TC-25 from the
implementation plan. `tests/e2e/golden-path.spec.ts` is the acceptance test
for the end-to-end error-hover token workflow; it checks user-visible actions,
focus, detailed contrast feedback, and the copied final CSS token without
depending on application internals.

| Layer | Responsibility |
| --- | --- |
| Domain | Color parsing, analysis and semantic projection/diff |
| Core | Drafts, accepted revisions and workspace transactions |
| Browser | Keyboard, focus, popovers, live regions and clipboard |
| Screen reader | Optional Guidepup acceptance flows |

| TC | Primary automated coverage |
| --- | --- |
| TC-01—TC-04 | Core workspace scenarios and browser add-color flow |
| TC-05—TC-08 | Browser keyboard, contrast and duplicate-focus flows |
| TC-09—TC-15 | Core feedback scenarios and semantic announcement tests |
| TC-16 | Browser popover detail flow |
| TC-17—TC-20 | Browser column-jump flow |
| TC-21 | Core invalid-candidate scenario and browser ARIA/alert check |
| TC-22—TC-24 | Browser delete and popover focus-restoration flows |
| TC-25 | Golden-path browser acceptance test with clipboard assertion |

## Screen reader suite

`pnpm test:screen-reader` is intentionally separate from the ordinary browser
suite. It launches NVDA through Guidepup and therefore requires a Windows
machine with NVDA installed and the Guidepup environment prepared. It is not
part of `pnpm verify`; a missing OS-level screen-reader setup must not make the
ordinary local hook unstable.
