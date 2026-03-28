import React from 'react';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="flex items-center justify-center min-h-screen bg-white p-4">
          <div className="w-full max-w-md border-2 border-black bg-white p-6">
            <h1 className="text-2xl font-bold uppercase tracking-wide mb-4 border-b-2 border-black pb-3">
              Something went wrong
            </h1>
            {isDevelopment && this.state.error && (
              <div className="mb-6 bg-gray-100 border-2 border-black p-3 rounded-none">
                <p className="text-sm font-mono text-red-600 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <p className="text-sm mb-6 leading-relaxed">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full font-bold uppercase tracking-wide transition-transform duration-200 border-2 border-black bg-black text-white hover:-translate-x-1 hover:-translate-y-1 px-6 py-3 text-base"
              style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
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

export default ErrorBoundary;
