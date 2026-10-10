import { FaArrowRight } from "react-icons/fa";

export default function TodoViewHeader({
  config,
  onOpenManager,
  summary,
}) {
  const ViewIcon = config.icon;

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-xl">
              <ViewIcon />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">
                {config.eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                {config.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                {config.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenManager}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
          >
            Gestor completo
            <FaArrowRight className="text-xs" />
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <Metric
          label="Pendientes"
          value={summary.pending}
        />
        <Metric
          danger
          label="Vencidas"
          value={summary.overdue}
        />
        <Metric
          last
          label="Completadas"
          value={summary.completed}
        />
      </div>
    </>
  );
}

function Metric({
  danger = false,
  label,
  last = false,
  value,
}) {
  return (
    <div
      className={
        "px-4 py-3 sm:px-5 "
        + (last ? "" : "border-r border-gray-100")
      }
    >
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={
          "mt-1 text-2xl font-black "
          + (danger ? "text-red-700" : "text-gray-950")
        }
      >
        {value}
      </p>
    </div>
  );
}
