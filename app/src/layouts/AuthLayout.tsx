import { Link, Outlet } from "react-router-dom";
import { Coffee } from "lucide-react";

/** Minimal centered-card shell for /login, /register, /admin/login — no nav clutter. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 text-xl font-bold text-primary">
        <Coffee className="h-7 w-7" aria-hidden="true" />
        Kopi Kita
      </Link>
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <Outlet />
      </div>
    </div>
  );
}
