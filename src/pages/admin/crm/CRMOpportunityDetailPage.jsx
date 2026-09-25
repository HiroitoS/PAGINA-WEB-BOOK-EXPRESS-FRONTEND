import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaCheckCircle,
  FaHistory,
  FaSchool,
  FaUserTie,
} from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router";

import {
  getCRMOpportunity,
  getCRMOpportunityActivities,
  getCRMOpportunityAdoptions,
  getCRMOpportunityHistory,
  getCRMOpportunityQuotations,
} from "../../../api/crmApi";
import CRMOpportunityProjectionSection from "../../../components/admin/crm/CRMOpportunityProjectionSection";
import {
  buildNavigationState,
  resolveReturnContext,
} from "../../../utils/navigationContext";

const TABS = [
  { key: "summary", label: "Resumen" },
  { key: "activity", label: "Actividad" },
  { key: "projection", label: "Proyección" },
  { key: "quotations", label: "Cotizaciones" },
  { key: "adoption", label: "Adopción" },
  { key: "history", label: "Historial" },
];

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function formatDateTime(value, fallback = "Sin fecha") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatOwner(owner) {
  if (!owner) {
    return "Sin asesor asignado";
  }

  return owner.full_name || owner.username || "Asesor asignado";
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "S/ 0.00";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(number);
}

function getQuotationTotal(quotation) {
  return (quotation.items || []).reduce(
    (total, item) =>
      total + Number(item.school_price || 0) * Number(item.quantity || 0),
    0,
  );
}


