import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import PublicLayout from "../layouts/PublicLayout";

import AdminHomeRedirect from "../routes/AdminHomeRedirect";
import RequireAuth from "../routes/RequireAuth";
import RequirePermission from "../routes/RequirePermission";
import RequireRole from "../routes/RequireRole";
import {
  ADMIN_ONLY_ROLES,
  DASHBOARD_ROLES,
} from "../utils/adminAccess";



import LoginPage from "../pages/admin/LoginPage";

const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const HomePage = lazy(() => import("../pages/public/HomePage"));
const AboutPage = lazy(() => import("../pages/public/AboutPage"));
const ServicesPage = lazy(() => import("../pages/public/ServicesPage"));
const CatalogPage = lazy(() => import("../pages/public/CatalogPage"));
const ProductDetailPage = lazy(() => import("../pages/public/ProductDetailPage"));
const ReadingPlanPage = lazy(() => import("../pages/public/ReadingPlanPage"));
const ContactPage = lazy(() => import("../pages/public/ContactPage"));
const ClassificationsPage = lazy(() => import("../pages/admin/ClassificationsPage"));
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const ProductsPage = lazy(() => import("../pages/admin/ProductsPage"));
const ProductCreatePage = lazy(() => import("../pages/admin/ProductCreatePage"));
const ProductEditPage = lazy(() => import("../pages/admin/ProductEditPage"));
const PricesPage = lazy(() => import("../pages/admin/PricesPage"));
const ProvidersPage = lazy(() => import("../pages/admin/ProvidersPage"));
const ContactRequestsPage = lazy(() => import("../pages/admin/ContactRequestsPage"));
const ImportsPage = lazy(() => import("../pages/admin/ImportsPage"));
const UsersPage = lazy(() => import("../pages/admin/UsersPage"));
const NotificationsPage = lazy(() => import("../pages/admin/NotificationsPage"));
const UserPermissionsPage = lazy(() => import("../pages/admin/UserPermissionsPage"));
const WorkspaceTodoPage = lazy(() => import("../pages/admin/workspace/WorkspaceTodoPage"));
const WorkspaceTasksPage = lazy(() => import("../pages/admin/workspace/WorkspaceTasksPage"));
const WorkspaceRemindersPage = lazy(() => import("../pages/admin/workspace/WorkspaceRemindersPage"));
const WorkspaceCalendarPage = lazy(() => import("../pages/admin/workspace/WorkspaceCalendarPage"));
const WorkspaceGroupsPage = lazy(() => import("../pages/admin/workspace/WorkspaceGroupsPage"));
const WorkspaceTaskListsPage = lazy(() => import("../pages/admin/workspace/WorkspaceTaskListsPage"));

const ERPPedidosPage = lazy(() => import("../pages/admin/erp/ERPPedidosPage"));
const ERPRecepcionPage = lazy(() => import("../pages/admin/erp/ERPRecepcionPage"));

const CRMSummaryPage = lazy(
  () => import("../pages/admin/crm/CRMSummaryPage"),
);

const CRMReportsPage = lazy(
  () => import("../pages/admin/crm/CRMReportsPage"),
);

const CRMContactsPage = lazy(
  () => import("../pages/admin/crm/CRMContactsPage"),
);

const CRMContactDetailPage = lazy(
  () => import("../pages/admin/crm/CRMContactDetailPage"),
);

const CRMSchoolsPage = lazy(
  () => import("../pages/admin/crm/CRMSchoolsPage"),
);

const CRMSchoolDetailPage = lazy(
  () => import("../pages/admin/crm/CRMSchoolDetailPage"),
);

const CRMCommercialTeamsPage = lazy(
  () => import("../pages/admin/crm/CRMCommercialTeamsPage"),
);

const CRMSchoolImportsPage = lazy(
  () => import("../pages/admin/crm/CRMSchoolImportsPage"),
);

const CRMOpportunitiesPage = lazy(
  () => import("../pages/admin/crm/CRMOpportunitiesPage"),
);

const CRMOpportunityDetailPage = lazy(
  () => import("../pages/admin/crm/CRMOpportunityDetailPage"),
);

const CRMQuotationPrintPage = lazy(
  () => import("../pages/admin/crm/CRMQuotationPrintPage"),
);

const CRMAdoptionPrintPage = lazy(
  () => import("../pages/admin/crm/CRMAdoptionPrintPage"),
);

