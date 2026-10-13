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
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-700 text-lg">
              <ViewIcon />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">
                {config.eyebrow}
              </p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                {config.title}
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-300 sm:text-sm">
                {config.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenManager}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15 lg:self-auto"
          >
            Gestor completo
            <FaArrowRight className="text-xs" />
          </button>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
        "px-3 py-2 sm:px-4 "
        + (last ? "" : "border-r border-gray-100")
      }
    >
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-xl font-black "
          + (danger ? "text-red-700" : "text-gray-950")
        }
      >
        {value}
      </p>
    </div>
  );
}
