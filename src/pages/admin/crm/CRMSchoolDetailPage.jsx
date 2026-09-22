import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  FaArrowLeft,
  FaBuilding,
  FaChartLine,
  FaEnvelope,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import { getCRMSchool } from "../../../api/crmApi";
import SchoolContactsSection from "../../../components/admin/crm/SchoolContactsSection";
import SchoolEducationalServicesSection from "../../../components/admin/crm/SchoolEducationalServicesSection";
import SchoolEditorialUsagesSection from "../../../components/admin/crm/SchoolEditorialUsagesSection";

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
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3">
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
      <div className="h-64 animate-pulse rounded-3xl bg-gray-200" />
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

  const hasAdditionalData =
    school &&
    (hasValue(school.ruc) ||
      hasValue(school.institution_code) ||
      hasValue(school.reference));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
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
                  Ficha general del colegio y su perfil comercial.
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

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-8">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Datos del colegio
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Información de contacto
                  </h2>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600">
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
                      <p className="basis-full">
                        <span className="font-black text-gray-900">
                          Referencia:
                        </span>{" "}
                        {school.reference}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <SchoolEducationalServicesSection
                school={school}
                onSchoolUpdated={setSchool}
              />

              <SchoolContactsSection
                school={school}
                onSchoolUpdated={setSchool}
              />

              <SchoolEditorialUsagesSection
                school={school}
                onSchoolUpdated={setSchool}
              />
            </div>

            <aside className="xl:col-span-4">
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Prioridad
                    </p>

                    <p className="mt-1 font-black text-gray-950">
                      {school.commercial_profile?.priority_display ||
                        "Sin evaluar"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Uso de textos
                    </p>

                    <p className="mt-1 font-black text-gray-950">
                      {school.commercial_profile?.textbook_usage_display ||
                        "Sin información"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-gray-500">
                  Las visitas, llamadas, reuniones y oportunidades se gestionan
                  en el seguimiento comercial, no en esta ficha general.
                </p>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
