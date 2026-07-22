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
          className="min-h-screen bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 flex items-center justify-center p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 border-2 border-brand-primary/20 p-12 rounded-[2rem] shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-brand-primary/10 p-4 rounded-2xl">
                <svg
                  className="w-12 h-12 text-brand-primary"
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
              <h1 className="text-4xl font-display font-black text-slate-900 dark:text-white">
                Meme <span className="text-brand-primary">Crash!</span>
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-8 leading-relaxed">
              Something went wrong while creating your meme. Don't worry, your creative genius isn't
              lost!
            </p>
            {this.state.error && (
              <details className="mb-8">
                <summary className="text-xs font-black uppercase tracking-widest cursor-pointer hover:text-brand-primary transition-colors text-slate-500">
                  Technical Details
                </summary>
                <pre className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 text-xs overflow-auto font-mono rounded-xl text-slate-600 dark:text-slate-400">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-8 py-4 bg-brand-primary hover:bg-brand-accent text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-brand-primary/30"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
