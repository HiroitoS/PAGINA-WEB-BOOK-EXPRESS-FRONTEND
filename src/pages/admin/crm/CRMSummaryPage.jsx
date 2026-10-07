import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FaArrowRight,
  FaBriefcase,
  FaBullseye,
  FaChartBar,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHandshake,
  FaSchool,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";
import { Link } from "react-router";

import { getCRMSummary } from "../../../api/crmApi";
import { useAuth } from "../../../hooks/useAuth";

const EMPTY_SUMMARY = {
  schools: 0,
  open_opportunities: 0,
  won_opportunities: 0,
  lost_opportunities: 0,
  opportunities_without_activity: 0,
  activities_today: 0,
  activities_week: 0,
  activity_counts: {},
  activity_trend: [],
  stages: [],
  current_projections: 0,
  current_adoptions: 0,
  projected_units: 0,
  adopted_units: 0,
  unit_conversion_rate: 0,
  closure_conversion_rate: 0,
  follow_up_coverage: 0,
};

const ACTIVITY_METRICS = [
  { key: "call", label: "Llamadas" },
  { key: "visit", label: "Visitas coordinadas" },
  { key: "cold_visit", label: "Visitas en frío" },
  { key: "presentation", label: "Presentaciones" },
  { key: "meeting", label: "Reuniones" },
  { key: "follow_up", label: "Seguimientos" },
];

const STAGE_CATEGORY_LABELS = {
  open: "En curso",
  won: "Adopción confirmada",
  lost: "No concretada",
};

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.join(" ");
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "No pudimos cargar el resumen comercial. Intenta nuevamente.";
}

function formatInteger(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
}

function formatPercent(value) {
  return Number(value || 0).toFixed(1) + "%";
}

function parseLocalDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value + "T00:00:00");

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value) {
  const date = parseLocalDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatWeekday(value) {
  const date = parseLocalDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "");
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "default",
}) {
  const tones = {
    default: {
      card: "border-gray-200 bg-white",
      icon: "bg-gray-950 text-white",
      value: "text-gray-950",
    },
    red: {
      card: "border-red-100 bg-red-50",
      icon: "bg-red-700 text-white",
      value: "text-red-800",
    },
    warning: {
      card: "border-amber-200 bg-amber-50",
      icon: "bg-amber-100 text-amber-800",
      value: "text-amber-900",
    },
  };

  const currentTone = tones[tone] || tones.default;

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      className={
        "rounded-3xl border p-4 shadow-sm sm:p-5 "
        + currentTone.card
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p
            className={
              "mt-2 text-3xl font-black "
              + currentTone.value
            }
          >
            {value}
          </p>
        </div>

        <div
          className={
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl "
            + currentTone.icon
          }
        >
          <Icon />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-600">
        {description}
      </p>
    </motion.article>
  );
}

function ProgressMetric({
  label,
  value,
  helper,
  progress,
}) {
  const safeProgress = Math.min(
    Math.max(Number(progress || 0), 0),
    100,
  );

  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-gray-950">
            {value}
          </p>
        </div>

        <span className="shrink-0 text-xs font-black text-gray-500">
          {helper}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-red-700 transition-all"
          style={{ width: String(safeProgress) + "%" }}
        />
      </div>
    </div>
  );
}

