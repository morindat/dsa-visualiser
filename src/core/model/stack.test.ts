import { describe, expect, it } from 'vitest'
import {
  CAPACITY_FIELD,
  TOP_POINTER,
  applyStackDelta,
  buildStack,
  nextStackEntryId,
  stackIsConsistent,
  stackPeekEntry,
  stackSize,
  stackValues,
} from './stack'

// DOM-free: this is part of `npm run test:core`.

describe('stack model', () => {
  it('builds a stack with deterministic ids, top and capacity', () => {
    const stack = buildStack([50, 30, 70])

    expect(stack.entries).toEqual([
      { id: 's1', value: 50 },
      { id: 's2', value: 30 },
      { id: 's3', value: 70 },
    ])
    expect(stack.top).toBe(2)
    expect(stack.capacity).toBe(4)
    expect(stackSize(stack)).toBe(3)
    expect(stackValues(stack)).toEqual([50, 30, 70])
    expect(stackPeekEntry(stack)?.value).toBe(70)
    expect(stackIsConsistent(stack)).toBe(true)
  })

  it('builds an empty stack with top = -1', () => {
    const stack = buildStack([])

    expect(stack.entries).toEqual([])
    expect(stack.top).toBe(-1)
    expect(stack.capacity).toBe(4)
    expect(stackSize(stack)).toBe(0)
    expect(stackValues(stack)).toEqual([])
    expect(stackPeekEntry(stack)).toBeUndefined()
    expect(stackIsConsistent(stack)).toBe(true)
  })

  it('grows capacity to the next power of two', () => {
    expect(buildStack(new Array(5).fill(1)).capacity).toBe(8)
    expect(buildStack(new Array(16).fill(1)).capacity).toBe(16)
    expect(buildStack(new Array(17).fill(1)).capacity).toBe(32)
  })

  it('hands out the next id after the highest existing one', () => {
    expect(nextStackEntryId(buildStack([]))).toBe('s1')
    expect(nextStackEntryId(buildStack([1, 2, 3]))).toBe('s4')
  })

  it('applies push deltas without mutating the previous state', () => {
    const before = buildStack([50, 30])
    const after = applyStackDelta(before, {
      updated: [{ id: TOP_POINTER, from: 1, to: 2 }],
      created: [{ id: 's3', value: 70 }],
    })

    expect(before.entries).toHaveLength(2)
    expect(before.top).toBe(1)
    expect(after.entries.map((entry) => entry.value)).toEqual([50, 30, 70])
    expect(after.top).toBe(2)
    expect(stackIsConsistent(after)).toBe(true)
  })

  it('moves top and removes the popped entry', () => {
    const before = buildStack([50, 30, 70])
    const moved = applyStackDelta(before, {
      updated: [{ id: TOP_POINTER, from: 2, to: 1 }],
    })
    const removed = applyStackDelta(moved, { removed: ['s3'] })

    expect(moved.top).toBe(1)
    // The old top entry is still in the array for one beat, above top.
    expect(moved.entries).toHaveLength(3)
    expect(stackValues(moved)).toEqual([50, 30])
    expect(removed.entries.map((entry) => entry.id)).toEqual(['s1', 's2'])
    expect(removed.top).toBe(1)
    expect(stackIsConsistent(removed)).toBe(true)
  })

  it('updates capacity through its reserved field', () => {
    const before = buildStack([1, 2, 3, 4])
    const after = applyStackDelta(before, {
      updated: [{ id: CAPACITY_FIELD, from: 4, to: 8 }],
    })

    expect(after.capacity).toBe(8)
    expect(after.entries).toHaveLength(4)
  })

  it('does not repeat an entry that already exists', () => {
    const stack = buildStack([1, 2])
    const again = applyStackDelta(stack, {
      created: [{ id: 's1', value: 1 }],
    })

    expect(again.entries).toHaveLength(2)
  })

  it('fails loudly on an unknown field or an edge edit', () => {
    const stack = buildStack([1])

    expect(() =>
      applyStackDelta(stack, {
        updated: [{ id: '@bottom', from: null, to: 0 }],
      }),
    ).toThrow(/unknown structure field "@bottom"/)

    expect(() =>
      applyStackDelta(stack, {
        linked: [{ from: 's1', to: 's2', kind: 'next' }],
      }),
    ).toThrow(/stack has no edges/)
  })
})
