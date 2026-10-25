/**
 * Priority queue (binary heap) — structure model.
 *
 * WHAT GOES HERE
 *   A binary heap stored in a single array of `{ id, value }` entries with an
 *   implicit tree: the parent of index `i` is `floor((i-1)/2)`, its children are
 *   `2i+1` and `2i+2`. There are no node objects and no pointers — **the array is
 *   the tree** — so `entries[i]` is the node at tree slot `i` and a sift swap is a
 *   positional move (`StructureDelta.moved`), not a link.
 *
 *   The module owns the heap's untraced mechanics (`siftUpPlan` / `siftDownPlan`,
 *   `insertValue`, `extractRoot`, `heapifyInPlace`) and the `applyHeapDelta`
 *   reducer. The generators in `core/operations/heap/` replay the *same* plans as
 *   visible `Step`s, so the picture and the algorithm cannot disagree.
 *
 * WHY THIS FILE EXISTS
 *   The priority queue is a first-class catalogue structure (ADR-5) and the one model
 *   with "one model, two honest renderings": the same array is drawn as an indexed
 *   array and as a complete binary tree, which is what lets the O(n) build-heap
 *   and the O(n log n) of n successive inserts be compared on one input (A2 §4.3).
 *   Drawing both from one array is the reason the two views can never drift.
 *
 * MIN OR MAX
 *   The structure is a *min*-heap by default (A2 §4.3), but the priority-queue
 *   story is symmetric and the operation catalogue ships both directions, so the
 *   model carries an explicit `kind`. Every comparison goes through
 *   `heapComesBefore`, so switching direction changes one flag, not the algorithms.
 *
 * WHY THE SIFT IS A "PLAN"
 *   A plan is the list of comparisons and swaps a sift would perform, as data.
 *   The generator turns each entry into a step and applies the swaps through the
 *   reducer; the untraced operation applies the same swaps to a local copy. One
 *   implementation of the heap property feeds both, which is what stops the
 *   animation and the answer from disagreeing (and gives the property-based tests
 *   an independent oracle, NFR-C1).
 *
 * RULES
 *   Pure data + invariants. No React, D3, `render/`, `ui/`, timers or DOM (ADR-2,
 *   NFR-M2). Deterministic: no randomness, no clock, fixed index arithmetic
 *   (NFR-C2).
 */

import { isFieldId, type NodeId, type StructureDelta } from '../trace/step'
import { compareValues, type StructureValue } from './order'

/** Which end of the order the root holds. */
export type HeapKind = 'min' | 'max'

/** One array cell: a stable id plus the value it holds. */
export type HeapEntry = {
  id: NodeId
  value: StructureValue
}

/**
 * The whole heap at one instant. `entries` is ordered by array index, which is
 * also tree slot order: `entries[0]` is always the root.
 */
export type BinaryHeap = {
  entries: HeapEntry[]
  kind: HeapKind
}

/**
 * Builds the array in the given order **without heapifying it**.
 *
 * This is deliberate. `buildHeap`'s whole lesson is that an arbitrary array can be
 * turned into a heap in O(n), and that is only observable if the input can start
 * out *not* being one. The `buildMinHeap` / `buildMaxHeap` generators do the
 * heapify; `buildBst`-style "make it valid on construction" would erase the
 * lesson. Ids are `h1, h2, …` in array order.
 */
export function heapFromValues(
  values: readonly StructureValue[],
  kind: HeapKind = 'min',
): BinaryHeap {
  return {
    entries: values.map((value, index) => ({ id: `h${index + 1}`, value })),
    kind,
  }
}

export function heapSize(heap: BinaryHeap): number {
  return heap.entries.length
}

/** The next deterministic entry id — `max(h1…hk) + 1`. */
export function nextHeapEntryId(heap: BinaryHeap): NodeId {
  const highest = heap.entries.reduce((max, entry) => {
    const match = /^h(\d+)$/.exec(entry.id)
    return match === null ? max : Math.max(max, Number(match[1]))
  }, 0)
  return `h${highest + 1}`
}

export function heapEntryById(
  heap: BinaryHeap,
  id: NodeId,
): HeapEntry | undefined {
  return heap.entries.find((entry) => entry.id === id)
}

/** The values in array order — the array rendering, and the tree's level order. */
export function heapValues(heap: BinaryHeap): StructureValue[] {
  return heap.entries.map((entry) => entry.value)
}

/** The root entry — the minimum for a min-heap, the maximum for a max-heap. */
export function heapPeek(heap: BinaryHeap): HeapEntry | undefined {
  return heap.entries[0]
}

