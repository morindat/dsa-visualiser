# ADR-8 — Freeze the `Step` contract at v1

**Status:** Accepted (frozen) · **Date:** 2026-09-30
**Relates to:** ADR-1, ADR-3, ADR-6 · NFR-C2, NFR-M2, NFR-M3
**Source of truth in code:** `src/core/trace/step.ts`

> This is the working record. When `A2_PY.tex` is next revised, fold this in as
> ADR-8 in the decisions table and reference it from the interfaces subsection.

---

## Context

A2 §5.7 fixes the build order: build **one** vertical slice, **freeze** the `Step`
contract, then add structures. The slice — linked-list `insertAtHead`, all three
panes and the controller working — is complete, and `Step` has now been exercised
by a real generator, a real delta-log store, a real renderer and a real golden
trace.

The contract is the interface between the two members' work. Changing it after one
operation is a five-minute job; after five structures it touches every generator,
reducer, renderer, pane, worker message and fixture. So the decision is taken now,
while it is cheap.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| **D1** | Structure **fields** (pointers) use a reserved id prefix `@` — `@head`, later `@tail`, `@root`, `@size` — and travel in `StructureDelta.updated`. | `updated` is already `{ id: string; from: unknown; to: unknown }`, so a pointer edit needs no new delta channel. The prefix makes "node" vs "field" decidable, and node ids (`n1`, `n2`, …) can never collide with it. *Rejected:* deriving the head as "the node nothing points at" — ambiguous between the create step and the link step. |
| **D2** | `Step.aux` is **optional**. | A linked-list insert has no auxiliary container: its auxiliary space is O(1) and empty. Emitting a fake `array` of the list's own values would duplicate the structure view and claim a container the algorithm does not use. Absence is the honest encoding, and the pane says so. |
| **D3** | `TraceEdge.kind` is a closed union — `'next' \| 'left' \| 'right' \| 'parent' \| 'index'` — and optional. | Covers everything A2 names (parent/child, `next`, heap index edits) and turns a typo into a compile error. `undefined` means an untyped edge, which is the normal case for a graph. |
| **D4** | Delta payload types stay named `TraceNode` / `TraceEdge`, not A2's shorthand `Node` / `Edge`. | `Node` would shadow the DOM `Node` in a project that also type-checks UI code against the DOM lib. A2 Listing 17 is shorthand, not an identifier list. |
| **D5** | `delta` is the **change**; `highlight` is the **emphasis**. They are allowed to disagree. | The final step of `insertAtHead` has an empty delta but still highlights the new node. Freezing this avoids a later argument about which one is authoritative. |
| **D6** | `GenerateSummary` lives in the contract module, not the algorithm layer. | The UI must show a summary without importing the algorithm layer (`NFR-M2`). The boundary lint caught the original placement. |
| **D7** | Determinism is part of the contract: no wall-clock, no randomness, fixed neighbour order. | Golden traces and exact replay both depend on it (`NFR-C2`). |

## Change policy

- **Additive** change (a new optional field, a new `AuxKind` or `EdgeKind`): bump the
  version note in `step.ts`, regenerate the golden traces, done.
- **Breaking** change (rename / remove / retype): update every producer and consumer,
  regenerate every golden fixture, and record the migration — **in one commit**.
  Never silently.

## How it is enforced

- `Step` lives in exactly one module (`NFR-M3`).
- `step.test.ts` locks the exact top-level key set, so **any** shape change — even an
  additive one — is a visible diff someone must approve.
- `AUX_KINDS` / `EDGE_KINDS` are closed unions, so a missing panel or a bad edge kind
  is a compile error.
- The golden trace fails on any change to the serialised shape.
- `applyListDelta` **throws** on an unknown structure field rather than replaying a
  delta it does not understand.

## Deliberately deferred

- The concrete shapes for `aux` kinds other than "none": the fields exist
  (`values`, `visited`, `frames`, `comparisons`) but only the list has been exercised
  so far. They will be added as the stack, heap, BST and graph land — additively.
- Whether `highlight` should carry the pointer identity separately from `edges`.
- Worker message types (`GenerateRequest` / `GenerateResponse`), derived from this
  contract when the worker is added.

## Addendum — v1.3 (`pointers`)

`AuxKind = "pointers"` plus `AuxState.pointers` were added to support the
standard three-pointer linked-list `reverse` animation. A pointer variable is
neither a node nor an edge, so it gets its own optional channel:

```ts
type AuxPointer = { role: 'prev' | 'current' | 'next'; id: NodeId | null }
```

`null` is meaningful (no previous node yet / past the last node). The list
renderer draws each role as a badge over the node it names, and the auxiliary
pane lists the same variables. The top-level `Step` key set is unchanged; the
shape-lock test still sees exactly the v1 keys.

## Addendum — v1.4 (`milestone`)

`Step.milestone?: string` marks a composed-trace phase boundary (for example
`"heap-built"`). It does not change the structure; it tells the player to pause
ON that step and tells the visible narration panel to render it as a warning.
The build and extract phases stay independently pure generators; the boundary is
inserted by `app/runOperation.ts` where the composition happens.
