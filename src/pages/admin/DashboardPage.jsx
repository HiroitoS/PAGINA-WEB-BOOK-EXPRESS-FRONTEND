import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowRight,
  FaBookOpen,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaFileExcel,
  FaImages,
  FaLayerGroup,
  FaRegCommentDots,
  FaSyncAlt,
  FaTags,
  FaUsersCog,
} from "react-icons/fa";
import { getAdminDashboardSummary } from "../../api/adminApi";
import { useAuth } from "../../hooks/useAuth";

const ADMIN_ROLE = "ADMINISTRADOR";
const CATALOG_ROLE = "CATALOGO";
const ATTENTION_ROLE = "ATENCION";

function formatDate(value) {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "-";
  }
}

function formatStatus(value) {
  const labels = {
    new: "Nuevo",
    contacted: "Contactado",
    in_follow_up: "En seguimiento",
    closed: "Cerrado",
    discarded: "Descartado",
  };

  return labels[value] || value || "-";
}

function getStatusClass(value) {
  if (value === "new") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (value === "contacted") return "bg-purple-50 text-purple-700 ring-purple-100";
  if (value === "in_follow_up") {
    return "bg-yellow-50 text-yellow-700 ring-yellow-100";
  }
  if (value === "closed") return "bg-green-50 text-green-700 ring-green-100";
  if (value === "discarded") return "bg-red-50 text-red-700 ring-red-100";

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function getPercent(value, total) {
  const numericTotal = Number(total || 0);

  if (!numericTotal) return 0;

  return Math.round((Number(value || 0) / numericTotal) * 100);
}

function getSafeNumber(value) {
  return Number(value || 0);
}

function userHasRole(user, role) {
  if (user?.is_superuser) return true;

  const roles = Array.isArray(user?.roles) ? user.roles : [];

  return roles.includes(role);
}

function getDashboardMode(user) {
  if (user?.is_superuser || userHasRole(user, ADMIN_ROLE)) {
    return "admin";
  }

  if (userHasRole(user, CATALOG_ROLE)) {
    return "catalog";
  }

  if (userHasRole(user, ATTENTION_ROLE)) {
    return "attention";
  }

  return "limited";
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [year, setYear] = useState("2026");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dashboardMode = getDashboardMode(user);

  async function loadDashboard(selectedYear = year) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminDashboardSummary({
        anio: selectedYear,
      });

      setDashboard(data);
    } catch {
      setError("No se pudo cargar el resumen del dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function fetchDashboard() {
      setLoading(true);
      setError("");

      try {
        const data = await getAdminDashboardSummary({
          anio: year,
        });

        if (!ignore) {
          setDashboard(data);
        }
      } catch {
        if (!ignore) {
          setError("No se pudo cargar el resumen del dashboard.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      ignore = true;
    };
  }, [year]);

  const productos = dashboard?.productos || {};
  const proveedores = dashboard?.proveedores || {};
  const solicitudes = dashboard?.solicitudes || {};
  const actividad = dashboard?.actividad_reciente || {};
  const ultimasSolicitudes = actividad?.ultimas_solicitudes || [];

  const productosTotal = getSafeNumber(productos.total);
  const productosActivos = getSafeNumber(productos.activos);
  const productosInactivos = Math.max(productosTotal - productosActivos, 0);
  const productosSinPortada = getSafeNumber(productos.sin_portada);
  const productosConPortada = Math.max(
    productosActivos - productosSinPortada,
    0
  );
  const productosConPrecio = getSafeNumber(productos.con_precio_anio);
  const productosSinPrecio = getSafeNumber(productos.sin_precio_anio);

  const solicitudesNuevas = getSafeNumber(solicitudes.nuevas);
  const solicitudesEnSeguimiento = getSafeNumber(solicitudes.en_seguimiento);
  const solicitudesTotal = getSafeNumber(solicitudes.total);
  const solicitudesContactadas = getSafeNumber(solicitudes.contactadas);
  const solicitudesCerradas = getSafeNumber(solicitudes.cerradas);
  const solicitudesDescartadas = getSafeNumber(solicitudes.descartadas);
  const solicitudesGestionadas = solicitudesContactadas + solicitudesCerradas;

  const catalogHealth = useMemo(() => {
    if (!productosActivos) return 0;

    const coverPercent = getPercent(productosConPortada, productosActivos);
    const pricePercent = getPercent(productosConPrecio, productosTotal);

    return Math.round((coverPercent + pricePercent) / 2);
  }, [productosActivos, productosConPortada, productosConPrecio, productosTotal]);

  const campaignYear = dashboard?.anio || year;

  return (
    <div>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10"
      >
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Panel Book Express
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight">
              {dashboardMode === "attention"
                ? "Dashboard de atención"
                : dashboardMode === "catalog"
                  ? "Dashboard de catálogo"
                  : "Dashboard administrativo"}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              {dashboardMode === "attention"
                ? "Seguimiento de solicitudes recibidas desde la web pública y el catálogo."
                : dashboardMode === "catalog"
                  ? "Estado del catálogo, precios, editoriales, portadas e importaciones."
                  : "Estado general del catálogo, precios, portadas y solicitudes de la web pública."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {dashboardMode !== "attention" && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Año de campaña
                </label>

                <input
                  type="number"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20 sm:w-32"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => loadDashboard(year)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-800"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Ver web pública
              <FaExternalLinkAlt className="text-xs" />
            </Link>
          </div>
        </div>
      </motion.section>

      {loading && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          Cargando dashboard...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && dashboard && dashboardMode === "admin" && (
        <AdminDashboardContent
          campaignYear={campaignYear}
          productosTotal={productosTotal}
          productosActivos={productosActivos}
          productosInactivos={productosInactivos}
          productosSinPortada={productosSinPortada}
          productosConPortada={productosConPortada}
          productosConPrecio={productosConPrecio}
          productosSinPrecio={productosSinPrecio}
          proveedores={proveedores}
          solicitudesNuevas={solicitudesNuevas}
          solicitudesEnSeguimiento={solicitudesEnSeguimiento}
          solicitudesTotal={solicitudesTotal}
          solicitudesGestionadas={solicitudesGestionadas}
          catalogHealth={catalogHealth}
          ultimasSolicitudes={ultimasSolicitudes}
        />
      )}

      {!loading && !error && dashboard && dashboardMode === "catalog" && (
        <CatalogDashboardContent
          campaignYear={campaignYear}
          productosTotal={productosTotal}
          productosActivos={productosActivos}
          productosInactivos={productosInactivos}
          productosSinPortada={productosSinPortada}
          productosConPortada={productosConPortada}
          productosConPrecio={productosConPrecio}
          productosSinPrecio={productosSinPrecio}
          proveedores={proveedores}
          catalogHealth={catalogHealth}
        />
      )}

      {!loading && !error && dashboard && dashboardMode === "attention" && (
        <AttentionDashboardContent
          solicitudesNuevas={solicitudesNuevas}
          solicitudesEnSeguimiento={solicitudesEnSeguimiento}
          solicitudesContactadas={solicitudesContactadas}
          solicitudesCerradas={solicitudesCerradas}
          solicitudesDescartadas={solicitudesDescartadas}
          solicitudesTotal={solicitudesTotal}
          solicitudesGestionadas={solicitudesGestionadas}
          ultimasSolicitudes={ultimasSolicitudes}
        />
      )}

      {!loading && !error && dashboard && dashboardMode === "limited" && (
        <section className="mt-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-800 shadow-sm">
          <h2 className="text-xl font-black text-gray-950">
            Rol pendiente de configurar
          </h2>
          <p className="mt-2 text-sm leading-6">
            Este usuario no tiene un rol válido para visualizar el panel.
            Solicita a un administrador asignar un rol.
          </p>
        </section>
      )}
    </div>
  );
}

function AdminDashboardContent({
  campaignYear,
  productosTotal,
  productosActivos,
  productosInactivos,
  productosSinPortada,
  productosConPortada,
  productosConPrecio,
  productosSinPrecio,
  proveedores,
  solicitudesNuevas,
  solicitudesEnSeguimiento,
  solicitudesTotal,
  solicitudesGestionadas,
  catalogHealth,
  ultimasSolicitudes,
}) {
  return (
    <>
      <DashboardMetrics
        campaignYear={campaignYear}
        productosTotal={productosTotal}
        productosActivos={productosActivos}
        productosSinPrecio={productosSinPrecio}
        productosConPrecio={productosConPrecio}
        proveedores={proveedores}
        solicitudesNuevas={solicitudesNuevas}
        solicitudesEnSeguimiento={solicitudesEnSeguimiento}
        showCatalog
        showAttention
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <CatalogHealthPanel
          campaignYear={campaignYear}
          productosTotal={productosTotal}
          productosActivos={productosActivos}
          productosInactivos={productosInactivos}
          productosSinPortada={productosSinPortada}
          productosConPortada={productosConPortada}
          productosConPrecio={productosConPrecio}
          productosSinPrecio={productosSinPrecio}
          solicitudesTotal={solicitudesTotal}
          solicitudesNuevas={solicitudesNuevas}
          solicitudesGestionadas={solicitudesGestionadas}
          catalogHealth={catalogHealth}
          showSolicitudes
        />

        <PendingActionsPanel
          campaignYear={campaignYear}
          productosSinPortada={productosSinPortada}
          productosSinPrecio={productosSinPrecio}
          solicitudesNuevas={solicitudesNuevas}
          showCatalog
          showAttention
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <RequestsPanel ultimasSolicitudes={ultimasSolicitudes} />

        <QuickActionsPanel
          actions={[
            {
              to: "/admin/productos",
              icon: FaBookOpen,
              label: "Gestionar productos",
            },
            {
              to: "/admin/precios",
              icon: FaTags,
              label: "Gestionar precios",
            },
            {
              to: "/admin/solicitudes",
              icon: FaRegCommentDots,
              label: "Ver solicitudes",
            },
            {
              to: "/admin/importaciones",
              icon: FaFileExcel,
              label: "Importar Excel",
            },
            {
              to: "/admin/usuarios",
              icon: FaUsersCog,
              label: "Usuarios",
            },
          ]}
        />
      </div>
    </>
  );
}

function CatalogDashboardContent({
  campaignYear,
  productosTotal,
  productosActivos,
  productosInactivos,
  productosSinPortada,
  productosConPortada,
  productosConPrecio,
  productosSinPrecio,
  proveedores,
  catalogHealth,
}) {
  return (
    <>
      <DashboardMetrics
        campaignYear={campaignYear}
        productosTotal={productosTotal}
        productosActivos={productosActivos}
        productosSinPrecio={productosSinPrecio}
        productosConPrecio={productosConPrecio}
        proveedores={proveedores}
        showCatalog
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <CatalogHealthPanel
          campaignYear={campaignYear}
          productosTotal={productosTotal}
          productosActivos={productosActivos}
          productosInactivos={productosInactivos}
          productosSinPortada={productosSinPortada}
          productosConPortada={productosConPortada}
          productosConPrecio={productosConPrecio}
          productosSinPrecio={productosSinPrecio}
          catalogHealth={catalogHealth}
        />

        <PendingActionsPanel
          campaignYear={campaignYear}
          productosSinPortada={productosSinPortada}
          productosSinPrecio={productosSinPrecio}
          showCatalog
        />
      </div>

      <div className="mt-6">
        <QuickActionsPanel
          actions={[
            {
              to: "/admin/productos",
              icon: FaBookOpen,
              label: "Gestionar productos",
            },
            {
              to: "/admin/precios",
              icon: FaTags,
              label: "Gestionar precios",
            },
            {
              to: "/admin/proveedores",
              icon: FaLayerGroup,
              label: "Editoriales",
            },
            {
              to: "/admin/importaciones",
              icon: FaFileExcel,
              label: "Importar Excel",
            },
          ]}
        />
      </div>
    </>
  );
}

function AttentionDashboardContent({
  solicitudesNuevas,
  solicitudesEnSeguimiento,
  solicitudesContactadas,
  solicitudesCerradas,
  solicitudesDescartadas,
  solicitudesTotal,
  solicitudesGestionadas,
  ultimasSolicitudes,
}) {
  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.04,
            },
          },
        }}
        className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          icon={FaRegCommentDots}
          title="Solicitudes nuevas"
          value={solicitudesNuevas}
          description="Consultas pendientes de primera atención"
          tone="blue"
          to="/admin/solicitudes?status=new"
        />

        <MetricCard
          icon={FaClock}
          title="En seguimiento"
          value={solicitudesEnSeguimiento}
          description="Consultas que requieren continuidad"
          tone="yellow"
          to="/admin/solicitudes?status=in_follow_up"
        />

        <MetricCard
          icon={FaCheckCircle}
          title="Contactadas"
          value={solicitudesContactadas}
          description="Consultas ya atendidas inicialmente"
          tone="green"
          to="/admin/solicitudes?status=contacted"
        />

        <MetricCard
          icon={FaExclamationTriangle}
          title="Descartadas"
          value={solicitudesDescartadas}
          description="Consultas cerradas sin continuidad"
          tone="red"
          to="/admin/solicitudes?status=discarded"
        />
      </motion.div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-gray-950">
                Estado de atención
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Seguimiento de consultas recibidas desde la web.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-4 py-2 ring-1 ring-blue-100">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Gestionadas
              </p>
              <p className="text-2xl font-black text-gray-950">
                {getPercent(solicitudesGestionadas, solicitudesTotal)}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <CompactProgressRow
              title="Solicitudes gestionadas"
              value={solicitudesGestionadas}
              total={solicitudesTotal}
              percent={getPercent(solicitudesGestionadas, solicitudesTotal)}
              description={`${solicitudesNuevas} solicitud(es) nueva(s) pendientes.`}
              to="/admin/solicitudes?status=new"
              tone="green"
            />

            <CompactProgressRow
              title="Solicitudes cerradas"
              value={solicitudesCerradas}
              total={solicitudesTotal}
              percent={getPercent(solicitudesCerradas, solicitudesTotal)}
              description="Consultas finalizadas correctamente."
              to="/admin/solicitudes?status=closed"
              tone="green"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-950">
                Pendientes de atención
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Consultas que requieren respuesta o seguimiento.
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaClock />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <AlertAction
              icon={FaRegCommentDots}
              title="Solicitudes nuevas"
              value={solicitudesNuevas}
              description="Atender consultas pendientes."
              to="/admin/solicitudes?status=new"
              tone="blue"
            />

            <AlertAction
              icon={FaClock}
              title="En seguimiento"
              value={solicitudesEnSeguimiento}
              description="Revisar casos en curso."
              to="/admin/solicitudes?status=in_follow_up"
              tone="yellow"
            />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <RequestsPanel ultimasSolicitudes={ultimasSolicitudes} />

        <QuickActionsPanel
          actions={[
            {
              to: "/admin/solicitudes",
              icon: FaRegCommentDots,
              label: "Gestionar solicitudes",
            },
          ]}
        />
      </div>
    </>
  );
}

