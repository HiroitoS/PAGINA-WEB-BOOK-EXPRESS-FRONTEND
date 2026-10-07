const STAGE_CATEGORY_LABELS = {
  open: "En curso",
  won: "Adopción confirmada",
  lost: "No concretada",
};

function formatInteger(value) {
  return new Intl.NumberFormat("es-PE").format(Number(value || 0));
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

export default function PipelineProgressList({
  stages,
  totalOpportunities,
}) {
  const safeStages = Array.isArray(stages) ? stages : [];

  return (
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

      {safeStages.length > 0 ? (
        <div className="mt-1">
          {safeStages.map((stage) => (
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
  );
}
