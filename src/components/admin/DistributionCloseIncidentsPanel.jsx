import { useRef, useState } from "react";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { registrarDiferenciaCierre, registrarHallazgoCierre } from "../../api/warehouseApi";

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100";
const reasons = [
  ["not_found", "No encontrado en conteo"],
  ["count_error", "Posible error de conteo"],
  ["teacher_delivery", "Posible entrega a docente"],
  ["damaged", "Producto deteriorado"],
  ["other", "Otra situación por investigar"],
];

function messageFromError(error) {
  const details = error?.response?.data;
  if (!error?.response || error.response.status >= 500) {
    return "No se pudo confirmar el registro. Reintenta con los mismos datos para evitar duplicarlo.";
  }
  const value = details?.detail ?? details?.non_field_errors;
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "string") return value;
  return "No se pudo guardar. Revisa los datos y permisos.";
}

export default function DistributionCloseIncidentsPanel({
  operationId, dispatch, canReport, onChanged,
}) {
  const [lineId, setLineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("not_found");
  const [note, setNote] = useState("");
  const [findingId, setFindingId] = useState("");
  const [foundQuantity, setFoundQuantity] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const saving = useRef(false);
  const attempts = useRef(new Map());
  const incidents = dispatch.close_incidents ?? [];
  const lines = dispatch.lines ?? [];
  const reportedByLine = incidents.reduce((totals, incident) => {
    totals[incident.line_id] = (totals[incident.line_id] ?? 0) + incident.quantity;
    return totals;
  }, {});
  const availableForReport = (line) => Math.max(0, line.quantity - (reportedByLine[line.id] ?? 0));
  const selectedLine = lines.find((line) => String(line.id) === lineId);
  const reportableQuantity = selectedLine ? availableForReport(selectedLine) : 0;
  const reportableLines = lines.filter((line) => availableForReport(line) > 0);
  const openIncidents = incidents.filter((item) => item.found_quantity < item.quantity);
  const selectedFinding = openIncidents.find((item) => String(item.id) === findingId);
  const findableQuantity = selectedFinding ? selectedFinding.quantity - selectedFinding.found_quantity : 0;
  const canSubmitReport = inRange(quantity, reportableQuantity) && note.trim().length >= 20;
  const canSubmitFinding = inRange(foundQuantity, findableQuantity) && locationNote.trim().length >= 20;
  const lotLabel = (line) => `${line.product} · Guía ${line.receipt_number} · Lote #${line.stock_entry_id}`;

  async function save(action, submit, payload, reset, confirmation) {
    if (saving.current) return;
    saving.current = true;
    const signature = JSON.stringify([operationId, action, payload]);
    const key = attempts.current.get(signature) ?? crypto.randomUUID();
    attempts.current.set(signature, key);
    setBusy(true); setError(""); setSuccess("");
    try {
      const snapshot = await submit(operationId, { ...payload, idempotency_key: key });
      attempts.current.delete(signature);
      reset();
      setSuccess(confirmation);
      onChanged?.(snapshot);
    } catch (err) {
      if (err?.response?.status >= 400 && err.response.status < 500) attempts.current.delete(signature);
      setError(messageFromError(err));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function report(event) {
    event.preventDefault();
    if (!canSubmitReport) return;
    await save("report", registrarDiferenciaCierre, {
      line_id: Number(lineId), quantity: Number(quantity), category, note: note.trim(),
    }, () => { setNote(""); setQuantity(""); setLineId(""); },
    "Observación registrada. No se modificaron las existencias.");
  }

  async function recordFinding(event) {
    event.preventDefault();
    if (!canSubmitFinding) return;
    await save("finding", registrarHallazgoCierre, {
      report_id: Number(findingId), quantity: Number(foundQuantity), location_note: locationNote.trim(),
    }, () => { setFoundQuantity(""); setLocationNote(""); setFindingId(""); },
    "Hallazgo registrado. No se modificaron las existencias.");
  }

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="closing-incidents-heading">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Control de inventario</p>
        <h5 id="closing-incidents-heading" className="mt-1 text-sm font-black text-gray-950">
          Diferencias y libros encontrados después del conteo
        </h5>
        <p className="mt-1 text-sm leading-5 text-gray-600">
          Registra lo observado al cierre de feria, consignación o punto de venta.
          Un hallazgo no suma libros al almacén ni demuestra que se vendieron.
          Jefatura deberá comprobar la ubicación y aprobar la regularización aplicable.
        </p>
      </div>

      {incidents.length > 0 ? (
        <div className="space-y-2">
          {incidents.map((incident) => {
            const line = lines.find((item) => item.id === incident.line_id);
            return (
              <div key={incident.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-gray-950">Incidencia #{incident.id} · {incident.quantity} {incident.quantity === 1 ? "libro observado" : "libros observados"}</strong>
                  <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-950">En revisión</span>
                </div>
                {line && <p className="mt-1 break-words text-xs text-gray-600">{lotLabel(line)}</p>}
                <p className="mt-2 break-words text-gray-700">{incident.note}</p>
                <p className="mt-2 text-gray-700">
                  Encontrados posteriormente: <strong>{incident.found_quantity}</strong> de {incident.quantity}
                </p>
                {incident.findings?.map((finding) => (
                  <p key={finding.id} className="mt-1 rounded-lg bg-white p-2 text-gray-700">
                    +{finding.quantity} {finding.quantity === 1 ? "encontrado" : "encontrados"} · {finding.location_note}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-600">
          No hay diferencias de cierre registradas en esta operación.
        </p>
      )}

      {canReport && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form aria-busy={busy} onSubmit={report} className="space-y-3 rounded-xl border border-gray-200 p-3">
            <h6 className="text-sm font-bold text-gray-950">Registrar diferencia</h6>
            {!reportableLines.length ? (
              <p className="text-sm text-gray-600">No quedan unidades por observar en los lotes de esta entrega.</p>
            ) : (
              <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
                <label className="block text-sm font-semibold text-gray-800">Producto y lote
                  <select className={inputClass} required value={lineId} onChange={(e) => { setLineId(e.target.value); setQuantity(""); }}>
                    <option value="">Selecciona un lote</option>
                    {reportableLines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {lotLabel(line)} · Hasta {availableForReport(line)} de {line.quantity}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-800">Cantidad por investigar
                  <input type="number" min="1" max={reportableQuantity || undefined} step="1" inputMode="numeric" disabled={!selectedLine} required className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  {selectedLine && <span className="mt-1 block font-normal text-gray-600">Hasta {reportableQuantity} unidades adicionales para observar en este lote. No es saldo de inventario.</span>}
                </label>
                <label className="block text-xs font-semibold text-gray-800">Situación identificada
                  <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-800">¿Qué ocurrió? (mínimo 20 caracteres)
                  <textarea required minLength={20} maxLength={500} rows={3} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <button type="submit" disabled={!canSubmitReport}
                  className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                  Registrar observación
                </button>
              </fieldset>
            )}
          </form>
          <form aria-busy={busy} onSubmit={recordFinding} className="space-y-3 rounded-xl border border-gray-200 p-3">
            <h6 className="text-sm font-bold text-gray-950">Registrar libros encontrados</h6>
            {!openIncidents.length ? (
              <p className="text-sm text-gray-600">No hay observaciones con libros pendientes de localizar.</p>
            ) : (
              <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
                <label className="block text-sm font-semibold text-gray-800">Observación original
                  <select required className={inputClass} value={findingId} onChange={(e) => { setFindingId(e.target.value); setFoundQuantity(""); }}>
                    <option value="">Selecciona una incidencia</option>
                    {openIncidents.map((item) =>
                      <option key={item.id} value={item.id}>#{item.id} · Pendientes de localizar: {item.quantity - item.found_quantity}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-800">Cantidad encontrada
                  <input type="number" min="1" max={findableQuantity || undefined} step="1" inputMode="numeric" disabled={!selectedFinding} required className={inputClass} value={foundQuantity} onChange={(e) => setFoundQuantity(e.target.value)} />
                  {selectedFinding && <span className="mt-1 block font-normal text-gray-600">Hasta {findableQuantity} unidades pendientes en esta observación.</span>}
                </label>
                <label className="block text-xs font-semibold text-gray-800">¿Dónde y cómo se encontraron? (mínimo 20 caracteres)
                  <textarea required rows={3} minLength={20} maxLength={500} className={inputClass} value={locationNote} onChange={(e) => setLocationNote(e.target.value)} />
                </label>
                <button type="submit" disabled={!canSubmitFinding}
                  className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-900 disabled:opacity-50">
                  Registrar hallazgo
                </button>
              </fieldset>
            )}
          </form>
        </div>
      )}
      {error && <p role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800"><FiAlertTriangle />{error}</p>}
      {success && <p role="status" className="flex gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-800"><FiCheckCircle />{success}</p>}
    </section>
  );
}

function inRange(value, limit) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= limit;
}
