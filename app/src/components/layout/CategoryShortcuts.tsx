import { Link } from "react-router-dom";
import { useCategories } from "@/features/catalog/hooks/useCatalog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";

/** Category shortcut tiles/links (spec Screen 1, §3.8) — used on Home and in the header nav. */
export function CategoryShortcuts({ variant = "tiles" }: { variant?: "tiles" | "nav" }) {
  const { data, isLoading, isError, refetch } = useCategories();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorBanner message="Couldn't load categories." onRetry={() => refetch()} />;
  }

  if (variant === "nav") {
    return (
      <nav aria-label="Categories" className="flex gap-4 overflow-x-auto text-sm">
        {data?.map((c) => (
          <Link key={c.id} to={`/menu/${c.slug}`} className="whitespace-nowrap text-muted-foreground hover:text-foreground">
            {c.name}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {data?.map((c) => (
        <Link
          key={c.id}
          to={`/menu/${c.slug}`}
          className="rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
