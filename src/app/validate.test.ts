import { describe, expect, it } from 'vitest'
import {
  VALIDATION_LIMITS,
  validateBstKeys,
  validateGraphEdges,
  validateGraphSource,
  validateHeapValues,
  validateIntegerList,
  validateSingleInteger,
  validateValue,
  validateValues,
  type ValidationReport,
} from './validate'

// Part of the DOM-free suite: the validator is pure application logic (ADR-7).

const reasons = (report: ValidationReport): (string | undefined)[] =>
  report.tokens.map((token) => token.reason)

describe('validateIntegerList — the A1 pipeline (FR5, FR6, ER1–ER4, ER8)', () => {
  it('accepts a clean list and previews it', () => {
    const report = validateIntegerList('50, 30, 70, 20')

    expect(report.ok).toBe(true)
    expect(report.accepted).toEqual([50, 30, 70, 20])
    expect(report.tokens.every((token) => token.status === 'accepted')).toBe(
      true,
    )
    expect(report.error).toBeUndefined()
  })

  it('rejects every A1 malformed token with the A1 reason (ER1)', () => {
    const report = validateIntegerList('abc 4.2 1e3 --5 12.')

    expect(report.ok).toBe(false)
    expect(report.accepted).toEqual([])
    expect(reasons(report)).toEqual([
      'not an integer',
      'not an integer',
      'not an integer',
      'not an integer',
      'not an integer',
    ])
  })

  it('rejects a value outside ±9999 (ER2)', () => {
    const report = validateIntegerList('99999, -10000, 9999')

    expect(report.ok).toBe(false)
    expect(reasons(report)[0]).toBe('outside range -9999..9999')
    expect(reasons(report)[1]).toBe('outside range -9999..9999')
    expect(report.accepted).toEqual([9999])
  })

  it('keeps valid tokens and reports the invalid ones (total, ER3/FR6)', () => {
    const report = validateIntegerList('50, 30, xyz, 70, 99999')

    expect(report.ok).toBe(false)
    expect(report.accepted).toEqual([50, 30, 70])
    expect(report.tokens).toHaveLength(5)
    expect(reasons(report)[2]).toBe('not an integer')
    expect(reasons(report)[4]).toBe('outside range -9999..9999')
  })

  it('treats an empty input as ER3', () => {
    const report = validateIntegerList('   ')

    expect(report.ok).toBe(false)
    expect(report.tokens).toEqual([])
    expect(report.error).toMatch(/no usable values/)
  })

  it('ignores a duplicate instead of failing when the structure is unique (ER4)', () => {
    const report = validateIntegerList('50, 30, 30, 70', {
      uniqueRequired: true,
    })

    // A duplicate is recovered, so the request still runs with the first 30.
    expect(report.ok).toBe(true)
    expect(report.accepted).toEqual([50, 30, 70])
    expect(report.tokens[2].status).toBe('ignored')
    expect(report.tokens[2].reason).toBe(
      'duplicate; duplicates are not inserted',
    )
  })

  it('allows duplicates when the structure is a multiset', () => {
    const report = validateIntegerList('5, 5, 5', { uniqueRequired: false })

    expect(report.ok).toBe(true)
    expect(report.accepted).toEqual([5, 5, 5])
  })

  it('refuses an over-cap batch as a whole (ER8)', () => {
    const tokens = Array.from(
      { length: VALIDATION_LIMITS.maxTokens + 1 },
      (_, i) => String(i),
    )
    const report = validateIntegerList(tokens.join(', '))

    expect(report.ok).toBe(false)
    expect(report.accepted).toEqual([])
    expect(report.tokens.every((token) => token.status === 'rejected')).toBe(
      true,
    )
    expect(report.tokens[0].reason).toMatch(/more than 200 values/)
    expect(report.error).toMatch(/limit is 200/)
  })

  it('honours a per-structure cap', () => {
    const report = validateIntegerList('1, 2, 3', { maxTokens: 2 })
    expect(report.ok).toBe(false)
    expect(report.error).toMatch(/limit is 2/)
  })

  it('is deterministic (NFR-C2)', () => {
    expect(JSON.stringify(validateIntegerList('50, x, 30'))).toBe(
      JSON.stringify(validateIntegerList('50, x, 30')),
    )
  })
})

