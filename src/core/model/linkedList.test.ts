import { describe, expect, it } from 'vitest'
import {
  HEAD_POINTER,
  applyListDelta,
  buildList,
  nextNodeId,
  orderFromHead,
  valuesInOrder,
} from './linkedList'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

describe('linked list model', () => {
  it('builds a list in input order with deterministic ids', () => {
    const list = buildList([50, 30, 70])

    expect(list.nodes).toEqual([
      { id: 'n1', value: 50 },
      { id: 'n2', value: 30 },
      { id: 'n3', value: 70 },
    ])
    expect(list.head).toBe('n1')
    expect(list.links).toEqual([
      { from: 'n1', to: 'n2', kind: 'next' },
      { from: 'n2', to: 'n3', kind: 'next' },
    ])
    expect(orderFromHead(list)).toEqual(['n1', 'n2', 'n3'])
    expect(valuesInOrder(list)).toEqual([50, 30, 70])
  })

  it('builds an empty list', () => {
    const list = buildList([])

    expect(list).toEqual({ nodes: [], links: [], head: null })
    expect(orderFromHead(list)).toEqual([])
    expect(valuesInOrder(list)).toEqual([])
  })

  it('hands out the next id after the highest existing one', () => {
    expect(nextNodeId(buildList([]))).toBe('n1')
    expect(nextNodeId(buildList([1, 2, 3]))).toBe('n4')
  })

  it('applies a delta without mutating the previous state', () => {
    const before = buildList([50])
    const after = applyListDelta(before, {
      created: [{ id: 'n2', value: 45 }],
      linked: [{ from: 'n2', to: 'n1', kind: 'next' }],
      updated: [{ id: HEAD_POINTER, from: 'n1', to: 'n2' }],
    })

    expect(before.nodes).toHaveLength(1)
    expect(before.head).toBe('n1')
    expect(after.nodes.map((node) => node.value)).toEqual([50, 45])
    expect(after.head).toBe('n2')
    expect(orderFromHead(after)).toEqual(['n2', 'n1'])
  })

  it('removes links on unlink, tolerates an empty delta, and updates a value', () => {
    const linked = buildList([1, 2])

    expect(
      applyListDelta(linked, { unlinked: [{ from: 'n1', to: 'n2' }] }).links,
    ).toEqual([])
    expect(applyListDelta(linked, {})).toEqual(linked)
    expect(
      applyListDelta(linked, { updated: [{ id: 'n1', from: 1, to: 99 }] })
        .nodes[0].value,
    ).toBe(99)
  })

  it('does not repeat a node or a link that already exists', () => {
    const list = buildList([1, 2])
    const again = applyListDelta(list, {
      created: [{ id: 'n1', value: 1 }],
      linked: [{ from: 'n1', to: 'n2', kind: 'next' }],
    })

    expect(again.nodes).toHaveLength(2)
    expect(again.links).toHaveLength(1)
  })

  it('fails loudly on a structure field it does not know', () => {
    const list = buildList([1])

    // Only `@head` exists for a list; a delta naming anything else means the
    // generator and the model have drifted, so the reducer refuses it.
    expect(() =>
      applyListDelta(list, {
        updated: [{ id: '@tail', from: null, to: 'n1' }],
      }),
    ).toThrow(/unknown structure field "@tail"/)
  })
})
