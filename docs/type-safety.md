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

## Strictness policy

Production TypeScript enables both `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Reads from maps and arrays therefore require an
explicit fallback or a checked invariant through `requireValue`.

The external-test configuration keeps the ordinary strict settings but disables
`noUncheckedIndexedAccess`: test fixtures routinely address known positions
after asserting their setup, while the production boundary must preserve the
runtime checks.
