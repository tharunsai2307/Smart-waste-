import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm font-semibold text-white">Component display issue</div>
          <div className="text-xs text-slate-400 mt-1">Failed to render this visual component.</div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
