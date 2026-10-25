import { describe, expect, it } from 'vitest'
import { buildList, orderFromHead, valuesInOrder } from '../../model/linkedList'
import { insertAtTail } from './insertAtTail'

// Part of `npm run test:core`: no DOM, no React, no D3.

describe('insertAtTail', () => {
  it('creates the new node and links it to the last node', () => {
    const { trace, finalState, summary } = insertAtTail(
      buildList([50, 30, 70]),
      { value: 45 },
    )

    expect(trace[0].delta).toEqual({
      created: [{ id: 'n4', value: 45 }],
    })

    expect(
      trace.some((step) =>
        step.delta.linked?.some(
          (link) =>
            link.from === 'n3' && link.to === 'n4' && link.kind === 'next',
        ),
      ),
    ).toBe(true)

    expect(valuesInOrder(finalState)).toEqual([50, 30, 70, 45])
    expect(summary.conclusion).toContain('at the tail')
  })

  it('updates the head when inserting into an empty list', () => {
    const { trace, finalState } = insertAtTail(buildList([]), { value: 7 })

    expect(trace[0].delta).toEqual({
      created: [{ id: 'n1', value: 7 }],
    })

    expect(trace[1].delta).toEqual({
      updated: [{ id: '@head', from: null, to: 'n1' }],
    })

    expect(valuesInOrder(finalState)).toEqual([7])
    expect(finalState.head).toBe('n1')
  })

  it('preserves the existing node order', () => {
    const { finalState } = insertAtTail(buildList([10, 20, 30]), {
      value: 40,
    })

    expect(orderFromHead(finalState)).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(valuesInOrder(finalState)).toEqual([10, 20, 30, 40])
  })

  it('keeps the new node floating until it is linked', () => {
    const { trace } = insertAtTail(buildList([10, 20]), { value: 30 })

    expect(trace[0].highlight).toEqual({
      nodes: ['n3'],
      active: 'n3',
      edges: [],
    })

    expect(trace[0].delta.linked).toBeUndefined()
    expect(trace[0].delta.created).toEqual([{ id: 'n3', value: 30 }])
  })

  it('is deterministic', () => {
    const once = insertAtTail(buildList([10, 20, 30]), { value: 40 })
    const twice = insertAtTail(buildList([10, 20, 30]), { value: 40 })

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
  })

  it('does not mutate the initial structure', () => {
    const initial = buildList([10, 20, 30])
    const snapshot = JSON.stringify(initial)

    insertAtTail(initial, { value: 40 })

    expect(JSON.stringify(initial)).toBe(snapshot)
    expect(valuesInOrder(initial)).toEqual([10, 20, 30])
  })

  it('records the operation id in every step', () => {
    const { trace } = insertAtTail(buildList([10, 20]), { value: 30 })

    expect(trace.length).toBeGreaterThan(0)
    expect(trace.every((step) => step.operation === 'insertAtTail')).toBe(true)
  })
})
