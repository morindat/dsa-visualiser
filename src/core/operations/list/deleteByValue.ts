/**
 * `deleteByValue` — linked-list operation generator.
 *
 * WHAT IT DOES
 *   Deletes the first node holding the requested value. The walk keeps the
 *   predecessor because the unlink needs it: you cannot reconnect around a node
 *   you cannot reach from the node before it. The trace shows that reason as a
 *   step of its own, not only as a final result.
 *
 *     line 2   current ← head
 *     line 3   while current ≠ null
 *     line 4       if current.value = value
 *     line 5           if current = head
 *     line 6               head ← current.next
 *     line 7           else
 *     line 8               predecessor.next ← current.next
 *     line 9           return head
 *     line 10      predecessor ← current
 *     line 11      current ← current.next
 *     line 12  return head
 *
 * CONTRACT
 *   Pure `(structure, request) -> { trace, summary, finalState }`. The removal
 *   travels as `unlinked` + `linked` + `removed`, so stepping backwards restores
 *   the exact previous list and no dangling link survives a replay.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2).
 *   Cost: O(n) in the worst case, O(1) when the value is at the head.
 */

import type { GenerateSummary, NodeId, Step } from '../../trace/step'
import {
  HEAD_POINTER,
  applyListDelta,
  nodeById,
  type LinkedListModel,
} from '../../model/linkedList'

export const OPERATION_ID = 'deleteByValue'

export type DeleteByValueRequest = { value: string | number }

export type GenerateResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: LinkedListModel
}

export function deleteByValue(
  initial: LinkedListModel,
  request: DeleteByValueRequest,
): GenerateResult {
  const trace: Step[] = []
  let state = initial
  let current = initial.head
  let predecessor: NodeId | null = null
  let comparisons = 0

  const record = (
    codeLine: number,
    narration: string,
    delta: Step['delta'],
    highlight: Step['highlight'],
  ): void => {
    state = applyListDelta(state, delta)
    trace.push({
      index: trace.length,
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

  // line 2 — current ← head.
  record(
    2,
    current === null
      ? 'current starts at head, which is null: the list is empty.'
      : `current starts at head, ${describe(current)}.`,
    {},
    current === null
      ? { nodes: [], edges: [] }
      : { nodes: [current], active: current, edges: [] },
  )

  // Walk the list, following links from one node to the next.
  while (current !== null) {
    const node = nodeById(state, current)
    if (node === undefined) {
      throw new Error(`Invalid linked-list reference: ${current}`)
    }

    // line 3 — while current ≠ null.
    record(
      3,
      `Loop check: current is ${describe(current)}${predecessor === null ? ', with no predecessor yet' : `, preceded by ${describe(predecessor)}`}.`,
      {},
      { nodes: [current], active: current, edges: [] },
    )

    comparisons += 1

    // line 4 — if current.value = value.
    record(
      4,
      `Compare ${String(node.value)} with ${String(request.value)}: ${
        node.value === request.value ? 'equal.' : 'not equal, so keep walking.'
      }`,
      {},
      { nodes: [current], active: current, edges: [] },
    )

    if (node.value === request.value) {
      const successor = nextNode(state, current)

      if (predecessor === null) {
        // lines 5-6 — the match is the head, so move the head pointer.
        record(
          5,
          `The match is the head, so it has no predecessor; the head pointer itself must move.`,
          {},
          { nodes: [current], active: current, edges: [] },
        )
        record(
          6,
          successor === null
            ? `Move head to null and remove ${String(node.value)}: the list becomes empty.`
            : `Move head to ${describe(successor)} and remove ${String(node.value)}.`,
          {
            updated: [{ id: HEAD_POINTER, from: current, to: successor }],
            removed: [current],
          },
          successor === null
            ? { nodes: [current], active: current, edges: [] }
            : {
                nodes: [current, successor],
                active: current,
                edges: [{ from: current, to: successor, kind: 'next' }],
              },
        )
      } else {
        // lines 7-8 — reconnect the predecessor around the match.
        record(
          7,
          `${String(node.value)} is not the head, so predecessor ${describe(predecessor)} is the node that can reconnect the list.`,
          {},
          {
            nodes:
              successor === null
                ? [predecessor, current]
                : [predecessor, current, successor],
            active: current,
            edges: [],
          },
        )
        record(
          8,
          successor === null
            ? `Unlink ${String(node.value)} from ${describe(predecessor)}; it was the last node.`
            : `Point ${describe(predecessor)}'s next at ${describe(successor)}, skipping ${String(node.value)}.`,
          {
            unlinked: [{ from: predecessor, to: current, kind: 'next' }],
            ...(successor === null
              ? {}
              : {
                  linked: [
                    {
                      from: predecessor,
                      to: successor,
                      kind: 'next' as const,
                    },
                  ],
                }),
            removed: [current],
          },
          {
            nodes:
              successor === null
                ? [predecessor, current]
                : [predecessor, current, successor],
            active: current,
            edges: [],
          },
        )
      }

      // line 9 — return head.
      record(
        9,
        `Deleted the first occurrence of ${String(request.value)}. ${
          comparisons === 1
            ? 'It was the head, so this delete was O(1).'
            : `The walk took ${comparisons} comparison(s), so the delete was O(n).`
        }`,
        {},
        { nodes: [], edges: [] },
      )

      return {
        trace,
        summary: {
          steps: trace.length,
          comparisons,
          conclusion: `Deleted ${String(request.value)} from the linked list after ${comparisons} comparison(s).`,
        },
        finalState: state,
      }
    }

    // line 10 — predecessor ← current.
    predecessor = current
    record(
      10,
      `Advance predecessor to ${describe(predecessor)} — the node that could relink the list if the next node matches.`,
      {},
      { nodes: [predecessor], active: predecessor, edges: [] },
    )

    // line 11 — current ← current.next.
    current = nextNode(state, current)
    record(
      11,
      current === null
        ? 'current becomes null, so the walk has reached the end of the list.'
        : `Move current to the next node, ${describe(current)}.`,
      {},
      current === null
        ? { nodes: [predecessor], active: predecessor, edges: [] }
        : { nodes: [predecessor, current], active: current, edges: [] },
    )
  }

  // line 12 — return head, unchanged.
  record(
    12,
    `Value ${String(request.value)} was not found. The list remains unchanged.`,
    {},
    {
      nodes: predecessor === null ? [] : [predecessor],
      ...(predecessor === null ? {} : { active: predecessor }),
      edges: [],
    },
  )

  return {
    trace,
    summary: {
      steps: trace.length,
      comparisons,
      conclusion: `Value ${String(request.value)} was not found; the list is unchanged.`,
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
