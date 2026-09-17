import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import ProductCard from "../../components/public/ProductCard";
import {
  getPublicAreas,
  getPublicGrades,
  getPublicLevels,
  getPublicProductTypes,
  getPublicProducts,
  getPublicProviders,
} from "../../api/publicApi";
import { getResults } from "../../utils/formatters";

const PAGE_SIZE = 20;

export default function CatalogPage() {
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [levels, setLevels] = useState([]);
  const [grades, setGrades] = useState([]);
  const [areas, setAreas] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  const [filters, setFilters] = useState(() => ({
    search: searchParams.get("search") || "",
    provider: searchParams.get("provider") || "",
    level: searchParams.get("level") || "",
    grade: searchParams.get("grade") || "",
    area: searchParams.get("area") || "",
    productType: searchParams.get("productType") || "",
  }));

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState("");

  const totalProducts = pagination.count || products.length;
  const totalPages = Math.max(Math.ceil(totalProducts / PAGE_SIZE), 1);
  const startItem = products.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = products.length > 0 ? startItem + products.length - 1 : 0;

  const activeFilters = useMemo(
    () =>
      [
        {
          key: "search",
          label: "Búsqueda",
          value: filters.search,
        },
        {
          key: "provider",
          label: "Editorial",
          value: getOptionLabelByValue(providers, filters.provider),
        },
        {
          key: "level",
          label: "Nivel",
          value: getOptionLabelByValue(levels, filters.level),
        },
        {
          key: "grade",
          label: "Grado",
          value: getOptionLabelByValue(grades, filters.grade),
        },
        {
          key: "area",
          label: "Área",
          value: getOptionLabelByValue(areas, filters.area),
        },
        {
          key: "productType",
          label: "Tipo",
          value: getOptionLabelByValue(productTypes, filters.productType),
        },
      ].filter((item) => item.value),
    [areas, filters, grades, levels, productTypes, providers]
  );

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPage(1);
  }

  function removeFilter(filterKey) {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: "",
    }));

    setPage(1);
  }

  function clearFilters() {
    setFilters({
      search: "",
      provider: "",
      level: "",
      grade: "",
      area: "",
      productType: "",
    });

    setPage(1);
  }

  function goToPreviousPage() {
    setPage((currentPage) => Math.max(currentPage - 1, 1));
  }

  function goToNextPage() {
    setPage((currentPage) => currentPage + 1);
  }

  useEffect(() => {
    let ignore = false;

    async function fetchFilters() {
      try {
        const [
          providersData,
          levelsData,
          gradesData,
          areasData,
          productTypesData,
        ] = await Promise.all([
          getPublicProviders(),
          getPublicLevels(),
          getPublicGrades(),
          getPublicAreas(),
          getPublicProductTypes(),
        ]);

        if (ignore) return;

        setProviders(getResults(providersData));
        setLevels(getResults(levelsData));
        setGrades(getResults(gradesData));
        setAreas(getResults(areasData));
        setProductTypes(getResults(productTypesData));
      } catch {
        // Si algún selector no carga, el catálogo debe seguir funcionando.
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
      const params = {
        page,
      };

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

      if (filters.productType) {
        params.product_type = filters.productType;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getPublicProducts(params);

        if (ignore) return;

        setProducts(getResults(data));
        setPagination({
          count: data?.count || 0,
          next: data?.next || null,
          previous: data?.previous || null,
        });
      } catch {
        if (!ignore) {
          setError(
            "No se pudo cargar el catálogo. Inténtalo nuevamente en unos minutos."
          );
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
    <section className="bg-gray-50">
      <div className="bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-10 text-white">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-sm font-black uppercase tracking-wide text-red-400"
          >
            Catálogo Book Express
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-4xl"
          >
            Libros y materiales educativos
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-3 max-w-3xl text-sm leading-6 text-gray-300 md:text-base"
          >
            Busca textos escolares, plan lector y materiales educativos por
            editorial, nivel, grado o área.
          </motion.p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-red-700">
                Búsqueda del catálogo
              </p>

              <h2 className="mt-1 text-xl font-black text-gray-950">
                Encuentra el material que necesitas
              </h2>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={activeFilters.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaTimes className="text-xs" />
              Limpiar búsqueda
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="lg:col-span-5">
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Buscar
              </label>

              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Buscar por libro, editorial, curso o grado..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-11 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-700 focus:ring-2 focus:ring-red-100"
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
              label="Tipo"
              name="productType"
              value={filters.productType}
              onChange={handleFilterChange}
              options={productTypes}
              disabled={loadingFilters}
            />
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => removeFilter(item.key)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                >
                  <span className="text-gray-300">{item.label}:</span>
                  <span>{item.value}</span>
                  <FaTimes className="text-[10px]" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          {loading && <CatalogLoading />}

          {!loading && error && (
            <div className="rounded-3xl bg-red-50 p-8 text-center font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                <FaSearch />
              </div>

              <p className="mt-4 text-lg font-black text-gray-950">
                No se encontraron productos.
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                Intenta cambiar la búsqueda o seleccionar otra editorial, nivel,
                grado o área.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
              >
                Ver todo el catálogo
              </button>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <>
              <CatalogToolbar
                startItem={startItem}
                endItem={endItem}
                totalProducts={totalProducts}
                page={page}
                totalPages={totalPages}
                pagination={pagination}
                onPrevious={goToPreviousPage}
                onNext={goToNextPage}
              />

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.03,
                    },
                  },
                }}
                className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id || product.slug}
                    product={product}
                  />
                ))}
              </motion.div>

              <div className="mt-7">
                <CatalogPagination
                  page={page}
                  totalPages={totalPages}
                  pagination={pagination}
                  onPrevious={goToPreviousPage}
                  onNext={goToNextPage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CatalogLoading() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-48 animate-pulse bg-gray-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-gray-100" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-gray-100" />
            <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CatalogToolbar({
  startItem,
  endItem,
  totalProducts,
  page,
  totalPages,
  pagination,
  onPrevious,
  onNext,
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center">
      <p className="text-sm font-medium text-gray-600">
        Mostrando{" "}
        <span className="font-black text-gray-950">
          {startItem}-{endItem}
        </span>{" "}
        de <span className="font-black text-gray-950">{totalProducts}</span>{" "}
        producto(s). Página{" "}
        <span className="font-black text-gray-950">{page}</span> de{" "}
        <span className="font-black text-gray-950">{totalPages}</span>
      </p>

      <PaginationActions
        pagination={pagination}
        page={page}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}

function CatalogPagination({
  page,
  totalPages,
  pagination,
  onPrevious,
  onNext,
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm md:flex-row">
      <p className="text-sm font-medium text-gray-600">
        Página <span className="font-black text-gray-950">{page}</span> de{" "}
        <span className="font-black text-gray-950">{totalPages}</span>
      </p>

      <PaginationActions
        pagination={pagination}
        page={page}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}

function PaginationActions({ pagination, page, onPrevious, onNext }) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!pagination.previous || page <= 1}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FaChevronLeft className="text-xs" />
        Anterior
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!pagination.next}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Siguiente
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
}

function getOptionLabel(option) {
  return (
    option?.name ||
    option?.nombre ||
    option?.title ||
    option?.display_name ||
    option?.label ||
    option?.slug ||
    "Sin nombre"
  );
}

function getOptionValue(option) {
  return option?.slug || option?.id || "";
}

function getOptionLabelByValue(options, value) {
  if (!value) return "";

  const foundOption = options.find(
    (option) => String(getOptionValue(option)) === String(value)
  );

  return foundOption ? getOptionLabel(foundOption) : value;
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
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="" className="bg-white text-gray-900">
          Todos
        </option>

        {options.map((option) => {
          const optionValue = getOptionValue(option);
          const optionLabel = getOptionLabel(option);

          return (
            <option
              key={optionValue}
              value={optionValue}
              className="bg-white text-gray-900"
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}