# OKLCH table test coverage

This matrix records the currently executable coverage for TC-01 through TC-25
from the implementation plan. A row is marked `missing` when the repository
does not yet contain a test with assertions for that exact behaviour; it is not
represented as covered merely because a related UI is present.

| Layer | Responsibility |
| --- | --- |
| Domain | Color parsing, analysis and semantic projection/diff |
| Core | Drafts, accepted revisions and workspace transactions |
| Nanostore integration | Public workspace commands through transaction, semantic analysis, and feedback stores |
| Browser | Keyboard, focus, popovers, live regions and clipboard |
| Screen reader | Native Guidepup/NVDA acceptance flows |

Every product outcome exercised by the Windows-only NVDA suite also has a
cross-platform owner in the Domain/Core/Nanostore/Browser layers. Native-only
coverage is limited to actual NVDA speech, NVDA browse/table navigation, and
native clipboard readback. Consequently, the required Linux CI can reject
functional, announcement-content, DOM, focus, and ARIA regressions even when a
Windows runner is unavailable.

| TC | Level | Test file | Exact test | Status |
| --- | --- | --- | --- | --- |
| TC-01 | Browser | `tests/e2e/app.spec.ts` | `adds a color and keeps the workspace accessible` | automated |
| TC-02 | Core | `src/core/workspace/commands.test.ts` | `adds a valid CSS draft with a generated stable ID and resets the next draft` | automated |
| TC-03 | Browser | `tests/e2e/app.spec.ts` | `adds consecutive colors and preserves OKLCH serialization` | automated |
| TC-04 | Browser | `tests/e2e/app.spec.ts` | `adds consecutive colors and preserves OKLCH serialization` | automated |
| TC-05 | Browser + screen reader | `tests/e2e/golden-path.spec.ts`; `tests/screen-reader/golden-path.nvda.spec.ts` | `supports the error-hover token golden path`; `completes the empty-workspace error-hover transcript` | automated cross-platform; NVDA confirms native L/C/H navigation |
| TC-06 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated (empty workspace) |
| TC-07 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-08 | Core | `src/core/workspace/commands.test.ts` | `preserves stable identity and background role through duplicate and delete` | automated |
| TC-09 | Feedback | `src/core/feedback/coordinator.test.ts` | `runs one checkpoint at 700 ms after the final input` | automated |
| TC-10 | Core | `src/core/workspace/commands.test.ts` | `accepts one edit once, then leaves the already accepted edit unchanged` | automated |
| TC-11 | Feedback | `src/core/feedback/english-announcement.test.ts` | `renders edit, APCA, WCAG, and color-vision sections in deterministic order` | automated |
| TC-12 | Feedback | `src/core/feedback/english-announcement.test.ts` | `orders lost support before restored support and omits unchanged sections` | automated |
| TC-13 | Feedback | `src/core/feedback/english-announcement.test.ts` | `orders lost support before restored support and omits unchanged sections` | automated |
| TC-14 | Feedback | `src/core/feedback/english-announcement.test.ts` | `renders edit, APCA, WCAG, and color-vision sections in deterministic order` | automated |
| TC-15 | Feedback | `src/core/feedback/english-announcement.test.ts` | `orders lost support before restored support and omits unchanged sections` | automated |
| TC-16 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-17 | Browser | `tests/e2e/app.spec.ts` | `starts table jumps anywhere and navigates by column or row` | automated |
| TC-18 | Browser | `tests/e2e/app.spec.ts` | `starts table jumps anywhere and navigates by column or row` | automated |
| TC-19 | Browser | `tests/e2e/app.spec.ts` | `starts table jumps anywhere and navigates by column or row` | automated |
| TC-20 | Browser | `tests/e2e/app.spec.ts` | `starts table jumps anywhere and navigates by column or row` | automated |
| TC-21 | Browser | `tests/e2e/app.spec.ts` | `keeps invalid input focused and publishes only an alert` | automated |
| TC-22 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-23 | Browser | `tests/e2e/app.spec.ts` | `keeps every opened popover accessible and restores its trigger focus` | automated |
| TC-24 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-25 | Browser + screen reader | `tests/e2e/golden-path.spec.ts`; `tests/screen-reader/golden-path.nvda.spec.ts` | `supports the error-hover token golden path`; `completes the empty-workspace error-hover transcript` | Chromium Clipboard API assertion plus native NVDA clipboard readback |
| APCA oracle | Domain | `src/domain/apca-oracle.test.ts` | `matches independent APCA-W3 0.0.98G-4g reference fixtures` | automated |

