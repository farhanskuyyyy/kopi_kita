import { Link } from "react-router-dom";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffSessionStore } from "@/features/auth/store/staffSessionStore";

/** Screen 27 — generic not-found for invalid routes/IDs (F-047). */
export function NotFoundPage() {
  const isStaff = useStaffSessionStore((s) => !!s.token);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Coffee className="h-14 w-14 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-3xl font-bold">404 — Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        We couldn't find what you were looking for. It may have been moved or no longer exists.
      </p>
      <Button asChild>
        <Link to={isStaff ? "/admin" : "/"}>{isStaff ? "Back to Admin Dashboard" : "Back to Home"}</Link>
      </Button>
    </div>
  );
}
