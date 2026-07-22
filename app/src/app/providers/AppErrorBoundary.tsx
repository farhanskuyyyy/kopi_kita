import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertOctagon } from "lucide-react";

interface State {
  hasError: boolean;
}

/**
 * Router-root error boundary (Frontend-Architecture §7): catches render-time crashes only —
 * a distinct fallback from mocked API failures, which are React Query error states
 * (inline banners/toasts, §3.6–3.7). Not a substitute for handling a fetch error.
 */
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertOctagon className="h-12 w-12 text-destructive" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred. Try reloading the page.
          </p>
          <Button onClick={() => window.location.assign("/")}>Back to Home</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
