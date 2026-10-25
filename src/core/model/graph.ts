/**
 * Graph — structure model.
 *
 * WHAT GOES HERE
 *   An adjacency list: a `vertices` record `{ id, label, value? }` for every
 *   vertex, and, in the same order, an `adjacency` record holding that vertex's
 *   neighbour list `{ to, weight? }`. The neighbour list is ordered by **adjacency
 *   insertion order**, and that order is part of the model, not an implementation
 *   detail: it is the determinism guarantee behind BFS/DFS output and the golden
 *   traces (A2 §3.7, §3.8).
 *
 *   The module also owns the `buildGraph` construction path, the `applyGraphDelta`
 *   reducer, and the invariant checks.
 *
 * WHY THIS FILE EXISTS
 *   The graph is a catalogue structure (A2 §4.5) and the base for BFS and DFS, which
 *   are the only two operations that read it. The adjacency list gives space
 *   O(V+E) and makes iterating a vertex's neighbours — the unit the animation
 *   displays — cost O(deg v), hence traversal O(V+E). An edge-existence check is
 *   also O(deg v) rather than O(1); that is a real trade-off against a matrix and
 *   is stated to the learner rather than hidden (A2 §4.7).
 *
 * WHY NO POSITIONS
 *   Vertex coordinates are view state and live in `render/layout/force.ts`. An
 *   algorithm must never read them, or a layout tweak could change a traversal
 *   result and break determinism (A1 §6.3, NFR-C2). This model therefore stores
 *   no coordinates at all, and nothing here imports D3.
 *
 * WHY PLAIN ARRAYS AND NOT `Map`/`Set`
 *   Two reasons. The trace contract requires every model to survive
 *   `JSON.stringify` (ADR-1), which a `Map` does not; and `Set`/`Map` iteration is
 *   exactly the kind of incidental ordering NFR-C2 warns about. Arrays make the
 *   neighbour order explicit and serialisable.
 *
 * INVARIANTS
 *   No self-loops, no duplicate undirected edges, and every endpoint must be a
 *   declared vertex. Validation is expected to reject bad input *before* the graph
 *   is built (ER9), so the model treats a violation as a programming error and
 *   throws rather than silently repairing it (ADR-7).
 */

import { isFieldId, type NodeId, type StructureDelta } from '../trace/step'

/** A vertex record. `id` is stable (`v1`, `v2`, …); `label` is what the user sees. */
export type GraphVertex = {
  id: NodeId
  label: string
  value?: string | number
}

/** One adjacency-list entry: where an edge leads, and its optional weight. */
export type GraphNeighbour = {
  to: NodeId
  weight?: number
}

/** One vertex's neighbour list, kept in adjacency insertion order. */
export type GraphAdjacency = {
  id: NodeId
  neighbours: GraphNeighbour[]
}

/**
 * The whole graph at one instant.
 *
 * `directed` is a property of the graph, because it decides whether an edge adds
 * one adjacency entry or two. It defaults to `false` (undirected) — the form the
 * demonstration graphs use.
 */
export type GraphModel = {
  vertices: GraphVertex[]
  adjacency: GraphAdjacency[]
  directed: boolean
}

/** The structured input `buildGraph` accepts (already validated by the caller). */
export type GraphSpec = {
  vertices: GraphVertex[]
  edges: { from: NodeId; to: NodeId; weight?: number }[]
  directed?: boolean
}

/**
 * Builds a graph from a spec.
 *
 * Edges are processed in the order given, and each endpoint is appended to its
 * vertex's neighbour list as it is met, so the neighbour order the traversals
 * follow is exactly the order the edges were declared. Ids are the caller's
 * (`v1`, `v2`, …) so a fixture is readable and stable.
 *
 * @throws if a vertex id repeats, an endpoint is unknown, an edge is a self-loop,
 *         or an edge repeats (in either direction when undirected).
 */
export function buildGraph(spec: GraphSpec): GraphModel {
  const directed = spec.directed ?? false

  const vertices: GraphVertex[] = []
  const seen = new Set<NodeId>()
  for (const vertex of spec.vertices) {
    if (seen.has(vertex.id)) {
      throw new Error(`buildGraph: duplicate vertex id "${vertex.id}"`)
    }
    seen.add(vertex.id)
    vertices.push({ ...vertex })
  }

  const adjacency: GraphAdjacency[] = vertices.map((vertex) => ({
    id: vertex.id,
    neighbours: [],
  }))
  const byId = new Map<NodeId, GraphAdjacency>(
    adjacency.map((record) => [record.id, record]),
  )

  /** Undirected duplicate detection: `a|b` and `b|a` normalise to one key. */
  const edgeKeys = new Set<string>()
  const edgeKey = (from: NodeId, to: NodeId): string =>
    directed ? `${from}|${to}` : [from, to].sort().join('|')

  for (const edge of spec.edges) {
    if (!seen.has(edge.from) || !seen.has(edge.to)) {
      throw new Error(
        `buildGraph: edge ${edge.from}-${edge.to} names an unknown vertex`,
      )
    }
    if (edge.from === edge.to) {
      throw new Error(`buildGraph: self-loop on "${edge.from}" is not allowed`)
    }
    const key = edgeKey(edge.from, edge.to)
    if (edgeKeys.has(key)) {
      throw new Error(`buildGraph: duplicate edge ${edge.from}-${edge.to}`)
    }
    edgeKeys.add(key)

    linkEdge(byId, edge.from, edge.to, edge.weight, directed)
  }

  return { vertices, adjacency, directed }
}

