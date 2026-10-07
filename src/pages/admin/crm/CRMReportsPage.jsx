import { useEffect, useMemo, useState } from "react";
import {
  FaBullseye,
  FaChartLine,
  FaCheckCircle,
  FaFilter,
  FaSchool,
  FaSyncAlt,
  FaUsers,
} from "react-icons/fa";

import {
  getCRMCampaigns,
  getCRMCommercialReport,
  getCRMCommercialTeams,
} from "../../../api/crmApi";

function toInputDate(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
  ].join("");
}

function initialFilters() {
  const today = new Date();
  const firstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );

  return {
    campaign: "",
    team: "",
    owner: "",
    date_from: toInputDate(firstDay),
    date_to: toInputDate(today),
  };
}

function buildParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ""),
  );
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
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

function formatInteger(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
}

function SummaryCard({ icon, label, value, description }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-gray-950">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">
        {description}
      </p>
    </article>
  );
}

export default function CRMReportsPage() {
  const startingFilters = useMemo(() => initialFilters(), []);
  const [filters, setFilters] = useState(startingFilters);
  const [appliedFilters, setAppliedFilters] = useState(startingFilters);
  const [campaigns, setCampaigns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const [campaignData, teamData] = await Promise.all([
          getCRMCampaigns(),
          getCRMCommercialTeams(),
        ]);

        if (!ignore) {
          setCampaigns(Array.isArray(campaignData) ? campaignData : []);
          setTeams(Array.isArray(teamData) ? teamData : []);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar los filtros de reportería.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        setLoadingReport(true);
        setErrorMessage("");

        const data = await getCRMCommercialReport(
          buildParams(appliedFilters),
        );

        if (!ignore) {
          setReport(data);
        }
      } catch (error) {
        if (!ignore) {
          setReport(null);
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la reportería comercial.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingReport(false);
        }
      }
    }

    loadReport();

    return () => {
      ignore = true;
    };
  }, [appliedFilters]);

  const advisorOptions = useMemo(() => {
    const scopedTeams = filters.team
      ? teams.filter(
          (team) => String(team.id) === String(filters.team),
        )
      : teams;
    const advisors = new Map();

    scopedTeams.forEach((team) => {
      (team.memberships || []).forEach((membership) => {
        const user = membership.user;

        if (
          membership.role === "advisor"
          && membership.is_active !== false
          && user?.id
        ) {
          advisors.set(user.id, user);
        }
      });
    });

    return Array.from(advisors.values()).sort((first, second) =>
      (first.full_name || first.username || "").localeCompare(
        second.full_name || second.username || "",
        "es",
        { sensitivity: "base" },
      ),
    );
  }, [filters.team, teams]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => {
      if (name === "team") {
        return {
          ...current,
          team: value,
          owner: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    const defaults = initialFilters();

    setFilters(defaults);
    setAppliedFilters(defaults);
  }

  const summary = report?.summary || {};
  const advisors = report?.advisors || [];
  const unassigned = report?.unassigned || {};

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-400">
              CRM comercial
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Reportería comercial
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Compara la gestión de la cartera y los resultados comerciales
              por asesor, campaña, equipo y periodo.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase text-gray-400">
              Asesores con actividad
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatInteger(advisors.length)}
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={applyFilters}
        className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Filtros
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-950">
              Alcance del reporte
            </h2>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
          >
            <FaSyncAlt />
            Limpiar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-black text-gray-600">
            Campaña
            <select
              name="campaign"
              value={filters.campaign}
              onChange={handleFilterChange}
              disabled={loadingOptions}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
            >
              <option value="">Todas las campañas</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-gray-600">
            Equipo
            <select
              name="team"
              value={filters.team}
              onChange={handleFilterChange}
              disabled={loadingOptions}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
            >
              <option value="">Todos los equipos</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-gray-600">
            Asesor
            <select
              name="owner"
              value={filters.owner}
              onChange={handleFilterChange}
              disabled={loadingOptions}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
            >
              <option value="">Todos los asesores</option>
              {advisorOptions.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.full_name || advisor.username}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-black text-gray-600">
            Desde
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </label>

          <label className="text-xs font-black text-gray-600">
            Hasta
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
          >
            <FaFilter />
            Aplicar filtros
          </button>
        </div>
      </form>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loadingReport ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </div>
      ) : report ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              icon={<FaSchool />}
              label="Colegios en cartera"
              value={formatInteger(summary.schools)}
              description="Colegios dentro del alcance actual del reporte."
            />
            <SummaryCard
              icon={<FaChartLine />}
              label="Actividades del periodo"
              value={formatInteger(summary.activities)}
              description="Gestiones comerciales registradas entre las fechas seleccionadas."
            />
            <SummaryCard
              icon={<FaBullseye />}
              label="Oportunidades abiertas"
              value={formatInteger(summary.open_opportunities)}
              description="Negociaciones que continúan activas."
            />
            <SummaryCard
              icon={<FaCheckCircle />}
              label="Oportunidades ganadas"
              value={formatInteger(summary.won_opportunities)}
              description="Cierres favorables dentro del alcance seleccionado."
            />
            <SummaryCard
              icon={<FaUsers />}
              label="Unidades proyectadas"
              value={formatInteger(summary.projected_units)}
              description="Unidades de las proyecciones comerciales vigentes."
            />
            <SummaryCard
              icon={<FaCheckCircle />}
              label="Unidades adoptadas"
              value={formatInteger(summary.adopted_units)}
              description="Unidades confirmadas en adopciones vigentes."
            />
          </div>

          {Number(unassigned.schools || 0) > 0
          || Number(unassigned.opportunities || 0) > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-black">
                Registros pendientes de responsable comercial
              </p>
              <p className="mt-1 leading-6">
                {formatInteger(unassigned.schools)} colegio(s) y{" "}
                {formatInteger(unassigned.opportunities)} oportunidad(es)
                todavía no tienen asesor asignado.
              </p>
            </div>
            ) : null}

          <section className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Desempeño comercial
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Resultados por asesor
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Las actividades corresponden al periodo seleccionado; las
                oportunidades, proyecciones y adopciones respetan los filtros
                comerciales aplicados.
              </p>
            </div>

            {advisors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full text-left text-sm">
                  <thead className="bg-gray-950 text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3">Asesor</th>
                      <th className="px-4 py-3 text-center">Cartera</th>
                      <th className="px-4 py-3 text-center">Actividades</th>
                      <th className="px-4 py-3 text-center">Oportunidades</th>
                      <th className="px-4 py-3 text-center">Proyección</th>
                      <th className="px-4 py-3 text-center">Adopciones</th>
                      <th className="px-4 py-3 text-center">Conversión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {advisors.map((advisor) => {
                      const visits =
                        Number(advisor.activity_counts?.visit || 0)
                        + Number(advisor.activity_counts?.cold_visit || 0);

                      return (
                        <tr
                          key={advisor.advisor_id}
                          className="align-top transition hover:bg-gray-50"
                        >
                          <td className="px-4 py-4">
                            <p className="font-black text-gray-950">
                              {advisor.advisor_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {advisor.teams?.length
                                ? advisor.teams.join(", ")
                                : "Sin equipo actual"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <p className="font-black text-gray-950">
                              {formatInteger(advisor.schools)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              colegios
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <p className="font-black text-gray-950">
                              {formatInteger(advisor.activities)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatInteger(
                                advisor.activity_counts?.call,
                              )} llamadas · {formatInteger(visits)} visitas
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <p className="font-black text-gray-950">
                              {formatInteger(advisor.open_opportunities)} abiertas
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatInteger(advisor.won_opportunities)} ganadas ·{" "}
                              {formatInteger(advisor.lost_opportunities)} perdidas
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <p className="font-black text-gray-950">
                              {formatInteger(advisor.projected_units)} unidades
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatInteger(advisor.current_projections)} vigente(s)
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <p className="font-black text-gray-950">
                              {formatInteger(advisor.adopted_units)} unidades
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatInteger(advisor.current_adoptions)} adopción(es)
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-800">
                              {Number(advisor.conversion_rate || 0).toFixed(1)} %
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="font-black text-gray-950">
                  No hay resultados para los filtros seleccionados
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Ajusta campaña, equipo, asesor o periodo para consultar otro alcance.
                </p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
