/**
 * Shared heap-sift instrumentation — the ONE place a `SiftEvent` becomes a `Step`.
 *
 * WHY THIS FILE EXISTS
 *   Five heap operations (`heapInsert`, `heapExtractMin`, `heapExtractMax`,
 *   `heapBuildMin`, `heapBuildMax`) all walk a sift plan and all have to turn the
 *   same two event kinds into steps: a comparison (no structural change) and a swap
 *   (a `moved` delta). If each generator built that delta itself, five copies of
 *   "swap slots `a` and `b`" could drift and the `moved` channel could be emitted
 *   inconsistently.
 *
 *   The model owns the heap mechanics (`siftUpPlan` / `siftDownPlan`); this module
 *   owns the *instrumentation* of those plans; the operation files own the
 *   pseudocode line map and the surrounding steps (append, promote, heapify loop).
 *   So it is a helper, not an operation: it has no catalogue record and no
 *   pseudocode listing of its own.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM (ADR-2, NFR-M2). Deterministic:
 *   the same plan always yields the same steps (NFR-C2).
 */

import {
  applyHeapDelta,
  heapValues,
  type BinaryHeap,
  type SiftEvent,
} from '../../model/binaryHeap'
import type { Step } from '../../trace/step'

export type HeapSiftTraceInput = {
  /** The heap at the moment the plan starts (the entrant is already in place). */
  heap: BinaryHeap
  /** Comparisons/swaps to replay, in order — from `siftUpPlan`/`siftDownPlan`. */
  events: readonly SiftEvent[]
  /** `OperationMeta.id` for every emitted step. */
  operation: string
  /** Pseudocode line to highlight for a comparison. */
  compareLine: number
  /** Pseudocode line to highlight for a swap. */
  swapLine: number
  /** `Step.index` for the first emitted step. */
  startIndex: number
  /** Running comparison count before the plan starts. */
  comparisons: number
  /** The word used in narration: `"smaller"` for a min-heap, `"larger"` for a max. */
  preferred: string
  /** Values already produced by an extraction, shown in the output row. */
  output?: (string | number)[]
}

export type HeapSiftTraceResult = {
  steps: Step[]
  state: BinaryHeap
  comparisons: number
}

/**
 * Replays a sift plan as steps, applying each swap through `applyHeapDelta` so the
 * returned `state` is exactly what a trace-store replay would produce.
 */
export function traceHeapSift(input: HeapSiftTraceInput): HeapSiftTraceResult {
  const steps: Step[] = []
  let state = input.heap
  let comparisons = input.comparisons

  for (const event of input.events) {
    if (event.kind === 'compare') {
      comparisons += 1
      const values = heapValues(state)
      const atEntry = state.entries[event.at]
      const againstEntry = state.entries[event.against]
      steps.push({
        index: input.startIndex + steps.length,
        operation: input.operation,
        codeLine: input.compareLine,
        narration: `Compare slot ${event.at} (${String(values[event.at])}) with slot ${event.against} (${String(values[event.against])}) — does the ${input.preferred} one belong above?`,
        highlight: {
          nodes: [atEntry.id, againstEntry.id],
          active: atEntry.id,
          edges: [{ from: againstEntry.id, to: atEntry.id, kind: 'index' }],
        },
        delta: {},
        aux: {
          kind: 'heap',
          values,
          // The array slot and the tree position are the same index: this is the
          // pair the dual rendering marks in both views at once.
          indices: [event.at, event.against],
          ...(input.output === undefined ? {} : { output: input.output }),
          comparisons,
        },
      })
      continue
    }

    // A swap is a positional move of two entries, expressed as one `moved` entry
    // per participant. `applyHeapDelta` looks each id up in the current array, so
    // replaying the two moves in order lands on the swapped array.
    const movedFrom = state.entries[event.a]
    const movedTo = state.entries[event.b]
    const delta: Step['delta'] = {
      moved: [
        { id: movedFrom.id, to: event.b },
        { id: movedTo.id, to: event.a },
      ],
    }
    state = applyHeapDelta(state, delta)

    steps.push({
      index: input.startIndex + steps.length,
      operation: input.operation,
      codeLine: input.swapLine,
      narration: `Swap slots ${event.a} and ${event.b}: ${movedFrom.id} moves to ${event.b} and ${movedTo.id} moves to ${event.a}, so the ${input.preferred} entry rises toward the root.`,
      highlight: {
        nodes: [movedFrom.id, movedTo.id],
        active: movedFrom.id,
        edges: [{ from: movedTo.id, to: movedFrom.id, kind: 'index' }],
      },
      delta,
      aux: {
        kind: 'heap',
        values: heapValues(state),
        indices: [event.a, event.b],
        ...(input.output === undefined ? {} : { output: input.output }),
        comparisons,
      },
    })
  }

  return { steps, state, comparisons }
}
