import { describe, expect, it } from 'vitest'
import { buildBst } from '../../src/core/model/bst'
import { inorder } from '../../src/core/operations/traverse/inorder'

const FIXTURE = '../../src/data/golden/tree-inorder.json'

// Golden trace for traverse / inorder over [50, 30, 70, 20, 40, 60, 80]. Locks the
// recursion aux shape: `frames` (depth per frame) plus the ADDITIVE v1.1
// `frameIds` (the call path), which is what the recursion panel draws.

describe('golden trace — traverse / inorder / [50, 30, 70, 20, 40, 60, 80]', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = inorder(buildBst([50, 30, 70, 20, 40, 60, 80]))

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
