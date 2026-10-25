/**
 * `reverse` — linked-list operation generator.
 *
 * WHAT IT DOES
 *   Reverses the list in place, one node at a time, with the standard three
 *   pointers:
 *
 *     prev     the part of the list already reversed (starts null)
 *     current  the node being rewired
 *     next     the rest of the list, saved BEFORE the link is cut
 *
 *   One step is emitted per pseudocode line that does something, so the learner
 *   sees *why* `next ← current.next` must happen before `current.next ← prev`:
 *   after the rewire, the node's original successor is no longer reachable from
 *   `current`.
 *
 * THE ANIMATION
 *   Every step carries `aux.kind = "pointers"` with the three named variables as
 *   data. The list renderer draws those names as badges over the nodes they point
 *   at, and the auxiliary pane lists them (`prev → n1`, `next → null`, …). Between
 *   two steps the rewire arrives as `unlinked` + `linked`, so stepping backwards
 *   restores the previous direction exactly (ADR-1).
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `reverse`:
 *
 *     2   prev ← null
 *     3   current ← head
 *     4   while current ≠ null
 *     5   next ← current.next        save the rest
 *     6   current.next ← prev        flip the link
 *     7   prev ← current             advance prev
 *     8   current ← next             advance current
 *     9   head ← prev                the old tail is the new head
 *    10   return head
 *
 * RULES
 *   Pure `(structure, request) -> { trace, summary, finalState }`; deterministic
 *   and JSON-serialisable (NFR-C2). No React, D3, `render/`, `ui/`, timers or DOM.
 *   Cost: O(n) time, O(1) extra space — no node is created, moved or copied.
 */

import {
  HEAD_POINTER,
  applyListDelta,
  nodeById,
  type LinkedListModel,
} from '../../model/linkedList'
import type {
  GenerateSummary,
  NodeId,
  Step,
  StructureDelta,
} from '../../trace/step'

export const OPERATION_ID = 'reverse'

export type ReverseResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: LinkedListModel
}

