import { FaTasks } from "react-icons/fa";

export function SelectField({ helper, id, label, name, options, placeholder, value, onChange }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
        htmlFor={id}
      >
        {label}
      </label>

      <select className="input-admin" id={id} name={name} value={value} onChange={onChange}>
        {placeholder ? <option value="">{placeholder}</option> : null}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helper ? <p className="mt-1 text-xs font-semibold text-gray-500">{helper}</p> : null}
    </div>
  );
}

export function DateTimeField({ helper, id, label, name, value, onChange }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
        htmlFor={id}
      >
        {label}
      </label>

      <input
        className="input-admin"
        id={id}
        name={name}
        type="datetime-local"
        value={value}
        onChange={onChange}
      />

      {helper ? <p className="mt-1 text-xs font-semibold text-gray-500">{helper}</p> : null}
    </div>
  );
}

export function QuickDateButton({ label, onClick }) {
  return (
    <button
      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-black text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function TaskMetricCard({ label, value, variant = "default" }) {
  const valueClass = variant === "danger" ? "text-red-700" : "text-gray-950";
  const iconClass =
    variant === "danger" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700";

  return (
    <div className="border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p className={`mt-1 text-2xl font-black sm:text-3xl ${valueClass}`}>{value}</p>
        </div>

        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClass}`}>
          <FaTasks />
        </div>
      </div>
    </div>
  );
}

export function PermissionNotice({ title, text }) {
  return (
    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <p className="font-black uppercase tracking-wide">{title}</p>
      <p className="mt-1 font-semibold leading-5">{text}</p>
    </div>
  );
}

export function InfoItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-black text-gray-900">{value}</p>
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}
