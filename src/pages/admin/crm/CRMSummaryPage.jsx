import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  FaBriefcase,
  FaBullseye,
  FaChartLine,
  FaExclamationTriangle,
  FaHandshake,
  FaSchool,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";
import { getCRMSummary } from "../../../api/crmApi";

const EMPTY_SUMMARY = {
  schools: 0,
  open_opportunities: 0,
  won_opportunities: 0,
  lost_opportunities: 0,
  opportunities_without_activity: 0,
  activities_today: 0,
  stages: [],
};

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
    muted: {
      card: "border-gray-200 bg-gray-50",
      icon: "bg-white text-gray-700 ring-1 ring-gray-200",
      value: "text-gray-900",
    },
  };

  const currentTone = tones[tone] || tones.default;

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      className={`rounded-3xl border p-4 shadow-sm sm:p-5 ${currentTone.card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-black ${currentTone.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${currentTone.icon}`}
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

function PipelineRow({ stage, totalOpportunities }) {
  const total = Number(stage?.total || 0);
  const percent =
    totalOpportunities > 0
      ? Math.round((total / totalOpportunities) * 100)
      : 0;

  const barClass =
    stage?.stage__category === "lost"
      ? "bg-gray-500"
      : stage?.stage__category === "won"
        ? "bg-red-700"
        : "bg-gray-950";

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-600 ring-1 ring-gray-200">
            {percent}%
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="h-36 animate-pulse rounded-3xl bg-gray-200" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl bg-gray-200"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-3xl bg-gray-200" />
    </div>
  );
}

export default function CRMSummaryPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
            stages: Array.isArray(data?.stages) ? data.stages : [],
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

  if (loading) {
    return <LoadingState />;
  }

  const totalOpportunities =
    Number(summary.open_opportunities || 0)
    + Number(summary.won_opportunities || 0)
    + Number(summary.lost_opportunities || 0);

  const followUpCoverage =
    summary.open_opportunities > 0
      ? Math.max(
          0,
          100
            - Math.round(
                (summary.opportunities_without_activity
                  / summary.open_opportunities)
                  * 100,
              ),
        )
      : 0;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-950 text-white shadow-sm">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-red-200 ring-1 ring-white/10">
              <FaBriefcase />
              CRM Comercial
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Resumen de cartera comercial
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Seguimiento de colegios, oportunidades y actividad comercial
              dentro del alcance asignado a tu usuario.
            </p>
          </div>

          <button
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100"
            type="button"
            onClick={() => setReloadKey((currentKey) => currentKey + 1)}
          >
            <FaSyncAlt className="text-xs" />
            Actualizar
          </button>
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
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <MetricCard
          icon={FaSchool}
          label="Colegios en cartera"
          value={summary.schools}
          description="Colegios visibles según tu responsabilidad comercial."
        />

        <MetricCard
          icon={FaBullseye}
          label="Oportunidades activas"
          value={summary.open_opportunities}
          description="Negociaciones que todavía continúan en proceso."
          tone="red"
        />

        <MetricCard
          icon={FaExclamationTriangle}
          label="Sin actividad registrada"
          value={summary.opportunities_without_activity}
          description="Oportunidades abiertas que todavía no tienen gestión comercial."
          tone="warning"
        />

        <MetricCard
          icon={FaChartLine}
          label="Actividad de hoy"
          value={summary.activities_today}
          description="Gestiones comerciales registradas durante el día."
        />

        <MetricCard
          icon={FaHandshake}
          label="Adopciones confirmadas"
          value={summary.won_opportunities}
          description="Oportunidades cerradas favorablemente dentro de tu alcance."
          tone="red"
        />

        <MetricCard
          icon={FaTimesCircle}
          label="No concretadas"
          value={summary.lost_opportunities}
          description="Oportunidades cerradas sin adopción para su campaña."
          tone="muted"
        />
      </motion.div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
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
                {totalOpportunities}
              </p>
            </div>
          </div>

          {summary.stages.length > 0 ? (
            <div className="mt-4 grid gap-3">
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

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Seguimiento
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-950">
            Estado de trabajo comercial
          </h2>

          <div className="mt-5 rounded-3xl bg-gray-950 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Cobertura de seguimiento
            </p>
            <p className="mt-2 text-4xl font-black">
              {followUpCoverage}%
            </p>
            <p className="mt-2 text-xs leading-5 text-gray-400">
              Porcentaje de oportunidades abiertas que ya cuentan con alguna
              actividad comercial registrada.
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-600"
                style={{ width: `${Math.min(followUpCoverage, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-black text-gray-950">
              Prioridad operativa
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {summary.opportunities_without_activity > 0
                ? `${summary.opportunities_without_activity} oportunidad(es) abierta(s) todavía requieren su primera gestión comercial.`
                : "Todas las oportunidades abiertas tienen actividad registrada."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