## Golden-path feedback publication

`src/core/feedback/golden-path.integration.test.ts` is the integration boundary
for the main announcement matrix. It invokes only public workspace commands and
observes the production nanostores, proving this chain:

```text
command → accepted revision + transaction → semantic analysis → announcementStore + visibleFeedbackStore
```

| Scenario step | Nanostore integration assertion | Delivery assertion |
| --- | --- | --- |
| Add rows, select background, duplicate | Stable order, inherited role/provenance, one result-id increment, and topology text | `nvda.spec.ts` confirms the background and duplicate speech |
| Enter `L 60` | Draft preview is silent; one commit accepts `60`; repeated Enter is unchanged | `nvda.spec.ts` confirms fast native numeric speech; browser/NVDA idle case checks the status DOM |
| `60 → 90 → 60` | Production APCA loss/restoration is retained in `apca`; WCAG remains its own section; spoken order equals non-empty sections | `nvda.spec.ts` confirms native APCA loss/restoration speech |
| `60 → 59.9` | Only the edited-value section is published; APCA/WCAG/CVD are empty | `nvda.spec.ts` confirms no metric speech |
| Color-vision add/resolve | CVD feedback is separate from APCA and WCAG, and the spoken result joins sections deterministically | Renderer unit tests cover plural aggregation; browser live-region tests cover DOM mutation |
| APCA + WCAG + CVD transition | All four non-empty sections are published from production analysis in deterministic order | The native suite samples the combined speech transport |
| Repeated identical publication | Channel identity increments for the same text | Browser mutation observers prove that both status and alert mutate again |

The nanostore test validates the content, ordering, atomic store publication,
and deduplication policy. It does not claim that a screen reader spoke the
message: that transport-level fact belongs to the native NVDA cases above.

## Cross-platform ownership of native scenarios

The browser golden path is executable from an empty workspace and reaches the
browser Clipboard API. `tests/screen-reader/golden-path.nvda.spec.ts` starts
from the empty table; all user input is sent through NVDA/keyboard and
Playwright is restricted to assertions and infrastructure setup.

| Related behaviour | Cross-platform owner | Native-only evidence |
| --- | --- | --- |
| Initial draft focus and accessible name | `app.spec.ts` — `adds a color and keeps the workspace accessible` | NVDA reports the initial focus |
| Clipboard-first and consecutive additions | `app.spec.ts` — paste, manual-input smoke, and consecutive-addition cases | NVDA drives the same draft loop |
| Background role and duplicate inheritance | `commands.test.ts`, `golden-path.integration.test.ts`, and browser focus coverage | NVDA speaks the topology result |
| Fast and idle field edits | `commands.test.ts`, `coordinator.test.ts`, and the atomic/idle browser cases | NVDA speaks a fast polite status |
| Delayed native character input | `app.spec.ts` — `continues numeric input after an idle commit boundary` | Guidepup key injection follows the same boundary |
| APCA loss/restore and stricter/easier guidance | `golden-path.integration.test.ts` | NVDA samples the rendered phrases |
| Combined WCAG and CVD transitions | `golden-path.integration.test.ts` | NVDA samples the combined speech |
| Same-category edit without metric sections | `golden-path.integration.test.ts` and browser golden path | NVDA confirms metric text is absent |
| Checks and contrast details with focus return | `presentation.test.ts`, `app.spec.ts`, and browser golden path | NVDA reads static popover content in browse mode |
| Compact Checks summaries | `presentation.test.ts` plus browser table/axe coverage | NVDA traverses table cells with `Ctrl+Alt+Down` |
| Invalid draft and assertive alert | `app.spec.ts` invalid paste/edit cases | NVDA speaks the assertive alert |
| Repeated identical announcements | `stores.test.ts` plus the browser mutation test | The DOM contract removes reliance on platform speech deduplication |
| Clipboard readback | Browser golden path | NVDA reads the native Windows clipboard |
| Empty-workspace golden path | Browser golden path | Full foreground NVDA transcript |

