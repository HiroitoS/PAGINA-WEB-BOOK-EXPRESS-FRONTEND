import { useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";

import {
  createCRMSchoolActivity,
  createCRMSchoolEvent,
  uploadCRMSchoolActivityEvidence,
} from "../../../api/crmApi";
import CRMActivityEvidenceFields from "./CRMActivityEvidenceFields";
import { CRM_ACTIVITY_TYPES } from "../../../utils/crmActivityTypes";
import { uploadCRMActivityEvidenceFiles } from "../../../utils/crmActivityEvidence";

function getCurrentLocalDateTimeValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function createInitialForm() {
  return {
    contact: "",
    opportunity: "",
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

export default function CRMSchoolActivityDrawer({
  school,
  contacts = [],
  opportunities = [],
  onChanged,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const openOpportunities = useMemo(
    () => opportunities.filter((opportunity) => !opportunity.is_closed),
    [opportunities],
  );

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
    const initialForm = createInitialForm();

    if (openOpportunities.length === 1) {
      initialForm.opportunity = String(openOpportunities[0].id);
    }

    setForm(initialForm);
    setErrorMessage("");
    setWarningMessage("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (!saving) {
      setDrawerOpen(false);
    }
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
    const opportunityId = form.opportunity
      ? Number(form.opportunity)
      : null;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      setWarningMessage("");

      const createdActivity = await createCRMSchoolActivity(
        school.id,
        {
          activity_type: form.activity_type,
          summary: form.summary.trim(),
          result: form.result.trim(),
          contact: contactId,
          opportunity: opportunityId,
          occurred_at: occurredAt.toISOString(),
          is_important: form.is_important,
        },
      );

      const evidenceUpload = await uploadCRMActivityEvidenceFiles({
        files: form.evidence_files,
        location: form.evidence_location,
        uploadFile: (payload) =>
          uploadCRMSchoolActivityEvidence(
            school.id,
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
          origin_activity: createdActivity.id,
          opportunity: opportunityId,
          ...(contactId ? { contact: contactId } : {}),
        };

        try {
          await createCRMSchoolEvent(school.id, {
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
          ? "Actividad y próxima acción registradas correctamente."
          : "Actividad comercial registrada correctamente.",
      );

      if (onChanged) {
        await onChanged();
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
      <div className="inline-flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={openDrawer}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
        >
          <FaEdit />
          Registrar actividad
        </button>

        {successMessage ? (
          <p className="text-xs font-bold text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {warningMessage ? (
          <p className="max-w-sm text-xs font-bold text-amber-700">
            {warningMessage}
          </p>
        ) : null}
      </div>

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
                  {school.name}
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

              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                El colegio es obligatorio. El contacto y la oportunidad son
                opcionales para registrar también visitas o gestiones que aún
                no se convirtieron en oportunidad comercial.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
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
                    Oportunidad relacionada
                  </span>
                  <select
                    value={form.opportunity}
                    onChange={(event) =>
                      updateField("opportunity", event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  >
                    <option value="">Sin oportunidad específica</option>
                    {openOpportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.campaign?.name || opportunity.title}
                        {opportunity.stage?.name
                          ? ` · ${opportunity.stage.name}`
                          : ""}
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
                    Fecha de la actividad
                  </span>
                  <input
                    type="datetime-local"
                    value={form.occurred_at}
                    onChange={(event) =>
                      updateField("occurred_at", event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
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
                    maxLength={200}
                    placeholder="Ej. Visita en frío y entrega de catálogo"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Resultado / detalle
                  </span>
                  <textarea
                    value={form.result}
                    onChange={(event) =>
                      updateField("result", event.target.value)
                    }
                    disabled={saving}
                    rows={4}
                    placeholder="Ej. No brindaron datos del directivo; se dejó material en recepción."
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
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
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.is_important}
                  onChange={(event) =>
                    updateField("is_important", event.target.checked)
                  }
                  disabled={saving}
                  className="h-4 w-4 accent-red-700"
                />
                <span className="text-sm font-bold text-gray-700">
                  Marcar como actividad importante
                </span>
              </label>

              <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                <label className="flex items-center gap-3">
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
                    className="h-4 w-4 accent-red-700"
                  />
                  <span className="text-sm font-black text-gray-900">
                    Programar próxima acción
                  </span>
                </label>

                {form.schedule_next_action ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Tipo de próxima actividad
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
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
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
                        value={form.next_action_at}
                        onChange={(event) =>
                          updateField(
                            "next_action_at",
                            event.target.value,
                          )
                        }
                        disabled={saving}
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Título de la próxima acción
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
                        placeholder="Ej. Volver a visitar y solicitar reunión con Dirección"
                        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
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
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
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
