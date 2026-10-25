# `src/core/` — data and algorithm layers (layers 1–2)

The pure core. It is the only part of the app that is allowed to know *nothing* about the
browser, React, D3 or time. Everything the other layers draw is computed here and handed out as
plain serialisable data.

```
core/
├── model/        the five structure models + supporting structures
├── trace/        the Step contract (step.ts) and the trace store (store.ts)
└── operations/   one instrumented generator per operation, each emitting Step[]
```

## Rules

- **No DOM, no React, no D3, no timers.** Enforced twice: by the `boundaries` elements/rule and by
  a `no-restricted-imports` block in `eslint.config.js` (`ADR-2`, `NFR-M2`).
- **Deterministic.** No wall-clock, no randomness, fixed neighbour order. The same `(structure,
  operation, dataset)` must always produce a byte-identical trace, or golden-trace tests and exact
  replay are meaningless (`NFR-C2`).
- **Serialisable.** Every value here must survive `JSON.stringify`/`parse` and `structuredClone`,
  because the same trace crosses the Web Worker boundary and becomes a test fixture (`ADR-1`).
- **One trace type.** `Step`/`StructureDelta`/`AuxState` live in exactly one module
  (`trace/step.ts`) so the generator and the renderer cannot drift apart (`NFR-M3`).

## Tested with no browser

`npm run test:core` runs only the tests under `src/core/`. It is the check that the layering is
real: a core test that needs `document` or `window` is a bug in the architecture, not in the test.
Target: ≥ 90 % line coverage on `src/core/` only (`NFR-M1`, configured in `vite.config.ts`).
