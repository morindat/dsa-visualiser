/**
 * `bstDelete` — BST operation generator.
 *
 * WHAT IT DOES
 *   Find the node, then apply one of the three standard cases, each shown as its
 *   own group of steps:
 *
 *     case 1  leaf          cut the parent pointer (or empty the root)
 *     case 2  one child     splice the only child into the node's place
 *     case 3  two children  copy the in-order successor's value up, then delete the
 *                           successor itself — which is case 1 or case 2 again
 *
 *   The two-children case is the one learners get wrong, so it is deliberately the
 *   longest sub-trace: the successor walk is visible, the value copy is its own
 *   step, and the removal of the *successor* (not the original node) is explicit.
 *   A delete of an absent value is also shown as a complete, honest walk that ends
 *   at a null pointer.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `bstDelete`:
 *
 *     3      the find loop test (compare)
 *     5      the descend
 *     7      not found: return, nothing changes
 *     9      case 1: replace the parent's child (or the root) with null
 *    10      case 1: remove the node
 *    11      case 1: return
 *    14      case 2: replace the parent's child (or the root) with the child
 *    15      case 2: remove the node
 *    16      case 2: return
 *    17      case 3: successor starts at current.right
 *    18      case 3: successor walk test (has a left child?)
 *    19      case 3: successor moves left
 *    20      case 3: copy the successor value up
 *    22      case 3: splice the successor's right child into its place
 *    23      case 3: remove the successor
 *    24      case 3: return
 *
 * HOW IT IS SHARED
 *   Pure `(structure, request) -> { trace, summary, finalState }`. Every edit is a
 *   delta (`unlinked`/`linked`/`updated`/`removed`) applied through
 *   `applyBstDelta`, so the generator and the trace store replay the same tree. The
 *   result is cross-checked against the model's untraced `deleteValue` (NFR-C1).
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: O(h) to find plus O(h) to reach the successor — still O(h) overall.
 */

import {
  ROOT_POINTER,
  applyBstDelta,
  bstNodeById,
  type BinarySearchTree,
  type BstNode,
} from '../../model/bst'
import { compareValues, type StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'bstDelete'

export type BstDeleteRequest = { value: StructureValue }

export type BstDeleteResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** `false` when the value was absent and the tree is unchanged. */
  deleted: boolean
  /** The node that actually left the tree (the successor in case 3). */
  removedId: NodeId | null
}

