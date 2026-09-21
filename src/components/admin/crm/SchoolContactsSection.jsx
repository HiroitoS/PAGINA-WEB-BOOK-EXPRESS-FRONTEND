import { useState } from "react";
import {
  FaEdit,
  FaEnvelope,
  FaPhoneAlt,
  FaPlus,
  FaSave,
  FaTimes,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import {
  createCRMSchoolContact,
  getCRMSchool,
  updateCRMSchoolContact,
} from "../../../api/crmApi";

const EMPTY_FORM = {
  full_name: "",
  position: "",
  contact_number: "",
  alternate_phone: "",
  email: "",
  notes: "",
  is_primary: false,
  is_active: true,
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

function contactToForm(contact) {
  const whatsapp = String(contact.whatsapp || "").trim();
  const phone = String(contact.phone || "").trim();

  const contactNumber = whatsapp || phone;
  const alternatePhone =
    whatsapp && phone && whatsapp !== phone
      ? phone
      : "";

  return {
    full_name: contact.full_name || "",
    position: contact.position || "",
    contact_number: contactNumber,
    alternate_phone: alternatePhone,
    email: contact.email || "",
    notes: contact.notes || "",
    is_primary: Boolean(contact.is_primary),
    is_active: Boolean(contact.is_active),
  };
}

function ContactStatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        active
          ? "bg-gray-950 text-white"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Vigente" : "Inactivo"}
    </span>
  );
}

