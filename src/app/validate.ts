/**
 * Input validation — total, per-token, before construction (A1 §4.2.5, ADR-7).
 *
 * WHAT IT DOES
 *   Turns raw input text into candidate tokens and classifies **every** one,
 *   returning a report: per-token status plus a reason, and the accepted list. The
 *   accepted list is the only thing that ever reaches a structure model; the UI
 *   renders the report so the learner can fix everything in one pass.
 *
 *   Two families of input live here:
 *
 *   - **Value lists** — a comma/space/newline separated list of integers for the
 *     list, BST and heap (`validateValues`, `validateIntegerList`, …). The rules
 *     are A1 FR5/FR6: integers only, in [-9999, 9999], at most 200 tokens (and a
 *     per-structure cap from NFR-S1), duplicates rejected for the BST (ER4).
 *   - **Edge lists** — one `From-To` or `From-To:weight` per line for the graph
 *     (`validateGraphEdges`, `validateGraphSource`), with the ER9 checks: unknown
 *     endpoint, self-loop, duplicate edge and non-numeric weight.
 *
 * WHY THIS FILE EXISTS
 *   Separating validation from construction is what lets the engine assume
 *   well-typed input. It never silently repairs or drops input — a silent repair
 *   teaches the wrong thing — and it never forwards raw user text. Validation is
 *   the only stage that inspects user text, and it is deliberately total.
 *
 * THE THREE TOKEN STATUSES
 *   - `accepted` — well-formed and used.
 *   - `ignored`  — well-formed but deliberately not used. The one case in this
 *     project is a duplicate BST key: A1 ER4 says the duplicate is *recovered*
 *     (shown as "equal — skipped") and the rest of the dataset still loads, so an
 *     ignored token must not make the whole request fail. This is what separates
 *     an advisory rejection from a blocking one.
 *   - `rejected` — malformed; the request must not run (ER1, ER2, ER3, ER8, ER9).
 *   `report.ok` is true exactly when nothing was *rejected* and at least one value
 *   was accepted.
 *
 * UI CONTRACT
 *   Pure, DOM-free and deterministic, so `ui/` may import it directly (the app
 *   layer sits below presentation). `tokens` is shaped so one presentational
 *   component can render every structure's feedback (see
 *   `ui/guide/ValidationFeedback.tsx`), and `error` carries the batch-level message
 *   for the cases A1 reports once rather than per token (ER3, ER8).
 *
 * RULES
 *   No side effects, no React, D3 or DOM (ADR-2, NFR-M2). Deterministic: the same
 *   text always yields the same report (NFR-C2), so it is unit-testable in Node.
 */

export type TokenStatus = 'accepted' | 'rejected' | 'ignored'

export type TokenReport = {
  token: string
  status: TokenStatus
  value?: string | number
  reason?: string
}

export type ValidationReport = {
  ok: boolean
  tokens: TokenReport[]
  accepted: (string | number)[]
  /** Batch-level message for ER3 (`no usable values`) or ER8 (over the cap). */
  error?: string
}

/**
 * The caps A1 fixes. `min`/`max` are inclusive; the two structure caps come from
 * NFR-S1 ("100 elements for linear structures, 200 nodes for trees and graphs")
 * and `maxTokens` is FR5's absolute limit on one input.
 */
export const VALIDATION_LIMITS = {
  min: -9999,
  max: 9999,
  maxTokens: 200,
  linearCap: 100,
  treeCap: 200,
  graphCap: 200,
} as const

const NUMBER = /^-?\d+(\.\d+)?$/
const INTEGER = /^-?\d+$/
const WORD = /^[A-Za-z][A-Za-z0-9_]*$/