const CRMOpportunityHistoryPrintPage = lazy(
  () => import("../pages/admin/crm/CRMOpportunityHistoryPrintPage"),
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

function renderLazyPage(Component, props = {}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[45vh] items-center justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-600 shadow-sm">
            Cargando contenido...
          </div>
        </div>
      }
    >
      <Component {...props} />
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
        element: renderLazyPage(HomePage),
      },
      {
        path: "nosotros",
        element: renderLazyPage(AboutPage),
      },
      {
        path: "servicios",
        element: renderLazyPage(ServicesPage),
      },
      {
        path: "catalogo",
        element: renderLazyPage(CatalogPage),
      },
      {
        path: "catalogo/:slug",
        element: renderLazyPage(ProductDetailPage),
      },
      {
        path: "plan-lector",
        element: renderLazyPage(ReadingPlanPage),
      },
      {
        path: "contacto",
        element: renderLazyPage(ContactPage),
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
        path: "crm/oportunidades/:opportunityId/cotizaciones/:quotationId/imprimir",
        element: protectPermission(
          renderLazyPage(CRMQuotationPrintPage),
          ["crm.view_crm"],
        ),
      },
      {
        path: "crm/oportunidades/:opportunityId/adopciones/:adoptionId/imprimir",
        element: protectPermission(
          renderLazyPage(CRMAdoptionPrintPage),
          ["crm.view_crm"],
        ),
      },
      {
        path: "crm/oportunidades/:opportunityId/historial/imprimir",
        element: protectPermission(
          renderLazyPage(CRMOpportunityHistoryPrintPage),
          ["crm.view_crm"],
        ),
      },
      {
        element: renderLazyPage(AdminLayout),
        children: [
          {
            index: true,
            element: <AdminHomeRedirect />,
          },
          {
            path: "dashboard",
            element: protectRole(renderLazyPage(DashboardPage), DASHBOARD_ROLES),
          },
          {
            path: "erp/compras/pedidos",
            element: protectPermission(
              renderLazyPage(ERPPedidosPage),
              ["purchasing.view_purchasing"],
            ),
          },
          {
            path: "erp/almacen/recepciones",
            element: protectPermission(
              renderLazyPage(ERPRecepcionPage),
              ["warehouse.view_receiving"],
            ),
          },
          {
            path: "crm",
            element: protectPermission(
              renderLazyPage(CRMSummaryPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "crm/reportes",
            element: protectPermission(
              renderLazyPage(CRMReportsPage),
              ["crm.supervise_crm"],
            ),
          },
          {
            path: "crm/contactos",
            element: protectPermission(
              renderLazyPage(CRMContactsPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "crm/contactos/:id",
            element: protectPermission(
              renderLazyPage(CRMContactDetailPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "crm/colegios",
            element: protectPermission(
              renderLazyPage(CRMSchoolsPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "crm/colegios/:id",
            element: protectPermission(
              renderLazyPage(CRMSchoolDetailPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "crm/equipos",
            element: protectPermission(
              renderLazyPage(CRMCommercialTeamsPage),
              ["crm.assign_schools"],
            ),
          },
          {
            path: "crm/colegios/importar",
            element: protectPermission(
              renderLazyPage(CRMSchoolImportsPage),
              ["crm.assign_schools"],
            ),
          },
          {
            path: "crm/oportunidades",
            element: protectPermission(
              renderLazyPage(CRMOpportunitiesPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "crm/oportunidades/:id",
            element: protectPermission(
              renderLazyPage(CRMOpportunityDetailPage),
              ["crm.view_crm"],
            ),
          },
          {
            path: "workspace",
            element: protectPermission(
              renderLazyPage(WorkspaceTodoPage, { view: "today" }),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/important",
            element: protectPermission(
              renderLazyPage(WorkspaceTodoPage, { view: "important" }),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/planned",
            element: protectPermission(
              renderLazyPage(WorkspaceTodoPage, { view: "planned" }),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/assigned",
            element: protectPermission(
              renderLazyPage(WorkspaceTodoPage, { view: "assigned" }),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/all",
            element: protectPermission(
              renderLazyPage(WorkspaceTodoPage, { view: "all" }),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/lists",
            element: protectPermission(
              renderLazyPage(WorkspaceTaskListsPage),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/lists/:listId",
            element: protectPermission(
              renderLazyPage(WorkspaceTodoPage, { view: "list" }),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/tasks",
            element: protectPermission(
              renderLazyPage(WorkspaceTasksPage),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/reminders",
            element: protectPermission(
              renderLazyPage(WorkspaceRemindersPage),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/calendar",
            element: protectPermission(
              renderLazyPage(WorkspaceCalendarPage),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "workspace/groups",
            element: protectPermission(
              renderLazyPage(WorkspaceGroupsPage),
              ["workspaces.use_workspace"],
            ),
          },
          {
            path: "productos",
            element: protectPermission(
              renderLazyPage(ProductsPage),
              ["catalog.view_catalog"],
            ),
          },
          {
            path: "productos/crear",
            element: protectPermission(
              renderLazyPage(ProductCreatePage),
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "productos/:id/editar",
            element: protectPermission(
              renderLazyPage(ProductEditPage),
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "precios",
            element: protectPermission(
              renderLazyPage(PricesPage),
              ["catalog.view_prices"],
            ),
          },
          {
            path: "proveedores",
            element: protectPermission(
              renderLazyPage(ProvidersPage),
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "clasificaciones",
            element: protectPermission(
              renderLazyPage(ClassificationsPage),
              ["catalog.manage_catalog"],
            ),
          },
          {
            path: "solicitudes",
            element: protectPermission(
              renderLazyPage(ContactRequestsPage),
              ["inquiries.view_inquiries"],
            ),
          },
          {
            path: "importaciones",
            element: protectPermission(
              renderLazyPage(ImportsPage),
              ["catalog.manage_imports"],
            ),
          },
          {
            path: "notificaciones",
            element: renderLazyPage(NotificationsPage),
          },
          {
            path: "usuarios",
            element: protectRole(renderLazyPage(UsersPage), ADMIN_ONLY_ROLES),
          },
          {
            path: "usuarios/:id/permisos",
            element: protectRole(
              renderLazyPage(UserPermissionsPage),
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
