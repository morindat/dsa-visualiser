/**
 * `insertAt` — linked-list operation generator.
 *
 * WHAT IT DOES
 *   Inserts a value at a 0-based position `k`. The walk stops on the node at
 *   `k - 1` — the predecessor of the insertion point — then performs the splice:
 *   the new node takes over `predecessor.next`, and the predecessor points at the
 *   new node.
 *
 *   `k = 0` is the head case; `k` at or past the end appends. Both are stated in
 *   the narration rather than being silent surprises.
 *
 *     line 2   node ← new Node(value)
 *     line 3   if k ≤ 0 or head = null:
 *     line 4       node.next ← head
 *     line 5       head ← node
 *     line 6       return head
 *     line 7   current ← head
 *     line 8   i ← 1
 *     line 9   while current.next ≠ null and i < k:
 *     line 10      current ← current.next
 *     line 11      i ← i + 1
 *     line 12  node.next ← current.next
 *     line 13  current.next ← node
 *     line 14  return head
 *
 * WHY IT EXISTS
 *   This is the operation that makes the cost contrast visible: `insertAtHead` is
 *   O(1), while `insertAt` is O(k) because the trace really does contain one hop
 *   per position. The new node stays floating until its links are made, so the
 *   splice is two visible pointer edits rather than a redraw.
 *
 * RULES
 *   Pure; no React, D3, `render/`, `ui/`, timers or DOM. Deterministic (NFR-C2).
 *   Cost: O(k) time, O(1) auxiliary space.
 */

import {
  HEAD_POINTER,
  applyListDelta,
  nextNodeId,
  nodeById,
  type LinkedListModel,
} from '../../model/linkedList'
import type { StructureValue } from '../../model/order'
import type { GenerateSummary, NodeId, Step } from '../../trace/step'

export const OPERATION_ID = 'insertAt'

export type InsertAtRequest = {
  value: StructureValue
  /** 0-based position. Negative values are clamped to the head. */
  position: number
}

export type InsertAtResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: LinkedListModel
}

