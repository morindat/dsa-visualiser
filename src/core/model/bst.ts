/**
 * Binary search tree — structure model.
 *
 * WHAT GOES HERE
 *   Recursive node records `{ id, value, left, right }` plus a `root` pointer, the
 *   `applyBstDelta` reducer that replays one step's `StructureDelta`, the pure
 *   reference operations (search / insert / delete / min / max / traversal) used as
 *   the test oracle, and the invariant checks that make "the model is a BST" a
 *   property rather than an assumption.
 *
 * WHY THIS FILE EXISTS
 *   The BST is a catalogue structure (A2 §4.4) and the shared base for all four tree
 *   traversals, so the tree operations, the traversals and the recursion-frame
 *   rendering all read the same model. Two decisions are deliberate here:
 *
 *   - **The node stores only `left` and `right`.** A2 allows an optional `parent`
 *     reference for the algorithms that need it, but the renderer must never see
 *     one: a drawing that included parent edges would show a structure the
 *     algorithms do not traverse (and would make the degenerate-chain lesson
 *     harder to read). Where a parent is needed (`delete`) it is derived with
 *     `parentOf`, which scans the child pointers. That is O(n) rather than O(1),
 *     but it is paid once per deletion, deletion is already O(h), and the model
 *     stays exactly as wide as the picture.
 *
 *   - **The picture is derived from `left`/`right` only.** A stale pointer can
 *     therefore never disagree with the drawing.
 *
 * HOW IT IS SHARED
 *   `core/operations/bst/*` and `core/operations/traverse/*` drive it; the trace
 *   store replays `applyBstDelta` to rebuild the tree at any index; the renderer
 *   reads the rebuilt model. Nothing here knows about any of those callers.
 *
 * RULES
 *   Pure data + invariants. No React, no D3, no `render/`, no `ui/`, no timers, no
 *   layout coordinates, no DOM (ADR-2, ADR-6, NFR-M2, NFR-M3). Deterministic: the
 *   same values inserted in the same order always produce the same ids and the
 *   same shape (NFR-C2).
 */

import {
  FIELD_ID_PREFIX,
  isFieldId,
  type NodeId,
  type StructureDelta,
} from '../trace/step'
import { compareValues, type StructureValue } from './order'

/** A single tree node. `left`/`right` are ids, or `null` for an absent child. */
export type BstNode = {
  id: NodeId
  value: StructureValue
  left: NodeId | null
  right: NodeId | null
}

/**
 * The whole tree at one instant.
 *
 * `nodes` keeps every node currently in the tree, in creation order. A node that
 * has been deleted is gone from this list (the `removed` delta channel), so the
 * model never holds a node the algorithm has forgotten.
 */
export type BinarySearchTree = {
  nodes: BstNode[]
  root: NodeId | null
}

/**
 * The root *pointer* as it appears in a delta's `updated` list. Built from the
 * contract's reserved prefix so it can never collide with a node id (`n1`, …).
 */
export const ROOT_POINTER: NodeId = `${FIELD_ID_PREFIX}root`

export const EMPTY_BST: BinarySearchTree = { nodes: [], root: null }

/**
 * Builds a BST by inserting `values` left to right, exactly as the `insert`
 * operation would, but without emitting a trace.
 *
 * This is the construction path for presets and tests, and the reference
 * implementation the instrumented generator is checked against (NFR-C1).
 * Duplicates are ignored, matching `insert`'s documented policy — the operation
 * makes the duplicate *visible* in its trace, whereas construction silently keeps
 * the first occurrence because there is no user to tell.
 */
export function buildBst(values: readonly StructureValue[]): BinarySearchTree {
  let tree = EMPTY_BST
  for (const value of values) {
    tree = insertValue(tree, value).tree
  }
  return tree
}

/** The next deterministic id — `max(n1…nk) + 1`. */
export function nextBstNodeId(tree: BinarySearchTree): NodeId {
  const highest = tree.nodes.reduce((max, node) => {
    const match = /^n(\d+)$/.exec(node.id)
    return match === null ? max : Math.max(max, Number(match[1]))
  }, 0)
  return `n${highest + 1}`
}

export function bstNodeById(
  tree: BinarySearchTree,
  id: NodeId,
): BstNode | undefined {
  return tree.nodes.find((node) => node.id === id)
}

/** The value of a node, or `undefined` if the id is not in the tree. */
export function bstValueOf(
  tree: BinarySearchTree,
  id: NodeId | null,
): StructureValue | undefined {
  return id === null ? undefined : bstNodeById(tree, id)?.value
}

