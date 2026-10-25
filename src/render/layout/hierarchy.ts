/**
 * Hierarchy layout — tree geometry, computed as pure functions.
 *
 * WHAT GOES HERE
 *   Pure functions that turn a tree into node positions:
 *
 *   - `layoutTree(model)` — the BST, laid out by in-order rank horizontally and
 *     depth vertically, so a left child is always left of its parent;
 *   - `layoutHeapTree(size)` — the heap's tree projection, laid out as a fixed
 *     complete binary tree (`i → 2i+1, 2i+2`), so slot positions depend only on
 *     the index and never jump when a sibling appears.
 *
 * WHY THIS FILE EXISTS
 *   Geometry belongs in `render/layout/`, never in `core/model/` — vertex positions
 *   are **view state**, and an algorithm that read them would change behaviour when
 *   the picture changed, breaking determinism (`A1 §6.3`, `NFR-C2`).
 *
 * WHY NOT `d3.tree()` HERE
 *   `d3.tree()` centres a parent over its only child. A heap with two entries then
 *   draws slot 1 directly below slot 0, and a BST with one left child draws it below
 *   the root instead of to the left. That is wrong for a binary tree: an only child
 *   still occupies a specific left/right slot. The layouts below encode the slot
 *   structure directly, which also keeps every node inside the viewport.
 *
 * RULES
 *   Pure data in, plain coordinates out. Deterministic for a given tree, with cycle
 *   guards so a corrupted model terminates rather than recursing forever.
 */

import { bstNodeById, type BinarySearchTree } from '../../core/model/bst'
import type { NodeId } from '../../core/trace/step'
import { HEAP_LAYOUT, TREE_LAYOUT, type Point } from './scales'

/** A laid-out tree plus the viewport that contains it. */
export type TreeLayout = {
  width: number
  height: number
  positions: Record<NodeId, Point>
}

/** A laid-out heap tree plus the array row's shared viewport. */
export type HeapTreeLayout = {
  width: number
  height: number
  arrayY: number
  positions: Record<number, Point>
}

/** Minimum horizontal distance between two adjacent node centres. */
const MIN_X_GAP = 48

/** Minimum vertical distance between two levels. */
const MIN_Y_GAP = 56

/** Heap levels are a little tighter than BST levels; the radius is smaller too. */
const HEAP_Y_GAP = 54

/** Extra vertical room between the deepest tree row and the array row. */
const ARRAY_GAP = 56

/**
 * Positions for the BST's nodes, keyed by node id.
 *
 * Horizontal position is the node's in-order rank: every node in the left subtree
 * is to the left of the root and every node in the right subtree is to the right.
 * Vertical position is depth. The viewport grows when the tree is tall or wide, so
 * the degenerate-chain preset stays readable instead of collapsing into overlap.
 * An empty tree returns `{}`.
 */
export function layoutTree(model: BinarySearchTree): TreeLayout {
  const empty: TreeLayout = {
    width: TREE_LAYOUT.width,
    height: TREE_LAYOUT.height,
    positions: {},
  }
  if (model.root === null) return empty

  const entries: { id: NodeId; depth: number }[] = []
  const seen = new Set<NodeId>()

  const walk = (id: NodeId | null, depth: number): void => {
    if (id === null || seen.has(id)) return
    const node = bstNodeById(model, id)
    if (node === undefined) return
    seen.add(id)
    walk(node.left, depth + 1)
    entries.push({ id, depth })
    walk(node.right, depth + 1)
  }
  walk(model.root, 0)

  if (entries.length === 0) return empty

  const count = entries.length
  const maxDepth = entries.reduce((max, entry) => Math.max(max, entry.depth), 0)

  // Grow the canvas only when the current node count would make circles touch.
  const width = Math.max(
    TREE_LAYOUT.width,
    2 * TREE_LAYOUT.margin + count * MIN_X_GAP,
  )
  const height = Math.max(
    TREE_LAYOUT.height,
    2 * TREE_LAYOUT.margin + Math.max(maxDepth, 1) * MIN_Y_GAP,
  )

  const usableWidth = width - 2 * TREE_LAYOUT.margin
  const usableHeight = height - 2 * TREE_LAYOUT.margin
  const rowGap = maxDepth === 0 ? 0 : usableHeight / maxDepth
  const columnGap = usableWidth / count

  const positions: Record<NodeId, Point> = {}
  entries.forEach((entry, rank) => {
    positions[entry.id] = {
      x: Math.round(TREE_LAYOUT.margin + (rank + 0.5) * columnGap),
      y: Math.round(TREE_LAYOUT.margin + entry.depth * rowGap),
    }
  })

  return { width, height, positions }
}

/**
 * Positions for the heap's tree projection, keyed by ARRAY INDEX.
 *
 * Slot `i` sits at level `floor(log2(i + 1))` and at its fixed offset inside that
 * level. Every level spans the full width and its slots are evenly spaced, so the
 * root is centred, slot 1 is always the left child, slot 2 is always the right
 * child, and adding another entry does not move the existing slots. The returned
 * viewport also tells the renderer where to put the array row.
 */
export function layoutHeapTree(size: number): HeapTreeLayout {
  const empty: HeapTreeLayout = {
    width: HEAP_LAYOUT.width,
    height: HEAP_LAYOUT.height,
    arrayY: HEAP_LAYOUT.arrayY,
    positions: {},
  }
  if (size <= 0) return empty

  const levels = Math.floor(Math.log2(size)) + 1
  const deepestSlots = 2 ** (levels - 1)

  // Keep the default width for the shipped 10-value presets. Only very wide
  // levels widen the canvas, so ordinary insertions never resize the picture.
  const width = Math.max(
    HEAP_LAYOUT.width,
    2 * HEAP_LAYOUT.margin + deepestSlots * (2 * HEAP_LAYOUT.nodeRadius + 4),
  )

  const treeBottom = HEAP_LAYOUT.margin + Math.max(levels - 1, 0) * HEAP_Y_GAP
  const arrayY = Math.max(HEAP_LAYOUT.arrayY, treeBottom + ARRAY_GAP)
  const height = Math.max(HEAP_LAYOUT.height, arrayY + 60)
  const usableWidth = width - 2 * HEAP_LAYOUT.margin

  const positions: Record<number, Point> = {}
  for (let index = 0; index < size; index += 1) {
    const depth = Math.floor(Math.log2(index + 1))
    const levelStart = 2 ** depth - 1
    const offset = index - levelStart
    const slotsOnLevel = 2 ** depth
    positions[index] = {
      x: Math.round(
        HEAP_LAYOUT.margin + ((offset + 0.5) / slotsOnLevel) * usableWidth,
      ),
      y: Math.round(HEAP_LAYOUT.margin + depth * HEAP_Y_GAP),
    }
  }

  return { width, height, arrayY, positions }
}
