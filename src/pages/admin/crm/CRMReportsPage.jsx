import { useEffect, useMemo, useState } from "react";
import {
  FaFileExcel,
  FaFilter,
  FaLock,
  FaSyncAlt,
} from "react-icons/fa";

import {
  exportCRMReports,
  getCRMActivityReport,
  getCRMCampaigns,
  getCRMCommercialReport,
  getCRMCommercialTeams,
  getCRMEditorialReport,
  getCRMOpportunityReport,
  getCRMSchoolReport,
} from "../../../api/crmApi";
import { useAuth } from "../../../hooks/useAuth";

const REPORT_TABS = [
  { key: "advisors", label: "Por asesor" },
  { key: "editorials", label: "Por editorial" },
  { key: "schools", label: "Por colegio" },
  { key: "opportunities", label: "Oportunidades" },
  { key: "activities", label: "Actividades" },
];

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

function buildParams(filters, includeDates = true) {
  return Object.fromEntries(
    Object.entries(filters).filter(([key, value]) => {
      if (!includeDates && ["date_from", "date_to"].includes(key)) {
        return false;
      }

      return value !== "";
    }),
  );
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (data && typeof data === "object" && !(data instanceof Blob)) {
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

function formatMoney(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function CompactMetric({ label, value }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black text-gray-950">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-black text-gray-950">
        No hay resultados para los filtros seleccionados
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Ajusta campaña, equipo, asesor o periodo para consultar otro alcance.
      </p>
    </div>
  );
}

function AdvisorReport({ report }) {
  const advisors = report?.advisors || [];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Desempeño comercial
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950">
          Resultados por asesor
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Compara cartera, actividad, pipeline, proyección y adopciones dentro
          del alcance seleccionado.
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
                        {formatInteger(advisor.activity_counts?.call)} llamadas
                        {" · "}
                        {formatInteger(visits)} visitas
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <p className="font-black text-gray-950">
                        {formatInteger(advisor.open_opportunities)} abiertas
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatInteger(advisor.won_opportunities)} ganadas
                        {" · "}
                        {formatInteger(advisor.lost_opportunities)} no concretadas
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
        <EmptyState />
      )}
    </section>
  );
}

