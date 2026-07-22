import { Link } from "react-router-dom";
import { Heart, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ProductGridSkeleton } from "@/components/feedback/Skeletons";
import { useFavorites, useRemoveFavorite } from "../hooks/useAccount";
import { useCartStore } from "@/features/cart/store/cartStore";
import { formatIDR } from "@/lib/format/currency";
import { toast } from "@/lib/toast";

/** Screen 15 — Favorites / Wishlist (F-022). */
export function FavoritesPage() {
  const favoritesQuery = useFavorites();
  const removeFavorite = useRemoveFavorite();
  const addLine = useCartStore((s) => s.addLine);

  if (favoritesQuery.isLoading) return <ProductGridSkeleton count={4} />;

  if (favoritesQuery.isError) {
    return <ErrorBanner message="Couldn't load your favorites." onRetry={() => favoritesQuery.refetch()} />;
  }

  const favorites = favoritesQuery.data ?? [];

  if (favorites.length === 0) {
    return <EmptyState icon={Heart} title="No favorites yet" description="Save products for quick reorder." ctaLabel="Browse menu" ctaHref="/menu" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Favorites</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {favorites.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <Link to={`/product/${product.id}`} className="relative block aspect-square bg-muted">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Coffee className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              {(!product.available || product.isDeleted) && (
                <Badge variant="secondary" className="absolute left-2 top-2">
                  Unavailable
                </Badge>
              )}
            </Link>
            <CardContent className="space-y-2 p-3">
              <Link to={`/product/${product.id}`} className="line-clamp-1 font-medium hover:underline">
                {product.name}
              </Link>
              <p className="text-sm text-muted-foreground">{formatIDR(product.basePrice)}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!product.available || product.isDeleted}
                  onClick={() => {
                    addLine({
                      productId: product.id,
                      name: product.name,
                      image: product.image,
                      customizationSummary: null,
                      selectedOptionIds: [],
                      unitPrice: product.basePrice,
                      quantity: 1,
                    });
                    toast.success("Added to cart");
                  }}
                >
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Remove favorite"
                  onClick={() => removeFavorite.mutate(product.id)}
                >
                  <Heart className="h-4 w-4 fill-current text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
