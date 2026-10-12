export function SelectField({ id, label, name, options, placeholder, value, onChange }) {
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
      className="rounded-full border border-yellow-200 bg-white px-3 py-1.5 text-xs font-black text-yellow-800 transition hover:border-yellow-300 hover:bg-yellow-100"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