/**
 * Convenience builder for the demonstration graphs: vertices are named by label
 * (`"A"`, `"B"`, …) and get deterministic ids `v1, v2, …`; edges are label pairs.
 */
export function buildGraphFromLabels(
  labels: readonly string[],
  edges: readonly (readonly [string, string])[],
  options: {
    directed?: boolean
    /** One optional weight per edge, in the same order as `edges`. */
    weights?: readonly (number | undefined)[]
  } = {},
): GraphModel {
  const idByLabel = new Map<string, NodeId>()
  const vertices: GraphVertex[] = labels.map((label, index) => {
    const id = `v${index + 1}`
    idByLabel.set(label, id)
    return { id, label }
  })

  const resolve = (label: string): NodeId => {
    const id = idByLabel.get(label)
    if (id === undefined) {
      throw new Error(`buildGraphFromLabels: unknown vertex label "${label}"`)
    }
    return id
  }

  return buildGraph({
    vertices,
    directed: options.directed,
    edges: edges.map(([from, to], index) => ({
      from: resolve(from),
      to: resolve(to),
      weight: options.weights?.[index],
    })),
  })
}

/** Appends one directed adjacency entry (`from -> to`), and the reverse if undirected. */
function linkEdge(
  byId: Map<NodeId, GraphAdjacency>,
  from: NodeId,
  to: NodeId,
  weight: number | undefined,
  directed: boolean,
): void {
  const source = byId.get(from)
  const target = byId.get(to)
  /* istanbul ignore if — callers check membership first. */
  if (source === undefined || target === undefined) return

  source.neighbours.push(weight === undefined ? { to } : { to, weight })
  if (!directed) {
    target.neighbours.push(
      weight === undefined ? { to: from } : { to: from, weight },
    )
  }
}

export function vertexById(
  graph: GraphModel,
  id: NodeId,
): GraphVertex | undefined {
  return graph.vertices.find((vertex) => vertex.id === id)
}

export function hasVertex(graph: GraphModel, id: NodeId): boolean {
  return graph.vertices.some((vertex) => vertex.id === id)
}

export function vertexCount(graph: GraphModel): number {
  return graph.vertices.length
}

/**
 * The neighbours of `id`, in adjacency insertion order. An unknown vertex has no
 * neighbours, so a traversal of a bad start id is empty rather than an exception.
 */
export function neighboursOf(
  graph: GraphModel,
  id: NodeId,
): readonly GraphNeighbour[] {
  return graph.adjacency.find((record) => record.id === id)?.neighbours ?? []
}

/** Just the neighbour ids — what BFS/DFS actually iterate. */
export function neighbourIdsOf(graph: GraphModel, id: NodeId): NodeId[] {
  return neighboursOf(graph, id).map((neighbour) => neighbour.to)
}

/**
 * The graph's undirected edge count. `adjacency` holds one entry per *directed*
 * adjacency, so an undirected graph has half as many edges as entries. Computed
 * on demand rather than stored, so it cannot drift from the adjacency lists.
 */
export function edgeCount(graph: GraphModel): number {
  const entries = graph.adjacency.reduce(
    (total, record) => total + record.neighbours.length,
    0,
  )
  return graph.directed ? entries : entries / 2
}

/**
 * The edge list as plain pairs, for the renderer and for assertions. For an
 * undirected graph only the `from < to` direction is emitted, so each edge is
 * reported once.
 */
export function graphEdges(
  graph: GraphModel,
): { from: NodeId; to: NodeId; weight?: number }[] {
  const edges: { from: NodeId; to: NodeId; weight?: number }[] = []
  for (const record of graph.adjacency) {
    for (const neighbour of record.neighbours) {
      if (graph.directed || record.id < neighbour.to) {
        edges.push(
          neighbour.weight === undefined
            ? { from: record.id, to: neighbour.to }
            : { from: record.id, to: neighbour.to, weight: neighbour.weight },
        )
      }
    }
  }
  return edges
}

