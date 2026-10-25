import { describe, expect, it } from 'vitest'
import {
  buildBst,
  insertValue,
  isBst,
  searchValue,
  valuesInOrder,
} from '../../model/bst'
import { bstDelete } from './delete'
import { bstInsert } from './insert'
import { bstSearch } from './search'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

const VALUES = [50, 30, 70, 20, 40, 60, 80]

describe('bstInsert', () => {
  it('inserts into an empty tree as the root, in one step', () => {
    const { trace, finalState, insertedId } = bstInsert(buildBst([]), {
      value: 42,
    })

    expect(trace).toHaveLength(1)
    expect(trace[0].codeLine).toBe(3)
    expect(trace[0].delta).toEqual({
      created: [{ id: 'n1', value: 42 }],
      updated: [{ id: '@root', from: null, to: 'n1' }],
    })
    expect(insertedId).toBe('n1')
    expect(finalState.root).toBe('n1')
    expect(isBst(finalState)).toBe(true)
  })

  it('creates and links the new leaf only once its slot is known', () => {
    const { trace, finalState, insertedId } = bstInsert(
      buildBst([50, 30, 70]),
      {
        value: 45,
      },
    )

    expect(insertedId).toBe('n4')
    // 50 → left, 30 → right, then create+link in the final step.
    expect(trace.map((step) => step.codeLine)).toEqual([6, 11, 13])
    const link = trace[2]
    expect(link.delta).toEqual({
      created: [{ id: 'n4', value: 45 }],
      linked: [{ from: 'n2', to: 'n4', kind: 'right' }],
    })
    expect(valuesInOrder(finalState)).toEqual([30, 45, 50, 70])
  })

  it('reports a duplicate explicitly and changes nothing', () => {
    const initial = buildBst([50, 30, 70])
    const { trace, finalState, duplicate, insertedId } = bstInsert(initial, {
      value: 30,
    })

    expect(duplicate).toBe(true)
    expect(insertedId).toBeNull()
    expect(trace.map((step) => step.codeLine)).toEqual([6, 16, 17])
    expect(trace[trace.length - 1].narration).toContain('already in the tree')
    expect(JSON.stringify(finalState)).toBe(JSON.stringify(initial))
  })

  it('matches the model reference and is deterministic', () => {
    const initial = buildBst(VALUES)
    const once = bstInsert(initial, { value: 45 })
    const twice = bstInsert(initial, { value: 45 })

    expect(isBst(once.finalState)).toBe(true)
    expect(JSON.stringify(once.trace)).toBe(JSON.stringify(twice.trace))
    // The generator's end state equals the model's untraced reference insertion.
    expect(once.finalState).toEqual(insertValue(initial, 45).tree)
  })
})

describe('bstSearch', () => {
  it('distinguishes found from falling off the tree', () => {
    const tree = buildBst(VALUES)

    const found = bstSearch(tree, { value: 40 })
    expect(found.foundId).toBe('n5')
    expect(found.trace[found.trace.length - 1].codeLine).toBe(5)
    expect(found.trace.every((step) => step.operation === 'bstSearch')).toBe(
      true,
    )

    const missing = bstSearch(tree, { value: 41 })
    expect(missing.foundId).toBeNull()
    expect(missing.trace[missing.trace.length - 1].codeLine).toBe(10)
    expect(missing.trace[missing.trace.length - 1].narration).toContain(
      'not in the tree',
    )
    expect(missing.path.length).toBeGreaterThan(0)
  })

  it('agrees with the model reference search', () => {
    const tree = buildBst(VALUES)
    for (const value of [...VALUES, 41, -5]) {
      const { foundId } = bstSearch(tree, { value })
      expect(foundId).toBe(searchValue(tree, value))
    }
  })

  it('never mutates the tree and never emits a delta', () => {
    const tree = buildBst(VALUES)
    const snapshot = JSON.stringify(tree)
    const { trace, finalState } = bstSearch(tree, { value: 60 })

    expect(JSON.stringify(tree)).toBe(snapshot)
    expect(trace.every((step) => JSON.stringify(step.delta) === '{}')).toBe(
      true,
    )
    expect(JSON.stringify(finalState)).toBe(snapshot)
  })

  it('is deterministic (NFR-C2)', () => {
    const tree = buildBst(VALUES)
    expect(JSON.stringify(bstSearch(tree, { value: 60 }).trace)).toBe(
      JSON.stringify(bstSearch(tree, { value: 60 }).trace),
    )
  })
})

