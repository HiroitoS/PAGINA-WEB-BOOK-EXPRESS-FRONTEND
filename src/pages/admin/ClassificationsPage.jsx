import { useEffect, useMemo, useState } from "react";
import {
  createAdminArea,
  createAdminGrade,
  createAdminLevel,
  createAdminProductType,
  createAdminSeries,
  getAdminAreas,
  getAdminGrades,
  getAdminLevels,
  getAdminProductTypes,
  getAdminProviders,
  getAdminSeries,
  updateAdminArea,
  updateAdminGrade,
  updateAdminLevel,
  updateAdminProductType,
  updateAdminSeries,
} from "../../api/adminApi";
import { getDisplayName, getResults } from "../../utils/formatters";

const sections = [
  { key: "levels", label: "Niveles" },
  { key: "grades", label: "Grados" },
  { key: "areas", label: "Áreas" },
  { key: "series", label: "Series" },
  { key: "productTypes", label: "Tipos de producto" },
];

function getInitialForm(section) {
  if (section === "grades") {
    return {
      name: "",
      order: 0,
      is_active: true,
    };
  }

  if (section === "series") {
    return {
      name: "",
      provider: "",
      is_active: true,
    };
  }

  return {
    name: "",
    is_active: true,
  };
}

function normalizeSearch(value) {
  return String(value || "").toLowerCase().trim();
}

