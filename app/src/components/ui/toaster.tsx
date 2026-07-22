import { Toaster as Sonner } from "sonner";

/**
 * Single toast provider mounted once (Frontend-Architecture §7). Feature code should call
 * `lib/toast.ts` helpers, never the raw `sonner` API, so timing rules (§3.6) can't drift.
 */
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  );
}
