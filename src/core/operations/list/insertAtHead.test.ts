import { describe, expect, it } from 'vitest'
import { buildList, orderFromHead, valuesInOrder } from '../../model/linkedList'
import { insertAtHead } from './insertAtHead'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

describe('insertAtHead', () => {
  it('emits one step per pseudocode line that does something', () => {
    const { trace, summary } = insertAtHead(buildList([50, 30, 70]), {
      value: 45,
    })

    expect(trace.map((step) => step.index)).toEqual([0, 1, 2, 3])
    expect(trace.map((step) => step.codeLine)).toEqual([2, 3, 4, 5])
    expect(trace.every((step) => step.operation === 'insertAtHead')).toBe(true)
    expect(summary).toEqual({
      steps: 4,
      comparisons: 0,
      conclusion: 'Inserted 45 at the head in O(1).',
    })
  })

  it('describes the change as create → link → move head → done', () => {
    const { trace } = insertAtHead(buildList([50, 30, 70]), { value: 45 })

    expect(trace[0].delta).toEqual({ created: [{ id: 'n4', value: 45 }] })
    expect(trace[1].delta).toEqual({
      linked: [{ from: 'n4', to: 'n1', kind: 'next' }],
    })
    expect(trace[2].delta).toEqual({
      updated: [{ id: '@head', from: 'n1', to: 'n4' }],
    })
    expect(trace[3].delta).toEqual({})
  })

  it('produces the right list', () => {
    const { finalState } = insertAtHead(buildList([50, 30, 70]), { value: 45 })

    expect(orderFromHead(finalState)).toEqual(['n4', 'n1', 'n2', 'n3'])
    expect(valuesInOrder(finalState)).toEqual([45, 50, 30, 70])
  })

  it('handles the empty list without a link', () => {
    const { trace, finalState } = insertAtHead(buildList([]), { value: 7 })

    expect(trace[1].delta).toEqual({})
    expect(trace[1].narration).toContain('empty')
    expect(valuesInOrder(finalState)).toEqual([7])
  })

  it('keeps the new node in the structure before it is linked', () => {
    const { trace, finalState } = insertAtHead(buildList([50]), { value: 45 })

    // Step 0 creates the node but does not reconnect the list: it is floating.
    expect(trace[0].highlight).toEqual({
      nodes: ['n2'],
      active: 'n2',
      edges: [],
    })
    // Insert-at-head keeps O(1) auxiliary state, so no step carries `aux`.
    expect(trace.every((step) => step.aux === undefined)).toBe(true)
    // Step 2 moves the head, so the new node becomes reachable.
    expect(valuesInOrder(finalState)).toEqual([45, 50])
  })

  it('is deterministic — the same input gives a byte-identical trace (NFR-C2)', () => {
    const once = insertAtHead(buildList([50, 30, 70]), { value: 45 })
    const twice = insertAtHead(buildList([50, 30, 70]), { value: 45 })

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
  })

  it('does not mutate the structure it was given', () => {
    const initial = buildList([50, 30, 70])
    const snapshot = JSON.stringify(initial)

    insertAtHead(initial, { value: 45 })

    expect(JSON.stringify(initial)).toBe(snapshot)
    expect(orderFromHead(initial)).toEqual(['n1', 'n2', 'n3'])
  })
})
