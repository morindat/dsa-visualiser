# `src/data/presets/`

Example datasets, one JSON file per teaching case (FR4). They are imported and typed by
`index.ts`, so the rest of the app sees `PresetDataset[]` and never parses JSON by hand. A
preset is turned back into the text a user would have typed (`presetValuesToText` /
`presetEdgesToText`) and then goes through **the same validator as typed input** (`FR6`) —
nothing bypasses validation.

Naming convention: `<structure>-<case>.json`, chosen so the case *teaches* something rather
than just filling the field. Every preset is **capped at 10 entries**, and a test
(`presets.test.ts`) enforces that ceiling so a preloaded fixture stays readable.

| File | Structure | What it teaches |
| --- | --- | --- |
| `list-basic.json` | list | 10 values, enough for a multi-hop walk while leaving room for readable arrows |
| `stack-basic.json` | stack | 10 values bottom-to-top, so push/pop/peek touch one visible end |
| `bst-balanced.json` | BST | 10 keys inserted median-first → height 4, the `O(log n)` case; also the tree the four traversals run on |
| `bst-degenerate.json` | BST | the same 10 keys ascending → a height-10 chain, the `O(n)` case |
| `heap-unsorted.json` | heap | 10 values in arbitrary order, for `buildHeap` (`O(n)`) |
| `heap-valid.json` | heap | 10 values already satisfying the min-heap property, for `insert` / `extractMin` |
| `graph-bfs-dfs.json` | graph | 10 vertices and 10 edges, chosen so BFS and DFS differ clearly |

## Shape

Value presets (`list`, `stack`, `bst`, `heap`):

```json
{
  "id": "bst-balanced",
  "structureId": "bst",
  "label": "Balanced BST (10 keys)",
  "description": "…",
  "values": [9, 5, 13, "… at most 10"]
}
```

`heap` presets also carry `"kind": "raw" | "min" | "max"`: `raw` deliberately does not satisfy
the heap property (that is the `buildHeap` lesson), while `min`/`max` already do.

Graph presets carry an edge list and a source:

```json
{
  "id": "graph-bfs-dfs",
  "structureId": "graph",
  "label": "Graph with cycles (10 vertices)",
  "description": "…",
  "directed": false,
  "source": "A",
  "edges": [{ "from": "A", "to": "B" }]
}
```

Input caps come from A1: at most 200 tokens (FR5/ER8), 100 elements for linear structures and
200 nodes for trees/graphs (NFR-S1). `VALIDATION_LIMITS` in `src/app/validate.ts` is the single
source for those numbers.