function EditorialReport({
  report,
  showProfitability,
  onToggleProfitability,
}) {
  const editorials = report?.editorials || [];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Editoriales
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-950">
            Proyección y adopción por editorial
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            El valor de proyección es referencial. El valor adoptado usa el
            P.IE confirmado en la adopción.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleProfitability}
          className={
            showProfitability
              ? "inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white"
              : "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-800 transition hover:bg-gray-50"
          }
        >
          <FaLock />
          {showProfitability
            ? "Ocultar rentabilidad interna"
            : "Ver rentabilidad interna"}
        </button>
      </div>

      {showProfitability ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          <p className="font-black">Análisis comercial interno</p>
          <p className="mt-1 leading-6">
            La contribución estimada descuenta costo editorial e incentivos
            sobre adopciones confirmadas. No representa utilidad neta contable.
          </p>
        </div>
      ) : null}

      {editorials.length > 0 ? (
        <div className="overflow-x-auto">
          <table
            className={
              showProfitability
                ? "min-w-[1500px] w-full text-left text-sm"
                : "min-w-[1050px] w-full text-left text-sm"
            }
          >
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Editorial</th>
                <th className="px-4 py-3 text-center">Proyectado</th>
                <th className="px-4 py-3 text-center">Valor referencial</th>
                <th className="px-4 py-3 text-center">Adoptado</th>
                <th className="px-4 py-3 text-center">Valor P.IE</th>
                <th className="px-4 py-3 text-center">Conversión</th>
                {showProfitability ? (
                  <>
                    <th className="px-4 py-3 text-center">Costo editorial</th>
                    <th className="px-4 py-3 text-center">Incentivos</th>
                    <th className="px-4 py-3 text-center">Contribución</th>
                    <th className="px-4 py-3 text-center">Margen</th>
                    <th className="px-4 py-3 text-center">Contrib./u.</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {editorials.map((editorial) => (
                <tr
                  key={editorial.editorial}
                  className="align-top transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <p className="font-black text-gray-950">
                      {editorial.editorial}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatInteger(editorial.projected_schools)} colegio(s)
                      proyectados · {formatInteger(editorial.adopted_schools)}
                      {" "}adoptados
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className="font-black text-gray-950">
                      {formatInteger(editorial.projected_units)} u.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatInteger(editorial.projected_products)} producto(s)
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-gray-900">
                    {formatMoney(editorial.projected_reference_value)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className="font-black text-gray-950">
                      {formatInteger(editorial.adopted_units)} u.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatInteger(editorial.adopted_products)} producto(s)
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-gray-900">
                    {formatMoney(editorial.adopted_value)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-800">
                      {Number(editorial.unit_conversion_rate || 0).toFixed(1)} %
                    </span>
                  </td>
                  {showProfitability ? (
                    <>
                      <td className="px-4 py-4 text-center font-bold text-gray-900">
                        {formatMoney(editorial.supplier_cost_total)}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-gray-900">
                        {formatMoney(editorial.incentive_total)}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-gray-950">
                        {formatMoney(editorial.contribution_total)}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-gray-950">
                        {Number(editorial.margin_percent || 0).toFixed(2)} %
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-gray-900">
                        {formatMoney(editorial.contribution_per_unit)}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function SchoolReport({ report }) {
  const schools = report?.schools || [];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Cartera institucional
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950">
          Estado comercial por colegio
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Incluye colegios con y sin oportunidad para identificar cartera aún
          no trabajada.
        </p>
      </div>

      {schools.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Colegio</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Equipo / asesor</th>
                <th className="px-4 py-3 text-center">Abiertas</th>
                <th className="px-4 py-3 text-center">Ganadas</th>
                <th className="px-4 py-3 text-center">No concretadas</th>
                <th className="px-4 py-3 text-center">Proyectado</th>
                <th className="px-4 py-3 text-center">Adoptado</th>
                <th className="px-4 py-3">Última actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schools.map((school) => (
                <tr
                  key={school.school_id}
                  className="align-top transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4 font-black text-gray-950">
                    {school.school_name}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {[school.district, school.province, school.department]
                      .filter(Boolean)
                      .join(", ") || "Sin ubicación"}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-gray-900">
                      {school.team || "Sin equipo"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {school.advisor || "Sin asesor"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(school.open_opportunities)}
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(school.won_opportunities)}
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(school.lost_opportunities)}
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(school.projected_units)}
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(school.adopted_units)}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {formatDateTime(school.last_activity_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function OpportunityReport({ report }) {
  const opportunities = report?.opportunities || [];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Pipeline
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950">
          Detalle de oportunidades
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Permite auditar el avance desde proyección hasta adopción.
        </p>
      </div>

      {opportunities.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Colegio</th>
                <th className="px-4 py-3">Campaña</th>
                <th className="px-4 py-3">Asesor</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Línea</th>
                <th className="px-4 py-3 text-center">Proyección</th>
                <th className="px-4 py-3">Cotización</th>
                <th className="px-4 py-3">Adopción</th>
                <th className="px-4 py-3 text-center">Adoptado</th>
                <th className="px-4 py-3">Última actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((opportunity) => (
                <tr
                  key={opportunity.opportunity_id}
                  className="align-top transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <p className="font-black text-gray-950">
                      {opportunity.school_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {opportunity.team || "Sin equipo"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {opportunity.campaign}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {opportunity.advisor || "Sin asesor"}
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-900">
                    {opportunity.stage}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {opportunity.commercial_line || "—"}
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(opportunity.projected_units)}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {opportunity.quotation_status || "Sin cotización"}
                    {opportunity.quotation_version
                      ? ` · v${opportunity.quotation_version}`
                      : ""}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {opportunity.adoption_status || "Sin adopción"}
                  </td>
                  <td className="px-4 py-4 text-center font-black">
                    {formatInteger(opportunity.adopted_units)}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {formatDateTime(opportunity.last_activity_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function ActivityReport({ report }) {
  const activities = report?.activities || [];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Gestión realizada
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950">
          Detalle de actividades
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Evidencia la gestión comercial registrada durante el periodo
          seleccionado.
        </p>
      </div>

      {activities.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Asesor</th>
                <th className="px-4 py-3">Colegio</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Resumen</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">Oportunidad</th>
                <th className="px-4 py-3 text-center">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map((activity) => (
                <tr
                  key={activity.activity_id}
                  className="align-top transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4 text-gray-600">
                    {formatDateTime(activity.occurred_at)}
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-900">
                    {activity.advisor || "Sin responsable"}
                  </td>
                  <td className="px-4 py-4 font-black text-gray-950">
                    {activity.school}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {activity.contact || "—"}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {activity.activity_type}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {activity.summary}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {activity.result}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {activity.opportunity || "—"}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-gray-700">
                    {activity.has_location ? "Sí" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function SummaryStrip({ activeReport, report }) {
  const summary = report?.summary || {};

  if (activeReport === "activities") {
    return (
      <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-2 md:divide-x md:divide-gray-200">
        <CompactMetric
          label="Actividades del periodo"
          value={formatInteger(summary.activities)}
        />
        <CompactMetric
          label="Alcance"
          value="Gestión comercial registrada"
        />
      </div>
    );
  }

  if (activeReport === "editorials") {
    return (
      <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-4 md:divide-x md:divide-gray-200">
        <CompactMetric label="Editoriales" value={formatInteger(summary.editorials)} />
        <CompactMetric label="Unid. proyectadas" value={formatInteger(summary.projected_units)} />
        <CompactMetric label="Unid. adoptadas" value={formatInteger(summary.adopted_units)} />
        <CompactMetric label="Valor adoptado P.IE" value={formatMoney(summary.adopted_value)} />
      </div>
    );
  }

  if (activeReport === "schools") {
    return (
      <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-4 md:divide-x md:divide-gray-200">
        <CompactMetric label="Colegios" value={formatInteger(summary.schools)} />
        <CompactMetric label="Sin oportunidad" value={formatInteger(summary.schools_without_opportunity)} />
        <CompactMetric label="Unid. proyectadas" value={formatInteger(summary.projected_units)} />
        <CompactMetric label="Unid. adoptadas" value={formatInteger(summary.adopted_units)} />
      </div>
    );
  }

  if (activeReport === "opportunities") {
    return (
      <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-5 md:divide-x md:divide-gray-200">
        <CompactMetric label="Oportunidades" value={formatInteger(summary.opportunities)} />
        <CompactMetric label="Abiertas" value={formatInteger(summary.open)} />
        <CompactMetric label="Ganadas" value={formatInteger(summary.won)} />
        <CompactMetric label="No concretadas" value={formatInteger(summary.lost)} />
        <CompactMetric label="Unid. adoptadas" value={formatInteger(summary.adopted_units)} />
      </div>
    );
  }

  return (
    <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-5 md:divide-x md:divide-gray-200">
      <CompactMetric label="Colegios" value={formatInteger(summary.schools)} />
      <CompactMetric label="Actividades" value={formatInteger(summary.activities)} />
      <CompactMetric label="Abiertas" value={formatInteger(summary.open_opportunities)} />
      <CompactMetric label="Ganadas" value={formatInteger(summary.won_opportunities)} />
      <CompactMetric label="Unid. adoptadas" value={formatInteger(summary.adopted_units)} />
    </div>
  );
}

export default function CRMReportsPage() {
  const { hasPermission, user } = useAuth();
  const startingFilters = useMemo(() => initialFilters(), []);
  const [filters, setFilters] = useState(startingFilters);
  const [appliedFilters, setAppliedFilters] = useState(startingFilters);
  const [activeReport, setActiveReport] = useState("advisors");
  const [campaigns, setCampaigns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [includeProfitability, setIncludeProfitability] = useState(false);
  const [showProfitability, setShowProfitability] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canExport =
    Boolean(user?.is_superuser)
    || hasPermission(["crm.export_crm_reports"]);

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

        const datedParams = buildParams(appliedFilters, true);
        const commercialParams = buildParams(appliedFilters, false);
        let data;

        if (activeReport === "editorials") {
          data = await getCRMEditorialReport(commercialParams);
        } else if (activeReport === "schools") {
          data = await getCRMSchoolReport(commercialParams);
        } else if (activeReport === "opportunities") {
          data = await getCRMOpportunityReport(commercialParams);
        } else if (activeReport === "activities") {
          data = await getCRMActivityReport(datedParams);
        } else {
          data = await getCRMCommercialReport(datedParams);
        }

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
  }, [activeReport, appliedFilters]);

  const advisorOptions = useMemo(() => {
    const scopedTeams = filters.team
      ? teams.filter(
          (team) => String(team.id) === String(filters.team),
        )
      : teams;
    const advisors = new Map();

    scopedTeams.forEach((team) => {
      (team.memberships || []).forEach((membership) => {
        const advisor = membership.user;

        if (
          membership.role === "advisor"
          && membership.is_active !== false
          && advisor?.id
        ) {
          advisors.set(advisor.id, advisor);
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

  async function handleExport() {
    try {
      setExporting(true);
      setErrorMessage("");

      const response = await exportCRMReports({
        ...buildParams(appliedFilters, true),
        include_profitability: includeProfitability,
      });
      const disposition = response.headers?.["content-disposition"] || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename =
        filenameMatch?.[1] || "Reporte_CRM_BookExpress.xlsx";
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo generar el archivo Excel.",
        ),
      );
    } finally {
      setExporting(false);
    }
  }

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
              Consulta, compara y exporta información comercial con el alcance
              autorizado para tu usuario.
            </p>
          </div>

          {canExport ? (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <input
                  type="checkbox"
                  checked={includeProfitability}
                  onChange={(event) =>
                    setIncludeProfitability(event.target.checked)
                  }
                  className="h-4 w-4 accent-red-600"
                />
                Incluir rentabilidad interna en Excel
              </label>

              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <FaFileExcel />
                {exporting ? "Generando Excel..." : "Exportar Excel"}
              </button>
            </div>
          ) : null}
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

      <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveReport(tab.key)}
            className={
              activeReport === tab.key
                ? "rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white"
                : "rounded-xl px-4 py-2.5 text-sm font-black text-gray-600 transition hover:bg-gray-100"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500">
        El periodo Desde/Hasta controla las actividades registradas y la hoja
        de actividades del Excel. Campaña, equipo y asesor se aplican a todos
        los reportes comerciales.
      </p>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {loadingReport ? (
        <div className="mt-5 h-48 animate-pulse rounded-3xl bg-gray-200" />
      ) : report ? (
        <div className="mt-5 space-y-5">
          <SummaryStrip
            activeReport={activeReport}
            report={report}
          />

          {activeReport === "editorials" ? (
            <EditorialReport
              report={report}
              showProfitability={showProfitability}
              onToggleProfitability={() =>
                setShowProfitability((current) => !current)
              }
            />
          ) : null}

          {activeReport === "schools" ? (
            <SchoolReport report={report} />
          ) : null}

          {activeReport === "opportunities" ? (
            <OpportunityReport report={report} />
          ) : null}

          {activeReport === "activities" ? (
            <ActivityReport report={report} />
          ) : null}

          {activeReport === "advisors" ? (
            <>
              {Number(report?.unassigned?.schools || 0) > 0
              || Number(report?.unassigned?.opportunities || 0) > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-black">
                    Registros pendientes de responsable comercial
                  </p>
                  <p className="mt-1 leading-6">
                    {formatInteger(report.unassigned.schools)} colegio(s) y{" "}
                    {formatInteger(report.unassigned.opportunities)}
                    {" "}oportunidad(es) todavía no tienen asesor asignado.
                  </p>
                </div>
                ) : null}

              <AdvisorReport report={report} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
