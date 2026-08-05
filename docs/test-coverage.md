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
| Screen reader | Native Guidepup/NVDA acceptance flows |

| TC | Level | Test file | Exact test | Status |
| --- | --- | --- | --- | --- |
| TC-01 | Browser | `tests/e2e/app.spec.ts` | `adds a color and keeps the workspace accessible` | automated |
| TC-02 | Core | `src/core/workspace/commands.test.ts` | `adds a valid CSS draft with a generated stable ID and resets the next draft` | automated |
| TC-03 | Browser | `tests/e2e/app.spec.ts` | `adds consecutive colors and preserves OKLCH serialization` | automated |
| TC-04 | Browser | `tests/e2e/app.spec.ts` | `adds consecutive colors and preserves OKLCH serialization` | automated |
| TC-05 | Browser | `tests/e2e/app.spec.ts` | `compares two accent colors through the text-contrast details` | automated |
| TC-06 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated (empty workspace) |
| TC-07 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-08 | Core | `src/core/workspace/commands.test.ts` | `preserves stable identity and background role through duplicate and delete` | automated |
| TC-09 | Core | `src/core/workspace/commands.test.ts` | `accepts the idle boundary as exactly one transaction` | automated |
| TC-10 | Core | `src/core/workspace/commands.test.ts` | `accepts one edit once, then leaves the already accepted edit unchanged` | automated |
| TC-11 | Feedback | `src/core/feedback/english-announcement.test.ts` | `renders edit, APCA, WCAG, and color-vision sections in deterministic order` | automated |
| TC-12 | Feedback | `src/core/feedback/english-announcement.test.ts` | `orders lost support before restored support and omits unchanged sections` | automated |
| TC-13 | Feedback | `src/core/feedback/english-announcement.test.ts` | `orders lost support before restored support and omits unchanged sections` | automated |
| TC-14 | Feedback | `src/core/feedback/english-announcement.test.ts` | `renders edit, APCA, WCAG, and color-vision sections in deterministic order` | automated |
| TC-15 | Feedback | `src/core/feedback/english-announcement.test.ts` | `orders lost support before restored support and omits unchanged sections` | automated |
| TC-16 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-17 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-18 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-19 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-20 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-21 | Browser | `tests/e2e/app.spec.ts` | `keeps invalid input focused and publishes only an alert` | automated |
| TC-22 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-23 | Browser | `tests/e2e/app.spec.ts` | `keeps each opened popover accessible and restores its trigger focus` | automated |
| TC-24 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-25 | Browser | `tests/e2e/golden-path.spec.ts` | `supports the error-hover token golden path` | automated (native clipboard) |

## Screen reader suite

The browser golden path is executable from an empty workspace and reaches the
native clipboard. `tests/screen-reader/golden-path.nvda.spec.ts` starts from
the empty table; all user input is sent through NVDA/keyboard and Playwright is
restricted to assertions and infrastructure setup.

| Related behaviour | Native test | Status |
| --- | --- | --- |
| Initial draft focus | `nvda.spec.ts` — `announces the initial color draft` | covered |
| Consecutive additions | `nvda.spec.ts` — `adds the first and second colors without leaving the draft loop` | covered |
| Isolated field edit and feedback | `nvda.spec.ts` — `jumps to Lightness and hears one grouped result` | covered |
| Isolated details/focus return | `nvda.spec.ts` — `reads contrast details and returns to the editing loop` | covered |
| Invalid draft | `nvda.spec.ts` — `announces an invalid CSS color and preserves its focus` | covered |
| Empty-workspace golden path | `golden-path.nvda.spec.ts` — `completes the empty-workspace error-hover transcript` | covered |

The complete native path asserts the two-dimensional `Ctrl+Alt+Up/Down`
navigation, column shortcuts, row-4 and row-5 contrast details, duplicate
inheritance, APCA lost/restored/no-category transitions, one automatic
utterance per action, and native clipboard readback. Browser Playwright covers
the deterministic DOM, keyboard and clipboard contracts; native NVDA coverage
is required for OS-generated focus/table speech.

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
pnpm exec playwright install firefox
```

The suite uses the supported NVDA + Firefox pairing and a locale-independent
eSpeak synthesizer. Its fixture switches only the foreground Firefox thread to
English (US) for keyboard input and restores the original layout after every
test. Because NVDA controls the native foreground window, do not use the
keyboard, mouse, or application switcher while this command is running.

The latest complete local native run passed on 2026-08-05 in the documented
Windows NVDA + Firefox Guidepup environment (`golden-path.nvda.spec.ts`,
one test, approximately 2.7 minutes). It is deliberately separate from
`pnpm verify`; operating the foreground NVDA/Firefox session remains an
environmental requirement, not a pre-commit requirement.
