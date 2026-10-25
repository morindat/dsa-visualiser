import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NarrationPanel } from './NarrationPanel'

describe('NarrationPanel', () => {
  it('shows the current step sentence', () => {
    render(<NarrationPanel text="Create a new node." hasStep />)

    expect(screen.getByText('Create a new node.')).toBeInTheDocument()
    expect(screen.queryByText(/Phase boundary/)).not.toBeInTheDocument()
  })

  it('renders a milestone as a visible phase warning', () => {
    render(
      <NarrationPanel
        text="The heap is built and valid. The root is the minimum."
        milestone="heap-built"
        hasStep
      />,
    )

    expect(screen.getByText(/Phase boundary · playback paused/)).toBeVisible()
    expect(screen.getByText(/The heap is built and valid/)).toBeInTheDocument()
  })

  it('explains the empty state before a trace is loaded', () => {
    render(<NarrationPanel text="" hasStep={false} />)

    expect(
      screen.getByText(/Load a trace, then press Visualise/),
    ).toBeInTheDocument()
  })
})
