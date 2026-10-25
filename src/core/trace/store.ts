/**
 * Trace store — the delta log with periodic checkpoints (A2 §4.8, ADR-3).
 *
 * WHAT GOES HERE
 *   A generic store over any structure `S`:
 *     - the initial state, materialised once;
 *     - one small delta per step (what was created / linked / unlinked / updated);
 *     - a checkpoint every k steps (default k = 25).
 *   `reconstruct(i)` returns the state after step `i` by starting at the nearest
 *   checkpoint at or before `i` and replaying at most k-1 deltas.
 *
 * WHY THIS FILE EXISTS
 *   A `Step` is snapshot-shaped for its readers, but storing s full snapshots of an
 *   O(n) structure costs O(ns) — for a balanced BST that is O(n² log n), which is
 *   not acceptable at the largest supported input. The delta log stores O(1) per
 *   step, giving O(s + (s/k)·n) overall, and displaying any index costs O(k)
 *   whatever i is — so scrubbing to the last step is as cheap as stepping once.
 *
 *   It is generic (not list-specific) because the *structure* owns its reducer:
 *   the store only knows how to replay deltas, never what they mean.
 *
 * RULES
 *   No React, D3, `render/`, `ui/` or DOM (ADR-2, NFR-M2). `reconstruct` always
 *   returns a fresh copy, so a caller can never corrupt a checkpoint.
 */

import type { Step, StructureDelta } from './step'

/** Applies one delta to a state, returning a new state (never mutating). */
export type StructureReducer<S> = (state: S, delta: StructureDelta) => S

export type TraceStore<S> = {
  /** Number of steps in the trace. */
  readonly length: number
  /** The structure after step `index`; `reconstruct(-1)` gives the initial state. */
  reconstruct(index: number): S
}

export type TraceStoreOptions = {
  /** A materialised checkpoint is kept every this many steps. Default 25. */
  checkpointInterval?: number
}

export function createTraceStore<S>(
  initial: S,
  steps: readonly Step[],
  reduce: StructureReducer<S>,
  options: TraceStoreOptions = {},
): TraceStore<S> {
  const checkpointInterval = Math.max(1, options.checkpointInterval ?? 25)

  // Checkpoint at index i = the state AFTER step i. Index -1 is the initial state.
  const checkpoints: { index: number; state: S }[] = [
    { index: -1, state: clone(initial) },
  ]
  let state = clone(initial)
  steps.forEach((step, index) => {
    state = reduce(state, step.delta)
    if ((index + 1) % checkpointInterval === 0) {
      checkpoints.push({ index, state: clone(state) })
    }
  })

  const reconstruct = (index: number): S => {
    const target = Math.max(-1, Math.min(index, steps.length - 1))

    let base = checkpoints[0]
    for (let i = checkpoints.length - 1; i >= 0; i -= 1) {
      if (checkpoints[i].index <= target) {
        base = checkpoints[i]
        break
      }
    }

    let replayed = clone(base.state)
    for (let i = base.index + 1; i <= target; i += 1) {
      replayed = reduce(replayed, steps[i].delta)
    }
    return replayed
  }

  return { length: steps.length, reconstruct }
}

/** States are plain serialisable data by contract, so a deep copy is enough. */
function clone<S>(value: S): S {
  return structuredClone(value)
}
