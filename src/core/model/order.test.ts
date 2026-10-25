import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { compareValues, valuesEqual } from './order'

// Part of `npm run test:core`: no DOM, no React, no D3 (NFR-M2, NFR-M3).

describe('compareValues — the shared total order', () => {
  it('orders numbers numerically, not lexically', () => {
    expect(compareValues(9, 10)).toBe(-1)
    expect(compareValues(10, 9)).toBe(1)
    expect(compareValues(10, 10)).toBe(0)
    expect(compareValues(-1, 0)).toBe(-1)
  })

  it('orders strings by code unit', () => {
    expect(compareValues('apple', 'banana')).toBe(-1)
    expect(compareValues('b', 'a')).toBe(1)
    expect(compareValues('a', 'a')).toBe(0)
  })

  it('puts numbers before strings when the kinds are mixed', () => {
    expect(compareValues(1, 'a')).toBe(-1)
    expect(compareValues('a', 1)).toBe(1)
  })

  it('is total and antisymmetric on a sample', () => {
    const values = [1, 2, 10, 'a', 'b', 'A'] as const
    for (const a of values) {
      for (const b of values) {
        const forward = compareValues(a, b)
        const backward = compareValues(b, a)
        // Antisymmetry: exactly one direction is negative, or both are zero.
        expect(forward === 0 ? backward === 0 : forward === -backward).toBe(
          true,
        )
      }
    }
  })

  it('agrees with valuesEqual', () => {
    expect(valuesEqual(3, 3)).toBe(true)
    expect(valuesEqual(3, 4)).toBe(false)
    expect(valuesEqual('x', 'x')).toBe(true)
  })

  it('is a total order (property-based)', () => {
    const value = fc.oneof(fc.integer(), fc.string())
    fc.assert(
      fc.property(value, value, (a, b) => {
        const ab = compareValues(a, b)
        const ba = compareValues(b, a)
        return ab === 0 ? ba === 0 : ab === -ba
      }),
    )
  })
})
