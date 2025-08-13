import { Component, ErrorInfo, ReactNode } from 'react';

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
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary p-5 m-5 border border-red-600 rounded-lg bg-red-50 text-red-600 font-mono">
          <h2>Something went wrong.</h2>
          <details className="whitespace-pre-wrap">
            <summary>Error details</summary>
            {this.state.error?.message}
            {this.state.error?.stack}
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2.5 px-4 py-2 bg-red-600 text-white border-0 rounded cursor-pointer"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}