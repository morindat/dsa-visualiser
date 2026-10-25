/**
 * Catalogue data — the static, versioned content of the application.
 *
 * WHAT GOES HERE
 *   The `OperationMeta` records (A2 Listing 16), the one authored pseudocode
 *   listing per operation, and the `CatalogueEntry` records that describe the
 *   structures.
 *
 * WHY THIS FILE EXISTS
 *   Complexity is **data, not prose scattered through the interface**. One record
 *   supplies the menu label, the guide text, the `pseudocodeId` (the link to the
 *   single authored listing) and the complexity card, so a bound cannot attach
 *   itself to the wrong operation and a missing bound is a visible content gap
 *   (`Listing 16`, `FR11`). It is also one of the three edits needed to add an
 *   operation (A2 §5.7).
 *
 * HOW IT IS SHARED
 *   `app/catalogue.ts` reads these records and is the only thing the UI imports,
 *   so "what operations exist" has a single source.
 *
 * RULES
 *   Static and typed; no fetching, no React, no D3, no DOM (`NFR-Se1`).
 */

/**
 * What an operation needs from the user. The guide renders a field per entry and
 * the request pipeline validates exactly these, so "which inputs does this
 * operation take?" has one answer in the catalogue instead of being duplicated in
 * the form and in the dispatcher.
 *
 *   - `values`  a list of integers (list contents, BST keys, heap array)
 *   - `value`   one integer (an insert/search/delete key, a heap insert value)
 *   - `position` one non-negative integer (the linked-list `insertAt` index)
 *   - `edges`   a graph edge list, one `A-B` per line
 *   - `source`  one vertex label to start BFS/DFS from
 */
export type OperationInput =
  'values' | 'value' | 'position' | 'edges' | 'source'

/** A2 Listing 16, extended with the inputs the guided entry must collect. */
export type OperationMeta = {
  id: string
  label: string
  pseudocodeId: string
  best: string
  average: string
  worst: string
  space: string
  inputs: OperationInput[]
  assumptions: string[]
  notes?: string
}

/** One authored listing; `lines[codeLine - 1]` is the line a `Step` highlights. */
export type PseudocodeListing = {
  id: string
  lines: string[]
}

export type CatalogueEntry = {
  id: string
  label: string
  description: string
  operations: string[]
  rules: string[]
}

/**
 * The single authored source for each operation's pseudocode (`FR9`).
 *
 * The line numbers are part of the contract with the generators: `Step.codeLine`
 * is 1-based into `lines`, so the numbers in the `PSEUDOCODE / codeLine MAP`
 * comment at the top of each generator must match the list here. A missing entry
 * degrades the highlight; a wrong entry highlights the wrong line, which is why
 * the maps are written down on both sides.
 */
