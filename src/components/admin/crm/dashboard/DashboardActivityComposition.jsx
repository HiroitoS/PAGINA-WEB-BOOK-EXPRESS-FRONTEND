import { FaChartBar } from "react-icons/fa";

const ACTIVITY_METRICS = [
  { key: "call", label: "Llamadas" },
  { key: "visit", label: "Visitas coordinadas" },
  { key: "cold_visit", label: "Visitas en frío" },
  { key: "presentation", label: "Presentaciones" },
  { key: "meeting", label: "Reuniones" },
  { key: "follow_up", label: "Seguimientos" },
];

function formatInteger(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
}

export default function DashboardActivityComposition({
  activityCounts,
  total,
}) {
  return (
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
            {formatInteger(total)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ACTIVITY_METRICS.map((metric) => {
          const value = Number(activityCounts?.[metric.key] || 0);

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
  );
}
