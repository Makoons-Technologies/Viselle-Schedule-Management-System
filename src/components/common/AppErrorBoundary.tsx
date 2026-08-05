import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/client-errors';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({
      source: 'boundary',
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center dark:bg-stone-950">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Something went wrong</h1>
          <p className="max-w-md text-sm text-stone-600 dark:text-stone-400">
            The page hit an unexpected error. You can reload and continue — if it keeps happening, contact{' '}
            <a className="underline" href="mailto:hello@viselle.net">
              hello@viselle.net
            </a>
            .
          </p>
          <Button type="button" onClick={this.handleReload}>
            Reload Viselle
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
