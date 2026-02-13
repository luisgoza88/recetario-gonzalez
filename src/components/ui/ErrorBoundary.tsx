'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.sectionName || 'unknown'}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center m-4">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <h3 className="font-semibold text-red-800 mb-1">
            Algo salió mal{this.props.sectionName ? ` en ${this.props.sectionName}` : ''}
          </h3>
          <p className="text-sm text-red-600 mb-4">
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
