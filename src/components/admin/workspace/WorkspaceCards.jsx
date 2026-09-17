export function SummaryCard({ helper, icon, label, value, variant = "default" }) {
  const iconClass =
    variant === "danger"
      ? "bg-red-50 text-red-700"
      : variant === "warning"
        ? "bg-yellow-50 text-yellow-700"
        : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-gray-700">{label}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">{helper}</p>
          <p className="mt-4 text-3xl font-black text-gray-950">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function PanelCard({ children, icon, subtitle, title }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">{subtitle}</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">{title}</h2>
        </div>
      </div>

      {children}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm font-semibold text-gray-500">
      {text}
    </div>
  );
}