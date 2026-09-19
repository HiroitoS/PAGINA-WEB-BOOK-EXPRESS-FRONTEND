import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  FaArrowLeft,
  FaBookOpen,
  FaBuilding,
  FaChartLine,
  FaEnvelope,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSchool,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import { getCRMSchool } from "../../../api/crmApi";

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

function formatLocation(school) {
  return [school?.district, school?.province, school?.department]
    .filter(Boolean)
    .join(", ");
}

function formatOwner(owner) {
  if (!owner) return "Sin asesor asignado";

  return owner.full_name || owner.username || "Asesor asignado";
}

function formatTeam(team) {
  return team?.name || "Sin equipo comercial";
}

function formatPopulation(school) {
  const population = school?.current_population_total ?? school?.estimated_students;

  return population != null ? String(population) : "Sin información";
}

function formatSegment(segment) {
  return segment && segment !== "OUT" ? `Segmento ${segment}` : "Fuera del objetivo base";
}

function formatDate(value) {
  if (!value) return "No registrado";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No registrado";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
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

function ContactItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-gray-500">
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
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
        <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
      </div>
    </div>
  );
}

export default function CRMSchoolDetailPage() {
  const { id } = useParams();

  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSchool() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCRMSchool(id);

        if (!ignore) {
          setSchool(data);
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

    loadSchool();

    return () => {
      ignore = true;
    };
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          to="/admin/crm/colegios"
        >
          <FaArrowLeft />
          Volver a colegios
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
        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
            <div className="px-5 py-6 sm:px-7 lg:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-wide text-red-300">
                      CRM Comercial · Ficha institucional
                    </p>

                    <StatusBadge isActive={school.is_active} />
                  </div>

                  <h1 className="mt-3 break-words text-2xl font-black sm:text-3xl lg:text-4xl">
                    {school.name}
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
                    Información institucional, contactos y responsabilidad
                    comercial del colegio.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:flex">
                  <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                    <p className="text-xs font-bold uppercase text-gray-400">
                      Código de institución
                    </p>

                    <p className="mt-1 font-black">
                      {school.institution_code || "No registrado"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                    <p className="text-xs font-bold uppercase text-gray-400">
                      RUC
                    </p>

                    <p className="mt-1 font-black">
                      {school.ruc || "No registrado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                label="Población vigente"
                value={formatPopulation(school)}
              />
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Información institucional
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Datos principales
                  </h2>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ContactItem
                    icon={FaPhoneAlt}
                    label="Teléfono"
                    value={school.phone}
                  />

                  <ContactItem
                    icon={FaWhatsapp}
                    label="WhatsApp"
                    value={school.whatsapp}
                  />

                  <ContactItem
                    icon={FaEnvelope}
                    label="Correo"
                    value={school.email}
                  />

                  <ContactItem
                    icon={FaMapMarkerAlt}
                    label="Dirección"
                    value={school.address}
                  />
                </div>

                {school.reference ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Referencia
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {school.reference}
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Personas de contacto
                    </p>

                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      Contactos del colegio
                    </h2>
                  </div>

                  <span className="rounded-full bg-gray-950 px-3 py-1 text-xs font-black text-white">
                    {school.contacts?.length || 0}
                  </span>
                </div>

                {Array.isArray(school.contacts) &&
                school.contacts.length > 0 ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {school.contacts.map((contact) => (
                      <article
                        key={contact.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-black text-gray-950">
                              {contact.full_name}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {contact.position || "Cargo no registrado"}
                            </p>
                          </div>

                          {contact.is_primary ? (
                            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">
                              Principal
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                          <p>
                            <span className="font-black text-gray-900">
                              Teléfono:
                            </span>{" "}
                            {contact.phone ||
                              contact.whatsapp ||
                              "No registrado"}
                          </p>

                          <p className="break-words">
                            <span className="font-black text-gray-900">
                              Correo:
                            </span>{" "}
                            {contact.email || "No registrado"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                    <FaUsers className="mx-auto text-gray-400" />

                    <p className="mt-3 font-black text-gray-950">
                      Sin contactos registrados
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Este colegio todavía no tiene personas de contacto
                      registradas.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Inteligencia comercial
                  </p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Editoriales identificadas
                  </h2>
                </div>

                {Array.isArray(school.editorial_usages) &&
                school.editorial_usages.length > 0 ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {school.editorial_usages.map((usage) => (
                      <article
                        key={usage.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <p className="font-black text-gray-950">
                          {usage.provider?.name || "Editorial no registrada"}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {usage.area?.name || "Área no especificada"}
                          {usage.service?.level ? ` · ${usage.service.level}` : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
                            {usage.year}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
                            {usage.status_display}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
                            {usage.source_display}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-7 text-center">
                    <p className="font-black text-gray-950">
                      Sin editoriales registradas
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Aún no hay información comercial de editoriales para este colegio.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Cobertura educativa
                </p>

                <h2 className="mt-1 text-lg font-black text-gray-950">
                  Servicios educativos
                </h2>

                {Array.isArray(school.educational_services) &&
                school.educational_services.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {school.educational_services.map((service) => (
                      <article
                        key={service.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                            <FaBookOpen />
                          </div>

                          <div className="min-w-0">
                            <p className="font-black text-gray-950">
                              {service.level?.name || "Nivel no registrado"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Código modular: {service.modular_code || "No registrado"}
                            </p>
                            {service.modality ? (
                              <p className="mt-1 text-xs text-gray-500">
                                {service.modality}
                              </p>
                            ) : null}
                            <p className="mt-2 text-sm font-bold text-gray-700">
                              {service.latest_population?.student_count != null
                                ? `${service.latest_population.student_count} alumnos · ${service.latest_population.year}`
                                : "Población sin registrar"}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-gray-500">
                    No hay servicios educativos registrados.
                  </p>
                )}
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

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Prioridad
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {school.commercial_profile?.priority_display || "Sin evaluar"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Uso de textos
                    </p>
                    <p className="mt-1 font-black text-gray-950">
                      {school.commercial_profile?.textbook_usage_display || "Sin información"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Seguimiento
                </p>

                <h2 className="mt-1 text-lg font-black text-gray-950">
                  Observaciones
                </h2>

                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-600">
                  {school.notes || "Sin observaciones registradas."}
                </p>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-gray-950 p-5 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <FaSchool />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Registro CRM
                    </p>

                    <p className="font-black">
                      Colegio #{school.id}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs text-gray-400">
                    Registrado
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {formatDate(school.created_at)}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-gray-400">
                    Última actualización
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {formatDate(school.updated_at)}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}