/**
 * The parent of `id`, derived from the child pointers, or `null` if `id` is the
 * root (or is not in the tree).
 *
 * Derived rather than stored on purpose: see the file header.
 */
export function parentOf(tree: BinarySearchTree, id: NodeId): NodeId | null {
  for (const node of tree.nodes) {
    if (node.left === id || node.right === id) return node.id
  }
  return null
}

/** Which child pointer of its parent reaches `id` — `null` for the root. */
export function childKindOf(
  tree: BinarySearchTree,
  id: NodeId,
): 'left' | 'right' | null {
  for (const node of tree.nodes) {
    if (node.left === id) return 'left'
    if (node.right === id) return 'right'
  }
  return null
}

/** Number of nodes. O(1): `nodes` holds exactly the live nodes. */
export function bstSize(tree: BinarySearchTree): number {
  return tree.nodes.length
}

/**
 * Number of levels on the longest root-to-leaf path: an empty tree is 0, a single
 * node is 1. This is the `h` that every BST bound is written in terms of, and the
 * whole point of the degenerate preset is to make `h` grow linearly.
 */
export function bstHeight(tree: BinarySearchTree): number {
  const walk = (id: NodeId | null, seen: Set<NodeId>): number => {
    if (id === null || seen.has(id)) return 0
    const node = bstNodeById(tree, id)
    if (node === undefined) return 0
    seen.add(id)
    return 1 + Math.max(walk(node.left, seen), walk(node.right, seen))
  }
  return walk(tree.root, new Set())
}

/**
 * Node ids in in-order (left, node, right). A cycle guard makes a corrupted model
 * terminate instead of overflowing the stack, which matters because this is the
 * function the invariant check is built on.
 */
export function inorderNodeIds(tree: BinarySearchTree): NodeId[] {
  const order: NodeId[] = []
  const seen = new Set<NodeId>()

  const walk = (id: NodeId | null): void => {
    if (id === null || seen.has(id)) return
    const node = bstNodeById(tree, id)
    if (node === undefined) return
    seen.add(id)
    walk(node.left)
    order.push(id)
    walk(node.right)
  }

  walk(tree.root)
  return order
}

/** The values in in-order — the sorted view of a valid BST (A2 §3.2). */
export function valuesInOrder(tree: BinarySearchTree): StructureValue[] {
  const values: StructureValue[] = []
  for (const id of inorderNodeIds(tree)) {
    const node = bstNodeById(tree, id)
    if (node !== undefined) values.push(node.value)
  }
  return values
}

/** Node ids in pre-order (node, left, right). */
export function preorderNodeIds(tree: BinarySearchTree): NodeId[] {
  const order: NodeId[] = []
  const seen = new Set<NodeId>()
  const walk = (id: NodeId | null): void => {
    if (id === null || seen.has(id)) return
    const node = bstNodeById(tree, id)
    if (node === undefined) return
    seen.add(id)
    order.push(id)
    walk(node.left)
    walk(node.right)
  }
  walk(tree.root)
  return order
}

/** Node ids in post-order (left, right, node). */
export function postorderNodeIds(tree: BinarySearchTree): NodeId[] {
  const order: NodeId[] = []
  const seen = new Set<NodeId>()
  const walk = (id: NodeId | null): void => {
    if (id === null || seen.has(id)) return
    const node = bstNodeById(tree, id)
    if (node === undefined) return
    seen.add(id)
    walk(node.left)
    walk(node.right)
    order.push(id)
  }
  walk(tree.root)
  return order
}

/** The leftmost node — the minimum under the shared order — or `null`. */
export function minNodeId(tree: BinarySearchTree): NodeId | null {
  let current = tree.root
  let last: NodeId | null = null
  while (current !== null) {
    last = current
    current = bstNodeById(tree, current)?.left ?? null
  }
  return last
}

/** The rightmost node — the maximum under the shared order — or `null`. */
export function maxNodeId(tree: BinarySearchTree): NodeId | null {
  let current = tree.root
  let last: NodeId | null = null
  while (current !== null) {
    last = current
    current = bstNodeById(tree, current)?.right ?? null
  }
  return last
}

/**
 * Untraced search — the reference implementation for the `search` generator.
 * @returns the id of the matching node, or `null` when the value is absent.
 */
export function searchValue(
  tree: BinarySearchTree,
  value: StructureValue,
): NodeId | null {
  let current = tree.root
  while (current !== null) {
    const node = bstNodeById(tree, current)
    if (node === undefined) return null
    const order = compareValues(value, node.value)
    if (order === 0) return node.id
    current = order < 0 ? node.left : node.right
  }
  return null
}

