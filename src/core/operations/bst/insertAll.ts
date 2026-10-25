/**
 * `bstInsertAll` — build a BST by inserting a dataset **one value at a time**.
 *
 * WHAT IT DOES
 *   Starts from an empty tree and runs the pure `bstInsert` generator once per
 *   value, in the given order, joining the per-insert traces. The result is the
 *   same tree a batch build would produce, but the trace now *shows the build*:
 *   step through it and the tree grows a node at a time, each insert highlighted
 *   against the insert pseudocode.
 *
 * WHY THIS FILE EXISTS
 *   A dataset handed to the visualiser should be inserted value by value, not
 *   materialised in one invisible jump — otherwise the learner sees the finished
 *   tree and never the construction. This is a composition of `bstInsert`, so the
 *   single-insert algorithm stays the one authored, tested unit.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic. Every emitted
 *   step's `operation` is `bstInsert`, so the code panel keeps showing the insert
 *   listing throughout the build (ADR-6, NFR-C2).
 */

import { bstHeight, type BinarySearchTree } from '../../model/bst'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, Step } from '../../trace/step'
import { concatSteps, withProgress } from '../compose'
import { bstInsert } from './insert'

export const OPERATION_ID = 'bstInsertAll'

export type BstInsertAllResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** Values inserted, in order. */
  inserted: StructureValue[]
  /** Values skipped because the key was already present (A1 ER4). */
  skipped: StructureValue[]
}

export function bstInsertAll(
  values: readonly StructureValue[],
): BstInsertAllResult {
  const parts: Step[][] = []
  const inserted: StructureValue[] = []
  const skipped: StructureValue[] = []
  let comparisons = 0
  let tree: BinarySearchTree = { nodes: [], root: null }

  values.forEach((value, position) => {
    const result = bstInsert(tree, { value })
    comparisons += result.summary.comparisons
    if (result.duplicate) skipped.push(value)
    else inserted.push(value)

    parts.push(
      withProgress(
        result.trace,
        () =>
          `Inserting ${String(value)} (${position + 1} of ${values.length}): `,
      ),
    )
    tree = result.finalState
  })

  const trace = concatSteps(parts)

  return {
    trace,
    summary: {
      steps: trace.length,
      comparisons,
      conclusion:
        values.length === 0
          ? 'The dataset was empty, so the tree stayed empty.'
          : `Inserted ${inserted.length} of ${values.length} key(s) one at a time${
              skipped.length > 0
                ? ` (${skipped.length} duplicate(s) skipped)`
                : ''
            }; the tree has ${tree.nodes.length} node(s) and height ${bstHeight(tree)}.`,
    },
    finalState: tree,
    inserted,
    skipped,
  }
}
