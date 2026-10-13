import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FaArrowRight,
  FaBriefcase,
  FaBullseye,
  FaExclamationTriangle,
  FaHandshake,
  FaSchool,
  FaSyncAlt,
} from "react-icons/fa";
import { Link } from "react-router";

import { getCRMSummary } from "../../../api/crmApi";
import DashboardActivityComposition from "../../../components/admin/crm/dashboard/DashboardActivityComposition";
import DashboardClosingStatus from "../../../components/admin/crm/dashboard/DashboardClosingStatus";
import DashboardCoverageCard from "../../../components/admin/crm/dashboard/DashboardCoverageCard";
import DashboardMetricCard from "../../../components/admin/crm/dashboard/DashboardMetricCard";
import DashboardProgressMetric from "../../../components/admin/crm/dashboard/DashboardProgressMetric";
import ActivityTrendChart from "../../../components/admin/crm/dashboard/ActivityTrendChart";
import PipelineProgressList from "../../../components/admin/crm/dashboard/PipelineProgressList";
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

  const lastSevenDaysActivities = useMemo(
    () =>
      (summary.activity_trend || []).reduce(
        (total, item) => total + Number(item?.total || 0),
        0,
      ),
    [summary.activity_trend],
  );

  if (loading) {
    return <LoadingState />;
  }

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
              type="button"
              onClick={() =>
                setReloadKey((currentKey) => currentKey + 1)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100"
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
        <DashboardMetricCard
          icon={FaSchool}
          label="Colegios en cartera"
          value={formatInteger(summary.schools)}
          description="Instituciones visibles dentro de tu responsabilidad comercial."
        />

        <DashboardMetricCard
          icon={FaBullseye}
          label="Oportunidades activas"
          value={formatInteger(summary.open_opportunities)}
          description="Negociaciones que todavía continúan abiertas."
          tone="red"
        />

        <DashboardMetricCard
          icon={FaHandshake}
          label="Adopciones confirmadas"
          value={formatInteger(summary.won_opportunities)}
          description="Oportunidades cerradas favorablemente en el alcance actual."
          tone="red"
        />

        <DashboardMetricCard
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
          <DashboardProgressMetric
            label="Unidades proyectadas"
            value={formatInteger(summary.projected_units)}
            helper={
              formatInteger(summary.current_projections)
              + " proyección(es)"
            }
            progress={100}
          />
          <DashboardProgressMetric
            label="Unidades adoptadas"
            value={formatInteger(summary.adopted_units)}
            helper={
              formatInteger(summary.current_adoptions)
              + " adopción(es)"
            }
            progress={summary.unit_conversion_rate}
          />
          <DashboardProgressMetric
            label="Conversión de unidades"
            value={formatPercent(summary.unit_conversion_rate)}
            helper="Adoptado / proyectado"
            progress={summary.unit_conversion_rate}
          />
          <DashboardProgressMetric
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

            <div className="flex gap-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Últimos 7 días
                </p>
                <p className="mt-1 text-2xl font-black text-gray-950">
                  {formatInteger(lastSevenDaysActivities)}
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
          </div>

          <ActivityTrendChart trend={summary.activity_trend} />
        </section>

        <DashboardCoverageCard
          coverage={summary.follow_up_coverage}
          opportunitiesWithoutActivity={
            summary.opportunities_without_activity
          }
        />
      </div>

      <DashboardActivityComposition
        activityCounts={summary.activity_counts}
        total={summary.activities_week}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <PipelineProgressList
          stages={summary.stages}
          totalOpportunities={totalOpportunities}
        />

        <DashboardClosingStatus
          wonOpportunities={summary.won_opportunities}
          lostOpportunities={summary.lost_opportunities}
          closureConversionRate={summary.closure_conversion_rate}
        />
      </div>
    </div>
  );
}
