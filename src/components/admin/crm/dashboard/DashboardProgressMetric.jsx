export default function DashboardProgressMetric({
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