/** Index of the parent of `i`, or `-1` for the root. */
export function heapParentIndex(i: number): number {
  return i <= 0 ? -1 : Math.floor((i - 1) / 2)
}

export function heapLeftIndex(i: number): number {
  return 2 * i + 1
}

export function heapRightIndex(i: number): number {
  return 2 * i + 2
}

/**
 * "Does `a` belong above `b`?" — the single place the min/max direction is read.
 * Equal values never come before each other, so the sort is stable and a sift
 * stops instead of swapping equal entries forever.
 */
export function heapComesBefore(
  heap: BinaryHeap,
  a: StructureValue,
  b: StructureValue,
): boolean {
  const order = compareValues(a, b)
  return heap.kind === 'min' ? order < 0 : order > 0
}

/**
 * Checks the heap property at every parent/child pair. `size` exists because
 * `extract` shrinks the logical heap while the array is still being sifted; the
 * entries beyond `size` are the extracted tail and are not part of the heap.
 */
export function heapIsValid(heap: BinaryHeap, size = heapSize(heap)): boolean {
  for (let i = 1; i < size; i += 1) {
    const parent = heapParentIndex(i)
    const parentEntry = heap.entries[parent]
    const entry = heap.entries[i]
    /* istanbul ignore if — indices are in range by construction. */
    if (parentEntry === undefined || entry === undefined) return false
    // A child that comes before its parent is a violation.
    if (heapComesBefore(heap, entry.value, parentEntry.value)) return false
  }
  return true
}

/** Throws a readable error if `heap` violates the heap property (used in tests). */
export function assertHeap(heap: BinaryHeap, size = heapSize(heap)): void {
  if (!heapIsValid(heap, size)) {
    throw new Error(
      `Heap invariant violated (${heap.kind}-heap): [${heapValues(heap)
        .map(String)
        .join(', ')}]`,
    )
  }
}

/**
 * One atomic thing a sift does, as data.
 *
 * `compare` names the slot being sifted (`at`) and the slot it is tested against
 * (`against`) — both array indices, which are also tree slots. `swap` names the
 * two slots whose entries exchange places.
 */
export type SiftEvent =
  | { kind: 'compare'; at: number; against: number }
  | { kind: 'swap'; a: number; b: number }

/**
 * The events a sift-up from `index` performs.
 *
 * The plan simulates the swaps on a local copy as it builds the list, because each
 * later comparison reads the value that has *moved up* so far, not the value that
 * originally sat at that index. Returning the events without mutating `heap` keeps
 * the caller free to replay them through the trace or to apply them directly.
 */
export function siftUpPlan(heap: BinaryHeap, index: number): SiftEvent[] {
  const entries = heap.entries.map((entry) => ({ ...entry }))
  const events: SiftEvent[] = []

  let i = index
  while (i > 0) {
    const parent = heapParentIndex(i)
    events.push({ kind: 'compare', at: i, against: parent })
    if (!heapComesBefore(heap, entries[i].value, entries[parent].value)) break
    events.push({ kind: 'swap', a: i, b: parent })
    const held = entries[i]
    entries[i] = entries[parent]
    entries[parent] = held
    i = parent
  }

  return events
}

/**
 * The events a sift-down from `index` performs, within a logical heap of `size`.
 *
 * Both children are compared with the best candidate so far, even though only one
 * can win: the sibling that is *not* chosen is exactly the comparison learners
 * skip, so it is part of the plan and therefore part of the trace (A2 §4.3).
 */
export function siftDownPlan(
  heap: BinaryHeap,
  index: number,
  size: number,
): SiftEvent[] {
  const entries = heap.entries.map((entry) => ({ ...entry }))
  const events: SiftEvent[] = []

  let i = index
  for (;;) {
    const left = heapLeftIndex(i)
    if (left >= size) break // no children: `i` is a leaf
    const right = heapRightIndex(i)

    let best = i

    events.push({ kind: 'compare', at: i, against: left })
    if (heapComesBefore(heap, entries[left].value, entries[best].value)) {
      best = left
    }

    if (right < size) {
      events.push({ kind: 'compare', at: i, against: right })
      if (heapComesBefore(heap, entries[right].value, entries[best].value)) {
        best = right
      }
    }

    if (best === i) break // the heap property already holds here
    events.push({ kind: 'swap', a: i, b: best })
    const held = entries[i]
    entries[i] = entries[best]
    entries[best] = held
    i = best
  }

  return events
}

/** Applies the `swap` events of a plan to an entry array (internal helper). */
function applySwaps(entries: HeapEntry[], events: readonly SiftEvent[]): void {
  for (const event of events) {
    if (event.kind !== 'swap') continue
    const held = entries[event.a]
    entries[event.a] = entries[event.b]
    entries[event.b] = held
  }
}

