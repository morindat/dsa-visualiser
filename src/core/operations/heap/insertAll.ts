/**
 * `heapInsertAll` — build a heap by inserting a dataset **one value at a time**.
 *
 * WHAT IT DOES
 *   Starts from an empty heap and runs the pure `heapInsert` generator once per
 *   value, joining the per-insert traces. Each insert appends at the next free
 *   slot and sifts up, so the trace shows the array and the tree growing together,
 *   one value and one sift at a time.
 *
 * WHY THIS FILE EXISTS
 *   The comparison this structure teaches — n inserts (O(n log n)) versus one
 *   bottom-up build-heap (O(n)) — only lands if the n-insert path is visible. This
 *   composer is that path, built out of the single-insert algorithm rather than a
 *   second implementation.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic. Every step's
 *   `operation` is `heapInsert`, so the code panel shows the sift-up listing for
 *   the whole build (ADR-6, NFR-C2).
 */

import {
  heapFromValues,
  type BinaryHeap,
  type HeapKind,
} from '../../model/binaryHeap'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, Step } from '../../trace/step'
import { concatSteps, withProgress } from '../compose'
import { heapInsert } from './insert'

export const OPERATION_ID = 'heapInsertAll'

export type HeapInsertAllResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinaryHeap
  /** Values inserted, in order. */
  inserted: StructureValue[]
}

export function heapInsertAll(
  values: readonly StructureValue[],
  kind: HeapKind,
): HeapInsertAllResult {
  const parts: Step[][] = []
  const inserted: StructureValue[] = []
  let comparisons = 0
  let heap = heapFromValues([], kind)

  values.forEach((value, position) => {
    const result = heapInsert(heap, { value })
    comparisons += result.summary.comparisons
    inserted.push(value)
    parts.push(
      withProgress(
        result.trace,
        () =>
          `Inserting ${String(value)} (${position + 1} of ${values.length}): `,
      ),
    )
    heap = result.finalState
  })

  const trace = concatSteps(parts)

  return {
    trace,
    summary: {
      steps: trace.length,
      comparisons,
      conclusion:
        values.length === 0
          ? 'The dataset was empty, so the heap stayed empty.'
          : `Inserted ${values.length} value(s) one at a time with sift-up — O(n log n) for n inserts, the comparison case for build-heap.`,
    },
    finalState: heap,
    inserted,
  }
}
