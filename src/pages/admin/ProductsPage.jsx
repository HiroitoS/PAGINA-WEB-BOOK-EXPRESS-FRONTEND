import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaFilter,
  FaImage,
  FaPen,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import {
  getAdminAreas,
  getAdminGrades,
  getAdminLevels,
  getAdminProductTypes,
  getAdminProducts,
  getAdminProviders,
  getAdminSeries,
  updateAdminProduct,
} from "../../api/adminApi";
import { getResults } from "../../utils/formatters";
import { useAuth } from "../../hooks/useAuth";

const DEFAULT_YEAR = "2026";

function getName(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value.name || value.nombre || "";
}

function getProductProvider(product) {
  return (
    product.provider_name ||
    product.provider?.name ||
    product.provider_detail?.name ||
    "-"
  );
}

function getProductLevel(product) {
  return product.level_name || product.level?.name || "-";
}

function getProductGrade(product) {
  return product.grade_name || product.grade?.name || "-";
}

function getProductArea(product) {
  return product.area_name || product.area?.name || "-";
}

function getProductSeries(product) {
  return product.series_name || product.series?.name || "-";
}

function getProductType(product) {
  return product.product_type_name || product.product_type?.name || "-";
}

function getHasCover(product) {
  return Boolean(product.cover_image || product.cover || product.cover_url);
}

function hasRegisteredPrice(product) {
  return Boolean(product.latest_price);
}

function hasPublicVisiblePrice(product) {
  const latestPrice = product.latest_price;

  return Boolean(latestPrice?.show_price && latestPrice?.price);
}

function getLatestPrice(product) {
  const latestPrice = product.latest_price;

  if (!latestPrice) return "Sin precio";

  if (latestPrice.show_price && latestPrice.price) {
    return `S/ ${Number(latestPrice.price).toFixed(2)}`;
  }

  return "Consultar";
}

function getPriceStatusLabel(product) {
  if (!hasRegisteredPrice(product)) {
    return "Precio pendiente";
  }

  if (hasPublicVisiblePrice(product)) {
    return "Precio visible";
  }

  return "Precio registrado";
}

function getPriceStatusClass(product) {
  if (!hasRegisteredPrice(product)) {
    return "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100";
  }

  if (hasPublicVisiblePrice(product)) {
    return "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100";
  }

  return "inline-flex rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700 ring-1 ring-yellow-100";
}

function getInitialFilters(searchParams) {
  const estado = searchParams.get("estado");

  return {
    search: searchParams.get("search") || "",
    provider: searchParams.get("provider") || "",
    level: searchParams.get("level") || "",
    grade: searchParams.get("grade") || "",
    area: searchParams.get("area") || "",
    series: searchParams.get("series") || "",
    productType: searchParams.get("product_type") || "",
    isActive:
      searchParams.get("is_active") ||
      (estado === "activo" ? "true" : estado === "inactivo" ? "false" : ""),
    sinPortada: searchParams.get("sin_portada") || "",
    sinPrecio: searchParams.get("sin_precio") || "",
    year: searchParams.get("anio") || searchParams.get("year") || "",
  };
}

function getEmptyFilters() {
  return {
    search: "",
    provider: "",
    level: "",
    grade: "",
    area: "",
    series: "",
    productType: "",
    isActive: "",
    sinPortada: "",
    sinPrecio: "",
    year: "",
  };
}

function buildProductParams(filters, page) {
  const params = {};

  if (filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.provider) {
    params.provider = filters.provider;
  }

  if (filters.level) {
    params.level = filters.level;
  }

  if (filters.grade) {
    params.grade = filters.grade;
  }

  if (filters.area) {
    params.area = filters.area;
  }

  if (filters.series) {
    params.series = filters.series;
  }

  if (filters.productType) {
    params.product_type = filters.productType;
  }

  if (filters.isActive) {
    params.is_active = filters.isActive;
  }

  if (filters.sinPortada) {
    params.sin_portada = filters.sinPortada;
  }

  if (filters.sinPrecio) {
    params.sin_precio = filters.sinPrecio;
  }

  if (filters.year) {
    params.anio = filters.year;
  }

  params.page = page;

  return params;
}

