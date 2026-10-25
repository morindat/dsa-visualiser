/**
 * `bstInsert` — BST operation generator.
 *
 * WHAT IT DOES
 *   Insert a value by walking from the root, then splicing a new leaf onto the
 *   null child the walk stopped at. The trace makes three things visible that a
 *   textbook one-liner hides:
 *
 *   - the walk *is* the height, so the number of comparison steps is the O(h) cost
 *     (O(log n) balanced, O(n) for the degenerate preset);
 *   - the new node is created only once its parent slot is known, so a duplicate
 *     never leaves a floating node behind;
 *   - a duplicate is reported in a step of its own rather than dropped silently,
 *     because "nothing happened" is a result the learner has to be told.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `bstInsert`:
 *
 *     3      `return new Node(value)`   the tree was empty: the node is the root
 *     6      `value < current.value`    compare, go left
 *     8      `current.left ← new Node(value)`  create and link on the left
 *    11      `value > current.value`    compare, go right
 *    13      `current.right ← new Node(value)` create and link on the right
 *    16      `else`                     equal: duplicate
 *    17      `return root`              duplicate ignored, tree unchanged
 *
 * HOW IT IS SHARED
 *   Pure `(structure, request) -> { trace, summary, finalState }`. Each step's
 *   delta is applied with `applyBstDelta`, the same reducer the trace store uses,
 *   so stepping the UI and replaying the trace from a checkpoint produce identical
 *   trees. The result is cross-checked against the model's untraced `insertValue`
 *   in the tests (NFR-C1).
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; no randomness, no clock, so the
 *   same input always produces a byte-identical trace (ADR-2, NFR-C2, NFR-M2).
 *   Cost shown: O(h) — no `aux`, because an iterative insert keeps O(1) state.
 */

import {
  ROOT_POINTER,
  applyBstDelta,
  bstNodeById,
  nextBstNodeId,
  type BinarySearchTree,
} from '../../model/bst'
import { compareValues, type StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'bstInsert'

export type BstInsertRequest = { value: StructureValue }

export type BstInsertResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** The id of the node that now holds `value`, or `null` if it was a duplicate. */
  insertedId: NodeId | null
  /** `true` when the value was already present and nothing changed. */
  duplicate: boolean
}

export function bstInsert(
  initial: BinarySearchTree,
  request: BstInsertRequest,
): BstInsertResult {
  const steps: Step[] = []
  const path: NodeId[] = []
  const pathEdges: TraceEdge[] = []
  let comparisons = 0
  let insertedId: NodeId | null = null
  let duplicate = false

  let state = initial
  const newId = nextBstNodeId(initial)

  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    active: NodeId | null,
  ): void => {
    state = applyBstDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight: {
        nodes: [...path],
        ...(active === null ? {} : { active }),
        edges: [...pathEdges],
      },
      delta,
      // No `aux`: an iterative insert keeps O(1) auxiliary state.
    })
  }

  // ---------------------------------------------------------------- empty tree
  if (state.root === null) {
    path.push(newId)
    insertedId = newId
    record(
      3,
      `The tree is empty, so ${String(request.value)} becomes the root. Insert cost O(h) with h = 0.`,
      {
        created: [{ id: newId, value: request.value }],
        updated: [{ id: ROOT_POINTER, from: null, to: newId }],
      },
      newId,
    )

    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons,
        conclusion: `Inserted ${String(request.value)} as the root of an empty tree in O(1) for this case.`,
      },
      finalState: state,
      insertedId,
      duplicate,
    }
  }

  // -------------------------------------------------------------- non-empty tree
  let current: NodeId | null = state.root

  while (current !== null) {
    const node = bstNodeById(state, current)
    /* istanbul ignore if — the walk only ever follows ids that resolve. */
    if (node === undefined) break

    path.push(current)
    comparisons += 1

    const order = compareValues(request.value, node.value)

    if (order === 0) {
      // Duplicate: line 16 is the test, line 17 the explicit no-op return.
      record(
        16,
        `Compare ${String(request.value)} with ${String(node.value)} at ${current}: they are equal.`,
        {},
        current,
      )
      duplicate = true
      record(
        17,
        `${String(request.value)} is already in the tree, so nothing changes. Duplicates are ignored, not inserted twice.`,
        {},
        current,
      )
      break
    }

    if (order < 0) {
      record(
        6,
        `Compare ${String(request.value)} with ${String(node.value)} at ${current}: ${String(
          request.value,
        )} is smaller, so the walk goes left.`,
        {},
        current,
      )

      if (node.left === null) {
        // Create AND link in one step: the node is only ever created once its
        // slot is known, so a failed insert cannot leave a floating node.
        path.push(newId)
        pathEdges.push({ from: current, to: newId, kind: 'left' })
        insertedId = newId
        record(
          8,
          `The left child of ${current} is null, so create a node holding ${String(
            request.value,
          )} and link it as the left child.`,
          {
            created: [{ id: newId, value: request.value }],
            linked: [{ from: current, to: newId, kind: 'left' }],
          },
          newId,
        )
        break
      }

      pathEdges.push({ from: current, to: node.left, kind: 'left' })
      current = node.left
    } else {
      record(
        11,
        `Compare ${String(request.value)} with ${String(node.value)} at ${current}: ${String(
          request.value,
        )} is larger, so the walk goes right.`,
        {},
        current,
      )

      if (node.right === null) {
        path.push(newId)
        pathEdges.push({ from: current, to: newId, kind: 'right' })
        insertedId = newId
        record(
          13,
          `The right child of ${current} is null, so create a node holding ${String(
            request.value,
          )} and link it as the right child.`,
          {
            created: [{ id: newId, value: request.value }],
            linked: [{ from: current, to: newId, kind: 'right' }],
          },
          newId,
        )
        break
      }

      pathEdges.push({ from: current, to: node.right, kind: 'right' })
      current = node.right
    }
  }

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: duplicate
        ? `${String(request.value)} is already present; the walk compared ${comparisons} node(s) and changed nothing.`
        : `Inserted ${String(request.value)} at ${insertedId} after ${comparisons} comparison(s) — O(h).`,
    },
    finalState: state,
    insertedId,
    duplicate,
  }
}
