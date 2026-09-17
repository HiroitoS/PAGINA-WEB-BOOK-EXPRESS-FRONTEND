import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaBookOpen,
  FaCheckCircle,
  FaFilter,
  FaImage,
  FaPen,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import {
  createAdminProvider,
  getAdminProviders,
  updateAdminProvider,
} from "../../api/adminApi";
import { getResults } from "../../utils/formatters";

function getEmptyFilters() {
  return {
    search: "",
    isActive: "",
  };
}

function getInitialFilters(searchParams) {
  const estado = searchParams.get("estado");

  return {
    search: searchParams.get("search") || "",
    isActive:
      searchParams.get("is_active") ||
      (estado === "activo" ? "true" : estado === "inactivo" ? "false" : ""),
  };
}

function buildProviderParams(filters, page) {
  const params = {};

  if (filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.isActive) {
    params.is_active = filters.isActive;
  }

  params.page = page;

  return params;
}

function getProviderLogo(provider) {
  if (!provider.logo) {
    return "";
  }

  const value = String(provider.logo);

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const backendBaseUrl = apiBaseUrl.replace("/api", "");

  if (value.startsWith("/media/")) {
    return `${backendBaseUrl}${value}`;
  }

  if (value.startsWith("media/")) {
    return `${backendBaseUrl}/${value}`;
  }

  return value;
}

function sortProvidersByName(items) {
  return [...items].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    })
  );
}

function getInitialForm() {
  return {
    name: "",
    business_name: "",
    ruc: "",
    description: "",
    website: "",
    is_active: true,
  };
}

function buildProviderFormData(form, logoFile = null) {
  const payload = new FormData();

  payload.append("name", form.name.trim());
  payload.append("business_name", form.business_name.trim());
  payload.append("ruc", form.ruc.trim());
  payload.append("description", form.description.trim());
  payload.append("website", form.website.trim());
  payload.append("is_active", form.is_active ? "true" : "false");

  if (logoFile) {
    payload.append("logo", logoFile);
  }

  return payload;
}

function getActiveFiltersCount(filters) {
  return [filters.search, filters.isActive].filter(Boolean).length;
}

