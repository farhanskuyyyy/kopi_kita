import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaHref?: string;
}

/**
 * Shared empty-state pattern (spec Screen 28, §3.7): icon + one-line message + optional CTA.
 * Reused by every list/detail screen instead of ad hoc per-page markup.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, ctaLabel, onCta, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-base font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {ctaLabel && ctaHref && (
        <Button asChild className="mt-2">
          <a href={ctaHref}>{ctaLabel}</a>
        </Button>
      )}
      {ctaLabel && onCta && !ctaHref && (
        <Button onClick={onCta} className="mt-2">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
