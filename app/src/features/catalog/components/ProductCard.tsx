import { Link } from "react-router-dom";
import { Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format/currency";
import type { Product } from "../schemas/catalog.schemas";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.id}`} className="group">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Coffee className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {!product.available && (
            <Badge variant="secondary" className="absolute left-2 top-2">
              Out of stock
            </Badge>
          )}
        </div>
        <CardContent className="space-y-1 p-3">
          <p className="line-clamp-1 font-medium">{product.name}</p>
          <p className="text-sm text-muted-foreground">{formatIDR(product.basePrice)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