/**
 * Untraced insertion — the reference implementation for the `insert` generator.
 * Duplicates are ignored.
 */
export function insertValue(
  tree: BinarySearchTree,
  value: StructureValue,
): { tree: BinarySearchTree; insertedId: NodeId | null } {
  const nodeId = nextBstNodeId(tree)
  const created: BstNode = { id: nodeId, value, left: null, right: null }

  if (tree.root === null) {
    return {
      tree: { nodes: [...tree.nodes, created], root: nodeId },
      insertedId: nodeId,
    }
  }

  const nodes = tree.nodes.map((node) => ({ ...node }))
  let current = tree.root
  while (current !== null) {
    const node = nodes.find((candidate) => candidate.id === current)
    /* istanbul ignore if — `current` always resolves in a well-formed model. */
    if (node === undefined)
      return { tree: { nodes, root: tree.root }, insertedId: null }
    const order = compareValues(value, node.value)
    if (order === 0)
      return { tree: { nodes, root: tree.root }, insertedId: null }
    if (order < 0) {
      if (node.left === null) {
        node.left = nodeId
        nodes.push(created)
        return { tree: { nodes, root: tree.root }, insertedId: nodeId }
      }
      current = node.left
    } else {
      if (node.right === null) {
        node.right = nodeId
        nodes.push(created)
        return { tree: { nodes, root: tree.root }, insertedId: nodeId }
      }
      current = node.right
    }
  }

  return { tree: { nodes, root: tree.root }, insertedId: null }
}

/**
 * Untraced deletion — the reference implementation for the `delete` generator.
 * The three standard cases are handled here in one pass, because the generator's
 * job is to *split* them into visible steps, not to re-derive them.
 */
export function deleteValue(
  tree: BinarySearchTree,
  value: StructureValue,
): BinarySearchTree {
  const target = searchValue(tree, value)
  if (target === null) return tree

  const nodes = tree.nodes.map((node) => ({ ...node }))
  const node = nodes.find((candidate) => candidate.id === target)
  /* istanbul ignore if — `target` came from this tree. */
  if (node === undefined) return tree

  // The parent and which of its pointers reaches the node. `null` parent means
  // the node is the root, so the edit has to move `root` instead.
  const parent = nodes.find(
    (candidate) => candidate.left === target || candidate.right === target,
  )
  const kind: 'left' | 'right' | null =
    parent === undefined ? null : parent.left === target ? 'left' : 'right'

  let root = tree.root
  /** Points the parent's pointer (or `root`) at `child`. */
  const attach = (child: NodeId | null): void => {
    if (parent === undefined) root = child
    else if (kind === 'left') parent.left = child
    else if (kind === 'right') parent.right = child
  }

  // Which node actually leaves the tree. In the two-children case the *successor*
  // leaves and the target node survives with the successor's value.
  let removedId = target

  if (node.left === null && node.right === null) {
    // Case 1 — leaf: cut it off.
    attach(null)
  } else if (node.left === null || node.right === null) {
    // Case 2 — exactly one child: splice that child into the node's place.
    attach(node.left ?? node.right)
  } else {
    // Case 3 — two children: copy the in-order successor's value up, then remove
    // the successor. The successor is the leftmost node of the right subtree, so
    // it has no left child and its removal is case 1 or case 2.
    const rightId = node.right
    const successorStart = nodes.find((candidate) => candidate.id === rightId)
    /* istanbul ignore if — `node.right` is non-null in this branch. */
    if (successorStart === undefined) return tree
    let successorParent: BstNode = node
    let successor: BstNode = successorStart
    while (successor.left !== null) {
      const leftId: NodeId = successor.left
      const next = nodes.find((candidate) => candidate.id === leftId)
      /* istanbul ignore if — left ids resolve in a well-formed model. */
      if (next === undefined) break
      successorParent = successor
      successor = next
    }

    node.value = successor.value
    // If the successor is the target's immediate right child, it hangs off the
    // right pointer; otherwise it hangs off its parent's left pointer.
    if (successorParent.id === node.id) successorParent.right = successor.right
    else successorParent.left = successor.right
    removedId = successor.id
  }

  return {
    nodes: nodes.filter((candidate) => candidate.id !== removedId),
    root,
  }
}

