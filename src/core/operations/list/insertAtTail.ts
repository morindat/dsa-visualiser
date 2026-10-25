/**
 * `insertAtTail` — linked-list operation generator.
 *
 * WHAT IT DOES
 *   Inserts a new node at the end of the linked list.
 *
 *     line 2   create the new node
 *     line 3   if head = null:
 *     line 4       head ← node
 *     line 5       return head
 *     line 6   current ← head
 *     line 7   while current.next ≠ null:
 *     line 8       current ← current.next
 *     line 9   current.next ← node
 *     line 10  return head
 *
 * HOW IT IS SHARED
 *   Pure (structure, request) -> { trace, summary, finalState }.
 *   Each delta is applied through applyListDelta, so the trace
 *   and final state use the same reducer.
 *
 * COST
 *   O(n) time because we traverse the list to find the last node.
 */

import type { GenerateSummary, StructureDelta, Step } from '../../trace/step'
import {
  HEAD_POINTER,
  applyListDelta,
  nextNodeId,
  nodeById,
  type LinkedListModel,
} from '../../model/linkedList'

export const OPERATION_ID = 'insertAtTail'

export type InsertAtTailRequest = { value: string | number }

export type GenerateResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: LinkedListModel
}

export function insertAtTail(
  initial: LinkedListModel,
  request: InsertAtTailRequest,
): GenerateResult {
  const steps: Step[] = []
  const newId = nextNodeId(initial)

  let state = initial
  let comparisons = 0

  /** Apply a delta, then record the step that produced it. */
  const record = (
    codeLine: number,
    narration: string,
    delta: StructureDelta,
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

  // line 2 — node ← new Node(value)
  record(
    2,
    `Create a new node holding ${String(request.value)}.`,
    { created: [{ id: newId, value: request.value }] },
    { nodes: [newId], active: newId, edges: [] },
  )

  // line 3 — if head = null:
  if (state.head === null) {
    // line 4 — head ← node
    record(
      4,
      'The list is empty, so move the head pointer to the new node.',
      { updated: [{ id: HEAD_POINTER, from: null, to: newId }] },
      { nodes: [newId], active: newId, edges: [] },
    )

    // line 5 — return head
    record(
      5,
      `Inserted ${String(request.value)} into the empty list in O(1).`,
      {},
      { nodes: [newId], active: newId, edges: [] },
    )

    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons,
        conclusion: `Inserted ${String(request.value)} at the tail in O(1) for the empty list.`,
      },
      finalState: state,
    }
  }

  // line 6 — current ← head
  let current = state.head

  record(
    6,
    'Start traversing from the head of the list.',
    {},
    { nodes: [current], active: current, edges: [] },
  )

  // line 7 — while current.next ≠ null
  while (true) {
    const outgoing = state.links.find((link) => link.from === current)
    comparisons += 1

    if (outgoing === undefined) {
      record(
        7,
        `${String(nodeById(state, current)?.value)} is the last node; its next pointer is null.`,
        {},
        { nodes: [current], active: current, edges: [] },
      )
      break
    }

    record(
      7,
      `The current node is not the last node; continue past ${String(nodeById(state, current)?.value)}.`,
      {},
      {
        nodes: [current, outgoing.to],
        active: current,
        edges: [outgoing],
      },
    )

    // line 8 — current ← current.next
    current = outgoing.to

    const nextLink = state.links.find((link) => link.from === current)

    record(
      8,
      `Move to the next node, ${String(nodeById(state, current)?.value)}.`,
      {},
      {
        nodes: nextLink === undefined ? [current] : [current, nextLink.to],
        active: current,
        edges: nextLink === undefined ? [] : [nextLink],
      },
    )
  }

  // line 9 — current.next ← node
  record(
    9,
    `Link the last node, ${String(nodeById(state, current)?.value)}, to the new node.`,
    { linked: [{ from: current, to: newId, kind: 'next' }] },
    {
      nodes: [current, newId],
      active: newId,
      edges: [{ from: current, to: newId, kind: 'next' }],
    },
  )

  // line 10 — return head
  record(
    10,
    `Inserted ${String(request.value)} at the tail in O(n).`,
    {},
    { nodes: [current, newId], active: newId, edges: [] },
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: `Inserted ${String(request.value)} at the tail in O(n).`,
    },
    finalState: state,
  }
}