The five `@smoke` native cases cover initial focus, one polite status, one
assertive alert, one static Checks popover, and NVDA table traversal. The full
suite retains the detailed speech cases and empty-workspace transcript.

The complete native path asserts the two-dimensional `Ctrl+Alt+Up/Down`
navigation, column shortcuts, row-4 and row-5 contrast details, duplicate
inheritance, idle checkpoint behaviour, no duplicate status after Enter, and
native clipboard readback. Focused native tests assert actual NVDA speech for a
fast numeric commit and for APCA lost/restored/no-category transitions. Browser
Playwright covers atomic live-region mutations. Guidepup logs speech associated
with a command, but not ambient speech from an asynchronous 700 ms idle callback,
so the latter is asserted through the actual status DOM rather than a manual
readback.

The native scripts are intentionally separate from the ordinary browser suite.
`pnpm test:screen-reader:smoke` runs five transport cases;
`pnpm test:screen-reader:full` runs all native cases; and
`pnpm test:screen-reader` aliases the full suite. They launch NVDA through
Guidepup and therefore require Windows with the Guidepup environment prepared.
They are not part of `pnpm verify`; a missing OS-level screen-reader setup must
not make the ordinary local hook unstable. The recommended `pnpm verify:full`
runs all browser engines everywhere and adds NVDA smoke on Windows.
`pnpm verify:full:native` is Windows-only and runs every native NVDA case.

Before native acceptance, run the Guidepup setup commands in an interactive
Windows session with permission to create its local assets:

```text
npx @guidepup/setup@0.21.0 setup
npx @guidepup/setup@0.21.0 install nvda
pnpm exec playwright install firefox
```

The suite uses the supported NVDA + Firefox pairing, fixes the browser locale
and NVDA's session-only interface language to English, and uses eSpeak. Its
fixture switches only the foreground Firefox thread to English (US) for
keyboard input and restores the original layout after every test. It does not
change the Windows display or regional language. Because NVDA controls the
native foreground window, do not use the
keyboard, mouse, or application switcher while this command is running.

GitHub Actions exposes the same pinned stack on the free standard
`windows-2025` runner. Pull requests and pushes to `main` run the full suite;
`workflow_dispatch` selects smoke or full for an explicit diagnostic run. The
workflow configures Windows and then explicitly installs the project-compatible
NVDA assets. The Linux jobs never attempt to launch NVDA. Native job logs are
retained by GitHub, but foreground-session test artifacts are not uploaded.

On 2026-08-06, the complete native suite and copy/paste golden path were run in
the documented Windows NVDA + Firefox Guidepup environment. Native cases control
the foreground session, so they remain separate from `pnpm verify`; operating
NVDA/Firefox is an environmental requirement, not a pre-commit requirement. Use
`pnpm verify:full` as the normal comprehensive command and
`pnpm verify:full:native` before changes that need the complete NVDA transcript.

## APCA reference oracle

`src/domain/apca-oracle.test.ts` stores signed Lc values calculated by the
independent APCA-W3 0.0.98G-4g reference algorithm (apca-w3 library 0.1.9),
using the text-first, background-second order. The source version and constants
are documented by the official [apca-w3 repository](https://github.com/Myndex/apca-w3#current-apca-constants).
