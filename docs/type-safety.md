# Type-safety checks

`pnpm check:types` is the required type gate. It runs:

- `svelte-check` for every Svelte component and application TypeScript file;
- TypeScript 7 for the core and domain layers;
- TypeScript 6 for Playwright, NVDA, and other external test sources;
- `type-coverage` for production TypeScript in `src`.

The type-coverage gate requires 100%. Test files are excluded because their
contracts are checked by TypeScript and by the dedicated type tests. Explicit
type assertions are excluded from the percentage: they remain subject to
normal compiler checks and review, rather than being treated as `any`.

Compile-time contract tests live beside the domain code as `*.type.test.ts`.
They cover branded IDs, comparison keys, and transaction discriminants. A
documented `@ts-expect-error` is allowed only for a negative type contract.

## Deferred strictness

`noUncheckedIndexedAccess` is intentionally not enabled yet. A trial run
identified more than 80 unchecked reads from color maps and arrays across the
domain and presentation code. Enable it in a dedicated hardening change after
introducing checked access helpers and updating the affected fixtures; do not
silence those errors with non-null assertions.

`exactOptionalPropertyTypes` should follow as a separate change, after the
unchecked-read migration is complete.
