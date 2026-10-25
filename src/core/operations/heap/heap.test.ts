import { describe, expect, it } from 'vitest'
import {
  assertHeap,
  extractRoot,
  heapFromValues,
  heapPeek,
  heapValues,
  heapifyInPlace,
  insertValue,
  type BinaryHeap,
} from '../../model/binaryHeap'
import { heapBuildMax } from './buildMaxHeap'
import { heapBuildMin } from './buildMinHeap'
import { heapExtractMax } from './extractMax'
import { heapExtractMin } from './extractMin'
import { heapInsert } from './insert'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

const RAW = [5, 3, 8, 1, 9, 2]

function minHeapOf(values: number[]): BinaryHeap {
  return heapifyInPlace(heapFromValues(values, 'min'))
}

function maxHeapOf(values: number[]): BinaryHeap {
  return heapifyInPlace(heapFromValues(values, 'max'))
}

describe('heapInsert', () => {
  it('appends then stops, when the heap already holds the property', () => {
    const initial = minHeapOf([1, 2, 3])
    const { trace, finalState, insertedId } = heapInsert(initial, { value: 5 })

    expect(insertedId).toBe('h4')
    // Append, then ONE comparison against the parent — which already wins, so no
    // swap happens — then the closing step.
    expect(trace.map((step) => step.codeLine)).toEqual([2, 6, 9])
    expect(trace[1].delta).toEqual({})
    expect(trace[0].delta.created).toEqual([{ id: 'h4', value: 5 }])
    expect(trace[0].aux?.kind).toBe('heap')
    expect(trace[0].aux?.indices).toEqual([3])
    expect(heapValues(finalState)).toEqual([1, 2, 3, 5])
    assertHeap(finalState)
  })

  it('sifts a smaller value all the way to the root', () => {
    const initial = minHeapOf([1, 3, 5, 9, 8, 7])
    const { trace, finalState } = heapInsert(initial, { value: 0 })

    expect(trace.length).toBeGreaterThan(2)
    expect(trace.every((step) => step.aux?.kind === 'heap')).toBe(true)
    expect(heapPeek(finalState)?.value).toBe(0)
    assertHeap(finalState)
    // Every swap is a positional move, never a value update of a node.
    const swaps = trace.filter((step) => step.delta.moved !== undefined)
    expect(swaps.length).toBeGreaterThan(0)
    expect(swaps.flatMap((step) => step.delta.moved ?? [])).not.toHaveLength(0)
  })

  it('works on a max-heap too', () => {
    const initial = maxHeapOf([9, 4, 7])
    const { finalState } = heapInsert(initial, { value: 12 })
    expect(heapPeek(finalState)?.value).toBe(12)
    assertHeap(finalState)
  })

  it('matches the model reference and is deterministic', () => {
    const initial = minHeapOf([4, 9, 6])
    const once = heapInsert(initial, { value: 2 })
    const twice = heapInsert(initial, { value: 2 })

    expect(once.finalState).toEqual(insertValue(initial, 2).heap)
    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
  })
})

describe('heapExtractMin', () => {
  it('returns the minimum and restores the heap each time', () => {
    const { trace, finalState, extracted } = heapExtractMin(minHeapOf(RAW))

    expect(extracted?.value).toBe(1)
    assertHeap(finalState)
    // The old root leaves through `removed`; the promoted tail arrives via `moved`.
    expect(trace.some((step) => step.delta.removed !== undefined)).toBe(true)
    expect(trace.some((step) => step.delta.moved !== undefined)).toBe(true)
  })

  it('drains to sorted order', () => {
    let state = minHeapOf(RAW)
    const out: number[] = []
    while (state.entries.length > 0) {
      const result = heapExtractMin(state)
      out.push(Number(result.extracted?.value))
      state = result.finalState
      assertHeap(state)
    }
    expect(out).toEqual([1, 2, 3, 5, 8, 9])
  })

  it('reports an empty heap instead of throwing', () => {
    const { trace, extracted, finalState } = heapExtractMin(
      heapFromValues([], 'min'),
    )
    expect(extracted).toBeNull()
    expect(trace[0].codeLine).toBe(2)
    expect(finalState.entries).toHaveLength(0)
  })

  it('handles the single-entry heap without a sift', () => {
    const { trace, extracted, finalState } = heapExtractMin(
      heapFromValues([7], 'min'),
    )
    expect(extracted?.value).toBe(7)
    expect(finalState.entries).toHaveLength(0)
    // Read root, publish it as the output, then remove it.
    expect(trace.map((step) => step.codeLine)).toEqual([3, 3, 4, 15])
    const outputStep = trace.find((step) =>
      step.narration.startsWith('Extract-min:'),
    )
    expect(outputStep?.delta).toEqual({})
    expect(outputStep?.aux?.output).toEqual([7])
  })

  it('matches the model reference for one extract', () => {
    const initial = minHeapOf(RAW)
    const { finalState, extracted } = heapExtractMin(initial)
    const reference = extractRoot(initial)
    expect(extracted).toEqual(reference.extracted)
    expect(finalState).toEqual(reference.heap)
  })

  it('is deterministic (NFR-C2)', () => {
    const initial = minHeapOf(RAW)
    expect(JSON.stringify(heapExtractMin(initial).trace)).toBe(
      JSON.stringify(heapExtractMin(initial).trace),
    )
  })
})

describe('heapExtractMax', () => {
  it('returns the maximum and restores the heap', () => {
    const { trace, extracted, finalState } = heapExtractMax(maxHeapOf(RAW))
    expect(extracted?.value).toBe(9)
    expect(
      trace.find((step) => step.narration.startsWith('Extract-max:'))?.aux
        ?.output,
    ).toEqual([9])
    assertHeap(finalState)
  })

  it('drains a max-heap to descending order', () => {
    let state = maxHeapOf(RAW)
    const out: number[] = []
    while (state.entries.length > 0) {
      const result = heapExtractMax(state)
      out.push(Number(result.extracted?.value))
      state = result.finalState
      assertHeap(state)
    }
    expect(out).toEqual([9, 8, 5, 3, 2, 1])
  })
})

describe('heapBuildMin / heapBuildMax', () => {
  it('turns a raw array into a valid min-heap', () => {
    const { trace, finalState, summary } = heapBuildMin(
      heapFromValues(RAW, 'min'),
    )

    assertHeap(finalState)
    expect(
      heapValues(finalState).sort((a, b) => Number(a) - Number(b)),
    ).toEqual([...RAW].sort((a, b) => a - b))
    // The O(n) claim: a linear number of comparisons, not n log n.
    expect(summary.comparisons).toBeLessThanOrEqual(2 * RAW.length)
    expect(trace.every((step) => step.operation === 'heapBuildMin')).toBe(true)
  })

  it('fixes the direction even if the input was labelled a max-heap', () => {
    const { finalState } = heapBuildMin(heapFromValues(RAW, 'max'))
    expect(finalState.kind).toBe('min')
    assertHeap(finalState)
  })

  it('turns a raw array into a valid max-heap', () => {
    const { finalState } = heapBuildMax(heapFromValues(RAW, 'min'))
    expect(finalState.kind).toBe('max')
    expect(heapPeek(finalState)?.value).toBe(9)
    assertHeap(finalState)
  })

  it('matches the model reference and is deterministic', () => {
    const initial = heapFromValues(RAW, 'min')
    const once = heapBuildMin(initial)
    expect(once.finalState).toEqual(heapifyInPlace(initial))
    expect(JSON.stringify(once.trace)).toBe(
      JSON.stringify(heapBuildMin(initial).trace),
    )
  })
})
