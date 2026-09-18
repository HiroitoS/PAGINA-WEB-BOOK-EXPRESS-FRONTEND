import { useEffect, useState } from "react";
import {
  FaBars,
  FaBell,
  FaBookOpen,
  FaBoxOpen,
  FaBriefcase,
  FaChartLine,
  FaChevronDown,
  FaClipboardList,
  FaComments,
  FaFileExcel,
  FaLayerGroup,
  FaSchool,
  FaTags,
  FaTasks,
  FaThLarge,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "../components/admin/NotificationBell";
import {
  ADMIN_ONLY_ROLES,
  DASHBOARD_ROLES,
  getDefaultAdminPath,
  getPrimaryRole,
  userHasPermission,
  userHasRole,
} from "../utils/adminAccess";

import logoBookExpress from "../assets/brand/logo-book-express-negro-recortado.png";

const NAV_SECTIONS = [
  {
    type: "group",
    label: "Gestión web",
    icon: <FaLayerGroup />,
    children: [
      {
        label: "Dashboard",
        to: "/admin/dashboard",
        icon: <FaThLarge />,
        roles: DASHBOARD_ROLES,
      },
      {
        label: "Productos",
        to: "/admin/productos",
        icon: <FaBoxOpen />,
        permissions: ["catalog.view_catalog"],
      },
      {
        label: "Precios",
        to: "/admin/precios",
        icon: <FaTags />,
        permissions: ["catalog.view_prices"],
      },
      {
        label: "Editoriales",
        to: "/admin/proveedores",
        icon: <FaBookOpen />,
        permissions: ["catalog.manage_catalog"],
      },
      {
        label: "Clasificaciones",
        to: "/admin/clasificaciones",
        icon: <FaLayerGroup />,
        permissions: ["catalog.manage_catalog"],
      },
      {
        label: "Solicitudes",
        to: "/admin/solicitudes",
        icon: <FaComments />,
        permissions: ["inquiries.view_inquiries"],
      },
      {
        label: "Importaciones Excel",
        to: "/admin/importaciones",
        icon: <FaFileExcel />,
        permissions: ["catalog.manage_imports"],
      },
      {
        label: "Usuarios",
        to: "/admin/usuarios",
        icon: <FaUsers />,
        roles: ADMIN_ONLY_ROLES,
      },
    ],
  },
  {
    type: "group",
    label: "ToDo",
    icon: <FaTasks />,
    permissions: ["workspaces.use_workspace"],
    children: [
      {
        label: "Resumen",
        to: "/admin/workspace",
        icon: <FaClipboardList />,
        permissions: ["workspaces.use_workspace"],
      },
      {
        label: "Tareas",
        to: "/admin/workspace/tasks",
        icon: <FaTasks />,
        permissions: ["workspaces.use_workspace"],
      },
      {
        label: "Recordatorios",
        to: "/admin/workspace/reminders",
        icon: <FaBell />,
        permissions: ["workspaces.use_workspace"],
      },
      {
        label: "Calendario",
        to: "/admin/workspace/calendar",
        icon: <FaBookOpen />,
        permissions: ["workspaces.use_workspace"],
      },
      {
        label: "Grupos de trabajo",
        to: "/admin/workspace/groups",
        icon: <FaUsers />,
        permissions: ["workspaces.use_workspace"],
      },
    ],
  },
  {
    type: "group",
    label: "CRM",
    icon: <FaBriefcase />,
    permissions: ["crm.view_crm"],
    children: [
      {
        label: "Resumen",
        to: "/admin/crm",
        icon: <FaChartLine />,
        permissions: ["crm.view_crm"],
      },
      {
        label: "Colegios",
        to: "/admin/crm/colegios",
        icon: <FaSchool />,
        permissions: ["crm.view_crm"],
    },
    ],
  },
];

function userCanSeeEntry(user, entry) {
  if (user?.is_superuser) return true;

  if (entry.permissions?.length) {
    return userHasPermission(user, entry.permissions);
  }

  if (entry.roles?.length) {
    return userHasRole(user, entry.roles);
  }

  return false;
}

function sectionIsActive(section, pathname) {
  if (section.type !== "group") return false;

  return section.children.some((item) => {
    if (
      item.to === "/admin/workspace"
      || item.to === "/admin/dashboard"
      || item.to === "/admin/crm"
    ) {
      return pathname === item.to;
    }

    return pathname.startsWith(item.to);
  });
}

function childNavClass({ isActive }) {
  return isActive
    ? "flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-950 shadow-sm"
    : "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-400 transition hover:bg-white/10 hover:text-white";
}

function SidebarContent({
  location,
  openSection,
  user,
  onCloseMenu,
  onToggleSection,
}) {
  const visibleSections = NAV_SECTIONS.filter((section) =>
    section.children.some((item) => userCanSeeEntry(user, item)),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <Link
            className="block"
            to={getDefaultAdminPath(user)}
            onClick={onCloseMenu}
          >
            <img
              alt="Book Express"
              className="h-14 w-auto object-contain"
              src={logoBookExpress}
            />
            <p className="mt-3 text-xs font-semibold text-gray-400">
              Panel administrativo
            </p>
          </Link>

          <button
            aria-label="Cerrar menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
            type="button"
            onClick={onCloseMenu}
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {visibleSections.map((section) => {
          const isOpen = openSection === section.label;
          const isActive = sectionIsActive(section, location.pathname);
          const visibleChildren = section.children.filter((item) =>
            userCanSeeEntry(user, item),
          );

          if (visibleChildren.length === 0) return null;

          return (
            <div key={section.label} className="space-y-2">
              <button
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  isActive
                    ? "bg-red-700 text-white shadow-sm"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => onToggleSection(section.label)}
              >
                <span className="flex items-center gap-3">
                  <span className="text-sm">{section.icon}</span>
                  <span>{section.label}</span>
                </span>

                <FaChevronDown
                  className={`text-xs transition ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-300 ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
                    {visibleChildren.map((item) => (
                      <NavLink
                        key={item.to}
                        className={childNavClass}
                        end={
                          item.to === "/admin/workspace"
                          || item.to === "/admin/dashboard"
                          || item.to === "/admin/crm"
                        }
                        to={item.to}
                        onClick={onCloseMenu}
                      >
                        <span className="text-xs">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 bg-gray-950 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Rol activo
        </p>
        <p className="mt-1 text-sm font-black text-white">
          {getPrimaryRole(user)}
        </p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await logout();
    navigate("/admin/login");
  }

  function toggleSection(label) {
    setOpenSection((currentSection) =>
      currentSection === label ? null : label,
    );
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-72 bg-gray-950 text-white lg:block">
        <SidebarContent
          location={location}
          openSection={openSection}
          user={user}
          onCloseMenu={() => {}}
          onToggleSection={toggleSection}
        />
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/50"
            type="button"
            onClick={closeMobileMenu}
          />

          <aside className="relative h-full w-80 max-w-[88vw] bg-gray-950 text-white shadow-2xl">
            <SidebarContent
              location={location}
              openSection={openSection}
              user={user}
              onCloseMenu={closeMobileMenu}
              onToggleSection={toggleSection}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 lg:px-6 lg:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                aria-label="Abrir menú"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 lg:hidden"
                type="button"
                onClick={() => setMobileMenuOpen(true)}
              >
                <FaBars />
              </button>

              <div className="min-w-0">
                <p className="hidden text-xs font-semibold uppercase tracking-wide text-gray-500 sm:block">
                  Usuario conectado
                </p>

                <p className="truncate text-sm font-black text-gray-950 sm:text-base">
                  {user?.username || "Usuario"}
                </p>

                {Array.isArray(user?.roles) && user.roles.length > 0 ? (
                  <p className="truncate text-xs text-gray-500">
                    Rol: {user.roles.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />

              <button
                className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800 sm:px-4 sm:text-sm"
                type="button"
                onClick={handleLogout}
              >
                <span className="sm:hidden">Salir</span>
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