function getSpecialFilterInfo(filters, canManageCatalog) {
  if (filters.sinPortada) {
    return {
      title: "Productos activos sin portada",
      description:
        "Estos productos aparecen en el catálogo, pero aún necesitan imagen para mejorar su presentación pública.",
      tone: "yellow",
    };
  }

  if (filters.sinPrecio) {
    return {
      title: `Productos activos sin precio ${filters.year || DEFAULT_YEAR}`,
      description: canManageCatalog
        ? "Estos productos no tienen precio registrado para el año seleccionado. Puedes editarlos o mantenerlos como consulta."
        : "Estos productos no tienen precio registrado para el año seleccionado y se mantienen disponibles para consulta.",
      tone: "red",
    };
  }

  if (filters.isActive === "true") {
    return {
      title: "Productos activos",
      description: canManageCatalog
        ? "Listado de productos visibles o disponibles para gestión."
        : "Listado de productos activos disponibles para consulta.",
      tone: "green",
    };
  }

  if (filters.isActive === "false") {
    return {
      title: "Productos inactivos",
      description: canManageCatalog
        ? "Productos ocultos o deshabilitados para revisión interna."
        : "Productos inactivos disponibles únicamente para consulta.",
      tone: "gray",
    };
  }

  return null;
}

function getActiveFiltersCount(filters) {
  return [
    filters.search,
    filters.provider,
    filters.level,
    filters.grade,
    filters.area,
    filters.series,
    filters.productType,
    filters.isActive,
    filters.sinPortada,
    filters.sinPrecio,
    filters.year,
  ].filter(Boolean).length;
}

