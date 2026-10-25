/**
 * `preorder` — tree traversal generator (visit, then left, then right).
 *
 * WHAT IT DOES
 *   A depth-first walk that visits a node *before* either of its subtrees, so the
 *   visit sequence is the root, then the preorder of the left subtree, then the
 *   preorder of the right subtree. One `Step` is emitted per visit; each step
 *   carries the live call stack in `aux`, because that stack is the path from the
 *   root to the current node (A2 §3.1).
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `preorder`:
 *
 *     4   `output.append(node.value)`   the visit, and it comes FIRST
 *     5   `preorder(node.left, output)`
 *     6   `preorder(node.right, output)`
 *
 *   Putting `preorder`, `inorder` and `postorder` next to each other is the whole
 *   lesson: the three listings are identical except that this visit line is first,
 *   middle, or last (A2 §3.3).
 *
 * HOW IT IS SHARED
 *   Pure and read-only: a traversal changes no pointer, so `finalState` is a fresh
 *   copy of the input tree. The visit order is also returned as plain data
 *   (`orderIds` / `order`) so a test can compare it with the model's untraced
 *   `preorderNodeIds` without re-reading the trace.
 *
 * AUX SHAPE
 *   `kind: "recursion"`. `frameIds` is the call path, outermost frame first, which
 *   is what a recursion panel draws; `frames` is the depth of each of those frames
 *   (0, 1, 2, …), kept because the frozen contract declares it as `number[]`.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic, left-before-right
 *   always (ADR-2, NFR-C2, NFR-M2). Cost shown: Θ(n) time, O(h) auxiliary space.
 */

import { bstNodeById, type BinarySearchTree } from '../../model/bst'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'preorder'

export type PreorderResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** Node ids in visit order. */
  orderIds: NodeId[]
  /** Values in visit order. */
  order: StructureValue[]
}

export function preorder(tree: BinarySearchTree): PreorderResult {
  const steps: Step[] = []
  const orderIds: NodeId[] = []
  const order: StructureValue[] = []

  /**
   * The edges along a root-to-frame path, so the renderer can light up the route
   * the call stack represents. Read from the model, not tracked separately, so the
   * traversal and the picture cannot disagree.
   */
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
        // The visit order so far, so the tree renderer can colour nodes the
        // traversal has already finished with (`aux.visited`, FR10).
        visited: [...orderIds],
        // The learner-facing output sequence, shown while it grows.
        output: [...order],
        comparisons: 0, // a traversal compares no keys; its work is the visits
      },
    })
  }

  /**
   * The recursive walk. `path` is the logical call stack *including* the node being
   * entered, so the frame list in `aux` is exactly the route from the root.
   */
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
    const callLine = direction === 'left' ? 5 : direction === 'right' ? 6 : 1
    const where =
      direction === 'root'
        ? 'Start at the root'
        : direction === 'left'
          ? 'Go left'
          : 'Go right'

    record(
      callLine,
      `${where}: call preorder(${String(node.value)}) at ${id}.`,
      id,
      framePath,
    )

    // V — visit the node before either subtree, then append it to the output.
    orderIds.push(id)
    order.push(node.value)
    record(
      4,
      `Visit ${String(node.value)} — the V of VLR — and append it to output before descending.`,
      id,
      framePath,
    )

    // L then R.
    walk(node.left, framePath, 'left')
    walk(node.right, framePath, 'right')
  }

  if (tree.root === null) {
    // An empty tree still produces one step, so the pane can say *why* nothing
    // happened instead of showing an empty trace.
    steps.push({
      index: 0,
      operation: OPERATION_ID,
      codeLine: 2,
      narration:
        'The tree is empty, so preorder visits nothing. This is the base case.',
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

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion:
        order.length === 0
          ? 'Preorder over an empty tree: no nodes visited.'
          : `Preorder visited ${order.length} node(s) in Θ(n): ${order.map(String).join(', ')}.`,
    },
    finalState: {
      nodes: tree.nodes.map((node) => ({ ...node })),
      root: tree.root,
    },
    orderIds,
    order,
  }
}
