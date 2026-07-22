import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AccountLayout } from "@/layouts/AccountLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ProductGridSkeleton } from "@/components/feedback/Skeletons";
import {
  RequireCustomerAuth,
  RedirectIfCustomerAuthed,
  RequireStaffAuth,
  RedirectIfStaffAuthed,
  RequireStaffRole,
  RequireNonEmptyCart,
  RequireDetailsDraft,
  RequirePaymentDraft,
} from "@/lib/auth/guards";
import { NotFoundPage } from "@/features/not-found/pages/NotFoundPage";

/**
 * Central route config (Frontend-Architecture §1.2). Customer-facing routes (1–16) and
 * admin routes (17–26) are lazy-loaded as separate bundles (§1.5) via React.lazy + a
 * route-level Suspense boundary, reusing the existing skeleton primitives as fallback.
 */

// ----- Customer-facing bundle -----------------------------------------------
const HomePage = lazy(() => import("@/features/catalog/pages/HomePage").then((m) => ({ default: m.HomePage })));
const MenuPage = lazy(() => import("@/features/catalog/pages/MenuPage").then((m) => ({ default: m.MenuPage })));
const SearchPage = lazy(() => import("@/features/catalog/pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const ProductDetailPage = lazy(() =>
  import("@/features/catalog/pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })),
);
const CartPage = lazy(() => import("@/features/cart/pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutDetailsPage = lazy(() =>
  import("@/features/checkout/pages/CheckoutDetailsPage").then((m) => ({ default: m.CheckoutDetailsPage })),
);
const CheckoutPaymentPage = lazy(() =>
  import("@/features/checkout/pages/CheckoutPaymentPage").then((m) => ({ default: m.CheckoutPaymentPage })),
);
const CheckoutReviewPage = lazy(() =>
  import("@/features/checkout/pages/CheckoutReviewPage").then((m) => ({ default: m.CheckoutReviewPage })),
);
const OrderConfirmationPage = lazy(() =>
  import("@/features/orders/pages/OrderConfirmationPage").then((m) => ({ default: m.OrderConfirmationPage })),
);
const OrderTrackingPage = lazy(() =>
  import("@/features/orders/pages/OrderTrackingPage").then((m) => ({ default: m.OrderTrackingPage })),
);
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const AccountHomePage = lazy(() =>
  import("@/features/account/pages/AccountHomePage").then((m) => ({ default: m.AccountHomePage })),
);
const OrderHistoryPage = lazy(() =>
  import("@/features/account/pages/OrderHistoryPage").then((m) => ({ default: m.OrderHistoryPage })),
);
const FavoritesPage = lazy(() => import("@/features/account/pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const StoreInfoPage = lazy(() => import("@/features/store-info/pages/StoreInfoPage").then((m) => ({ default: m.StoreInfoPage })));

// ----- Admin bundle ----------------------------------------------------------
const AdminLoginPage = lazy(() => import("@/features/auth/pages/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() =>
  import("@/features/admin-dashboard/pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminProductListPage = lazy(() =>
  import("@/features/admin-catalog/pages/AdminProductListPage").then((m) => ({ default: m.AdminProductListPage })),
);
const AdminProductCreatePage = lazy(() =>
  import("@/features/admin-catalog/pages/AdminProductCreatePage").then((m) => ({ default: m.AdminProductCreatePage })),
);
const AdminProductEditPage = lazy(() =>
  import("@/features/admin-catalog/pages/AdminProductEditPage").then((m) => ({ default: m.AdminProductEditPage })),
);
const AdminCategoryListPage = lazy(() =>
  import("@/features/admin-catalog/pages/AdminCategoryListPage").then((m) => ({ default: m.AdminCategoryListPage })),
);
const AdminCategoryCreatePage = lazy(() =>
  import("@/features/admin-catalog/pages/AdminCategoryCreatePage").then((m) => ({ default: m.AdminCategoryCreatePage })),
);
const AdminCategoryEditPage = lazy(() =>
  import("@/features/admin-catalog/pages/AdminCategoryEditPage").then((m) => ({ default: m.AdminCategoryEditPage })),
);
const AdminOrderListPage = lazy(() =>
  import("@/features/admin-fulfillment/pages/AdminOrderListPage").then((m) => ({ default: m.AdminOrderListPage })),
);
const AdminOrderDetailPage = lazy(() =>
  import("@/features/admin-fulfillment/pages/AdminOrderDetailPage").then((m) => ({ default: m.AdminOrderDetailPage })),
);

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<ProductGridSkeleton />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: withSuspense(<HomePage />) },
      { path: "/menu", element: withSuspense(<MenuPage />) },
      { path: "/menu/:categorySlug", element: withSuspense(<MenuPage />) },
      { path: "/search", element: withSuspense(<SearchPage />) },
      { path: "/product/:productId", element: withSuspense(<ProductDetailPage />) },
      { path: "/cart", element: withSuspense(<CartPage />) },
      {
        element: <RequireNonEmptyCart />,
        children: [
          { path: "/checkout/details", element: withSuspense(<CheckoutDetailsPage />) },
          {
            element: <RequireDetailsDraft />,
            children: [
              { path: "/checkout/payment", element: withSuspense(<CheckoutPaymentPage />) },
              {
                element: <RequirePaymentDraft />,
                children: [{ path: "/checkout/review", element: withSuspense(<CheckoutReviewPage />) }],
              },
            ],
          },
        ],
      },
      { path: "/order/confirmation/:orderId", element: withSuspense(<OrderConfirmationPage />) },
      { path: "/orders/:orderId/track", element: withSuspense(<OrderTrackingPage />) },
      { path: "/store-info", element: withSuspense(<StoreInfoPage />) },
      {
        element: <RequireCustomerAuth />,
        children: [
          {
            element: <AccountLayout />,
            children: [
              { path: "/account", element: withSuspense(<AccountHomePage />) },
              { path: "/account/orders", element: withSuspense(<OrderHistoryPage />) },
              { path: "/account/favorites", element: withSuspense(<FavoritesPage />) },
            ],
          },
        ],
      },
    ],
  },
  // Screen 27 — Not Found: "Public (bare)" shell per Frontend-Architecture §1.2, i.e. not
  // wrapped in the full PublicLayout header/footer chrome.
  { path: "/404", element: <NotFoundPage /> },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <RedirectIfCustomerAuthed />,
        children: [
          { path: "/login", element: withSuspense(<LoginPage />) },
          { path: "/register", element: withSuspense(<RegisterPage />) },
        ],
      },
      {
        element: <RedirectIfStaffAuthed />,
        children: [{ path: "/admin/login", element: withSuspense(<AdminLoginPage />) }],
      },
    ],
  },
  {
    element: <RequireStaffAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "/admin", element: withSuspense(<AdminDashboardPage />) },
          {
            element: <RequireStaffRole role="catalog-admin" />,
            children: [
              { path: "/admin/products", element: withSuspense(<AdminProductListPage />) },
              { path: "/admin/products/new", element: withSuspense(<AdminProductCreatePage />) },
              { path: "/admin/products/:productId/edit", element: withSuspense(<AdminProductEditPage />) },
              { path: "/admin/categories", element: withSuspense(<AdminCategoryListPage />) },
              { path: "/admin/categories/new", element: withSuspense(<AdminCategoryCreatePage />) },
              { path: "/admin/categories/:categoryId/edit", element: withSuspense(<AdminCategoryEditPage />) },
            ],
          },
          {
            element: <RequireStaffRole role="fulfillment-staff" />,
            children: [
              { path: "/admin/orders", element: withSuspense(<AdminOrderListPage />) },
              { path: "/admin/orders/:orderId", element: withSuspense(<AdminOrderDetailPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/404" replace /> },
]);