function ContactValue({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-1 shrink-0 text-xs text-gray-400" />

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-semibold text-gray-700">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  );
}

export default function SchoolContactsSection({
  school,
  onSchoolUpdated,
}) {
  const [mode, setMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const contacts = Array.isArray(school?.contacts)
    ? [...school.contacts].sort((a, b) => {
        if (a.is_primary !== b.is_primary) {
          return Number(b.is_primary) - Number(a.is_primary);
        }

        if (a.is_active !== b.is_active) {
          return Number(b.is_active) - Number(a.is_active);
        }

        return a.full_name.localeCompare(b.full_name, "es");
      })
    : [];

  const activeCount = contacts.filter(
    (contact) => contact.is_active,
  ).length;

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function startCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function startEdit(contact) {
    setMode("edit");
    setEditingId(contact.id);
    setForm(contactToForm(contact));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelForm() {
    setMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
  }

  function validateForm() {
    if (!form.full_name.trim()) {
      return "Ingresa el nombre completo del contacto.";
    }

    if (!form.is_active && form.is_primary) {
      return "Un contacto inactivo no puede ser el contacto principal.";
    }

    return "";
  }

  async function saveContact() {
    const validationMessage = validateForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    const contactNumber = form.contact_number.trim();
    const alternatePhone = form.alternate_phone.trim();

    const payload = {
      full_name: form.full_name.trim(),
      position: form.position.trim(),
      phone: alternatePhone || contactNumber,
      whatsapp: contactNumber,
      email: form.email.trim(),
      notes: form.notes.trim(),
      is_primary: form.is_primary,
      is_active: form.is_active,
    };

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (mode === "edit" && editingId) {
        await updateCRMSchoolContact(
          school.id,
          editingId,
          payload,
        );
      } else {
        await createCRMSchoolContact(
          school.id,
          payload,
        );
      }

      const updatedSchool = await getCRMSchool(school.id);

      if (onSchoolUpdated) {
        onSchoolUpdated(updatedSchool);
      }

      const completedMode = mode;

      setMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setSuccessMessage(
        completedMode === "edit"
          ? "El contacto fue actualizado."
          : "El contacto fue registrado.",
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo guardar el contacto.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Personas de contacto
          </p>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            Contactos del colegio
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Registra a las personas clave para la gestión comercial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700">
            {activeCount} vigente{activeCount === 1 ? "" : "s"}
          </span>

          {!mode ? (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
            >
              <FaPlus />
              Agregar contacto
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
          {successMessage}
        </div>
      ) : null}

      {mode ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-gray-950">
                {mode === "edit"
                  ? "Editar contacto"
                  : "Nuevo contacto"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                El nombre es obligatorio. Los demás datos pueden completarse después.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelForm}
              disabled={saving}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-white hover:text-gray-950 disabled:opacity-50"
              aria-label="Cerrar formulario"
            >
              <FaTimes />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="sm:col-span-2 xl:col-span-1">
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Nombre completo
              </span>

              <input
                type="text"
                value={form.full_name}
                onChange={(event) =>
                  updateField("full_name", event.target.value)
                }
                placeholder="Nombre y apellidos"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
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
                placeholder="Director, coordinador..."
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Celular / WhatsApp
              </span>

              <input
                type="text"
                value={form.contact_number}
                onChange={(event) =>
                  updateField("contact_number", event.target.value)
                }
                placeholder="Número principal de contacto"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Teléfono alternativo
              </span>

              <input
                type="text"
                value={form.alternate_phone}
                onChange={(event) =>
                  updateField("alternate_phone", event.target.value)
                }
                placeholder="Opcional"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Correo
              </span>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField("email", event.target.value)
                }
                placeholder="correo@colegio.edu.pe"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
              />
            </label>

            <label className="sm:col-span-2 xl:col-span-3">
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Observaciones
              </span>

              <textarea
                rows="2"
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                placeholder="Información útil para el seguimiento comercial"
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  disabled={!form.is_active}
                  onChange={(event) =>
                    updateField("is_primary", event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 accent-red-700"
                />

                <span>
                  <span className="block text-sm font-black text-gray-900">
                    Contacto principal
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    Persona de referencia para la comunicación con el colegio.
                  </span>
                </span>
              </label>
            </div>

            {mode === "edit" ? (
              <label className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <span className="block text-xs font-black uppercase tracking-wide text-gray-500">
                  Estado del contacto
                </span>

                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(event) => {
                    const isActive = event.target.value === "active";

                    setForm((currentForm) => ({
                      ...currentForm,
                      is_active: isActive,
                      is_primary: isActive
                        ? currentForm.is_primary
                        : false,
                    }));
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500"
                >
                  <option value="active">Vigente</option>
                  <option value="inactive">Inactivo</option>
                </select>

                <span className="mt-1 block text-xs leading-5 text-gray-500">
                  Usa Inactivo cuando la persona ya no sea un contacto válido del colegio.
                </span>
              </label>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  Estado
                </p>

                <p className="mt-2 text-sm font-black text-gray-900">
                  Vigente
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Los contactos nuevos se registran como vigentes.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelForm}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <FaTimes />
              Cancelar
            </button>

            <button
              type="button"
              onClick={saveContact}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />
              {saving ? "Guardando..." : "Guardar contacto"}
            </button>
          </div>
        </div>
      ) : null}

      {contacts.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {contacts.map((contact) => {
            const whatsapp = String(contact.whatsapp || "").trim();
            const phone = String(contact.phone || "").trim();
            const primaryNumber = whatsapp || phone;
            const alternatePhone =
              whatsapp && phone && whatsapp !== phone
                ? phone
                : "";

            return (
              <article
                key={contact.id}
                className={`rounded-2xl border p-4 ${
                  contact.is_active
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-950 ring-1 ring-gray-200">
                      <FaUserTie />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-black text-gray-950">
                        {contact.full_name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {contact.position || "Cargo no registrado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {contact.is_primary ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">
                        Principal
                      </span>
                    ) : null}

                    <ContactStatusBadge active={contact.is_active} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ContactValue
                    icon={FaPhoneAlt}
                    label="Celular / WhatsApp"
                    value={primaryNumber}
                  />

                  <ContactValue
                    icon={FaEnvelope}
                    label="Correo"
                    value={contact.email}
                  />

                  {alternatePhone ? (
                    <div className="sm:col-span-2">
                      <ContactValue
                        icon={FaPhoneAlt}
                        label="Teléfono alternativo"
                        value={alternatePhone}
                      />
                    </div>
                  ) : null}
                </div>

                {contact.notes ? (
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-gray-600 ring-1 ring-gray-200">
                    {contact.notes}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end border-t border-gray-200 pt-3">
                  <button
                    type="button"
                    onClick={() => startEdit(contact)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:opacity-50"
                  >
                    <FaEdit />
                    Editar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-7 text-center">
          <FaUsers className="mx-auto text-gray-400" />

          <p className="mt-2 font-black text-gray-950">
            Sin contactos registrados
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Agrega al director, coordinador u otra persona clave del colegio.
          </p>
        </div>
      )}
    </section>
  );
}