function ActivityTrend({ trend }) {
  const rows = Array.isArray(trend) ? trend : [];
  const maxValue = Math.max(
    1,
    ...rows.map((item) => Number(item?.total || 0)),
  );

  return (
    <div className="mt-5">
      <div className="flex h-44 items-end gap-2 sm:gap-3">
        {rows.map((item) => {
          const total = Number(item?.total || 0);
          const height =
            total > 0
              ? Math.max((total / maxValue) * 100, 10)
              : 4;

          return (
            <div
              key={item.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-2 text-xs font-black text-gray-700">
                {total}
              </span>

              <div className="flex h-28 w-full items-end overflow-hidden rounded-xl bg-gray-100">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: String(height) + "%" }}
                  transition={{ duration: 0.45 }}
                  className={
                    total > 0
                      ? "w-full rounded-xl bg-gray-950"
                      : "w-full rounded-xl bg-gray-300"
                  }
                />
              </div>

              <p className="mt-2 text-xs font-black capitalize text-gray-700">
                {formatWeekday(item.date)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {formatShortDate(item.date)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineRow({ stage, totalOpportunities }) {
  const total = Number(stage?.total || 0);
  const percent =
    totalOpportunities > 0
      ? Math.round((total / totalOpportunities) * 100)
      : 0;

  const barClass =
    stage?.stage__category === "lost"
      ? "bg-gray-400"
      : stage?.stage__category === "won"
        ? "bg-red-700"
        : "bg-gray-950";

  return (
    <div className="border-b border-gray-100 py-4 last:border-b-0">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-gray-950">
            {stage?.stage__name || "Etapa comercial"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {STAGE_CATEGORY_LABELS[stage?.stage__category] || "Etapa comercial"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-gray-950">
            {total}
          </span>
          <span className="min-w-14 rounded-full bg-gray-100 px-3 py-1 text-center text-xs font-black text-gray-600">
            {percent}%
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={"h-full rounded-full transition-all " + barClass}
          style={{ width: String(Math.min(percent, 100)) + "%" }}
        />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl bg-gray-200"
          />
        ))}
      </div>

      <div className="h-80 animate-pulse rounded-3xl bg-gray-200" />
    </div>
  );
}

export default function CRMSummaryPage() {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const canSupervise = hasPermission(["crm.supervise_crm"]);

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getCRMSummary();

        if (!ignore) {
          setSummary({
            ...EMPTY_SUMMARY,
            ...data,
            stages: Array.isArray(data?.stages)
              ? data.stages
              : [],
            activity_trend: Array.isArray(data?.activity_trend)
              ? data.activity_trend
              : [],
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const totalOpportunities = useMemo(
    () =>
      Number(summary.open_opportunities || 0)
      + Number(summary.won_opportunities || 0)
      + Number(summary.lost_opportunities || 0),
    [
      summary.lost_opportunities,
      summary.open_opportunities,
      summary.won_opportunities,
    ],
  );

  if (loading) {
    return <LoadingState />;
  }

  const followUpCoverage = Number(
    summary.follow_up_coverage || 0,
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-red-200 ring-1 ring-white/10">
              <FaBriefcase />
              CRM Comercial
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Resumen ejecutivo comercial
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Lectura rápida de cartera, actividad, avance de oportunidades y
              adopciones dentro del alcance asignado a tu usuario.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canSupervise ? (
              <Link
                to="/admin/crm/reportes"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
              >
                Ver reportes
                <FaArrowRight className="text-xs" />
              </Link>
            ) : null}

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100"
              type="button"
              onClick={() =>
                setReloadKey((currentKey) => currentKey + 1)
              }
            >
              <FaSyncAlt className="text-xs" />
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <div>
              <p className="text-sm font-black text-red-900">
                No se pudo actualizar el CRM
              </p>
              <p className="mt-1 text-sm leading-6 text-red-800">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.04,
            },
          },
        }}
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          icon={FaSchool}
          label="Colegios en cartera"
          value={formatInteger(summary.schools)}
          description="Instituciones visibles dentro de tu responsabilidad comercial."
        />

        <MetricCard
          icon={FaBullseye}
          label="Oportunidades activas"
          value={formatInteger(summary.open_opportunities)}
          description="Negociaciones que todavía continúan abiertas."
          tone="red"
        />

        <MetricCard
          icon={FaHandshake}
          label="Adopciones confirmadas"
          value={formatInteger(summary.won_opportunities)}
          description="Oportunidades cerradas favorablemente en el alcance actual."
          tone="red"
        />

        <MetricCard
          icon={FaExclamationTriangle}
          label="Sin actividad registrada"
          value={formatInteger(summary.opportunities_without_activity)}
          description="Oportunidades abiertas que requieren su primera gestión comercial."
          tone="warning"
        />
      </motion.div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Avance comercial
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-950">
            Proyección y resultado
          </h2>
        </div>

        <div className="grid divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <ProgressMetric
            label="Unidades proyectadas"
            value={formatInteger(summary.projected_units)}
            helper={
              formatInteger(summary.current_projections)
              + " proyección(es)"
            }
            progress={100}
          />
          <ProgressMetric
            label="Unidades adoptadas"
            value={formatInteger(summary.adopted_units)}
            helper={
              formatInteger(summary.current_adoptions)
              + " adopción(es)"
            }
            progress={summary.unit_conversion_rate}
          />
          <ProgressMetric
            label="Conversión de unidades"
            value={formatPercent(summary.unit_conversion_rate)}
            helper="Adoptado / proyectado"
            progress={summary.unit_conversion_rate}
          />
          <ProgressMetric
            label="Conversión de cierres"
            value={formatPercent(summary.closure_conversion_rate)}
            helper="Ganadas / cerradas"
            progress={summary.closure_conversion_rate}
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Tendencia
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Actividad de los últimos 7 días
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Evolución diaria de las gestiones comerciales registradas.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-950 px-4 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Hoy
              </p>
              <p className="mt-1 text-2xl font-black">
                {formatInteger(summary.activities_today)}
              </p>
            </div>
          </div>

          <ActivityTrend trend={summary.activity_trend} />
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Seguimiento
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-950">
            Cobertura comercial
          </h2>

          <div className="mt-5 rounded-3xl bg-gray-950 p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Oportunidades gestionadas
                </p>
                <p className="mt-2 text-4xl font-black">
                  {formatPercent(followUpCoverage)}
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl">
                {followUpCoverage >= 100 ? (
                  <FaCheckCircle />
                ) : (
                  <FaChartLine />
                )}
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-400">
              Porcentaje de oportunidades abiertas que ya tienen alguna
              actividad comercial registrada.
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-600"
                style={{
                  width:
                    String(Math.min(followUpCoverage, 100))
                    + "%",
                }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-black text-gray-950">
              Atención prioritaria
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {summary.opportunities_without_activity > 0
                ? formatInteger(
                    summary.opportunities_without_activity,
                  )
                  + " oportunidad(es) abierta(s) todavía requieren su primera gestión comercial."
                : "Todas las oportunidades abiertas tienen actividad registrada."}
            </p>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Productividad semanal
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Composición de la gestión
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Tipos de actividad registrados durante la semana actual.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-950 px-4 py-3 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Total semanal
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatInteger(summary.activities_week)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {ACTIVITY_METRICS.map((metric) => {
            const value = Number(
              summary.activity_counts?.[metric.key] || 0,
            );

            return (
              <div
                key={metric.key}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    {metric.label}
                  </p>
                  <FaChartBar className="shrink-0 text-gray-300" />
                </div>
                <p className="mt-3 text-2xl font-black text-gray-950">
                  {formatInteger(value)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Pipeline
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Avance de oportunidades
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Distribución actual de las oportunidades visibles por etapa.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-950 px-4 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Total
              </p>
              <p className="mt-1 text-2xl font-black">
                {formatInteger(totalOpportunities)}
              </p>
            </div>
          </div>

          {summary.stages.length > 0 ? (
            <div className="mt-1">
              {summary.stages.map((stage) => (
                <PipelineRow
                  key={stage.stage_id}
                  stage={stage}
                  totalOpportunities={totalOpportunities}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
              <p className="text-sm font-black text-gray-800">
                Aún no hay oportunidades para mostrar.
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Cuando se registren oportunidades comerciales, su avance
                aparecerá aquí.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-gray-950 p-5 text-white shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-red-300">
            Resultado comercial
          </p>
          <h2 className="mt-1 text-xl font-black">
            Estado de cierres
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Ganadas
                </p>
                <p className="mt-1 text-3xl font-black">
                  {formatInteger(summary.won_opportunities)}
                </p>
              </div>
              <FaHandshake className="text-2xl text-red-400" />
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  No concretadas
                </p>
                <p className="mt-1 text-3xl font-black">
                  {formatInteger(summary.lost_opportunities)}
                </p>
              </div>
              <FaTimesCircle className="text-2xl text-gray-500" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Conversión de cierres
              </p>
              <p className="mt-1 text-3xl font-black">
                {formatPercent(summary.closure_conversion_rate)}
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-400">
                Relación entre oportunidades ganadas y todas las oportunidades
                que ya fueron cerradas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
