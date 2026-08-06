# Infrastructure

The application is built into `dist/` and can be served by any static HTTP host.
Every `VITE_*` environment variable is public and must never contain a secret.

## Toolchain

- Node and pnpm versions are pinned in `.node-version` and `package.json`.
- pnpm 11 denies dependency build scripts unless they are explicitly listed in `allowBuilds`.
- Vite 8 builds with Rolldown and targets `baseline-widely-available`.
- `.browserslistrc` is the matching policy for Browserslist consumers.
- Nano Stores implements Svelte's store contract directly and needs no framework adapter.
- Biome formats and lints TypeScript, Svelte, CSS, and configuration files.
- Stylelint enforces the project's OKLCH-oriented CSS color policy.
- Svelte tooling uses TypeScript 6; TypeScript 7 checks framework-independent modules.
- Vitest runs unit tests; Playwright and axe-core test the built application.
- Size Limit budgets initial JavaScript and application CSS.

Run `pnpm check` for the fast quality gate. The recommended complete local gate is
`pnpm verify:full`: it runs quality checks, the build and size budgets, and all
three Playwright engines. On Windows it then runs the five-case NVDA smoke suite.
Use `pnpm verify:full:native` on Windows when all native NVDA cases are required.
Both commands reuse the build and stop on the first failed phase. Because NVDA
controls the foreground Firefox window, leave the keyboard and mouse untouched
during the final Windows phase. `pnpm verify` remains the stable Chromium-only
gate for hooks and environments without every Playwright browser installed.
The unit suite uses V8 coverage thresholds: 90% statements, 78% branches, 88%
functions, and 92% lines. Local browser runs use Chromium by default; CI and
`pnpm verify:full` run the same suite in Chromium, Firefox, and WebKit.
`pnpm test:e2e:run` runs the browser suite against an existing build;
`pnpm test:e2e` builds first.

The required Linux workflow has independent `quality` and `browser` jobs. The
quality job runs formatting, lint, type, and coverage gates. The browser job
builds once, checks bundle budgets, and runs all three Playwright engines.
Failed browser runs retain `test-results/` for seven days. Both jobs use
read-only repository permissions and superseded runs on the same ref are
canceled.

## Screen readers

Guidepup screen-reader suites run natively. The automated Windows acceptance
suite pairs NVDA with Playwright Firefox, fixes both the browser locale and the
NVDA interface language to English, uses eSpeak, and temporarily selects English
(US) for the foreground browser thread. Run
`pnpm test:screen-reader:smoke` for the five-case transport smoke suite or
`pnpm test:screen-reader:full` for all native cases. `pnpm test:screen-reader`
is a compatibility alias for the full suite. When running locally, use an
interactive desktop and leave the foreground untouched until it exits.
The recommended `pnpm verify:full` adds smoke automatically on Windows;
`pnpm verify:full:native` substitutes the complete native suite.
The native stack is intentionally pinned to `@guidepup/guidepup` 0.31.0,
`@guidepup/playwright` 0.18.0, and `@playwright/test` 1.62.1. Update these three
packages as a tested compatibility set: older `@guidepup/playwright` 0.14.x
was developed against Playwright 1.47.x and fails while creating the page
fixture in this project's Playwright 1.62.x setup. Version 0.18.x targets the
newer Playwright API line and is verified by the native suite below.
The Linux Dev Container remains suitable for Biome, type checks, Vitest, Vite,
Playwright, and axe-core; it is not a replacement for native screen-reader
automation.

`.github/workflows/nvda.yml` prepares portable NVDA with Guidepup on the free
standard GitHub-hosted Windows Server 2025 runner. Pull requests and pushes to
`main` run the complete native suite automatically; `workflow_dispatch` selects
smoke or full for an explicit diagnostic run. After configuring the operating
system, the workflow explicitly installs the NVDA assets required by the pinned
Guidepup version. Native output remains in the job log and is not uploaded as an
artifact because it originates from a foreground assistive-technology session.
This workflow supplements the required Linux accessibility contract: only
actual NVDA speech, browse/table navigation, and native clipboard readback are
allowed to depend exclusively on Windows.
