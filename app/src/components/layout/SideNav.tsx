import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Tags, ClipboardList, LogOut, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffSessionStore } from "@/features/auth/store/staffSessionStore";
import { useLogoutStaff } from "@/features/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";

/** Role-scoped admin side nav (Frontend-Architecture §1.1, spec §3.2). */
export function SideNav() {
  const staffUser = useStaffSessionStore((s) => s.staffUser);
  const logout = useLogoutStaff();
  const navigate = useNavigate();

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["catalog-admin", "fulfillment-staff"] },
    { to: "/admin/products", label: "Products", icon: Package, roles: ["catalog-admin"] },
    { to: "/admin/categories", label: "Categories", icon: Tags, roles: ["catalog-admin"] },
    { to: "/admin/orders", label: "Orders", icon: ClipboardList, roles: ["fulfillment-staff"] },
  ].filter((item) => !staffUser || item.roles.includes(staffUser.role));

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col border-r bg-card p-4">
      <div className="mb-6 flex items-center gap-2 text-lg font-bold text-primary">
        <Coffee className="h-6 w-6" aria-hidden="true" />
        Kopi Kita Admin
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                isActive && "bg-accent text-accent-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </div>
      {staffUser && (
        <div className="mt-auto space-y-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{staffUser.name}</span>
          </p>
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/admin/login") })}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
