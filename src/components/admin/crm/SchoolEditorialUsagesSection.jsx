import { useEffect, useState } from "react";
import {
  FaBook,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";

import {
  createCRMMarketEditorial,
  createCRMSchoolEditorialUsage,
  getCRMMarketEditorials,
  getCRMReferenceAreas,
  getCRMSchool,
  updateCRMSchoolEditorialUsage,
} from "../../../api/crmApi";

const NEW_EDITORIAL_VALUE = "__new__";
const CURRENT_YEAR = new Date().getFullYear();

const EMPTY_FORM = {
  editorialId: "",
  newEditorialName: "",  
  serviceId: "",
  areaId: "",
  productName: "",
  year: String(CURRENT_YEAR),
  status: "current",
  notes: "",
};

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail.join(" ");
  }

  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flatMap((value) => {
        if (Array.isArray(value)) {
          return value;
        }

        if (typeof value === "string") {
          return [value];
        }

        return [];
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

function getEditorialName(usage) {
  return (
    usage?.editorial?.name ||
    usage?.provider?.name ||
    "Editorial sin identificar"
  );
}

function EditorialOriginBadge({ usage }) {
  if (
    usage?.editorial?.is_catalog_editorial ||
    (!usage?.editorial && usage?.provider)
  ) {
    return (
      <span className="inline-flex rounded-full bg-gray-950 px-2.5 py-1 text-xs font-black text-white">
        Book Express
      </span>
    );
  }

  if (usage?.editorial?.verification_status === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
        Por validar
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600 ring-1 ring-gray-200">
      Mercado
    </span>
  );
}

export default function SchoolEditorialUsagesSection({
  school,
  onSchoolUpdated,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingUsageId, setEditingUsageId] = useState(null);

  const [editorials, setEditorials] = useState([]);
  const [areas, setAreas] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [loadingReferences, setLoadingReferences] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const usages = Array.isArray(school?.editorial_usages)
    ? school.editorial_usages
    : [];

  const services = Array.isArray(school?.educational_services)
    ? school.educational_services.filter((service) => service.is_active)
    : [];

  useEffect(() => {
    if (!formOpen) {
      return undefined;
    }

    let ignore = false;

    async function loadReferences() {
      try {
        setLoadingReferences(true);
        setErrorMessage("");

        const [editorialsData, areasData] = await Promise.all([
          getCRMMarketEditorials(),
          getCRMReferenceAreas(),
        ]);

        if (!ignore) {
          setEditorials(editorialsData);
          setAreas(areasData);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar las opciones del formulario.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingReferences(false);
        }
      }
    }

    loadReferences();

    return () => {
      ignore = true;
    };
  }, [formOpen]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeForm() {
    setFormOpen(false);
    setEditingUsageId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
  }

  function openCreateForm() {
    setEditingUsageId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  }

  function openEditForm(usage) {
    setEditingUsageId(usage.id);

    setForm({
      editorialId: usage.editorial?.id
        ? String(usage.editorial.id)
        : "",
      newEditorialName: "",
      serviceId: usage.service?.id
        ? String(usage.service.id)
        : "",
      areaId: usage.area?.id
        ? String(usage.area.id)
        : "",
      productName: usage.product_name || "",
      year: String(usage.year || CURRENT_YEAR),
      status: usage.status || "reported",
      notes: usage.notes || "",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  }

  async function refreshSchool() {
    const refreshedSchool = await getCRMSchool(school.id);
    onSchoolUpdated(refreshedSchool);
  }

  async function resolveEditorialId() {
    if (form.editorialId !== NEW_EDITORIAL_VALUE) {
      return Number(form.editorialId);
    }

    const name = form.newEditorialName.trim();

    if (!name) {
      throw new Error(
        "Escribe el nombre de la editorial que deseas registrar.",
      );
    }

    const editorial = await createCRMMarketEditorial({
      name,
    });

    return editorial.id;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.editorialId) {
      setErrorMessage("Selecciona una editorial.");
      return;
    }

    const year = Number(form.year);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setErrorMessage("Ingresa un año válido.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const editorialId = await resolveEditorialId();

      const payload = {
        editorial: editorialId,
        year,
        status: form.status,
        notes: form.notes.trim(),
        product_name: form.productName.trim(),
        service: form.serviceId
          ? Number(form.serviceId)
          : null,
        area: form.areaId
          ? Number(form.areaId)
          : null,
      };

      if (editingUsageId) {
        await updateCRMSchoolEditorialUsage(
          school.id,
          editingUsageId,
          payload,
        );
      } else {
        await createCRMSchoolEditorialUsage(
          school.id,
          payload,
        );
      }

      await refreshSchool();

      setSuccessMessage(
        editingUsageId
          ? "La información editorial fue actualizada."
          : "La editorial fue registrada en el colegio.",
      );

      setFormOpen(false);
      setEditingUsageId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      if (
        error instanceof Error &&
        !error?.response
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          getErrorMessage(
            error,
            "No se pudo guardar la información editorial.",
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Inteligencia comercial
          </p>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            Editoriales identificadas
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Registra las editoriales y áreas que utiliza actualmente el colegio.
          </p>
        </div>

        {!formOpen ? (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
          >
            <FaPlus />
            Agregar editorial
          </button>
        ) : null}
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-gray-950">
                {editingUsageId
                  ? "Editar información editorial"
                  : "Agregar editorial"}
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Si la editorial no aparece, puede registrarse para validación
                sin agregarla al catálogo de Book Express.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
              aria-label="Cerrar formulario"
            >
              <FaTimes />
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="xl:col-span-2">
              <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Editorial
              </span>

              <select
                value={form.editorialId}
                onChange={(event) =>
                  updateField(
                    "editorialId",
                    event.target.value,
                  )
                }
                disabled={loadingReferences || saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">
                  Seleccionar editorial
                </option>

                {editorials.map((editorial) => (
                  <option
                    key={editorial.id}
                    value={editorial.id}
                  >
                    {editorial.name}
                  </option>
                ))}

                <option value={NEW_EDITORIAL_VALUE}>
                  + Registrar otra editorial
                </option>
              </select>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Nivel
              </span>

              <select
                value={form.serviceId}
                onChange={(event) =>
                  updateField(
                    "serviceId",
                    event.target.value,
                  )
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">
                  Todos / No especificado
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.level?.name ||
                      "Nivel educativo"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Área
              </span>

              <select
                value={form.areaId}
                onChange={(event) =>
                  updateField(
                    "areaId",
                    event.target.value,
                  )
                }
                disabled={loadingReferences || saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="">
                  No especificada
                </option>

                {areas.map((area) => (
                  <option
                    key={area.id}
                    value={area.id}
                  >
                    {area.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Año
              </span>

              <input
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(event) =>
                  updateField(
                    "year",
                    event.target.value,
                  )
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </label>
          </div>

          {form.editorialId === NEW_EDITORIAL_VALUE ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-amber-800">
                  Nombre de la nueva editorial
                </span>

                <input
                  type="text"
                  value={form.newEditorialName}
                  onChange={(event) =>
                    updateField(
                      "newEditorialName",
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  placeholder="Ej. Editorial Centauro"
                  className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <p className="mt-2 text-xs leading-5 text-amber-800">
                Quedará pendiente de validación y no será agregada
                automáticamente al catálogo público.
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Producto / serie observada
            </span>

            <input
                type="text"
                value={form.productName}
                onChange={(event) =>
                updateField("productName", event.target.value)
                }
                disabled={saving}
                placeholder="Ej. Matemática Activa, Comunicación 5..."
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            </label>
            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Situación
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target.value,
                  )
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="current">
                  Uso actual
                </option>

                <option value="reported">
                  Información por confirmar
                </option>

                <option value="previous">
                  Uso anterior
                </option>
              </select>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                Observaciones
              </span>

              <input
                type="text"
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value,
                  )
                }
                disabled={saving}
                placeholder="Dato útil para la gestión comercial"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaTimes />
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || loadingReferences}
              className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />
              {saving
                ? "Guardando..."
                : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}

      {usages.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {usages.map((usage) => (
            <article
              key={usage.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-950 ring-1 ring-gray-200">
                    <FaBook />
                  </div>

                  <div className="min-w-0">
                    <p className="break-words font-black text-gray-950">
                      {getEditorialName(usage)}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                    {usage.product_name ? (
                    <p className="mt-1 font-bold text-gray-900">
                        {usage.product_name}
                    </p>
                    ) : null}
                      {usage.area?.name ||
                        "Área no especificada"}

                      {usage.service?.level
                        ? ` · ${usage.service.level}`
                        : ""}
                    </p>
                  </div>
                </div>

                <EditorialOriginBadge usage={usage} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
                  {usage.year}
                </span>

                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
                  {usage.status_display}
                </span>
              </div>

              {usage.notes ? (
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm leading-5 text-gray-600 ring-1 ring-gray-200">
                  {usage.notes}
                </p>
              ) : null}

              <div className="mt-4 flex justify-end border-t border-gray-200 pt-3">
                <button
                  type="button"
                  onClick={() => openEditForm(usage)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <FaEdit />
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
          <p className="font-black text-gray-950">
            Sin editoriales registradas
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Registra las editoriales identificadas en este colegio
            para fortalecer su perfil comercial.
          </p>
        </div>
      )}
    </section>
  );
}