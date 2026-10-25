/**
 * `bfs` — graph breadth-first search generator.
 *
 * WHAT IT DOES
 *   Explores the graph in rings of increasing distance from the source, using a
 *   **FIFO queue** as the frontier and a visited set to mark discovery. The trace
 *   separates the three events a learner has to tell apart:
 *
 *     discover  a vertex enters `visited` and the queue for the first time;
 *     visit     a vertex is dequeued and its neighbours are about to be examined;
 *     examine   one edge `(v, u)` is looked at, whether or not it leads anywhere.
 *
 *   `aux` carries the live queue AND the discovered set, so the frontier is the
 *   algorithm's own object, not a reconstruction (FR10, A2 §3.5).
 *
 * PSEUDOCODE / codeLine MAP
 *   The authored listing lives in `data/catalogue.ts` under `bfs`:
 *
 *     3    enqueue the source (`visited ← {source}; queue ← [source]`)
 *     6    dequeue `v` and visit it
 *     7    examine the edge `(v, u)`
 *     9    `u` was undiscovered: mark it and enqueue it
 *    11    `return output`
 *
 * HOW IT IS SHARED
 *   Read-only: BFS never edits the graph, so every delta is empty and `finalState`
 *   is a fresh copy of the model. Distance and parent are returned as plain data
 *   (`distances`, `parents`), which is where the shortest-path-tree claim becomes
 *   checkable in a test rather than asserted.
 *
 * DETERMINISM
 *   Neighbours are examined in the model's adjacency insertion order and nothing
 *   else — no `Set`/`Map` iteration order decides the output. The source is
 *   discovered inside the model, and the `Set` is used only for O(1) membership,
 *   never iterated (NFR-C2, A2 §3.7). The same input therefore yields a
 *   byte-identical trace, which the golden test locks.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM. Cost shown: Θ(V+E) time, O(V)
 *   space.
 */

import {
  applyGraphDelta,
  hasVertex,
  neighbourIdsOf,
  type GraphModel,
} from '../../model/graph'
import type { GenerateSummary, NodeId, Step, TraceEdge } from '../../trace/step'

export const OPERATION_ID = 'bfs'

export type BfsRequest = { source: NodeId }

export type BfsResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: GraphModel
  /** Vertices in dequeue order. */
  order: NodeId[]
  /** Shortest edge counts from the source, for reachable vertices only. */
  distances: Record<NodeId, number>
  /** The shortest-path tree: parent of each reachable vertex (`null` for the source). */
  parents: Record<NodeId, NodeId | null>
}

export function bfs(graph: GraphModel, request: BfsRequest): BfsResult {
  const steps: Step[] = []
  const order: NodeId[] = []
  const distances: Record<NodeId, number> = {}
  const parents: Record<NodeId, NodeId | null> = {}

  // Discovery order, kept as an array so `aux.visited` is stable and serialisable.
  // `seen` is the O(1) membership test; it is never iterated, so its ordering can
  // never influence the trace.
  const visited: NodeId[] = []
  const seen = new Set<NodeId>()

  // FIFO queue as array + head index (O(1) dequeue, unlike Array.shift()).
  const queue: NodeId[] = []
  let head = 0
  let comparisons = 0

  const queueContents = (): NodeId[] => queue.slice(head)

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
        nodes: [...visited],
        ...(active === null ? {} : { active }),
        edges,
      },
      delta: {},
      aux: {
        kind: 'queue',
        values: queueContents(),
        visited: [...visited],
        comparisons,
      },
    })
  }

  // A start vertex that is not in the graph is a degenerate-but-total result: the
  // reachable set is empty. (Input validation normally prevents this; ER9.)
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
      distances,
      parents,
    }
  }

  // line 3 — mark the source on discovery (not on dequeue; marking late would let
  // one vertex enter the queue twice and break the O(V+E) bound).
  seen.add(request.source)
  visited.push(request.source)
  distances[request.source] = 0
  parents[request.source] = null
  queue.push(request.source)
  record(
    3,
    `Mark ${request.source} discovered at distance 0 and enqueue it. Discovery is what prevents a vertex from entering the queue twice.`,
    request.source,
    [],
  )

  while (head < queue.length) {
    const current = queue[head]
    head += 1
    order.push(current)

    // line 6 — dequeue and visit. The queue shown is the state *after* the
    // dequeue, which is the state at the moment the visit is happening.
    record(
      6,
      `Dequeue ${current} (distance ${distances[current]}) and visit it. Its neighbours are examined next.`,
      current,
      [],
    )

    // line 7 — adjacency insertion order, exactly as the model stores it.
    for (const neighbour of neighbourIdsOf(graph, current)) {
      comparisons += 1
      const edge: TraceEdge = { from: current, to: neighbour }

      // line 7 — every edge is examined, even when it leads to a visited vertex.
      record(7, `Examine edge ${current} → ${neighbour}.`, current, [edge])

      if (seen.has(neighbour)) continue

      // line 9 — first discovery: mark, enqueue, and record the distance and
      // parent that make this a shortest-path tree.
      seen.add(neighbour)
      visited.push(neighbour)
      distances[neighbour] = distances[current] + 1
      parents[neighbour] = current
      queue.push(neighbour)
      record(
        9,
        `Discover ${neighbour} via ${current} at distance ${distances[neighbour]}; mark it and enqueue it.`,
        neighbour,
        [edge],
      )
    }
  }

  // line 11 — the frontier has drained, so every reachable vertex has been visited.
  record(
    11,
    `The queue is empty, so the reachable component is exhausted. Visit order: ${order.join(', ')}.`,
    null,
    [],
  )

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons,
      conclusion: `BFS from ${request.source} visited ${order.length} of ${graph.vertices.length} vertex/vertices, examining ${comparisons} edge(s) — Θ(V+E).`,
    },
    finalState: applyGraphDelta(graph, {}),
    order,
    distances,
    parents,
  }
}
