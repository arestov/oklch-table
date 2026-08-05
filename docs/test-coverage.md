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
| TC-05 | Screen reader | `tests/screen-reader/golden-path.nvda.spec.ts` | `completes the empty-workspace error-hover transcript` | automated (native L/C/H navigation) |
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
| TC-17 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-18 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-19 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-20 | Browser | `tests/e2e/app.spec.ts` | `cancels and rejects unavailable column jumps without moving draft focus` | automated |
| TC-21 | Browser | `tests/e2e/app.spec.ts` | `keeps invalid input focused and publishes only an alert` | automated |
| TC-22 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-23 | Browser | `tests/e2e/app.spec.ts` | `keeps each opened popover accessible and restores its trigger focus` | automated |
| TC-24 | Browser | `tests/e2e/app.spec.ts` | `preserves focus through duplicate, delete, shortcuts, and popover details` | automated |
| TC-25 | Screen reader | `tests/screen-reader/golden-path.nvda.spec.ts` | `completes the empty-workspace error-hover transcript` | automated (native clipboard readback) |

## Screen reader suite

The browser golden path is executable from an empty workspace and reaches the
native clipboard. `tests/screen-reader/golden-path.nvda.spec.ts` starts from
the empty table; all user input is sent through NVDA/keyboard and Playwright is
restricted to assertions and infrastructure setup.

| Related behaviour | Native test | Status |
| --- | --- | --- |
| Initial draft focus | `nvda.spec.ts` — `announces the initial color draft` | covered |
| Consecutive additions | `nvda.spec.ts` — `adds the first and second colors without leaving the draft loop` | covered |
| Isolated fast field edit | `nvda.spec.ts` — `announces a fast numeric commit before the idle checkpoint` | covered (native speech) |
| APCA transition feedback | `nvda.spec.ts` — `announces APCA loss and restoration` | covered (native speech) |
| No-category feedback | `nvda.spec.ts` — `announces a no-category edit without metric sections` | covered (native speech) |
| Idle field edit and feedback | `nvda.spec.ts` — `jumps to Lightness and reaches one grouped idle result` | covered (status DOM) |
| Isolated details/focus return | `nvda.spec.ts` — `reads contrast details and returns to the editing loop` | covered |
| Invalid draft | `nvda.spec.ts` — `announces an invalid CSS color and preserves its focus` | covered |
| Empty-workspace golden path | `golden-path.nvda.spec.ts` — `completes the empty-workspace error-hover transcript` | covered |

The complete native path asserts the two-dimensional `Ctrl+Alt+Up/Down`
navigation, column shortcuts, row-4 and row-5 contrast details, duplicate
inheritance, idle checkpoint behaviour, no duplicate status after Enter, and
native clipboard readback. Focused native tests assert actual NVDA speech for a
fast numeric commit and for APCA lost/restored/no-category transitions. Browser
Playwright covers atomic live-region mutations. Guidepup logs speech associated
with a command, but not ambient speech from an asynchronous 700 ms idle callback,
so the latter is asserted through the actual status DOM rather than a manual
readback.

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

On 2026-08-05, the focused fast-numeric, APCA lost/restored, and no-category
native cases passed in the documented Windows NVDA + Firefox Guidepup
environment. Native cases are run in bounded groups because they control the
foreground session. The suite is deliberately separate from `pnpm verify`;
operating the foreground NVDA/Firefox session remains an environmental
requirement, not a pre-commit requirement.
