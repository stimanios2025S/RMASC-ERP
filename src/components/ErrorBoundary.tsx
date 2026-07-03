import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ERROR BOUNDARY]', error.message, errorInfo.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
          <div className="max-w-md w-full bg-surface-50/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h2>
            <p className="text-sm text-slate-400 mb-4">
              L'application a rencontré une erreur inattendue. Veuillez réessayer.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-red-300 font-mono break-all">
                {this.state.error?.message || 'Erreur inconnue'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg"
            >
              🔄 Relancer l'application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
