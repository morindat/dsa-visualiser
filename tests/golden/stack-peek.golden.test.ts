import { describe, expect, it } from 'vitest'
import { buildStack } from '../../src/core/model/stack'
import { stackPeek } from '../../src/core/operations/stack/peek'

const FIXTURE = '../../src/data/golden/stack-peek.json'

describe('golden trace — stack / peek / [50, 30, 70]', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = stackPeek(buildStack([50, 30, 70]))

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
