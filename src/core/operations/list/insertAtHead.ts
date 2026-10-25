/**
 * `insertAtHead` — linked-list operation generator.
 *
 * WHAT IT DOES
 *   Turns "insert `value` at the head of this list" into an ordered `Step[]`. One
 *   step per pseudocode line that does something:
 *
 *     line 2  create the node
 *     line 3  point its `next` at the old head   (skipped in meaning when empty)
 *     line 4  move the `head` pointer
 *     line 5  return
 *
 * HOW IT IS SHARED
 *   Pure `(structure, request) -> { trace, summary, finalState }`. It never
 *   mutates `initial`: each step applies its own delta through
 *   `applyListDelta`, so the generator and the trace store replay the *same*
 *   reducer and cannot drift apart.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; no randomness, no clock, so the
 *   same input always produces a byte-identical trace (ADR-2, NFR-C2, NFR-M2).
 *   Cost shown: O(1) (`FR4`) — only the head pointer changes.
 */

import type { GenerateSummary, StructureDelta, Step } from '../../trace/step'
import {
  HEAD_POINTER,
  applyListDelta,
  nextNodeId,
  nodeById,
  type LinkedListModel,
} from '../../model/linkedList'

export const OPERATION_ID = 'insertAtHead'

export type InsertAtHeadRequest = { value: string | number }

export type GenerateResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: LinkedListModel
}

export function insertAtHead(
  initial: LinkedListModel,
  request: InsertAtHeadRequest,
): GenerateResult {
  const steps: Step[] = []
  const previousHead = initial.head
  const previousValue =
    previousHead === null
      ? null
      : (nodeById(initial, previousHead)?.value ?? null)
  const newId = nextNodeId(initial)

  let state = initial

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
      // No `aux`: insert-at-head keeps O(1) auxiliary state, so there is nothing
      // to show. `aux` is optional in the frozen contract for exactly this case.
    })
  }

  // line 2 — node ← new Node(value)
  record(
    2,
    `Create a new node holding ${String(request.value)}.`,
    { created: [{ id: newId, value: request.value }] },
    { nodes: [newId], active: newId, edges: [] },
  )

  // line 3 — node.next ← head
  record(
    3,
    previousHead === null
      ? 'The list was empty, so there is no previous head to link to.'
      : `Point the new node's next at ${String(previousValue)} — the current head.`,
    previousHead === null
      ? {}
      : { linked: [{ from: newId, to: previousHead, kind: 'next' }] },
    previousHead === null
      ? { nodes: [newId], active: newId, edges: [] }
      : {
          nodes: [newId, previousHead],
          active: newId,
          edges: [{ from: newId, to: previousHead, kind: 'next' }],
        },
  )

  // line 4 — head ← node
  record(
    4,
    'Move the head pointer to the new node.',
    { updated: [{ id: HEAD_POINTER, from: previousHead, to: newId }] },
    { nodes: [newId], active: newId, edges: [] },
  )

  // line 5 — return head
  record(
    5,
    `${String(request.value)} is now the head. Insert at head is O(1): no existing node was touched.`,
    {},
    { nodes: [newId], active: newId, edges: [] },
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion: `Inserted ${String(request.value)} at the head in O(1).`,
    },
    finalState: state,
  }
}
