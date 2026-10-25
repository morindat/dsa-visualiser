/**
 * List renderer — SVG for the linked list.
 *
 * WHAT IT DOES
 *   A pure `(stateAtI, step) -> JSX` component: nodes in list order, the `next`
 *   arrows between them, the `head` pointer, and the current step's highlight set.
 *   A node that exists but is not linked yet is drawn as *floating* above the row.
 *
 * WHY THIS FILE EXISTS
 *   One renderer per structure (A2 Listing 18). Because node ids are stable across
 *   steps, a node moves instead of being recreated, so the animation reads as a
 *   pointer change rather than a redraw (A1 §6.3, FR8).
 *
 * RULES
 *   React owns every SVG element; D3 is not used here at all — the coordinates
 *   come from `render/layout/scales` (`ADR-2`). The component receives the state
 *   and the step, and never owns the step index or a timer. The node value is the
 *   only text drawn inside a node; state comes from fill, the active ring, the
 *   legend and the accessible `<title>` (`NFR-U2`). Colours come from the design
 *   tokens in `src/index.css` via `var(--color-*)`, never from literal hex.
 */

import {
  type LinkedListModel,
  orderFromHead,
} from '../../core/model/linkedList'
import type { Step } from '../../core/trace/step'
import { LIST_LAYOUT, layoutRow, type Point } from '../layout/scales'

export type ListRendererProps = {
  state: LinkedListModel
  step: Step | undefined
}

const NODE_FILL = {
  undiscovered: 'var(--color-node-undiscovered)',
  touched: 'var(--color-node-frontier)',
  current: 'var(--color-node-current)',
} as const

/** Ink that stays readable on each fill (light on dark fills, dark on bright). */
const NODE_INK = {
  undiscovered: 'var(--color-ink)',
  touched: 'var(--color-node-ink)',
  current: 'var(--color-node-ink)',
} as const

/* Non-text graphics only need 3:1 (WCAG 1.4.11); `subtle` gives 5.81:1. */
const EDGE = 'var(--color-subtle)'
const EDGE_ACTIVE = 'var(--color-accent)'

/** Long values get a smaller face so they stay inside the circle. */
function valueFontSize(value: unknown, base: number): number {
  const length = String(value).length
  if (length <= 2) return base
  return length === 3 ? base - 2 : base - 4
}