export function insertAt(
  initial: LinkedListModel,
  request: InsertAtRequest,
): InsertAtResult {
  const steps: Step[] = []
  const newId = nextNodeId(initial)
  const position = Math.max(0, Math.floor(request.position))
  const length = initial.nodes.length
  const effective = Math.min(position, length)
  const clampedToTail = position > length

  let state = initial
  let comparisons = 0

  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    highlight: Step['highlight'],
  ): void => {
    state = applyListDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight,
      delta,
    })
  }

  const describe = (id: NodeId | null): string => {
    if (id === null) return 'null'
    const node = nodeById(state, id)
    return node === undefined ? id : String(node.value)
  }

  // line 2 — create the node. It stays floating until the splice.
  record(
    2,
    `Create a new node holding ${String(request.value)}. It is floating until the links are made.`,
    { created: [{ id: newId, value: request.value }] },
    { nodes: [newId], active: newId, edges: [] },
  )

  // lines 3-6 — head insertion when the position is 0 or the list is empty.
  if (effective === 0 || state.head === null) {
    const oldHead = state.head
    record(
      3,
      state.head === null
        ? 'The list is empty, so the new node becomes the head regardless of the requested position.'
        : `Position 0 means the new node becomes the head; no walk is needed.`,
      {},
      {
        nodes: oldHead === null ? [newId] : [newId, oldHead],
        active: newId,
        edges: [],
      },
    )

    record(
      4,
      oldHead === null
        ? 'There is no old head, so the new node points at null.'
        : `Point the new node's next at ${describe(oldHead)}, the old head.`,
      oldHead === null
        ? {}
        : { linked: [{ from: newId, to: oldHead, kind: 'next' }] },
      oldHead === null
        ? { nodes: [newId], active: newId, edges: [] }
        : {
            nodes: [newId, oldHead],
            active: newId,
            edges: [{ from: newId, to: oldHead, kind: 'next' }],
          },
    )

    record(
      5,
      'Move the head pointer to the new node.',
      { updated: [{ id: HEAD_POINTER, from: oldHead, to: newId }] },
      { nodes: [newId], active: newId, edges: [] },
    )

    record(
      6,
      `Inserted ${String(request.value)} at position 0 in O(1).`,
      {},
      { nodes: [newId], active: newId, edges: [] },
    )

    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion: `Inserted ${String(request.value)} at position 0 in O(1).`,
      },
      finalState: state,
    }
  }

  // line 7 — current ← head.
  let current = state.head
  record(
    7,
    `Start at the head, ${describe(current)}; the walk must stop on the node at position ${effective - 1}.`,
    {},
    { nodes: [current], active: current, edges: [] },
  )

  // line 8 — i ← 1 (the head is position 0).
  let i = 1
  record(
    8,
    'The head is position 0, so the walk starts counting at i = 1.',
    {},
    { nodes: [current], active: current, edges: [] },
  )

  // lines 9-11 — walk to the predecessor of the insertion point.
  while (current !== null) {
    const successor = nextNode(state, current)
    const canAdvance = successor !== null && i < effective
    comparisons += 1

    record(
      9,
      canAdvance
        ? `i = ${i} < ${effective} and ${describe(current)} has a next node, so advance one hop.`
        : successor === null
          ? `i = ${i}, but ${describe(current)} is the last node. The position is at or past the end, so insert after the tail.`
          : `i = ${i} has reached position ${effective - 1}; stop on ${describe(current)} and splice after it.`,
      {},
      successor === null
        ? { nodes: [current], active: current, edges: [] }
        : {
            nodes: [current, successor],
            active: current,
            edges: [{ from: current, to: successor, kind: 'next' }],
          },
    )

    if (!canAdvance) break

    // line 10 — current ← current.next.
    current = successor
    record(
      10,
      `Move current to ${describe(current)}.`,
      {},
      { nodes: [current], active: current, edges: [] },
    )

    // line 11 — i ← i + 1.
    i += 1
    record(
      11,
      `Increment i to ${i}. The walk has taken ${i - 1} hop(s).`,
      {},
      { nodes: [current], active: current, edges: [] },
    )
  }

  // The loop can only exit on a non-null current in this branch, but the guard
  // keeps the generator total if the model ever changes underneath it.
  if (current === null) {
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons,
        conclusion: `The list changed during the walk; ${String(request.value)} was not inserted.`,
      },
      finalState: state,
    }
  }

  const successor = nextNode(state, current)

  // line 12 — node.next ← current.next.
  record(
    12,
    successor === null
      ? `Point the new node's next at null: it will be the new tail.`
      : `Point the new node's next at ${describe(successor)}, the node currently after ${describe(current)}.`,
    successor === null
      ? {}
      : { linked: [{ from: newId, to: successor, kind: 'next' }] },
    successor === null
      ? { nodes: [current, newId], active: newId, edges: [] }
      : {
          nodes: [current, newId, successor],
          active: newId,
          edges: [{ from: newId, to: successor, kind: 'next' }],
        },
  )

  // line 13 — current.next ← node. This is the splice that makes the new node
  // reachable: cut the old predecessor → successor link first, then point the
  // predecessor at the new node.
  record(
    13,
    `${describe(current)}'s next now points at the new node, so ${String(request.value)} sits at position ${effective}.`,
    {
      ...(successor === null
        ? {}
        : {
            unlinked: [{ from: current, to: successor, kind: 'next' }],
          }),
      linked: [{ from: current, to: newId, kind: 'next' }],
    },
    {
      nodes: [current, newId],
      active: newId,
      edges: [{ from: current, to: newId, kind: 'next' }],
    },
  )

  // line 14 — return head.
  record(
    14,
    clampedToTail
      ? `Inserted ${String(request.value)} at the tail: position ${position} was past the end, so it clamped to ${effective}. Cost O(n).`
      : `Inserted ${String(request.value)} at position ${effective} in O(k) = ${comparisons} comparison(s).`,
    {},
    { nodes: [newId], active: newId, edges: [] },
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: clampedToTail
        ? `Inserted ${String(request.value)} at the tail after clamping position ${position} to ${effective}; O(n).`
        : `Inserted ${String(request.value)} at position ${effective} in O(k) = ${comparisons} comparison(s).`,
    },
    finalState: state,
  }
}

/** Follow the current node's `next` link, if it has one. */
function nextNode(model: LinkedListModel, id: NodeId): NodeId | null {
  return (
    model.links.find((link) => link.from === id && link.kind === 'next')?.to ??
    null
  )
}
