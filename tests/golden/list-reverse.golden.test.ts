import { describe, expect, it } from 'vitest'
import { buildList } from '../../src/core/model/linkedList'
import { reverse } from '../../src/core/operations/list/reverse'

// Resolved relative to this test file, so the fixture lands in the versioned
// golden directory rather than beside the test.
const FIXTURE = '../../src/data/golden/list-reverse.json'

describe('golden trace — list / reverse / [50, 30, 70]', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = reverse(buildList([50, 30, 70]))

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
