import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
  FaArrowLeft,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaEnvelope,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSchool,
  FaStar,
  FaTasks,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCRMSchool,
  getCRMSchoolActivities,
  getCRMSchoolWorkItems,
} from "../../../api/crmApi";
import SchoolEducationalServicesSection from "../../../components/admin/crm/SchoolEducationalServicesSection";
import SchoolEditorialUsagesSection from "../../../components/admin/crm/SchoolEditorialUsagesSection";

const ACTIVITY_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "call", label: "Llamadas" },
  { value: "visit", label: "Visitas" },
  { value: "meeting", label: "Reuniones" },
  { value: "follow_up", label: "Seguimientos" },
];

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
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.join(" ");
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatLocation(school) {
  return [school?.district, school?.province, school?.department]
    .filter(Boolean)
    .join(", ");
}

function formatOwner(owner) {
  if (!owner) {
    return "Sin asesor asignado";
  }

  return owner.full_name || owner.username || "Asesor asignado";
}

function formatTeam(team) {
  return team?.name || "Sin equipo comercial";
}

function formatSegment(segment) {
  if (!segment || segment === "OUT") {
    return "Fuera del objetivo base";
  }

  return `Segmento ${segment}`;
}

function formatPopulation(school) {
  return (
    school?.current_population_total ??
    school?.estimated_students ??
    "Sin información"
  );
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

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-xs text-white">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-black text-gray-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200">
      <div className="mt-0.5 shrink-0 text-gray-500">
        <Icon />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-gray-900">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  );
}

function WorkItemIcon({ type }) {
  if (type === "event") {
    return <FaCalendarAlt />;
  }

  if (type === "task") {
    return <FaTasks />;
  }

  return <FaStar />;
}

function getWorkItemDate(workItem) {
  const item = workItem?.item || {};

  if (workItem?.type === "event") {
    return item.start_at;
  }

  if (workItem?.type === "task") {
    return item.due_at || item.reminder_at;
  }

  return item.remind_at;
}

function isPendingWorkItem(workItem) {
  const item = workItem?.item || {};

  if (workItem?.type === "task") {
    return !["completed", "cancelled"].includes(item.status);
  }

  if (workItem?.type === "reminder") {
    return !["completed", "dismissed"].includes(item.status);
  }

  if (workItem?.type === "event") {
    if (!item.start_at) {
      return true;
    }

    const startAt = new Date(item.start_at);

    return Number.isNaN(startAt.getTime()) || startAt >= new Date();
  }

  return true;
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-gray-200"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-gray-200" />
    </div>
  );
}