/**
 * Untraced insertion — the reference implementation for the `insert` generator.
 * Appends at the next free slot and sifts up.
 */
export function insertValue(
  heap: BinaryHeap,
  value: StructureValue,
): { heap: BinaryHeap; insertedId: NodeId } {
  const insertedId = nextHeapEntryId(heap)
  const entries = [...heap.entries, { id: insertedId, value }]
  const grown: BinaryHeap = { entries, kind: heap.kind }
  applySwaps(entries, siftUpPlan(grown, entries.length - 1))
  return { heap: { entries, kind: heap.kind }, insertedId }
}

/**
 * Untraced extract — the reference implementation for `extractMin`/`extractMax`.
 * Moves the last entry to the root, shrinks by one and sifts down.
 */
export function extractRoot(heap: BinaryHeap): {
  heap: BinaryHeap
  extracted: HeapEntry | null
} {
  if (heap.entries.length === 0) {
    return { heap: { entries: [], kind: heap.kind }, extracted: null }
  }

  const extracted = heap.entries[0]
  const last = heap.entries[heap.entries.length - 1]
  if (heap.entries.length === 1) {
    return { heap: { entries: [], kind: heap.kind }, extracted }
  }

  // root <- last, then everything strictly between, then sift the new root down.
  const entries: HeapEntry[] = [last, ...heap.entries.slice(1, -1)]
  applySwaps(
    entries,
    siftDownPlan({ entries, kind: heap.kind }, 0, entries.length),
  )
  return { heap: { entries, kind: heap.kind }, extracted }
}

/**
 * Untraced bottom-up heapify — the reference implementation for
 * `buildMinHeap`/`buildMaxHeap`. Sifts down every internal node from the last one
 * back to the root, which is what makes the whole build O(n) rather than
 * O(n log n) (A2 §4.3).
 */
export function heapifyInPlace(heap: BinaryHeap): BinaryHeap {
  const entries = heap.entries.map((entry) => ({ ...entry }))
  for (let i = Math.floor(entries.length / 2) - 1; i >= 0; i -= 1) {
    applySwaps(
      entries,
      siftDownPlan({ entries, kind: heap.kind }, i, entries.length),
    )
  }
  return { entries, kind: heap.kind }
}

/**
 * Applies one step's `delta` and returns a NEW heap — `heap` is never mutated.
 *
 * Channel order is fixed and mirrors what the generators emit:
 *   1. `created` — append a new entry at the next free slot (insert);
 *   2. `updated` — change an entry's value in place;
 *   3. `moved`   — reorder entries by id (a sift swap, or "last to root");
 *   4. `removed` — drop an entry (the extracted root, or the old tail).
 *
 * `moved` before `removed` is required by `extract`: the step that promotes the
 * last entry to the root moves it and retires the old root in the same delta, and
 * moving first leaves the promoted entry in place for the removal to skip.
 *
 * `linked` / `unlinked` are rejected because a heap has no pointers: receiving one
 * means a generator has confused this structure with a linked one, and silently
 * ignoring it would hide that.
 */
export function applyHeapDelta(
  heap: BinaryHeap,
  delta: StructureDelta,
): BinaryHeap {
  let entries = heap.entries.map((entry) => ({ ...entry }))

  for (const created of delta.created ?? []) {
    if (!entries.some((entry) => entry.id === created.id)) {
      entries.push({ id: created.id, value: created.value })
    }
  }

  for (const change of delta.updated ?? []) {
    if (isFieldId(change.id)) {
      throw new Error(`applyHeapDelta: unknown structure field "${change.id}"`)
    }
    const entry = entries.find((candidate) => candidate.id === change.id)
    if (entry !== undefined) entry.value = change.to as StructureValue
  }

  for (const move of delta.moved ?? []) {
    const from = entries.findIndex((entry) => entry.id === move.id)
    if (from === -1) {
      throw new Error(`applyHeapDelta: moved unknown entry "${move.id}"`)
    }
    const [entry] = entries.splice(from, 1)
    const to = Math.max(0, Math.min(move.to, entries.length))
    entries.splice(to, 0, entry)
  }

  if ((delta.linked?.length ?? 0) > 0 || (delta.unlinked?.length ?? 0) > 0) {
    throw new Error('applyHeapDelta: a heap has no edges to link or unlink')
  }

  for (const removedId of delta.removed ?? []) {
    entries = entries.filter((entry) => entry.id !== removedId)
  }

  return { entries, kind: heap.kind }
}
