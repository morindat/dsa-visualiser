/**
 * `buildMaxHeap` — binary max-heap operation generator (bottom-up heapify).
 *
 * WHAT IT DOES
 *   The mirror image of `buildMinHeap`: sift down every internal node, from the
 *   last one back to the root, choosing the *larger* child at each step, until the
 *   array is a max-heap. The mechanics are identical; only the direction read by
 *   `heapComesBefore` changes. Read beside `buildMinHeap`, the pair shows that a
 *   heap is defined by its comparison, not by its storage.
 *
 *   The input array is raw data and the operation fixes the direction to max-heap.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `heapBuildMax`:
 *
 *     2   the `i` loop, from the last internal node down to 0
 *     7   the child comparison   (sift-down test)
 *     9   `swap(array[j], array[best])` (sift-down swap)
 *    11   `return array`
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: O(n) time. Bottom-up heapify is the reason, and the why is stated in
 *   the final step rather than asserted.
 */

import {
  applyHeapDelta,
  heapValues,
  siftDownPlan,
  type BinaryHeap,
} from '../../model/binaryHeap'
import type { GenerateSummary, NodeId, Step } from '../../trace/step'
import { traceHeapSift } from './siftTrace'

export const OPERATION_ID = 'heapBuildMax'

export type HeapBuildMaxResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinaryHeap
}

export function heapBuildMax(initial: BinaryHeap): HeapBuildMaxResult {
  let state: BinaryHeap = {
    entries: initial.entries.map((entry) => ({ ...entry })),
    kind: 'max',
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

  if (state.entries.length <= 1) {
    record(
      2,
      'An array of 0 or 1 entries already satisfies the heap property, so there is nothing to heapify.',
      {},
      [],
      null,
    )
    record(11, 'Built a max-heap in Θ(1) for this input.', {}, [], null)
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion:
          'The array was already a max-heap; 0 comparisons were needed.',
      },
      finalState: state,
    }
  }

  for (let i = Math.floor(state.entries.length / 2) - 1; i >= 0; i -= 1) {
    record(
      2,
      `Heapify the subtree rooted at slot ${i}. Every deeper subtree is already a valid max-heap, so one sift-down is enough.`,
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
      preferred: 'larger',
    })
    steps.push(...sift.steps)
    state = sift.state
    comparisons = sift.comparisons
  }

  record(
    11,
    `The array is now a max-heap. Bottom-up heapify is O(n), not O(n log n): most nodes sit near the leaves and sift only a little.`,
    {},
    [],
    null,
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: `Built a max-heap from ${state.entries.length} entries in O(n) = ${comparisons} comparison(s). For comparison, ${state.entries.length} successive inserts would cost O(n log n).`,
    },
    finalState: state,
  }
}
