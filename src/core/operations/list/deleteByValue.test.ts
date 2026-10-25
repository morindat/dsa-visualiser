import { describe, expect, it } from 'vitest'
import { buildList, orderFromHead, valuesInOrder } from '../../model/linkedList'
import { deleteByValue } from './deleteByValue'

describe('deleteByValue', () => {
  it('deletes the head node', () => {
    const { finalState } = deleteByValue(buildList([50, 30, 70]), {
      value: 50,
    })

    expect(valuesInOrder(finalState)).toEqual([30, 70])
    expect(finalState.head).toBe('n2')
    expect(finalState.nodes.map((node) => node.id)).toEqual(['n2', 'n3'])
  })

  it('deletes a middle node and reconnects its neighbours', () => {
    const { finalState } = deleteByValue(buildList([50, 30, 70]), {
      value: 30,
    })

    expect(valuesInOrder(finalState)).toEqual([50, 70])
    expect(orderFromHead(finalState)).toEqual(['n1', 'n3'])
    expect(finalState.links).toEqual([{ from: 'n1', to: 'n3', kind: 'next' }])
  })

  it('deletes the last node', () => {
    const { finalState } = deleteByValue(buildList([50, 30, 70]), {
      value: 70,
    })

    expect(valuesInOrder(finalState)).toEqual([50, 30])
    expect(orderFromHead(finalState)).toEqual(['n1', 'n2'])
    expect(finalState.nodes.map((node) => node.id)).toEqual(['n1', 'n2'])
  })

  it('deletes only the first occurrence of a duplicate value', () => {
    const { finalState } = deleteByValue(buildList([50, 30, 30, 70]), {
      value: 30,
    })

    expect(valuesInOrder(finalState)).toEqual([50, 30, 70])
    expect(orderFromHead(finalState)).toEqual(['n1', 'n3', 'n4'])
  })

  it('leaves the list unchanged when the value is not found', () => {
    const initial = buildList([50, 30, 70])
    const { finalState, summary, trace } = deleteByValue(initial, {
      value: 99,
    })

    expect(valuesInOrder(finalState)).toEqual([50, 30, 70])
    expect(finalState).toEqual(initial)
    expect(summary.conclusion).toContain('Value 99 was not found')
    expect(trace[trace.length - 1].narration).toContain(
      'Value 99 was not found',
    )
  })

  it('handles an empty list', () => {
    const { finalState, summary } = deleteByValue(buildList([]), {
      value: 7,
    })

    expect(valuesInOrder(finalState)).toEqual([])
    expect(summary.conclusion).toContain('Value 7 was not found')
  })

  it('does not mutate the original list', () => {
    const initial = buildList([50, 30, 70])
    const snapshot = JSON.stringify(initial)

    deleteByValue(initial, { value: 30 })

    expect(JSON.stringify(initial)).toBe(snapshot)
    expect(valuesInOrder(initial)).toEqual([50, 30, 70])
  })

  it('produces a deterministic trace', () => {
    const once = deleteByValue(buildList([50, 30, 70]), { value: 30 })
    const twice = deleteByValue(buildList([50, 30, 70]), { value: 30 })

    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
  })
})
