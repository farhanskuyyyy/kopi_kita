import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Coffee, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryShortcuts } from "./CategoryShortcuts";
import { MiniCart } from "./MiniCart";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/** Global header (spec §3.8): logo/Home, category shortcuts, debounced search, cart, account. */
export function Header() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const customer = useCustomerSessionStore((s) => s.user);

  function handleSearchChange(value: string) {
    setQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (value.trim().length > 0) navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }, 300);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex flex-col gap-3 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <Coffee className="h-6 w-6" aria-hidden="true" />
            Kopi Kita
          </Link>

          <form
            role="search"
            className="relative ml-2 hidden max-w-sm flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search the menu..."
              aria-label="Search products"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" aria-label={customer ? "Account" : "Log in"}>
              <Link to={customer ? "/account" : "/login"}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
            <MiniCart />
          </div>
        </div>

        <form
          role="search"
          className="relative sm:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search the menu..."
            aria-label="Search products"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </form>

        <CategoryShortcuts variant="nav" />
      </div>
    </header>
  );
}
