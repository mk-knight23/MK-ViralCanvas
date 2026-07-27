import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-surface flex items-center justify-center p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-2xl w-full card-elevated p-10 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-accent-soft p-4 rounded-xl">
                <svg
                  className="w-10 h-10 text-brand-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-display font-bold text-text-primary">Something broke</h1>
            </div>
            <p className="text-text-secondary font-medium mb-6 leading-relaxed">
              The editor hit an unexpected error. Your saved projects are safe in this browser —
              reload to pick up where you left off.
            </p>
            {this.state.error && (
              <details className="mb-6">
                <summary className="text-xs font-semibold uppercase tracking-wider cursor-pointer text-text-muted hover:text-text-primary transition-colors">
                  Technical Details
                </summary>
                <pre className="mt-3 p-4 bg-surface-secondary border border-border text-xs overflow-auto font-mono rounded-xl text-text-secondary">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-8 py-3.5 bg-brand-cta text-accent-contrast rounded-xl font-semibold text-sm border border-transparent hover:border-ring transition-colors cursor-pointer"
            >
              Reload the editor
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