export function reverse(initial: LinkedListModel): ReverseResult {
  const steps: Step[] = []
  const nodesReversed = initial.nodes.length

  let state = initial
  let prev: NodeId | null = null
  let current: NodeId | null = initial.head
  let next: NodeId | null = null

  /** A readable "value (id)" label for narration. */
  const describe = (id: NodeId | null): string => {
    if (id === null) return 'null'
    const node = nodeById(state, id)
    return node === undefined ? id : `${String(node.value)} (${id})`
  }

  /**
   * The three pointer variables as auxiliary state. `next` is shown only while it
   * is the saved rest of the list; at the start of an iteration it has not been
   * saved yet, so it is null in the display rather than a stale node.
   */
  const pointers = (
    shownPrev: NodeId | null,
    shownCurrent: NodeId | null,
    shownNext: NodeId | null,
  ): Step['aux'] => ({
    kind: 'pointers',
    pointers: [
      { role: 'prev', id: shownPrev },
      { role: 'current', id: shownCurrent },
      { role: 'next', id: shownNext },
    ],
    comparisons: 0,
  })

  const record = (
    codeLine: number,
    narration: string,
    delta: StructureDelta,
    highlight: Step['highlight'],
    aux: Step['aux'],
  ): void => {
    state = applyListDelta(state, delta)
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight,
      delta,
      aux,
    })
  }

  // line 2 — prev ← null.
  record(
    2,
    'prev starts as null: there is no node before the head, so the new tail will point at null.',
    {},
    { nodes: [], edges: [] },
    pointers(null, null, null),
  )

  // line 3 — current ← head.
  record(
    3,
    current === null
      ? 'current starts at head, which is null: the list is empty.'
      : `current starts at head, ${describe(current)}. The walk will rewire every node once.`,
    {},
    current === null
      ? { nodes: [], edges: [] }
      : { nodes: [current], active: current, edges: [] },
    pointers(prev, current, next),
  )

  // One iteration per node: check, save next, flip the link, advance prev, advance
  // current.
  while (current !== null) {
    const node = nodeById(state, current)
    if (node === undefined) {
      throw new Error(`Invalid linked-list reference: ${current}`)
    }

    // line 4 — while current ≠ null.
    record(
      4,
      `Loop check: current is ${describe(current)}, so there is still a node to rewire.`,
      {},
      { nodes: [current], active: current, edges: [] },
      pointers(prev, current, null),
    )

    // line 5 — next ← current.next. This must happen before the link is cut.
    next = nextNode(state, current)
    record(
      5,
      next === null
        ? `Save next = null: ${describe(current)} is the last node, so there is nothing after it.`
        : `Save next = ${describe(next)} BEFORE cutting ${describe(current)}'s link. Without this temporary pointer, the rest of the list would be lost.`,
      {},
      {
        nodes: next === null ? [current] : [current, next],
        active: current,
        edges: next === null ? [] : [{ from: current, to: next, kind: 'next' }],
      },
      pointers(prev, current, next),
    )

    // line 6 — current.next ← prev. The actual pointer flip.
    const delta: StructureDelta = {}
    if (next !== null) {
      delta.unlinked = [{ from: current, to: next, kind: 'next' }]
    }
    if (prev !== null) {
      delta.linked = [{ from: current, to: prev, kind: 'next' }]
    }

    record(
      6,
      prev === null
        ? `Reverse ${describe(current)}'s next pointer: it now points at null, so ${describe(current)} becomes the last node.`
        : `Reverse ${describe(current)}'s next pointer: it now points back at ${describe(prev)} instead of ${describe(next)}.`,
      delta,
      {
        nodes:
          prev === null
            ? [current]
            : next === null
              ? [current, prev]
              : [current, prev, next],
        active: current,
        edges: prev === null ? [] : [{ from: current, to: prev, kind: 'next' }],
      },
      pointers(prev, current, next),
    )

    // line 7 — prev ← current.
    prev = current
    record(
      7,
      `Advance prev to ${describe(prev)}. The reversed prefix now ends here.`,
      {},
      { nodes: [prev], active: prev, edges: [] },
      pointers(prev, current, next),
    )

    // line 8 — current ← next. The saved pointer is what makes this safe.
    current = next
    record(
      8,
      current === null
        ? 'Advance current to null: the saved next was null, so every node has been visited.'
        : `Advance current to ${describe(current)}, the node saved at line 5.`,
      {},
      current === null
        ? { nodes: [prev], active: prev, edges: [] }
        : { nodes: [prev, current], active: current, edges: [] },
      pointers(prev, current, null),
    )
  }

  // line 4 — the loop test that fails, shown so the exit is explicit.
  record(
    4,
    'Loop check: current is null, so every node has been rewired exactly once.',
    {},
    prev === null
      ? { nodes: [], edges: [] }
      : { nodes: [prev], active: prev, edges: [] },
    pointers(prev, null, null),
  )

  // line 9 — head ← prev. The old tail is the new head.
  const headDelta: StructureDelta =
    initial.head === prev
      ? {}
      : {
          updated: [{ id: HEAD_POINTER, from: initial.head, to: prev }],
        }

  record(
    9,
    prev === null
      ? 'head ← prev, but prev is null, so the list is still empty.'
      : `Move head to ${describe(prev)} — the old tail and the new first node.`,
    headDelta,
    prev === null
      ? { nodes: [], edges: [] }
      : { nodes: [prev], active: prev, edges: [] },
    pointers(prev, null, null),
  )

  // line 10 — return head.
  record(
    10,
    nodesReversed <= 1
      ? `Reversed ${nodesReversed} node(s). The list is unchanged; O(n) time and O(1) extra space.`
      : `Done: reversed ${nodesReversed} nodes in O(n) time and O(1) extra space. Every next pointer was flipped exactly once.`,
    {},
    prev === null
      ? { nodes: [], edges: [] }
      : { nodes: [prev], active: prev, edges: [] },
    pointers(prev, null, null),
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      // Reverse does not compare values. Its cost is the number of rewires, which
      // is shown in the conclusion and is exactly the number of nodes.
      comparisons: 0,
      conclusion:
        nodesReversed <= 1
          ? `Reversed ${nodesReversed} node(s) in O(n) time and O(1) extra space.`
          : `Reversed ${nodesReversed} nodes in O(n) time and O(1) extra space; ${nodesReversed} next pointers were flipped.`,
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
