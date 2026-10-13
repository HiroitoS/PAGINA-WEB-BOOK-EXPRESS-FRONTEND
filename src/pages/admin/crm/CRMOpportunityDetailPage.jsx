import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaHistory,
  FaPrint,
  FaSchool,
  FaUserTie,
} from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router";

import {
  getCRMOpportunity,
  getCRMOpportunityActivities,
  getCRMOpportunityAdoptions,
  getCRMOpportunityCommercialHistory,
  getCRMSchoolCommercialHistory,
} from "../../../api/crmApi";
import CRMOpportunityActivitySection from "../../../components/admin/crm/CRMOpportunityActivitySection";
import CRMOpportunityAdoptionSection from "../../../components/admin/crm/CRMOpportunityAdoptionSection";
import CRMOpportunityProjectionSection from "../../../components/admin/crm/CRMOpportunityProjectionSection";
import CRMOpportunityQuotationSection from "../../../components/admin/crm/CRMOpportunityQuotationSection";
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
  const [adoptions, setAdoptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [schoolAntecedents, setSchoolAntecedents] = useState([]);
  const [antecedentsLoaded, setAntecedentsLoaded] = useState(false);
  const [antecedentsLoading, setAntecedentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [refreshKey, setRefreshKey] = useState(0);
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
          adoptionsData,
          historyData,
        ] = await Promise.all([
          getCRMOpportunity(id),
          getCRMOpportunityActivities(id, { page_size: 100 }),
          getCRMOpportunityAdoptions(id),
          getCRMOpportunityCommercialHistory(id),
        ]);

        if (ignore) {
          return;
        }

        setOpportunity(opportunityData);
        setActivities(normalizeList(activitiesData));
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
  }, [id, refreshKey]);

  function refreshWorkspace() {
    setRefreshKey((current) => current + 1);
  }

  useEffect(() => {
    if (
      activeTab !== "history"
      || antecedentsLoaded
      || !opportunity?.school?.id
      || !opportunity?.created_at
    ) {
      return undefined;
    }

    let ignore = false;

    async function loadSchoolAntecedents() {
      try {
        setAntecedentsLoading(true);
        const schoolHistory = normalizeList(
          await getCRMSchoolCommercialHistory(opportunity.school.id),
        );
        const opportunityCreatedAt = new Date(
          opportunity.created_at,
        ).getTime();

        const antecedents = schoolHistory
          .filter((item) => {
            const occurredAt = new Date(item.occurred_at).getTime();
            return (
              Number.isFinite(occurredAt)
              && Number.isFinite(opportunityCreatedAt)
              && occurredAt < opportunityCreatedAt
            );
          })
          .slice(0, 5);

        if (!ignore) {
          setSchoolAntecedents(antecedents);
          setAntecedentsLoaded(true);
        }
      } catch {
        if (!ignore) {
          setSchoolAntecedents([]);
          setAntecedentsLoaded(true);
        }
      } finally {
        if (!ignore) {
          setAntecedentsLoading(false);
        }
      }
    }

    loadSchoolAntecedents();

    return () => {
      ignore = true;
    };
  }, [
    activeTab,
    antecedentsLoaded,
    opportunity?.created_at,
    opportunity?.school?.id,
  ]);

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

            <h1 className="mt-3 wrap-break-word text-2xl font-black sm:text-3xl">
              {opportunity.school?.name || opportunity.title}
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {opportunity.title}
            </p>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:min-w-105">
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
        <main className="min-w-0 xl:col-span-9 xl:max-h-[68vh] xl:overflow-y-scroll xl:overscroll-contain xl:pr-2">
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
            <CRMOpportunityActivitySection
              opportunity={opportunity}
              activities={activities}
              onChanged={refreshWorkspace}
            />
          ) : null}

          {activeTab === "projection" ? (
            <CRMOpportunityProjectionSection opportunityId={id} />
          ) : null}

          {activeTab === "quotations" ? (
            <CRMOpportunityQuotationSection
              opportunityId={id}
              onOpportunityChanged={refreshWorkspace}
              onGoToAdoption={() => setActiveTab("adoption")}
              onGoToProjection={() => setActiveTab("projection")}
              hasCurrentAdoption={adoptions.some(
                (adoption) => adoption.is_current,
              )}
            />
          ) : null}

          {activeTab === "adoption" ? (
            <CRMOpportunityAdoptionSection
              opportunity={opportunity}
              adoptions={adoptions}
              onAdoptionConfirmed={refreshWorkspace}
            />
          ) : null}

          {activeTab === "history" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Trazabilidad
                  </p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Historial comercial
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Reúne las acciones relevantes de la oportunidad desde su creación hasta la adopción.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white">
                    {history.length} evento{history.length === 1 ? "" : "s"}
                  </div>
                  <Link
                    to={`/admin/crm/oportunidades/${id}/historial/imprimir`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 hover:text-red-700"
                  >
                    <FaPrint />
                    Imprimir historial
                  </Link>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Antecedentes del colegio
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Muestra las últimas gestiones registradas antes de crear esta oportunidad, sin adjudicarlas a este proceso.
                    </p>
                  </div>

                  {opportunity.school?.id ? (
                    <Link
                      to={`/admin/crm/colegios/${opportunity.school.id}`}
                      state={navigationState}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-100"
                    >
                      Ver historial del colegio
                    </Link>
                  ) : null}
                </div>

                {antecedentsLoading ? (
                  <p className="mt-3 text-sm font-bold text-gray-500">
                    Cargando antecedentes...
                  </p>
                ) : schoolAntecedents.length > 0 ? (
                  <div className="mt-3 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
                    {schoolAntecedents.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 px-3 py-3 sm:grid-cols-[10rem_1fr]"
                      >
                        <p className="text-xs font-bold text-gray-500">
                          {formatDateTime(item.occurred_at)}
                        </p>
                        <div>
                          <p className="text-sm font-black text-gray-950">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            {item.event_type_display || "Evento CRM"}
                            {" · "}
                            {item.actor?.full_name
                              || item.actor?.username
                              || "Sistema"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    No hay gestiones anteriores registradas para este colegio.
                  </p>
                )}
              </div>

              {history.length > 0 ? (
                <>
                  <div className="mt-5 hidden overflow-hidden rounded-2xl border border-gray-200 lg:block">
                    <table className="w-full table-fixed border-collapse text-left text-sm">
                      <colgroup>
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "49%" }} />
                      </colgroup>
                      <thead className="bg-gray-100 text-xs font-black uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Fecha y hora</th>
                          <th className="px-4 py-3">Plataforma</th>
                          <th className="px-4 py-3">Usuario</th>
                          <th className="px-4 py-3">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {history.map((item) => (
                          <tr key={item.id} className="align-top">
                            <td className="px-4 py-4 font-semibold text-gray-600">
                              {formatDateTime(item.occurred_at)}
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                              {item.platform || "Página Web"}
                            </td>
                            <td className="px-4 py-4 font-black text-gray-950">
                              {item.actor?.full_name
                                || item.actor?.username
                                || "Sistema"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                                  {item.event_type_display || "Evento CRM"}
                                </span>
                                <p className="font-black text-gray-950">
                                  {item.title}
                                </p>
                              </div>
                              {item.description ? (
                                <p className="mt-2 leading-6 text-gray-600">
                                  {item.description}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 space-y-3 lg:hidden">
                    {history.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                            <FaHistory />
                          </div>
                          <div className="min-w-0">
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                              {item.event_type_display || "Evento CRM"}
                            </span>
                            <p className="mt-3 font-black text-gray-950">
                              {item.title}
                            </p>
                            {item.description ? (
                              <p className="mt-2 text-sm leading-6 text-gray-600">
                                {item.description}
                              </p>
                            ) : null}
                            <p className="mt-3 text-xs leading-5 text-gray-500">
                              {formatDateTime(item.occurred_at)}
                              {" · "}
                              {item.platform || "Página Web"}
                              {" · "}
                              {item.actor?.full_name
                                || item.actor?.username
                                || "Sistema"}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Sin historial comercial"
                    description="Las actividades, proyecciones, cotizaciones, cambios de etapa y adopciones aparecerán aquí."
                  />
                </div>
              )}
            </section>
          ) : null}
        </main>

        <aside className="min-w-0 xl:col-span-3 xl:max-h-[68vh] xl:overflow-y-scroll xl:overscroll-contain xl:pr-2">
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
                    <p className="mt-1 wrap-break-word font-black text-gray-950">
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
                    <p className="mt-1 wrap-break-word font-black text-gray-950">
                      {opportunity.primary_contact?.full_name
                        || "Sin contacto principal"}
                    </p>

                    {opportunity.primary_contact?.position ? (
                      <p className="mt-1 text-xs font-semibold text-gray-600">
                        {opportunity.primary_contact.position}
                      </p>
                    ) : null}

                    {opportunity.primary_contact?.decision_role_display ? (
                      <p className="mt-1 text-xs font-bold text-red-700">
                        {opportunity.primary_contact.decision_role_display}
                      </p>
                    ) : null}
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
