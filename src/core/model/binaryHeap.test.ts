import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  applyHeapDelta,
  assertHeap,
  extractRoot,
  heapComesBefore,
  heapFromValues,
  heapIsValid,
  heapLeftIndex,
  heapParentIndex,
  heapPeek,
  heapRightIndex,
  heapValues,
  heapifyInPlace,
  insertValue,
  nextHeapEntryId,
  siftDownPlan,
  siftUpPlan,
  type BinaryHeap,
} from './binaryHeap'
import { heapInsert } from '../operations/heap/insert'
import { heapExtractMin } from '../operations/heap/extractMin'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

describe('binary heap model', () => {
  it('uses the implicit index arithmetic (the array is the tree)', () => {
    expect(heapParentIndex(0)).toBe(-1)
    expect(heapParentIndex(1)).toBe(0)
    expect(heapParentIndex(2)).toBe(0)
    expect(heapParentIndex(6)).toBe(2)
    expect(heapLeftIndex(2)).toBe(5)
    expect(heapRightIndex(2)).toBe(6)
  })

  it('builds the raw array without heapifying (the build-heap lesson)', () => {
    const heap = heapFromValues([9, 4, 7, 1], 'min')
    expect(heapValues(heap)).toEqual([9, 4, 7, 1])
    expect(heap.entries.map((entry) => entry.id)).toEqual([
      'h1',
      'h2',
      'h3',
      'h4',
    ])
    // [9,4,7,1] is not a heap: 4 is a child of 9.
    expect(heapIsValid(heap)).toBe(false)
  })

  it('checks the heap property for both directions', () => {
    const minHeap = heapFromValues([1, 4, 7, 9], 'min')
    const maxHeap = heapFromValues([9, 4, 7, 1], 'max')
    expect(heapIsValid(minHeap)).toBe(true)
    expect(heapIsValid(maxHeap)).toBe(true)
    expect(heapIsValid({ entries: maxHeap.entries, kind: 'min' })).toBe(false)
  })

  it('heapComesBefore reads the direction', () => {
    expect(heapComesBefore(heapFromValues([], 'min'), 1, 2)).toBe(true)
    expect(heapComesBefore(heapFromValues([], 'max'), 1, 2)).toBe(false)
    expect(heapComesBefore(heapFromValues([], 'min'), 2, 2)).toBe(false)
  })

  it('insertValue appends, sifts up and keeps the invariant', () => {
    let heap = heapFromValues([], 'min')
    for (const value of [5, 3, 8, 1, 9, 2]) {
      heap = insertValue(heap, value).heap
      assertHeap(heap)
    }
    expect(heapPeek(heap)?.value).toBe(1)
    expect(nextHeapEntryId(heap)).toBe('h7')
  })

  it('extractRoot returns the extreme and keeps the invariant', () => {
    let heap = heapifyInPlace(heapFromValues([5, 3, 8, 1, 9, 2], 'min'))
    const extracted: number[] = []
    while (heap.entries.length > 0) {
      const result = extractRoot(heap)
      extracted.push(result.extracted?.value as number)
      heap = result.heap
      assertHeap(heap)
    }
    expect(extracted).toEqual([1, 2, 3, 5, 8, 9])

    const empty = extractRoot(heapFromValues([], 'min'))
    expect(empty.extracted).toBeNull()
  })

  it('sift plans describe the swaps sift-up/sift-down would perform', () => {
    const heap = heapFromValues([2, 3], 'min')
    // Appending 1 at index 2 must swap with index 0's child and then the root.
    const appended: BinaryHeap = {
      entries: [...heap.entries, { id: 'h3', value: 1 }],
      kind: 'min',
    }
    const up = siftUpPlan(appended, 2)
    expect(up).toEqual([
      { kind: 'compare', at: 2, against: 0 },
      { kind: 'swap', a: 2, b: 0 },
    ])

    const down = siftDownPlan(heapFromValues([9, 1, 2], 'min'), 0, 3)
    expect(down).toEqual([
      { kind: 'compare', at: 0, against: 1 },
      { kind: 'compare', at: 0, against: 2 },
      { kind: 'swap', a: 0, b: 1 },
    ])
  })

  it('applyHeapDelta reorders by id on `moved` and drops on `removed`', () => {
    const heap = heapFromValues([1, 2, 3], 'min')
    const moved = applyHeapDelta(heap, {
      moved: [
        { id: 'h1', to: 2 },
        { id: 'h3', to: 0 },
      ],
    })
    expect(moved.entries.map((entry) => entry.id)).toEqual(['h3', 'h2', 'h1'])

    const removed = applyHeapDelta(heap, { removed: ['h2'] })
    expect(removed.entries.map((entry) => entry.id)).toEqual(['h1', 'h3'])
  })

  it('rejects link channels, because a heap has no pointers', () => {
    expect(() =>
      applyHeapDelta(heapFromValues([1], 'min'), {
        linked: [{ from: 'h1', to: 'h1' }],
      }),
    ).toThrow(/no edges/)
  })

  it('replays a generated insert trace to the generator final state', () => {
    // Insert is only valid on a heap, so start from heapified data.
    const initial = heapifyInPlace(heapFromValues([5, 3, 8], 'min'))
    const { trace, finalState } = heapInsert(initial, { value: 1 })

    let replayed = initial
    for (const step of trace) replayed = applyHeapDelta(replayed, step.delta)
    expect(replayed).toEqual(finalState)
    expect(replayed).toEqual(insertValue(initial, 1).heap)
    assertHeap(replayed)
  })

  it('replays a generated extract trace to the generator final state', () => {
    const initial = heapifyInPlace(heapFromValues([5, 3, 8, 1], 'min'))
    const { trace, finalState } = heapExtractMin(initial)

    let replayed = initial
    for (const step of trace) replayed = applyHeapDelta(replayed, step.delta)
    expect(replayed).toEqual(finalState)
    assertHeap(replayed)
  })

  it('heapifies any array into a valid min-heap (property-based, NFR-C1)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 60 }), (values) => {
        const heap = heapifyInPlace(heapFromValues(values, 'min'))
        if (!heapIsValid(heap)) return false
        // The root is the minimum, and the array is a permutation of the input.
        const min = values.length === 0 ? undefined : Math.min(...values)
        if (heapPeek(heap)?.value !== min) return false
        const sortedHeap = [...heapValues(heap)].sort(
          (a, b) => Number(a) - Number(b),
        )
        const sortedInput = [...values].sort((a, b) => a - b)
        return JSON.stringify(sortedHeap) === JSON.stringify(sortedInput)
      }),
      { numRuns: 100 },
    )
  })

  it('extracting a min-heap repeatedly yields sorted output (property-based)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 40 }), (values) => {
        let heap = heapifyInPlace(heapFromValues(values, 'min'))
        const out: number[] = []
        while (heap.entries.length > 0) {
          const result = extractRoot(heap)
          out.push(Number(result.extracted?.value))
          heap = result.heap
        }
        const expected = [...values].sort((a, b) => a - b)
        return JSON.stringify(out) === JSON.stringify(expected)
      }),
      { numRuns: 100 },
    )
  })
})
