import { useEffect, useMemo, useState } from "react";
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

  const levels = useMemo(
    () =>
      uniqueSorted(
        items
          .filter((item) => item.provider_name === providerName)
          .map((item) => item.level_name),
      ),
    [items, providerName],
  );

  const matchingCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.provider_name === providerName
          && (!levelName || item.level_name === levelName),
      ).length,
    [items, levelName, providerName],
  );

  useEffect(() => {
    if (providers.length === 1 && !providerName) {
      setProviderName(providers[0]);
      return;
    }

    if (
      providerName
      && !providers.includes(providerName)
    ) {
      setProviderName("");
      setLevelName("");
    }
  }, [providerName, providers]);

  useEffect(() => {
    if (levelName && !levels.includes(levelName)) {
      setLevelName("");
    }
  }, [levelName, levels]);

  function handleApply() {
    const numericDiscount = Number(discount);

    if (!providerName) {
      setFeedback("Selecciona una editorial.");
      return;
    }

    if (
      discount === ""
      || !Number.isFinite(numericDiscount)
      || numericDiscount < 0
      || numericDiscount > 100
    ) {
      setFeedback("Ingresa un descuento editorial válido entre 0 y 100 %.");
      return;
    }

    if (matchingCount === 0) {
      setFeedback("No hay productos que coincidan con el alcance seleccionado.");
      return;
    }

    onApply({
      providerName,
      levelName,
      discount: String(discount),
    });

    setFeedback(
      "Aplicado a "
      + matchingCount
      + " producto(s). Puedes ajustar excepciones de forma individual.",
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
            Completa el descuento editorial por editorial y, si corresponde,
            por nivel. Después puedes modificar cualquier producto
            individualmente.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-gray-700">
          Editorial
          <select
            value={providerName}
            disabled={disabled}
            onChange={(event) => {
              setProviderName(event.target.value);
              setLevelName("");
              setFeedback("");
            }}
            className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Seleccionar editorial</option>
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
            value={levelName}
            disabled={disabled || !providerName}
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
              || !providerName
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

      {feedback ? (
        <p className="mt-3 text-xs font-bold leading-5 text-gray-700">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
