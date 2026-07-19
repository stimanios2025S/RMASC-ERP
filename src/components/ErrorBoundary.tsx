import React from 'react'

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ERROR BOUNDARY]', error.message, errorInfo.componentStack)
    this.setState({ errorInfo })
    // Envoyer l'erreur à un service de monitoring si configuré
    try {
      fetch('/api/log/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {})
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h2>
            <p className="text-sm text-white/50 mb-6">
              L'application a rencontré une erreur inattendue. Veuillez réessayer.
            </p>
            {this.state.error?.message && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-red-300 font-mono break-all">{this.state.error.message}</p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleReset}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg">
                🔄 Réessayer
              </button>
              <button onClick={this.handleReload}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all border border-white/10">
                🔁 Recharger
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
