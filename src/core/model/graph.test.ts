import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  applyGraphDelta,
  assertGraph,
  buildGraph,
  buildGraphFromLabels,
  edgeCount,
  graphEdges,
  hasVertex,
  isGraphValid,
  neighbourIdsOf,
  neighboursOf,
  vertexById,
  vertexCount,
} from './graph'
import { bfs } from '../operations/graph/bfs'
import { dfs } from '../operations/graph/dfs'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

/**
 * The demonstration graph used in the tests, as an undirected adjacency list:
 *
 *   v1 — v2 — v4
 *   |    |    |
 *   v3 — v5 — v6
 */
function diamond(): ReturnType<typeof buildGraphFromLabels> {
  return buildGraphFromLabels(
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
}

describe('graph model', () => {
  it('records the adjacency list in edge insertion order', () => {
    const graph = diamond()

    expect(vertexCount(graph)).toBe(6)
    expect(vertexById(graph, 'v1')?.label).toBe('A')
    expect(hasVertex(graph, 'v3')).toBe(true)
    expect(hasVertex(graph, 'v9')).toBe(false)
    // Undirected: each edge contributes one adjacency entry to each endpoint.
    expect(neighbourIdsOf(graph, 'v1')).toEqual(['v2', 'v3'])
    expect(neighbourIdsOf(graph, 'v2')).toEqual(['v1', 'v4', 'v5'])
    expect(edgeCount(graph)).toBe(7)
    expect(graphEdges(graph)).toHaveLength(7)
    expect(isGraphValid(graph)).toBe(true)
    assertGraph(graph)
  })

  it('keeps the neighbour order stable and deterministic (NFR-C2)', () => {
    expect(JSON.stringify(diamond())).toBe(JSON.stringify(diamond()))
  })

  it('supports directed graphs with one adjacency entry per edge', () => {
    const directed = buildGraph({
      directed: true,
      vertices: [
        { id: 'v1', label: 'A' },
        { id: 'v2', label: 'B' },
      ],
      edges: [{ from: 'v1', to: 'v2' }],
    })

    expect(neighbourIdsOf(directed, 'v1')).toEqual(['v2'])
    expect(neighbourIdsOf(directed, 'v2')).toEqual([])
    expect(edgeCount(directed)).toBe(1)
    expect(isGraphValid(directed)).toBe(true)
  })

  it('rejects self-loops, duplicate edges and unknown endpoints', () => {
    expect(() => buildGraphFromLabels(['A'], [['A', 'A']])).toThrow(/self-loop/)
    expect(() =>
      buildGraphFromLabels(
        ['A', 'B'],
        [
          ['A', 'B'],
          ['B', 'A'],
        ],
      ),
    ).toThrow(/duplicate/)
    expect(() => buildGraphFromLabels(['A'], [['A', 'Z']])).toThrow(
      /unknown vertex label/,
    )
    expect(() =>
      buildGraph({
        vertices: [{ id: 'v1', label: 'A' }],
        edges: [{ from: 'v1', to: 'v9' }],
      }),
    ).toThrow(/unknown vertex/)
  })

  it('applies a delta and stays valid', () => {
    const graph = buildGraphFromLabels(['A', 'B'], [['A', 'B']])

    const grown = applyGraphDelta(graph, {
      created: [{ id: 'v3', value: 'C' }],
      linked: [{ from: 'v2', to: 'v3' }],
    })
    expect(vertexCount(grown)).toBe(3)
    expect(neighbourIdsOf(grown, 'v2')).toEqual(['v1', 'v3'])
    assertGraph(grown)

    const shrunk = applyGraphDelta(grown, {
      unlinked: [{ from: 'v2', to: 'v3' }],
      removed: ['v3'],
    })
    expect(vertexCount(shrunk)).toBe(2)
    expect(neighboursOf(shrunk, 'v3')).toEqual([])
    assertGraph(shrunk)
  })

  it('replays both traversals to the graph the generator was given', () => {
    const graph = diamond()
    for (const generator of [
      () => bfs(graph, { source: 'v1' }),
      () => dfs(graph, { source: 'v1' }),
    ]) {
      const { trace, finalState } = generator()
      let replayed = graph
      for (const step of trace) replayed = applyGraphDelta(replayed, step.delta)
      expect(replayed).toEqual(finalState)
      expect(replayed).toEqual(graph)
    }
  })

  it('holds the structural invariants for any generated spec (property-based)', () => {
    const vertexCountArb = fc.integer({ min: 1, max: 12 })
    fc.assert(
      fc.property(
        vertexCountArb,
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 20 }),
        (n, pairs) => {
          const vertices = Array.from({ length: n }, (_, i) => ({
            id: `v${i + 1}`,
            label: String.fromCharCode(65 + i),
          }))
          // Filter to a legal simple undirected edge set before building.
          const seen = new Set<string>()
          const edges: { from: string; to: string }[] = []
          for (const [a, b] of pairs) {
            const from = `v${(a % n) + 1}`
            const to = `v${(b % n) + 1}`
            if (from === to) continue
            const key = [from, to].sort().join('|')
            if (seen.has(key)) continue
            seen.add(key)
            edges.push({ from, to })
          }
          const graph = buildGraph({ vertices, edges })
          return isGraphValid(graph) && edgeCount(graph) === edges.length
        },
      ),
      { numRuns: 60 },
    )
  })
})
