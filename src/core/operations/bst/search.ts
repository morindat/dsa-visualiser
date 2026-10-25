/**
 * `search` — BST operation generator.
 *
 * WHAT IT DOES
 *   Turns "find `value` in this tree" into an ordered `Step[]`: one step per node
 *   examined, one per descent, and a terminal step that distinguishes the two ways
 *   the walk can end — *found*, or *reached a null pointer*. A failed search is
 *   therefore taught as "the walk fell off the tree here", not returned as a bare
 *   `false` (A2 §4.4).
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `bstSearch`; the
 *   numbers below are 1-based line numbers into `PSEUDOCODE_LISTINGS.bstSearch`:
 *
 *     4      `if value = current.value`   the equality comparison
 *     5      `return current`             found
 *     6      `if value < current.value`   go left
 *     8      `else`                       go right
 *     7 / 9  descend                      the hop itself
 *    10      `return null`                fell off the tree: not found
 *
 * HOW IT IS SHARED
 *   Pure `(structure, request) -> { trace, summary, finalState }`. The generator
 *   never mutates `initial` and never emits a structural delta: a search changes
 *   nothing, so `finalState` is the tree it was given. It compares with the model's
 *   shared order (`compareValues`), so the instrumented walk and the untraced
 *   reference `searchValue` cannot disagree.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; no randomness, no clock, so the
 *   same input always produces a byte-identical trace (ADR-2, NFR-C2, NFR-M2).
 *   Cost shown: O(h) comparisons — O(log n) balanced, O(n) degenerate.
 */

import {
  applyBstDelta,
  bstNodeById,
  type BinarySearchTree,
} from '../../model/bst'
import { compareValues, type StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'bstSearch'

export type BstSearchRequest = { value: StructureValue }

export type BstSearchResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** The id of the matching node, or `null` when the value is absent. */
  foundId: NodeId | null
  /** The nodes examined, root-first — the walk as data, for tests and the guide. */
  path: NodeId[]
}

export function bstSearch(
  initial: BinarySearchTree,
  request: BstSearchRequest,
): BstSearchResult {
  const steps: Step[] = []
  const path: NodeId[] = []
  const pathEdges: TraceEdge[] = []
  let comparisons = 0
  let foundId: NodeId | null = null

  // A search changes nothing, so every step carries an empty delta and the state
  // is the tree it was given. `applyBstDelta` still runs at the end so the
  // returned `finalState` is a fresh copy, exactly as the mutating generators do.
  const state = initial

  const record = (
    codeLine: number,
    narration: string,
    active: NodeId | null,
  ): void => {
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
      delta: {},
      // No `aux`: an iterative BST walk keeps O(1) auxiliary state, and the path
      // is already visible in `highlight`. A container here would be invented.
    })
  }

  let current: NodeId | null = state.root

  while (current !== null) {
    const node = bstNodeById(state, current)
    /* istanbul ignore if — the walk only ever follows ids that resolve. */
    if (node === undefined) break

    path.push(current)
    comparisons += 1

    const order = compareValues(request.value, node.value)

    if (order === 0) {
      // Equality is line 4; the successful return is line 5.
      record(
        4,
        `Compare ${String(request.value)} with ${String(node.value)} at ${current}: equal.`,
        current,
      )
      foundId = current
      record(
        5,
        `Found ${String(request.value)} at ${current} after ${comparisons} comparison(s).`,
        current,
      )
      break
    }

    if (order < 0) {
      record(
        6,
        `Compare ${String(request.value)} with ${String(node.value)} at ${current}: ${String(
          request.value,
        )} is smaller, so the search goes left.`,
        current,
      )
      record(
        7,
        `Descend from ${current} to its left child${
          node.left === null ? ' — which is null.' : '.'
        }`,
        current,
      )
      if (node.left !== null)
        pathEdges.push({ from: current, to: node.left, kind: 'left' })
      current = node.left
    } else {
      record(
        8,
        `Compare ${String(request.value)} with ${String(node.value)} at ${current}: ${String(
          request.value,
        )} is larger, so the search goes right.`,
        current,
      )
      record(
        9,
        `Descend from ${current} to its right child${
          node.right === null ? ' — which is null.' : '.'
        }`,
        current,
      )
      if (node.right !== null) {
        pathEdges.push({ from: current, to: node.right, kind: 'right' })
      }
      current = node.right
    }
  }

  if (foundId === null) {
    // The last descent already highlighted the null; this step states the outcome
    // at the line that produces it, so the trace ends with a conclusion.
    record(
      10,
      `Reached a null pointer, so ${String(request.value)} is not in the tree. This is a failed search, not an error.`,
      null,
    )
  }

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion:
        foundId === null
          ? `${String(request.value)} is not in the tree; the walk examined ${comparisons} node(s) and stopped at a null pointer.`
          : `Found ${String(request.value)} at ${foundId} in O(h) = ${comparisons} comparison(s).`,
    },
    finalState: applyBstDelta(state, {}),
    foundId,
    path,
  }
}
