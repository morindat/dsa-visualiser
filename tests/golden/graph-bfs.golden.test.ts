import { describe, expect, it } from 'vitest'
import { buildGraphFromLabels } from '../../src/core/model/graph'
import { bfs } from '../../src/core/operations/graph/bfs'

const FIXTURE = '../../src/data/golden/graph-bfs.json'

/**
 * Golden trace for graph / bfs / source v1.
 *
 *   A — B — D
 *   |   |   |
 *   C — E — F
 *
 * Locks the neighbour order (adjacency insertion order), the queue/visited aux
 * payload and the discover / visit / examine step separation (NFR-C2, A2 §3.7).
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

describe('golden trace — graph / bfs / source A', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = bfs(graph, { source: 'v1' })

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
