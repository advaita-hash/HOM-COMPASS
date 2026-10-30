import { Component, createRef, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** When this changes while the panel is showing, the boundary resets (e.g. the route). */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render-time crash in its subtree and shows a recovery panel
 * instead of blanking the whole app. Pass the route as `resetKey` so moving
 * elsewhere recovers without remounting healthy screens on every navigation.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  private heading = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { error } = this.state;
    if (error && prevState.error && prevProps.resetKey !== this.props.resetKey) {
      // Only reset when the route changes while the panel was already showing:
      // a crash on the commit that navigated *into* a screen must not be retried.
      this.setState({ error: null });
    } else if (error && error !== prevState.error) {
      // A new error (incl. crash A → crash B, or "Try again" crashing again).
      // The focused element may have just unmounted; start keyboard users at the panel.
      this.heading.current?.focus();
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div role="alert" className="card w-full max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" aria-hidden />
          <h1
            ref={this.heading}
            tabIndex={-1}
            className="mt-3 text-lg font-semibold text-ink/90 focus:outline-none"
          >
            Something went wrong on this screen.
          </h1>
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