function DashboardMetrics({
  campaignYear,
  productosTotal,
  productosActivos,
  productosSinPrecio,
  productosConPrecio,
  proveedores,
  solicitudesNuevas,
  solicitudesEnSeguimiento,
  showCatalog,
  showAttention,
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.04,
          },
        },
      }}
      className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {showCatalog && (
        <>
          <MetricCard
            icon={FaBookOpen}
            title="Productos activos"
            value={productosActivos}
            description={`${productosTotal} producto(s) registrados`}
            tone="dark"
            to="/admin/productos?estado=activo"
          />

          <MetricCard
            icon={FaLayerGroup}
            title="Editoriales activas"
            value={proveedores.activos || 0}
            description={`${proveedores.total || 0} editorial(es) registradas`}
            tone="red"
            to="/admin/proveedores?estado=activo"
          />

          <MetricCard
            icon={FaExclamationTriangle}
            title={`Sin precio ${campaignYear}`}
            value={productosSinPrecio}
            description={`${productosConPrecio} con precio registrado`}
            tone="yellow"
            to={`/admin/productos?sin_precio=1&anio=${campaignYear}`}
          />
        </>
      )}

      {showAttention && (
        <MetricCard
          icon={FaRegCommentDots}
          title="Solicitudes nuevas"
          value={solicitudesNuevas}
          description={`${solicitudesEnSeguimiento} en seguimiento`}
          tone="blue"
          to="/admin/solicitudes?status=new"
        />
      )}
    </motion.div>
  );
}

