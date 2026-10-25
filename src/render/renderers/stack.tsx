/**
 * Stack renderer — SVG for the array-backed LIFO stack.
 *
 * WHAT IT DOES
 *   Draws the stack as a vertical array with slot 0 at the bottom and an explicit
 *   `top` pointer beside the top cell. Three transient states are drawn honestly:
 *
 *     pending slot   top has advanced but the value is not written yet (push
 *                    line 4): dashed cell with `reserved`;
 *     detached cell  the old top after `top ← top - 1` (pop line 5): faded and
 *                    dashed, removed on the next step;
 *     free slot      a cell inside capacity with no value: faint outline.
 *
 *   The top marker is the whole teaching point: push, pop and peek are O(1)
 *   because they touch this one end, and the drawing has to show that rather than
 *   imply it (A2 §4.2).
 *
 * WHY THIS FILE EXISTS
 *   One renderer per structure (A2 Listing 18). It is a pure
 *   `(stateAtI, step) -> JSX` component: React owns every SVG element, no D3 and
 *   no DOM writes, and it never owns the step index or a timer (`ADR-2`).
 *
 * RULES
 *   State is conveyed by labels and shapes as well as colour (`NFR-U2`). All
 *   colours come from the semantic tokens in `src/index.css`, never literal hex.
 *   Geometry is view state and never read by an algorithm.
 */

import { type StackModel, stackSize } from '../../core/model/stack'
import type { Step } from '../../core/trace/step'
import { STACK_LAYOUT } from '../layout/scales'

export type StackRendererProps = {
  state: StackModel
  step: Step | undefined
}

const CELL_FILL = {
  idle: 'var(--color-node-undiscovered)',
  touched: 'var(--color-node-frontier)',
  current: 'var(--color-node-current)',
  detached: 'var(--color-raised)',
  free: 'var(--color-base-deep)',
} as const

const CELL_INK = {
  idle: 'var(--color-ink)',
  touched: 'var(--color-node-ink)',
  current: 'var(--color-node-ink)',
  detached: 'var(--color-muted)',
  free: 'var(--color-subtle)',
} as const

type CellKind = keyof typeof CELL_FILL

/** Fits `slotCount` cells into the viewport, from the bottom up. */
function geometry(slotCount: number): {
  cellHeight: number
  gap: number
  yFor(index: number): number
  centerYFor(index: number): number
} {
  const slots = Math.max(1, slotCount)
  const usable = STACK_LAYOUT.baseY - STACK_LAYOUT.topY
  const gap = slots <= 1 ? 0 : STACK_LAYOUT.gap
  const rawHeight = usable / slots - gap
  const cellHeight = Math.max(
    STACK_LAYOUT.minCellHeight,
    Math.min(STACK_LAYOUT.maxCellHeight, rawHeight),
  )

  const yFor = (index: number): number =>
    STACK_LAYOUT.baseY - (index + 1) * cellHeight - index * gap

  return {
    cellHeight,
    gap,
    yFor,
    centerYFor(index) {
      return yFor(index) + cellHeight / 2
    },
  }
}

function valueFontSize(value: unknown, cellHeight: number): number {
  const length = String(value).length
  const base = Math.max(9, Math.min(18, cellHeight * 0.42))
  if (length <= 3) return base
  return length === 4 ? base - 1 : base - 2
}