describe('per-structure value validators', () => {
  it('BST keys reject duplicates, heap values allow them', () => {
    expect(validateBstKeys('10, 5, 10').ok).toBe(true) // duplicate skipped
    expect(validateBstKeys('10, 5, 10').accepted).toEqual([10, 5])
    expect(validateHeapValues('10, 5, 10').accepted).toEqual([10, 5, 10])
  })

  it('apply the tree cap of 200 (NFR-S1)', () => {
    const many = Array.from({ length: VALIDATION_LIMITS.treeCap + 1 }, (_, i) =>
      String(i),
    ).join(', ')
    expect(validateBstKeys(many).ok).toBe(false)
    expect(validateHeapValues(many).ok).toBe(false)
  })

  it('validateSingleInteger requires exactly one in-range integer', () => {
    expect(validateSingleInteger('45').accepted).toEqual([45])
    expect(validateSingleInteger('').ok).toBe(false)
    expect(validateSingleInteger('1, 2').ok).toBe(false)
    expect(validateSingleInteger('4.2').ok).toBe(false)
    expect(validateSingleInteger('99999').ok).toBe(false)
  })

  it('keeps the linked-list validator behaviour unchanged', () => {
    // The list slice predates the integer rule and accepts words.
    expect(validateValues('alpha, 30').accepted).toEqual(['alpha', 30])
    expect(validateValue('12a').ok).toBe(false)
  })
})

describe('validateGraphEdges — ER9', () => {
  it('accepts an edge list and derives the vertices in order', () => {
    const report = validateGraphEdges('A-B\nB-C\nA-C')

    expect(report.ok).toBe(true)
    expect(report.vertices).toEqual(['A', 'B', 'C'])
    expect(report.edges).toEqual([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'A', to: 'C' },
    ])
  })

  it('accepts weighted edges and rejects a non-numeric weight', () => {
    expect(validateGraphEdges('A-B:5').edges).toEqual([
      { from: 'A', to: 'B', weight: 5 },
    ])
    const bad = validateGraphEdges('A-B:heavy')
    expect(bad.ok).toBe(false)
    expect(bad.tokens[0].reason).toMatch(/non-numeric weight/)
  })

  it('rejects a self-loop', () => {
    const report = validateGraphEdges('A-A')
    expect(report.ok).toBe(false)
    expect(report.tokens[0].reason).toMatch(/self-loop/)
  })

  it('rejects a duplicate edge in either direction when undirected', () => {
    const report = validateGraphEdges('A-B\nB-A')
    expect(report.ok).toBe(false)
    expect(report.tokens[1].reason).toMatch(/duplicate edge/)
    // …but the same two lines are distinct directed edges.
    expect(validateGraphEdges('A-B\nB-A', { directed: true }).ok).toBe(true)
  })

  it('rejects an endpoint that is not a declared vertex', () => {
    const report = validateGraphEdges('A-Z', { knownVertices: ['A', 'B'] })
    expect(report.ok).toBe(false)
    expect(report.tokens[0].reason).toMatch(/unknown endpoint/)
  })

  it('reports a line it cannot parse', () => {
    const report = validateGraphEdges('A-B\nnonsense')
    expect(report.ok).toBe(false)
    expect(report.tokens[1].reason).toMatch(/not an edge/)
  })

  it('refuses the batch when there is nothing usable (atomic)', () => {
    const report = validateGraphEdges('   ')
    expect(report.ok).toBe(false)
    expect(report.error).toMatch(/no usable edges/)
  })

  it('enforces the vertex cap and stays atomic', () => {
    const report = validateGraphEdges('A-B\nB-C', { maxVertices: 2 })
    expect(report.ok).toBe(false)
    expect(report.tokens[1].reason).toMatch(/more than 2 vertices/)
    expect(report.error).toMatch(/limit is 2/)
  })

  it('is deterministic (NFR-C2)', () => {
    expect(JSON.stringify(validateGraphEdges('A-B\nB-C'))).toBe(
      JSON.stringify(validateGraphEdges('A-B\nB-C')),
    )
  })
})

describe('validateGraphSource', () => {
  it('accepts a vertex of the graph', () => {
    expect(validateGraphSource('B', ['A', 'B']).accepted).toEqual(['B'])
  })

  it('rejects an unknown source with the available vertices', () => {
    const report = validateGraphSource('Z', ['A', 'B'])
    expect(report.ok).toBe(false)
    expect(report.tokens[0].reason).toMatch(/unknown vertex/)
    expect(report.tokens[0].reason).toContain('A, B')
  })

  it('requires exactly one source', () => {
    expect(validateGraphSource('', ['A']).ok).toBe(false)
    expect(validateGraphSource('A B', ['A', 'B']).ok).toBe(false)
  })
})