/** Splits on commas and whitespace, dropping empty tokens (see `emptyReport`). */
function tokenise(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

// ---------------------------------------------------------------------------
// Value lists
// ---------------------------------------------------------------------------

function classify(token: string): TokenReport {
  if (NUMBER.test(token))
    return { token, status: 'accepted', value: Number(token) }
  if (WORD.test(token)) return { token, status: 'accepted', value: token }
  return {
    token,
    status: 'rejected',
    reason: 'Not a number or a simple word (letters, digits and _ only).',
  }
}

function reportFrom(tokens: string[]): ValidationReport {
  const reports = tokens.map(classify)
  const accepted: (string | number)[] = []
  for (const report of reports) {
    if (report.status === 'accepted' && report.value !== undefined) {
      accepted.push(report.value)
    }
  }
  return {
    ok: reports.every((report) => report.status === 'accepted'),
    tokens: reports,
    accepted,
  }
}

/**
 * A comma- or whitespace-separated list of values for the linked list. An empty
 * list is valid (inserting into an empty list is a teaching case), and a token may
 * be a number or a short word, because a list of labels is a legitimate input.
 *
 * This is the one validator that predates the A1 integer rule and is kept as-is so
 * the list slice's behaviour (and its tests) do not change; every ordered structure
 * uses `validateIntegerList`, which follows A1 exactly.
 */
export function validateValues(input: string): ValidationReport {
  return reportFrom(tokenise(input))
}

/** Exactly one value (a list value), and it is required. */
export function validateValue(input: string): ValidationReport {
  const tokens = tokenise(input)
  if (tokens.length === 0) {
    return {
      ok: false,
      tokens: [{ token: input, status: 'rejected', reason: 'Enter a value.' }],
      accepted: [],
    }
  }
  if (tokens.length > 1) {
    return {
      ok: false,
      tokens: tokens.map((token) => ({
        token,
        status: 'rejected' as const,
        reason: 'Enter a single value, not a list.',
      })),
      accepted: [],
    }
  }
  return reportFrom(tokens)
}

/**
 * Exactly one non-negative integer position, required — the linked-list
 * `insertAt` index. Positions past the end are handled by the generator (they
 * append), so the validator deliberately does not cap against a list length it
 * cannot see.
 */
export function validatePosition(input: string): ValidationReport {
  const tokens = tokenise(input)
  if (tokens.length === 0) {
    return {
      ok: false,
      tokens: [
        {
          token: input,
          status: 'rejected',
          reason: 'Enter a position (0 or greater).',
        },
      ],
      accepted: [],
    }
  }
  if (tokens.length > 1) {
    return {
      ok: false,
      tokens: tokens.map((token) => ({
        token,
        status: 'rejected' as const,
        reason: 'Enter a single position, not a list.',
      })),
      accepted: [],
    }
  }

  const token = tokens[0]
  if (!INTEGER.test(token)) {
    return {
      ok: false,
      tokens: [
        {
          token,
          status: 'rejected',
          reason: 'position must be a whole number',
        },
      ],
      accepted: [],
    }
  }

  const value = Number(token)
  if (value < 0) {
    return {
      ok: false,
      tokens: [
        {
          token,
          status: 'rejected',
          reason: 'position must be 0 or greater',
        },
      ],
      accepted: [],
    }
  }

  return {
    ok: true,
    tokens: [{ token, status: 'accepted', value }],
    accepted: [value],
  }
}

export type IntegerRules = {
  /** Reject repeats (A1 ER4, the BST). The heap allows duplicates. */
  uniqueRequired?: boolean
  /** Cap on the number of values; defaults to FR5's absolute token cap. */
  maxTokens?: number
  /** Bounds, inclusive; default ±9999. */
  min?: number
  max?: number
}

/**
 * Classifies one integer token against A1's listing (`lst:validate`). The reason
 * strings are the ones A1 names, so a test can assert the exact messages and the
 * UI shows what the design document says.
 */
function classifyInteger(
  token: string,
  seen: Set<number>,
  rules: Required<Pick<IntegerRules, 'uniqueRequired' | 'min' | 'max'>>,
): TokenReport {
  if (!INTEGER.test(token)) {
    return { token, status: 'rejected', reason: 'not an integer' }
  }
  const value = Number(token)
  if (value < rules.min || value > rules.max) {
    return {
      token,
      status: 'rejected',
      reason: `outside range ${rules.min}..${rules.max}`,
    }
  }
  if (rules.uniqueRequired && seen.has(value)) {
    // ER4: the duplicate is not an error, so it is `ignored`, not `rejected`.
    return {
      token,
      status: 'ignored',
      value,
      reason: 'duplicate; duplicates are not inserted',
    }
  }
  seen.add(value)
  return { token, status: 'accepted', value }
}

/**
 * A1's validation pipeline for an integer value list. It is total (every token is
 * classified), atomic on the count cap (ER8: nothing partial is loaded) and
 * duplicates are advisory (ER4: the run continues with the accepted values).
 */
export function validateIntegerList(
  input: string,
  rules: IntegerRules = {},
): ValidationReport {
  const accepted: (string | number)[] = []
  const tokens = tokenise(input)
  const maxTokens = rules.maxTokens ?? VALIDATION_LIMITS.maxTokens
  const bounds = {
    uniqueRequired: rules.uniqueRequired ?? false,
    min: rules.min ?? VALIDATION_LIMITS.min,
    max: rules.max ?? VALIDATION_LIMITS.max,
  }

  // ER3 — nothing to validate.
  if (tokens.length === 0) {
    return {
      ok: false,
      tokens: [],
      accepted,
      error: 'no usable values: enter at least one integer.',
    }
  }

  // ER8 — the batch is refused as a whole, before construction. Reporting every
  // token as rejected (rather than only the overflow) is what makes it atomic and
  // tells the user exactly what the limit is.
  if (tokens.length > maxTokens) {
    return {
      ok: false,
      tokens: tokens.map((token) => ({
        token,
        status: 'rejected' as const,
        reason: `more than ${maxTokens} values (this input has ${tokens.length})`,
      })),
      accepted,
      error: `Too many values: the limit is ${maxTokens}, and this input has ${tokens.length}. Nothing was loaded.`,
    }
  }

  const seen = new Set<number>()
  const reports = tokens.map((token) => classifyInteger(token, seen, bounds))
  for (const report of reports) {
    if (report.status === 'accepted' && report.value !== undefined) {
      accepted.push(report.value)
    }
  }

  const rejected = reports.some((report) => report.status === 'rejected')
  // ER3 — every token was unusable (e.g. all duplicates cannot happen with an
  // empty `seen`, so this is the all-invalid case).
  const error =
    accepted.length === 0
      ? 'no usable values: every token was rejected.'
      : undefined

  return {
    ok: !rejected && accepted.length > 0,
    tokens: reports,
    accepted,
    error,
  }
}

/** BST initial keys: integers in range, duplicates ignored (ER4), cap 200. */
export function validateBstKeys(input: string): ValidationReport {
  return validateIntegerList(input, {
    uniqueRequired: true,
    maxTokens: VALIDATION_LIMITS.treeCap,
  })
}

/**
 * Heap initial values: integers in range, **duplicates allowed** (a heap is a
 * multiset; nothing in the model forbids equal entries), cap 200.
 */
export function validateHeapValues(input: string): ValidationReport {
  return validateIntegerList(input, {
    uniqueRequired: false,
    maxTokens: VALIDATION_LIMITS.treeCap,
  })
}

/**
 * Exactly one integer, required — a BST search/delete/insert key or a heap insert
 * value. Mirrors `validateValue`'s "single value" rules but with A1's integer rule.
 */
export function validateSingleInteger(
  input: string,
  label = 'value',
): ValidationReport {
  const tokens = tokenise(input)
  if (tokens.length === 0) {
    return {
      ok: false,
      tokens: [
        { token: input, status: 'rejected', reason: `Enter a ${label}.` },
      ],
      accepted: [],
    }
  }
  if (tokens.length > 1) {
    return {
      ok: false,
      tokens: tokens.map((token) => ({
        token,
        status: 'rejected' as const,
        reason: `Enter a single ${label}, not a list.`,
      })),
      accepted: [],
    }
  }
  return validateIntegerList(tokens[0])
}

// ---------------------------------------------------------------------------
// Graph edge lists (A1 FR12, ER9)
// ---------------------------------------------------------------------------

/** One validated edge, in label space (ids are assigned at construction). */
export type GraphEdgeInput = {
  from: string
  to: string
  weight?: number
}

export type GraphValidationReport = {
  ok: boolean
  /** One report per non-empty input line; the shape matches `TokenReport`. */
  tokens: TokenReport[]
  edges: GraphEdgeInput[]
  /** Vertex labels in first-appearance order — the order the model will use. */
  vertices: string[]
  error?: string
}

export type GraphValidationOptions = {
  directed?: boolean
  /** When given, an edge endpoint must be one of these labels (ER9). */
  knownVertices?: readonly string[]
  /** Cap on vertices; defaults to NFR-S1's 200-node cap. */
  maxVertices?: number
}

// A label is a simple word; the middle dash is the edge separator. The weight is
// captured *loosely* (`.*`) so a non-numeric weight can be reported with the ER9
// reason instead of a generic parse error.
const EDGE =
  /^([A-Za-z][A-Za-z0-9_]*)\s*-\s*([A-Za-z][A-Za-z0-9_]*)\s*(?::\s*(.*))?$/
const WEIGHT = /^-?\d+(\.\d+)?$/

/**
 * Validates a graph edge list, one edge per line, in the form `A-B` or `A-B:weight`.
 *
 * The load is atomic (ER9): if any line is rejected, `ok` is false and the caller
 * must not build a partial graph. Vertices are derived from the endpoints in
 * first-appearance order, which is also the neighbour order the traversal follows,
 * so the validated model is reproducible (A2 §3.7).
 */
export function validateGraphEdges(
  input: string,
  options: GraphValidationOptions = {},
): GraphValidationReport {
  const directed = options.directed ?? false
  const maxVertices = options.maxVertices ?? VALIDATION_LIMITS.graphCap
  const known =
    options.knownVertices === undefined
      ? undefined
      : new Set(options.knownVertices)

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const tokens: TokenReport[] = []
  const edges: GraphEdgeInput[] = []
  const vertices: string[] = []
  let error: string | undefined

  const addVertex = (label: string): boolean => {
    if (vertices.includes(label)) return true
    if (vertices.length >= maxVertices) return false
    vertices.push(label)
    return true
  }

  // ER9 — refuse the batch as a whole when there is nothing to build.
  if (lines.length === 0) {
    return {
      ok: false,
      tokens: [],
      edges: [],
      vertices: [],
      error: 'no usable edges: enter at least one edge, for example A-B.',
    }
  }

  const seenEdges = new Set<string>()

  for (const line of lines) {
    const match = EDGE.exec(line)
    if (match === null) {
      tokens.push({
        token: line,
        status: 'rejected',
        reason: 'not an edge: write A-B, or A-B:weight for a weighted edge',
      })
      continue
    }

    const [, from, to, weightText] = match

    if (known !== undefined && (!known.has(from) || !known.has(to))) {
      tokens.push({
        token: line,
        status: 'rejected',
        reason: `unknown endpoint: ${from} and ${to} must both be declared vertices`,
      })
      continue
    }

    if (from === to) {
      tokens.push({
        token: line,
        status: 'rejected',
        reason: `self-loop on ${from} is not allowed`,
      })
      continue
    }

    let weight: number | undefined
    if (weightText !== undefined) {
      const text = weightText.trim()
      if (!WEIGHT.test(text)) {
        tokens.push({
          token: line,
          status: 'rejected',
          reason: `non-numeric weight "${text}"`,
        })
        continue
      }
      weight = Number(text)
    }

    // Undirected duplicates ignore direction, so both orders reject the second.
    const key = directed ? `${from}>${to}` : [from, to].sort().join('-')
    if (seenEdges.has(key)) {
      tokens.push({
        token: line,
        status: 'rejected',
        reason: `duplicate edge ${from}-${to}`,
      })
      continue
    }

    if (!addVertex(from) || !addVertex(to)) {
      error = `Too many vertices: the limit is ${maxVertices}. Nothing was loaded.`
      tokens.push({
        token: line,
        status: 'rejected',
        reason: `more than ${maxVertices} vertices`,
      })
      continue
    }

    seenEdges.add(key)
    edges.push(weight === undefined ? { from, to } : { from, to, weight })
    tokens.push({
      token: line,
      status: 'accepted',
      value: weight === undefined ? `${from}-${to}` : `${from}-${to}:${weight}`,
    })
  }

  const rejected = tokens.some((report) => report.status === 'rejected')
  if (edges.length === 0) {
    error = error ?? 'no usable edges: every line was rejected.'
  }

  return {
    ok: !rejected && edges.length > 0,
    tokens,
    edges,
    vertices,
    error,
  }
}

/**
 * Validates the chosen BFS/DFS source against the graph's vertex labels. A source
 * that is not a vertex is a validation failure (the user picked something the
 * graph does not contain), not a run-time empty result.
 */
export function validateGraphSource(
  input: string,
  vertices: readonly string[],
): ValidationReport {
  const tokens = tokenise(input)
  if (tokens.length === 0) {
    return {
      ok: false,
      tokens: [
        { token: input, status: 'rejected', reason: 'Choose a source vertex.' },
      ],
      accepted: [],
    }
  }
  if (tokens.length > 1) {
    return {
      ok: false,
      tokens: tokens.map((token) => ({
        token,
        status: 'rejected' as const,
        reason: 'Choose a single source vertex.',
      })),
      accepted: [],
    }
  }

  const label = tokens[0]
  if (!vertices.includes(label)) {
    return {
      ok: false,
      tokens: [
        {
          token: label,
          status: 'rejected',
          reason: `unknown vertex: ${label} is not one of ${vertices.join(', ')}`,
        },
      ],
      accepted: [],
    }
  }

  return {
    ok: true,
    tokens: [{ token: label, status: 'accepted', value: label }],
    accepted: [label],
  }
}
