import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="container flex-1 py-6">
        <Outlet />
      </main>
      <footer className="border-t bg-card py-6 text-sm text-muted-foreground">
        <div className="container flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Kopi Kita. All rights reserved.</p>
          <p>A clickable demo — no real orders are processed.</p>
        </div>
      </footer>
    </div>
  );
}
