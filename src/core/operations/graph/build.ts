/**
 * `graphBuild` — build a graph by adding its edges **one at a time**.
 *
 * WHAT IT DOES
 *   Starts from a graph with the declared vertices and no edges, then adds one
 *   edge per step (including the reverse adjacency when the graph is undirected).
 *   The adjacency lists grow edge by edge, so the construction is visible and the
 *   neighbour order the traversals will follow is shown being established.
 *
 * WHY THIS FILE EXISTS
 *   Neighbour order is the thing that makes a traversal reproducible (A2 §3.7): the
 *   order edges are added *is* the order BFS/DFS examines neighbours. Showing the
 *   build is how that stops being an invisible implementation detail.
 *
 * EDGE WEIGHTS
 *   The trace contract's `TraceEdge` has no weight field, so a weighted edge is
 *   added unweighted here; BFS is unweighted-only anyway (A1 FR12) and the renderer
 *   does not draw weights. Weights remain in the validated request for a future
 *   weighted algorithm, but they are not part of this construction.
 *
 * RULES
 *   No React, D3, `render/`, `ui/`, timers or DOM; deterministic. Every step's
 *   `operation` is `graphBuild`, so the code panel shows the add-edge loop
 *   (ADR-6, NFR-C2).
 */

import {
  applyGraphDelta,
  buildGraphFromLabels,
  type GraphModel,
} from '../../model/graph'
import type {
  GenerateSummary,
  NodeId,
  Step,
  StructureDelta,
} from '../../trace/step'

export const OPERATION_ID = 'graphBuild'

export type GraphBuildEdge = { from: string; to: string; weight?: number }

export type GraphBuildRequest = {
  /** Vertex labels, in first-appearance order; ids are assigned `v1, v2, …`. */
  labels: readonly string[]
  edges: readonly GraphBuildEdge[]
  directed: boolean
}

export type GraphBuildResult = {
  trace: Step[]
  summary: GenerateSummary
  finalState: GraphModel
}

export function graphBuild(request: GraphBuildRequest): GraphBuildResult {
  const { labels, edges, directed } = request

  // Start from the vertices only: their ids and labels are already final, so the
  // per-edge deltas only ever add adjacency. This keeps each step's delta small and
  // its meaning exact ("this edge appeared").
  const initial = buildGraphFromLabels(labels, [], { directed })
  const idByLabel = new Map<string, NodeId>(
    labels.map((label, index) => [label, `v${index + 1}`]),
  )

  const steps: Step[] = []
  let graph = initial

  edges.forEach((edge, position) => {
    const from = idByLabel.get(edge.from) as NodeId
    const to = idByLabel.get(edge.to) as NodeId
    const delta: StructureDelta = { linked: [{ from, to }] }
    graph = applyGraphDelta(graph, delta)

    steps.push({
      index: steps.length,
      operation: OPERATION_ID,
      codeLine: 6,
      narration: `Add edge ${edge.from}-${edge.to} (${position + 1} of ${edges.length})${
        directed ? '' : ' in both directions'
      }. The neighbour order BFS/DFS will use is now fixed by insertion order.`,
      highlight: { nodes: [from, to], active: to, edges: [{ from, to }] },
      delta,
      aux: { kind: 'array', values: [...labels], comparisons: 0 },
    })
  })

  steps.push({
    index: steps.length,
    operation: OPERATION_ID,
    codeLine: 8,
    narration: `The graph is built: ${labels.length} vertex/vertices and ${edges.length} edge(s).`,
    highlight: { nodes: [], edges: [] },
    delta: {},
    aux: { kind: 'array', values: [...labels], comparisons: 0 },
  })

  return {
    trace: steps,
    summary: {
      steps: steps.length,
      comparisons: 0,
      conclusion:
        edges.length === 0
          ? `Created ${labels.length} isolated vertex/vertices.`
          : `Added ${edges.length} edge(s) one at a time over ${labels.length} vertex/vertices — the adjacency order is now fixed.`,
    },
    finalState: graph,
  }
}
