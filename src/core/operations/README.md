# `src/core/operations/` — the algorithm layer

One file per operation. A generator is a **pure function**

```ts
generate(structure, request) -> { trace: Step[]; summary: GenerateSummary }
```

It is instrumented: every instant at which a learner could ask *"what is happening now?"* emits one
`Step` (`ADR-1`, A2 `Listing 17`). It must not import React, D3, `render/` or `ui/`, must not read a
clock or a random source, and must not mutate anything the caller still holds (`NFR-C2`, `NFR-M2`).

Subdirectories follow A2 `Listing 18`:

| Folder | Operations |
| --- | --- |
| `list/` | `insertAtHead` · `insertAt` · `insertAtTail` · `deleteByValue` · `reverse` |
| `stack/` | `stackPush` · `stackPop` · `stackPeek` |
| `heap/` | `insert` · `extractMin` · `buildHeap` |
| `bst/` | `insert` · `delete` · `search` |
| `traverse/` | `preorder` · `inorder` · `postorder` · `levelOrder` |
| `graph/` | `bfs` · `dfs` |

## Adding an operation (the extensibility contract)

Exactly three edits, and **no** change to the controller, the state machine or the UI shell
(A2 §5.7):

1. one generator in the matching folder that emits `Step[]`;
2. one authored pseudocode listing plus its `codeLine` map;
3. one `OperationMeta` record in `data/catalogue.ts` (`Listing 16`).

If the change also needs an edit in `app/` or `ui/`, the extensibility requirement has been broken —
fix that rather than patching the shell.

## Build order

Do **one** vertical slice first — linked-list insert, with all three panes and the controller
working — then freeze the `Step` contract, then add the priority queue, BST, traversals and graph.
Changing the contract after one operation is trivial; changing it after five is invasive (§5.7).
