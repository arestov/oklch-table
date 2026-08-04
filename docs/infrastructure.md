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
- Svelte tooling uses TypeScript 6; TypeScript 7 checks framework-independent modules.
- Vitest runs unit tests; Playwright and axe-core test the built application.
- Size Limit budgets initial JavaScript and application CSS.

Run `pnpm check` for the fast quality gate and `pnpm verify` for the complete gate.
All commands are cross-platform and are intended to be reused unchanged by future CI.

## Screen readers

Guidepup is installed but screen-reader suites must run natively: NVDA on Windows and
VoiceOver on macOS. The Linux Dev Container is for Biome, type checks, Vitest, Vite,
Playwright, and axe-core; it is not a replacement for native screen-reader automation.
