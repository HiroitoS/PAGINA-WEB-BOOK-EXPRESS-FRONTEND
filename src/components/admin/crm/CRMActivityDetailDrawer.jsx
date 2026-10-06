import { useEffect } from "react";
import {
  FaCalendarAlt,
  FaSchool,
  FaTimes,
  FaUser,
  FaUserTie,
} from "react-icons/fa";

import CRMActivityEvidenceList from "./CRMActivityEvidenceList";
import CRMActivityLocationSummary from "./CRMActivityLocationSummary";

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha registrada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha registrada";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function getUserName(user) {
  return (
    user?.full_name
    || user?.username
    || "Usuario CRM"
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-600 ring-1 ring-gray-200">
        <Icon />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 wrap-break-word text-sm font-black text-gray-950">
          {value || "Sin información"}
        </p>
      </div>
    </div>
  );
}

export default function CRMActivityDetailDrawer({
  activity,
  schoolName = "",
  opportunityLabel = "",
  onClose,
}) {
  useEffect(() => {
    if (!activity) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activity, onClose]);

  if (!activity) {
    return null;
  }

  const contactName = activity.contact?.full_name || "Sin contacto específico";
  const activityType = activity.activity_type_display || "Actividad comercial";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Cerrar detalle de actividad"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Trazabilidad comercial
            </p>
            <h2 className="mt-1 text-2xl font-black text-gray-950">
              Detalle de actividad
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Revisa qué se realizó, quién lo registró y las evidencias asociadas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-950"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="rounded-3xl bg-gray-950 p-5 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                {activityType}
              </span>
              {activity.is_important ? (
                <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black">
                  Importante
                </span>
              ) : null}
            </div>

            <h3 className="mt-4 text-xl font-black leading-tight">
              {activity.summary}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              {formatDateTime(activity.occurred_at)}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailItem
              icon={FaUserTie}
              label="Registrado por"
              value={getUserName(activity.performed_by)}
            />
            <DetailItem
              icon={FaUser}
              label="Contacto relacionado"
              value={contactName}
            />
            <DetailItem
              icon={FaSchool}
              label="Colegio"
              value={schoolName || "Colegio relacionado"}
            />
            <DetailItem
              icon={FaCalendarAlt}
              label="Oportunidad"
              value={
                activity.opportunity_id
                  ? opportunityLabel || "Oportunidad vinculada"
                  : "Sin oportunidad específica"
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">
              Resultado / detalle
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {activity.result || "Sin detalle registrado."}
            </p>
          </div>

          <CRMActivityLocationSummary activity={activity} />

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">
              Evidencias
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Fotografías o documentos asociados a esta gestión comercial.
            </p>

            <CRMActivityEvidenceList
              evidences={activity.evidences}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-blue-800">
              Registro histórico
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              Esta actividad representa una gestión ya realizada. Las acciones futuras se controlan por separado en ToDo y Agenda.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
