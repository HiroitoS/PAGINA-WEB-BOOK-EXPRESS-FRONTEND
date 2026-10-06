import { useEffect, useState } from "react";
import {
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";

import {
  createCRMOpportunityActivity,
  createCRMSchoolEvent,
  getCRMSchoolContacts,
  uploadCRMOpportunityActivityEvidence,
} from "../../../api/crmApi";
import CRMActivityEvidenceFields from "./CRMActivityEvidenceFields";
import CRMActivityEvidenceList from "./CRMActivityEvidenceList";
import CRMActivityLocationSummary from "./CRMActivityLocationSummary";
import { CRM_ACTIVITY_TYPES } from "../../../utils/crmActivityTypes";
import {
  buildCRMActivityLocationPayload,
  uploadCRMActivityEvidenceFiles,
} from "../../../utils/crmActivityEvidence";

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function getCurrentLocalDateTimeValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function createInitialForm(primaryContactId = "") {
  return {
    contact: primaryContactId ? String(primaryContactId) : "",
    activity_type: "visit",
    summary: "",
    result: "",
    occurred_at: getCurrentLocalDateTimeValue(),
    is_important: false,
    evidence_files: [],
    evidence_location: null,
    schedule_next_action: false,
    next_action_type: "visit",
    next_action_title: "",
    next_action_at: "",
  };
}

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string" && value.trim());

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

export default function CRMOpportunityActivitySection({
  opportunity,
  activities,
  onChanged,
}) {
  const [contacts, setContacts] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(() =>
    createInitialForm(opportunity?.primary_contact?.id),
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadContacts() {
      if (!opportunity?.school?.id) {
        setContacts([]);
        return;
      }

      try {
        const data = await getCRMSchoolContacts(opportunity.school.id);

        if (!ignore) {
          setContacts(
            normalizeList(data).filter((contact) => contact.is_active),
          );
        }
      } catch {
        if (!ignore) {
          setContacts([]);
        }
      }
    }

    loadContacts();

    return () => {
      ignore = true;
    };
  }, [opportunity?.school?.id]);

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        setDrawerOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, saving]);

  function openDrawer() {
    setForm(createInitialForm(opportunity?.primary_contact?.id));
    setErrorMessage("");
    setWarningMessage("");
    setSuccessMessage("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving) {
      return;
    }

    setDrawerOpen(false);
    setErrorMessage("");
  }

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveActivity() {
    if (!form.summary.trim()) {
      setErrorMessage("Ingresa un resumen de la actividad.");
      return;
    }

    if (!form.result.trim()) {
      setErrorMessage("Ingresa el resultado o detalle de la actividad.");
      return;
    }

    const occurredAt = new Date(form.occurred_at);

    if (
      Number.isNaN(occurredAt.getTime())
      || occurredAt.getTime() > Date.now()
    ) {
      setErrorMessage(
        "La fecha de la actividad debe ser válida y no puede estar en el futuro.",
      );
      return;
    }

    let nextActionAt = null;

    if (form.schedule_next_action) {
      if (!form.next_action_title.trim()) {
        setErrorMessage("Ingresa el título de la próxima acción.");
        return;
      }

      nextActionAt = new Date(form.next_action_at);

      if (
        Number.isNaN(nextActionAt.getTime())
        || nextActionAt.getTime() <= Date.now()
      ) {
        setErrorMessage(
          "La próxima acción debe tener una fecha y hora futuras.",
        );
        return;
      }
    }

    const contactId = form.contact ? Number(form.contact) : null;

    try {
      setSaving(true);
      setErrorMessage("");
      setWarningMessage("");
      setSuccessMessage("");

      const createdActivity = await createCRMOpportunityActivity(
        opportunity.id,
        {
          activity_type: form.activity_type,
          summary: form.summary.trim(),
          result: form.result.trim(),
          contact: contactId,
          occurred_at: occurredAt.toISOString(),
          ...buildCRMActivityLocationPayload(form.evidence_location),
          is_important: form.is_important,
        },
      );

      const evidenceUpload = await uploadCRMActivityEvidenceFiles({
        files: form.evidence_files,
        location: null,
        uploadFile: (payload) =>
          uploadCRMOpportunityActivityEvidence(
            opportunity.id,
            createdActivity.id,
            payload,
          ),
      });

      if (evidenceUpload.failed.length > 0) {
        setWarningMessage(
          `La actividad se guardó, pero ${evidenceUpload.failed.length} evidencia(s) no pudieron adjuntarse.`,
        );
      }

      let nextActionCreated = false;

      if (form.schedule_next_action && nextActionAt) {
        const commonWorkItem = {
          title: form.next_action_title.trim(),
          opportunity: opportunity.id,
          origin_activity: createdActivity.id,
          ...(contactId ? { contact: contactId } : {}),
        };

        try {
          await createCRMSchoolEvent(opportunity.school.id, {
            ...commonWorkItem,
            start_at: nextActionAt.toISOString(),
            event_type: form.next_action_type,
          });

          nextActionCreated = true;
        } catch (nextActionError) {
          setWarningMessage(
            getErrorMessage(
              nextActionError,
              "La actividad se guardó, pero no se pudo programar la próxima acción.",
            ),
          );
        }
      }

      setDrawerOpen(false);
      setSuccessMessage(
        form.schedule_next_action && nextActionCreated
          ? "La actividad y la próxima acción fueron registradas correctamente."
          : "La actividad fue registrada correctamente.",
      );

      if (onChanged) {
        onChanged();
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo registrar la actividad comercial.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Historial comercial
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Actividades de la oportunidad
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Registra llamadas, visitas, reuniones y seguimientos relacionados
              directamente con esta oportunidad.
            </p>
          </div>

          <button
            type="button"
            onClick={openDrawer}
            disabled={opportunity.is_closed}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaEdit />
            Registrar actividad
          </button>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {warningMessage}
          </div>
        ) : null}

        {activities.length > 0 ? (
          <div className="mt-4 space-y-3">
            {activities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                        {activity.activity_type_display || "Actividad"}
                      </span>

                      {activity.is_important ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
                          Importante
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 font-black text-gray-950">
                      {activity.summary}
                    </h3>
                  </div>

                  <p className="text-xs font-semibold text-gray-400">
                    {formatDateTime(activity.occurred_at)}
                  </p>
                </div>

                {activity.result ? (
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {activity.result}
                  </p>
                ) : null}

                <CRMActivityLocationSummary activity={activity} />

                <CRMActivityEvidenceList
                  evidences={activity.evidences}
                  compact
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 text-xs text-gray-500">
                  <span>
                    Registrado por{" "}
                    <span className="font-black text-gray-700">
                      {activity.performed_by?.full_name
                        || activity.performed_by?.username
                        || "Usuario CRM"}
                    </span>
                  </span>

                  {activity.contact?.full_name ? (
                    <span className="font-black text-red-700">
                      {activity.contact.full_name}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <p className="font-black text-gray-950">
              Sin actividades registradas
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              La actividad comercial vinculada a esta oportunidad aparecerá aquí.
            </p>
          </div>
        )}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar actividad"
            className="absolute inset-0 cursor-default"
            onClick={closeDrawer}
          />

          <section className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  CRM comercial
                </p>
                <h3 className="mt-1 text-2xl font-black text-gray-950">
                  Registrar actividad
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {opportunity.school?.name || "Colegio"}
                  {" · "}
                  {opportunity.campaign?.name || "Campaña"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {errorMessage ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Contacto relacionado
                  </span>
                  <select
                    value={form.contact}
                    onChange={(event) =>
                      updateField("contact", event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  >
                    <option value="">Sin contacto específico</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.full_name}
                        {contact.position ? ` · ${contact.position}` : ""}
                        {contact.is_primary ? " · Principal" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Tipo de actividad
                  </span>
                  <select
                    value={form.activity_type}
                    onChange={(event) =>
                      updateField("activity_type", event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  >
                    {CRM_ACTIVITY_TYPES.map((activityType) => (
                      <option
                        key={activityType.value}
                        value={activityType.value}
                      >
                        {activityType.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Fecha y hora
                  </span>
                  <input
                    type="datetime-local"
                    max={getCurrentLocalDateTimeValue()}
                    value={form.occurred_at}
                    onChange={(event) =>
                      updateField("occurred_at", event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Resumen
                  </span>
                  <input
                    type="text"
                    value={form.summary}
                    onChange={(event) =>
                      updateField("summary", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Ej. Reunión con el director para revisar propuesta 2027"
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Resultado / detalle
                  </span>
                  <textarea
                    rows={4}
                    value={form.result}
                    onChange={(event) =>
                      updateField("result", event.target.value)
                    }
                    disabled={saving}
                    placeholder="Qué se conversó, acuerdos, respuesta del colegio y siguiente paso."
                    className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <CRMActivityEvidenceFields
                  files={form.evidence_files}
                  onFilesChange={(files) =>
                    updateField("evidence_files", files)
                  }
                  location={form.evidence_location}
                  onLocationChange={(location) =>
                    updateField("evidence_location", location)
                  }
                  disabled={saving}
                />

                <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.schedule_next_action}
                      onChange={(event) =>
                        updateField(
                          "schedule_next_action",
                          event.target.checked,
                        )
                      }
                      disabled={saving}
                      className="mt-0.5 h-4 w-4 accent-red-700"
                    />
                    <span>
                      <span className="block text-sm font-black text-gray-950">
                        Programar próxima acción
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-gray-500">
                        Quedará vinculada a la misma oportunidad, colegio,
                        contacto y actividad de origen.
                      </span>
                    </span>
                  </label>

                  {form.schedule_next_action ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Tipo de actividad
                        </span>
                        <select
                          value={form.next_action_type}
                          onChange={(event) =>
                            updateField(
                              "next_action_type",
                              event.target.value,
                            )
                          }
                          disabled={saving}
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                        >
                          {CRM_ACTIVITY_TYPES.map((activityType) => (
                            <option
                              key={activityType.value}
                              value={activityType.value}
                            >
                              {activityType.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Fecha y hora
                        </span>
                        <input
                          type="datetime-local"
                          value={form.next_action_at}
                          onChange={(event) =>
                            updateField(
                              "next_action_at",
                              event.target.value,
                            )
                          }
                          disabled={saving}
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                        />
                      </label>

                      <label className="min-w-0 md:col-span-2">
                        <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Próxima acción
                        </span>
                        <input
                          type="text"
                          value={form.next_action_title}
                          onChange={(event) =>
                            updateField(
                              "next_action_title",
                              event.target.value,
                            )
                          }
                          disabled={saving}
                          placeholder="Ej. Enviar propuesta y llamar al director"
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>

                <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_important}
                    onChange={(event) =>
                      updateField("is_important", event.target.checked)
                    }
                    disabled={saving}
                    className="h-4 w-4 accent-red-700"
                  />
                  Marcar como importante
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveActivity}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Guardando..." : "Guardar actividad"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
