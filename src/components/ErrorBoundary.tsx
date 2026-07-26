import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in app:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center">
          <p className="font-mono text-lg text-ink-100">Something went wrong.</p>
          <p className="max-w-md text-sm text-ink-400">
            {this.state.error.message || 'The page hit an unexpected error and could not continue.'}
          </p>
          <button
            onClick={() => {
              this.setState({ error: null })
              window.location.assign('/')
            }}
            className="rounded-lg bg-caret px-4 py-2 text-sm font-medium text-ink-950 hover:opacity-90"
          >
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
