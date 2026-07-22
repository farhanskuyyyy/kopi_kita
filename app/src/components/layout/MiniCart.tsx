import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/features/cart/store/cartStore";
import { formatIDR } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

/** Persistent header cart badge + mini-cart dropdown preview (A7, §3.8) — not a separate screen. */
export function MiniCart() {
  const lines = useCartStore((s) => s.lines);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={`Cart, ${itemCount} items`}>
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge variant="destructive" className="absolute -right-2 -top-2 h-5 min-w-5 justify-center px-1 text-[10px]">
              {itemCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-3">
        {lines.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Your cart is empty.</p>
        ) : (
          <>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.lineId} className="flex justify-between gap-2 text-sm">
                  <span className="line-clamp-1">
                    {l.quantity}× {l.name}
                  </span>
                  <span className="shrink-0 font-medium">{formatIDR(l.unitPrice * l.quantity)}</span>
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatIDR(subtotal)}</span>
            </div>
          </>
        )}
        <DropdownMenuItem asChild className="mt-3 p-0 focus:bg-transparent">
          <Link to="/cart" className={cn(buttonVariants({ variant: "default" }), "w-full")}>
            View Cart
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