export const PSEUDOCODE_LISTINGS: Record<string, PseudocodeListing> = {
  insertAtHead: {
    id: 'insertAtHead',
    lines: [
      'function insertAtHead(head, value):',
      '    node ← new Node(value)',
      '    node.next ← head',
      '    head ← node',
      '    return head',
    ],
  },

  insertAt: {
    id: 'insertAt',
    lines: [
      'function insertAt(head, value, k):',
      '    node ← new Node(value)',
      '    if k ≤ 0 or head = null:',
      '        node.next ← head',
      '        head ← node',
      '        return head',
      '    current ← head',
      '    i ← 1',
      '    while current.next ≠ null and i < k:',
      '        current ← current.next',
      '        i ← i + 1',
      '    node.next ← current.next',
      '    current.next ← node',
      '    return head',
    ],
  },

  insertAtTail: {
    id: 'insertAtTail',
    lines: [
      'function insertAtTail(head, value):',
      '    node ← new Node(value)',
      '    if head = null:',
      '        head ← node',
      '        return head',
      '    current ← head',
      '    while current.next ≠ null:',
      '        current ← current.next',
      '    current.next ← node',
      '    return head',
    ],
  },

  deleteByValue: {
    id: 'deleteByValue',
    lines: [
      'function deleteByValue(head, value):',
      '    current ← head',
      '    while current ≠ null:',
      '        if current.value = value:',
      '            if current = head:',
      '                head ← current.next',
      '            else:',
      '                predecessor.next ← current.next',
      '            return head',
      '        predecessor ← current',
      '        current ← current.next',
      '    return head',
    ],
  },

  reverse: {
    id: 'reverse',
    lines: [
      'function reverse(head):',
      '    prev ← null',
      '    current ← head',
      '    while current ≠ null:',
      '        next ← current.next        # save the rest',
      '        current.next ← prev        # reverse the link',
      '        prev ← current             # advance prev',
      '        current ← next             # advance current',
      '    head ← prev',
      '    return head',
    ],
  },

  // ---------------------------------------------------------------- stack
  stackPush: {
    id: 'stackPush',
    lines: [
      'function push(stack, value):',
      '    if stack.size = stack.capacity:',
      '        capacity ← capacity × 2',
      '    top ← top + 1',
      '    stack[top] ← new Entry(value)',
      '    return stack',
    ],
  },
  stackPop: {
    id: 'stackPop',
    lines: [
      'function pop(stack):',
      '    if stack is empty:',
      '        return null',
      '    value ← stack[top]',
      '    top ← top - 1',
      '    remove stack[top + 1]',
      '    return value',
    ],
  },
  stackPeek: {
    id: 'stackPeek',
    lines: [
      'function peek(stack):',
      '    if stack is empty:',
      '        return null',
      '    return stack[top]',
    ],
  },

  // ---------------------------------------------------------------- BST
  bstSearch: {
    id: 'bstSearch',
    lines: [
      'function search(root, value):',
      '    current ← root',
      '    while current is not null:',
      '        if value = current.value:',
      '            return current',
      '        if value < current.value:',
      '            current ← current.left',
      '        else:',
      '            current ← current.right',
      '    return null',
    ],
  },
  bstInsert: {
    id: 'bstInsert',
    lines: [
      'function insert(root, value):',
      '    if root is null:',
      '        return new Node(value)',
      '    current ← root',
      '    while current is not null:',
      '        if value < current.value:',
      '            if current.left is null:',
      '                current.left ← new Node(value)',
      '                return root',
      '            current ← current.left',
      '        else if value > current.value:',
      '            if current.right is null:',
      '                current.right ← new Node(value)',
      '                return root',
      '            current ← current.right',
      '        else:',
      '            return root',
    ],
  },
  bstDelete: {
    id: 'bstDelete',
    lines: [
      'function delete(root, value):',
      '    parent ← null; current ← root',
      '    while current is not null and current.value ≠ value:',
      '        parent ← current',
      '        current ← current.left if value < current.value else current.right',
      '    if current is null:',
      '        return root',
      '    if current.left is null and current.right is null:',
      "        replace parent's child (or root) with null",
      '        remove current',
      '        return root',
      '    if current.left is null or current.right is null:',
      '        child ← current.left if current.left is not null else current.right',
      "        replace parent's child (or root) with child",
      '        remove current',
      '        return root',
      '    successorParent ← current; successor ← current.right',
      '    while successor.left is not null:',
      '        successorParent ← successor; successor ← successor.left',
      '    current.value ← successor.value',
      '    replacement ← successor.right',
      "    replace successorParent's child with replacement",
      '    remove successor',
      '    return root',
    ],
  },

  // ---------------------------------------------------------------- heap
  heapInsert: {
    id: 'heapInsert',
    lines: [
      'function insert(heap, value):',
      '    heap.append(new Entry(value))',
      '    i ← heap.size - 1',
      '    while i > 0:',
      '        parent ← ⌊(i - 1) / 2⌋',
      '        if the parent comes before heap[i]: break',
      '        swap(heap[i], heap[parent])',
      '        i ← parent',
      '    return heap',
    ],
  },
  heapExtractMin: {
    id: 'heapExtractMin',
    lines: [
      'function extractMin(heap):',
      '    if heap is empty: return null',
      '    root ← heap[0]',
      '    last ← heap.removeLast()',
      '    if heap is not empty:',
      '        heap[0] ← last',
      '        i ← 0',
      '        loop:',
      '            left ← 2i + 1; right ← 2i + 2',
      '            best ← i',
      '            if a child comes before heap[best]: best ← that child',
      '            if best = i: break',
      '            swap(heap[i], heap[best])',
      '            i ← best',
      '    return root',
    ],
  },
  heapExtractMax: {
    id: 'heapExtractMax',
    lines: [
      'function extractMax(heap):',
      '    if heap is empty: return null',
      '    root ← heap[0]',
      '    last ← heap.removeLast()',
      '    if heap is not empty:',
      '        heap[0] ← last',
      '        i ← 0',
      '        loop:',
      '            left ← 2i + 1; right ← 2i + 2',
      '            best ← i',
      '            if a child comes after heap[best]: best ← that child',
      '            if best = i: break',
      '            swap(heap[i], heap[best])',
      '            i ← best',
      '    return root',
    ],
  },
  heapBuildMin: {
    id: 'heapBuildMin',
    lines: [
      'function buildMinHeap(array):',
      '    for i ← ⌊size / 2⌋ - 1 down to 0:',
      '        j ← i',
      '        loop:',
      '            left ← 2j + 1; right ← 2j + 2',
      '            best ← j',
      '            if a child comes before array[best]: best ← that child',
      '            if best = j: break',
      '            swap(array[j], array[best])',
      '            j ← best',
      '    return array',
    ],
  },
  heapBuildMax: {
    id: 'heapBuildMax',
    lines: [
      'function buildMaxHeap(array):',
      '    for i ← ⌊size / 2⌋ - 1 down to 0:',
      '        j ← i',
      '        loop:',
      '            left ← 2j + 1; right ← 2j + 2',
      '            best ← j',
      '            if a child comes after array[best]: best ← that child',
      '            if best = j: break',
      '            swap(array[j], array[best])',
      '            j ← best',
      '    return array',
    ],
  },

  // ---------------------------------------------------------------- traversals
  //
  // A traversal is a pure function of the tree: it walks the nodes and appends
  // each visited value to `output`. Note there is no `trace` variable and no
  // `emit` call anywhere — the visualiser's steps are the *execution* of these
  // functions, not something the pseudocode mentions (ADR-6).
  preorder: {
    id: 'preorder',
    lines: [
      'function preorder(node, output):',
      '    if node = null:',
      '        return',
      '    output.append(node.value)          # visit',
      '    preorder(node.left, output)',
      '    preorder(node.right, output)',
    ],
  },
  inorder: {
    id: 'inorder',
    lines: [
      'function inorder(node, output):',
      '    if node = null:',
      '        return',
      '    inorder(node.left, output)',
      '    output.append(node.value)          # visit',
      '    inorder(node.right, output)',
    ],
  },
  postorder: {
    id: 'postorder',
    lines: [
      'function postorder(node, output):',
      '    if node = null:',
      '        return',
      '    postorder(node.left, output)',
      '    postorder(node.right, output)',
      '    output.append(node.value)          # visit',
    ],
  },
  levelOrder: {
    id: 'levelOrder',
    lines: [
      'function levelOrder(root, output):',
      '    queue ← empty',
      '    if root ≠ null: enqueue(queue, root)',
      '    while queue is not empty:',
      '        node ← dequeue(queue)',
      '        output.append(node.value)',
      '        if node.left  ≠ null: enqueue(queue, node.left)',
      '        if node.right ≠ null: enqueue(queue, node.right)',
      '    return output',
    ],
  },

  // ---------------------------------------------------------------- graph
  graphBuild: {
    id: 'graphBuild',
    lines: [
      'function buildGraph(labels, edgeList, directed):',
      '    graph ← adjacency list with one empty list per label',
      '    for each (u, v) in edgeList:',
      '        if u ∉ graph.vertices: add u',
      '        if v ∉ graph.vertices: add v',
      '        graph.adjacency[u].append(v)',
      '        if not directed: graph.adjacency[v].append(u)',
      '    return graph',
    ],
  },
  bfs: {
    id: 'bfs',
    lines: [
      'function bfs(graph, source, output):',
      '    visited ← {source}',
      '    queue ← [source]',
      '    while queue is not empty:',
      '        v ← dequeue(queue)',
      '        output.append(v)',
      '        for each u in adjacency[v]:',
      '            if u ∉ visited:',
      '                visited ← visited ∪ {u}',
      '                enqueue(queue, u)',
      '    return output',
    ],
  },
  dfs: {
    id: 'dfs',
    lines: [
      'function dfs(graph, source, output):',
      '    visited ← {}',
      '    stack ← [source]',
      '    while stack is not empty:',
      '        v ← pop(stack)',
      '        if v ∈ visited: continue',
      '        visited ← visited ∪ {v}',
      '        output.append(v)',
      '        for each u in reverse(adjacency[v]):',
      '            if u ∉ visited: push(stack, u)',
      '    return output',
    ],
  },
}

