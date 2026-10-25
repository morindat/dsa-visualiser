# `src/` — source layout

Every top-level directory below `src/` is an architectural **layer**, not a filing preference.
Imports may only point *downwards*, and that rule is enforced mechanically by ESLint
(`boundaries/dependencies`, plus a `no-restricted-imports` guard on `core/`) — see
`eslint.config.js`. This is `ADR-2` and `NFR-M2`; A2 `Table 5` / `Listing 18` fix the paths.

| Directory | Layer | May import | Why it exists |
| --- | --- | --- | --- |
| `core/model/` | Data / model | only from `core/` | One module per structure, holding its data and invariants. |
| `core/trace/` | Data / model | `core/model` | The frozen `Step` contract (`step.ts`) and the delta-log store. |
| `core/operations/` | Algorithm | `core/model`, `core/trace` | Pure generators that emit `Step[]`; one file per operation. |
| `render/` | Rendering | `core/`, `render/`, `data/`, D3 | Geometry and one SVG renderer per structure. |
| `app/` | Core application | `core/`, `data/`, `render/` | Controller, state machine, validation, catalogue, worker. |
| `ui/` | Presentation | anything below, plus `app/`/`render/` | Shell, panes, controls, accessibility. |
| `data/` | Static data | `core/model`, `core/trace` | Versioned catalogue, presets and golden traces. |
| `test/` | Test support | — | Vitest setup shared by the whole suite. |

`main.tsx` and `App.tsx` sit directly under `src/`; they are the only "entry" files and may reach
every layer.

## Why the boundary is strict

An operation is a **generator of states** that emits an immutable `Step[]`; the UI is a pure
function of `(trace, index)` (`ADR-1`). That only holds if the algorithm core never touches the
DOM or a rendering library. The operational test is `npm run test:core`: it runs with no DOM, so
*if a core test ever needs a browser, the architecture has already been broken* (`NFR-M3`).

## Adding a new operation later

After the `Step` contract is frozen, adding an operation is exactly three edits — one generator
here, one pseudocode listing + `codeLine` map, one `OperationMeta` record — and **no** change to
`app/controller.ts` or `ui/` (A2 §5.7). If you find yourself editing the shell, stop and fix the
boundary instead.
