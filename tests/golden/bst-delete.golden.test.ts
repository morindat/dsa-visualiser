import { describe, expect, it } from 'vitest'
import { buildBst } from '../../src/core/model/bst'
import { bstDelete } from '../../src/core/operations/bst/delete'

const FIXTURE = '../../src/data/golden/bst-delete.json'

// Golden trace for bst / bstDelete / delete the root of [50, 30, 70, 60, 80].
// This is the case that exercises the ADDITIVE v1.1 `removed` channel: the
// successor (60) leaves the tree while the target node (50) keeps its identity and
// receives the successor's value.

describe('golden trace — bst / bstDelete / root of [50, 30, 70, 60, 80]', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = bstDelete(buildBst([50, 30, 70, 60, 80]), { value: 50 })

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
