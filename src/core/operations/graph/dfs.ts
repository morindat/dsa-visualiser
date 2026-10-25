/**
 * `dfs` — graph depth-first search generator (iterative, explicit stack).
 *
 * WHAT IT DOES
 *   Explores as far as possible along one branch before backtracking, using an
 *   **explicit stack** as the frontier and a visited set for discovery. The stack is
 *   emitted in `aux` on every step, so the frontier is the algorithm's own object
 *   and stepping backwards shows the exact stack rather than replaying history
 *   (ADR-1, A2 §3.6).
 *
 *   Neighbours are pushed in **reverse** adjacency order. A stack pops the most
 *   recent push first, so reversing makes the pop order equal the adjacency
 *   insertion order — the same order the recursive form visits in. That is what
 *   makes the iterative and recursive visit orders coincide, and it is why the
 *   reversal is written down rather than left as an accident.
 *
 *   A vertex can be pushed more than once (one push per incident edge). The
 *   `if v in visited: continue` line discards the duplicate pop, so a vertex is
 *   *visited* exactly once even though it may be *pushed* several times. That skip
 *   is shown as a step instead of being silent.
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `dfs`:
 *
 *     3    seed the stack with the source (`stack ← [source]`)
 *     6    a duplicate pop: already visited, so skip it
 *     8    pop and visit `v`
 *    10    push `u` from `v` (or note that it was already visited)
 *    11    `return output`
 *
 * HOW IT IS SHARED
 *   Read-only: every delta is empty and `finalState` is a fresh copy. The parents
 *   map is returned as data so the depth-first-tree claim is testable.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic (NFR-C2). Cost
 *   shown: Θ(V+E) time, O(V) space.
 */

import {
  applyGraphDelta,
  hasVertex,
  neighbourIdsOf,
  type GraphModel,
} from '../../model/graph'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'dfs'

export type DfsRequest = { source: NodeId }

export type DfsResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: GraphModel
  /** Vertices in visit order (a preorder of the depth-first forest). */
  order: NodeId[]
  /** The depth-first tree: parent of each reachable vertex (`null` for the source). */
  parents: Record<NodeId, NodeId | null>
}

export function dfs(graph: GraphModel, request: DfsRequest): DfsResult {
  const steps: Step[] = []
  const order: NodeId[] = []
  const parents: Record<NodeId, NodeId | null> = {}

  const visited: NodeId[] = []
  const seen = new Set<NodeId>()
  let comparisons = 0

  // Explicit LIFO stack. Array order is bottom-to-top, so the top is the last item;
  // `aux.values` shows the whole stack in that order.
  const stack: NodeId[] = []

  const record = (
    codeLine: number,
    narration: string,
    active: NodeId | null,
    edges: TraceEdge[],
  ): void => {
    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine,
      narration,
      highlight: {
        nodes: [...visited, ...stack],
        ...(active === null ? {} : { active }),
        edges,
      },
      delta: {},
      aux: {
        kind: 'stack',
        values: [...stack],
        visited: [...visited],
        comparisons,
      },
    })
  }

  if (!hasVertex(graph, request.source)) {
    record(
      2,
      `Source ${request.source} is not a vertex of this graph, so nothing is reachable.`,
      null,
      [],
    )
    return {
      trace: steps,
      summary: {
        steps: steps.length,
        comparisons: 0,
        conclusion: `No such vertex ${request.source}; the reachable set is empty.`,
      },
      finalState: applyGraphDelta(graph, {}),
      order,
      parents,
    }
  }

  // line 3 — seed the frontier.
  stack.push(request.source)
  parents[request.source] = null
  record(
    3,
    `Push the source ${request.source}. The stack is the frontier; the most recently pushed vertex is explored next.`,
    request.source,
    [],
  )

  while (stack.length > 0) {
    const current = stack.pop()
    /* istanbul ignore if — the loop condition guarantees a value. */
    if (current === undefined) break

    // line 6 — a duplicate push is not a new visit. Discarding it is what keeps the
    // total work O(V+E) despite a vertex being pushed once per incident edge.
    if (seen.has(current)) {
      record(
        6,
        `Pop ${current}, but it is already visited: this is a duplicate push, so skip it.`,
        current,
        [],
      )
      continue
    }

    // line 8 — first pop: discover and visit.
    seen.add(current)
    visited.push(current)
    order.push(current)
    record(
      8,
      `Pop and visit ${current}. Everything reachable from here is explored before backtracking.`,
      current,
      [],
    )

    // line 9 — reverse adjacency order, so the pop order matches recursion.
    const neighbours = neighbourIdsOf(graph, current)
    for (let i = neighbours.length - 1; i >= 0; i -= 1) {
      const neighbour = neighbours[i]
      comparisons += 1
      const edge: TraceEdge = { from: current, to: neighbour }

      if (seen.has(neighbour)) {
        record(
          10,
          `${neighbour} is already visited, so nothing is pushed for edge ${current} → ${neighbour}.`,
          current,
          [edge],
        )
        continue
      }

      // line 10 — push only undiscovered vertices.
      stack.push(neighbour)
      if (!(neighbour in parents)) parents[neighbour] = current
      record(
        10,
        `Push ${neighbour} from ${current}. It will be explored before the rest of ${current}'s neighbours, which is what makes the search depth-first.`,
        neighbour,
        [edge],
      )
    }

    // Revisited neighbours are examined but not recorded before a push, so count
    // their comparisons here as well: the loop above always emits a step.
  }

  // line 11 — the stack has drained.
  record(
    11,
    `The stack is empty, so the reachable component is exhausted. Visit order: ${order.join(', ')}.`,
    null,
    [],
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: `DFS from ${request.source} visited ${order.length} of ${graph.vertices.length} vertex/vertices, examining ${comparisons} edge(s) — Θ(V+E).`,
    },
    finalState: applyGraphDelta(graph, {}),
    order,
    parents,
  }
}
