import { MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useStoreInfo } from "../hooks/useStoreInfo";

/** Screen 16 — Store Info (F-023). */
export function StoreInfoPage() {
  const { data, isLoading, isError, refetch } = useStoreInfo();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorBanner message="Couldn't load store info." onRetry={() => refetch()} />;
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Store Info</h1>
        <Card>
          <CardContent className="space-y-2 p-4">
            {data.hours.map((h) => (
              <div key={h.day} className="flex justify-between text-sm">
                <span className="font-medium">{h.day}</span>
                <span className="text-muted-foreground">
                  {h.openTime} – {h.closeTime}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{data.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:${data.phone}`} className="hover:underline">
                {data.phone}
              </a>
            </div>
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(data.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get directions
                </a>
              </Button>
              <Button asChild size="sm">
                <a href={`tel:${data.phone}`}>Call</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground md:aspect-auto">
        {data.mapPlaceholderUrl ? (
          <img src={data.mapPlaceholderUrl} alt="Store location map" className="h-full w-full rounded-lg object-cover" />
        ) : (
          "Map placeholder"
        )}
      </div>
    </div>
  );
}
