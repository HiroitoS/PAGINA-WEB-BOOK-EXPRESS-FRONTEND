import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCoins,
  FaEye,
  FaEyeSlash,
  FaFilter,
  FaPen,
  FaSearch,
  FaSyncAlt,
  FaTags,
  FaTimes,
} from "react-icons/fa";
import { getAdminPrices, updateAdminPrice } from "../../api/adminApi";
import { getResults } from "../../utils/formatters";

const DEFAULT_YEAR = "2026";
const CAMPAIGN_YEARS = ["2026", "2027", "2028"];

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Consultar";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Consultar";
  }

  return `S/ ${number.toFixed(2)}`;
}

function getInitialFilters(searchParams) {
  const estado = searchParams.get("estado");

  return {
    search: searchParams.get("search") || "",
    year: searchParams.get("year") || searchParams.get("anio") || "",
    isActive:
      searchParams.get("is_active") ||
      (estado === "activo" ? "true" : estado === "inactivo" ? "false" : ""),
  };
}

function getEmptyFilters() {
  return {
    search: "",
    year: "",
    isActive: "",
  };
}

function getProductNameFromPrice(price) {
  return (
    price.product_name ||
    price.product?.name ||
    price.product_detail?.name ||
    "Producto no identificado"
  );
}

function getProductCodeFromPrice(price) {
  return (
    price.product_code ||
    price.code ||
    price.product?.code ||
    price.product_detail?.code ||
    "-"
  );
}

function getProductProviderFromPrice(price) {
  return (
    price.provider_name ||
    price.product?.provider_name ||
    price.product?.provider?.name ||
    price.product_detail?.provider_name ||
    "-"
  );
}

function getProductIdFromPrice(price) {
  if (price.product_id) return price.product_id;
  if (price.product_detail?.id) return price.product_detail.id;
  if (price.product?.id) return price.product.id;

  if (
    typeof price.product === "number" ||
    typeof price.product === "string"
  ) {
    return price.product;
  }

  return "";
}

function getPriceValue(price) {
  return price.price || price.reference_price || price.precio || "";
}

function getYearValue(price) {
  return price.year || price.catalog_year || price.anio || "";
}

function getShowPriceValue(price) {
  if (price.show_price === undefined || price.show_price === null) {
    return true;
  }

  return Boolean(price.show_price);
}

function getAvailabilityValue(price) {
  const value = price.availability || "available";

  const labels = {
    available: "Disponible",
    limited: "Stock limitado",
    out_of_stock: "Agotado",
    preorder: "Bajo pedido",
  };

  return labels[value] || value;
}