/**
 * One record per `(structure, operation)`. Ids are global keys, so they are
 * namespaced (`bstInsert` vs `heapInsert`) — the two structures both have an
 * "insert", and a `Record` cannot hold two records with the same key.
 */
export const OPERATION_META: Record<string, OperationMeta> = {
  insertAtHead: {
    id: 'insertAtHead',
    label: 'Insert at head',
    pseudocodeId: 'insertAtHead',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(1)',
    worst: 'O(1)',
    space: 'O(1)',
    assumptions: [
      'Only the head pointer changes; the existing list is never walked.',
    ],
  },
  insertAt: {
    id: 'insertAt',
    label: 'Insert at position',
    pseudocodeId: 'insertAt',
    inputs: ['values', 'value', 'position'],
    best: 'O(1)',
    average: 'O(k)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'k is 0-based; position 0 is the head and needs no walk.',
      'A position past the end appends at the tail (the narration says so).',
      'The new node floats until predecessor.next and node.next are both set.',
    ],
  },

  insertAtTail: {
    id: 'insertAtTail',
    label: 'Insert at tail',
    pseudocodeId: 'insertAtTail',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'Traverses the list to find the last node because the model has no tail pointer.',
      'For an empty list, the new node becomes the head.',
    ],
  },

  deleteByValue: {
    id: 'deleteByValue',
    label: 'Delete by value',
    pseudocodeId: 'deleteByValue',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'Deletes only the first node matching the requested value.',
      'If the value is absent, the list remains unchanged.',
    ],
  },
  reverse: {
    id: 'reverse',
    label: 'Reverse',
    pseudocodeId: 'reverse',
    inputs: ['values'],
    best: 'O(n)',
    average: 'O(n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'The standard three-pointer walk: prev, current and a saved next.',
      'Every node is visited once and every next pointer is flipped exactly once.',
      'Reversing twice restores the original order; no node is copied.',
    ],
  },

  // ---------------------------------------------------------------- stack
  stackPush: {
    id: 'stackPush',
    label: 'Push',
    pseudocodeId: 'stackPush',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(1) amortised',
    worst: 'O(n) on a resize',
    space: 'O(1)',
    assumptions: [
      'Only the top cell and the top pointer change.',
      'The array doubles when full; that one copy is O(n), amortised over pushes.',
      'top advances before the value is written, so the reserved slot is visible.',
    ],
  },
  stackPop: {
    id: 'stackPop',
    label: 'Pop',
    pseudocodeId: 'stackPop',
    inputs: ['values'],
    best: 'O(1)',
    average: 'O(1)',
    worst: 'O(1)',
    space: 'O(1)',
    assumptions: [
      'Reads and removes the most recently pushed value.',
      'Pop on an empty stack returns null instead of throwing (underflow is an outcome).',
    ],
  },
  stackPeek: {
    id: 'stackPeek',
    label: 'Peek',
    pseudocodeId: 'stackPeek',
    inputs: ['values'],
    best: 'O(1)',
    average: 'O(1)',
    worst: 'O(1)',
    space: 'O(1)',
    assumptions: [
      'Reads the top value without changing the stack.',
      'Peek on an empty stack returns null and leaves the structure unchanged.',
    ],
  },

  // ---------------------------------------------------------------- BST
  bstInsertAll: {
    id: 'bstInsertAll',
    label: 'Insert values one by one',
    pseudocodeId: 'bstInsert',
    inputs: ['values'],
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(1)',
    assumptions: [
      'Each dataset value is inserted by the same insert algorithm, in order.',
      'n inserts cost O(n log n) while the tree stays balanced; sorted input is O(n²).',
      'Every step is an insert step, so the code panel highlights the insert lines.',
    ],
  },
  bstSearch: {
    id: 'bstSearch',
    label: 'Search',
    pseudocodeId: 'bstSearch',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(log n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'h = tree height; O(log n) only while the tree is balanced.',
      'A failed search ends at a null pointer, which is a result, not an error.',
    ],
  },
  bstInsert: {
    id: 'bstInsert',
    label: 'Insert',
    pseudocodeId: 'bstInsert',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(log n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'h = tree height; the sorted-input preset degenerates to a chain.',
      'A duplicate key is reported in its own step and then ignored.',
    ],
  },
  bstDelete: {
    id: 'bstDelete',
    label: 'Delete',
    pseudocodeId: 'bstDelete',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(log n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'Three cases are shown separately: leaf, one child, two children.',
      'The two-children case copies the in-order successor up, then deletes it.',
    ],
  },

  // ---------------------------------------------------------------- heap
  heapInsertAll: {
    id: 'heapInsertAll',
    label: 'Insert values one by one (sift-up)',
    pseudocodeId: 'heapInsert',
    inputs: ['values'],
    best: 'O(n)',
    average: 'O(n)',
    worst: 'O(n log n)',
    space: 'O(1)',
    assumptions: [
      'Each dataset value is appended and sifted up, in order.',
      'n inserts is the O(n log n) case to compare against one O(n) build-heap.',
      'Every step is an insert step, so the code panel highlights the sift-up lines.',
    ],
  },
  heapInsert: {
    id: 'heapInsert',
    label: 'Insert (sift-up)',
    pseudocodeId: 'heapInsert',
    inputs: ['values', 'value'],
    best: 'O(1)',
    average: 'O(1)',
    worst: 'O(log n)',
    space: 'O(1)',
    assumptions: [
      'Append at the next free slot, then sift up to the root at most.',
      'Array slot and tree position are the same index in both renderings.',
    ],
  },
  heapExtractMin: {
    id: 'heapExtractMin',
    label: 'Extract-min (sift-down)',
    pseudocodeId: 'heapExtractMin',
    inputs: ['values'],
    best: 'O(log n)',
    average: 'O(log n)',
    worst: 'O(log n)',
    space: 'O(1)',
    assumptions: [
      'The last entry is promoted to the root, so the array stays complete.',
      'Both children are compared; the unchosen sibling is highlighted too.',
    ],
  },
  heapExtractMax: {
    id: 'heapExtractMax',
    label: 'Extract-max (sift-down)',
    pseudocodeId: 'heapExtractMax',
    inputs: ['values'],
    best: 'O(log n)',
    average: 'O(log n)',
    worst: 'O(log n)',
    space: 'O(1)',
    assumptions: [
      'Identical mechanics to extract-min with the comparison reversed.',
      'The last entry is promoted to the root before sifting down.',
    ],
  },
  heapBuildMin: {
    id: 'heapBuildMin',
    label: 'Build min-heap (bottom-up)',
    pseudocodeId: 'heapBuildMin',
    inputs: ['values'],
    best: 'O(n)',
    average: 'O(n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'Heapify every internal node from the last one back to the root.',
      'O(n), not the O(n log n) of n successive inserts — the step count shows it.',
    ],
  },
  heapBuildMax: {
    id: 'heapBuildMax',
    label: 'Build max-heap (bottom-up)',
    pseudocodeId: 'heapBuildMax',
    inputs: ['values'],
    best: 'O(n)',
    average: 'O(n)',
    worst: 'O(n)',
    space: 'O(1)',
    assumptions: [
      'Identical mechanics to build-min with the comparison reversed.',
      'The input array is treated as raw data; the operation fixes the direction.',
    ],
  },

  // ---------------------------------------------------------------- traversals
  preorder: {
    id: 'preorder',
    label: 'Preorder traversal',
    pseudocodeId: 'preorder',
    inputs: ['values'],
    best: 'Θ(n)',
    average: 'Θ(n)',
    worst: 'Θ(n)',
    space: 'O(h)',
    assumptions: [
      'Visits the node before both subtrees; the visit line is first.',
      'h = height: O(log n) balanced, O(n) degenerate.',
    ],
  },
  inorder: {
    id: 'inorder',
    label: 'Inorder traversal',
    pseudocodeId: 'inorder',
    inputs: ['values'],
    best: 'Θ(n)',
    average: 'Θ(n)',
    worst: 'Θ(n)',
    space: 'O(h)',
    assumptions: [
      'Visits the node between its subtrees; on a BST the output is sorted.',
      'The visit line sits between the two recursive calls.',
    ],
  },
  postorder: {
    id: 'postorder',
    label: 'Postorder traversal',
    pseudocodeId: 'postorder',
    inputs: ['values'],
    best: 'Θ(n)',
    average: 'Θ(n)',
    worst: 'Θ(n)',
    space: 'O(h)',
    assumptions: [
      'Visits the node after both subtrees; the root is visited last.',
      'The order in which a tree can be freed or evaluated bottom-up.',
    ],
  },
  levelOrder: {
    id: 'levelOrder',
    label: 'Level-order traversal',
    pseudocodeId: 'levelOrder',
    inputs: ['values'],
    best: 'Θ(n)',
    average: 'Θ(n)',
    worst: 'Θ(n)',
    space: 'O(w)',
    assumptions: [
      'The queue is the frontier, so a non-shifting FIFO is used, never shift().',
      'w = widest level, so the space is O(w) ≤ O(n).',
    ],
  },

  // ---------------------------------------------------------------- graph
  graphBuild: {
    id: 'graphBuild',
    label: 'Add edges one by one',
    pseudocodeId: 'graphBuild',
    inputs: ['edges'],
    best: 'O(V+E)',
    average: 'O(V+E)',
    worst: 'O(V+E)',
    space: 'O(V+E)',
    assumptions: [
      'Vertices come from the edge list; each edge is appended in order.',
      'That insertion order is exactly the neighbour order BFS/DFS will follow.',
    ],
  },
  bfs: {
    id: 'bfs',
    label: 'Breadth-first search',
    pseudocodeId: 'bfs',
    inputs: ['edges', 'source'],
    best: 'Θ(V+E)',
    average: 'Θ(V+E)',
    worst: 'Θ(V+E)',
    space: 'O(V)',
    assumptions: [
      'Unweighted graph; the distance in edges is a shortest path.',
      'Neighbour order is adjacency insertion order, so the trace is reproducible.',
      'A vertex is marked on discovery, not on dequeue.',
    ],
    notes: 'Only for unweighted graphs.',
  },
  dfs: {
    id: 'dfs',
    label: 'Depth-first search',
    pseudocodeId: 'dfs',
    inputs: ['edges', 'source'],
    best: 'Θ(V+E)',
    average: 'Θ(V+E)',
    worst: 'Θ(V+E)',
    space: 'O(V)',
    assumptions: [
      'Iterative form with an explicit stack, so the frontier is in the trace.',
      'Neighbours are pushed in reverse adjacency order so the pop order matches recursion.',
      'A duplicate push is discarded at the top of the loop.',
    ],
  },
}