export default function CRMSchoolDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  const [school, setSchool] = useState(null);
  const [activities, setActivities] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [activeInfoTab, setActiveInfoTab] = useState("activity");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [supportingWarning, setSupportingWarning] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSchoolWorkspace() {
      try {
        setLoading(true);
        setErrorMessage("");
        setSupportingWarning("");

        const schoolData = await getCRMSchool(id);

        if (ignore) {
          return;
        }

        setSchool(schoolData);

        const [activitiesResult, workItemsResult] = await Promise.allSettled([
          getCRMSchoolActivities(id),
          getCRMSchoolWorkItems(id),
        ]);

        if (ignore) {
          return;
        }

        if (activitiesResult.status === "fulfilled") {
          setActivities(normalizeResults(activitiesResult.value));
        } else {
          setActivities([]);
          setSupportingWarning(
            "La ficha cargó, pero no se pudo mostrar el historial comercial.",
          );
        }

        if (workItemsResult.status === "fulfilled") {
          setWorkItems(normalizeResults(workItemsResult.value));
        } else {
          setWorkItems([]);
          setSupportingWarning((currentWarning) =>
            currentWarning
              ? `${currentWarning} Tampoco se pudieron cargar las próximas acciones.`
              : "La ficha cargó, pero no se pudieron mostrar las próximas acciones.",
          );
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la ficha comercial del colegio.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSchoolWorkspace();

    return () => {
      ignore = true;
    };
  }, [id]);

  const hasAdditionalData =
    school &&
    (hasValue(school.ruc) ||
      hasValue(school.institution_code) ||
      hasValue(school.reference));

  const cameFromContact =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/admin/crm/contactos/");

  const backPath = cameFromContact
    ? location.state.from
    : "/admin/crm/colegios";

  const backLabel = cameFromContact
    ? "Volver al contacto"
    : "Volver a colegios";

  const visibleContacts = useMemo(() => {
    const contacts = Array.isArray(school?.contacts)
      ? [...school.contacts]
      : [];

    return contacts
      .filter((contact) => contact.is_active)
      .sort((contactA, contactB) => {
        if (contactA.is_primary !== contactB.is_primary) {
          return contactA.is_primary ? -1 : 1;
        }

        return contactA.full_name.localeCompare(contactB.full_name, "es");
      });
  }, [school]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") {
      return activities;
    }

    return activities.filter(
      (activity) => activity.activity_type === activityFilter,
    );
  }, [activities, activityFilter]);

  const pendingWorkItems = useMemo(
    () => workItems.filter(isPendingWorkItem),
    [workItems],
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          to={backPath}
        >
          <FaArrowLeft />
          {backLabel}
        </Link>
      </div>

      {loading ? <LoadingState /> : null}

      {!loading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-1 shrink-0 text-red-700" />

            <div>
              <p className="font-black text-red-900">
                No pudimos abrir la ficha
              </p>

              <p className="mt-1 text-sm leading-6 text-red-800">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !errorMessage && school ? (
        <div className="space-y-4">
          <section className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-red-300">
                  CRM Comercial · Colegio
                </p>

                <StatusBadge isActive={school.is_active} />
              </div>

              <div>
                <h1 className="break-words text-2xl font-black sm:text-3xl">
                  {school.name}
                </h1>

                <p className="mt-1 text-sm text-gray-300">
                  Información institucional, relaciones y seguimiento comercial
                  en un mismo lugar.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryItem
              icon={FaUserTie}
              label="Asesor responsable"
              value={formatOwner(school.owner)}
            />

            <SummaryItem
              icon={FaUsers}
              label="Equipo comercial"
              value={formatTeam(school.team)}
            />

            <SummaryItem
              icon={FaMapMarkerAlt}
              label="Ubicación"
              value={formatLocation(school) || "Sin ubicación registrada"}
            />

            <SummaryItem
              icon={FaBuilding}
              label="Población"
              value={formatPopulation(school)}
            />
          </section>

          {supportingWarning ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {supportingWarning}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-12">
            <aside className="space-y-4 xl:col-span-3">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Colegio
                </p>

                <h2 className="mt-1 text-xl font-black text-gray-950">
                  Datos principales
                </h2>

                <div className="mt-4 space-y-3">
                  <InfoItem
                    icon={FaPhoneAlt}
                    label="Teléfono"
                    value={school.phone}
                  />

                  <InfoItem
                    icon={FaWhatsapp}
                    label="WhatsApp"
                    value={school.whatsapp}
                  />

                  <InfoItem
                    icon={FaEnvelope}
                    label="Correo"
                    value={school.email}
                  />

                  <InfoItem
                    icon={FaMapMarkerAlt}
                    label="Dirección"
                    value={school.address}
                  />
                </div>

                {hasAdditionalData ? (
                  <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600">
                    {hasValue(school.ruc) ? (
                      <p>
                        <span className="font-black text-gray-900">RUC:</span>{" "}
                        {school.ruc}
                      </p>
                    ) : null}

                    {hasValue(school.institution_code) ? (
                      <p>
                        <span className="font-black text-gray-900">
                          Código de institución:
                        </span>{" "}
                        {school.institution_code}
                      </p>
                    ) : null}

                    {hasValue(school.reference) ? (
                      <p>
                        <span className="font-black text-gray-900">
                          Referencia:
                        </span>{" "}
                        {school.reference}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                    <FaChartLine />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Perfil comercial
                    </p>

                    <h2 className="mt-1 text-lg font-black text-gray-950">
                      {formatSegment(school.segment)}
                    </h2>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Prioridad comercial
                    </p>

                    <p className="mt-1 font-black text-gray-950">
                      {school.commercial_profile?.priority_display ||
                        "Sin evaluar"}
                    </p>

                    {school.commercial_profile?.priority_score != null ? (
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        Score {school.commercial_profile.priority_score} / 100
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Uso de textos
                    </p>

                    <p className="mt-1 font-black text-gray-950">
                      {school.commercial_profile?.textbook_usage_display ||
                        "Sin información"}
                    </p>
                  </div>
                </div>
              </section>
            </aside>

            <main className="xl:col-span-6">
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-5 pt-5">
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Espacio de trabajo
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Gestión comercial del colegio
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Consulta el historial, la población y las editoriales sin salir de la ficha.
                  </p>

                  <div
                    className="mt-4 flex gap-2 overflow-x-auto pb-3"
                    role="tablist"
                    aria-label="Gestión comercial del colegio"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeInfoTab === "activity"}
                      onClick={() => setActiveInfoTab("activity")}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeInfoTab === "activity"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                    >
                      Actividad
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                        {activities.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeInfoTab === "population"}
                      onClick={() => setActiveInfoTab("population")}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeInfoTab === "population"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                    >
                      Población
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                        {school.current_population_total ?? 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeInfoTab === "editorials"}
                      onClick={() => setActiveInfoTab("editorials")}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeInfoTab === "editorials"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                    >
                      Editoriales
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                        {Array.isArray(school.editorial_usages)
                          ? school.editorial_usages.length
                          : 0}
                      </span>
                    </button>
                  </div>
                </div>

                {activeInfoTab === "activity" ? (
                  <>
                    <div className="border-b border-gray-200 px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {ACTIVITY_FILTERS.map((filter) => (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => setActivityFilter(filter.value)}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                              activityFilter === filter.value
                                ? "bg-gray-950 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5">
                      {filteredActivities.length > 0 ? (
                        <div className="space-y-3">
                          {filteredActivities.slice(0, 12).map((activity) => (
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
                                <p>
                                  Registrado por{" "}
                                  <span className="font-black text-gray-700">
                                    {activity.performed_by?.full_name ||
                                      activity.performed_by?.username ||
                                      "Usuario CRM"}
                                  </span>
                                </p>

                                {activity.contact ? (
                                  <Link
                                    to={`/admin/crm/contactos/${activity.contact.id}`}
                                    state={{
                                      from: `/admin/crm/colegios/${school.id}`,
                                      fromLabel: school.name,
                                      fromType: "school",
                                    }}
                                    className="font-black text-red-700 transition hover:text-red-900"
                                  >
                                    {activity.contact.full_name}
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-gray-400">
                                    Actividad general del colegio
                                  </span>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                          <p className="font-black text-gray-950">
                            Sin actividades para mostrar
                          </p>

                          <p className="mt-1 text-sm leading-6 text-gray-500">
                            Cuando un asesor registre una actividad con un contacto
                            de este colegio, aparecerá también en esta ficha.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {activeInfoTab === "population" ? (
                  <SchoolEducationalServicesSection
                    school={school}
                    onSchoolUpdated={setSchool}
                    embedded
                  />
                ) : null}

                {activeInfoTab === "editorials" ? (
                  <SchoolEditorialUsagesSection
                    school={school}
                    onSchoolUpdated={setSchool}
                    embedded
                  />
                ) : null}
              </section>
            </main>

            <aside className="space-y-4 xl:col-span-3">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Relaciones
                    </p>

                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      Contactos vinculados
                    </h2>
                  </div>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600">
                    {visibleContacts.length}
                  </span>
                </div>

                {visibleContacts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {visibleContacts.slice(0, 4).map((contact) => (
                      <Link
                        key={contact.id}
                        to={`/admin/crm/contactos/${contact.id}`}
                        state={{
                          from: `/admin/crm/colegios/${school.id}`,
                          fromLabel: school.name,
                          fromType: "school",
                        }}
                        className="block rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200 transition hover:bg-red-50 hover:ring-red-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                            <FaUserTie />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-words text-sm font-black text-gray-950">
                                {contact.full_name}
                              </p>

                              {contact.is_primary ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-black text-red-700 ring-1 ring-red-200">
                                  Principal
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {contact.position || "Cargo no registrado"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-600">
                              {contact.decision_role_display || "Sin clasificar"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}

                    {visibleContacts.length > 4 ? (
                      <p className="text-center text-xs font-semibold text-gray-500">
                        + {visibleContacts.length - 4} contacto(s) adicional(es)
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                    <FaSchool className="mx-auto text-gray-400" />
                    <p className="mt-2 text-sm font-black text-gray-900">
                      Sin contactos vigentes
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Próximas acciones
                    </p>

                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      ToDo / Agenda
                    </h2>
                  </div>

                  <Link
                    to="/admin/workspace/calendar"
                    state={{
                      from: `/admin/crm/colegios/${school.id}`,
                      fromLabel: school.name,
                      fromType: "school",
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <FaCalendarAlt />
                    Calendario
                  </Link>
                </div>

                {pendingWorkItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {pendingWorkItems.slice(0, 5).map((workItem) => (
                      <article
                        key={workItem.id}
                        className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-200">
                            <WorkItemIcon type={workItem.type} />
                          </div>

                          <div className="min-w-0">
                            <p className="break-words text-sm font-black text-gray-950">
                              {workItem.item?.title || "Acción programada"}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {formatDateTime(getWorkItemDate(workItem))}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}

                    {pendingWorkItems.length > 5 ? (
                      <p className="text-center text-xs font-semibold text-gray-500">
                        + {pendingWorkItems.length - 5} acción(es) adicional(es)
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                    <p className="text-sm font-black text-gray-900">
                      Sin próximas acciones
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Las tareas, reuniones y recordatorios vinculados al
                      colegio aparecerán aquí.
                    </p>
                  </div>
                )}
              </section>
            </aside>
          </div>


        </div>
      ) : null}
    </div>
  );
}