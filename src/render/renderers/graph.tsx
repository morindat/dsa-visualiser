/**
 * Graph renderer — SVG for the graph.
 *
 * WHAT IT DOES
 *   Draws every vertex and edge, with the four traversal states made visible:
 *   *undiscovered* (not in the visited set), *frontier* (the current step's
 *   highlight), *current* (the vertex being expanded) and *visited*. The vertex
 *   label is the only text drawn inside a node; state comes from fill, the active
 *   ring, the legend and the accessible `<title>` (`NFR-U2`, `FR12`).
 *
 * WHY THIS FILE EXISTS
 *   One renderer per structure (A2 Listing 18) and the surface for BFS/DFS. The
 *   frontier is the thing a textbook figure cannot show — BFS grows it sideways and
 *   DFS dives — so the renderer exposes `step.aux.visited` and the step's highlight
 *   directly, rather than inferring anything from the model (`FR10`).
 *
 * RULES
 *   Coordinates come from `render/layout/force` and are view state, never algorithm
 *   input (`A1 §6.3`, `ADR-2`). The layout runs on a copy, so the model and the
 *   traversal result are untouched. No step index, no timer. Colours are tokens.
 */

import { graphEdges, type GraphModel } from '../../core/model/graph'
import type { Step } from '../../core/trace/step'
import { layoutGraph } from '../layout/force'
import { GRAPH_LAYOUT, type Point } from '../layout/scales'

export type GraphRendererProps = {
  state: GraphModel
  step: Step | undefined
  /** The BFS/DFS start vertex, marked above its node for orientation. */
  sourceId?: string
}

const NODE_FILL = {
  undiscovered: 'var(--color-node-undiscovered)',
  frontier: 'var(--color-node-frontier)',
  current: 'var(--color-node-current)',
  visited: 'var(--color-node-visited)',
} as const

const NODE_INK = {
  undiscovered: 'var(--color-ink)',
  frontier: 'var(--color-node-ink)',
  current: 'var(--color-node-ink)',
  visited: 'var(--color-node-ink)',
} as const

const EDGE = 'var(--color-subtle)'
const EDGE_ACTIVE = 'var(--color-orange)'

/** Longer vertex labels get a smaller face so they stay inside the circle. */
function labelFontSize(label: string, base: number): number {
  if (label.length <= 2) return base
  return label.length === 3 ? base - 2 : base - 4
}

/** Trims a line from the centre of one circle to the centre of another. */
function segment(from: Point, to: Point, radius: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  return {
    x1: from.x + (dx / distance) * radius,
    y1: from.y + (dy / distance) * radius,
    x2: to.x - (dx / distance) * radius,
    y2: to.y - (dy / distance) * radius,
  }
}

export function GraphRenderer({ state, step, sourceId }: GraphRendererProps) {
  const radius = GRAPH_LAYOUT.nodeRadius
  const positions = layoutGraph(state, sourceId)
  const edges = graphEdges(state)
  const activeId = step?.highlight.active
  const highlighted = step?.highlight.nodes ?? []
  const visited = step?.aux?.visited ?? []
  const activeEdges = step?.highlight.edges ?? []
  // BFS's `aux.visited` includes everything discovered, so the queue is what
  // actually distinguishes the frontier. Keep those vertices yellow instead of
  // colouring the whole discovered set green.
  const queued =
    step?.aux?.kind === 'queue'
      ? (step.aux.values ?? []).map((value) => String(value))
      : []
  const frontierWord =
    step?.aux?.kind === 'stack'
      ? 'on stack'
      : step?.aux?.kind === 'queue'
        ? 'queued'
        : 'frontier'

  const kindFor = (id: string): keyof typeof NODE_FILL => {
    if (id === activeId) return 'current'
    if (queued.includes(id)) return 'frontier'
    if (visited.includes(id)) return 'visited'
    if (highlighted.includes(id)) return 'frontier'
    return 'undiscovered'
  }

  return (
    <svg
      viewBox={`0 0 ${GRAPH_LAYOUT.width} ${GRAPH_LAYOUT.height}`}
      className="h-auto w-full max-md:w-[700px] max-md:max-w-none"
      role="img"
      aria-label={`Graph with ${state.vertices.length} vertices and ${edges.length} edges${state.directed ? ' (directed)' : ''}`}
    >
      <defs>
        <marker
          id="graph-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE} />
        </marker>
        <marker
          id="graph-arrow-active"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_ACTIVE} />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = positions[edge.from]
        const to = positions[edge.to]
        if (from === undefined || to === undefined) return null
        const isActive = activeEdges.some(
          (candidate) =>
            (candidate.from === edge.from && candidate.to === edge.to) ||
            (candidate.from === edge.to && candidate.to === edge.from),
        )
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            {...segment(from, to, radius)}
            stroke={isActive ? EDGE_ACTIVE : EDGE}
            strokeWidth={isActive ? 3 : 1.6}
            markerEnd={
              state.directed
                ? `url(#${isActive ? 'graph-arrow-active' : 'graph-arrow'})`
                : undefined
            }
          />
        )
      })}

      {state.vertices.map((vertex) => {
        const point = positions[vertex.id]
        if (point === undefined) return null
        const kind = kindFor(vertex.id)
        const stateLabel =
          kind === 'current'
            ? 'current'
            : kind === 'frontier'
              ? frontierWord
              : kind === 'visited'
                ? 'visited'
                : null
        return (
          <g key={vertex.id} transform={`translate(${point.x} ${point.y})`}>
            <title>{`${vertex.label} — ${kind}`}</title>
            {vertex.id === sourceId && (
              <text
                y={-radius - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="var(--color-accent)"
                stroke="var(--color-surface)"
                strokeWidth="3"
                paintOrder="stroke"
              >
                source
              </text>
            )}
            {vertex.id === activeId && (
              <circle
                r={radius + 5}
                fill="none"
                stroke="var(--color-node-current)"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            )}
            {kind === 'frontier' && (
              <circle
                r={radius + 3}
                fill="none"
                stroke={NODE_FILL.frontier}
                strokeWidth={1.5}
                strokeDasharray="2 3"
              />
            )}
            <circle
              r={radius}
              fill={NODE_FILL[kind]}
              stroke="var(--color-node-stroke)"
              strokeWidth={1.5}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={labelFontSize(vertex.label, 14)}
              fontWeight="600"
              fill={NODE_INK[kind]}
            >
              {vertex.label}
            </text>
            {stateLabel !== null && (
              <text
                y={radius + 12}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="var(--color-ink-dim)"
                stroke="var(--color-surface)"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {stateLabel}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