export default function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState([]);

  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));

  const [form, setForm] = useState(getInitialForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeFiltersCount = getActiveFiltersCount(filters);
  const activeProvidersOnPage = providers.filter((item) => item.is_active).length;
  const inactiveProvidersOnPage = providers.filter(
    (item) => !item.is_active
  ).length;
  const providersWithoutLogoOnPage = providers.filter(
    (item) => !getProviderLogo(item)
  ).length;

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setPage(1);

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setLogoFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Debes seleccionar un archivo de imagen válido.");
      setLogoFile(null);
      return;
    }

    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function applyQuickFilter(type) {
    setPage(1);

    if (type === "all") {
      setSearchParams({}, { replace: true });
      setFilters(getEmptyFilters());
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

  function resetForm() {
    setForm(getInitialForm());
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview("");
    setShowForm(false);
    setError("");
    setSuccessMessage("");
  }

  function openCreateForm() {
    setForm(getInitialForm());
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview("");
    setShowForm(true);
    setError("");
    setSuccessMessage("");
  }

  function startEditProvider(provider) {
    setEditingId(provider.id);
    setShowForm(true);
    setError("");
    setSuccessMessage("");
    setLogoFile(null);
    setLogoPreview(getProviderLogo(provider));

    setForm({
      name: provider.name || "",
      business_name: provider.business_name || "",
      ruc: provider.ruc || "",
      description: provider.description || "",
      website: provider.website || "",
      is_active: Boolean(provider.is_active),
    });
  }

  async function loadProviders(customPage = page) {
    setLoading(true);
    setError("");

    try {
      const params = buildProviderParams(filters, customPage);
      const data = await getAdminProviders(params);

      setProviders(sortProvidersByName(getResults(data)));
      setPagination({
        count: data?.count || 0,
        next: data?.next || null,
        previous: data?.previous || null,
      });
    } catch {
      setError("No se pudieron cargar las editoriales.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("El nombre comercial es obligatorio.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    const payload = buildProviderFormData(form, logoFile);

    try {
      if (editingId) {
        await updateAdminProvider(editingId, payload);
        setSuccessMessage("Editorial actualizada correctamente.");
      } else {
        await createAdminProvider(payload);
        setSuccessMessage("Editorial creada correctamente.");
      }

      resetForm();
      setPage(1);
      await loadProviders(1);
    } catch {
      setError("No se pudo guardar la editorial. Revisa los datos.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(provider) {
    const nextValue = !provider.is_active;

    setUpdatingId(provider.id);
    setError("");
    setSuccessMessage("");

    try {
      const updated = await updateAdminProvider(provider.id, {
        is_active: nextValue,
      });

      setProviders((prev) => {
        if (filters.isActive === "true" && !updated.is_active) {
          return prev.filter((item) => item.id !== provider.id);
        }

        if (filters.isActive === "false" && updated.is_active) {
          return prev.filter((item) => item.id !== provider.id);
        }

        return prev.map((item) => (item.id === provider.id ? updated : item));
      });

      setSuccessMessage("Estado de la editorial actualizado correctamente.");
    } catch {
      setError("No se pudo actualizar el estado de la editorial.");
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
        const params = buildProviderParams(filters, page);
        const data = await getAdminProviders(params);

        if (!ignore) {
          setProviders(sortProvidersByName(getResults(data)));
          setPagination({
            count: data?.count || 0,
            next: data?.next || null,
            previous: data?.previous || null,
          });
        }
      } catch {
        if (!ignore) {
          setError("No se pudieron cargar las editoriales.");
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
              Catálogo administrativo
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Editoriales y proveedores
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Administra las editoriales que organizan el catálogo público de
              Book Express.
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
              onClick={() => loadProviders(page)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-800"
            >
              <FaPlus />
              Nueva editorial
            </button>
          </div>
        </div>
      </motion.div>

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

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={FaBookOpen}
          label="Total en vista"
          value={providers.length}
          description={`${pagination.count} resultado(s) según filtros`}
          tone="dark"
        />

        <SummaryCard
          icon={FaCheckCircle}
          label="Activas en vista"
          value={activeProvidersOnPage}
          description="Disponibles para organizar productos"
          tone="green"
        />

        <SummaryCard
          icon={FaImage}
          label="Sin logo en vista"
          value={providersWithoutLogoOnPage}
          description="Pendientes de imagen institucional"
          tone="yellow"
        />
      </section>

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaFilter />
              Filtros
            </div>

            <h2 className="mt-2 text-xl font-black text-gray-950">
              Buscar editoriales
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
            label="Todas"
            onClick={() => applyQuickFilter("all")}
          />

          <QuickFilterButton
            active={filters.isActive === "true"}
            label="Activas"
            onClick={() => applyQuickFilter("active")}
            tone="green"
          />

          <QuickFilterButton
            active={filters.isActive === "false"}
            label="Inactivas"
            onClick={() => applyQuickFilter("inactive")}
            tone="gray"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Buscar editorial
            </label>

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Buscar por nombre, razón social o RUC..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

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
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>
        </div>
      </section>

      {showForm && (
        <ProviderForm
          form={form}
          editingId={editingId}
          logoPreview={logoPreview}
          logoFile={logoFile}
          saving={saving}
          onChange={handleChange}
          onLogoChange={handleLogoChange}
          onRemoveLogo={() => {
            setLogoFile(null);
            setLogoPreview("");
          }}
          onCancel={resetForm}
          onSubmit={handleSubmit}
        />
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-black text-gray-950">
              Listado de editoriales
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-black text-gray-950">
                {providers.length}
              </span>{" "}
              de{" "}
              <span className="font-black text-gray-950">
                {pagination.count}
              </span>{" "}
              resultado(s). Página{" "}
              <span className="font-black text-gray-950">{page}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label="Activas" value={activeProvidersOnPage} />
            <StatusPill
              label="Inactivas"
              value={inactiveProvidersOnPage}
              tone="gray"
            />
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Cargando editoriales...
          </div>
        )}

        {!loading && providers.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
              <FaSearch />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No se encontraron editoriales.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Cambia los filtros o registra una nueva editorial.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
            >
              Nueva editorial
            </button>
          </div>
        )}

        {!loading && providers.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <TableHead>Editorial</TableHead>
                    <TableHead>Razón social</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {providers.map((provider) => (
                    <tr
                      key={provider.id}
                      className="align-top transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {getProviderLogo(provider) ? (
                            <img
                              src={getProviderLogo(provider)}
                              alt={provider.name}
                              className="h-14 w-20 rounded-xl bg-gray-50 object-contain p-2 ring-1 ring-gray-100"
                            />
                          ) : (
                            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-yellow-50 text-xs font-black text-yellow-700 ring-1 ring-yellow-100">
                              Sin logo
                            </div>
                          )}

                          <div>
                            <p className="font-black text-gray-950">
                              {provider.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {provider.website || "Sin sitio web"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {provider.business_name || "-"}
                      </td>

                      <td className="px-5 py-4">{provider.ruc || "-"}</td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            provider.is_active
                              ? "inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100"
                              : "inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100"
                          }
                        >
                          {provider.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex min-w-32 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => startEditProvider(provider)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                          >
                            <FaPen className="text-xs" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(provider)}
                            disabled={updatingId === provider.id}
                            className={
                              provider.is_active
                                ? "rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                                : "rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-70"
                            }
                          >
                            {updatingId === provider.id
                              ? "Actualizando..."
                              : provider.is_active
                                ? "Desactivar"
                                : "Activar"}
                          </button>
                        </div>
                      </td>
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
                  className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ProviderForm({
  form,
  editingId,
  logoPreview,
  logoFile,
  saving,
  onChange,
  onLogoChange,
  onRemoveLogo,
  onCancel,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-3xl border border-red-100 bg-white p-6 shadow-sm ring-1 ring-red-50"
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            {editingId ? "Edición de editorial" : "Nueva editorial"}
          </p>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            {editingId ? "Editar datos de editorial" : "Registrar editorial"}
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Completa solo información real disponible. No uses datos
            referenciales si no están confirmados.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
        >
          <FaTimes className="text-xs" />
          Cancelar
        </button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <InputField
          label="Nombre comercial *"
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Ejemplo: Santillana"
        />

        <InputField
          label="Razón social"
          name="business_name"
          value={form.business_name}
          onChange={onChange}
          placeholder="Razón social de la editorial"
        />

        <InputField
          label="RUC"
          name="ruc"
          value={form.ruc}
          onChange={onChange}
          placeholder="RUC"
        />

        <InputField
          label="Sitio web"
          name="website"
          type="url"
          value={form.website}
          onChange={onChange}
          placeholder="https://..."
        />

        <div className="rounded-2xl border border-gray-200 p-4">
          <label className="flex items-center gap-3 text-sm font-bold text-gray-800">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={onChange}
              className="h-4 w-4"
            />
            Editorial activa
          </label>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Si está activa, podrá usarse para organizar productos del catálogo.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-800">
            Logo
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={onLogoChange}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
          />

          <p className="mt-1 text-xs text-gray-500">
            Opcional. Úsalo para mostrar editoriales de forma más profesional.
          </p>
        </div>

        {logoPreview && (
          <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <img
                src={logoPreview}
                alt="Logo de editorial"
                className="h-20 w-36 rounded-xl bg-white object-contain p-3 shadow-sm"
              />

              <div>
                <p className="text-sm font-black text-gray-950">
                  Vista previa del logo
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Al guardar, la imagen quedará asociada a la editorial.
                </p>

                {logoFile && (
                  <button
                    type="button"
                    onClick={onRemoveLogo}
                    className="mt-3 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
                  >
                    Quitar imagen seleccionada
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-gray-800">
            Descripción
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={4}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            placeholder="Descripción breve de la editorial."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving
            ? "Guardando..."
            : editingId
              ? "Guardar cambios"
              : "Crear editorial"}
        </button>
      </div>
    </form>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
        placeholder={placeholder}
      />
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
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
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