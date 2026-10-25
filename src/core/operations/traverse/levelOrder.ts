/**
 * `levelOrder` — breadth-first traversal generator.
 *
 * WHAT IT DOES
 *   Visits the tree level by level, left to right within a level, using a **FIFO
 *   queue** as the frontier: enqueue the root, then repeatedly dequeue a node,
 *   visit it and enqueue its children. The live queue is emitted in `aux` on every
 *   step, because the frontier is the object this traversal exists to show (A2
 *   §3.4). Three steps per dequeued node are emitted: the visit, and the child
 *   enqueue check (which is shown even when a node has no children, so the "no-op"
 *   is visible rather than implied).
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `levelOrder`:
 *
 *     3   enqueue the root (when it exists)
 *     6   dequeue and visit the front node
 *     7   enqueue the children (left, then right)
 *
 * HOW IT IS SHARED
 *   Pure and read-only: no pointer changes, so `finalState` is a fresh copy. The
 *   queue is a plain array plus a `head` index — `dequeue` advances `head` instead
 *   of calling `Array.shift()`, which is O(n) per call and would make the traversal
 *   quadratic. This is the same queue discipline graph BFS uses (ADR-5), only here
 *   the frontier holds tree nodes.
 *
 * AUX SHAPE
 *   `kind: "queue"`. `values` is the queue's contents in dequeue order, `visited`
 *   is the visit order so far. Both are ids; the renderer maps ids to values.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic, left-then-right
 *   (ADR-2, NFR-C2, NFR-M2). Cost shown: Θ(n) time, O(w) auxiliary space where w
 *   is the widest level.
 */

import { bstNodeById, type BinarySearchTree } from '../../model/bst'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step } from '../../trace/step'

export const OPERATION_ID = 'levelOrder'

export type LevelOrderResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: BinarySearchTree
  /** Node ids in visit order. */
  orderIds: NodeId[]
  /** Values in visit order. */
  order: StructureValue[]
}

export function levelOrder(tree: BinarySearchTree): LevelOrderResult {
  const steps: Step[] = []
  const orderIds: NodeId[] = []
  const order: StructureValue[] = []

  // FIFO queue as array + head index: `head` advances on dequeue, so dequeue is
  // O(1) and the array never shifts. This is the circular-buffer idea from A2
  // Listing 1, expressed with a plain array that is JSON-serialisable.
  const queue: NodeId[] = []
  let head = 0

  const queueContents = (): NodeId[] => queue.slice(head)

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
        nodes: [...orderIds],
        ...(active === null ? {} : { active }),
        edges: [],
      },
      delta: {},
      aux: {
        kind: 'queue',
        values: queueContents(),
        visited: [...orderIds],
        output: [...order],
        comparisons: 0,
      },
    })
  }

  if (tree.root === null) {
    steps.push({
      index: 0,
      operation: OPERATION_ID,
      codeLine: 3,
      narration:
        'The root is null, so the queue stays empty and there is nothing to visit.',
      highlight: { nodes: [], edges: [] },
      delta: {},
      aux: {
        kind: 'queue',
        values: [],
        visited: [],
        output: [],
        comparisons: 0,
      },
    })
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion: 'Level-order over an empty tree: no nodes visited.',
      },
      finalState: {
        nodes: tree.nodes.map((node) => ({ ...node })),
        root: tree.root,
      },
      orderIds,
      order,
    }
  }

  // line 3 — enqueue the root and show the frontier with exactly one entry.
  queue.push(tree.root)
  record(
    3,
    `Enqueue the root ${tree.root}. The queue is the whole frontier right now.`,
    null,
  )

  while (head < queue.length) {
    const current = queue[head]
    head += 1

    const node = bstNodeById(tree, current)
    /* istanbul ignore if — ids are only ever enqueued from the model. */
    if (node === undefined) continue

    orderIds.push(current)
    order.push(node.value)

    // line 6 — dequeue and visit. The queue shown is *after* the dequeue, which is
    // the state the learner is looking at when the visit happens.
    record(
      6,
      `Dequeue ${current} and visit ${String(node.value)} — append it to output; the first node enqueued is the first visited (FIFO).`,
      current,
    )

    // line 7 — enqueue the children left-then-right; the order is what makes the
    // output level-order rather than merely breadth-first.
    if (node.left !== null) queue.push(node.left)
    if (node.right !== null) queue.push(node.right)
    record(
      7,
      node.left === null && node.right === null
        ? `${current} has no children, so nothing is enqueued.`
        : `Enqueue the children of ${current}: ${[
            node.left === null ? null : String(node.left),
            node.right === null ? null : String(node.right),
          ]
            .filter((id): id is string => id !== null)
            .join(', ')}.`,
      current,
    )
  }

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion:
        order.length === 0
          ? 'Level-order over an empty tree: no nodes visited.'
          : `Level-order visited ${order.length} node(s) in Θ(n): ${order.map(String).join(', ')}.`,
    },
    finalState: {
      nodes: tree.nodes.map((node) => ({ ...node })),
      root: tree.root,
    },
    orderIds,
    order,
  }
}
