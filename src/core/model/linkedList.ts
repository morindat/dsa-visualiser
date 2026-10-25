/**
 * Linked list — structure model.
 *
 * WHAT GOES HERE
 *   Node records `{ id, value }` joined by `next` links, plus a `head` pointer. The
 *   model also owns the reducer that applies one step's `StructureDelta`, because
 *   only the list knows what a list delta means.
 *
 * WHY THIS FILE EXISTS
 *   One model module per structure (A2 Table 5). Pointer ids stay stable across
 *   steps so the renderer can animate a node instead of recreating it (A1 §6.3),
 *   and the cost model reflects a real list rather than convenient bookkeeping:
 *   head insert O(1), append O(1) with a tail pointer, insert-at-k O(k),
 *   delete/search O(n) unless the predecessor is already known.
 *
 * HOW IT IS SHARED
 *   The generator (`core/operations/`) drives it; the trace store
 *   (`core/trace/store.ts`) replays `applyListDelta` to rebuild the list at any
 *   index; the renderer reads the rebuilt model. Nothing here knows about any of
 *   those callers.
 *
 * RULES
 *   Pure data + invariants. No React, no D3, no `render/`, no `ui/`, no timers,
 *   no layout coordinates, no DOM (ADR-2, ADR-6, NFR-M2, NFR-M3). Deterministic:
 *   the same input always produces the same ids and the same order (NFR-C2).
 */

import {
  FIELD_ID_PREFIX,
  isFieldId,
  type NodeId,
  type StructureDelta,
  type TraceEdge,
} from '../trace/step'

/** A single list node. */
export type ListNode = {
  id: NodeId
  value: string | number
}

/**
 * The whole list at one instant.
 *
 * `nodes` keeps every node ever created, in creation order. That matters between
 * "create the node" and "link it": the new node exists but is not reachable from
 * `head` yet, so it is drawn as floating rather than being invisible.
 */

export type LinkedListModel = {
  nodes: ListNode[]
  links: TraceEdge[]
  head: NodeId | null
}

/**
 * The head *pointer* as it appears in a delta's `updated` list. Built from the
 * contract's reserved prefix, so the convention cannot drift: `@head` can never
 * collide with a node id (`n1`, `n2`, …).
 */
export const HEAD_POINTER: NodeId = `${FIELD_ID_PREFIX}head`

/** Builds `[value0 → value1 → …]` with deterministic ids `n1, n2, …`. */
export function buildList(
  values: readonly (string | number)[],
): LinkedListModel {
  const nodes: ListNode[] = []
  const links: TraceEdge[] = []
  let head: NodeId | null = null
  let previous: NodeId | null = null

  values.forEach((value, index) => {
    const id = `n${index + 1}`
    nodes.push({ id, value })
    if (previous === null) {
      head = id
    } else {
      links.push({ from: previous, to: id, kind: 'next' })
    }
    previous = id
  })

  return { nodes, links, head }
}

/** The next deterministic id — `max(n1…nk) + 1`. */
export function nextNodeId(model: LinkedListModel): NodeId {
  const highest = model.nodes.reduce((max, node) => {
    const match = /^n(\d+)$/.exec(node.id)
    return match === null ? max : Math.max(max, Number(match[1]))
  }, 0)
  return `n${highest + 1}`
}

export function nodeById(
  model: LinkedListModel,
  id: NodeId,
): ListNode | undefined {
  return model.nodes.find((node) => node.id === id)
}

/**
 * Applies one step's `delta` and returns a NEW model — `model` is never mutated.
 *
 * This is the reducer the trace store replays: add created nodes, add/remove
 * `next` links, move the head pointer (`updated` with id `@head`), update node
 * values, and drop removed nodes together with any link that referenced them.
 */
export function applyListDelta(
  model: LinkedListModel,
  delta: StructureDelta,
): LinkedListModel {
  const nodes = [...model.nodes]
  const links = [...model.links]
  let head = model.head

  for (const created of delta.created ?? []) {
    if (!nodes.some((node) => node.id === created.id)) {
      nodes.push({ id: created.id, value: created.value })
    }
  }

  for (const edge of delta.linked ?? []) {
    const exists = links.some(
      (link) => link.from === edge.from && link.to === edge.to,
    )
    if (!exists) {
      links.push({ from: edge.from, to: edge.to, kind: edge.kind ?? 'next' })
    }
  }

  for (const edge of delta.unlinked ?? []) {
    const index = links.findIndex(
      (link) => link.from === edge.from && link.to === edge.to,
    )
    if (index !== -1) links.splice(index, 1)
  }

  for (const change of delta.updated ?? []) {
    if (isFieldId(change.id)) {
      // A structure field, not a node. Only `@head` exists for a list; anything
      // else means the generator and the model have drifted, so fail loudly
      // rather than silently replaying a delta we do not understand.
      if (change.id !== HEAD_POINTER) {
        throw new Error(
          `applyListDelta: unknown structure field "${change.id}"`,
        )
      }
      head =
        change.to === null || change.to === undefined ? null : String(change.to)
      continue
    }

    const index = nodes.findIndex((node) => node.id === change.id)
    if (index !== -1) {
      nodes[index] = { ...nodes[index], value: change.to as string | number }
    }
  }

  const removed = new Set(delta.removed ?? [])
  for (const removedId of removed) {
    const index = nodes.findIndex((node) => node.id === removedId)
    if (index !== -1) nodes.splice(index, 1)
  }

  // Remove any link that referenced a deleted node, so a replay can never hold a
  // dangling pointer.
  for (let i = links.length - 1; i >= 0; i -= 1) {
    if (removed.has(links[i].from) || removed.has(links[i].to)) {
      links.splice(i, 1)
    }
  }

  // Removing the head node without a pointer edit would leave `head` dangling;
  // the generators always move the pointer first, so this is a defensive check.
  if (head !== null && removed.has(head)) {
    head = null
  }

  return { nodes, links, head }
}

/** Node ids from `head`, following `next`; the guard stops a corrupted cycle. */
export function orderFromHead(model: LinkedListModel): NodeId[] {
  const order: NodeId[] = []
  let current = model.head

  while (current !== null && !order.includes(current)) {
    order.push(current)
    const outgoing = model.links.find((link) => link.from === current)
    current = outgoing === undefined ? null : outgoing.to
  }

  return order
}

/** The values in list order — the auxiliary panel's `array` view for this slice. */
export function valuesInOrder(model: LinkedListModel): (string | number)[] {
  const values: (string | number)[] = []
  for (const id of orderFromHead(model)) {
    const node = nodeById(model, id)
    if (node !== undefined) {
      values.push(node.value)
    }
  }
  return values
}
