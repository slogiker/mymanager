import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isInline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Component Error';
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';

      if (this.props.isInline) {
        return (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-red-300">{title}:</span>{' '}
                <span className="text-red-400/80 text-[11px] font-mono">{errorMessage}</span>
              </div>
            </div>
            <button
              onClick={this.handleReset}
              className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white border border-red-500/30 text-[10px] font-medium flex items-center gap-1 shrink-0 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-[220px] p-6 rounded-2xl border border-red-500/30 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center max-w-lg mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">{title}</h3>
          <p className="text-xs text-slate-400 mb-3 max-w-sm">
            This section encountered an issue and self-recovered to prevent the page from crashing.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-red-400 max-w-full overflow-x-auto mb-4">
            {errorMessage}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try Recovering
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
