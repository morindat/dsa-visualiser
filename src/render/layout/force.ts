/**
 * Graph layout — stationary geometry for the graph view.
 *
 * WHAT GOES HERE
 *   `layoutGraph(model, sourceId?)` returns a position for every vertex. When a
 *   traversal source is supplied, vertices are placed in rows by BFS distance from
 *   that source: the source on top, its neighbours on the next row, and so on.
 *   Without a source (graph construction), the deterministic ellipse is used.
 *
 * WHY THIS FILE EXISTS
 *   Graph layout is view state and explicitly **not** algorithm input (`A1 §6.3`,
 *   `FR12`). Keeping it here means a layout tweak can never alter a BFS/DFS result,
 *   and the graph renderer never reads a coordinate from the model.
 *
 * WHY TWO LAYOUTS
 *   A circle is stable while the user adds edges one at a time, but it makes a
 *   traversal graph hard to read because edges cross in every direction. A layered
 *   layout exposes the thing BFS teaches — distance rings — and keeps DFS's depth
 *   visible as vertical movement. The layered mode is only used when the caller has
 *   a traversal source, so graph construction keeps the stable ellipse.
 *
 * DETERMINISM
 *   Layers come from the model's adjacency insertion order; rows are fixed; no
 *   randomness and no clock. A disconnected graph or an unknown source falls back
 *   to the ellipse, which is also deterministic. The renderer therefore remains a
 *   pure function of `(model, step, sourceId)` (`A2 §3.7`, `NFR-C2`).
 *
 * RULES
 *   Return plain coordinates, never mutate the model, never touch the DOM
 *   (`ADR-2`). The padding and radii keep every circle fully inside the drawing
 *   viewport.
 */

import type { GraphModel } from '../../core/model/graph'
import type { NodeId } from '../../core/trace/step'
import { GRAPH_LAYOUT, type Point } from './scales'

/** Deterministic ellipse used for construction and as a fallback. */
function ellipseLayout(model: GraphModel): Record<NodeId, Point> {
  const count = model.vertices.length
  if (count === 0) return {}

  const centreX = GRAPH_LAYOUT.width / 2
  const centreY = GRAPH_LAYOUT.height / 2

  if (count === 1) {
    return { [model.vertices[0].id]: { x: centreX, y: centreY } }
  }

  // The padding is measured from the circle edge, so a node's full radius stays
  // inside the viewport even on the extreme top/bottom/left/right points.
  const radiusX =
    GRAPH_LAYOUT.width / 2 - GRAPH_LAYOUT.padding - GRAPH_LAYOUT.nodeRadius
  const radiusY =
    GRAPH_LAYOUT.height / 2 - GRAPH_LAYOUT.padding - GRAPH_LAYOUT.nodeRadius

  const positions: Record<NodeId, Point> = {}
  model.vertices.forEach((vertex, index) => {
    // Start at the top and go clockwise; the order is the model order, so it is
    // stable across every step of the trace.
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count
    positions[vertex.id] = {
      x: Math.round(centreX + radiusX * Math.cos(angle)),
      y: Math.round(centreY + radiusY * Math.sin(angle)),
    }
  })
  return positions
}

/**
 * Rows by BFS distance from `sourceId`. Returns `null` when the graph is
 * disconnected from that source, because leaving some vertices off-screen would
 * be worse than the ellipse fallback.
 */
function layeredLayout(
  model: GraphModel,
  sourceId: NodeId,
): Record<NodeId, Point> | null {
  if (!model.vertices.some((vertex) => vertex.id === sourceId)) return null

  const neighboursById = new Map<NodeId, NodeId[]>(
    model.adjacency.map((record) => [
      record.id,
      record.neighbours.map((neighbour) => neighbour.to),
    ]),
  )

  const seen = new Set<NodeId>([sourceId])
  const layers: NodeId[][] = []
  let frontier: NodeId[] = [sourceId]

  while (frontier.length > 0) {
    layers.push(frontier)
    const next: NodeId[] = []
    for (const id of frontier) {
      for (const neighbour of neighboursById.get(id) ?? []) {
        if (seen.has(neighbour)) continue
        seen.add(neighbour)
        next.push(neighbour)
      }
    }
    frontier = next
  }

  if (seen.size !== model.vertices.length) return null

  const centreX = GRAPH_LAYOUT.width / 2
  const left = GRAPH_LAYOUT.padding + GRAPH_LAYOUT.nodeRadius
  const right =
    GRAPH_LAYOUT.width - GRAPH_LAYOUT.padding - GRAPH_LAYOUT.nodeRadius
  const top = GRAPH_LAYOUT.padding + GRAPH_LAYOUT.nodeRadius
  const bottom =
    GRAPH_LAYOUT.height - GRAPH_LAYOUT.padding - GRAPH_LAYOUT.nodeRadius
  const span = right - left
  const rowStep = layers.length <= 1 ? 0 : (bottom - top) / (layers.length - 1)

  const positions: Record<NodeId, Point> = {}
  layers.forEach((layer, layerIndex) => {
    // Keep rows compact enough that labels stay readable; the 180 cap means a
    // two-vertex row does not stretch to the full width.
    const spacing =
      layer.length <= 1 ? 0 : Math.min(span / (layer.length - 1), 180)
    const start = centreX - (spacing * (layer.length - 1)) / 2
    layer.forEach((id, index) => {
      positions[id] = {
        x: Math.round(start + index * spacing),
        y: Math.round(top + layerIndex * rowStep),
      }
    })
  })
  return positions
}

/**
 * Deterministic positions for every vertex, keyed by id. Pass a traversal source
 * to get BFS-distance rows; omit it for the stable ellipse used while building.
 */
export function layoutGraph(
  model: GraphModel,
  sourceId?: NodeId,
): Record<NodeId, Point> {
  if (sourceId !== undefined) {
    const layered = layeredLayout(model, sourceId)
    if (layered !== null) return layered
  }
  return ellipseLayout(model)
}
