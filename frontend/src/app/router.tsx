import { createBrowserRouter, Navigate } from "react-router-dom"

import { FullscreenLoader } from "@/components/feedback/fullscreen-loader"
import { AppShell } from "@/components/layout/app-shell"

import { RootLayout } from "./root-layout"
import { GuestOnly, RequireAuth, RequireRole } from "./route-guards"
import { NotFoundPage, RouteErrorPage } from "./status-pages"

/** Lazy-load a page module's default export (one JS chunk per page). */
const page = (loader: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await loader()).default,
})

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <FullscreenLoader />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      /* ---------------- Public (guests only) ---------------- */
      {
        element: <GuestOnly />,
        children: [
          { path: "login", lazy: page(() => import("@/features/auth/pages/LoginPage")) },
          { path: "register", lazy: page(() => import("@/features/auth/pages/RegisterPage")) },
          { path: "forgot-password", lazy: page(() => import("@/features/auth/pages/ForgotPasswordPage")) },
        ],
      },
      // Reachable whether or not someone is signed in (opened from an email)
      { path: "reset-password", lazy: page(() => import("@/features/auth/pages/ResetPasswordPage")) },

      /* ---------------- Authenticated app ---------------- */
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: "dashboard",
                lazy: page(() => import("@/features/dashboard/pages/DashboardPage")),
                handle: { title: "Dashboard" },
              },
              {
                path: "sales/new",
                lazy: page(() => import("@/features/sales/pages/NewSalePage")),
                handle: { title: "New sale" },
              },
              {
                path: "sales",
                lazy: page(() => import("@/features/sales/pages/SalesPage")),
                handle: { title: "Sales" },
              },
              {
                path: "sales/:id",
                lazy: page(() => import("@/features/sales/pages/SaleDetailPage")),
                handle: { title: "Sale" },
              },
              {
                path: "customers",
                lazy: page(() => import("@/features/sales/pages/CustomersPage")),
                handle: { title: "Customers" },
              },
              {
                path: "products",
                lazy: page(() => import("@/features/catalog/pages/ProductsPage")),
                handle: { title: "Products" },
              },
              {
                path: "products/:id",
                lazy: page(() => import("@/features/catalog/pages/ProductDetailPage")),
                handle: { title: "Product" },
              },
              {
                path: "categories",
                lazy: page(() => import("@/features/catalog/pages/CategoriesPage")),
                handle: { title: "Categories" },
              },
              {
                path: "stock",
                lazy: page(() => import("@/features/inventory/pages/StockMovementsPage")),
                handle: { title: "Stock movements" },
              },
              {
                path: "notifications",
                lazy: page(() => import("@/features/notifications/pages/NotificationsPage")),
                handle: { title: "Notifications" },
              },
              {
                path: "profile",
                lazy: page(() => import("@/features/profile/pages/ProfilePage")),
                handle: { title: "Profile" },
              },
              {
                element: <RequireRole roles={["ADMIN"]} />,
                children: [
                  {
                    path: "team",
                    lazy: page(() => import("@/features/team/pages/TeamPage")),
                    handle: { title: "Team" },
                  },
                ],
              },
              { path: "*", element: <NotFoundPage />, handle: { title: "Not found" } },
            ],
          },
        ],
      },
    ],
  },
])
