import { useEffect, useState } from "react";
import {
  FaPlus,
  FaSave,
  FaSchool,
  FaTimes,
} from "react-icons/fa";

import {
  createCRMSchoolContact,
  getCRMSchools,
} from "../../../api/crmApi";

const EMPTY_FORM = {
  schoolId: "",
  fullName: "",
  position: "",
  contactNumber: "",
  alternatePhone: "",
  email: "",
  isPrimary: false,
};

function normalizeResults(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string" && value.trim());

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

export default function CRMContactCreatePanel({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let ignore = false;

    async function loadSchools() {
      try {
        setLoadingSchools(true);
        setErrorMessage("");

        const data = await getCRMSchools({
          page: 1,
          page_size: 100,
        });

        if (!ignore) {
          setSchools(
            normalizeResults(data).filter((school) => school.is_active),
          );
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la lista de colegios.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingSchools(false);
        }
      }
    }

    loadSchools();

    return () => {
      ignore = true;
    };
  }, [open]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openForm() {
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setSuccessMessage("");
    setOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setOpen(false);
    setForm(EMPTY_FORM);
    setErrorMessage("");
  }

  async function saveContact() {
    if (!form.schoolId) {
      setErrorMessage("Selecciona el colegio al que pertenece el contacto.");
      return;
    }

    if (!form.fullName.trim()) {
      setErrorMessage("Ingresa el nombre completo del contacto.");
      return;
    }

    const contactNumber = form.contactNumber.trim();
    const alternatePhone = form.alternatePhone.trim();

    const payload = {
      full_name: form.fullName.trim(),
      position: form.position.trim(),
      whatsapp: contactNumber,
      phone: alternatePhone || contactNumber,
      email: form.email.trim(),
      is_primary: form.isPrimary,
      is_active: true,
    };

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const createdContact = await createCRMSchoolContact(
        Number(form.schoolId),
        payload,
      );

      setForm(EMPTY_FORM);
      setOpen(false);
      setSuccessMessage("El contacto fue registrado y vinculado al colegio.");

      if (onCreated) {
        onCreated(createdContact);
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo registrar el contacto.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
      >
        <FaPlus />
        Agregar contacto
      </button>

      {successMessage ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {open ? (
        <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Nuevo contacto
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Registrar y vincular
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                El contacto quedará asociado al colegio seleccionado y podrá
                compartir su historial comercial y próximas acciones.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <FaTimes />
              Cerrar
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="md:col-span-2 xl:col-span-1">
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Colegio asociado
              </span>
              <div className="relative mt-2">
                <FaSchool className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <select
                  value={form.schoolId}
                  onChange={(event) =>
                    updateField("schoolId", event.target.value)
                  }
                  disabled={saving || loadingSchools}
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingSchools
                      ? "Cargando colegios..."
                      : "Seleccionar colegio"}
                  </option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Nombre completo
              </span>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
                disabled={saving}
                placeholder="Nombre y apellidos"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Cargo / función
              </span>
              <input
                type="text"
                value={form.position}
                onChange={(event) =>
                  updateField("position", event.target.value)
                }
                disabled={saving}
                placeholder="Director, coordinador..."
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Celular / WhatsApp
              </span>
              <input
                type="text"
                value={form.contactNumber}
                onChange={(event) =>
                  updateField("contactNumber", event.target.value)
                }
                disabled={saving}
                placeholder="Número principal"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Teléfono alternativo
              </span>
              <input
                type="text"
                value={form.alternatePhone}
                onChange={(event) =>
                  updateField("alternatePhone", event.target.value)
                }
                disabled={saving}
                placeholder="Opcional"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Correo
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField("email", event.target.value)
                }
                disabled={saving}
                placeholder="correo@colegio.edu.pe"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2 xl:col-span-3">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(event) =>
                  updateField("isPrimary", event.target.checked)
                }
                disabled={saving}
                className="h-4 w-4 accent-red-700"
              />
              <span>
                <span className="block text-sm font-black text-gray-900">
                  Contacto principal
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Márcalo solo si será la persona de referencia principal del
                  colegio.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={saveContact}
              disabled={saving || loadingSchools}
              className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />
              {saving ? "Guardando..." : "Guardar contacto"}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