function statusBadgeClass(status) {
  if (status === "accepted") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "sent") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
      <p className="font-black text-gray-950">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default function CRMOpportunityDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  const [opportunity, setOpportunity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [adoptions, setAdoptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const returnContext = useMemo(
    () =>
      resolveReturnContext(location.state, {
        fallbackPath: "/admin/crm/oportunidades",
        fallbackLabel: "Oportunidades",
      }),
    [location.state],
  );

  useEffect(() => {
    let ignore = false;

    async function loadOpportunityWorkspace() {
      try {
        const [
          opportunityData,
          activitiesData,
          quotationsData,
          adoptionsData,
          historyData,
        ] = await Promise.all([
          getCRMOpportunity(id),
          getCRMOpportunityActivities(id, { page_size: 100 }),
          getCRMOpportunityQuotations(id),
          getCRMOpportunityAdoptions(id),
          getCRMOpportunityHistory(id),
        ]);

        if (ignore) {
          return;
        }

        setOpportunity(opportunityData);
        setActivities(normalizeList(activitiesData));
        setQuotations(normalizeList(quotationsData));
        setAdoptions(normalizeList(adoptionsData));
        setHistory(normalizeList(historyData));
        setErrorMessage("");
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error?.response?.data?.detail
              || "No se pudo cargar la oportunidad comercial.",
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOpportunityWorkspace();

    return () => {
      ignore = true;
    };
  }, [id]);

  const navigationState = useMemo(
    () =>
      buildNavigationState({
        from: `/admin/crm/oportunidades/${id}`,
        fromLabel: opportunity?.title || "Oportunidad",
        fromType: "opportunity",
        currentState: location.state,
      }),
    [id, location.state, opportunity?.title],
  );

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-600 shadow-sm">
          Cargando oportunidad...
        </div>
      </div>
    );
  }

  if (errorMessage || !opportunity) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-black">No se pudo abrir la oportunidad.</p>
        <p className="mt-2 text-sm leading-6">
          {errorMessage || "La oportunidad no está disponible."}
        </p>
        <Link
          to={returnContext.path}
          state={returnContext.state}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-red-800 ring-1 ring-red-200"
        >
          <FaArrowLeft />
          Volver a {returnContext.label}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <div className="mb-4">
        <Link
          to={returnContext.path}
          state={returnContext.state}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <FaArrowLeft className="text-xs" />
          Volver a {returnContext.label || "Oportunidades"}
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 px-5 py-5 sm:px-7 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-red-300">
                <FaBriefcase />
                CRM Comercial · Oportunidad
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-white ring-1 ring-white/15">
                {opportunity.stage?.name || "En curso"}
              </span>
            </div>

            <h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">
              {opportunity.school?.name || opportunity.title}
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {opportunity.title}
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:min-w-[420px]">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Campaña
              </p>
              <p className="mt-1 text-sm font-black">
                {opportunity.campaign?.name || "Sin campaña"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Asesor
              </p>
              <p className="mt-1 text-sm font-black">
                {formatOwner(opportunity.owner)}
              </p>
            </div>

          </div>
        </div>

        <div className="border-t border-white/10 bg-gray-900 px-3 py-3 sm:px-5">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black transition ${
                  activeTab === tab.key
                    ? "bg-red-700 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <main className="min-w-0 xl:col-span-9">
          {activeTab === "summary" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Gestión actual
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  Estado comercial
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Etapa
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {opportunity.stage?.name || "Sin etapa"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Última actividad
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {formatDateTime(
                        opportunity.last_activity_at,
                        "Sin actividad",
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Próxima actividad
                    </p>

                    {opportunity.next_activity ? (
                      <>
                        <p className="mt-1 font-black text-gray-950">
                          {formatDateTime(
                            opportunity.next_activity.scheduled_at,
                          )}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                          {opportunity.next_activity.type_display}
                          {" · "}
                          {opportunity.next_activity.title}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 font-black text-gray-400">
                        Sin próxima actividad
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Historial comercial
                    </p>
                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      Actividad reciente
                    </h2>
                  </div>

                  {activities.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                    >
                      Ver actividad
                    </button>
                  ) : null}
                </div>

                {activities.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {activities.slice(0, 2).map((activity) => (
                      <article
                        key={activity.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                              {activity.activity_type_display || "Actividad"}
                            </span>
                            <p className="mt-3 font-black text-gray-950">
                              {activity.summary}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs font-semibold text-gray-400">
                            {formatDateTime(activity.occurred_at)}
                          </p>
                        </div>

                        {activity.result ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                            {activity.result}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      title="Sin actividad registrada"
                      description="Las llamadas, visitas, reuniones y seguimientos vinculados a esta oportunidad aparecerán aquí."
                    />
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Historial comercial
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  Actividades de la oportunidad
                </h2>
              </div>

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

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 text-xs text-gray-500">
                        <span>
                          Registrado por{" "}
                          <strong className="text-gray-700">
                            {activity.performed_by?.full_name
                              || activity.performed_by?.username
                              || "Usuario CRM"}
                          </strong>
                        </span>

                        {activity.contact ? (
                          <Link
                            to={`/admin/crm/contactos/${activity.contact.id}`}
                            state={navigationState}
                            className="font-black text-red-700 hover:text-red-900"
                          >
                            {activity.contact.full_name}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Sin actividad registrada"
                    description="Las llamadas, visitas, reuniones y seguimientos vinculados a esta oportunidad aparecerán aquí."
                  />
                </div>
              )}
            </section>
          ) : null}

          {activeTab === "projection" ? (
            <CRMOpportunityProjectionSection opportunityId={id} />
          ) : null}

          {activeTab === "quotations" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Propuesta comercial
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Cotizaciones
              </h2>

              {quotations.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {quotations.map((quotation) => (
                    <article
                      key={quotation.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            Cotización v{quotation.version}
                          </p>
                          <p className="mt-1 text-lg font-black text-gray-950">
                            {formatCurrency(getQuotationTotal(quotation))}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusBadgeClass(
                            quotation.status,
                          )}`}
                        >
                          {quotation.status_display || quotation.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                          <p className="font-bold text-gray-500">Productos</p>
                          <p className="mt-1 font-black text-gray-950">
                            {quotation.items?.length || 0}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
                          <p className="font-bold text-gray-500">Creada</p>
                          <p className="mt-1 font-black text-gray-950">
                            {formatDateTime(quotation.created_at)}
                          </p>
                        </div>
                      </div>

                      {quotation.notes ? (
                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          {quotation.notes}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Aún no hay cotizaciones"
                    description="Cuando se registre una propuesta comercial para esta oportunidad, aparecerá aquí con su versión y estado."
                  />
                </div>
              )}
            </section>
          ) : null}

          {activeTab === "adoption" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Cierre comercial
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Adopción
              </h2>

              {adoptions.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {adoptions.map((adoption) => (
                    <article
                      key={adoption.id}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex items-center gap-2 text-emerald-700">
                            <FaCheckCircle />
                            <p className="font-black">
                              Adopción v{adoption.version}
                            </p>
                          </div>
                          <p className="mt-2 text-sm font-black text-gray-950">
                            {adoption.authorized_contact_name_snapshot
                              || adoption.authorized_contact?.full_name
                              || "Contacto autorizado"}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            {adoption.items?.length || 0} producto(s) adoptado(s)
                          </p>
                        </div>

                        <div className="text-left text-xs text-gray-600 sm:text-right">
                          <p>Firma: {formatDateTime(adoption.signed_at)}</p>
                          <p className="mt-1">
                            Confirmación: {formatDateTime(adoption.confirmed_at)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Sin adopción confirmada"
                    description="La adopción aparecerá aquí después de aceptar una cotización y registrar la confirmación autorizada del colegio."
                  />
                </div>
              )}
            </section>
          ) : null}

          {activeTab === "history" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Trazabilidad
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Historial de etapas
              </h2>

              {history.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {history.map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                        <FaHistory />
                      </div>

                      <div className="min-w-0">
                        <p className="font-black text-gray-950">
                          {item.from_stage?.name || "Inicio"}
                          {" → "}
                          {item.to_stage?.name || "Etapa"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.transition_type_display || "Cambio de etapa"}
                          {" · "}
                          {formatDateTime(item.created_at)}
                        </p>
                        {item.note ? (
                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Sin cambios de etapa"
                    description="Los movimientos del pipeline quedarán registrados aquí para mantener la trazabilidad comercial."
                  />
                </div>
              )}
            </section>
          ) : null}
        </main>

        <aside className="min-w-0 xl:col-span-3">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Relaciones
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Contexto de la oportunidad
            </h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                    <FaSchool />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Colegio
                    </p>
                    <p className="mt-1 break-words font-black text-gray-950">
                      {opportunity.school?.name || "Colegio"}
                    </p>
                  </div>
                </div>

                {opportunity.school?.id ? (
                  <Link
                    to={`/admin/crm/colegios/${opportunity.school.id}`}
                    state={navigationState}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                  >
                    Abrir colegio
                  </Link>
                ) : null}
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                    <FaUserTie />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Contacto principal
                    </p>
                    <p className="mt-1 break-words font-black text-gray-950">
                      {opportunity.primary_contact?.full_name
                        || "Sin contacto principal"}
                    </p>
                  </div>
                </div>

                {opportunity.primary_contact?.id ? (
                  <Link
                    to={`/admin/crm/contactos/${opportunity.primary_contact.id}`}
                    state={navigationState}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                  >
                    Abrir contacto
                  </Link>
                ) : null}
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-700 ring-1 ring-gray-200">
                    <FaCalendarAlt />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Agenda
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      Calendario comercial
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/workspace/calendar"
                  state={navigationState}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                >
                  Abrir calendario
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
