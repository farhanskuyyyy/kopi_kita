import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CategoryShortcuts } from "@/components/layout/CategoryShortcuts";
import { ProductGrid } from "../components/ProductGrid";
import { ProductGridSkeleton } from "@/components/feedback/Skeletons";
import { useProducts } from "../hooks/useCatalog";
import { toast } from "@/lib/toast";
import { useEffect, useRef } from "react";

/** Screen 1 — Home / Landing (F-001 entry point). */
export function HomePage() {
  const { data, isLoading, isError, refetch } = useProducts({ tags: ["featured"], limit: 8 });
  const toasted = useRef(false);

  useEffect(() => {
    if (isError && !toasted.current) {
      toasted.current = true;
      toast.error("Couldn't load featured products.");
    }
  }, [isError]);

  return (
    <div className="space-y-10">
      <section className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/40 px-6 py-12 text-center sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Freshly brewed, made your way</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Browse our menu, customize your favorites, and pick up, dine in, or get it delivered.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/menu">Browse Menu</Link>
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Shop by Category</h2>
        <CategoryShortcuts variant="tiles" />
      </section>

      {(isLoading || (!isError && (data?.items.length ?? 0) > 0)) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Featured</h2>
          {isLoading ? <ProductGridSkeleton /> : <ProductGrid products={data?.items ?? []} />}
        </section>
      )}
    </div>
  );
}
