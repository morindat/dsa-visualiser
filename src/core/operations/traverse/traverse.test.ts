import { describe, expect, it } from 'vitest'
import {
  buildBst,
  inorderNodeIds,
  postorderNodeIds,
  preorderNodeIds,
} from '../../model/bst'
import { inorder } from './inorder'
import { levelOrder } from './levelOrder'
import { postorder } from './postorder'
import { preorder } from './preorder'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

const VALUES = [50, 30, 70, 20, 40, 60, 80]
const tree = buildBst(VALUES)

describe('depth-first traversals', () => {
  it('preorder visits the node before its children', () => {
    const { order, orderIds, trace } = preorder(tree)

    expect(order).toEqual([50, 30, 20, 40, 70, 60, 80])
    expect(orderIds).toEqual(preorderNodeIds(tree))
    // One call/enter step and one visit step per node.
    expect(trace).toHaveLength(14)
    expect(trace[0].codeLine).toBe(1)
    // `output.append(node.value)` is line 4 of the pure listing.
    const visits = trace.filter((step) => step.codeLine === 4)
    expect(visits).toHaveLength(7)
    expect(visits[visits.length - 1].aux?.output).toEqual(order)
    expect(trace.every((step) => step.operation === 'preorder')).toBe(true)
  })

  it('inorder visits the node between its children and is sorted on a BST', () => {
    const { order, orderIds, trace } = inorder(tree)

    expect(order).toEqual([20, 30, 40, 50, 60, 70, 80])
    expect(orderIds).toEqual(inorderNodeIds(tree))
    expect([...order].sort((a, b) => Number(a) - Number(b))).toEqual(order)
    // Descend left first, then the D visit sits between the recursive calls.
    expect(trace[0].codeLine).toBe(1)
    expect(trace[1].codeLine).toBe(4)
    const visits = trace.filter((step) => step.codeLine === 5)
    expect(visits).toHaveLength(7)
    expect(visits[visits.length - 1].aux?.output).toEqual(order)
  })

  it('postorder visits the node after both children, so the root is last', () => {
    const { order, orderIds, trace } = postorder(tree)

    expect(order).toEqual([20, 40, 30, 60, 80, 70, 50])
    expect(orderIds).toEqual(postorderNodeIds(tree))
    expect(orderIds[orderIds.length - 1]).toBe(tree.root)
    // The visit comes last: line 6.
    const visits = trace.filter((step) => step.codeLine === 6)
    expect(visits).toHaveLength(7)
    expect(visits[visits.length - 1].aux?.output).toEqual(order)
  })

  it('carries the live call stack and output in aux (recursion panel data)', () => {
    const { trace } = preorder(tree)
    // The first call is the root, at depth 0, with a one-frame stack.
    expect(trace[0].aux?.kind).toBe('recursion')
    expect(trace[0].aux?.frames).toEqual([0])
    expect(trace[0].aux?.frameIds).toEqual(['n1'])
    expect(trace[0].aux?.frameValues).toEqual([50])
    expect(trace[0].aux?.output).toEqual([])
    // The visit of 20 (n4) is three frames deep: 50 → 30 → 20.
    const deep = trace.find((step) => step.highlight.active === 'n4')
    expect(deep?.aux?.frameIds).toEqual(['n1', 'n2', 'n4'])
    expect(deep?.aux?.frameValues).toEqual([50, 30, 20])
    expect(deep?.aux?.frames).toEqual([0, 1, 2])
  })

  it('the three orders differ only in where the visit happens', () => {
    const pre = preorder(tree).orderIds
    const ino = inorder(tree).orderIds
    const post = postorder(tree).orderIds

    // Same nodes, three different sequences.
    expect([...pre].sort()).toEqual([...ino].sort())
    expect([...pre].sort()).toEqual([...post].sort())
    expect(new Set([pre.join(','), ino.join(','), post.join(',')]).size).toBe(3)
  })

  it('emits one explanatory step for an empty tree', () => {
    for (const result of [
      preorder(buildBst([])),
      inorder(buildBst([])),
      postorder(buildBst([])),
    ]) {
      expect(result.trace).toHaveLength(1)
      // `if node = null:` is line 2 of each pure listing.
      expect(result.trace[0].codeLine).toBe(2)
      expect(result.order).toEqual([])
    }
  })

  it('is deterministic and does not mutate the tree (NFR-C2)', () => {
    const snapshot = JSON.stringify(tree)
    expect(JSON.stringify(preorder(tree).trace)).toBe(
      JSON.stringify(preorder(tree).trace),
    )
    expect(JSON.stringify(inorder(tree).trace)).toBe(
      JSON.stringify(inorder(tree).trace),
    )
    expect(JSON.stringify(postorder(tree).trace)).toBe(
      JSON.stringify(postorder(tree).trace),
    )
    expect(JSON.stringify(tree)).toBe(snapshot)
  })
})

describe('levelOrder', () => {
  it('visits level by level, left to right', () => {
    const { order, orderIds, summary } = levelOrder(tree)

    expect(order).toEqual([50, 30, 70, 20, 40, 60, 80])
    expect(orderIds).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'])
    expect(summary.steps).toBeGreaterThan(order.length)
  })

  it('shows the live queue and the growing output after every action', () => {
    const { trace, order } = levelOrder(tree)

    expect(trace[0].codeLine).toBe(3)
    expect(trace[0].aux?.kind).toBe('queue')
    expect(trace[0].aux?.values).toEqual(['n1'])
    expect(trace[0].aux?.output).toEqual([])

    // After dequeuing the root and enqueuing both children, the queue is [n2, n3].
    const afterChildren = trace.find(
      (step) => step.codeLine === 7 && step.aux?.values?.[0] === 'n2',
    )
    expect(afterChildren?.aux?.values).toEqual(['n2', 'n3'])
    expect(afterChildren?.aux?.visited).toEqual(['n1'])
    expect(afterChildren?.aux?.output).toEqual([50])

    expect(trace[trace.length - 1].aux?.output).toEqual(order)

    // Every step carries a queue and a growing output list.
    expect(trace.every((step) => step.aux?.kind === 'queue')).toBe(true)
  })

  it('handles an empty tree in one step', () => {
    const { trace, order } = levelOrder(buildBst([]))
    expect(trace).toHaveLength(1)
    expect(trace[0].codeLine).toBe(3)
    expect(order).toEqual([])
  })

  it('is deterministic (NFR-C2)', () => {
    expect(JSON.stringify(levelOrder(tree).trace)).toBe(
      JSON.stringify(levelOrder(tree).trace),
    )
  })
})
