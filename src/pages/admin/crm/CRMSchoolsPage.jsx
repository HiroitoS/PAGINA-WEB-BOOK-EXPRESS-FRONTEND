import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaFileExcel,
  FaSchool,
  FaSearch,
} from "react-icons/fa";

import {
  getCRMSchoolLocationOptions,
  getCRMSchools,
} from "../../../api/crmApi";
import CRMSchoolAssignmentPanel from "../../../components/admin/crm/CRMSchoolAssignmentPanel";
import CRMSchoolCreatePanel from "../../../components/admin/crm/CRMSchoolCreatePanel";
import { useAuth } from "../../../hooks/useAuth";

const INITIAL_FILTERS = {
  search: "",
  is_active: "true",
  department: "",
  province: "",
  district: "",
  assignment: "",
};

const DEFAULT_PAGE_SIZE = 25;

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

function buildParams(filters, page, pageSize) {
  const params = {
    page,
    page_size: pageSize,
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
  if (!owner) {
    return "Sin asesor asignado";
  }

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
          className="h-20 animate-pulse rounded-2xl bg-gray-100"
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
        Ajusta los filtros para encontrar instituciones de la cartera comercial.
      </p>
    </div>
  );
}

export default function CRMSchoolsPage() {
  const { hasPermission } = useAuth();
  const canAssignSchools = hasPermission(["crm.assign_schools"]);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [schools, setSchools] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [locationOptions, setLocationOptions] = useState({
    departments: [],
    provinces: [],
    districts: [],
  });
  const [loadingLocationOptions, setLoadingLocationOptions] =
    useState(false);

  const selectedSchools = useMemo(
    () =>
      schools.filter((school) =>
        selectedSchoolIds.includes(school.id),
      ),
    [schools, selectedSchoolIds],
  );

  const allVisibleSelected =
    selectAllFiltered
    || (
      schools.length > 0
      && schools.every((school) =>
        selectedSchoolIds.includes(school.id),
      )
    );

  const selectionCount = selectAllFiltered
    ? Number(pagination.count || 0)
    : selectedSchoolIds.length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.count || 0) / pageSize)),
    [pageSize, pagination.count],
  );

  useEffect(() => {
    let ignore = false;

    async function loadLocationOptions() {
      try {
        setLoadingLocationOptions(true);

        const data = await getCRMSchoolLocationOptions({
          is_active: filters.is_active,
          ...(filters.department
            ? { department: filters.department }
            : {}),
          ...(filters.province
            ? { province: filters.province }
            : {}),
        });

        if (!ignore) {
          setLocationOptions({
            departments: Array.isArray(data?.departments)
              ? data.departments
              : [],
            provinces: Array.isArray(data?.provinces)
              ? data.provinces
              : [],
            districts: Array.isArray(data?.districts)
              ? data.districts
              : [],
          });
        }
      } catch {
        if (!ignore) {
          setLocationOptions({
            departments: [],
            provinces: [],
            districts: [],
          });
        }
      } finally {
        if (!ignore) {
          setLoadingLocationOptions(false);
        }
      }
    }

    loadLocationOptions();

    return () => {
      ignore = true;
    };
  }, [filters.department, filters.province, filters.is_active]);

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCRMSchools(
          buildParams(filters, page, pageSize),
        );

        if (!ignore) {
          const nextSchools = Array.isArray(data?.results)
            ? data.results
            : [];

          setSchools(nextSchools);
          setSelectedSchoolIds((currentIds) =>
            currentIds.filter((schoolId) =>
              nextSchools.some((school) => school.id === schoolId),
            ),
          );
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
  }, [filters, page, pageSize, refreshKey]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setPage(1);
    setSelectedSchoolIds([]);
    setSelectAllFiltered(false);
    setFilters((currentFilters) => {
      if (name === "department") {
        return {
          ...currentFilters,
          department: value,
          province: "",
          district: "",
        };
      }

      if (name === "province") {
        return {
          ...currentFilters,
          province: value,
          district: "",
        };
      }

      return {
        ...currentFilters,
        [name]: value,
      };
    });
  }

  function clearFilters() {
    setPage(1);
    setSelectedSchoolIds([]);
    setSelectAllFiltered(false);
    setFilters(INITIAL_FILTERS);
  }

  function toggleSchoolSelection(schoolId) {
    if (selectAllFiltered) {
      setSelectAllFiltered(false);
      setSelectedSchoolIds(
        schools
          .filter((school) => school.id !== schoolId)
          .map((school) => school.id),
      );
      return;
    }

    setSelectedSchoolIds((currentIds) =>
      currentIds.includes(schoolId)
        ? currentIds.filter((id) => id !== schoolId)
        : [...currentIds, schoolId],
    );
  }

  function toggleVisibleSelection() {
    if (selectAllFiltered || allVisibleSelected) {
      setSelectAllFiltered(false);
      setSelectedSchoolIds([]);
      return;
    }

    setSelectedSchoolIds(schools.map((school) => school.id));
  }

  function selectFilteredPortfolio() {
    setSelectedSchoolIds([]);
    setSelectAllFiltered(true);
  }

  function clearSelection() {
    setSelectedSchoolIds([]);
    setSelectAllFiltered(false);
  }

  function handleAssignmentCompleted() {
    clearSelection();
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial
            </p>

            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              Colegios
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Consulta y gestiona la cartera institucional de Book Express.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {canAssignSchools ? (
              <Link
                to="/admin/crm/colegios/importar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
              >
                <FaFileExcel />
                Importar Excel
              </Link>
            ) : null}

            <CRMSchoolCreatePanel />

            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Total visible
              </p>
              <p className="mt-1 text-2xl font-black">
                {pagination.count}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
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

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
              Búsqueda y responsable
            </p>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
              <label className="relative xl:col-span-2">
                <span className="sr-only">Buscar</span>
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  name="search"
                  placeholder="Nombre, código Book Express, código modular, RUC, teléfono..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </label>

              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                name="assignment"
                value={filters.assignment}
                onChange={handleFilterChange}
              >
                <option value="">Todos los responsables</option>
                <option value="unassigned">Sin asesor asignado</option>
                <option value="assigned">Con asesor asignado</option>
              </select>

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
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
              Ubicación
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                disabled={loadingLocationOptions}
              >
                <option value="">Todos los departamentos</option>
                {locationOptions.departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                name="province"
                value={filters.province}
                onChange={handleFilterChange}
                disabled={
                  loadingLocationOptions || !filters.department
                }
              >
                <option value="">Todas las provincias</option>
                {locationOptions.provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                name="district"
                value={filters.district}
                onChange={handleFilterChange}
                disabled={
                  loadingLocationOptions
                  || !filters.department
                  || !filters.province
                }
              >
                <option value="">Todos los distritos</option>
                {locationOptions.districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-red-800">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-4 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h2 className="text-lg font-black text-gray-950">
              Cartera de colegios
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Selecciona una institución para abrir su ficha comercial.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
              Mostrar
              <select
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  if (!selectAllFiltered) {
                    setSelectedSchoolIds([]);
                  }
                  setPageSize(Number(event.target.value));
                }}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-black text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            {canAssignSchools && selectionCount > 0 ? (
              <CRMSchoolAssignmentPanel
                schools={selectedSchools}
                selectionMode={selectAllFiltered ? "filters" : "ids"}
                selectionFilters={filters}
                selectionCount={selectionCount}
                onAssigned={handleAssignmentCompleted}
                buttonLabel={`Asignar cartera (${selectionCount})`}
              />
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <LoadingRows />
          ) : schools.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {canAssignSchools && allVisibleSelected && pagination.count > schools.length ? (
                <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 sm:flex-row sm:items-center">
                  <p className="text-sm leading-6 text-red-900">
                    {selectAllFiltered
                      ? `Seleccionaste los ${pagination.count} colegios que cumplen los filtros actuales.`
                      : `Seleccionaste los ${schools.length} colegios visibles de esta página.`}
                  </p>

                  <button
                    type="button"
                    onClick={
                      selectAllFiltered
                        ? clearSelection
                        : selectFilteredPortfolio
                    }
                    className="shrink-0 text-left text-sm font-black text-red-800 underline decoration-red-300 underline-offset-4 transition hover:text-red-950"
                  >
                    {selectAllFiltered
                      ? "Cancelar selección total"
                      : `Seleccionar los ${pagination.count} colegios filtrados`}
                  </button>
                </div>
              ) : null}

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-500">
                      {canAssignSchools ? (
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleVisibleSelection}
                            aria-label="Seleccionar colegios visibles"
                            className="h-4 w-4 rounded border-gray-300 text-red-700 accent-red-700"
                          />
                        </th>
                      ) : null}
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
                      <tr
                        key={school.id}
                        className="align-middle transition hover:bg-gray-50"
                      >
                        {canAssignSchools ? (
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              checked={
                                selectAllFiltered
                                || selectedSchoolIds.includes(school.id)
                              }
                              onChange={() => toggleSchoolSelection(school.id)}
                              aria-label={`Seleccionar ${school.name}`}
                              className="h-4 w-4 rounded border-gray-300 text-red-700 accent-red-700"
                            />
                          </td>
                        ) : null}

                        <td className="px-3 py-4">
                          <p className="font-black text-gray-950">
                            {school.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {school.book_express_code
                              ? `${school.book_express_code}${school.institution_code ? ` · Cód. institución ${school.institution_code}` : ""}`
                              : school.institution_code
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
                          <Link
                            className="inline-flex rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                            to={`/admin/crm/colegios/${school.id}`}
                          >
                            Ver ficha
                          </Link>
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
                      <div className="flex min-w-0 items-start gap-3">
                        {canAssignSchools ? (
                          <input
                            type="checkbox"
                            checked={
                                selectAllFiltered
                                || selectedSchoolIds.includes(school.id)
                              }
                            onChange={() => toggleSchoolSelection(school.id)}
                            aria-label={`Seleccionar ${school.name}`}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-red-700 accent-red-700"
                          />
                        ) : null}

                        <div className="min-w-0">
                        <p className="wrap-break-word text-base font-black text-gray-950">
                          {school.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatLocation(school) || "Sin ubicación"}
                        </p>
                        </div>
                      </div>

                      <SchoolStatusBadge isActive={school.is_active} />
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <p>
                        <span className="font-black text-gray-900">
                          Asesor:
                        </span>{" "}
                        {formatOwner(school.owner)}
                      </p>

                      <p>
                        <span className="font-black text-gray-900">
                          Alumnos:
                        </span>{" "}
                        {school.current_population_total ??
                          school.estimated_students ??
                          "—"}
                      </p>
                    </div>

                    <Link
                      className="mt-4 flex w-full items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                      to={`/admin/crm/colegios/${school.id}`}
                    >
                      Ver ficha
                    </Link>
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
                    onClick={() =>
                      setPage((currentPage) =>
                        Math.max(1, currentPage - 1),
                      )
                    }
                  >
                    <FaChevronLeft className="text-xs" />
                    Anterior
                  </button>

                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!pagination.next}
                    type="button"
                    onClick={() =>
                      setPage((currentPage) => currentPage + 1)
                    }
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
    </div>
  );
}
