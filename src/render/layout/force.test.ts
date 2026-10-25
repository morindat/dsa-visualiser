import { describe, expect, it } from 'vitest'
import { buildGraph, type GraphModel } from '../../core/model/graph'
import { layoutGraph } from './force'

function sampleGraph(): GraphModel {
  return buildGraph({
    vertices: [
      { id: 'v1', label: 'A' },
      { id: 'v2', label: 'B' },
      { id: 'v3', label: 'C' },
      { id: 'v4', label: 'D' },
    ],
    edges: [
      { from: 'v1', to: 'v2' },
      { from: 'v1', to: 'v3' },
      { from: 'v2', to: 'v4' },
    ],
  })
}

describe('layoutGraph', () => {
  it('places BFS layers on separate rows from the source', () => {
    const positions = layoutGraph(sampleGraph(), 'v1')

    expect(positions.v1.y).toBeLessThan(positions.v2.y)
    expect(positions.v2.y).toBe(positions.v3.y)
    expect(positions.v4.y).toBeGreaterThan(positions.v2.y)
    expect(positions.v2.x).not.toBe(positions.v3.x)
  })

  it('keeps a deterministic ellipse without a traversal source', () => {
    const model = sampleGraph()
    expect(layoutGraph(model)).toEqual(layoutGraph(model))
    expect(layoutGraph(model)).not.toEqual(layoutGraph(model, 'v1'))
  })

  it('falls back to the ellipse when the source cannot reach every vertex', () => {
    const model = buildGraph({
      vertices: [
        { id: 'v1', label: 'A' },
        { id: 'v2', label: 'B' },
        { id: 'v3', label: 'C' },
      ],
      edges: [{ from: 'v1', to: 'v2' }],
    })

    expect(layoutGraph(model, 'v1')).toEqual(layoutGraph(model))
  })
})
