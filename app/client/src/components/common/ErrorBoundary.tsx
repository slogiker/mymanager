import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Wrench,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Layers,
  Sparkles,
  Server,
} from 'lucide-react';
import {
  analyzeError,
  ErrorAnalysis,
  quarantinePart,
  recoverAssetsAndReload,
  resetLayoutPreferences,
  triggerServerRebuild,
} from '../../lib/selfHealer';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isInline?: boolean;
  onReset?: () => void;
  canResetLayout?: boolean;
  userId?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  analysis: ErrorAnalysis | null;
  attemptCount: number;
  showDetails: boolean;
  isRebuilding: boolean;
  rebuildStatus: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      analysis: null,
      attemptCount: 0,
      showDetails: false,
      isRebuilding: false,
      rebuildStatus: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    const analysis = analyzeError(error, errorInfo?.componentStack);
    this.setState({ errorInfo, analysis });
  }

  handleSelfHeal = () => {
    try {
      this.props.onReset?.();
    } catch (e) {
      console.warn('[ErrorBoundary] onReset handler error:', e);
    }

    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      analysis: null,
      attemptCount: prev.attemptCount + 1,
    }));
  };

  handleQuarantine = () => {
    const part = this.state.analysis?.faultyPart;
    if (part) {
      quarantinePart(part, this.props.userId);
      this.handleSelfHeal();
    }
  };

  handleReloadAssets = async () => {
    await recoverAssetsAndReload();
  };

  handleResetLayoutAndReload = () => {
    resetLayoutPreferences(this.props.userId);
    window.location.reload();
  };

  handleTriggerRebuild = async () => {
    this.setState({ isRebuilding: true, rebuildStatus: 'Requesting server rebuild...' });
    const res = await triggerServerRebuild();
    if (res.success) {
      this.setState({ rebuildStatus: 'Rebuild initiated! Reloading fresh bundle...' });
      setTimeout(() => {
        recoverAssetsAndReload();
      }, 1500);
    } else {
      this.setState({ isRebuilding: false, rebuildStatus: `Rebuild notice: ${res.message}` });
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Component Error';
      const errorMessage = this.state.error?.message || 'An unexpected runtime error occurred';
      const analysis = this.state.analysis;
      const isRepeated = this.state.attemptCount >= 1;

      // Inline containment fallback (inside a widget card or category column)
      if (this.props.isInline) {
        return (
          <div className="h-full min-h-[70px] w-full p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-200 text-xs flex flex-col justify-between gap-1.5 select-none">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-semibold text-rose-300 truncate text-[11px]">{title}</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 shrink-0">
                {analysis?.category === 'UNDEFINED_VARIABLE'
                  ? 'Null Value'
                  : analysis?.category === 'MISSING_ASSET_OR_CHUNK'
                  ? 'Missing Asset'
                  : isRepeated
                  ? `Attempt ${this.state.attemptCount}`
                  : 'Isolated'}
              </span>
            </div>

            <p className="text-[10px] text-rose-300/80 font-mono truncate" title={errorMessage}>
              {errorMessage}
            </p>

            <div className="flex items-center gap-1.5 pt-1 border-t border-rose-500/20 text-[10px] flex-wrap">
              <button
                type="button"
                onClick={this.handleSelfHeal}
                className="px-2 py-0.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 hover:text-white border border-rose-500/40 font-medium flex items-center gap-1 transition-colors"
                title="Attempt self-healing recovery"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Self Heal</span>
              </button>

              {analysis?.canQuarantine && (
                <button
                  type="button"
                  onClick={this.handleQuarantine}
                  className="px-2 py-0.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-white border border-amber-500/30 font-medium flex items-center gap-1 transition-colors"
                  title="Disable this specific widget to prevent further crashes"
                >
                  <ShieldAlert className="w-2.5 h-2.5" />
                  <span>Disable Part</span>
                </button>
              )}

              {analysis?.canReloadAssets && (
                <button
                  type="button"
                  onClick={this.handleReloadAssets}
                  className="px-2 py-0.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 hover:text-white border border-sky-500/30 font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Reload Assets</span>
                </button>
              )}

              {isRepeated && (
                <button
                  type="button"
                  onClick={this.handleResetLayoutAndReload}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium flex items-center gap-1 transition-colors"
                  title="Reset local widget layouts"
                >
                  <Wrench className="w-2.5 h-2.5" />
                  <span>Reset View</span>
                </button>
              )}
            </div>
          </div>
        );
      }

      // Full Viewport / Application Fallback
      return (
        <div className="min-h-[280px] p-6 rounded-2xl border border-rose-500/30 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center max-w-lg mx-auto my-8 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            {analysis?.summary || title}
          </h3>

          <p className="text-xs text-slate-400 mb-3 max-w-sm">
            {analysis?.details || 'An unexpected issue occurred. The self-healer has analyzed the error and prepared automatic recovery options.'}
          </p>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-rose-400 max-w-full overflow-x-auto mb-3">
            {errorMessage}
          </div>

          {this.state.rebuildStatus && (
            <div className="p-2 mb-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] font-mono">
              {this.state.rebuildStatus}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <button
              type="button"
              onClick={this.handleSelfHeal}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Self Heal & Retry</span>
            </button>

            {analysis?.canQuarantine && (
              <button
                type="button"
                onClick={this.handleQuarantine}
                className="px-3.5 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-amber-500/40 transition-colors"
                title={`Disable ${analysis.partLabel || 'crashing component'} so the rest of the app can run`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Disable {analysis.partLabel || 'Part'}</span>
              </button>
            )}

            {analysis?.canReloadAssets && (
              <button
                type="button"
                onClick={this.handleReloadAssets}
                className="px-3.5 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-sky-500/40 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Fresh Assets</span>
              </button>
            )}

            <button
              type="button"
              onClick={this.handleResetLayoutAndReload}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Clear cached dashboard preferences and restore defaults"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Reset Layout Cache</span>
            </button>

            {analysis?.canTriggerRebuild && (
              <button
                type="button"
                onClick={this.handleTriggerRebuild}
                disabled={this.state.isRebuilding}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50"
                title="Regenerate client assets on the server"
              >
                <Server className="w-3.5 h-3.5 text-red-400" />
                <span>{this.state.isRebuilding ? 'Rebuilding...' : 'Rebuild Assets'}</span>
              </button>
            )}
          </div>

          {/* Collapsible diagnostic details */}
          <div className="w-full text-left pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={this.toggleDetails}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 mx-auto"
            >
              <span>{this.state.showDetails ? 'Hide' : 'Show'} diagnostic analysis</span>
              {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {this.state.showDetails && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-40">
                <div className="text-rose-400 font-semibold mb-1">
                  Category: {analysis?.category}
                </div>
                {analysis?.suggestedAction && (
                  <div className="text-amber-300 mb-1">
                    Suggestion: {analysis.suggestedAction}
                  </div>
                )}
                <div className="text-slate-300 font-semibold mb-1">
                  {this.state.error?.name}: {this.state.error?.message}
                </div>
                {this.state.error?.stack && (
                  <pre className="whitespace-pre-wrap text-[9px] text-slate-500">{this.state.error.stack}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
