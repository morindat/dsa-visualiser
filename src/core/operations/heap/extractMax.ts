/**
 * `heapExtractMax` — binary max-heap operation generator (sift-down).
 *
 * WHAT IT DOES
 *   The mirror image of `heapExtractMin`: read the root (now the maximum), promote
 *   the last array entry to the root and sift it down, comparing with both children
 *   and swapping with the one that comes *later* in the order. Nothing in the
 *   mechanics changes — only the direction read by `heapComesBefore` — which is the
 *   point of shipping both: the data structure is identical, the comparator is not.
 *
 *   The two files are deliberately parallel, so reading them side by side shows
 *   exactly what "min-heap" and "max-heap" mean and what they do not change.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `heapExtractMax`:
 *
 *     3   `root ← heap[0]`                 read the maximum (O(1))
 *     4   `last ← heap.removeLast()`
 *     6   `heap[0] ← last`                promote the last entry
 *    11   the comparison with a child     (sift-down test)
 *    13   `swap(heap[i], heap[best])`      the sift-down swap
 *    15   `return root`
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: O(log n). Total on an empty heap: reports "nothing to extract".
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

export const OPERATION_ID = 'heapExtractMax'

export type HeapExtractMaxResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinaryHeap
  /** The entry removed from the root, or `null` when the heap was empty. */
  extracted: HeapEntry | null
}

export function heapExtractMax(initial: BinaryHeap): HeapExtractMaxResult {
  const steps: Step[] = []
  let state = initial
  /** Values already extracted by this run, shown in the auxiliary output row. */
  const output: (string | number)[] = []

  /** Apply a delta, then record the step that produced it (see extractMin.ts). */
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

  if (state.entries.length === 0) {
    record(
      2,
      'The heap is empty, so there is no maximum to extract.',
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
        conclusion: 'Extract-max on an empty heap: nothing to extract.',
      },
      finalState: state,
      extracted: null,
    }
  }

  const root = state.entries[0]

  record(
    3,
    `The maximum is at the root of the array: slot 0 holds ${String(root.value)}. Reading it is O(1).`,
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
    `Extract-max: ${String(root.value)} is the output. Set it aside before the heap is restructured.`,
    {},
    [root.id],
    root.id,
    0,
  )

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
    `Take the last array entry (${String(last.value)} at slot ${state.entries.length - 1}) out of its slot. Promoting the last entry keeps the array complete, so the tree shape stays valid.`,
    {},
    [last.id, root.id],
    last.id,
    0,
  )

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

  const sift = traceHeapSift({
    heap: state,
    events: siftDownPlan(state, 0, state.entries.length),
    operation: OPERATION_ID,
    compareLine: 11,
    swapLine: 13,
    startIndex: steps.length,
    comparisons: 0,
    preferred: 'larger',
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
      conclusion: `Extracted the maximum ${String(root.value)} and restored the heap in O(log n) = ${sift.comparisons} comparison(s).`,
    },
    finalState: state,
    extracted: root,
  }
}
