import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIDR } from "@/lib/format/currency";
import { useCartStore, type CartLine } from "../store/cartStore";

interface CartLineItemProps {
  line: CartLine;
  unavailableReason?: string | null;
}

/** Cart line row (Screen 5): quantity stepper, remove-confirmation on decrement below 1 (F-007). */
export function CartLineItem({ line, unavailableReason }: CartLineItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="flex items-start gap-4 border-b py-4 last:border-0">
      <div className="flex-1">
        <p className="font-medium">{line.name}</p>
        {line.customizationSummary && <p className="text-sm text-muted-foreground">{line.customizationSummary}</p>}
        {unavailableReason && (
          <Badge variant="destructive" className="mt-1">
            {unavailableReason}
          </Badge>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{formatIDR(line.unitPrice)} each</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Decrease quantity"
            onClick={() => (line.quantity <= 1 ? setConfirmRemove(true) : updateQuantity(line.lineId, line.quantity - 1))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-6 text-center text-sm">{line.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Increase quantity"
            onClick={() => updateQuantity(line.lineId, line.quantity + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="font-semibold">{formatIDR(line.unitPrice * line.quantity)}</p>
        <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => setConfirmRemove(true)}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
        </Button>
      </div>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove item?</DialogTitle>
            <DialogDescription>Remove {line.name} from your cart?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                removeLine(line.lineId);
                setConfirmRemove(false);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
