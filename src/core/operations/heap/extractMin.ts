/**
 * `heapExtractMin` — binary min-heap operation generator (sift-down).
 *
 * WHAT IT DOES
 *   Reads the root (the minimum), removes the last array entry, promotes that entry
 *   to the root and sifts it down: at each index it compares the slot with **both**
 *   children `2i+1` and `2i+2` and swaps with the one that comes first, until the
 *   heap property holds. The comparison with the sibling that is *not* chosen is
 *   emitted too, because skipping it is the mistake learners make (A2 §4.3).
 *
 *   The removed root travels in the `removed` delta channel and the promoted entry
 *   travels in `moved`, so stepping backwards restores exactly the array that was
 *   there before — no reconstruction of the heap from a picture.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `heapExtractMin`:
 *
 *     3   `root ← heap[0]`                 read the minimum (O(1))
 *     4   `last ← heap.removeLast()`
 *     6   `heap[0] ← last`                promote the last entry
 *    11   the comparison with a child     (sift-down test)
 *    13   `swap(heap[i], heap[best])`      the sift-down swap
 *    15   `return root`
 *
 * HOW IT IS SHARED
 *   The sift plan comes from the model's `siftDownPlan`, so this generator, the
 *   untraced `extractRoot` oracle and the trace-store replay all perform the same
 *   swaps. `extractMax` is the mirror image with `kind: "max"`; the two files are
 *   deliberately parallel so the min/max symmetry is visible.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: O(log n) — the height of the complete tree. Total on an empty heap: it
 *   reports "nothing to extract" rather than throwing (ADR-7).
 */

import {
  applyHeapDelta,
  heapValues,
  siftDownPlan,
  type BinaryHeap,
  type HeapEntry,
} from '../../model/binaryHeap'
import type { GenerateSummary, Step } from '../../trace/step'
import { traceHeapSift } from './siftTrace'

export const OPERATION_ID = 'heapExtractMin'

export type HeapExtractResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinaryHeap
  /** The entry removed from the root, or `null` when the heap was empty. */
  extracted: HeapEntry | null
}

export function heapExtractMin(initial: BinaryHeap): HeapExtractResult {
  const steps: Step[] = []
  let state = initial
  /** Values already extracted by this run, shown in the auxiliary output row. */
  const output: (string | number)[] = []

  /**
   * Apply a delta, then record the step that produced it. Every edit goes through
   * here, so `state` and the recorded `aux.values` can never disagree.
   */
  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    nodes: string[],
    active: string | null,
    comparisons: number,
  ): void => {
    state = applyHeapDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight: {
        nodes,
        ...(active === null ? {} : { active }),
        edges: [],
      },
      delta,
      aux: {
        kind: 'heap',
        values: heapValues(state),
        output: [...output],
        comparisons,
      },
    })
  }

  // line 2 — the total empty case: report, do not throw.
  if (state.entries.length === 0) {
    record(
      2,
      'The heap is empty, so there is no minimum to extract.',
      {},
      [],
      null,
      0,
    )
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion: 'Extract-min on an empty heap: nothing to extract.',
      },
      finalState: state,
      extracted: null,
    }
  }

  const root = state.entries[0]

  // line 3 — read the root. Reading does not restructure anything.
  record(
    3,
    `The minimum is at the root of the array: slot 0 holds ${String(root.value)}. Reading it is O(1).`,
    {},
    [root.id],
    root.id,
    0,
  )

  // The extracted value is the operation's OUTPUT. Show it before the array is
  // reorganised, so the answer is visible while the sift-down runs.
  output.push(root.value)
  record(
    3,
    `Extract-min: ${String(root.value)} is the output. Set it aside before the heap is restructured.`,
    {},
    [root.id],
    root.id,
    0,
  )

  // line 4 — the only entry: removing it empties the heap, so there is no sift.
  if (state.entries.length === 1) {
    record(
      4,
      `The root was the heap's only entry, so the heap is now empty.`,
      { removed: [root.id] },
      [],
      null,
      0,
    )
    record(
      15,
      `Extracted ${String(root.value)} in O(1) for this case.`,
      {},
      [],
      null,
      0,
    )
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion: `Extracted the only entry, ${String(root.value)}.`,
      },
      finalState: state,
      extracted: root,
    }
  }

  const last = state.entries[state.entries.length - 1]

  record(
    4,
    `Take the last array entry (${String(last.value)} at slot ${state.entries.length - 1}) out of its slot. Promoting the last entry is what keeps the array complete, so the tree shape stays valid.`,
    {},
    [last.id, root.id],
    last.id,
    0,
  )

  // line 6 — promote the last entry to the root and retire the old root in one
  // delta: `moved` reorders the surviving entry, `removed` drops the extracted one.
  const promoteDelta: Step['delta'] = {
    moved: [{ id: last.id, to: 0 }],
    removed: [root.id],
  }
  record(
    6,
    `Move ${String(last.value)} to slot 0 and remove ${String(root.value)}. The array is one entry shorter and is still a complete tree.`,
    promoteDelta,
    [last.id],
    last.id,
    0,
  )

  // lines 8-14 — sift the promoted entry down until the heap property holds. The
  // plan is computed on the promoted array, so its indices are the real slots.
  const sift = traceHeapSift({
    heap: state,
    events: siftDownPlan(state, 0, state.entries.length),
    operation: OPERATION_ID,
    compareLine: 11,
    swapLine: 13,
    startIndex: steps.length,
    comparisons: 0,
    preferred: 'smaller',
    output: [...output],
  })
  steps.push(...sift.steps)
  state = sift.state

  record(
    15,
    `Extracted ${String(root.value)}. Sift-down cost O(log n) = ${sift.comparisons} comparison(s).`,
    {},
    [],
    null,
    sift.comparisons,
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: sift.comparisons,
      conclusion: `Extracted the minimum ${String(root.value)} and restored the heap in O(log n) = ${sift.comparisons} comparison(s).`,
    },
    finalState: state,
    extracted: root,
  }
}
