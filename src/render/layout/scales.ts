/**
 * Scales — coordinate mapping with `d3-scale`.
 *
 * WHAT GOES HERE
 *   The geometry the renderers share. For this slice: mapping list indices onto
 *   evenly spaced x positions, plus the layout constants (radius, rows, margins).
 *
 * WHY THIS FILE EXISTS
 *   Centralising coordinate mapping keeps every renderer using the same
 *   convention, so the same index lands in the same place in the list, the stack,
 *   the heap's array view and the queue panel. Geometry lives in `render/` and
 *   never in `core/`, because positions are view state (A1 §6.3, NFR-C2).
 *
 * RULES
 *   Pure functions returning plain data; `d3-scale` only, never the DOM (ADR-2).
 *   No algorithm knowledge and no step index.
 */

import { scaleLinear } from 'd3-scale'
import type { NodeId } from '../../core/trace/step'

export type Point = { x: number; y: number }

export const LIST_LAYOUT = {
  width: 760,
  height: 220,
  rowY: 140,
  floatY: 46,
  margin: 64,
  nodeRadius: 26,
} as const

/**
 * Stack geometry. The renderer scales the cell height to fit the current entry
 * count inside `height`, so a 10-value preset and a 2-value demo both fit without
 * scrolling. Cells grow upward from `baseY`; `topY` is the smallest allowed top.
 */
export const STACK_LAYOUT = {
  width: 760,
  height: 430,
  baseY: 400,
  topY: 28,
  cellWidth: 210,
  maxCellHeight: 52,
  minCellHeight: 16,
  gap: 6,
  markerGap: 26,
} as const

/**
 * Tree geometry constants. Shared by the BST renderer and the heap's tree
 * projection, so a node radius doesn't differ between two views of a tree.
 */
export const TREE_LAYOUT = {
  width: 760,
  height: 340,
  margin: 40,
  nodeRadius: 20,
} as const

/** Heap constants: one SVG holds the array row *and* the tree above it. */
export const HEAP_LAYOUT = {
  width: 760,
  height: 400,
  margin: 40,
  nodeRadius: 17,
  arrayY: 340,
  cellHeight: 32,
} as const

/** Graph viewport. The force layout is bounded by these numbers. */
export const GRAPH_LAYOUT = {
  width: 760,
  height: 430,
  nodeRadius: 20,
  padding: 54,
} as const

/** Evenly spaces `ids` across the drawing width at row `y`. */
export function layoutRow(
  ids: readonly NodeId[],
  y: number,
): Record<NodeId, Point> {
  const positions: Record<NodeId, Point> = {}
  if (ids.length === 0) return positions

  if (ids.length === 1) {
    positions[ids[0]] = { x: LIST_LAYOUT.width / 2, y }
    return positions
  }

  const x = scaleLinear()
    .domain([0, ids.length - 1])
    .range([LIST_LAYOUT.margin, LIST_LAYOUT.width - LIST_LAYOUT.margin])

  ids.forEach((id, index) => {
    positions[id] = { x: Math.round(x(index)), y }
  })
  return positions
}

/**
 * Evenly spaces `count` positions by INDEX (not by id) across the drawing width at
 * row `y`. The heap's array view needs this: its cells are identified by array
 * index, which is also tree slot, and the two must line up.
 */
export function layoutColumns(
  count: number,
  y: number,
  width: number = LIST_LAYOUT.width,
  margin: number = LIST_LAYOUT.margin,
): Point[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: Math.round(width / 2), y }]

  const x = scaleLinear()
    .domain([0, count - 1])
    .range([margin, width - margin])

  return Array.from({ length: count }, (_, index) => ({
    x: Math.round(x(index)),
    y,
  }))
}
