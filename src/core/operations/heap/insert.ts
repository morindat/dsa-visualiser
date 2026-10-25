/**
 * `heapInsert` — binary heap operation generator (sift-up).
 *
 * WHAT IT DOES
 *   Appends the new value at the next free array slot, then sifts it up: compare it
 *   with its parent `floor((i-1)/2)` and swap while the heap property is violated.
 *   Each comparison and each swap is its own `Step`, so the O(log n) path from leaf
 *   to root is counted out rather than asserted.
 *
 *   The array slot and the tree position are the *same* index, so every step's
 *   `aux.indices` marks the identical pair of cells in the array rendering and in
 *   the tree rendering of the dual view (A2 §4.3).
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `heapInsert`:
 *
 *     2   `heap.append(new Entry(value))`   place at the next free slot
 *     6   the comparison with the parent    (sift-up test)
 *     7   `swap(heap[i], heap[parent])`     the sift-up swap
 *     9   `return heap`
 *
 * HOW IT IS SHARED
 *   The heap mechanics come from the model's `siftUpPlan`, so this generator, the
 *   untraced `insertValue` used as the test oracle, and the trace-store replay all
 *   agree on the same sequence of swaps. `state` is advanced through
 *   `applyHeapDelta`, never mutated.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: O(log n) comparisons/swaps, O(1) auxiliary space. Works for both
 *   `kind: "min"` and `kind: "max"` — the direction only changes the comparator.
 */

import {
  applyHeapDelta,
  heapValues,
  nextHeapEntryId,
  siftUpPlan,
  type BinaryHeap,
} from '../../model/binaryHeap'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step } from '../../trace/step'
import { traceHeapSift } from './siftTrace'

export const OPERATION_ID = 'heapInsert'

export type HeapInsertRequest = { value: StructureValue }

export type HeapInsertResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinaryHeap
  insertedId: NodeId
}

export function heapInsert(
  initial: BinaryHeap,
  request: HeapInsertRequest,
): HeapInsertResult {
  const preferred = initial.kind === 'min' ? 'smaller' : 'larger'
  const newId = nextHeapEntryId(initial)
  const slot = initial.entries.length

  // line 2 — append at the next free slot. Appending can only violate the heap
  // property along the root path, which is why one sift-up is enough.
  const appendDelta: Step['delta'] = {
    created: [{ id: newId, value: request.value }],
  }
  const appended = applyHeapDelta(initial, appendDelta)

  const steps: Step[] = [
    {
      index: 0,
      operation: OPERATION_ID,
      codeLine: 2,
      narration: `Append ${String(request.value)} at the next free array slot ${slot}. The array grew by one; the tree grew by one leaf.`,
      highlight: { nodes: [newId], active: newId, edges: [] },
      delta: appendDelta,
      aux: {
        kind: 'heap',
        values: heapValues(appended),
        indices: [slot],
        comparisons: 0,
      },
    },
  ]

  // lines 4-8 — sift up. The plan comes from the model, so the trace and the
  // untraced reference implementation cannot diverge.
  const sift = traceHeapSift({
    heap: appended,
    events: siftUpPlan(appended, slot),
    operation: OPERATION_ID,
    compareLine: 6,
    swapLine: 7,
    startIndex: 1,
    comparisons: 0,
    preferred,
  })
  steps.push(...sift.steps)

  // line 9 — the heap property holds again, so the operation is done.
  steps.push({
    index: steps.length,
    operation: OPERATION_ID,
    codeLine: 9,
    narration: `${String(request.value)} is in place. Insert cost O(log n): the sift-up touched ${sift.steps.length} slot(s) on the way to the root.`,
    highlight: { nodes: [newId], active: newId, edges: [] },
    delta: {},
    aux: {
      kind: 'heap',
      values: heapValues(sift.state),
      comparisons: sift.comparisons,
    },
  })

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: sift.comparisons,
      conclusion: `Inserted ${String(request.value)} at slot ${slot} and sifted up in O(log n) = ${sift.comparisons} comparison(s).`,
    },
    finalState: sift.state,
    insertedId: newId,
  }
}
