/**
 * `inorder` — tree traversal generator (left, visit, right).
 *
 * WHAT IT DOES
 *   A depth-first walk that visits a node *between* its two subtrees. On a binary
 *   search tree this enumerates the keys in ascending order, so the traversal is
 *   an executable statement of the BST ordering invariant: if the output is not
 *   sorted, the tree is not a valid BST (A2 §3.2). One `Step` per visit, each
 *   carrying the live call stack in `aux`.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `inorder`:
 *
 *     4   `inorder(node.left, output)`
 *     5   `output.append(node.value)`   the visit, BETWEEN the two calls
 *     6   `inorder(node.right, output)`
 *
 *   Read beside `preorder` (visit first) and `postorder` (visit last), the only
 *   difference is where line 10 sits — which is the point of shipping all three
 *   (A2 §3.3).
 *
 * HOW IT IS SHARED
 *   Pure and read-only: no delta ever changes the tree, so `finalState` is a fresh
 *   copy. `order` is the sorted value sequence for a valid BST and is returned as
 *   plain data so the tests can compare it with the model's `valuesInOrder`.
 *
 * AUX SHAPE
 *   `kind: "recursion"`, `frameIds` = the call path, `frames` = the depth of each
 *   frame.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic, left-before-right
 *   (ADR-2, NFR-C2, NFR-M2). Cost shown: Θ(n) time, O(h) auxiliary space.
 */

import { bstNodeById, type BinarySearchTree } from '../../model/bst'
import { compareValues, type StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'inorder'

export type InorderResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** Node ids in visit order (for a BST: ascending key order). */
  orderIds: NodeId[]
  /** Values in visit order (for a BST: sorted). */
  order: StructureValue[]
}

export function inorder(tree: BinarySearchTree): InorderResult {
  const steps: Step[] = []
  const orderIds: NodeId[] = []
  const order: StructureValue[] = []

  /** The edges along a root-to-frame path, read from the model (see preorder.ts). */
  const edgesForPath = (nodePath: readonly NodeId[]): TraceEdge[] => {
    const edges: TraceEdge[] = []
    for (let i = 1; i < nodePath.length; i += 1) {
      const parentId = nodePath[i - 1]
      const childId = nodePath[i]
      const parent = bstNodeById(tree, parentId)
      edges.push({
        from: parentId,
        to: childId,
        kind: parent?.left === childId ? 'left' : 'right',
      })
    }
    return edges
  }

  const record = (
    codeLine: number,
    narration: string,
    id: NodeId,
    framePath: readonly NodeId[],
  ): void => {
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight: {
        nodes: [...orderIds],
        active: id,
        edges: edgesForPath(framePath),
      },
      delta: {},
      aux: {
        kind: 'recursion',
        frames: framePath.map((_, depth) => depth),
        frameIds: [...framePath],
        frameValues: framePath.map(
          (frameId) => bstNodeById(tree, frameId)?.value ?? frameId,
        ),
        // The visit order so far — the inorder output, which the tree renderer
        // colours as visited nodes (`aux.visited`, FR10).
        visited: [...orderIds],
        // The learner-facing output sequence, shown while it grows.
        output: [...order],
        comparisons: 0,
      },
    })
  }

  const walk = (
    id: NodeId | null,
    path: readonly NodeId[],
    direction: 'root' | 'left' | 'right',
  ): void => {
    if (id === null) return
    const node = bstNodeById(tree, id)
    /* istanbul ignore if — the walk only ever follows ids that resolve. */
    if (node === undefined) return

    const framePath = [...path, id]
    const callLine = direction === 'left' ? 4 : direction === 'right' ? 6 : 1
    const where =
      direction === 'root'
        ? 'Start at the root'
        : direction === 'left'
          ? 'Go left'
          : 'Go right'

    // Line 1 / 4 / 6 — enter the call. This is the descent learners need to see
    // before the first value can be output.
    record(
      callLine,
      `${where}: call inorder(${String(node.value)}) at ${id}.`,
      id,
      framePath,
    )

    // L — exhaust the left subtree first.
    walk(node.left, framePath, 'left')

    // D — the left subtree is complete, so this node is the next output value.
    orderIds.push(id)
    order.push(node.value)
    record(
      5,
      `The left subtree of ${id} is complete, so visit ${String(node.value)} — the D of LDR — and append it to output.`,
      id,
      framePath,
    )

    // R — then the right subtree.
    walk(node.right, framePath, 'right')
  }

  if (tree.root === null) {
    steps.push({
      index: 0,
      operation: OPERATION_ID,
      codeLine: 2,
      narration:
        'The tree is empty, so inorder visits nothing. This is the base case.',
      highlight: { nodes: [], edges: [] },
      delta: {},
      aux: {
        kind: 'recursion',
        frames: [],
        frameIds: [],
        output: [],
        comparisons: 0,
      },
    })
  } else {
    walk(tree.root, [], 'root')
  }

  // "Sorted" is checked with the same total order the BST uses, not with JS `<`,
  // so a numeric key list like 9, 10 is correct (string comparison would not be).
  const sorted = order.every((value, index) => {
    if (index === 0) return true
    return compareValues(order[index - 1], value) < 0
  })

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion:
        order.length === 0
          ? 'Inorder over an empty tree: no nodes visited.'
          : `Inorder visited ${order.length} node(s) in Θ(n): ${order.map(String).join(', ')}${
              sorted
                ? ' — ascending, as the BST invariant promises.'
                : ' — NOT sorted, so the BST invariant is broken.'
            }`,
    },
    finalState: {
      nodes: tree.nodes.map((node) => ({ ...node })),
      root: tree.root,
    },
    orderIds,
    order,
  }
}