function CatalogHealthPanel({
  campaignYear,
  productosTotal,
  productosActivos,
  productosInactivos,
  productosSinPortada,
  productosConPortada,
  productosConPrecio,
  productosSinPrecio,
  solicitudesTotal,
  solicitudesNuevas,
  solicitudesGestionadas,
  catalogHealth,
  showSolicitudes = false,
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-black text-gray-950">
            Estado operativo
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Indicadores clave para saber qué falta revisar.
          </p>
        </div>

        <div className="rounded-2xl bg-red-50 px-4 py-2 ring-1 ring-red-100">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Salud del catálogo
          </p>
          <p className="text-2xl font-black text-gray-950">
            {catalogHealth}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <CompactProgressRow
          title={`Precios ${campaignYear}`}
          value={productosConPrecio}
          total={productosTotal}
          percent={getPercent(productosConPrecio, productosTotal)}
          description={`${productosSinPrecio} producto(s) sin precio para este año.`}
          to={`/admin/productos?sin_precio=1&anio=${campaignYear}`}
          tone="red"
        />

        <CompactProgressRow
          title="Portadas"
          value={productosConPortada}
          total={productosActivos}
          percent={getPercent(productosConPortada, productosActivos)}
          description={`${productosSinPortada} producto(s) activo(s) sin portada.`}
          to="/admin/productos?sin_portada=1"
          tone="yellow"
        />

        {showSolicitudes && (
          <CompactProgressRow
            title="Solicitudes gestionadas"
            value={solicitudesGestionadas}
            total={solicitudesTotal}
            percent={getPercent(solicitudesGestionadas, solicitudesTotal)}
            description={`${solicitudesNuevas} solicitud(es) nueva(s) pendientes.`}
            to="/admin/solicitudes?status=new"
            tone="green"
          />
        )}

        <CatalogStatusRow
          active={productosActivos}
          inactive={productosInactivos}
        />
      </div>
    </section>
  );
}