function filterItems(items, search) {
  const term = normalizeSearch(search);

  if (!term) {
    return items;
  }

  return items.filter((item) => {
    const text = [
      item.name,
      item.slug,
      item.provider_name,
      item.order,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(term);
  });
}

function getSectionTitle(section) {
  const item = sections.find((entry) => entry.key === section);
  return item?.label || "Clasificaciones";
}

export default function ClassificationsPage() {
  const [activeSection, setActiveSection] = useState("levels");

  const [levels, setLevels] = useState([]);
  const [grades, setGrades] = useState([]);
  const [areas, setAreas] = useState([]);
  const [series, setSeries] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [providers, setProviders] = useState([]);

  const [form, setForm] = useState(getInitialForm("levels"));
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentItems = useMemo(() => {
    if (activeSection === "levels") return levels;
    if (activeSection === "grades") return grades;
    if (activeSection === "areas") return areas;
    if (activeSection === "series") return series;
    if (activeSection === "productTypes") return productTypes;

    return [];
  }, [activeSection, levels, grades, areas, series, productTypes]);

  const filteredItems = useMemo(
    () => filterItems(currentItems, search),
    [currentItems, search]
  );

  function handleSectionChange(section) {
    setActiveSection(section);
    setForm(getInitialForm(section));
    setEditingId(null);
    setSearch("");
    setError("");
    setSuccessMessage("");
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm(getInitialForm(activeSection));
    setEditingId(null);
    setError("");
    setSuccessMessage("");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setError("");
    setSuccessMessage("");

    if (activeSection === "grades") {
      setForm({
        name: item.name || "",
        order: item.order || 0,
        is_active: Boolean(item.is_active),
      });
      return;
    }

    if (activeSection === "series") {
      setForm({
        name: item.name || "",
        provider: item.provider ? String(item.provider) : "",
        is_active: Boolean(item.is_active),
      });
      return;
    }

    setForm({
      name: item.name || "",
      is_active: Boolean(item.is_active),
    });
  }

  async function loadClassifications() {
    setLoading(true);
    setError("");

    try {
      const [
        levelsData,
        gradesData,
        areasData,
        seriesData,
        productTypesData,
        providersData,
      ] = await Promise.all([
        getAdminLevels(),
        getAdminGrades(),
        getAdminAreas(),
        getAdminSeries(),
        getAdminProductTypes(),
        getAdminProviders(),
      ]);

      setLevels(getResults(levelsData));
      setGrades(getResults(gradesData));
      setAreas(getResults(areasData));
      setSeries(getResults(seriesData));
      setProductTypes(getResults(productTypesData));
      setProviders(getResults(providersData));
    } catch (err) {
      console.error("Error cargando clasificaciones:", err);
      setError("No se pudieron cargar las clasificaciones.");
    } finally {
      setLoading(false);
    }
  }

  function buildPayload() {
    if (activeSection === "grades") {
      return {
        name: form.name.trim(),
        order: Number(form.order || 0),
        is_active: form.is_active,
      };
    }

    if (activeSection === "series") {
      return {
        name: form.name.trim(),
        provider: form.provider ? Number(form.provider) : null,
        is_active: form.is_active,
      };
    }

    return {
      name: form.name.trim(),
      is_active: form.is_active,
    };
  }

  async function createItem(payload) {
    if (activeSection === "levels") return createAdminLevel(payload);
    if (activeSection === "grades") return createAdminGrade(payload);
    if (activeSection === "areas") return createAdminArea(payload);
    if (activeSection === "series") return createAdminSeries(payload);
    if (activeSection === "productTypes") return createAdminProductType(payload);

    throw new Error("Sección no válida.");
  }

  async function updateItem(id, payload) {
    if (activeSection === "levels") return updateAdminLevel(id, payload);
    if (activeSection === "grades") return updateAdminGrade(id, payload);
    if (activeSection === "areas") return updateAdminArea(id, payload);
    if (activeSection === "series") return updateAdminSeries(id, payload);
    if (activeSection === "productTypes") {
      return updateAdminProductType(id, payload);
    }

    throw new Error("Sección no válida.");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (activeSection === "series" && !form.provider) {
      setError("Debes seleccionar un proveedor/editorial para la serie.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = buildPayload();

      if (editingId) {
        await updateItem(editingId, payload);
        setSuccessMessage("Registro actualizado correctamente.");
      } else {
        await createItem(payload);
        setSuccessMessage("Registro creado correctamente.");
      }

      resetForm();
      await loadClassifications();
    } catch (err) {
      console.error("Error guardando clasificación:", err);

      const backendData = err?.response?.data;

      if (backendData && typeof backendData === "object") {
        setError(JSON.stringify(backendData));
      } else {
        setError("No se pudo guardar el registro.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item) {
    const nextValue = !item.is_active;

    setUpdatingId(item.id);
    setError("");
    setSuccessMessage("");

    try {
      await updateItem(item.id, {
        is_active: nextValue,
      });

      setSuccessMessage("Estado actualizado correctamente.");
      await loadClassifications();
    } catch (err) {
      console.error("Error actualizando estado:", err);
      setError("No se pudo actualizar el estado.");
    } finally {
      setUpdatingId(null);
    }
  }

 useEffect(() => {
  let ignore = false;

  async function fetchInitialClassifications() {
    try {
      const [
        levelsData,
        gradesData,
        areasData,
        seriesData,
        productTypesData,
        providersData,
      ] = await Promise.all([
        getAdminLevels(),
        getAdminGrades(),
        getAdminAreas(),
        getAdminSeries(),
        getAdminProductTypes(),
        getAdminProviders(),
      ]);

      if (!ignore) {
        setLevels(getResults(levelsData));
        setGrades(getResults(gradesData));
        setAreas(getResults(areasData));
        setSeries(getResults(seriesData));
        setProductTypes(getResults(productTypesData));
        setProviders(getResults(providersData));
      }
    } catch (err) {
      console.error("Error cargando clasificaciones:", err);

      if (!ignore) {
        setError("No se pudieron cargar las clasificaciones.");
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  }

  fetchInitialClassifications();

  return () => {
    ignore = true;
  };
}, []);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-black text-gray-950">
          Clasificaciones
        </h1>
        <p className="mt-2 text-gray-600">
          Administra las listas maestras que ordenan el catálogo: niveles,
          grados, áreas, series y tipos de producto.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => handleSectionChange(section.key)}
            className={
              activeSection === section.key
                ? "rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            }
          >
            {section.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-black text-gray-950">
              {editingId
                ? `Editar ${getSectionTitle(activeSection)}`
                : `Crear ${getSectionTitle(activeSection)}`}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Estos datos se usan en productos, filtros del catálogo y ficha de
              producto.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-700"
              placeholder="Nombre de la clasificación"
            />
          </div>

          {activeSection === "grades" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Orden
              </label>
              <input
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-700"
                placeholder="0"
              />
            </div>
          )}

          {activeSection === "series" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Proveedor / editorial *
              </label>
              <select
                name="provider"
                value={form.provider}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-700"
              >
                <option value="">Seleccionar proveedor</option>

                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {getDisplayName(provider)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Activo
            </label>
            <p className="mt-2 text-xs text-gray-500">
              Si está activo, podrá usarse en productos y filtros.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving
              ? "Guardando..."
              : editingId
                ? "Guardar cambios"
                : "Crear registro"}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Buscar en {getSectionTitle(activeSection).toLowerCase()}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-700"
            />
          </div>

          <button
            type="button"
            onClick={loadClassifications}
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading && (
          <div className="p-8 text-center text-gray-600">
            Cargando clasificaciones...
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-semibold text-gray-950">
              No se encontraron registros.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Puedes crear uno desde el formulario superior.
            </p>
          </div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Nombre
                  </th>

                  {activeSection === "series" && (
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Editorial
                    </th>
                  )}

                  {activeSection === "grades" && (
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Orden
                    </th>
                  )}

                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Slug
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Estado
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-gray-950">
                      {item.name}
                    </td>

                    {activeSection === "series" && (
                      <td className="px-4 py-4">
                        {item.provider_name || "-"}
                      </td>
                    )}

                    {activeSection === "grades" && (
                      <td className="px-4 py-4">{item.order}</td>
                    )}

                    <td className="px-4 py-4 text-gray-600">
                      {item.slug || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={
                          item.is_active
                            ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                            : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                        }
                      >
                        {item.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={updatingId === item.id}
                          className={
                            item.is_active
                              ? "rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70"
                              : "rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-70"
                          }
                        >
                          {updatingId === item.id
                            ? "Actualizando..."
                            : item.is_active
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
        )}
      </div>
    </div>
  );
}