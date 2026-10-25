/**
 * Heap renderer — the dual rendering of the priority queue.
 *
 * WHAT IT DOES
 *   One SVG showing the same array **twice**: an indexed array row at the bottom,
 *   and the complete binary tree above it. Both are projections of `entries` — the
 *   array row by array index, the tree by the same index (`i → 2i+1, 2i+2`) — so
 *   the two views can never disagree. A sift highlights the same entry in both at
 *   once, which is the structure's teaching centrepiece (A2 §4.3).
 *
 * WHY THIS FILE EXISTS
 *   The priority queue is "one model, two honest renderings": seeing a swap move in
 *   the array *and* in the tree is what makes the O(n) build-heap versus the
 *   O(n log n) of n inserts land (`FR8`, `FR11`). The renderer marks the slots named
 *   by `step.aux.indices` and the entries named by `step.highlight.nodes`.
 *
 * RULES
 *   React owns the SVG; the tree coordinates come from `render/layout/hierarchy`
 *   (D3 computes, React renders — `ADR-2`). The array view is the model; the tree
 *   view is a projection of it, never a second copy. No step index, no timer.
 */

import type { BinaryHeap } from '../../core/model/binaryHeap'
import type { Step } from '../../core/trace/step'
import { layoutHeapTree } from '../layout/hierarchy'
import { HEAP_LAYOUT, layoutColumns, type Point } from '../layout/scales'

export type HeapRendererProps = {
  state: BinaryHeap
  step: Step | undefined
}

const NODE_FILL = {
  undiscovered: 'var(--color-node-undiscovered)',
  frontier: 'var(--color-node-frontier)',
  current: 'var(--color-node-current)',
} as const

const NODE_INK = {
  undiscovered: 'var(--color-ink)',
  frontier: 'var(--color-node-ink)',
  current: 'var(--color-node-ink)',
} as const

const EDGE = 'var(--color-subtle)'
const EDGE_ACTIVE = 'var(--color-accent)'

function parentIndex(index: number): number {
  return Math.floor((index - 1) / 2)
}

/** Long values get a smaller face so they stay inside the circle. */
function valueFontSize(value: unknown, base: number): number {
  const length = String(value).length
  if (length <= 2) return base
  return length === 3 ? base - 2 : base - 4
}

/** Trims a line to a circle's edge. */
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

export function HeapRenderer({ state, step }: HeapRendererProps) {
  const radius = HEAP_LAYOUT.nodeRadius
  const entries = state.entries
  const activeIndices = step?.aux?.indices ?? []
  const highlightedIds = step?.highlight.nodes ?? []
  const activeId = step?.highlight.active

  const treeLayout = layoutHeapTree(entries.length)
  const treePoints = treeLayout.positions
  const arrayPoints = layoutColumns(
    entries.length,
    treeLayout.arrayY,
    treeLayout.width,
    HEAP_LAYOUT.margin,
  )
  const spacing =
    arrayPoints.length > 1
      ? arrayPoints[1].x - arrayPoints[0].x
      : treeLayout.width / 2
  const cellWidth = Math.max(22, Math.min(46, spacing - 6))

  const kindFor = (index: number, id: string): keyof typeof NODE_FILL => {
    if (activeIndices.includes(index) || id === activeId) return 'current'
    if (highlightedIds.includes(id)) return 'frontier'
    return 'undiscovered'
  }

  return (
    <svg
      viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${state.kind}-heap with ${entries.length} entr(ies), drawn as an array and as a tree`}
    >
      <title>
        {`${state.kind}-heap — array and tree are the same entries`}
      </title>

      {/* Tree edges: slot i hangs off slot floor((i-1)/2). */}
      {entries.map((entry, index) => {
        if (index === 0) return null
        const parent = treePoints[parentIndex(index)]
        const child = treePoints[index]
        if (parent === undefined || child === undefined) return null
        const isActive =
          activeIndices.includes(index) ||
          activeIndices.includes(parentIndex(index))
        return (
          <line
            key={`tree-edge-${entry.id}`}
            {...segment(parent, child, radius)}
            stroke={isActive ? EDGE_ACTIVE : EDGE}
            strokeWidth={isActive ? 3 : 1.6}
          />
        )
      })}

      {/* Tree view. */}
      {entries.map((entry, index) => {
        const point = treePoints[index]
        if (point === undefined) return null
        const kind = kindFor(index, entry.id)
        return (
          <g
            key={`tree-${entry.id}`}
            transform={`translate(${point.x} ${point.y})`}
          >
            <title>{`slot ${index} — ${String(entry.value)} (${kind})`}</title>
            <circle
              r={radius}
              fill={NODE_FILL[kind]}
              stroke="var(--color-node-stroke)"
              strokeWidth={1.5}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={valueFontSize(entry.value, 13)}
              fontWeight="600"
              fill={NODE_INK[kind]}
            >
              {String(entry.value)}
            </text>
          </g>
        )
      })}

      {/* Build/extract boundary: point at the root and name what it holds. */}
      {step?.milestone === 'heap-built' && treePoints[0] !== undefined && (
        <g>
          <text
            x={treePoints[0].x}
            y={Math.max(12, treePoints[0].y - radius - 12)}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--color-warn)"
          >
            root · {state.kind === 'min' ? 'minimum' : 'maximum'}
          </text>
          <line
            x1={treePoints[0].x}
            y1={Math.max(16, treePoints[0].y - radius - 9)}
            x2={treePoints[0].x}
            y2={treePoints[0].y - radius - 2}
            stroke="var(--color-warn)"
            strokeWidth="2"
          />
        </g>
      )}

      {/* Array separator + label. */}
      <line
        x1={0}
        y1={treeLayout.arrayY - HEAP_LAYOUT.cellHeight}
        x2={treeLayout.width}
        y2={treeLayout.arrayY - HEAP_LAYOUT.cellHeight}
        stroke="var(--color-line)"
        strokeWidth={1}
      />
      <text
        x={HEAP_LAYOUT.margin}
        y={treeLayout.arrayY - HEAP_LAYOUT.cellHeight - 6}
        fontSize="10"
        fill="var(--color-muted)"
      >
        array (index = tree slot)
      </text>

      {/* Array view: same entries, same indices. */}
      {entries.map((entry, index) => {
        const point = arrayPoints[index]
        if (point === undefined) return null
        const kind = kindFor(index, entry.id)
        return (
          <g
            key={`cell-${entry.id}`}
            transform={`translate(${point.x} ${point.y})`}
          >
            <title>{`array[${index}] = ${String(entry.value)} (${kind})`}</title>
            <rect
              x={-cellWidth / 2}
              y={-HEAP_LAYOUT.cellHeight / 2}
              width={cellWidth}
              height={HEAP_LAYOUT.cellHeight}
              rx={5}
              fill={NODE_FILL[kind]}
              stroke="var(--color-node-stroke)"
              strokeWidth={1}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={valueFontSize(entry.value, 13)}
              fontWeight="600"
              fill={NODE_INK[kind]}
            >
              {String(entry.value)}
            </text>
            <text
              y={HEAP_LAYOUT.cellHeight / 2 + 11}
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-muted)"
            >
              {index}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
