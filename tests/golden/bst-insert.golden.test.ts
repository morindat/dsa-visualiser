import { describe, expect, it } from 'vitest'
import { buildBst } from '../../src/core/model/bst'
import { bstInsert } from '../../src/core/operations/bst/insert'

// Resolved relative to this test file, so the fixture lands in the versioned
// golden directory rather than beside the test.
const FIXTURE = '../../src/data/golden/bst-insert.json'

// Golden trace for bst / bstInsert / [50, 30, 70, 20, 40] + 45. Locks the
// `created` + `linked` + `@root` shape and the walk narration (NFR-C2).

describe('golden trace — bst / bstInsert / [50, 30, 70, 20, 40] + 45', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = bstInsert(buildBst([50, 30, 70, 20, 40]), { value: 45 })

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
