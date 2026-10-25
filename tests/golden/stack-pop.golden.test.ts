import { describe, expect, it } from 'vitest'
import { buildStack } from '../../src/core/model/stack'
import { stackPop } from '../../src/core/operations/stack/pop'

const FIXTURE = '../../src/data/golden/stack-pop.json'

describe('golden trace — stack / pop / [50, 30, 70]', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = stackPop(buildStack([50, 30, 70]))

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
