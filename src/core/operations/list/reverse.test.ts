import { describe, expect, it } from 'vitest'
import { buildList, orderFromHead, valuesInOrder } from '../../model/linkedList'
import { reverse } from './reverse'

// DOM-free: no browser, no React, no D3 (NFR-M2).

describe('reverse', () => {
  it('returns the values in reverse order with the same nodes', () => {
    const { finalState, summary } = reverse(buildList([50, 30, 70]))

    expect(orderFromHead(finalState)).toEqual(['n3', 'n2', 'n1'])
    expect(valuesInOrder(finalState)).toEqual([70, 30, 50])
    expect(finalState.nodes.map((node) => node.id).sort()).toEqual([
      'n1',
      'n2',
      'n3',
    ])
    expect(finalState.head).toBe('n3')
    expect(summary.conclusion).toContain('3 nodes')
  })

  it('is an involution — reversing twice restores the original order', () => {
    const original = buildList([50, 30, 70, 20])
    const once = reverse(original).finalState
    const twice = reverse(once).finalState

    expect(valuesInOrder(twice)).toEqual([50, 30, 70, 20])
    expect(orderFromHead(twice)).toEqual(['n1', 'n2', 'n3', 'n4'])
  })

  it('links each node backwards and moves the head to the old tail', () => {
    const { trace, finalState } = reverse(buildList([50, 30, 70]))

    // The first flip cuts n1 -> n2 and leaves n1 pointing at null.
    const firstFlip = trace.find(
      (step) =>
        step.delta.unlinked?.some(
          (edge) => edge.from === 'n1' && edge.to === 'n2',
        ) === true,
    )
    expect(firstFlip).toBeDefined()
    expect(firstFlip?.delta.linked).toBeUndefined()

    // A later flip creates a backwards link.
    expect(
      trace.some((step) =>
        step.delta.linked?.some(
          (edge) =>
            edge.from === 'n2' && edge.to === 'n1' && edge.kind === 'next',
        ),
      ),
    ).toBe(true)

    expect(finalState.links).toEqual([
      { from: 'n2', to: 'n1', kind: 'next' },
      { from: 'n3', to: 'n2', kind: 'next' },
    ])
  })

  it('carries the standard three pointer variables on every step', () => {
    const { trace } = reverse(buildList([50, 30, 70]))

    for (const step of trace) {
      expect(step.aux?.kind).toBe('pointers')
      expect(step.aux?.pointers?.map((pointer) => pointer.role)).toEqual([
        'prev',
        'current',
        'next',
      ])
    }

    // `prev` starts null and `current` starts at the head.
    expect(trace[0].aux?.pointers).toEqual([
      { role: 'prev', id: null },
      { role: 'current', id: null },
      { role: 'next', id: null },
    ])
    expect(trace[1].aux?.pointers).toEqual([
      { role: 'prev', id: null },
      { role: 'current', id: 'n1' },
      { role: 'next', id: null },
    ])
    // At the end prev is the new head and current is null.
    expect(trace[trace.length - 1].aux?.pointers).toEqual([
      { role: 'prev', id: 'n3' },
      { role: 'current', id: null },
      { role: 'next', id: null },
    ])
  })

  it('handles the empty list without inventing a node', () => {
    const { trace, finalState } = reverse(buildList([]))

    expect(finalState).toEqual({ nodes: [], links: [], head: null })
    expect(trace).toHaveLength(5)
    expect(trace.map((step) => step.codeLine)).toEqual([2, 3, 4, 9, 10])
    expect(trace.every((step) => step.delta.linked === undefined)).toBe(true)
  })

  it('handles a single node as a no-op on the links', () => {
    const { trace, finalState } = reverse(buildList([50]))

    expect(valuesInOrder(finalState)).toEqual([50])
    expect(finalState.head).toBe('n1')
    expect(finalState.links).toEqual([])
    // The head does not change, so the final head step carries no delta.
    expect(trace.every((step) => step.delta.linked === undefined)).toBe(true)
    expect(trace.every((step) => step.delta.updated === undefined)).toBe(true)
  })

  it('emits the pseudocode lines in the standard three-pointer order', () => {
    const { trace } = reverse(buildList([50, 30]))

    // 2 prev, 3 current, then per node: 4 check, 5 save, 6 flip, 7 prev,
    // 8 current; finally 4 check-fails, 9 head, 10 return.
    expect(trace.map((step) => step.codeLine)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 4, 5, 6, 7, 8, 4, 9, 10,
    ])
  })

  it('is deterministic and does not mutate the initial list', () => {
    const initial = buildList([50, 30, 70])
    const snapshot = JSON.stringify(initial)

    const once = reverse(initial)
    const twice = reverse(initial)

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
    expect(JSON.stringify(initial)).toBe(snapshot)
    expect(valuesInOrder(initial)).toEqual([50, 30, 70])
  })
})