export function ListRenderer({ state, step }: ListRendererProps) {
  const ordered = orderFromHead(state)
  const floating = state.nodes
    .map((node) => node.id)
    .filter((id) => !ordered.includes(id))

  // The row gives every link a visible shaft: the radius is chosen so two
  // neighbouring circles leave a real gap for the arrow, not just an arrowhead.
  const rowWidth = LIST_LAYOUT.width - 2 * LIST_LAYOUT.margin
  const spacing =
    ordered.length > 1 ? rowWidth / (ordered.length - 1) : rowWidth
  const radius = Math.max(10, Math.min(24, Math.floor((spacing - 22) / 2)))

  const positions: Record<string, Point> = {
    ...layoutRow(ordered, LIST_LAYOUT.rowY),
    ...layoutRow(floating, LIST_LAYOUT.floatY),
  }

  const activeId = step?.highlight.active
  const touched = step?.highlight.nodes ?? []
  const activeEdges = step?.highlight.edges ?? []
  const headPosition = state.head === null ? undefined : positions[state.head]

  // The three-pointer walk (list `reverse`) sends its variables as aux data. A
  // pointer is not an edge, so it is drawn as a small badge under the node it
  // names. Badges stack when two roles name the same node (`prev` and `current`
  // coincide on the step after the flip).
  const pointerRoles: Record<string, { role: string; color: string }[]> = {}
  if (step?.aux?.kind === 'pointers') {
    for (const pointer of step.aux.pointers ?? []) {
      if (pointer.id === null) continue
      const color =
        pointer.role === 'prev'
          ? 'var(--color-info)'
          : pointer.role === 'current'
            ? 'var(--color-accent)'
            : 'var(--color-warn)'
      ;(pointerRoles[pointer.id] ??= []).push({
        role: pointer.role,
        color,
      })
    }
  }

  return (
    <svg
      viewBox={`0 0 ${LIST_LAYOUT.width} ${LIST_LAYOUT.height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Linked list with ${ordered.length} linked node(s)`}
    >
      <defs>
        <marker
          id="list-arrow"
          viewBox="0 0 12 12"
          refX="10.5"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M 1 1 L 11 6 L 1 11 L 3.5 6 Z" fill={EDGE} />
        </marker>
        <marker
          id="list-arrow-active"
          viewBox="0 0 12 12"
          refX="10.5"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M 1 1 L 11 6 L 1 11 L 3.5 6 Z" fill={EDGE_ACTIVE} />
        </marker>
      </defs>

      {headPosition !== undefined && (
        <g>
          <text
            x={headPosition.x}
            y={headPosition.y - radius - 22}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="var(--color-ink)"
          >
            head
          </text>
          <line
            x1={headPosition.x}
            y1={headPosition.y - radius - 18}
            x2={headPosition.x}
            y2={headPosition.y - radius - 6}
            stroke="var(--color-ink)"
            strokeWidth="2"
            markerEnd="url(#list-arrow)"
          />
        </g>
      )}

      {state.links.map((link) => {
        const from = positions[link.from]
        const to = positions[link.to]
        if (from === undefined || to === undefined) return null

        const dx = to.x - from.x
        const dy = to.y - from.y
        const distance = Math.hypot(dx, dy) || 1
        const isActive = activeEdges.some(
          (edge) => edge.from === link.from && edge.to === link.to,
        )

        return (
          <line
            key={`${link.from}->${link.to}`}
            x1={from.x + (dx / distance) * (radius + 2)}
            y1={from.y + (dy / distance) * (radius + 2)}
            x2={to.x - (dx / distance) * (radius + 3)}
            y2={to.y - (dy / distance) * (radius + 3)}
            stroke={isActive ? EDGE_ACTIVE : EDGE}
            strokeWidth={isActive ? 2.6 : 2}
            strokeLinecap="round"
            markerEnd={`url(#${isActive ? 'list-arrow-active' : 'list-arrow'})`}
          />
        )
      })}

      {state.nodes.map((node) => {
        const point = positions[node.id]
        if (point === undefined) return null

        const isActive = node.id === activeId
        const isTouched = !isActive && touched.includes(node.id)
        const isFloating = floating.includes(node.id)
        const kind: keyof typeof NODE_FILL = isActive
          ? 'current'
          : isTouched
            ? 'touched'
            : 'undiscovered'
        const stateLabel = isActive
          ? 'current'
          : isTouched
            ? 'touched'
            : isFloating
              ? 'floating'
              : 'idle'

        return (
          <g key={node.id} transform={`translate(${point.x} ${point.y})`}>
            <title>{`${node.id} — value ${String(node.value)}, ${stateLabel}`}</title>
            {isActive && (
              <circle
                r={radius + 6}
                fill="none"
                stroke="var(--color-node-current)"
                strokeWidth={2}
                strokeDasharray="5 4"
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
              fontSize={valueFontSize(
                node.value,
                Math.round(Math.max(9, Math.min(15, radius * 0.62))),
              )}
              fontWeight="600"
              fill={NODE_INK[kind]}
            >
              {String(node.value)}
            </text>
            {(pointerRoles[node.id] ?? []).map((pointer, offset) => {
              const badgeY = radius + 12 + offset * 15
              return (
                <g key={`${node.id}-${pointer.role}`}>
                  <rect
                    x={-21}
                    y={badgeY - 7}
                    width={42}
                    height={14}
                    rx={7}
                    fill="var(--color-surface)"
                    stroke={pointer.color}
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={badgeY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="8"
                    fontWeight="700"
                    fill={pointer.color}
                  >
                    {pointer.role}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
