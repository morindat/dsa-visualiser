import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  applyBstDelta,
  assertBst,
  bstHeight,
  bstSize,
  buildBst,
  childKindOf,
  deleteValue,
  EMPTY_BST,
  inorderNodeIds,
  insertValue,
  isBst,
  maxNodeId,
  minNodeId,
  nextBstNodeId,
  parentOf,
  searchValue,
  valuesInOrder,
} from './bst'
import { bstInsert } from '../operations/bst/insert'
import { bstDelete } from '../operations/bst/delete'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

const VALUES = [50, 30, 70, 20, 40, 60, 80]

describe('bst model', () => {
  it('builds the textbook shape with deterministic ids', () => {
    const tree = buildBst([50, 30, 70, 45])

    expect(tree.root).toBe('n1')
    expect(tree.nodes.map((node) => node.id)).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(inorderNodeIds(tree)).toEqual(['n2', 'n4', 'n1', 'n3'])
    expect(valuesInOrder(tree)).toEqual([30, 45, 50, 70])
    expect(bstSize(tree)).toBe(4)
    expect(bstHeight(tree)).toBe(3)
    expect(isBst(tree)).toBe(true)
  })

  it('is deterministic — same input, identical model (NFR-C2)', () => {
    expect(JSON.stringify(buildBst(VALUES))).toBe(
      JSON.stringify(buildBst(VALUES)),
    )
  })

  it('insertValue ignores a duplicate and reports it', () => {
    const tree = buildBst([50, 30, 70])
    const result = insertValue(tree, 30)

    expect(result.insertedId).toBeNull()
    expect(inorderNodeIds(result.tree)).toEqual(inorderNodeIds(tree))
  })

  it('nextBstNodeId continues the n1..nk sequence', () => {
    expect(nextBstNodeId(EMPTY_BST)).toBe('n1')
    expect(nextBstNodeId(buildBst([1, 2, 3]))).toBe('n4')
  })

  it('searchValue finds present keys and reports absent ones as null', () => {
    const tree = buildBst(VALUES)
    expect(searchValue(tree, 40)).toBe('n5')
    expect(searchValue(tree, 41)).toBeNull()
  })

  it('derives parent and child kind from the pointers', () => {
    const tree = buildBst([50, 30, 70, 45])
    expect(parentOf(tree, 'n4')).toBe('n2')
    expect(childKindOf(tree, 'n4')).toBe('right')
    expect(parentOf(tree, 'n1')).toBeNull()
    expect(childKindOf(tree, 'n1')).toBeNull()
  })

  it('reports min and max as the extreme nodes', () => {
    const tree = buildBst(VALUES)
    expect(valuesInOrder(tree)[0]).toBe(20)
    expect(minNodeId(tree)).toBe('n4')
    expect(maxNodeId(tree)).toBe('n7')
  })

  it('deletes a leaf, a one-child node and a two-children node, staying a BST', () => {
    // Leaf
    const leaf = deleteValue(buildBst([50, 30, 70]), 30)
    expect(valuesInOrder(leaf)).toEqual([50, 70])
    assertBst(leaf)

    // One child: 30 now has only the 20 child.
    const oneChild = deleteValue(buildBst([50, 30, 70, 20]), 30)
    expect(valuesInOrder(oneChild)).toEqual([20, 50, 70])
    assertBst(oneChild)

    // Two children: delete the root, whose successor is the leftmost of the right.
    const twoChildren = deleteValue(buildBst([50, 30, 70, 60, 80]), 50)
    expect(valuesInOrder(twoChildren)).toEqual([30, 60, 70, 80])
    assertBst(twoChildren)

    // Absent key changes nothing.
    const absent = deleteValue(buildBst(VALUES), 41)
    expect(JSON.stringify(absent)).toBe(JSON.stringify(buildBst(VALUES)))
  })

  it('replays a generated trace to the same model the generator ended with', () => {
    // Cross-check the reducer against the untraced reference: replaying the deltas
    // must land on the same tree the reference computation returns.
    const initial = buildBst([50, 30, 70, 20, 40])
    const inserted = bstInsert(initial, { value: 45 })

    let replayed = initial
    for (const step of inserted.trace)
      replayed = applyBstDelta(replayed, step.delta)
    expect(replayed).toEqual(inserted.finalState)
    expect(replayed).toEqual(insertValue(initial, 45).tree)

    const deleted = bstDelete(inserted.finalState, { value: 50 })
    let deletedReplay = inserted.finalState
    for (const step of deleted.trace)
      deletedReplay = applyBstDelta(deletedReplay, step.delta)
    expect(deletedReplay).toEqual(deleted.finalState)
    expect(deletedReplay).toEqual(deleteValue(inserted.finalState, 50))
  })

  it('isBst rejects a broken ordering and a disconnected node', () => {
    const broken = {
      nodes: [
        { id: 'n1', value: 50, left: 'n2', right: null },
        { id: 'n2', value: 60, left: null, right: null },
      ],
      root: 'n1',
    }
    expect(isBst(broken)).toBe(false)

    const disconnected = {
      nodes: [
        { id: 'n1', value: 50, left: null, right: null },
        { id: 'n2', value: 30, left: null, right: null },
      ],
      root: 'n1',
    }
    expect(isBst(disconnected)).toBe(false)
  })

  it('holds the BST invariant after any sequence of inserts (property-based, NFR-C1)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 60 }),
        (values) => {
          const tree = buildBst(values)
          // The invariant holds, and the sorted output is exactly the deduplicated set.
          if (!isBst(tree)) return false
          const sorted = [...new Set(values)].sort((a, b) => a - b)
          return JSON.stringify(valuesInOrder(tree)) === JSON.stringify(sorted)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('holds the BST invariant after any delete (property-based, NFR-C1)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -30, max: 30 }), { maxLength: 40 }),
        fc.integer({ min: -30, max: 30 }),
        (values, key) => {
          const tree = buildBst(values)
          const after = deleteValue(tree, key)
          return isBst(after)
        },
      ),
      { numRuns: 100 },
    )
  })
})
