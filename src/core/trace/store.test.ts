import { describe, expect, it } from 'vitest'
import { applyListDelta, buildList, valuesInOrder } from '../model/linkedList'
import { insertAtHead } from '../operations/list/insertAtHead'
import { createTraceStore } from './store'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

function storeFor(
  values: number[],
  inserted: number,
  checkpointInterval?: number,
) {
  const initial = buildList(values)
  const { trace } = insertAtHead(initial, { value: inserted })
  return createTraceStore(initial, trace, applyListDelta, {
    checkpointInterval,
  })
}

describe('trace store', () => {
  it('reconstructs the structure after every step', () => {
    const store = storeFor([50, 30, 70], 45)

    expect(store.length).toBe(4)
    expect(store.reconstruct(-1).head).toBe('n1')

    // Step 0: the node exists but is not linked, and the head has not moved.
    expect(store.reconstruct(0).nodes.map((node) => node.id)).toEqual([
      'n1',
      'n2',
      'n3',
      'n4',
    ])
    expect(valuesInOrder(store.reconstruct(0))).toEqual([50, 30, 70])

    // Step 1: the link exists, but `head` still points at the old head.
    expect(store.reconstruct(1).links).toContainEqual({
      from: 'n4',
      to: 'n1',
      kind: 'next',
    })
    expect(store.reconstruct(1).head).toBe('n1')
    expect(valuesInOrder(store.reconstruct(1))).toEqual([50, 30, 70])

    // Step 2: the head moves, so the new node is now reachable.
    expect(store.reconstruct(2).head).toBe('n4')
    expect(valuesInOrder(store.reconstruct(2))).toEqual([45, 50, 30, 70])
    expect(valuesInOrder(store.reconstruct(3))).toEqual([45, 50, 30, 70])
  })

  it('gives the same answer with and without intermediate checkpoints', () => {
    const withCheckpoints = storeFor([1, 2, 3, 4, 5], 0, 2)
    const without = storeFor([1, 2, 3, 4, 5], 0, 1000)

    for (let i = -1; i < withCheckpoints.length; i += 1) {
      expect(withCheckpoints.reconstruct(i)).toEqual(without.reconstruct(i))
    }
  })

  it('clamps an out-of-range index instead of failing', () => {
    const store = storeFor([1], 2)

    expect(store.reconstruct(-5)).toEqual(store.reconstruct(-1))
    expect(store.reconstruct(99)).toEqual(store.reconstruct(store.length - 1))
  })

  it('treats a non-positive checkpoint interval as every step', () => {
    const store = storeFor([1, 2], 3, 0)

    expect(valuesInOrder(store.reconstruct(store.length - 1))).toEqual([
      3, 1, 2,
    ])
  })

  it('returns a copy, so a caller cannot corrupt a checkpoint', () => {
    const store = storeFor([1, 2], 3)
    const state = store.reconstruct(1)

    state.head = null
    state.nodes.push({ id: 'nope', value: -1 })

    expect(store.reconstruct(1).head).not.toBeNull()
    expect(store.reconstruct(1).nodes.map((node) => node.id)).not.toContain(
      'nope',
    )
  })
})
