import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";

import { createCRMSchool } from "../../../api/crmApi";

const EMPTY_FORM = {
  name: "",
  institutionCode: "",
  ruc: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  department: "",
  province: "",
  district: "",
  notes: "",
};

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

export default function CRMSchoolCreatePanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        setOpen(false);
        setErrorMessage("");
        setForm(EMPTY_FORM);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openPanel() {
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setOpen(true);
  }

  function closePanel() {
    if (saving) {
      return;
    }

    setOpen(false);
    setErrorMessage("");
    setForm(EMPTY_FORM);
  }

  async function saveSchool() {
    const name = form.name.trim();

    if (!name) {
      setErrorMessage("Ingresa el nombre del colegio.");
      return;
    }

    const payload = {
      name,
      institution_code: form.institutionCode.trim() || null,
      ruc: form.ruc.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      department: form.department.trim(),
      province: form.province.trim(),
      district: form.district.trim(),
      notes: form.notes.trim(),
      is_active: true,
    };

    try {
      setSaving(true);
      setErrorMessage("");

      const createdSchool = await createCRMSchool(payload);

      setOpen(false);
      setForm(EMPTY_FORM);

      navigate(`/admin/crm/colegios/${createdSchool.id}`);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo registrar el colegio.",
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
        onClick={openPanel}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
      >
        <FaPlus />
        Agregar colegio
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/35 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="absolute inset-0 cursor-default"
            onClick={closePanel}
          />

          <section className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    CRM Comercial
                  </p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Agregar colegio
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Registra la institución y continúa su gestión desde la ficha
                    comercial.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {errorMessage ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Nombre del colegio
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    disabled={saving}
                    placeholder="Ej. Colegio Prueba Flujo 2"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Código de institución
                  </span>
                  <input
                    type="text"
                    value={form.institutionCode}
                    onChange={(event) =>
                      updateField("institutionCode", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Opcional"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    RUC
                  </span>
                  <input
                    type="text"
                    value={form.ruc}
                    onChange={(event) => updateField("ruc", event.target.value)}
                    disabled={saving}
                    placeholder="Opcional"
                    maxLength={11}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Teléfono
                  </span>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    disabled={saving}
                    placeholder="Opcional"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    WhatsApp
                  </span>
                  <input
                    type="text"
                    value={form.whatsapp}
                    onChange={(event) =>
                      updateField("whatsapp", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Opcional"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Correo
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    disabled={saving}
                    placeholder="correo@colegio.edu.pe"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Departamento
                  </span>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(event) =>
                      updateField("department", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Ej. Junín"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Provincia
                  </span>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(event) =>
                      updateField("province", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Ej. Huancayo"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Distrito
                  </span>
                  <input
                    type="text"
                    value={form.district}
                    onChange={(event) =>
                      updateField("district", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Ej. Huancayo"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Dirección
                  </span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Opcional"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Observaciones
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    disabled={saving}
                    rows={4}
                    placeholder="Información útil para la gestión comercial"
                    className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600 ring-1 ring-gray-200">
                La población, niveles, contactos y editoriales se gestionan
                después desde la ficha del colegio para evitar duplicar datos.
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closePanel}
                disabled={saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveSchool}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Guardando..." : "Guardar colegio"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
