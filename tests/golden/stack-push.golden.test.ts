import { describe, expect, it } from 'vitest'
import { buildStack } from '../../src/core/model/stack'
import { stackPush } from '../../src/core/operations/stack/push'

const FIXTURE = '../../src/data/golden/stack-push.json'

describe('golden trace — stack / push / [50, 30, 70] + 45', () => {
  it('matches the committed fixture byte for byte', async () => {
    const { trace } = stackPush(buildStack([50, 30, 70]), { value: 45 })

    await expect(`${JSON.stringify(trace, null, 2)}\n`).toMatchFileSnapshot(
      FIXTURE,
    )
  })
})
