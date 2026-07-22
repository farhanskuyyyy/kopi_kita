import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Dialog body — plain confirmation copy, or a guard/blocked message with extra content. */
  children: ReactNode;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Hide the destructive confirm action (e.g. a delete-guard message replaces it). */
  hideConfirm?: boolean;
}

/**
 * Shared destructive-confirmation dialog (Frontend-Architecture §7) — used by both the
 * Admin Product List and Admin Category List so the confirm/cancel/guard-message shell
 * isn't hand-rolled per screen.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  children,
  onConfirm,
  isLoading = false,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  hideConfirm = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm">{children}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          {!hideConfirm && (
            <Button variant="destructive" isLoading={isLoading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
