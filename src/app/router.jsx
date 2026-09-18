import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";
import AdminHomeRedirect from "../routes/AdminHomeRedirect";
import RequireAuth from "../routes/RequireAuth";
import RequirePermission from "../routes/RequirePermission";
import RequireRole from "../routes/RequireRole";
import {
  ADMIN_ONLY_ROLES,
  DASHBOARD_ROLES,
} from "../utils/adminAccess";

import HomePage from "../pages/public/HomePage";
import AboutPage from "../pages/public/AboutPage";
import ServicesPage from "../pages/public/ServicesPage";
import CatalogPage from "../pages/public/CatalogPage";
import ProductDetailPage from "../pages/public/ProductDetailPage";
import ReadingPlanPage from "../pages/public/ReadingPlanPage";
import ContactPage from "../pages/public/ContactPage";

import ClassificationsPage from "../pages/admin/ClassificationsPage";
import LoginPage from "../pages/admin/LoginPage";
import DashboardPage from "../pages/admin/DashboardPage";
import ProductsPage from "../pages/admin/ProductsPage";
import ProductCreatePage from "../pages/admin/ProductCreatePage";
import ProductEditPage from "../pages/admin/ProductEditPage";
import PricesPage from "../pages/admin/PricesPage";
import ProvidersPage from "../pages/admin/ProvidersPage";
import ContactRequestsPage from "../pages/admin/ContactRequestsPage";
import ImportsPage from "../pages/admin/ImportsPage";
import UsersPage from "../pages/admin/UsersPage";
import NotificationsPage from "../pages/admin/NotificationsPage";
import UserPermissionsPage from "../pages/admin/UserPermissionsPage";
import WorkspaceSummaryPage from "../pages/admin/workspace/WorkspaceSummaryPage";
import WorkspaceTasksPage from "../pages/admin/workspace/WorkspaceTasksPage";
import WorkspaceRemindersPage from "../pages/admin/workspace/WorkspaceRemindersPage";
import WorkspaceCalendarPage from "../pages/admin/workspace/WorkspaceCalendarPage";
import WorkspaceGroupsPage from "../pages/admin/workspace/WorkspaceGroupsPage";

const CRMSummaryPage = lazy(
  () => import("../pages/admin/crm/CRMSummaryPage"),
);

function protectRole(element, allowedRoles) {
  return <RequireRole allowedRoles={allowedRoles}>{element}</RequireRole>;
}

function protectPermission(element, requiredPermissions) {
  return (
    <RequirePermission requiredPermissions={requiredPermissions}>
      {element}
    </RequirePermission>
  );
}

function renderLazyPage(Component) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[45vh] items-center justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-600 shadow-sm">
            Cargando módulo...
          </div>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "nosotros",
        element: <AboutPage />,
      },
      {
        path: "servicios",
        element: <ServicesPage />,
      },
      {
        path: "catalogo",
        element: <CatalogPage />,
      },
      {
        path: "catalogo/:slug",
        element: <ProductDetailPage />,
      },
      {
        path: "plan-lector",
        element: <ReadingPlanPage />,
      },
      {
        path: "contacto",
        element: <ContactPage />,
      },
    ],
  },
  {
    path: "/admin/login",
    element: <LoginPage />,
  },
  {
    path: "/admin",
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminHomeRedirect />,
          },
          {
            path: "dashboard",
            element: protectRole(<DashboardPage />, DASHBOARD_ROLES),
          },
          {
            path: "crm",
            element: protectPermission(
              renderLazyPage(CRMSummaryPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "workspace",
            element: protectPermission(
              <WorkspaceSummaryPage />,
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/tasks",
            element: protectPermission(
              <WorkspaceTasksPage />,
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/reminders",
            element: protectPermission(
              <WorkspaceRemindersPage />,
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/calendar",
            element: protectPermission(
              <WorkspaceCalendarPage />,
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/groups",
            element: protectPermission(
              <WorkspaceGroupsPage />,
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "productos",
            element: protectPermission(
              <ProductsPage />,
              ["catalog.view_catalog"],
            ),
          },
          {
            path: "productos/crear",
            element: protectPermission(
              <ProductCreatePage />,
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "productos/:id/editar",
            element: protectPermission(
              <ProductEditPage />,
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "precios",
            element: protectPermission(
              <PricesPage />,
              ["catalog.view_prices"],
            ),
          },
          {
            path: "proveedores",
            element: protectPermission(
              <ProvidersPage />,
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "clasificaciones",
            element: protectPermission(
              <ClassificationsPage />,
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "solicitudes",
            element: protectPermission(
              <ContactRequestsPage />,
              ["inquiries.view_inquiries"],
            ),
          },
          {
            path: "importaciones",
            element: protectPermission(
              <ImportsPage />,
              ["catalog.manage_imports"],
            ),
          },
          {
            path: "notificaciones",
            element: <NotificationsPage />,
          },
          {
            path: "usuarios",
            element: protectRole(<UsersPage />, ADMIN_ONLY_ROLES),
          },
          {
            path: "usuarios/:id/permisos",
            element: protectRole(
              <UserPermissionsPage />,
              ADMIN_ONLY_ROLES,
            ),
          },
        ],
      },
    ],
  },
]);


export default function AppRouter() {
  return <RouterProvider router={router} />;
}
