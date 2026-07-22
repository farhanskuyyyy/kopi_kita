import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Shared inline error-banner pattern (spec §3.6/§3.7): message + Retry, used for every
 * page/section-level failure. Never a substitute for the render-crash AppErrorBoundary.
 */
export function ErrorBanner({ message = "Something went wrong. Please try again.", onRetry }: ErrorBannerProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <p className="text-sm text-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
