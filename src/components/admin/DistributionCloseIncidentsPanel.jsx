import { useState } from "react";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { registrarDiferenciaCierre, registrarHallazgoCierre } from "../../api/warehouseApi";

const inputClass = "min-h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-700 focus:outline-none";
const reasons = [
  ["not_found", "No encontrado en conteo"],
  ["count_error", "Posible error de conteo"],
  ["teacher_delivery", "Posible entrega a docente"],
  ["damaged", "Producto deteriorado"],
  ["other", "Otra situación por investigar"],
];

function messageFromError(error) {
  const details = error?.response?.data;
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
  const incidents = dispatch.close_incidents ?? [];
  const lines = dispatch.lines ?? [];
  const reportedByLine = incidents.reduce((totals, incident) => {
    totals[incident.line_id] = (totals[incident.line_id] ?? 0) + incident.quantity;
    return totals;
  }, {});
  const availableForReport = (line) => Math.max(0, line.quantity - (reportedByLine[line.id] ?? 0));
  const selectedLine = lines.find((line) => String(line.id) === lineId);
  const reportableQuantity = selectedLine ? availableForReport(selectedLine) : 0;

  async function report(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await registrarDiferenciaCierre(operationId, {
        idempotency_key: crypto.randomUUID(),
        line_id: Number(lineId), quantity: Number(quantity),
        category, note: note.trim(),
      });
      setNote(""); setQuantity(""); setLineId("");
      setSuccess("Observación registrada. No se modificaron las existencias.");
      onChanged?.();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusy(false);
    }
  }

  async function recordFinding(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await registrarHallazgoCierre(operationId, {
        idempotency_key: crypto.randomUUID(),
        report_id: Number(findingId), quantity: Number(foundQuantity),
        location_note: locationNote.trim(),
      });
      setFoundQuantity(""); setLocationNote("");
      setSuccess("Hallazgo registrado. La ubicación y devolución física siguen pendientes de verificar.");
      onChanged?.();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="closing-incidents-heading">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Control de inventario</p>
        <h5 id="closing-incidents-heading" className="mt-1 text-sm font-black text-gray-950">
          Diferencias y libros encontrados después del conteo
        </h5>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Registra lo observado al cierre de feria, consignación o punto de venta.
          Un hallazgo no suma libros al almacén ni demuestra que se vendieron.
          Jefatura deberá comprobar la ubicación y aprobar la regularización aplicable.
        </p>
      </div>

      {incidents.length > 0 ? (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-gray-950">Incidencia #{incident.id} · {incident.quantity} libros observados</strong>
                <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-950">En revisión</span>
              </div>
              <p className="mt-2 text-gray-700">{incident.note}</p>
              <p className="mt-2 text-gray-700">
                Encontrados posteriormente: <strong>{incident.found_quantity}</strong> de {incident.quantity}
              </p>
              {incident.findings?.map((finding) => (
                <p key={finding.id} className="mt-1 rounded-lg bg-white p-2 text-gray-700">
                  +{finding.quantity} encontrados · {finding.location_note}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-600">
          No hay diferencias de cierre registradas en esta operación.
        </p>
      )}

      {canReport && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={report} className="space-y-3 rounded-xl border border-gray-200 p-3">
            <h6 className="text-sm font-bold text-gray-950">Registrar diferencia</h6>
            <label className="block text-xs font-semibold text-gray-800">Producto y lote
              <select className={inputClass} required value={lineId} onChange={(e) => setLineId(e.target.value)}>
                <option value="">Selecciona un lote</option>
                {lines.filter((line) => availableForReport(line) > 0).map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.product} · Por observar como máximo: {availableForReport(line)} de {line.quantity}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-800">Cantidad por investigar
              <input type="number" min="1" max={reportableQuantity || undefined} required className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
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
            <button type="submit" disabled={busy || !lineId || !quantity || Number(quantity) < 1 || Number(quantity) > reportableQuantity || note.trim().length < 20}
              className="min-h-10 rounded-xl bg-red-700 px-4 text-xs font-bold text-white disabled:opacity-50">
              Registrar observación
            </button>
          </form>
          <form onSubmit={recordFinding} className="space-y-3 rounded-xl border border-gray-200 p-3">
            <h6 className="text-sm font-bold text-gray-950">Registrar libros encontrados</h6>
            <label className="block text-xs font-semibold text-gray-800">Observación original
              <select required className={inputClass} value={findingId} onChange={(e) => setFindingId(e.target.value)}>
                <option value="">Selecciona una incidencia</option>
                {incidents.filter((item) => item.found_quantity < item.quantity).map((item) =>
                  <option key={item.id} value={item.id}>#{item.id} · Pendientes de localizar: {item.quantity - item.found_quantity}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-800">Cantidad encontrada
              <input type="number" min="1" required className={inputClass} value={foundQuantity} onChange={(e) => setFoundQuantity(e.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-gray-800">¿Dónde y cómo se encontraron? (mínimo 20 caracteres)
              <textarea required rows={3} minLength={20} maxLength={500} className={inputClass} value={locationNote} onChange={(e) => setLocationNote(e.target.value)} />
            </label>
            <button type="submit" disabled={busy || !findingId || !foundQuantity || locationNote.trim().length < 20}
              className="min-h-10 rounded-xl border border-gray-300 px-4 text-xs font-bold text-gray-900 disabled:opacity-50">
              Registrar hallazgo
            </button>
          </form>
        </div>
      )}
      {error && <p role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800"><FiAlertTriangle />{error}</p>}
      {success && <p role="status" className="flex gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-800"><FiCheckCircle />{success}</p>}
    </section>
  );
}