function hasAdvancedFilters(filters) {
  return Boolean(
    filters.level ||
      filters.grade ||
      filters.area ||
      filters.series ||
      filters.productType
  );
}

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = getInitialFilters(searchParams);

  const [products, setProducts] = useState([]);

  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  const [page, setPage] = useState(1);

  const [providers, setProviders] = useState([]);
  const [levels, setLevels] = useState([]);
  const [grades, setGrades] = useState([]);
  const [areas, setAreas] = useState([]);
  const [series, setSeries] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  const [filters, setFilters] = useState(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() =>
    hasAdvancedFilters(initialFilters)
  );

  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const canManageCatalog = hasPermission(["catalog.manage_catalog"]);
  const backPath = canManageCatalog ? "/admin/dashboard" : "/admin/workspace";
  const backLabel = canManageCatalog ? "Volver al Dashboard" : "Volver a ToDo";

  const activeYear = filters.year || DEFAULT_YEAR;
  const specialFilterInfo = getSpecialFilterInfo(
    filters,
    canManageCatalog
  );
  const activeFiltersCount = getActiveFiltersCount(filters);
  const advancedFiltersActive = hasAdvancedFilters(filters);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setPage(1);

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function applyQuickFilter(type) {
    setPage(1);

    if (type === "all") {
      setSearchParams({}, { replace: true });
      setFilters(getEmptyFilters());
      setShowAdvancedFilters(false);
      return;
    }

    if (type === "active") {
      setSearchParams({ estado: "activo" }, { replace: true });
      setFilters({
        ...getEmptyFilters(),
        isActive: "true",
      });
      setShowAdvancedFilters(false);
      return;
    }

    if (type === "inactive") {
      setSearchParams({ estado: "inactivo" }, { replace: true });
      setFilters({
        ...getEmptyFilters(),
        isActive: "false",
      });
      setShowAdvancedFilters(false);
      return;
    }

    if (type === "withoutCover") {
      setSearchParams({ sin_portada: "1" }, { replace: true });
      setFilters({
        ...getEmptyFilters(),
        sinPortada: "1",
      });
      setShowAdvancedFilters(false);
      return;
    }

    if (type === "withoutPrice") {
      setSearchParams(
        {
          sin_precio: "1",
          anio: activeYear,
        },
        { replace: true }
      );

      setFilters({
        ...getEmptyFilters(),
        sinPrecio: "1",
        year: activeYear,
      });
      setShowAdvancedFilters(false);
    }
  }

  async function loadProducts(customPage = page) {
    setLoading(true);
    setError("");

    try {
      const params = buildProductParams(filters, customPage);
      const data = await getAdminProducts(params);

      setProducts(getResults(data));
      setPagination({
        count: data?.count || 0,
        next: data?.next || null,
        previous: data?.previous || null,
      });
    } catch {
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(product) {
    if (!canManageCatalog) return;

    const nextValue = !product.is_active;
    setUpdatingId(product.id);

    try {
      const updated = await updateAdminProduct(product.id, {
        is_active: nextValue,
      });

      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? updated : item))
      );
    } catch {
      alert("No se pudo actualizar el estado del producto.");
    } finally {
      setUpdatingId(null);
    }
  }

  function clearFilters() {
    setPage(1);
    setSearchParams({}, { replace: true });
    setFilters(getEmptyFilters());
    setShowAdvancedFilters(false);
  }

  useEffect(() => {
    let ignore = false;

    async function fetchFilters() {
      setLoadingFilters(true);

      try {
        const [
          providersData,
          levelsData,
          gradesData,
          areasData,
          seriesData,
          productTypesData,
        ] = await Promise.all([
          getAdminProviders(),
          getAdminLevels(),
          getAdminGrades(),
          getAdminAreas(),
          getAdminSeries(),
          getAdminProductTypes(),
        ]);

        if (!ignore) {
          setProviders(getResults(providersData));
          setLevels(getResults(levelsData));
          setGrades(getResults(gradesData));
          setAreas(getResults(areasData));
          setSeries(getResults(seriesData));
          setProductTypes(getResults(productTypesData));
        }
      } catch {
        // Si los selectores fallan, la tabla debe seguir funcionando.
      } finally {
        if (!ignore) {
          setLoadingFilters(false);
        }
      }
    }

    fetchFilters();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = buildProductParams(filters, page);
        const data = await getAdminProducts(params);

        if (!ignore) {
          setProducts(getResults(data));
          setPagination({
            count: data?.count || 0,
            next: data?.next || null,
            previous: data?.previous || null,
          });
        }
      } catch {
        if (!ignore) {
          setError("No se pudieron cargar los productos.");
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
              {canManageCatalog ? "Catálogo administrativo" : "Consulta de catálogo"}
            </p>

            <h1 className="mt-2 text-3xl font-black">Productos</h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              {canManageCatalog
                ? "Gestiona productos, clasificación, estado, portadas y precios del catálogo web de Book Express."
                : "Consulta productos, editoriales y clasificaciones disponibles para tu trabajo comercial."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={backPath}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaArrowLeft className="text-xs" />
              {backLabel}
            </Link>

            <button
              type="button"
              onClick={() => loadProducts(page)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            {canManageCatalog && (
              <Link
                to="/admin/productos/crear"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-800"
              >
                <FaPlus />
                Nuevo producto
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {specialFilterInfo && (
        <SpecialFilterBanner
          info={specialFilterInfo}
          total={pagination.count}
          backPath={backPath}
          backLabel={backLabel}
          onClear={clearFilters}
        />
      )}

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaFilter />
              Filtros
            </div>

            <h2 className="mt-2 text-xl font-black text-gray-950">
              Buscar y revisar productos
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

          <QuickFilterButton
            active={Boolean(filters.sinPortada)}
            label="Sin portada"
            onClick={() => applyQuickFilter("withoutCover")}
            tone="yellow"
          />

          <QuickFilterButton
            active={Boolean(filters.sinPrecio)}
            label={`Sin precio ${activeYear}`}
            onClick={() => applyQuickFilter("withoutPrice")}
            tone="red"
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
                placeholder="Nombre, código, SKU, editorial, área o grado..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <FilterSelect
            label="Editorial"
            name="provider"
            value={filters.provider}
            onChange={handleFilterChange}
            options={providers}
            disabled={loadingFilters}
          />

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Estado
            </label>

            <select
              name="isActive"
              value={filters.isActive}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            {showAdvancedFilters ? (
              <FaChevronUp className="text-xs" />
            ) : (
              <FaChevronDown className="text-xs" />
            )}
            {showAdvancedFilters
              ? "Ocultar filtros avanzados"
              : "Mostrar filtros avanzados"}
            {advancedFiltersActive && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-black text-red-700 ring-1 ring-red-100">
                activos
              </span>
            )}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label="Nivel"
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
              options={levels}
              disabled={loadingFilters}
            />

            <FilterSelect
              label="Grado"
              name="grade"
              value={filters.grade}
              onChange={handleFilterChange}
              options={grades}
              disabled={loadingFilters}
            />

            <FilterSelect
              label="Área"
              name="area"
              value={filters.area}
              onChange={handleFilterChange}
              options={areas}
              disabled={loadingFilters}
            />

            <FilterSelect
              label="Serie"
              name="series"
              value={filters.series}
              onChange={handleFilterChange}
              options={series}
              disabled={loadingFilters}
            />

            <FilterSelect
              label="Tipo"
              name="productType"
              value={filters.productType}
              onChange={handleFilterChange}
              options={productTypes}
              disabled={loadingFilters}
            />
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-black text-gray-950">Listado de productos</h2>

            <p className="mt-1 text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-black text-gray-950">
                {products.length}
              </span>{" "}
              de{" "}
              <span className="font-black text-gray-950">
                {pagination.count}
              </span>{" "}
              producto(s). Página{" "}
              <span className="font-black text-gray-950">{page}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Activos"
              value={products.filter((item) => item.is_active).length}
              tone="green"
            />

            <StatusPill
              label="Sin portada"
              value={products.filter((item) => !getHasCover(item)).length}
              tone="yellow"
            />

            <StatusPill
              label="Sin precio"
              value={products.filter((item) => !hasRegisteredPrice(item)).length}
              tone="red"
            />
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Cargando productos...
          </div>
        )}

        {!loading && error && (
          <div className="p-8 text-center text-red-700">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaSearch />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No se encontraron productos.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Cambia los filtros o limpia la búsqueda para ver más resultados.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
            >
              Ver todos los productos
            </button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <TableHead>Producto</TableHead>
                    <TableHead>Editorial</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Control</TableHead>
                    <TableHead>Estado</TableHead>
                    {canManageCatalog && <TableHead>Acciones</TableHead>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="align-top transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex gap-3">
                          <div
                            className={
                              getHasCover(product)
                                ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-100"
                                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100"
                            }
                          >
                            {getHasCover(product) ? (
                              <FaImage />
                            ) : (
                              <FaExclamationTriangle />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-2 font-black leading-5 text-gray-950">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              SKU: {product.sku || "-"} · Código:{" "}
                              {product.code || "-"}
                            </p>

                            {!getHasCover(product) && (
                              <p className="mt-2 inline-flex rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700 ring-1 ring-yellow-100">
                                Portada pendiente
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                          {getProductProvider(product)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-md flex-wrap gap-1.5">
                          <SmallBadge
                            label="Serie"
                            value={getProductSeries(product)}
                          />
                          <SmallBadge
                            label="Nivel"
                            value={getProductLevel(product)}
                          />
                          <SmallBadge
                            label="Grado"
                            value={getProductGrade(product)}
                          />
                          <SmallBadge
                            label="Área"
                            value={getProductArea(product)}
                          />
                          <SmallBadge
                            label="Tipo"
                            value={getProductType(product)}
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <p
                            className={
                              hasRegisteredPrice(product)
                                ? "font-black text-gray-950"
                                : "font-black text-red-700"
                            }
                          >
                            {getLatestPrice(product)}
                          </p>

                          <span className={getPriceStatusClass(product)}>
                            {getPriceStatusLabel(product)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            product.is_active
                              ? "inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                              : "inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100"
                          }
                        >
                          {product.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      {canManageCatalog && (
                        <td className="px-5 py-4">
                          <div className="flex min-w-32 flex-col gap-2">
                            <Link
                              to={`/admin/productos/${product.id}/editar`}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                            >
                              <FaPen className="text-xs" />
                              Editar
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(product)}
                              disabled={updatingId === product.id}
                              className={
                                product.is_active
                                  ? "rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                                  : "rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-70"
                              }
                            >
                              {updatingId === product.id
                                ? "Actualizando..."
                                : product.is_active
                                  ? "Desactivar"
                                  : "Activar"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
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

function SpecialFilterBanner({ info, total, backPath, backLabel, onClear }) {
  const styles = {
    red: "border-red-200 bg-red-50 text-red-700",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
    green: "border-green-200 bg-green-50 text-green-700",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  };

  return (
    <div
      className={`mt-6 rounded-3xl border p-5 ${
        styles[info.tone] || styles.gray
      }`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide">
            Vista filtrada
          </p>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            {info.title}
          </h2>

          <p className="mt-1 text-sm leading-6 opacity-80">
            {info.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl bg-white/70 px-4 py-2 text-center ring-1 ring-white/60">
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              Resultados
            </p>
            <p className="text-2xl font-black text-gray-950">{total}</p>
          </div>

          <Link
            to={backPath}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            <FaArrowLeft className="text-xs" />
            {backLabel}
          </Link>

          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            Quitar vista
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickFilterButton({ active, label, onClick, tone = "red" }) {
  const activeStyles = {
    red: "bg-red-700 text-white ring-red-700",
    green: "bg-green-700 text-white ring-green-700",
    yellow: "bg-yellow-500 text-gray-950 ring-yellow-500",
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

function StatusPill({ label, value, tone }) {
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

function SmallBadge({ label, value }) {
  if (!value || value === "-") {
    return null;
  }

  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
      <span className="text-gray-400">{label}:</span> {value}
    </span>
  );
}

function FilterSelect({ label, name, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
      >
        <option value="">Todos</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {getName(option)}
          </option>
        ))}
      </select>
    </div>
  );
}