import { useEffect, useState } from "react";
import {
  confirmarPreparacionDistribucion,
  consultarBorradorTransporte,
  consultarPreparacionDistribucion,
  guardarBorradorTransporte,
  reservarDistribucion,
} from "../../api/warehouseApi";

const primary = "inline-flex min-h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50";
const input = "mt-1 min-h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-700 focus:outline-none";

const FIELDS = [
  ["issuer_ruc", "RUC del remitente", "text"],
  ["destination_name", "Destinatario o encargado", "text"],
  ["destination_id_number", "Documento del destinatario", "text"],
  ["departure_address", "Dirección real de partida", "text"],
  ["destination_address", "Dirección real de llegada", "text"],
  ["departure_on", "Fecha prevista de inicio del traslado", "date"],
  ["gross_weight_kg", "Peso bruto aproximado (kg)", "number"],
  ["license_plate", "Placa del vehículo", "text"],
  ["driver_document", "Documento del conductor", "text"],
  ["driver_license", "Licencia de conducir", "text"],
  ["carrier_ruc", "RUC de la empresa transportista", "text"],
];

const REASONS = [
  ["", "Elegir según el traslado real"],
  ["consignment", "Consignación"],
  ["company_transfer", "Entre establecimientos de la empresa"],
  ["sale", "Venta"],
  ["other", "Otro (verificar motivo aplicable en SUNAT)"],
];

function errorText(error) {
  if (!error?.response) return "No pudimos conectar con el servidor. Inténtalo nuevamente.";
  const data = error.response.data;
  const detail = data?.detail;
  if (Array.isArray(detail)) return detail[0];
  if (typeof detail === "string") return detail;
  const first = Object.values(data ?? {}).find((value) => Array.isArray(value) || typeof value === "string");
  if (Array.isArray(first)) return first[0];
  return first || "Revisa la información de la entrega.";
}

