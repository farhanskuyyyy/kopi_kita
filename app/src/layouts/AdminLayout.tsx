import { Outlet } from "react-router-dom";
import { SideNav } from "@/components/layout/SideNav";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
