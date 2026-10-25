import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ValidationFeedback } from './ValidationFeedback'

// jsdom: this is a presentation component, so it is tested through the DOM. The
// validators it renders are covered DOM-free in src/app/validate.test.ts.

describe('ValidationFeedback', () => {
  it('renders a chip per token with its status word and reason', () => {
    render(
      <ValidationFeedback
        tokens={[
          { token: '50', status: 'accepted' },
          {
            token: '30',
            status: 'ignored',
            reason: 'duplicate; duplicates are not inserted',
          },
          { token: 'xyz', status: 'rejected', reason: 'not an integer' },
        ]}
      />,
    )

    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getAllByText('accepted')).toHaveLength(1)
    // The status is a word, not only a colour (NFR-U2).
    expect(screen.getByText('skipped')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
    expect(screen.getByText('not an integer')).toBeInTheDocument()
    expect(
      screen.getByText('duplicate; duplicates are not inserted'),
    ).toBeInTheDocument()
  })

  it('shows the batch error as an alert and the accepted preview', () => {
    render(
      <ValidationFeedback
        tokens={[{ token: '1', status: 'accepted' }]}
        error="Too many values: the limit is 200."
        preview={[9, 5, 13]}
        previewLabel="Tree preview"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Too many values')
    expect(screen.getByText(/Tree preview/)).toBeInTheDocument()
    expect(screen.getByText('9, 5, 13')).toBeInTheDocument()
    expect(screen.getByText('(3 value(s))')).toBeInTheDocument()
  })

  it('renders nothing when there is no report yet', () => {
    const { container } = render(<ValidationFeedback tokens={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
