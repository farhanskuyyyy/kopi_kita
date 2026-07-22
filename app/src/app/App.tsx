import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { QueryProvider } from "./providers/QueryProvider";
import { AppErrorBoundary } from "./providers/AppErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

export function App() {
  return (
    <AppErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
        <Toaster />
      </QueryProvider>
    </AppErrorBoundary>
  );
}
