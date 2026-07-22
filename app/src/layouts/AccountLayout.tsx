import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Nested inside PublicLayout; adds a secondary account sub-nav (Profile / Orders / Favorites). */
export function AccountLayout() {
  const tabs = [
    { to: "/account", label: "Profile", end: true },
    { to: "/account/orders", label: "Order History", end: false },
    { to: "/account/favorites", label: "Favorites", end: false },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <nav aria-label="Account" className="flex gap-2 md:flex-col">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                isActive && "bg-accent text-accent-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