export function StackRenderer({ state, step }: StackRendererProps) {
  const size = stackSize(state)
  const slots = Math.max(state.entries.length, state.top + 1, 1)
  const layout = geometry(slots)
  const activeId = step?.highlight.active
  const touched = step?.highlight.nodes ?? []
  const activeIndices = step?.aux?.indices ?? []
  const topValue = size > 0 ? state.entries[state.top]?.value : undefined
  const filled = Math.min(size, state.entries.length)
  const topLabel =
    topValue === undefined ? 'reserved top slot' : `top ${String(topValue)}`

  const centerX = STACK_LAYOUT.width / 2
  const left = centerX - STACK_LAYOUT.cellWidth / 2
  const right = centerX + STACK_LAYOUT.cellWidth / 2

  return (
    <svg
      viewBox={`0 0 ${STACK_LAYOUT.width} ${STACK_LAYOUT.height}`}
      className="h-auto w-full"
      role="img"
      aria-label={
        filled === 0
          ? 'Stack with 0 entries (empty)'
          : `Stack with ${filled} ${
              filled === 1 ? 'entry' : 'entries'
            }, ${topLabel}`
      }
    >
      <text
        x={20}
        y={20}
        fontSize="12"
        fill="var(--color-muted)"
        fontFamily="monospace"
      >
        size {size} / capacity {state.capacity} · slot 0 at the bottom
      </text>

      {Array.from({ length: slots }, (_, index) => {
        const entry = state.entries[index]
        const isTop = index === state.top
        const isDetached = entry !== undefined && index > state.top
        const isPending = entry === undefined && index === state.top
        const isFree = entry === undefined && !isPending
        const isActive = entry !== undefined && entry.id === activeId
        const isTouched = entry !== undefined && touched.includes(entry.id)
        const isMarked = activeIndices.includes(index)

        const kind: CellKind =
          isPending || isFree
            ? 'free'
            : isDetached
              ? 'detached'
              : isActive
                ? 'current'
                : isTouched || isMarked
                  ? 'touched'
                  : 'idle'

        const y = layout.yFor(index)
        const centerY = layout.centerYFor(index)
        const dashed = isPending || isFree || isDetached
        const fontSize = valueFontSize(entry?.value ?? '', layout.cellHeight)
        const stateLabel = isPending
          ? 'reserved top slot'
          : isDetached
            ? 'above top, leaving'
            : isFree
              ? 'free slot'
              : isTop
                ? 'top'
                : index === 0
                  ? 'bottom'
                  : 'in stack'

        return (
          <g key={entry?.id ?? `slot-${index}`}>
            <title>
              {entry === undefined
                ? `slot ${index} — ${stateLabel}`
                : `slot ${index} — value ${String(entry.value)}, ${stateLabel}`}
            </title>

            <rect
              x={left}
              y={y}
              width={STACK_LAYOUT.cellWidth}
              height={layout.cellHeight}
              rx={Math.min(8, layout.cellHeight / 3)}
              fill={CELL_FILL[kind]}
              stroke={
                isActive
                  ? 'var(--color-accent)'
                  : isTop
                    ? 'var(--color-ink)'
                    : 'var(--color-node-stroke)'
              }
              strokeWidth={isActive || isTop ? 2.5 : 1.5}
              strokeDasharray={dashed ? '6 4' : undefined}
              opacity={isDetached ? 0.55 : 1}
            />

            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight="600"
              fill={CELL_INK[kind]}
            >
              {entry === undefined
                ? isPending
                  ? 'reserved'
                  : 'free'
                : String(entry.value)}
            </text>

            <text
              x={left - 8}
              y={centerY}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="10"
              fill="var(--color-subtle)"
              fontFamily="monospace"
            >
              [{index}]
            </text>

            {isTop && (
              <g>
                <line
                  x1={right + 8}
                  y1={centerY}
                  x2={right + STACK_LAYOUT.markerGap}
                  y2={centerY}
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                />
                <text
                  x={right + STACK_LAYOUT.markerGap + 6}
                  y={centerY}
                  dominantBaseline="central"
                  fontSize="13"
                  fontWeight="700"
                  fill="var(--color-accent)"
                >
                  top
                </text>
              </g>
            )}
          </g>
        )
      })}

      {size === 0 && (
        <g>
          <text
            x={right + STACK_LAYOUT.markerGap + 6}
            y={layout.centerYFor(0)}
            dominantBaseline="central"
            fontSize="13"
            fontWeight="700"
            fill="var(--color-accent)"
          >
            top = -1
          </text>
          <text
            x={centerX}
            y={STACK_LAYOUT.baseY + 20}
            textAnchor="middle"
            fontSize="12"
            fill="var(--color-muted)"
          >
            empty stack: push writes at slot 0, pop and peek return null
          </text>
        </g>
      )}
    </svg>
  )
}
