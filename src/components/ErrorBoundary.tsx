import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render-time crash in its subtree and shows a recovery panel
 * instead of blanking the whole app. Key it by route (or anything that should
 * reset it) so moving elsewhere starts fresh.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div role="alert" className="card w-full max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold text-ink/90">Something went wrong on this screen.</h1>
          {error.message && (
            <p className="mt-2 break-words text-xs text-ink/60">{error.message}</p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={this.reset}>
              Try again
            </button>
            {/* Plain anchor: works even when the router itself is what failed. */}
            <a className="btn-secondary" href={`${import.meta.env.BASE_URL}dashboard`}>
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
