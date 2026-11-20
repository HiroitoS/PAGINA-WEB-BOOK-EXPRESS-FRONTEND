import { useMemo, useState } from "react";
import { FaLayerGroup } from "react-icons/fa";

function uniqueSorted(values) {
  return Array.from(
    new Set(values.filter(Boolean)),
  ).sort((first, second) =>
    first.localeCompare(second, "es", {
      sensitivity: "base",
    }),
  );
}

export default function QuotationBulkSupplierDiscountPanel({
  items,
  onApply,
  disabled = false,
}) {
  const providers = useMemo(
    () => uniqueSorted(items.map((item) => item.provider_name)),
    [items],
  );
  const [providerName, setProviderName] = useState("");
  const [levelName, setLevelName] = useState("");
  const [discount, setDiscount] = useState("");
  const [feedback, setFeedback] = useState("");

  const selectedProviderName = providers.includes(providerName)
    ? providerName : "";

  const levels = useMemo(
    () =>
      uniqueSorted(
        items
          .filter(
            (item) => !selectedProviderName || item.provider_name === selectedProviderName,
          )
          .map((item) => item.level_name),
      ),
    [items, selectedProviderName],
  );

  const selectedLevelName =
    levelName && levels.includes(levelName)
      ? levelName
      : "";

  const matchingCount = useMemo(
    () =>
      items.filter(
        (item) =>
          (!selectedProviderName || item.provider_name === selectedProviderName)
          && (
            !selectedLevelName
            || item.level_name === selectedLevelName
          ),
      ).length,
    [items, selectedLevelName, selectedProviderName],
  );

  function handleApply() {
    const numericDiscount = Number(discount);

    if (
      discount === ""
      || !Number.isFinite(numericDiscount)
      || numericDiscount < 0
      || numericDiscount > 100
    ) {
      setFeedback(
        "Ingresa un descuento editorial válido entre 0 y 100 %.",
      );
      return;
    }

    if (matchingCount === 0) {
      setFeedback(
        "No hay productos que coincidan con el alcance seleccionado.",
      );
      return;
    }

    onApply({
      providerName: selectedProviderName,
      levelName: selectedLevelName,
      discount: String(discount),
    });

    setFeedback(
      "Descuento aplicado a " + matchingCount + " producto(s)"
      + (selectedProviderName ? " de " + selectedProviderName : " de todas las editoriales")
      + (selectedLevelName ? " en " + selectedLevelName : " en todos los niveles")
      + ". Puedes ajustar excepciones por libro.",
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white">
          <FaLayerGroup />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black text-gray-950">
            Aplicar condición editorial en bloque
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Selecciona una editorial o todas, y un nivel o todos los niveles.
            Se actualizarán los productos del alcance elegido; después puedes
            ajustar las excepciones de forma individual.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-gray-700">
          Editorial
          <select
            value={selectedProviderName}
            disabled={disabled}
            onChange={(event) => {
              setProviderName(event.target.value);
              setLevelName("");
              setFeedback("");
            }}
            className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Todas las editoriales</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-gray-700">
          Nivel
          <select
            value={selectedLevelName}
            disabled={disabled || items.length === 0}
            onChange={(event) => {
              setLevelName(event.target.value);
              setFeedback("");
            }}
            className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Todos los niveles</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-gray-700">
          Descuento editorial %
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discount}
            disabled={disabled}
            onChange={(event) => {
              setDiscount(event.target.value);
              setFeedback("");
            }}
            placeholder="Ej. 40"
            className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            disabled={
              disabled
              || discount === ""
              || matchingCount === 0
            }
            onClick={handleApply}
            className="w-full rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Aplicar a {matchingCount} producto(s)
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-gray-600">
        Alcance actual: {matchingCount} producto(s) ·
        {selectedProviderName ? " " + selectedProviderName : " Todas las editoriales"} ·
        {selectedLevelName ? " " + selectedLevelName : " Todos los niveles"}.
        Este cambio se guardará con la cotización.
      </p>
      {feedback ? (
        <p role="status" className="mt-3 text-xs font-bold leading-5 text-gray-700">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