export function bstDelete(
  initial: BinarySearchTree,
  request: BstDeleteRequest,
): BstDeleteResult {
  const steps: Step[] = []
  const path: NodeId[] = []
  const pathEdges: TraceEdge[] = []
  let comparisons = 0

  let state = initial
  // Not initialised: every path that reaches the final return assigns it, and the
  // not-found path returns its own `removedId: null`.
  let removedId: NodeId | null

  /** Apply a delta, then record the step that produced it. Every edit goes here. */
  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    highlight: Step['highlight'],
  ): void => {
    state = applyBstDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight,
      delta,
      // No `aux`: the find walk and the successor walk are both iterative and
      // keep O(1) auxiliary state.
    })
  }

  const highlightPath = (active: NodeId | null): Step['highlight'] => ({
    nodes: [...path],
    ...(active === null ? {} : { active }),
    edges: [...pathEdges],
  })

  // ============================================================== 1. find the node
  // How the matched node hangs off its parent: `null` means the node is the root,
  // so the edit has to move `root` instead of a parent pointer.
  let parentLink: { id: NodeId; kind: 'left' | 'right' } | null = null
  let current: NodeId | null = state.root
  let found = false

  while (current !== null) {
    const node = bstNodeById(state, current)
    /* istanbul ignore if — the walk only ever follows ids that resolve. */
    if (node === undefined) break

    path.push(current)
    comparisons += 1
    const order = compareValues(request.value, node.value)

    record(
      3,
      `Compare ${String(request.value)} with ${String(node.value)} at ${current}.`,
      {},
      highlightPath(current),
    )

    if (order === 0) {
      found = true
      break
    }

    // Descend. `parentLink` describes how the *next* node is reached, which is
    // exactly what the unlink needs later.
    record(
      5,
      `${String(request.value)} is ${
        order < 0 ? 'smaller' : 'larger'
      }, so move ${order < 0 ? 'left' : 'right'} from ${current}.`,
      {},
      highlightPath(current),
    )
    if (order < 0) {
      parentLink = { id: current, kind: 'left' }
      if (node.left !== null)
        pathEdges.push({ from: current, to: node.left, kind: 'left' })
      current = node.left
    } else {
      parentLink = { id: current, kind: 'right' }
      if (node.right !== null) {
        pathEdges.push({ from: current, to: node.right, kind: 'right' })
      }
      current = node.right
    }
  }

  if (!found || current === null) {
    record(
      7,
      `${String(request.value)} is not in the tree, so delete changes nothing. This is a failed delete, not an error.`,
      {},
      highlightPath(null),
    )
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons,
        conclusion: `${String(request.value)} is not in the tree; the walk compared ${comparisons} node(s) and stopped at a null pointer.`,
      },
      finalState: state,
      deleted: false,
      removedId: null,
    }
  }

  const targetId = current
  const target = bstNodeById(state, targetId)
  /* istanbul ignore if — `current` was found by the walk above. */
  if (target === undefined) {
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons,
        conclusion: 'Internal error.',
      },
      finalState: state,
      deleted: false,
      removedId: null,
    }
  }

  // Snapshot the target's shape BEFORE any step mutates the tree; later steps must
  // not read a stale node object.
  const targetLeft = target.left
  const targetRight = target.right
  const targetValue = target.value

  const subtree = (
    nodes: NodeId[],
    active: NodeId | null,
  ): Step['highlight'] => ({
    nodes,
    ...(active === null ? {} : { active }),
    edges: [...pathEdges],
  })

  /**
   * Builds the delta that points the target's parent at `child` (or writes `root`
   * when the target is the root). Splitting this out keeps each case below to one
   * `record` call, which is what makes the three cases readable side by side.
   */
  const reattach = (child: NodeId | null): Step['delta'] => {
    if (parentLink === null) {
      return { updated: [{ id: ROOT_POINTER, from: targetId, to: child }] }
    }
    const delta: Step['delta'] = {
      unlinked: [{ from: parentLink.id, to: targetId, kind: parentLink.kind }],
    }
    if (child !== null) {
      delta.linked = [{ from: parentLink.id, to: child, kind: parentLink.kind }]
    }
    return delta
  }

  // ================================================================== case 1: leaf
  if (targetLeft === null && targetRight === null) {
    record(
      9,
      parentLink === null
        ? `${targetId} is the only node, so the tree becomes empty.`
        : `${targetId} is a leaf, so unlink it from ${parentLink.id}.`,
      reattach(null),
      subtree([targetId], parentLink?.id ?? null),
    )
    record(
      10,
      `Remove ${targetId} from the structure.`,
      { removed: [targetId] },
      subtree([], parentLink?.id ?? null),
    )
    removedId = targetId
    record(
      11,
      `Deleted leaf ${String(targetValue)}: O(h) to find it, then O(1) to cut it off.`,
      {},
      subtree([], parentLink?.id ?? null),
    )
  } else if (targetLeft === null || targetRight === null) {
    // ============================================================== case 2: one child
    const child = targetLeft ?? targetRight
    record(
      14,
      `${targetId} has exactly one child (${String(child)}), so splice that child into ${targetId}'s place.`,
      reattach(child),
      subtree([targetId, ...(child === null ? [] : [child])], child),
    )
    record(
      15,
      `Remove ${targetId}; the child keeps its own subtree.`,
      { removed: [targetId] },
      subtree(child === null ? [] : [child], child),
    )
    removedId = targetId
    record(
      16,
      `Deleted ${String(targetValue)} by splicing its single child up: O(h).`,
      {},
      subtree(child === null ? [] : [child], child),
    )
  } else {
    // ========================================================= case 3: two children
    const rightId = targetRight

    record(
      17,
      `${targetId} has two children, so replace its value with its in-order successor: the leftmost node of its right subtree, starting at ${rightId}.`,
      {},
      subtree([targetId, rightId], rightId),
    )

    let successorParentId = targetId
    let successorId = rightId
    const successorStart = bstNodeById(state, successorId)
    /* istanbul ignore if — `rightId` came from the model. */
    if (successorStart === undefined) {
      return {
        trace: steps,
        summary: {
          steps: steps.length,
          comparisons,
          conclusion: 'Internal error.',
        },
        finalState: state,
        deleted: false,
        removedId: null,
      }
    }
    // Typed as a definite node so the loop condition and the snapshot below are
    // narrowing-free; a `BstNode | undefined` would lose its narrowing on reassign.
    let successor: BstNode = successorStart

    while (successor.left !== null) {
      const leftId: NodeId = successor.left
      record(
        18,
        `${successorId} has a left child, so the successor is further left.`,
        {},
        subtree([targetId, successorId, leftId], leftId),
      )
      successorParentId = successorId
      successorId = leftId
      record(
        19,
        `Move to ${successorId} — the smallest key in ${targetId}'s right subtree.`,
        {},
        subtree([targetId, successorId], successorId),
      )
      const next = bstNodeById(state, successorId)
      /* istanbul ignore if — `leftId` came from the model. */
      if (next === undefined) break
      successor = next
    }

    // Snapshot the successor before the value copy changes its meaning.
    const successorValue = successor.value
    const successorRight = successor.right
    const spliceKind: 'left' | 'right' =
      successorParentId === targetId ? 'right' : 'left'

    record(
      20,
      `Copy the successor value ${String(successorValue)} up into ${targetId}. ${targetId} keeps its node identity and both its subtrees; only the key changes.`,
      { updated: [{ id: targetId, from: targetValue, to: successorValue }] },
      subtree([targetId, successorId], targetId),
    )

    const splice: Step['delta'] = {
      unlinked: [
        { from: successorParentId, to: successorId, kind: spliceKind },
      ],
    }
    if (successorRight !== null) {
      splice.linked = [
        { from: successorParentId, to: successorRight, kind: spliceKind },
      ]
    }
    record(
      22,
      successorRight === null
        ? `The successor ${successorId} has no left child; detach its parent's ${spliceKind} pointer.`
        : `Splice the successor's right child ${successorRight} into ${successorParentId}'s ${spliceKind} pointer.`,
      splice,
      subtree(
        [
          targetId,
          successorId,
          ...(successorRight === null ? [] : [successorRight]),
        ],
        successorRight ?? successorParentId,
      ),
    )
    record(
      23,
      `Remove the successor node ${successorId}; its value now lives in ${targetId}.`,
      { removed: [successorId] },
      subtree([targetId], targetId),
    )
    removedId = successorId

    record(
      24,
      `Deleted ${String(targetValue)}: copied the successor up, then removed it — O(h) for the find plus O(h) for the successor walk.`,
      {},
      subtree([targetId], targetId),
    )
  }

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion:
        removedId === null
          ? `${String(request.value)} was deleted.`
          : `Deleted ${String(request.value)} (node ${removedId} actually left the tree) in O(h).`,
    },
    finalState: state,
    deleted: true,
    removedId,
  }
}