export default function DistributionPreparationPanel({ operation, canManage, onChanged }) {
  const [tab, setTab] = useState("stock");
  const [revision, setRevision] = useState(0);
  const [preparation, setPreparation] = useState(null);
  const [transport, setTransport] = useState(null);
  const [documentForm, setDocumentForm] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([
      consultarPreparacionDistribucion(operation.id),
      consultarBorradorTransporte(operation.id),
    ]).then(([stock, draft]) => {
      if (ignore) return;
      setPreparation(stock);
      setTransport(draft);
      setDocumentForm(Object.fromEntries(Object.entries(draft.draft).map(
        ([key, value]) => [key, value == null ? "" : String(value)],
      )));
      setCounts({});
    }).catch((err) => {
      if (!ignore) setError(errorText(err));
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [operation.id, revision]);

  async function applyAction(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "reserve") {
        await reservarDistribucion(operation.id);
        setNotice("Libros reservados en el almacén de origen. Todavía no fueron despachados.");
      } else {
        const reservations = preparation?.reservations?.filter((row) => row.status === "active") ?? [];
        const payload = reservations.map((row) => ({
          reservation_id: row.id,
          counted: Number(counts[row.id]),
        }));
        if (payload.some((row) => !Number.isSafeInteger(row.counted) || row.counted < 0)
          || payload.length === 0
          || reservations.some((row) => counts[row.id] === undefined || counts[row.id] === "")) {
          setError("Registra el conteo físico de cada lote antes de confirmar la preparación.");
          return;
        }
        await confirmarPreparacionDistribucion(operation.id, payload);
        setNotice("Preparación verificada. Los libros siguen en el almacén hasta su despacho.");
      }
      setLoading(true);
      setRevision((current) => current + 1);
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveDocument(event) {
    event.preventDefault();
    if (busy || !documentForm) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...documentForm,
        departure_on: documentForm.departure_on || null,
        gross_weight_kg: documentForm.gross_weight_kg || null,
      };
      const response = await guardarBorradorTransporte(operation.id, payload);
      setTransport(response);
      setNotice("Datos de traslado guardados para revisión. No se ha emitido una guía SUNAT.");
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const active = preparation?.reservations?.filter((row) => row.status === "active") ?? [];
  const counted = active.length > 0 && active.every(
    (row) => counts[row.id] !== undefined && String(counts[row.id]).trim() !== "",
  );

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
      aria-label="Preparación y documentos de entrega">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-gray-950">Preparación de esta entrega</h4>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            La reserva separa libros para esta entrega. No los despacha ni modifica su ubicación.
          </p>
        </div>
        <div role="tablist" aria-label="Información de la entrega"
          className="inline-flex rounded-lg bg-white p-1 ring-1 ring-gray-200">
          {[["stock", "Libros y conteo"], ["document", "Datos del traslado"]].map(([value, label]) => (
            <button key={value} type="button" role="tab"
              aria-selected={tab === value} onClick={() => setTab(value)}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold ${
                tab === value ? "bg-gray-950 text-white" : "text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">{notice}</p>}
      {loading && <p role="status" className="text-xs text-gray-600">Consultando información…</p>}
      {!loading && tab === "stock" && preparation && (
        <div role="tabpanel" className="space-y-3">
          <p className="text-xs text-gray-700">
            <strong>Origen:</strong> {preparation.source}{" · "}
            <strong>Destino previsto:</strong> {preparation.destination}
          </p>
          <div className="space-y-2">
            {preparation.items.map((row) => (
              <div key={row.product_id} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-bold text-gray-950">{row.product}</p>
                <p className="mt-1 text-xs leading-5 text-gray-700">
                  Planificados: <strong>{row.planned}</strong>
                  {" · "}Libres en origen: <strong>{row.free_at_origin}</strong>
                  {" · "}Reservados para esta entrega: <strong>{row.already_reserved}</strong>
                  {row.shortage > 0 && <span className="font-bold text-red-700"> · Faltan {row.shortage}</span>}
                </p>
                {preparation.status === "planned" && row.lots.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Lotes: {row.lots.filter((lot) => lot.free > 0).map(
                      (lot) => `${lot.receipt_number} (${lot.free})`,
                    ).join(", ") || "Sin unidades libres"}
                  </p>
                )}
              </div>
            ))}
          </div>
          {canManage && preparation.status === "planned" && (
            <button type="button" className={primary} disabled={busy || !preparation.can_reserve}
              onClick={() => applyAction("reserve")}>
              Reservar existencias de esta entrega
            </button>
          )}
          {preparation.status === "reserved" && (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-gray-900">Conteo físico por lote</h5>
              {active.map((row) => (
                <label key={row.id} className="block rounded-lg border border-gray-200 bg-white p-3 text-xs font-bold text-gray-800">
                  {row.product} · {row.receipt_number} · Reservadas: {row.quantity}
                  <input type="number" inputMode="numeric" min="0" step="1"
                    value={counts[row.id] ?? ""}
                    onChange={(event) => setCounts((previous) => ({ ...previous, [row.id]: event.target.value }))}
                    placeholder="Unidades verificadas físicamente"
                    className={input} />
                </label>
              ))}
              <p className="text-xs text-amber-900">
                Si hay diferencias de conteo, no confirmes. Revisa las unidades antes de preparar.
              </p>
              {canManage && (
                <button type="button" className={primary} disabled={!counted || busy}
                  onClick={() => applyAction("confirm")}>
                  Confirmar preparación física
                </button>
              )}
            </div>
          )}
          {preparation.status === "prepared" && (
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs font-bold text-green-900">
              Preparación verificada. Pendiente de documentación y despacho.
            </p>
          )}
          {preparation.status === "cancelled" && (
            <p className="text-xs text-gray-600">Esta entrega fue anulada; sus reservas ya no están activas.</p>
          )}
        </div>
      )}
      {!loading && tab === "document" && documentForm && (
        <form role="tabpanel" onSubmit={saveDocument} className="space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            Solo preparas datos para revisión. Esta pantalla NO emite ni valida una GRE
            ante SUNAT. Cuando sea obligatoria, debes contar con la guía y su
            constancia aceptada antes de iniciar el traslado.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-gray-800">
              Motivo del traslado
              <select className={input} value={documentForm.transfer_reason}
                onChange={(e) => setDocumentForm((prev) => ({ ...prev, transfer_reason: e.target.value }))}>
                {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-gray-800">
              Transporte
              <select className={input} value={documentForm.transport_mode}
                onChange={(e) => setDocumentForm((prev) => ({ ...prev, transport_mode: e.target.value }))}>
                <option value="">Elegir modalidad de transporte</option>
                <option value="private">Privado (vehículo propio)</option>
                <option value="public">Público (transportista)</option>
              </select>
            </label>
            {FIELDS.filter(([key]) => (
              documentForm.transport_mode === "private"
                ? key !== "carrier_ruc"
                : documentForm.transport_mode === "public"
                  ? !["license_plate", "driver_document", "driver_license"].includes(key)
                  : true
            )).map(([key, label, type]) => (
              <label key={key} className="block min-w-0 text-xs font-bold text-gray-800">
                {label}
                <input type={type} value={documentForm[key] ?? ""}
                  min={key === "gross_weight_kg" ? "0.001" : undefined}
                  step={key === "gross_weight_kg" ? "0.001" : undefined}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  className={input} />
              </label>
            ))}
          </div>
          <label className="block text-xs font-bold text-gray-800">
            Observaciones para documentación
            <textarea rows={2} maxLength={500} className={input}
              value={documentForm.notes ?? ""}
              onChange={(event) => setDocumentForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>
          {transport && (
            <p className="text-xs text-gray-600">
              Datos por completar: <strong>{transport.missing_fields.length}</strong>.
              {" "}El prechequeo no sustituye las validaciones de SUNAT.
            </p>
          )}
          {canManage && operation.status !== "cancelled" && (
            <button type="submit" className={primary} disabled={busy}>
              Guardar datos de traslado
            </button>
          )}
        </form>
      )}
    </section>
  );
}
