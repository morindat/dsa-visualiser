import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

/**
 * Integration tests for the structures wired after the list slice: select a
 * structure, press Visualise, and watch the dataset get inserted one value at a
 * time before the selected operation runs. The list slice has its own test; this
 * file proves the pipeline, controller, renderers and phase-switching code panel
 * are reachable from the UI.
 */

/** Jump the scrubber to the last step; the controller clamps the value. */
function seekToEnd(): void {
  fireEvent.change(screen.getByLabelText('Scrub to a step'), {
    target: { value: '100000' },
  })
}

/** The stage starts focused, so the catalogue has to be pinned open first. */
async function openCatalogue(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const button = screen.getByRole('button', { name: 'Structures' })
  if (button.getAttribute('aria-pressed') !== 'true') {
    await user.click(button)
  }
}

describe('App — non-list structures', () => {
  it('labels the delete-by-value field as a value to delete', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Delete by value' }))

    expect(screen.getByLabelText(/Value to delete/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Value to delete/)).not.toHaveValue('45')
    expect(screen.queryByLabelText(/Value to insert/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Visualise' }),
    ).toBeInTheDocument()
  })

  it('inserts a heap dataset one value at a time, then shows the dual view', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(
      screen.getByRole('button', { name: 'Priority queue (binary heap)' }),
    )
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    // Step 1 is the build phase: the insert listing is the one highlighted (the
    // executing instruction), and the heap holds exactly the first value inserted.
    expect(
      screen.getByText(/Pseudocode · Insert \(sift-up\)/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /heap with 1 entr/ }),
    ).toBeInTheDocument()

    // By the end of the build the same heap holds all 10 values, in both views.
    seekToEnd()
    expect(
      screen.getByRole('img', { name: /heap with 10 entr/ }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/heap array \(index = tree slot\)/).length,
    ).toBeGreaterThan(0)
  })

  it('loads the pre-built BST, then runs inorder over it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Binary search tree' }))
    await user.click(screen.getByRole('button', { name: 'Inorder traversal' }))
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    // Visualise loads the finished tree and the traversal listing; there is no
    // insert-by-insert build phase to step through first.
    expect(
      screen.getByText(/Pseudocode · Inorder traversal/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Binary search tree with 10 node/ }),
    ).toBeInTheDocument()
    // The auxiliary pane exposes the growing traversal output.
    expect(screen.getByText('output')).toBeInTheDocument()

    seekToEnd()
    expect(
      screen.getByText(/Pseudocode · Inorder traversal/),
    ).toBeInTheDocument()
    const pane = screen.getByLabelText('Pseudocode')
    expect(pane.textContent).toContain('function inorder')
  })

  it('loads the pre-built BST before searching', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Binary search tree' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    // Search starts against the already-built tree, so its own listing is shown
    // from the first step — no insert-by-insert phase first.
    expect(screen.getByText(/Pseudocode · Search/)).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Binary search tree with 10 node/ }),
    ).toBeInTheDocument()
  })

  it('loads the pre-drawn graph, then shows the BFS frontier', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Graph' }))
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    // The complete graph is already drawn when the traversal starts.
    expect(
      screen.getByText(/Pseudocode · Breadth-first search/),
    ).toBeInTheDocument()
    const graph = screen.getByRole('img', {
      name: /Graph with 10 vertices/,
    })
    expect(graph.textContent).toContain('source')
    expect(graph.textContent).toContain('current')
    // Narration and the live region use A/B labels, not internal v1/v2 ids.
    expect(
      screen.getByText(/Step 1 of \d+\. Mark A discovered/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/\bv\d+\b/)).not.toBeInTheDocument()
    // The graph-specific explanation names the current vertex, the frontier and
    // the discovery order instead of relying on colours alone.
    expect(screen.getByText('Traversal state')).toBeInTheDocument()
    expect(screen.getByText('Processing now')).toBeInTheDocument()
    expect(screen.getByText('Discovered order')).toBeInTheDocument()

    seekToEnd()
    expect(
      screen.getByText(/Pseudocode · Breadth-first search/),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/queue \(front first\)/).length).toBeGreaterThan(
      0,
    )
    expect(screen.getByText('Already visited')).toBeInTheDocument()
  })

  it('reports a duplicate BST key as skipped, not as a failure', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Binary search tree' }))
    const keys = screen.getByLabelText(/Initial keys/)
    await user.clear(keys)
    await user.type(keys, '10, 5, 10')
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    // ER4: the duplicate is advisory, so the run still happens…
    expect(await screen.findByText('skipped')).toBeInTheDocument()
    expect(
      screen.getByText(/duplicate; duplicates are not inserted/),
    ).toBeInTheDocument()
    // …and the trace is live (the run was not blocked).
    expect(screen.getByText(/Step \d+ of \d+\./)).toBeInTheDocument()
  })

  it('pushes onto the stack and exposes the top marker', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Stack' }))
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    expect(screen.getByText(/Pseudocode · Push/)).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Stack with 10 entries, top 25/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/top marker/).length).toBeGreaterThan(0)

    seekToEnd()
    expect(
      screen.getByRole('img', { name: /Stack with 11 entries, top 45/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Pushed 45/).length).toBeGreaterThan(0)
  })

  it('reverses the list with the three named pointer variables', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Reverse' }))
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    expect(screen.getByText(/Pseudocode · Reverse/)).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Linked list with 10 linked node/ }),
    ).toBeInTheDocument()
    // The auxiliary pane names the three pointers; at step 0 none is set yet.
    expect(screen.getByText('prev → null')).toBeInTheDocument()
    expect(screen.getByText('current → null')).toBeInTheDocument()

    // Step 1 assigns current = head.
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('current → n1')).toBeInTheDocument()

    // Two more steps reach the save-next beat, where all three roles are shown.
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('next → n2')).toBeInTheDocument()
    expect(screen.getAllByText('next').length).toBeGreaterThan(0)
  })

  it('inserts at a chosen position with the position field', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)
    await openCatalogue(user)

    await user.click(screen.getByRole('button', { name: 'Insert at position' }))
    const position = screen.getByLabelText(/Position \(0 = head\)/)
    await user.clear(position)
    await user.type(position, '2')
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(await screen.findByText(/Step 1 of \d+\./)).toBeInTheDocument()
    expect(
      screen.getByText(/Pseudocode · Insert at position/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Linked list with 10 linked node/ }),
    ).toBeInTheDocument()

    seekToEnd()
    expect(
      screen.getByRole('img', { name: /Linked list with 11 linked node/ }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/Inserted 45 at position 2/).length,
    ).toBeGreaterThan(0)
  })
})
