# `src/app/` — core application logic (layer 3)

The layer that knows about **time and workflow**: the session controller, the
playback state machine, validation, the catalogue accessor, the request pipeline,
and (later) the Web Worker client and router. It holds the app's single mutable
value — the step index — and its single timer (`ADR-4`).

```
app/
├── controller.ts     the PlaybackController: one index, one timer, subscribe/getSnapshot
├── reducers.ts       structure id → model reducer registry (keeps the controller agnostic)
├── stateMachine.ts   the phases IDLE → READY → PLAYING ⇄ PAUSED → FINISHED (ERROR)
├── validate.ts       total, per-token validation before construction (ADR-7)
├── runOperation.ts   the pipeline: validate → build → execute → LoadInput, for every structure
├── catalogue.ts      typed lookups over data/catalogue.ts
├── practice.ts       deterministic predict-the-next-step quiz over a trace
├── shareLink.ts      encode/decode a run request + step index in the URL
├── workerClient.ts   main-thread side of the worker boundary (not in this slice)
├── worker.ts         worker entry point (not in this slice)
└── routes.ts         tiny catalogue router (not in this slice)
```

## Structure-agnostic session (`reducers.ts`)

`LoadInput` carries a `structureId` string; the controller asks `reducers.ts` for the reducer
the trace must be replayed with, instead of importing every model. `reducers.ts` also owns the
discriminated `StructureState` union (`{ structureId, model }`), so a renderer that switches on
`structureId` gets the right model type with no cast. Adding a structure therefore touches the
registry and the catalogue, not the controller (`NFR-S2`).

## Validation (`validate.ts`)

One module, two families of input, one report shape the UI can render generically:

- **Value lists** — `validateValues` (list, number-or-word), `validateIntegerList` (the A1
  pipeline), `validateBstKeys` (integers, duplicates skipped), `validateHeapValues` (integers,
  duplicates allowed) and `validateSingleInteger` (one insert/search/delete key).
- **Edge lists** — `validateGraphEdges` (one `A-B` / `A-B:weight` per line) and
  `validateGraphSource`.

Every report classifies **every** token (`FR6`) with `accepted | ignored | rejected`:

- `ignored` is the one advisory case — a duplicate BST key, which A1 `ER4` recovers rather than
  fails;
- `rejected` blocks the run (`ER1`, `ER2`, `ER3`, `ER8`, `ER9`);
- `error` carries the batch-level message for `ER3`/`ER8` (nothing usable, or over the cap).

Caps come from `VALIDATION_LIMITS` (A1 `FR5`: ≤200 tokens, ±9999; `NFR-S1`: 200 nodes for
trees/graphs), so the numbers live in exactly one place. Presets (`data/presets/`) are turned
back into text and validated through the same functions — nothing bypasses validation.

## Practice and share links

`practice.ts` builds a prediction from `trace[index + 1]`: the correct answer is always the next
narration, two distractors come from other steps (or fixed fallbacks), and a seeded shuffle keeps
the option order deterministic for a given run. `shareLink.ts` turns the validated request plus the
step index into a query parameter and back, rejecting malformed payloads rather than partially
applying them. Both modules are pure and DOM-free except for the optional URL default.

## Rules

- **One mutable value, one timer.** They live here and nowhere else; the UI reads
  a snapshot and calls commands. This is what makes every pane a pure function of
  `(trace, index)`.
- **No React, no D3, no DOM.** This layer must be unit-testable in Node. The
  controller is framework-agnostic on purpose: React only subscribes to it.
- **No algorithms.** Generation is *requested* here and executed in
  `core/operations/`; validation and construction are orchestrated here but
  implemented below.

## Why `runOperation.ts` exists

The pipeline (parse → validate → build → execute) is application workflow, not
presentation. Putting it here keeps the entry file a composition root, and keeps
the rule that `ui/` and the entry must not import the algorithm layer directly
(A2 Table 5).

## Composed traces: insert the dataset one value at a time

A dataset is never materialised in one invisible jump. `runOperation` composes two
phases with `core/operations/compose.ts`:

1. **build** — `bstInsertAll` / `heapInsertAll` / `graphBuild` run the pure
   single-insert (or add-edge) generator once per value, so the structure grows a
   node/edge at a time. Every step keeps the *insert* operation id.
2. **operation** — the selected search/delete/traversal/sift/BFS/DFS, or nothing
   when the operation *is* the build.

Because each step carries its own `operation`, the pseudocode pane resolves the
listing from `currentStep.operation` (`App.tsx`), so the highlight follows the
instruction actually executing: insert lines during the build, then the operation's
own lines. `heapBuildMin`/`heapBuildMax` are the deliberate exception — they
heapify the raw array in one O(n) phase, which is the contrast against n inserts.

`LoadInput.initial` is the *empty* structure (or the raw array for build-heap), and
the trace's deltas replay forward to the final model, so the trace store stays the
single source of truth for every pane.
