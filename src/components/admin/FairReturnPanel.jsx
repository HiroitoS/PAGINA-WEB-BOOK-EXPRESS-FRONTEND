import { useState } from "react";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import { registrarRetornoFeria } from "../../api/warehouseApi";

const field = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 focus:border-red-700 focus:outline-none";
const label = "block text-xs font-semibold text-gray-900";
const grePattern = /^EG[A-Z0-9]{2}-[0-9]{1,8}$/;

function readError(error) {
  if (!error?.response) return "No se pudo conectar con el servidor.";
  const value = error.response.data?.detail ?? Object.values(error.response.data ?? {})[0];
  return Array.isArray(value) ? value[0] : typeof value === "string"
    ? value : "No fue posible registrar la devolución. Revisa los datos.";
}

export default function FairReturnPanel({ dispatch, operationId, enabled, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [receiver, setReceiver] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const returned = new Map();
  for (const entry of dispatch.fair_returns ?? []) {
    for (const item of entry.details ?? []) {
      returned.set(item.line_id, (returned.get(item.line_id) ?? 0) + item.quantity);
    }
  }
  const requested = dispatch.lines.flatMap((line) => {
    const quantity = Number(quantities[line.id] ?? 0);
    return quantity > 0 && Number.isSafeInteger(quantity)
      ? [{ line_id: line.id, quantity }]
      : [];
  });
  const validQuantities = dispatch.lines.every((line) => {
    const raw = quantities[line.id] ?? "";
    const number = Number(raw || 0);
    return Number.isSafeInteger(number) && number >= 0
      && number <= line.quantity - (returned.get(line.id) ?? 0);
  });
  const canSubmit = enabled && !busy && validQuantities && requested.length > 0
    && receiver.trim().split(/\s+/).length >= 2
    && grePattern.test(reference.trim().toUpperCase())
    && Number(reference.trim().split("-")[1]) > 0
    && reason.trim().length >= 15 && confirmed;

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const result = await registrarRetornoFeria(operationId, {
        idempotency_key: key,
        receiver_name: receiver.trim(),
        transport_reference: reference.trim().toUpperCase(),
        reason: reason.trim(),
        received_confirmed: true,
        lines: requested,
      });
      setKey(crypto.randomUUID());
      setQuantities({});
      setConfirmed(false);
      setExpanded(false);
      onSaved?.(result);
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3"
      aria-label="Retorno de libros desde feria">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-bold text-gray-950">
            <FiArrowLeft aria-hidden="true" /> Retornos de feria
          </h5>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Registra solo los libros que ya regresaron físicamente al almacén de origen.
          </p>
        </div>
        {enabled && (
          <button type="button" onClick={() => setExpanded((value) => !value)}
            className="min-h-10 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-950 hover:border-red-600">
            {expanded ? "Cerrar" : "Registrar retorno"}
          </button>
        )}
      </div>
      {(dispatch.fair_returns ?? []).length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-gray-950">
            Historial de retornos ({dispatch.fair_returns.length})
          </summary>
          <div className="mt-3 space-y-2 text-xs text-gray-700">
            {dispatch.fair_returns.map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-3">
                <p className="font-bold text-gray-950">
                  {item.details.reduce((total, line) => total + line.quantity, 0)} libros retornados
                </p>
                <p className="mt-1">Recibió: {item.received_by}</p>
                <p className="mt-1">Sustento: {item.reference}</p>
              </div>
            ))}
          </div>
        </details>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {expanded && enabled && (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-gray-50 p-3">
          <p className="text-xs leading-5 text-gray-700">
            Esta acción actualiza existencias de feria y almacén al confirmar. Verifica
            la documentación del traslado fuera del sistema; este registro no es una GRE.
          </p>
          <div className="space-y-2">
            {dispatch.lines.map((line) => {
              const available = Math.max(0, line.quantity - (returned.get(line.id) ?? 0));
              return (
                <label key={line.id} className="grid items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_6rem]">
                  <span className="text-xs leading-5 text-gray-900">
                    <strong>{line.product}</strong>
                    <span className="block text-gray-600">
                      De esta entrega, aún no retornadas: {available}
                    </span>
                  </span>
                  <input type="number" min="0" max={available} step="1" inputMode="numeric"
                    aria-label={`Retornar unidades de ${line.product}`}
                    className={field} value={quantities[line.id] ?? ""}
                    onChange={(event) => setQuantities((previous) => ({
                      ...previous, [line.id]: event.target.value,
                    }))} />
                </label>
              );
            })}
          </div>
          <label className={label}>Nombres y apellidos de quien recibe
            <input className={field} maxLength={180} value={receiver}
              onChange={(event) => setReceiver(event.target.value)} />
          </label>
          <label className={label}>Referencia GRE verificada externamente
            <input className={field} maxLength={120} value={reference}
              onChange={(event) => setReference(event.target.value.toUpperCase())}
              placeholder="EG01-00000001" />
          </label>
          <label className={label}>Motivo del retorno
            <textarea rows={2} maxLength={500} className={field} value={reason}
              onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-xs leading-5 text-gray-800">
            <input type="checkbox" checked={confirmed} className="mt-1"
              onChange={(event) => setConfirmed(event.target.checked)} />
            Confirmo que los libros retornaron físicamente, fueron contados y se comprobó el sustento legal aplicable.
          </label>
          <button type="submit" disabled={!canSubmit}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
            <FiCheckCircle aria-hidden="true" /> {busy ? "Registrando…" : "Confirmar retorno físico"}
          </button>
        </form>
      )}
    </section>
  );
}
