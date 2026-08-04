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
