import { Component } from 'react'

/**
 * ErrorBoundary – Catches unhandled React render/lifecycle errors and displays
 * a Neobrutalist fallback UI instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught unhandled render error:', error)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FCA5A5] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            {/* Header */}
            <div className="border-b-4 border-black pb-4 mb-6">
              <p className="text-4xl mb-2">💥</p>
              <h1 className="text-2xl font-black tracking-tight">Something went wrong</h1>
              <p className="text-gray-600 font-semibold mt-1 text-sm">
                The app encountered an unexpected error.
              </p>
            </div>

            {/* Error detail */}
            {this.state.error && (
              <div className="mb-6 border-2 border-red-600 bg-red-50 p-4">
                <p className="text-red-700 font-bold text-sm mb-1">Error:</p>
                <p className="text-red-600 font-mono text-xs break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-black text-white font-black border-2 border-black
                           shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                           hover:bg-gray-800 active:translate-x-0.5 active:translate-y-0.5
                           active:shadow-none transition-all cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-white text-black font-black border-2 border-black
                           shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                           hover:bg-gray-50 active:translate-x-0.5 active:translate-y-0.5
                           active:shadow-none transition-all cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
