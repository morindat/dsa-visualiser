import { describe, expect, it } from 'vitest'
import { buildList } from '../../src/core/model/linkedList'
import { insertAt } from '../../src/core/operations/list/insertAt'

const FIXTURE = '../../src/data/golden/list-insertAt.json'

describe('golden trace — list / insertAt / [50, 30, 70] + 45 at 2', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = insertAt(buildList([50, 30, 70]), {
      value: 45,
      position: 2,
    })

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
