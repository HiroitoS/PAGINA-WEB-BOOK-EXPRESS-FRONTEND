import {
  FaChartLine,
  FaCheckCircle,
} from "react-icons/fa";

function formatInteger(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
}

function formatPercent(value) {
  return Number(value || 0).toFixed(1) + "%";
}

export default function DashboardCoverageCard({
  coverage,
  opportunitiesWithoutActivity,
}) {
  const safeCoverage = Math.min(
    Math.max(Number(coverage || 0), 0),
    100,
  );

  return (
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
              {formatPercent(safeCoverage)}
            </p>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-xl">
            {safeCoverage >= 100 ? (
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
            style={{ width: String(safeCoverage) + "%" }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-black text-gray-950">
          Atención prioritaria
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {opportunitiesWithoutActivity > 0
            ? formatInteger(opportunitiesWithoutActivity)
              + " oportunidad(es) abierta(s) todavía requieren su primera gestión comercial."
            : "Todas las oportunidades abiertas tienen actividad registrada."}
        </p>
      </div>
    </section>
  );
}
