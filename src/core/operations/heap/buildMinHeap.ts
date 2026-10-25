/**
 * `buildMinHeap` — binary min-heap operation generator (bottom-up heapify).
 *
 * WHAT IT DOES
 *   Turns an arbitrary array into a min-heap in O(n) by sifting down every internal
 *   node, from the last one (`floor(n/2) - 1`) back to the root. Leaves are already
 *   valid one-element heaps, which is why the loop starts halfway. Each sift is a
 *   sequence of comparison and swap steps, so the O(n) total can be counted out and
 *   compared on one screen with the O(n log n) of n successive `insert`s — the
 *   structure's teaching centrepiece (A2 §4.3).
 *
 *   The input array is treated as raw data: the operation *fixes* the direction to
 *   min-heap, so a caller does not have to label the model correctly first.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `heapBuildMin`:
 *
 *     2   the `i` loop, from the last internal node down to 0
 *     7   the child comparison   (sift-down test)
 *     9   `swap(array[j], array[best])` (sift-down swap)
 *    11   `return array`
 *
 * HOW IT IS SHARED
 *   Reuses `siftDownPlan` from the model and `traceHeapSift` from this folder, so
 *   the instrumented build and the untraced `heapifyInPlace` oracle perform exactly
 *   the same swaps.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: O(n) time, O(1) auxiliary space beyond the array itself.
 */

import {
  applyHeapDelta,
  heapValues,
  siftDownPlan,
  type BinaryHeap,
} from '../../model/binaryHeap'
import type { GenerateSummary, NodeId, Step } from '../../trace/step'
import { traceHeapSift } from './siftTrace'

export const OPERATION_ID = 'heapBuildMin'

export type HeapBuildResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinaryHeap
}

export function heapBuildMin(initial: BinaryHeap): HeapBuildResult {
  // The operation owns the direction: the input is raw data, the output is a
  // min-heap. Copying the entries keeps `initial` untouched.
  let state: BinaryHeap = {
    entries: initial.entries.map((entry) => ({ ...entry })),
    kind: 'min',
  }
  const steps: Step[] = []
  let comparisons = 0

  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    indices: number[],
    active: NodeId | null,
  ): void => {
    state = applyHeapDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight: {
        nodes: active === null ? [] : [active],
        ...(active === null ? {} : { active }),
        edges: [],
      },
      delta,
      aux: {
        kind: 'heap',
        values: heapValues(state),
        indices,
        comparisons,
      },
    })
  }

  // A 0- or 1-entry array is already a heap: `floor(n/2) - 1` is negative, so the
  // loop body would never run. Say so rather than showing an empty trace.
  if (state.entries.length <= 1) {
    record(
      2,
      'An array of 0 or 1 entries already satisfies the heap property, so there is nothing to heapify.',
      {},
      [],
      null,
    )
    record(11, 'Built a min-heap in Θ(1) for this input.', {}, [], null)
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion:
          'The array was already a min-heap; 0 comparisons were needed.',
      },
      finalState: state,
    }
  }

  // line 2 — from the last internal node up to the root. Leaves (the second half
  // of the array) are skipped because each is already a valid one-element heap.
  for (let i = Math.floor(state.entries.length / 2) - 1; i >= 0; i -= 1) {
    record(
      2,
      `Heapify the subtree rooted at slot ${i}. Every deeper subtree is already a valid heap, so one sift-down is enough.`,
      {},
      [i],
      state.entries[i].id,
    )

    const sift = traceHeapSift({
      heap: state,
      events: siftDownPlan(state, i, state.entries.length),
      operation: OPERATION_ID,
      compareLine: 7,
      swapLine: 9,
      startIndex: steps.length,
      comparisons,
      preferred: 'smaller',
    })
    steps.push(...sift.steps)
    state = sift.state
    comparisons = sift.comparisons
  }

  record(
    11,
    `The array is now a min-heap. Bottom-up heapify is O(n), not O(n log n): most nodes sit near the leaves and sift only a little.`,
    {},
    [],
    null,
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: `Built a min-heap from ${state.entries.length} entries in O(n) = ${comparisons} comparison(s). For comparison, ${state.entries.length} successive inserts would cost O(n log n).`,
    },
    finalState: state,
  }
}