/**
 * Structure entries. Each lists the operations the sidebar offers, in the order a
 * learner should meet them, and each now has its model **and** its renderer, which
 * is what A2 §5.7 asks of a new structure.
 *
 * The heap lists both directions — min and max are one structure with the
 * comparator flipped — and the BST lists the four traversals because they are
 * operations over the tree model (A2 §3 scopes them as algorithms, but the
 * catalogue is where they are selected).
 */
export const CATALOGUE: CatalogueEntry[] = [
  {
    id: 'list',
    label: 'Linked list',
    description:
      'A sequence of nodes joined by next pointers, reached through a single head reference.',
    operations: [
      'insertAtHead',
      'insertAt',
      'insertAtTail',
      'deleteByValue',
      'reverse',
    ],
    rules: [
      'Values are numbers or short strings.',
      'Insert positions are 0-based; a position past the end appends.',
    ],
  },
  {
    id: 'stack',
    label: 'Stack',
    description:
      'A LIFO container backed by an array: entries grow from slot 0 upward and a top pointer names the only reachable end. Push writes above top, pop steps top down, and peek reads without changing anything.',
    operations: ['stackPush', 'stackPop', 'stackPeek'],
    rules: [
      'Values are numbers or short strings.',
      'Only the top (the last value) is reachable: push, pop and peek are all O(1).',
      'Pop or peek on an empty stack returns null — underflow is an outcome, not an error.',
    ],
  },
  {
    id: 'heap',
    label: 'Priority queue (binary heap)',
    description:
      'A complete binary tree stored in one array: the parent of index i is floor((i-1)/2) and its children are 2i+1 and 2i+2. One model, two renderings.',
    operations: [
      'heapInsertAll',
      'heapInsert',
      'heapExtractMin',
      'heapExtractMax',
      'heapBuildMin',
      'heapBuildMax',
    ],
    rules: [
      'Values are integers in -9999..9999.',
      'Duplicate values are allowed; the array is the structure.',
      'Insert-values appends and sifts up one value at a time; build-heap heapifies a raw array in O(n).',
    ],
  },
  {
    id: 'bst',
    label: 'Binary search tree',
    description:
      'Recursive nodes {id, value, left, right} with a root pointer. The picture is derived from left/right only, so a stale pointer can never affect it.',
    operations: [
      'bstInsertAll',
      'bstInsert',
      'bstDelete',
      'bstSearch',
      'preorder',
      'inorder',
      'postorder',
      'levelOrder',
    ],
    rules: [
      'Keys are integers in -9999..9999.',
      'Duplicate keys are skipped, not inserted twice.',
      'Sorted input degenerates the tree to a chain; that is the lesson, not a bug.',
    ],
  },
  {
    id: 'graph',
    label: 'Graph',
    description:
      'An adjacency list: each vertex holds an ordered list of neighbours. Neighbour order is adjacency insertion order, which makes the traversals reproducible.',
    operations: ['graphBuild', 'bfs', 'dfs'],
    rules: [
      'Edges are written one per line as A-B, or A-B:weight for a weighted edge.',
      'No self-loops and no duplicate edges.',
      'Vertex positions are view state, never algorithm input.',
    ],
  },
]
