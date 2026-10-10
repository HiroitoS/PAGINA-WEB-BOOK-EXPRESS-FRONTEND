import {
  FaHandshake,
  FaTimesCircle,
} from "react-icons/fa";

function formatInteger(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
}

function formatPercent(value) {
  return Number(value || 0).toFixed(1) + "%";
}

export default function DashboardClosingStatus({
  wonOpportunities,
  lostOpportunities,
  closureConversionRate,
}) {
  return (
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
              {formatInteger(wonOpportunities)}
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
              {formatInteger(lostOpportunities)}
            </p>
          </div>
          <FaTimesCircle className="text-2xl text-gray-500" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Conversión de cierres
          </p>
          <p className="mt-1 text-3xl font-black">
            {formatPercent(closureConversionRate)}
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-400">
            Relación entre oportunidades ganadas y todas las oportunidades
            que ya fueron cerradas.
          </p>
        </div>
      </div>
    </section>
  );
}
