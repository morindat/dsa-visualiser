import { describe, expect, it } from 'vitest'
import { humanizeGraphText } from './graphText'

const LABELS = { v1: 'A', v2: 'B', v10: 'J' }

describe('humanizeGraphText', () => {
  it('replaces graph ids with their visible labels', () => {
    expect(humanizeGraphText('Examine edge v1 → v2.', LABELS)).toBe(
      'Examine edge A → B.',
    )
    expect(humanizeGraphText('Discover v2 via v1 at distance 1.', LABELS)).toBe(
      'Discover B via A at distance 1.',
    )
  })

  it('handles multi-digit ids', () => {
    expect(humanizeGraphText('Visit v10, then v1.', LABELS)).toBe(
      'Visit J, then A.',
    )
  })

  it('leaves unknown ids and plain text alone', () => {
    expect(humanizeGraphText('Visit v99.', LABELS)).toBe('Visit v99.')
    expect(humanizeGraphText('The queue is empty.', LABELS)).toBe(
      'The queue is empty.',
    )
  })

  it('is a no-op when there is no graph label map', () => {
    expect(humanizeGraphText('Examine edge v1 → v2.', null)).toBe(
      'Examine edge v1 → v2.',
    )
  })
})
