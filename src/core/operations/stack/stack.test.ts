import { describe, expect, it } from 'vitest'
import {
  buildStack,
  stackIsConsistent,
  stackSize,
  stackValues,
} from '../../model/stack'
import { stackPeek } from './peek'
import { stackPop } from './pop'
import { stackPush } from './push'

// DOM-free: this is part of `npm run test:core`.

describe('stackPush', () => {
  it('advances top then writes the value', () => {
    const { trace, finalState, summary } = stackPush(buildStack([50, 30, 70]), {
      value: 45,
    })

    expect(trace.map((step) => step.codeLine)).toEqual([2, 4, 5, 6])
    expect(trace[1].delta).toEqual({
      updated: [{ id: '@top', from: 2, to: 3 }],
    })
    expect(trace[2].delta).toEqual({
      created: [{ id: 's4', value: 45 }],
    })
    expect(stackValues(finalState)).toEqual([50, 30, 70, 45])
    expect(finalState.top).toBe(3)
    expect(stackSize(finalState)).toBe(4)
    expect(stackIsConsistent(finalState)).toBe(true)
    expect(summary.conclusion).toContain('O(1)')
  })

  it('grows the array when it is full and reports the resize', () => {
    const { trace, finalState, summary } = stackPush(buildStack([1, 2, 3, 4]), {
      value: 5,
    })

    expect(trace.map((step) => step.codeLine)).toEqual([2, 3, 4, 5, 6])
    expect(trace[1].delta.updated).toEqual([
      { id: '@capacity', from: 4, to: 8 },
    ])
    expect(finalState.capacity).toBe(8)
    expect(stackValues(finalState)).toEqual([1, 2, 3, 4, 5])
    expect(summary.conclusion).toContain('resize')
  })

  it('pushes into an empty stack at slot 0', () => {
    const { finalState } = stackPush(buildStack([]), { value: 7 })

    expect(stackValues(finalState)).toEqual([7])
    expect(finalState.top).toBe(0)
    expect(stackIsConsistent(finalState)).toBe(true)
  })

  it('is deterministic and does not mutate the initial stack', () => {
    const initial = buildStack([50, 30, 70])
    const snapshot = JSON.stringify(initial)

    const once = stackPush(initial, { value: 45 })
    const twice = stackPush(initial, { value: 45 })

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
    expect(JSON.stringify(initial)).toBe(snapshot)
  })
})

describe('stackPop', () => {
  it('returns the most recent value and removes it', () => {
    const { trace, finalState, popped, summary } = stackPop(
      buildStack([50, 30, 70]),
    )

    expect(popped).toBe(70)
    expect(trace.map((step) => step.codeLine)).toEqual([2, 4, 5, 6, 7])
    expect(stackValues(finalState)).toEqual([50, 30])
    expect(finalState.top).toBe(1)
    expect(stackIsConsistent(finalState)).toBe(true)
    expect(summary.conclusion).toContain('top is now 30')
  })

  it('shows top moving down before the abandoned cell is removed', () => {
    const { trace } = stackPop(buildStack([50, 30, 70]))

    const move = trace.find((step) => step.codeLine === 5)
    const remove = trace.find((step) => step.codeLine === 6)

    expect(move?.delta).toEqual({
      updated: [{ id: '@top', from: 2, to: 1 }],
    })
    expect(move?.delta.removed).toBeUndefined()
    expect(remove?.delta).toEqual({ removed: ['s3'] })
  })

  it('pops the last value and leaves an empty stack', () => {
    const { finalState, popped } = stackPop(buildStack([50]))

    expect(popped).toBe(50)
    expect(stackValues(finalState)).toEqual([])
    expect(finalState.entries).toEqual([])
    expect(finalState.top).toBe(-1)
    expect(stackIsConsistent(finalState)).toBe(true)
  })

  it('treats underflow as an outcome, not an exception', () => {
    const empty = buildStack([])
    const { trace, finalState, popped, summary } = stackPop(empty)

    expect(popped).toBeNull()
    expect(trace).toHaveLength(2)
    expect(trace.map((step) => step.codeLine)).toEqual([2, 3])
    expect(finalState).toEqual(empty)
    expect(summary.conclusion).toContain('underflow')
  })

  it('is LIFO across repeated pops', () => {
    let state = buildStack([10, 20, 30])
    const popped: (string | number)[] = []

    for (let i = 0; i < 3; i += 1) {
      const result = stackPop(state)
      if (result.popped !== null) popped.push(result.popped)
      state = result.finalState
    }

    expect(popped).toEqual([30, 20, 10])
    expect(stackValues(state)).toEqual([])
  })

  it('is deterministic and does not mutate the initial stack', () => {
    const initial = buildStack([50, 30, 70])
    const snapshot = JSON.stringify(initial)

    const once = stackPop(initial)
    const twice = stackPop(initial)

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
    expect(JSON.stringify(initial)).toBe(snapshot)
  })
})

describe('stackPeek', () => {
  it('returns the top value without changing the stack', () => {
    const initial = buildStack([50, 30, 70])
    const { trace, finalState, peeked, summary } = stackPeek(initial)

    expect(peeked).toBe(70)
    expect(trace.map((step) => step.codeLine)).toEqual([2, 4])
    expect(finalState).toEqual(initial)
    expect(trace.every((step) => Object.keys(step.delta).length === 0)).toBe(
      true,
    )
    expect(summary.conclusion).toContain('unchanged')
  })

  it('returns null on an empty stack', () => {
    const { trace, finalState, peeked } = stackPeek(buildStack([]))

    expect(peeked).toBeNull()
    expect(trace.map((step) => step.codeLine)).toEqual([2, 3])
    expect(finalState).toEqual(buildStack([]))
  })

  it('is deterministic', () => {
    const once = stackPeek(buildStack([50, 30, 70]))
    const twice = stackPeek(buildStack([50, 30, 70]))

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
  })
})