/**
 * The BST invariant, checked rather than assumed.
 *
 * A valid model must be a *tree* — every node reachable from the root exactly
 * once, so no cycles and no disconnected nodes — and a *search* tree — the
 * in-order walk strictly increasing (strict, because duplicates are rejected).
 * Strictly increasing also proves the ordering invariant for every subtree at
 * once, which is why the check is expressed over the traversal rather than child
 * by child.
 */
export function isBst(tree: BinarySearchTree): boolean {
  const order = inorderNodeIds(tree)
  if (order.length !== tree.nodes.length) return false

  const values = order.map((id) => bstNodeById(tree, id)?.value)
  for (let i = 1; i < values.length; i += 1) {
    const previous = values[i - 1]
    const current = values[i]
    /* istanbul ignore if — every id came from the tree. */
    if (previous === undefined || current === undefined) return false
    if (compareValues(previous, current) >= 0) return false
  }

  // Every pointer must resolve, and the root must resolve when set.
  if (tree.root !== null && bstNodeById(tree, tree.root) === undefined)
    return false
  return tree.nodes.every(
    (node) =>
      (node.left === null || bstNodeById(tree, node.left) !== undefined) &&
      (node.right === null || bstNodeById(tree, node.right) !== undefined),
  )
}

/** Throws a readable error if `tree` violates the BST invariants (used in tests). */
export function assertBst(tree: BinarySearchTree): void {
  if (!isBst(tree)) {
    throw new Error(
      `BST invariant violated: ${tree.nodes.length} node(s), in-order [${valuesInOrder(
        tree,
      )
        .map(String)
        .join(', ')}]`,
    )
  }
}

/**
 * Applies one step's `delta` and returns a NEW tree — `tree` is never mutated.
 *
 * This is the reducer the trace store replays, and it is deliberately the same
 * code path the generator's own bookkeeping uses, so the generator and the store
 * cannot drift apart.
 *
 * Channel order matters and is fixed:
 *   1. `created`   — a new node exists (with no children yet);
 *   2. `unlinked`  — clear a child pointer (a splice releases the old child);
 *   3. `linked`    — set a child pointer (the new child takes its place);
 *   4. `updated`   — `@root`, or a node's value (delete's value copy);
 *   5. `removed`   — finally drop the node and scrub any pointer still aimed at it.
 *
 * `unlinked` runs before `linked` because a splice is exactly "release the old
 * child, adopt the new one" and a reducer that did it the other way round would
 * have to be careful about clearing the pointer it had just set.
 */
export function applyBstDelta(
  tree: BinarySearchTree,
  delta: StructureDelta,
): BinarySearchTree {
  const nodes = tree.nodes.map((node) => ({ ...node }))
  let root = tree.root

  for (const created of delta.created ?? []) {
    if (!nodes.some((node) => node.id === created.id)) {
      nodes.push({
        id: created.id,
        value: created.value,
        left: null,
        right: null,
      })
    }
  }

  for (const edge of delta.unlinked ?? []) {
    const parent = nodes.find((node) => node.id === edge.from)
    if (parent === undefined) continue
    if (edge.kind === 'left' && parent.left === edge.to) parent.left = null
    if (edge.kind === 'right' && parent.right === edge.to) parent.right = null
  }

  for (const edge of delta.linked ?? []) {
    const parent = nodes.find((node) => node.id === edge.from)
    if (parent === undefined) continue
    if (edge.kind === 'left') parent.left = edge.to
    else if (edge.kind === 'right') parent.right = edge.to
    else {
      throw new Error(
        `applyBstDelta: child links need kind "left" or "right", got ${String(edge.kind)}`,
      )
    }
  }

  for (const change of delta.updated ?? []) {
    if (isFieldId(change.id)) {
      if (change.id !== ROOT_POINTER) {
        throw new Error(`applyBstDelta: unknown structure field "${change.id}"`)
      }
      root =
        change.to === null || change.to === undefined ? null : String(change.to)
      continue
    }

    const node = nodes.find((candidate) => candidate.id === change.id)
    if (node !== undefined) node.value = change.to as StructureValue
  }

  if (delta.moved !== undefined && delta.moved.length > 0) {
    throw new Error(
      'applyBstDelta: `moved` is a heap channel, not a tree channel',
    )
  }

  for (const removedId of delta.removed ?? []) {
    const at = nodes.findIndex((node) => node.id === removedId)
    if (at !== -1) nodes.splice(at, 1)
    for (const node of nodes) {
      if (node.left === removedId) node.left = null
      if (node.right === removedId) node.right = null
    }
    if (root === removedId) root = null
  }

  return { nodes, root }
}
