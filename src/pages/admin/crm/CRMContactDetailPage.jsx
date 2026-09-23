import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaEnvelope,
  FaExclamationTriangle,
  FaPhoneAlt,
  FaSchool,
  FaStar,
  FaTasks,
  FaUserTie,
} from "react-icons/fa";

import {
  getCRMContact,
  getCRMContactActivities,
  getCRMContactWorkItems,
} from "../../../api/crmApi";

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

function ContactStatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      }`}
    >
      {active ? "Vigente" : "Inactivo"}
    </span>
  );
}

function InfoValue({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-200">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-bold text-gray-900">
            {value || "No registrado"}
          </p>
        </div>
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

function WorkItemDate({ workItem }) {
  const item = workItem?.item || {};

  if (workItem?.type === "event") {
    return formatDateTime(item.start_at);
  }

  if (workItem?.type === "task") {
    return formatDateTime(item.due_at || item.reminder_at);
  }

  return formatDateTime(item.remind_at);
}

export default function CRMContactDetailPage() {
  const { id } = useParams();

  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadContactWorkspace() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [contactData, activitiesData, workItemsData] = await Promise.all([
          getCRMContact(id),
          getCRMContactActivities(id, { page_size: 50 }),
          getCRMContactWorkItems(id, { page_size: 50 }),
        ]);

        if (!ignore) {
          setContact(contactData);
          setActivities(normalizeResults(activitiesData));
          setWorkItems(normalizeResults(workItemsData));
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la ficha del contacto.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadContactWorkspace();

    return () => {
      ignore = true;
    };
  }, [id]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") {
      return activities;
    }

    return activities.filter(
      (activity) => activity.activity_type === activityFilter,
    );
  }, [activities, activityFilter]);

  const relatedOpportunityIds = useMemo(() => {
    const ids = new Set();

    activities.forEach((activity) => {
      if (activity.opportunity_id) {
        ids.add(activity.opportunity_id);
      }
    });

    workItems.forEach((workItem) => {
      if (workItem.opportunity_id) {
        ids.add(workItem.opportunity_id);
      }
    });

    return Array.from(ids);
  }, [activities, workItems]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-3xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage || !contact) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
          to="/admin/crm/contactos"
        >
          <FaArrowLeft />
          Volver a contactos
        </Link>

        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-red-800">
              {errorMessage || "No se encontró el contacto solicitado."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const school = contact.school;
  const contactNumber = contact.whatsapp || contact.phone;
  const relationshipLevel = Number(contact.relationship_level);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Link
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
        to="/admin/crm/contactos"
      >
        <FaArrowLeft />
        Volver a contactos
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial · Contacto
            </p>
            <h1 className="mt-1 break-words text-2xl font-black sm:text-3xl">
              {contact.full_name}
            </h1>
            <p className="mt-2 text-sm text-gray-300">
              {contact.position || "Cargo no registrado"}
              {school?.name ? ` · ${school.name}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {contact.is_primary ? (
              <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white">
                Contacto principal
              </span>
            ) : null}
            <ContactStatusBadge active={contact.is_active} />
          </div>
        </div>
      </motion.section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoValue
          icon={FaSchool}
          label="Colegio"
          value={school?.name}
        />
        <InfoValue
          icon={FaUserTie}
          label="Rol en la decisión"
          value={contact.decision_role_display || "Sin clasificar"}
        />
        <InfoValue
          icon={FaBriefcase}
          label="Relacionamiento"
          value={
            Number.isInteger(relationshipLevel) && relationshipLevel > 0
              ? `${relationshipLevel}/5`
              : "Sin evaluar"
          }
        />
        <InfoValue
          icon={FaStar}
          label="Actividad registrada"
          value={`${activities.length} registro${activities.length === 1 ? "" : "s"}`}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Contacto
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Datos principales
            </h2>

            <div className="mt-4 space-y-3">
              <InfoValue
                icon={FaPhoneAlt}
                label="Celular / WhatsApp"
                value={contactNumber}
              />
              <InfoValue
                icon={FaPhoneAlt}
                label="Teléfono alternativo"
                value={
                  contact.phone && contact.phone !== contactNumber
                    ? contact.phone
                    : ""
                }
              />
              <InfoValue
                icon={FaEnvelope}
                label="Correo"
                value={contact.email}
              />
            </div>

            {contact.notes ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                  Observaciones
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {contact.notes}
                </p>
              </div>
            ) : null}
          </section>
        </aside>

        <main className="xl:col-span-2">
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Historial comercial
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Actividades
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Aquí se reúne la actividad registrada con este contacto sin
                duplicar información entre contacto y colegio.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
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
                  {filteredActivities.map((activity) => (
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

                      <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">
                        Registrado por{" "}
                        <span className="font-black text-gray-700">
                          {activity.performed_by?.full_name ||
                            activity.performed_by?.username ||
                            "Usuario CRM"}
                        </span>
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
                    Las llamadas, visitas, reuniones y seguimientos asociados a
                    este contacto aparecerán aquí.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Relaciones
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Colegio vinculado
            </h2>

            {school ? (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                    <FaSchool />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words font-black text-gray-950">
                      {school.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Institución relacionada
                    </p>
                  </div>
                </div>

                <Link
                  className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  to={`/admin/crm/colegios/${school.id}`}
                >
                  Abrir colegio
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                No hay un colegio relacionado.
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                Negocios relacionados
              </p>
              <p className="mt-1 text-2xl font-black text-gray-950">
                {relatedOpportunityIds.length}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Oportunidades detectadas a partir de actividades o trabajo
                relacionado con este contacto.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Próximas acciones
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              ToDo / Agenda
            </h2>

            {workItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {workItems.slice(0, 6).map((workItem) => (
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
                          {WorkItemDate({ workItem })}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                {workItems.length > 6 ? (
                  <p className="text-center text-xs font-semibold text-gray-500">
                    + {workItems.length - 6} acción(es) adicional(es)
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm font-black text-gray-900">
                  Sin próximas acciones
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Cuando una actividad genere una tarea, reunión o recordatorio,
                  aparecerá aquí y también en ToDo/Agenda.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
