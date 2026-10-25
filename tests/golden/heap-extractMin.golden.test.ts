import { describe, expect, it } from 'vitest'
import { heapFromValues, heapifyInPlace } from '../../src/core/model/binaryHeap'
import { heapExtractMin } from '../../src/core/operations/heap/extractMin'

const FIXTURE = '../../src/data/golden/heap-extractMin.json'

// Golden trace for heap / heapExtractMin / heapify [5, 3, 8, 1, 9, 2]. This locks
// both ADDITIVE v1.1 heap channels at once: `moved` (the promoted last entry and
// every sift-down swap) and `removed` (the extracted root).

describe('golden trace — heap / heapExtractMin / [5, 3, 8, 1, 9, 2]', () => {
  it('matches the committed fixture byte for byte', async () => {
    const initial = heapifyInPlace(heapFromValues([5, 3, 8, 1, 9, 2], 'min'))
    const { trace } = heapExtractMin(initial)

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