function getAvailabilityClass(price) {
  const value = price.availability || "available";

  if (value === "available") return "bg-green-50 text-green-700 ring-green-100";
  if (value === "limited") return "bg-yellow-50 text-yellow-700 ring-yellow-100";
  if (value === "out_of_stock") return "bg-red-50 text-red-700 ring-red-100";

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function buildPriceParams(filters, page) {
  const params = {};

  if (filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.year.trim()) {
    params.year = filters.year.trim();
  }

  if (filters.isActive) {
    params.is_active = filters.isActive;
  }

  params.page = page;

  return params;
}

function getActiveFiltersCount(filters) {
  return [filters.search, filters.year, filters.isActive].filter(Boolean)
    .length;
}

export default function PricesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = getInitialFilters(searchParams);

  const [prices, setPrices] = useState([]);

  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeFiltersCount = getActiveFiltersCount(filters);
  const activePricesOnPage = prices.filter((item) => item.is_active).length;
  const inactivePricesOnPage = prices.filter((item) => !item.is_active).length;
  const hiddenPricesOnPage = prices.filter(
    (item) => !getShowPriceValue(item)
  ).length;

  const selectedYear = filters.year || DEFAULT_YEAR;
  const currentYearLabel = filters.year
    ? `campaña ${filters.year}`
    : "todas las campañas";

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setPage(1);

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function applyQuickFilter(type, value = "") {
    setPage(1);

    if (type === "all") {
      setSearchParams({}, { replace: true });
      setFilters(getEmptyFilters());
      return;
    }

    if (type === "year") {
      setSearchParams({ year: value }, { replace: true });
      setFilters({
        ...getEmptyFilters(),
        year: value,
      });
      return;
    }

    if (type === "active") {
      setSearchParams({ estado: "activo" }, { replace: true });
      setFilters({
        ...getEmptyFilters(),
        isActive: "true",
      });
      return;
    }

    if (type === "inactive") {
      setSearchParams({ estado: "inactivo" }, { replace: true });
      setFilters({
        ...getEmptyFilters(),
        isActive: "false",
      });
    }
  }

  function clearFilters() {
    setPage(1);
    setSearchParams({}, { replace: true });
    setFilters(getEmptyFilters());
  }

  async function loadPrices(customPage = page) {
    setLoading(true);
    setError("");

    try {
      const params = buildPriceParams(filters, customPage);
      const data = await getAdminPrices(params);

      setPrices(getResults(data));
      setPagination({
        count: data?.count || 0,
        next: data?.next || null,
        previous: data?.previous || null,
      });
    } catch {
      setError("No se pudieron cargar los precios.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(price) {
    const nextValue = !price.is_active;

    setUpdatingId(price.id);
    setError("");
    setSuccessMessage("");

    try {
      const updated = await updateAdminPrice(price.id, {
        is_active: nextValue,
      });

      setPrices((prev) => {
        if (filters.isActive === "true" && !updated.is_active) {
          return prev.filter((item) => item.id !== price.id);
        }

        if (filters.isActive === "false" && updated.is_active) {
          return prev.filter((item) => item.id !== price.id);
        }

        return prev.map((item) => (item.id === price.id ? updated : item));
      });

      setSuccessMessage("Estado del precio actualizado correctamente.");
    } catch {
      setError("No se pudo actualizar el estado del precio.");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = buildPriceParams(filters, page);
        const data = await getAdminPrices(params);

        if (!ignore) {
          setPrices(getResults(data));
          setPagination({
            count: data?.count || 0,
            next: data?.next || null,
            previous: data?.previous || null,
          });
        }
      } catch {
        if (!ignore) {
          setError("No se pudieron cargar los precios.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [filters, page]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Control comercial
            </p>

            <h1 className="mt-2 text-3xl font-black">Precios</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Revisa el historial de precios registrados por producto, año o
              campaña. Los productos sin precio se gestionan desde Productos.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaArrowLeft className="text-xs" />
              Volver al Dashboard
            </Link>

            <button
              type="button"
              onClick={() => loadPrices(page)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>
      </motion.div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={FaCoins}
          label="Total de registros"
          value={pagination.count}
          description={`Precios encontrados para ${currentYearLabel}`}
          tone="dark"
        />

        <SummaryCard
          icon={FaTags}
          label="Activos en vista"
          value={activePricesOnPage}
          description="Precios habilitados para control comercial"
          tone="green"
        />

        <SummaryCard
          icon={FaEyeSlash}
          label="Consultar precio"
          value={hiddenPricesOnPage}
          description="Registros que no muestran monto al público"
          tone="yellow"
        />
      </section>

      <section className="mt-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-800 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide">
              Regla comercial
            </p>

            <h2 className="mt-1 text-xl font-black text-gray-950">
              Los precios se controlan por campaña
            </h2>

            <p className="mt-1 text-sm leading-6">
              Un mismo producto puede tener precios diferentes por campaña. Para
              crear o corregir precios, entra a la ficha del producto desde el
              botón “Editar producto”.
            </p>
          </div>

          <Link
            to={`/admin/productos?sin_precio=1&anio=${selectedYear}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100"
          >
            Ver productos sin precio {selectedYear}
            <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          {successMessage}
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaFilter />
              Filtros
            </div>

            <h2 className="mt-2 text-xl font-black text-gray-950">
              Buscar historial de precios
            </h2>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaTimes className="text-xs" />
            Limpiar filtros
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
          <QuickFilterButton
            active={activeFiltersCount === 0}
            label="Todos"
            onClick={() => applyQuickFilter("all")}
          />

          {CAMPAIGN_YEARS.map((campaignYear) => (
            <QuickFilterButton
              key={campaignYear}
              active={filters.year === campaignYear}
              label={`Campaña ${campaignYear}`}
              onClick={() => applyQuickFilter("year", campaignYear)}
              tone="red"
            />
          ))}

          <QuickFilterButton
            active={filters.isActive === "true"}
            label="Activos"
            onClick={() => applyQuickFilter("active")}
            tone="green"
          />

          <QuickFilterButton
            active={filters.isActive === "false"}
            label="Inactivos"
            onClick={() => applyQuickFilter("inactive")}
            tone="gray"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Buscar producto
            </label>

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nombre, código, ISBN o editorial..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Año / campaña
            </label>

            <input
              type="number"
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              placeholder="Ejemplo: 2027"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-black text-gray-950">
              Historial de precios
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-black text-gray-950">{prices.length}</span>{" "}
              de{" "}
              <span className="font-black text-gray-950">
                {pagination.count}
              </span>{" "}
              precio(s). Página{" "}
              <span className="font-black text-gray-950">{page}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label="Activos" value={activePricesOnPage} />
            <StatusPill
              label="Inactivos"
              value={inactivePricesOnPage}
              tone="red"
            />
            <StatusPill
              label="Consultar"
              value={hiddenPricesOnPage}
              tone="yellow"
            />
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Cargando precios...
          </div>
        )}

        {!loading && !error && prices.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaSearch />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No se encontraron precios.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Puede que el producto aún no tenga precios registrados para los
              filtros seleccionados.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
            >
              Ver todos los precios
            </button>
          </div>
        )}

        {!loading && prices.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <TableHead>Producto</TableHead>
                    <TableHead>Editorial</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Visibilidad</TableHead>
                    <TableHead>Disponibilidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {prices.map((price) => {
                    const productId = getProductIdFromPrice(price);

                    return (
                      <tr
                        key={price.id}
                        className="align-top transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="line-clamp-2 font-black text-gray-950">
                            {getProductNameFromPrice(price)}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Código / ISBN: {getProductCodeFromPrice(price)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                            {getProductProviderFromPrice(price)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                            {getYearValue(price) || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-gray-950">
                            {formatPrice(getPriceValue(price))}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              getShowPriceValue(price)
                                ? "inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                                : "inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700 ring-1 ring-yellow-100"
                            }
                          >
                            {getShowPriceValue(price) ? <FaEye /> : <FaEyeSlash />}
                            {getShowPriceValue(price)
                              ? "Mostrar precio"
                              : "Consultar precio"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getAvailabilityClass(
                              price
                            )}`}
                          >
                            {getAvailabilityValue(price)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              price.is_active
                                ? "inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                                : "inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100"
                            }
                          >
                            {price.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex min-w-36 flex-col gap-2">
                            {productId && (
                              <Link
                                to={`/admin/productos/${productId}/editar`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                              >
                                <FaPen className="text-xs" />
                                Editar producto
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleActive(price)}
                              disabled={updatingId === price.id}
                              className={
                                price.is_active
                                  ? "rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                                  : "rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-70"
                              }
                            >
                              {updatingId === price.id
                                ? "Actualizando..."
                                : price.is_active
                                  ? "Desactivar"
                                  : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row">
              <p className="text-sm text-gray-600">
                Página <span className="font-black text-gray-950">{page}</span>
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination.previous || loading}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!pagination.next || loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                  <FaArrowRight className="text-xs" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, description, tone }) {
  const styles = {
    dark: "border-gray-800 bg-gray-950 text-white",
    green: "border-green-100 bg-green-50 text-green-700",
    yellow: "border-yellow-100 bg-yellow-50 text-yellow-700",
  };

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        styles[tone] || styles.dark
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-gray-950 ring-1 ring-white/60">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function QuickFilterButton({ active, label, onClick, tone = "red" }) {
  const activeStyles = {
    red: "bg-red-700 text-white ring-red-700",
    green: "bg-green-700 text-white ring-green-700",
    gray: "bg-gray-950 text-white ring-gray-950",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? `rounded-full px-4 py-2 text-xs font-black ring-1 transition ${
              activeStyles[tone] || activeStyles.red
            }`
          : "rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-red-50 hover:text-red-700"
      }
    >
      {label}
    </button>
  );
}

function StatusPill({ label, value, tone = "green" }) {
  const styles = {
    green: "bg-green-50 text-green-700 ring-green-100",
    yellow: "bg-yellow-50 text-yellow-700 ring-yellow-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        styles[tone] || styles.green
      }`}
    >
      {label}: {value}
    </span>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}