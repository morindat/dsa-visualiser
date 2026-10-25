import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

/**
 * Integration test for the visible slice: text in → trace → step through it.
 *
 * This runs in jsdom because it drives real React components. The algorithm core
 * is still tested with no DOM (`npm run test:core`); this test is about the wiring.
 */

describe('App — linked list · insert at head', () => {
  it('auto-loads a run and steps through it', async () => {
    const user = userEvent.setup()
    render(<App />)

    // The default run ([50, 30, 70] + 45) auto-loads as a 4-step trace.
    expect(await screen.findByText(/Step 1 of 4\./)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(/Step 2 of 4\./)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByText(/Step 1 of 4\./)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.getByText(/Step 1 of 4\./)).toBeInTheDocument()
  })

  it('starts with the stage focused and the inputs collapsed', async () => {
    render(<App />)
    expect(await screen.findByText(/Step 1 of 4\./)).toBeInTheDocument()

    expect(
      screen.queryByLabelText(/Value to insert at the head/),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit inputs' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Narration')).toBeInTheDocument()
  })

  it('steps with n/p and restarts with r', async () => {
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)

    fireEvent.keyDown(window, { key: 'n' })
    expect(await screen.findByText(/Step 2 of 4\./)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'p' })
    expect(screen.getByText(/Step 1 of 4\./)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'n' })
    fireEvent.keyDown(window, { key: 'r' })
    expect(screen.getByText(/Step 1 of 4\./)).toBeInTheDocument()
  })

  it('gates Next behind a practice answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)

    await user.click(screen.getByRole('button', { name: 'Practice' }))
    expect(screen.getByLabelText('Practice prediction')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText(/Step 1 of 4\./)).toBeInTheDocument()
    expect(screen.getByText(/Answer the question first/)).toBeInTheDocument()
  })

  it('switches between dark and light themes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)

    const current = document.documentElement.dataset.theme ?? 'dark'
    await user.click(
      screen.getByRole('button', {
        name: current === 'dark' ? 'Light theme' : 'Dark theme',
      }),
    )
    expect(document.documentElement.dataset.theme).toBe(
      current === 'dark' ? 'light' : 'dark',
    )
  })

  it('highlights the pseudocode line for the current step', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)

    const pane = screen.getByLabelText('Pseudocode')
    // Step 1 = "node ← new Node(value)".
    expect(pane.querySelector('[aria-current="step"]')?.textContent).toContain(
      'new Node(value)',
    )

    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(pane.querySelector('[aria-current="step"]')?.textContent).toContain(
      'node.next ← head',
    )
  })

  it('reports a rejected token and does not run the operation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/Step 1 of 4\./)

    await user.click(screen.getByRole('button', { name: 'Edit inputs' }))
    const insert = screen.getByLabelText(/Value to insert at the head/)
    await user.clear(insert)
    await user.type(insert, '12a')
    await user.click(screen.getByRole('button', { name: 'Visualise' }))

    expect(
      await screen.findByText(/Not a number or a simple word/),
    ).toBeInTheDocument()
    // Still the old trace: validation happens before anything is built (ADR-7).
    expect(screen.getByText(/Step 1 of 4\./)).toBeInTheDocument()
  })
})
