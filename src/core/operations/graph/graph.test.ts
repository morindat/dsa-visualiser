import { describe, expect, it } from 'vitest'
import { buildGraphFromLabels } from '../../model/graph'
import { bfs } from './bfs'
import { dfs } from './dfs'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

/**
 * Undirected demo graph:
 *
 *   A — B — D
 *   |   |   |
 *   C — E — F
 */
const graph = buildGraphFromLabels(
  ['A', 'B', 'C', 'D', 'E', 'F'],
  [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'D'],
    ['B', 'E'],
    ['C', 'E'],
    ['D', 'F'],
    ['E', 'F'],
  ],
)

describe('bfs', () => {
  it('visits in rings of increasing distance from the source', () => {
    const { order, distances, parents, summary } = bfs(graph, { source: 'v1' })

    expect(order).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6'])
    expect(distances).toEqual({
      v1: 0,
      v2: 1,
      v3: 1,
      v4: 2,
      v5: 2,
      v6: 3,
    })
    expect(parents).toEqual({
      v1: null,
      v2: 'v1',
      v3: 'v1',
      v4: 'v2',
      v5: 'v2',
      v6: 'v4',
    })
    // Every adjacency entry is examined exactly once: 2 × 7 edges.
    expect(summary.comparisons).toBe(14)
  })

  it('emits the three distinct event kinds with the right code lines', () => {
    const { trace } = bfs(graph, { source: 'v1' })
    const lines = new Set(trace.map((step) => step.codeLine))

    expect(lines.has(3)).toBe(true) // initialise visited/queue with the source
    expect(lines.has(6)).toBe(true) // visit (dequeue)
    expect(lines.has(7)).toBe(true) // examine an edge
    expect(lines.has(9)).toBe(true) // discover via an edge
    expect(trace[trace.length - 1].codeLine).toBe(11)
  })

  it('shows the frontier and the discovered set in aux', () => {
    const { trace } = bfs(graph, { source: 'v1' })

    expect(trace.every((step) => step.aux?.kind === 'queue')).toBe(true)
    expect(trace[0].aux?.values).toEqual(['v1'])
    expect(trace[0].aux?.visited).toEqual(['v1'])
    // After discovering B and C, the queue holds both, in adjacency order.
    const afterDiscover = trace.find((step) => step.codeLine === 9)
    expect(afterDiscover?.aux?.visited).toEqual(['v1', 'v2'])
  })

  it('reports an unknown source instead of throwing', () => {
    const { trace, order } = bfs(graph, { source: 'v9' })
    expect(order).toEqual([])
    expect(trace).toHaveLength(1)
    expect(trace[0].codeLine).toBe(2)
  })

  it('is deterministic (NFR-C2)', () => {
    expect(JSON.stringify(bfs(graph, { source: 'v1' }).trace)).toBe(
      JSON.stringify(bfs(graph, { source: 'v1' }).trace),
    )
  })
})

describe('dfs', () => {
  it('explores deep first, popping neighbours in adjacency order', () => {
    const { order, parents, summary } = dfs(graph, { source: 'v1' })

    // A → B → D → F → E → C, which is the order the recursive form would visit.
    expect(order).toEqual(['v1', 'v2', 'v4', 'v6', 'v5', 'v3'])
    expect(parents).toEqual({
      v1: null,
      v2: 'v1',
      v4: 'v2',
      v6: 'v4',
      v5: 'v2',
      v3: 'v1',
    })
    expect(summary.comparisons).toBe(14)
  })

  it('shows the explicit stack in aux and discards duplicate pops', () => {
    const { trace } = dfs(graph, { source: 'v1' })

    expect(trace.every((step) => step.aux?.kind === 'stack')).toBe(true)
    expect(trace[0].codeLine).toBe(3)
    // At least one duplicate pop is shown rather than silently skipped.
    expect(trace.some((step) => step.codeLine === 6)).toBe(true)
    // The final step reports the drained stack.
    expect(trace[trace.length - 1].codeLine).toBe(11)
  })

  it('reaches exactly the same vertices as BFS', () => {
    const reached = (ids: string[]) => [...ids].sort().join(',')
    expect(reached(dfs(graph, { source: 'v1' }).order)).toBe(
      reached(bfs(graph, { source: 'v1' }).order),
    )
  })

  it('reports an unknown source instead of throwing', () => {
    const { trace, order } = dfs(graph, { source: 'v9' })
    expect(order).toEqual([])
    expect(trace).toHaveLength(1)
    expect(trace[0].codeLine).toBe(2)
  })

  it('is deterministic (NFR-C2)', () => {
    expect(JSON.stringify(dfs(graph, { source: 'v1' }).trace)).toBe(
      JSON.stringify(dfs(graph, { source: 'v1' }).trace),
    )
  })
})
