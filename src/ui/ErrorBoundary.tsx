/**
 * ErrorBoundary — per-panel failure containment (ER13).
 *
 * WHAT IT DOES
 *   A class component that catches a render error in its subtree and shows a
 *   compact fallback instead of blanking the page. Each pane and auxiliary panel
 *   is wrapped in one.
 *
 * WHY THIS FILE EXISTS
 *   Failure containment is an explicit requirement: one bad render — an unexpected
 *   `aux.kind`, a malformed fixture — must not take down the session. Because the
 *   panels are independent pure functions of the same `(trace, index)`, a boundary
 *   around each is both cheap and sufficient.
 *
 * RULES
 *   It may not hold algorithm state or the step index; it only catches render
 *   errors and offers a retry. React error boundaries must be class components,
 *   which is why this is the one `ui/` file that is not a function component.
 *   Styling uses the semantic tokens in `src/index.css`.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

export type ErrorBoundaryProps = {
  /** Shown in the fallback, e.g. "Structure view". */
  title: string
  children: ReactNode
}

type ErrorBoundaryState = { error: Error | null }

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[${this.props.title}] panel failed to render`,
      error,
      info.componentStack,
    )
  }

  private readonly reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="rounded-lg border border-bad/40 bg-bad/10 p-4 text-sm">
          <p className="font-medium text-bad">
            The {this.props.title} could not be rendered.
          </p>
          <p className="mt-1 text-bad/80">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-2 rounded border border-bad/40 px-2 py-1 text-xs text-bad hover:bg-bad/20"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
