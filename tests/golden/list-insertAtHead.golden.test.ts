import { describe, expect, it } from 'vitest'
import { buildList } from '../../src/core/model/linkedList'
import { insertAtHead } from '../../src/core/operations/list/insertAtHead'

// Resolved relative to this test file, so the fixture lands in the versioned
// golden directory rather than beside the test.
const FIXTURE = '../../src/data/golden/list-insertAtHead.json'

// The fixture is committed JSON in src/data/golden/. `--update` rewrites it; a
// normal run diffs it, so an intentional behaviour change is a readable text
// diff rather than a failing screenshot (NFR-C2).

describe('golden trace — list / insertAtHead / [50, 30, 70] + 45', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = insertAtHead(buildList([50, 30, 70]), { value: 45 })

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
