/**
 * Stack — array-backed LIFO structure model.
 *
 * WHAT GOES HERE
 *   A stack stored as an array of `{ id, value }` entries plus two explicit
 *   bookkeeping fields:
 *
 *     top       index of the top entry, or -1 when the stack is empty
 *     capacity  number of allocated cells (the array grows geometrically)
 *
 *   The model also owns `applyStackDelta`, the reducer that replays one step's
 *   `StructureDelta`: a push creates an entry and advances `top`, a pop moves
 *   `top` down and removes the entry, and capacity growth is a field update. Only
 *   the stack knows what those deltas mean, so the trace store and the generators
 *   share this one reducer.
 *
 * WHY THE TOP IS EXPLICIT
 *   The stack's entire lesson is that push/pop/peek touch exactly one end, in
 *   O(1). Deriving `top` from `entries.length` would erase the moment the pointer
 *   moves, which is the moment worth animating: on push the pointer advances into
 *   a pending slot, then the cell fills; on pop the pointer steps down, then the
 *   abandoned cell disappears. Keeping `top` explicit makes those two beats
 *   visible and honest.
 *
 * WHY CAPACITY IS MODELLED
 *   An array-backed stack is amortised O(1), not worst-case O(1): occasionally the
 *   array is copied into a bigger one. Hiding that would teach the wrong bound, so
 *   the model carries `capacity` and reports a resize step when it happens. The
 *   linked-list-backed variant has worst-case O(1) push, but is not the shape this
 *   structure uses.
 *
 * RULES
 *   Pure data + invariants. No React, D3, `render/`, `ui/`, timers or DOM
 *   (ADR-2, NFR-M2). Deterministic: the same input always produces the same ids
 *   and the same order (NFR-C2).
 */

import {
  FIELD_ID_PREFIX,
  isFieldId,
  type NodeId,
  type StructureDelta,
} from '../trace/step'
import type { StructureValue } from './order'

/** A single stack entry: a stable id plus the value it holds. */
export type StackEntry = {
  id: NodeId
  value: StructureValue
}

/**
 * The whole stack at one instant.
 *
 * `top` is the index of the top entry. During the two animation beats described
 * above it can temporarily differ from `entries.length - 1`:
 *
 *   - push, after `top ← top + 1`: `top === entries.length` (a pending slot);
 *   - pop, after `top ← top - 1`: `top === entries.length - 2` (the old top is
 *     still drawn, faded, until the next step removes it).
 *
 * A completed operation always restores `top === entries.length - 1`, or `-1` for
 * the empty stack.
 */
export type StackModel = {
  entries: StackEntry[]
  top: number
  capacity: number
}

/** The top *pointer* as it appears in a delta's `updated` list. */
export const TOP_POINTER: NodeId = `${FIELD_ID_PREFIX}top`

/** The allocated-size field, only emitted by a resize step. */
export const CAPACITY_FIELD: NodeId = `${FIELD_ID_PREFIX}capacity`

/** The smallest allocation a stack starts with, so the first few pushes fit. */
export const MIN_STACK_CAPACITY = 4

/** The smallest power of two ≥ `size` (and at least `MIN_STACK_CAPACITY`). */
export function stackCapacityFor(size: number): number {
  let capacity = MIN_STACK_CAPACITY
  while (capacity < size) capacity *= 2
  return capacity
}

/**
 * Builds `[bottom … top]` with deterministic ids `s1, s2, …`.
 *
 * The capacity is the smallest power of two that fits the initial entries, so a
 * full initial stack demonstrates the occasional O(n) resize on the next push.
 */
export function buildStack(
  values: readonly StructureValue[],
  capacity: number = stackCapacityFor(values.length),
): StackModel {
  const entries = values.map((value, index) => ({
    id: `s${index + 1}`,
    value,
  }))

  return {
    entries,
    top: entries.length - 1,
    capacity: Math.max(capacity, entries.length),
  }
}

/** The next deterministic id — `max(s1…sk) + 1`. */
export function nextStackEntryId(model: StackModel): NodeId {
  const highest = model.entries.reduce((max, entry) => {
    const match = /^s(\d+)$/.exec(entry.id)
    return match === null ? max : Math.max(max, Number(match[1]))
  }, 0)
  return `s${highest + 1}`
}

export function stackEntryById(
  model: StackModel,
  id: NodeId,
): StackEntry | undefined {
  return model.entries.find((entry) => entry.id === id)
}

/** The logical size: the number of entries at or below `top`. */
export function stackSize(model: StackModel): number {
  return Math.max(0, model.top + 1)
}

/** The entries that are actually in the stack, bottom first. */
export function stackEntriesInUse(model: StackModel): StackEntry[] {
  return model.entries.slice(0, stackSize(model))
}

/** The values in stack order, bottom first. */
export function stackValues(model: StackModel): StructureValue[] {
  return stackEntriesInUse(model).map((entry) => entry.value)
}

/** The top entry, or `undefined` when the stack is empty. */
export function stackPeekEntry(model: StackModel): StackEntry | undefined {
  return model.top < 0 ? undefined : model.entries[model.top]
}

/** A defensive predicate used by tests and the property checks. */
export function stackIsConsistent(model: StackModel): boolean {
  if (model.top < -1) return false
  if (model.top >= model.entries.length + 1) return false
  if (model.capacity < model.entries.length) return false
  // Between animation beats, at most one entry may sit above `top`.
  return model.entries.length - (model.top + 1) <= 1
}

/**
 * Applies one step's `delta` and returns a NEW model — `model` is never mutated.
 *
 * This is the reducer the trace store replays: add created entries, update the
 * `@top` / `@capacity` fields, remove popped entries, and (defensively) clamp the
 * top if a removal left it dangling. A stack has no edges, so link edits are a
 * generator/model drift and fail loudly.
 */
export function applyStackDelta(
  model: StackModel,
  delta: StructureDelta,
): StackModel {
  const entries = model.entries.map((entry) => ({ ...entry }))
  let top = model.top
  let capacity = model.capacity

  for (const created of delta.created ?? []) {
    if (!entries.some((entry) => entry.id === created.id)) {
      entries.push({ id: created.id, value: created.value })
    }
  }

  for (const change of delta.updated ?? []) {
    if (isFieldId(change.id)) {
      if (change.id === TOP_POINTER) {
        top = Number(change.to)
      } else if (change.id === CAPACITY_FIELD) {
        capacity = Number(change.to)
      } else {
        throw new Error(
          `applyStackDelta: unknown structure field "${change.id}"`,
        )
      }
      continue
    }

    const entry = entries.find((candidate) => candidate.id === change.id)
    if (entry !== undefined) {
      entry.value = change.to as StructureValue
    }
  }

  let removedAny = false
  for (const removedId of delta.removed ?? []) {
    const index = entries.findIndex((entry) => entry.id === removedId)
    if (index !== -1) {
      entries.splice(index, 1)
      removedAny = true
    }
  }

  // A removal can only invalidate `top` when the caller removed the top entry
  // without also moving the pointer; clamp so the model can never dangle. The
  // pending-push state (`top === entries.length`) is NOT clamped: it is the beat
  // the animation is showing, not an inconsistency.
  if (removedAny) {
    if (top >= entries.length) top = entries.length - 1
    if (entries.length === 0) top = -1
  }
  if (capacity < entries.length) capacity = entries.length

  if ((delta.linked?.length ?? 0) > 0 || (delta.unlinked?.length ?? 0) > 0) {
    throw new Error('applyStackDelta: a stack has no edges to link or unlink')
  }

  return { entries, top, capacity }
}
