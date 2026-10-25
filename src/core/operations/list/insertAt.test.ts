import { describe, expect, it } from 'vitest'
import { buildList, orderFromHead, valuesInOrder } from '../../model/linkedList'
import { insertAt } from './insertAt'

// DOM-free: this is part of `npm run test:core`.

describe('insertAt', () => {
  it('inserts at the head for position 0 without walking', () => {
    const { finalState, summary } = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 0,
    })

    expect(valuesInOrder(finalState)).toEqual([45, 50, 30, 70])
    expect(orderFromHead(finalState)).toEqual(['n4', 'n1', 'n2', 'n3'])
    expect(finalState.head).toBe('n4')
    expect(summary.conclusion).toContain('position 0')
  })

  it('splices between two nodes for a middle position', () => {
    const { trace, finalState } = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 2,
    })

    expect(valuesInOrder(finalState)).toEqual([50, 30, 45, 70])
    expect(orderFromHead(finalState)).toEqual(['n1', 'n2', 'n4', 'n3'])
    // The new node points at n3, then n2 points at the new node.
    expect(
      trace.some((step) =>
        step.delta.linked?.some(
          (edge) => edge.from === 'n4' && edge.to === 'n3',
        ),
      ),
    ).toBe(true)
    expect(
      trace.some((step) =>
        step.delta.linked?.some(
          (edge) => edge.from === 'n2' && edge.to === 'n4',
        ),
      ),
    ).toBe(true)
  })

  it('inserts after the head for position 1', () => {
    const { trace, finalState } = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 1,
    })

    expect(valuesInOrder(finalState)).toEqual([50, 45, 30, 70])
    expect(orderFromHead(finalState)).toEqual(['n1', 'n4', 'n2', 'n3'])
    // No hop is needed: head is already the predecessor.
    expect(trace.map((step) => step.codeLine)).toEqual([2, 7, 8, 9, 12, 13, 14])
  })

  it('walks one hop per position and exposes the O(k) cost', () => {
    const atTwo = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 2,
    })
    const traceLines = atTwo.trace.map((step) => step.codeLine)

    expect(traceLines.filter((line) => line === 10)).toHaveLength(1)
    expect(traceLines.filter((line) => line === 11)).toHaveLength(1)
    expect(atTwo.summary.comparisons).toBeGreaterThanOrEqual(2)
  })

  it('appends when the position is at or past the end', () => {
    const atEnd = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 3,
    })
    const pastEnd = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 99,
    })

    expect(valuesInOrder(atEnd.finalState)).toEqual([50, 30, 70, 45])
    expect(valuesInOrder(pastEnd.finalState)).toEqual([50, 30, 70, 45])
    expect(pastEnd.summary.conclusion).toContain('clamping')
  })

  it('inserts into an empty list as the head even for a positive position', () => {
    const { finalState } = insertAt(buildList([]), {
      value: 7,
      position: 5,
    })

    expect(valuesInOrder(finalState)).toEqual([7])
    expect(finalState.head).toBe('n1')
  })

  it('keeps the new node floating until both links are made', () => {
    const { trace } = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 2,
    })

    const create = trace[0]
    expect(create.highlight).toEqual({
      nodes: ['n4'],
      active: 'n4',
      edges: [],
    })
    expect(create.delta.created).toEqual([{ id: 'n4', value: 45 }])
    expect(create.delta.linked).toBeUndefined()
  })

  it('is deterministic and does not mutate the initial list', () => {
    const initial = buildList([50, 30, 70])
    const snapshot = JSON.stringify(initial)

    const once = insertAt(initial, { value: 45, position: 2 })
    const twice = insertAt(initial, { value: 45, position: 2 })

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
    expect(JSON.stringify(initial)).toBe(snapshot)
    expect(valuesInOrder(initial)).toEqual([50, 30, 70])
  })
})