/**
 * Graph invariants, checked rather than assumed: every adjacency record belongs to
 * a declared vertex, every neighbour resolves, no self-loop, and (undirected) each
 * edge is present in both directions exactly once.
 */
export function isGraphValid(graph: GraphModel): boolean {
  if (graph.adjacency.length !== graph.vertices.length) return false
  const ids = new Set(graph.vertices.map((vertex) => vertex.id))
  if (ids.size !== graph.vertices.length) return false

  for (const record of graph.adjacency) {
    if (!ids.has(record.id)) return false
    for (const neighbour of record.neighbours) {
      if (!ids.has(neighbour.to)) return false
      if (neighbour.to === record.id) return false
    }
  }

  if (!graph.directed) {
    // Symmetry: for every u -> v there is exactly one v -> u.
    for (const record of graph.adjacency) {
      for (const neighbour of record.neighbours) {
        const back = graph.adjacency.find((row) => row.id === neighbour.to)
        const reciprocal =
          back?.neighbours.filter((n) => n.to === record.id) ?? []
        if (reciprocal.length !== 1) return false
      }
    }
  }

  return true
}

/** Throws a readable error if `graph` violates its invariants (used in tests). */
export function assertGraph(graph: GraphModel): void {
  if (!isGraphValid(graph)) {
    throw new Error(
      `Graph invariant violated: ${graph.vertices.length} vertex/vertices, ` +
        `${edgeCount(graph)} edge(s)${graph.directed ? ' (directed)' : ''}`,
    )
  }
}

/**
 * Applies one step's `delta` and returns a NEW graph — `graph` is never mutated.
 *
 * The traversals never change the graph, so in this iteration the reducer exists
 * for completeness and for the tests; a future `addVertex`/`addEdge` operation
 * emits the same four channels.
 *
 *   1. `created`  — add a vertex (label defaults to its id);
 *   2. `linked`   — add an edge (both directions when undirected);
 *   3. `unlinked` — remove an edge (both directions when undirected);
 *   4. `updated`  — change a vertex's label/value;
 *   5. `removed`  — drop a vertex and every edge that touched it.
 */
export function applyGraphDelta(
  graph: GraphModel,
  delta: StructureDelta,
): GraphModel {
  const vertices = graph.vertices.map((vertex) => ({ ...vertex }))
  let adjacency = graph.adjacency.map((record) => ({
    id: record.id,
    neighbours: record.neighbours.map((neighbour) => ({ ...neighbour })),
  }))
  const byId = new Map<NodeId, GraphAdjacency>(
    adjacency.map((record) => [record.id, record]),
  )

  for (const created of delta.created ?? []) {
    if (!vertices.some((vertex) => vertex.id === created.id)) {
      vertices.push({ id: created.id, label: created.id, value: created.value })
      const record: GraphAdjacency = { id: created.id, neighbours: [] }
      adjacency.push(record)
      byId.set(record.id, record)
    }
  }

  for (const edge of delta.linked ?? []) {
    linkEdge(byId, edge.from, edge.to, undefined, graph.directed)
  }

  for (const edge of delta.unlinked ?? []) {
    unlinkEdge(byId, edge.from, edge.to, graph.directed)
  }

  for (const change of delta.updated ?? []) {
    if (isFieldId(change.id)) {
      throw new Error(`applyGraphDelta: unknown structure field "${change.id}"`)
    }
    const vertex = vertices.find((candidate) => candidate.id === change.id)
    if (vertex !== undefined) {
      // A graph vertex's "value" is its label in this iteration.
      vertex.label = String(change.to)
    }
  }

  if (delta.moved !== undefined && delta.moved.length > 0) {
    throw new Error(
      'applyGraphDelta: `moved` is a heap channel, not a graph channel',
    )
  }

  const removed = delta.removed ?? []
  if (removed.length > 0) {
    const gone = new Set(removed)
    adjacency = adjacency
      .filter((record) => !gone.has(record.id))
      .map((record) => ({
        id: record.id,
        neighbours: record.neighbours.filter(
          (neighbour) => !gone.has(neighbour.to),
        ),
      }))
  }

  return {
    vertices: vertices.filter((vertex) => !removed.includes(vertex.id)),
    adjacency,
    directed: graph.directed,
  }
}

/** Removes one directed adjacency entry, and the reverse if undirected. */
function unlinkEdge(
  byId: Map<NodeId, GraphAdjacency>,
  from: NodeId,
  to: NodeId,
  directed: boolean,
): void {
  const drop = (sourceId: NodeId, targetId: NodeId): void => {
    const source = byId.get(sourceId)
    if (source === undefined) return
    const at = source.neighbours.findIndex(
      (neighbour) => neighbour.to === targetId,
    )
    if (at !== -1) source.neighbours.splice(at, 1)
  }

  drop(from, to)
  if (!directed) drop(to, from)
}
