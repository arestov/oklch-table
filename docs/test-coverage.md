# OKLCH table test coverage

The current browser smoke test is a characterization test for the accepted
golden path. The implementation tracks TC-01 through TC-25 from
`implementation-plan.md`; the core and browser suites are extended alongside
each respective implementation step.

| Layer | Responsibility |
| --- | --- |
| Domain | Color parsing, analysis and semantic projection/diff |
| Core | Drafts, accepted revisions and workspace transactions |
| Browser | Keyboard, focus, popovers, live regions and clipboard |
| Screen reader | Optional Guidepup acceptance flows |

## Screen reader suite

`pnpm test:screen-reader` is intentionally separate from the ordinary browser
suite. It launches NVDA through Guidepup and therefore requires a Windows
machine with NVDA installed and the Guidepup environment prepared. It is not
part of `pnpm verify`; a missing OS-level screen-reader setup must not make the
ordinary local hook unstable.