function PendingActionsPanel({
  campaignYear,
  productosSinPortada,
  productosSinPrecio,
  solicitudesNuevas,
  showCatalog,
  showAttention,
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-950">
            Pendientes importantes
          </h2>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            Acciones recomendadas según el rol activo.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
          <FaClock />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {showCatalog && (
          <>
            <AlertAction
              icon={FaImages}
              title="Productos sin portada"
              value={productosSinPortada}
              description="Revisar materiales sin imagen pública."
              to="/admin/productos?sin_portada=1"
              tone="yellow"
            />

            <AlertAction
              icon={FaTags}
              title={`Productos sin precio ${campaignYear}`}
              value={productosSinPrecio}
              description="Registrar precio o mantener como consulta."
              to={`/admin/productos?sin_precio=1&anio=${campaignYear}`}
              tone="red"
            />
          </>
        )}

        {showAttention && (
          <AlertAction
            icon={FaRegCommentDots}
            title="Solicitudes nuevas"
            value={solicitudesNuevas}
            description="Atender consultas pendientes."
            to="/admin/solicitudes?status=new"
            tone="blue"
          />
        )}
      </div>
    </section>
  );
}

function RequestsPanel({ ultimasSolicitudes }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4">
        <div>
          <h2 className="font-black text-gray-950">
            Últimas solicitudes recibidas
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Consultas recientes desde catálogo o formulario web.
          </p>
        </div>

        <Link
          to="/admin/solicitudes"
          className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
        >
          Ver todas
          <FaArrowRight className="text-xs" />
        </Link>
      </div>

      {ultimasSolicitudes.length === 0 ? (
        <div className="p-6 text-sm text-gray-600">
          No hay solicitudes recientes.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {ultimasSolicitudes.map((item) => (
            <RequestRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function QuickActionsPanel({ actions }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-gray-950">Accesos rápidos</h2>

      <div className="mt-4 grid gap-3">
        {actions.map((action) => (
          <QuickAction
            key={action.to}
            to={action.to}
            icon={action.icon}
            label={action.label}
          />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, title, value, description, tone, to }) {
  const styles = {
    dark: {
      card: "border-gray-800 bg-gray-950 text-white",
      icon: "bg-white/10 text-red-300 ring-white/10",
      title: "text-gray-300",
      value: "text-white",
      description: "text-gray-400",
    },
    red: {
      card: "border-red-100 bg-red-50",
      icon: "bg-white text-red-700 ring-red-100",
      title: "text-red-800",
      value: "text-gray-950",
      description: "text-red-700",
    },
    blue: {
      card: "border-blue-100 bg-blue-50",
      icon: "bg-white text-blue-700 ring-blue-100",
      title: "text-blue-800",
      value: "text-gray-950",
      description: "text-blue-700",
    },
    yellow: {
      card: "border-yellow-100 bg-yellow-50",
      icon: "bg-white text-yellow-700 ring-yellow-100",
      title: "text-yellow-800",
      value: "text-gray-950",
      description: "text-yellow-700",
    },
    green: {
      card: "border-green-100 bg-green-50",
      icon: "bg-white text-green-700 ring-green-100",
      title: "text-green-800",
      value: "text-gray-950",
      description: "text-green-700",
    },
  };

  const currentStyle = styles[tone] || styles.dark;

  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          y: 10,
        },
        visible: {
          opacity: 1,
          y: 0,
        },
      }}
    >
      <Link
        to={to}
        className={`group block rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${currentStyle.card}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm font-bold ${currentStyle.title}`}>{title}</p>

            <p className={`mt-3 text-3xl font-black ${currentStyle.value}`}>
              {value}
            </p>
          </div>

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${currentStyle.icon}`}
          >
            <Icon />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className={`text-xs leading-5 ${currentStyle.description}`}>
            {description}
          </p>

          <FaArrowRight className="text-xs opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" />
        </div>
      </Link>
    </motion.div>
  );
}

function CompactProgressRow({
  title,
  value,
  total,
  percent,
  description,
  to,
  tone,
}) {
  const barClass = {
    red: "bg-red-700",
    yellow: "bg-yellow-500",
    green: "bg-green-600",
  };

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-red-100 hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-gray-700">{title}</p>

          <p className="mt-1 text-xl font-black text-gray-950">
            {value} / {total}
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-100">
          {percent}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${
            barClass[tone] || "bg-red-700"
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-gray-500">{description}</p>

        <FaArrowRight className="text-xs text-gray-400 transition group-hover:translate-x-1 group-hover:text-red-700" />
      </div>
    </Link>
  );
}

function CatalogStatusRow({ active, inactive }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-black text-gray-700">Estado del catálogo</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          to="/admin/productos?estado=activo"
          className="rounded-xl bg-green-50 p-3 ring-1 ring-green-100 transition hover:bg-green-100"
        >
          <div className="flex items-center gap-2 text-green-700">
            <FaCheckCircle className="text-xs" />
            <p className="text-xs font-black uppercase tracking-wide">
              Activos
            </p>
          </div>

          <p className="mt-1 text-xl font-black text-gray-950">{active}</p>
        </Link>

        <Link
          to="/admin/productos?estado=inactivo"
          className="rounded-xl bg-white p-3 ring-1 ring-gray-100 transition hover:bg-gray-100"
        >
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Inactivos
          </p>

          <p className="mt-1 text-xl font-black text-gray-950">{inactive}</p>
        </Link>
      </div>
    </div>
  );
}

function AlertAction({ icon: Icon, title, value, description, to, tone }) {
  const styles = {
    red: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
    yellow:
      "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
    blue: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  };

  return (
    <Link
      to={to}
      className={`group block rounded-2xl border p-4 transition ${
        styles[tone] || styles.blue
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
          <Icon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black">{title}</p>

            <p className="text-2xl font-black leading-none">{value}</p>
          </div>

          <p className="mt-1 text-xs leading-5 opacity-80">{description}</p>

          <p className="mt-2 inline-flex items-center gap-2 text-xs font-black">
            Revisar
            <FaArrowRight className="transition group-hover:translate-x-1" />
          </p>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-700 ring-1 ring-gray-100">
          <Icon />
        </span>
        {label}
      </span>

      <FaArrowRight className="text-xs transition group-hover:translate-x-1" />
    </Link>
  );
}

function RequestRow({ item }) {
  return (
    <div className="p-4 transition hover:bg-gray-50">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-black text-gray-950">{item.full_name || "-"}</p>

          <p className="mt-1 text-xs text-gray-500">
            {item.phone || "-"} · {formatDate(item.created_at)}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusClass(
            item.status
          )}`}
        >
          {formatStatus(item.status)}
        </span>
      </div>

      <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
        <p className="line-clamp-1 text-sm font-black text-gray-950">
          {item.product_name || "Consulta general"}
        </p>

        {item.provider_name && (
          <p className="mt-1 text-xs font-bold text-red-700">
            {item.provider_name}
          </p>
        )}

        {item.message && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">
            {item.message}
          </p>
        )}
      </div>
    </div>
  );
}