describe('bstDelete', () => {
  it('deletes a leaf and shows the unlink followed by the removal', () => {
    const initial = buildBst([50, 30, 70])
    const { trace, finalState, deleted, removedId } = bstDelete(initial, {
      value: 30,
    })

    expect(deleted).toBe(true)
    expect(removedId).toBe('n2')
    const unlink = trace.find((step) => step.codeLine === 9)
    const remove = trace.find((step) => step.codeLine === 10)
    expect(unlink?.delta.unlinked).toEqual([
      { from: 'n1', to: 'n2', kind: 'left' },
    ])
    expect(remove?.delta.removed).toEqual(['n2'])
    expect(valuesInOrder(finalState)).toEqual([50, 70])
    expect(isBst(finalState)).toBe(true)
  })

  it('splices the only child into the deleted node place (case 2)', () => {
    const initial = buildBst([50, 30, 70, 20])
    const { trace, finalState } = bstDelete(initial, { value: 30 })

    const splice = trace.find((step) => step.codeLine === 14)
    expect(splice?.delta).toEqual({
      unlinked: [{ from: 'n1', to: 'n2', kind: 'left' }],
      linked: [{ from: 'n1', to: 'n4', kind: 'left' }],
    })
    expect(valuesInOrder(finalState)).toEqual([20, 50, 70])
    expect(isBst(finalState)).toBe(true)
  })

  it('copies the in-order successor up and removes it (case 3)', () => {
    const initial = buildBst([50, 30, 70, 60, 80])
    const { trace, finalState, removedId } = bstDelete(initial, { value: 50 })

    expect(removedId).toBe('n4') // the successor 60, not the target 50
    const copy = trace.find((step) => step.codeLine === 20)
    expect(copy?.delta.updated).toEqual([{ id: 'n1', from: 50, to: 60 }])
    const remove = trace.find((step) => step.codeLine === 23)
    expect(remove?.delta.removed).toEqual(['n4'])
    expect(valuesInOrder(finalState)).toEqual([30, 60, 70, 80])
    expect(isBst(finalState)).toBe(true)
  })

  it('reports an absent value honestly, without changing the tree', () => {
    const initial = buildBst(VALUES)
    const { trace, deleted, finalState } = bstDelete(initial, { value: 41 })

    expect(deleted).toBe(false)
    expect(trace[trace.length - 1].codeLine).toBe(7)
    expect(JSON.stringify(finalState)).toBe(JSON.stringify(initial))
  })

  it('handles the root itself: the only node, and the root with one child', () => {
    const only = bstDelete(buildBst([50]), { value: 50 })
    expect(only.finalState.root).toBeNull()
    expect(only.finalState.nodes).toHaveLength(0)

    const rootWithChild = bstDelete(buildBst([50, 30]), { value: 50 })
    // The root pointer moves to the child, and the @root update is its own step.
    expect(rootWithChild.finalState.root).toBe('n2')
    expect(valuesInOrder(rootWithChild.finalState)).toEqual([30])
    const rootUpdate = rootWithChild.trace.find((step) => step.codeLine === 14)
    expect(rootUpdate?.delta.updated).toEqual([
      { id: '@root', from: 'n1', to: 'n2' },
    ])
    expect(isBst(rootWithChild.finalState)).toBe(true)
  })

  it('matches the model reference for a spread of deletions', () => {
    for (const value of [20, 30, 40, 50, 60, 70, 80]) {
      const initial = buildBst(VALUES)
      const { finalState } = bstDelete(initial, { value })
      expect(valuesInOrder(finalState)).toEqual(
        VALUES.filter((candidate) => candidate !== value).sort((a, b) => a - b),
      )
      expect(isBst(finalState)).toBe(true)
    }
  })

  it('is deterministic (NFR-C2)', () => {
    const initial = buildBst(VALUES)
    expect(JSON.stringify(bstDelete(initial, { value: 50 }).trace)).toBe(
      JSON.stringify(bstDelete(initial, { value: 50 }).trace),
    )
  })
})
