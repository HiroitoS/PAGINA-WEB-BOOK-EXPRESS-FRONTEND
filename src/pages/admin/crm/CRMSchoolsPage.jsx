import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaEnvelope,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSchool,
  FaSearch,
  FaTimes,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import { getCRMSchool, getCRMSchools } from "../../../api/crmApi";

const INITIAL_FILTERS = {
  search: "",
  is_active: "true",
  department: "",
  province: "",
  district: "",
};

const PAGE_SIZE = 25;

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

function buildParams(filters, page) {
  const params = {
    page,
    page_size: PAGE_SIZE,
  };

  Object.entries(filters).forEach(([key, value]) => {
    const normalizedValue = String(value ?? "").trim();

    if (normalizedValue) {
      params[key] = normalizedValue;
    }
  });

  return params;
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
  return team?.name || "Sin equipo";
}

function SchoolStatusBadge({ isActive }) {
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

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl bg-gray-100"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-700 ring-1 ring-gray-200">
        <FaSchool />
      </div>
      <p className="mt-4 text-base font-black text-gray-950">
        No encontramos colegios.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
        Ajusta los filtros o registra colegios cuando habilitemos la gestión
        completa de esta sección.
      </p>
    </div>
  );
}

function SchoolDetailDrawer({ schoolId, onClose }) {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSchool() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCRMSchool(schoolId);

        if (!ignore) {
          setSchool(data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar el detalle del colegio.",
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
  }, [schoolId]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Cerrar detalle"
        className="absolute inset-0 bg-black/50"
        type="button"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Ficha comercial
              </p>
              <h2 className="mt-1 truncate text-xl font-black text-gray-950 sm:text-2xl">
                {school?.name || "Colegio"}
              </h2>
            </div>

            <button
              aria-label="Cerrar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-100"
              type="button"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <LoadingRows />
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <FaExclamationTriangle className="mt-1 shrink-0 text-red-700" />
                <p className="text-sm leading-6 text-red-800">
                  {errorMessage}
                </p>
              </div>
            </div>
          ) : school ? (
            <div className="space-y-5">
              <section className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <SchoolStatusBadge isActive={school.is_active} />
                  {school.institution_code ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                      Cód. institución: {school.institution_code}
                    </span>
                  ) : null}
                  {school.ruc ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                      RUC: {school.ruc}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <InfoItem
                    icon={FaUserTie}
                    label="Asesor responsable"
                    value={formatOwner(school.owner)}
                  />
                  <InfoItem
                    icon={FaUsers}
                    label="Equipo comercial"
                    value={formatTeam(school.team)}
                  />
                  <InfoItem
                    icon={FaMapMarkerAlt}
                    label="Ubicación"
                    value={formatLocation(school) || "Sin ubicación registrada"}
                  />
                  <InfoItem
                    icon={FaBuilding}
                    label="Población vigente"
                    value={
                      school.current_population_total != null
                        ? String(school.current_population_total)
                        : school.estimated_students != null
                          ? String(school.estimated_students)
                          : "Sin información"
                    }
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Contacto institucional
                </p>

                <div className="mt-4 grid gap-3">
                  <ContactLine
                    icon={FaPhoneAlt}
                    label="Teléfono"
                    value={school.phone}
                  />
                  <ContactLine
                    icon={FaWhatsapp}
                    label="WhatsApp"
                    value={school.whatsapp}
                  />
                  <ContactLine
                    icon={FaEnvelope}
                    label="Correo"
                    value={school.email}
                  />
                  <ContactLine
                    icon={FaMapMarkerAlt}
                    label="Dirección"
                    value={school.address}
                  />
                </div>

                {school.reference ? (
                  <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                    <span className="font-black text-gray-900">
                      Referencia:
                    </span>{" "}
                    {school.reference}
                  </p>
                ) : null}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Personas de contacto
                    </p>
                    <h3 className="mt-1 text-lg font-black text-gray-950">
                      Contactos del colegio
                    </h3>
                  </div>

                  <span className="rounded-full bg-gray-950 px-3 py-1 text-xs font-black text-white">
                    {school.contacts?.length || 0}
                  </span>
                </div>

                {Array.isArray(school.contacts) && school.contacts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {school.contacts.map((contact) => (
                      <article
                        key={contact.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-gray-950">
                              {contact.full_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {contact.position || "Cargo no registrado"}
                            </p>
                          </div>

                          {contact.is_primary ? (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">
                              Principal
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                          <span>{contact.phone || contact.whatsapp || "Sin teléfono"}</span>
                          <span>{contact.email || "Sin correo"}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                    Todavía no hay contactos registrados para este colegio.
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Información comercial
                </p>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Niveles educativos
                  </p>

                  {Array.isArray(school.educational_services) &&
                  school.educational_services.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {school.educational_services.map((service) => (
                        <span
                          key={service.id}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700"
                        >
                          {service.level?.name || "Nivel no registrado"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Sin niveles registrados.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Observaciones
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {school.notes || "Sin observaciones registradas."}
                  </p>
                </div>
              </section>
              <Link
                className="flex w-full items-center justify-center rounded-2xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800"
                to={`/admin/crm/colegios/${school.id}`}
                onClick={onClose}
              >
                Abrir ficha comercial completa
              </Link>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      <div className="flex gap-3">
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

function ContactLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3">
      <div className="mt-0.5 text-gray-500">
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

export default function CRMSchoolsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [schools, setSchools] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.count || 0) / PAGE_SIZE)),
    [pagination.count],
  );

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCRMSchools(buildParams(filters, page));

        if (!ignore) {
          setSchools(Array.isArray(data?.results) ? data.results : []);
          setPagination({
            count: Number(data?.count || 0),
            next: data?.next || null,
            previous: data?.previous || null,
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la cartera de colegios.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [filters, page]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(INITIAL_FILTERS);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gray-950 px-5 py-6 text-white shadow-sm sm:px-7 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Colegios
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Consulta la cartera institucional visible para tu responsabilidad
              comercial y revisa sus principales datos de seguimiento.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Total visible
            </p>
            <p className="mt-1 text-2xl font-black">
              {pagination.count}
            </p>
          </div>
        </div>
      </motion.section>

      <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Filtros
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-950">
              Buscar colegios
            </h2>
          </div>

          <button
            className="w-fit rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            type="button"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-2">
            <span className="sr-only">Buscar</span>
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              name="search"
              placeholder="Nombre, código modular, RUC, teléfono..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </label>

          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            name="is_active"
            value={filters.is_active}
            onChange={handleFilterChange}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>

          <input
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            name="province"
            placeholder="Provincia"
            value={filters.province}
            onChange={handleFilterChange}
          />

          <input
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            name="district"
            placeholder="Distrito"
            value={filters.district}
            onChange={handleFilterChange}
          />
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-red-800">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-5 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-black text-gray-950">
            Cartera de colegios
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Los resultados respetan el alcance comercial del usuario conectado.
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <LoadingRows />
          ) : schools.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3">Colegio</th>
                      <th className="px-3 py-3">Ubicación</th>
                      <th className="px-3 py-3">Responsable</th>
                      <th className="px-3 py-3">Alumnos</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schools.map((school) => (
                      <tr key={school.id} className="align-top">
                        <td className="px-3 py-4">
                          <p className="font-black text-gray-950">
                            {school.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {school.institution_code
                              ? `Cód. institución ${school.institution_code}`
                              : school.modular_code
                                ? `Cód. modular ${school.modular_code}`
                                : school.ruc
                                  ? `RUC ${school.ruc}`
                                  : "Sin código registrado"}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {formatLocation(school) || "Sin ubicación"}
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-sm font-bold text-gray-900">
                            {formatOwner(school.owner)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatTeam(school.team)}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-sm font-bold text-gray-700">
                          {school.current_population_total ??
                            school.estimated_students ??
                            "—"}
                        </td>
                        <td className="px-3 py-4">
                          <SchoolStatusBadge isActive={school.is_active} />
                        </td>
                        <td className="px-3 py-4 text-right">
                          <button
                            className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                            type="button"
                            onClick={() => setSelectedSchoolId(school.id)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {schools.map((school) => (
                  <article
                    key={school.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-black text-gray-950">
                          {school.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatLocation(school) || "Sin ubicación"}
                        </p>
                      </div>
                      <SchoolStatusBadge isActive={school.is_active} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <p>
                        <span className="font-black text-gray-900">Asesor:</span>{" "}
                        {formatOwner(school.owner)}
                      </p>
                      <p>
                        <span className="font-black text-gray-900">Equipo:</span>{" "}
                        {formatTeam(school.team)}
                      </p>
                    </div>

                    <button
                      className="mt-4 w-full rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                      type="button"
                      onClick={() => setSelectedSchoolId(school.id)}
                    >
                      Ver detalle
                    </button>
                  </article>
                ))}
              </div>

              <div className="mt-5 flex flex-col justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-gray-500">
                  Página {page} de {totalPages} · {pagination.count} colegio(s)
                </p>

                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!pagination.previous}
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  >
                    <FaChevronLeft className="text-xs" />
                    Anterior
                  </button>

                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!pagination.next}
                    type="button"
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Siguiente
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {selectedSchoolId ? (
        <SchoolDetailDrawer
          schoolId={selectedSchoolId}
          onClose={() => setSelectedSchoolId(null)}
        />
      ) : null}
    </div>
  );
}
