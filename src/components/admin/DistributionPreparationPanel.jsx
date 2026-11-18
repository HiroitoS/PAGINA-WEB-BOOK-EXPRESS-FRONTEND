import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiAlertTriangle, FiFileText, FiMapPin, FiPackage, FiTruck } from "react-icons/fi";
import {
  confirmarPreparacionDistribucion,
  consultarBorradorTransporte,
  consultarPreparacionDistribucion,
  guardarBorradorTransporte,
  reservarDistribucion,
} from "../../api/warehouseApi";

const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600";
const input = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-950 transition-colors focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-100";

const FIELD_LABELS = {
  issuer_ruc: "RUC del remitente",
  departure_address: "Dirección de partida",
  destination_address: "Dirección real de llegada",
  destination_name: "Destinatario o responsable",
  destination_id_number: "Documento del destinatario",
  transport_mode: "Modalidad de transporte",
  transfer_reason: "Motivo del traslado",
  departure_on: "Fecha de salida",
  gross_weight_kg: "Peso bruto",
  license_plate: "Placa del vehículo",
  driver_document: "Documento del conductor",
  driver_license: "Licencia del conductor",
  carrier_ruc: "RUC del transportista",
};

const FIELD_LIMITS = {
  issuer_ruc: 11, destination_name: 180, destination_id_number: 20,
  departure_address: 300, destination_address: 300, license_plate: 15,
  driver_document: 20, driver_license: 30, carrier_ruc: 11,
};

const REASONS = [
  ["", "Elegir según el traslado real"],
  ["consignment", "Consignación"],
  ["company_transfer", "Entre establecimientos de la misma empresa"],
  ["itinerant", "Traslado por emisor itinerante (evaluar caso)"],
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

function buildLotSelection(preparation, quantities) {
  const lots = [];
  const totals = {};
  let valid = Boolean(preparation?.items?.length);
  for (const item of preparation?.items ?? []) {
    let total = 0;
    for (const lot of item.lots) {
      const raw = quantities[lot.stock_entry_id] ?? "";
      if (raw === "") continue;
      const amount = Number(raw);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > lot.free) {
        valid = false;
        continue;
      }
      if (amount > 0) {
        lots.push({ stock_entry_id: lot.stock_entry_id, quantity: amount });
        total += amount;
      }
    }
    totals[item.product_id] = total;
    if (total !== item.planned) valid = false;
  }
  return { lots, totals, valid };
}

export default function DistributionPreparationPanel({ operation, canManage, onChanged }) {
  const [tab, setTab] = useState("stock");
  const [revision, setRevision] = useState(0);
  const [preparation, setPreparation] = useState(null);
  const [transport, setTransport] = useState(null);
  const [documentForm, setDocumentForm] = useState(null);
  const [counts, setCounts] = useState({});
  const [manualSelection, setManualSelection] = useState(false);
  const [lotQuantities, setLotQuantities] = useState({});
  const [documentChanged, setDocumentChanged] = useState(false);
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
      setManualSelection(false);
      setLotQuantities({});
      setDocumentChanged(false);
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
        await reservarDistribucion(
          operation.id, manualSelection ? lotSelection.lots : null,
        );
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
      setDocumentChanged(false);
      setNotice("Borrador guardado para revisión. No se emitió ninguna guía SUNAT.");
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const lotSelection = buildLotSelection(preparation, lotQuantities);
  const active = preparation?.reservations?.filter((row) => row.status === "active") ?? [];
  const counted = active.length > 0 && active.every(
    (row) => counts[row.id] !== undefined && String(counts[row.id]).trim() !== "",
  );
  const shortageItems = preparation?.items?.filter((item) => item.shortage > 0) ?? [];
  const requiredFields = [
    "issuer_ruc", "departure_address", "destination_address",
    "destination_name", "destination_id_number", "transport_mode",
    "transfer_reason", "departure_on", "gross_weight_kg",
    ...(documentForm?.transport_mode === "private"
      ? ["license_plate", "driver_document", "driver_license"] : []),
    ...(documentForm?.transport_mode === "public" ? ["carrier_ruc"] : []),
  ];
  const draftMissing = requiredFields.filter((key) => !String(documentForm?.[key] ?? "").trim());

  function changeDraft(key, value) {
    setDocumentForm((previous) => ({ ...previous, [key]: value }));
    setDocumentChanged(true);
  }

  function draftField(key, label, options = {}) {
    const { type = "text", hint = "", placeholder = "", wide = false } = options;
    return (
      <label key={key} className={wide ? "block min-w-0 sm:col-span-2" : "block min-w-0"}>
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-5 text-gray-600">{hint}</span>}
        <input type={type} className={input} value={documentForm?.[key] ?? ""}
          maxLength={FIELD_LIMITS[key]}
          inputMode={key === "issuer_ruc" || key === "carrier_ruc" ? "numeric" : undefined}
          min={key === "gross_weight_kg" ? "0.001" : undefined}
          step={key === "gross_weight_kg" ? "0.001" : undefined}
          placeholder={placeholder}
          onChange={(event) => changeDraft(key, event.target.value)}
        />
      </label>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
      aria-label="Preparación y documentos de entrega">
      <div className="rounded-xl bg-gray-950 p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
              Entrega logística · {operation.mode === "fair" ? "Feria" : operation.mode === "consignment" ? "Consignación" : "Punto de venta"}
            </p>
            <h4 className="mt-1 text-lg font-bold">Preparación y documentación</h4>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-200">
              Primero se verifican y reservan los libros. Después se prepara la documentación
              para el traslado real. Guardar datos no envía ni mueve mercadería.
            </p>
          </div>
          <span className="rounded-lg border border-gray-500 bg-gray-800 px-3 py-2 text-xs font-semibold text-white">
            {preparation?.status === "prepared" ? "Preparada · sin despacho" :
              preparation?.status === "reserved" ? "Existencias reservadas" :
                preparation?.status === "cancelled" ? "Anulada" : "Por preparar"}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={tab === "stock"}
            onClick={() => setTab("stock")}
            className={tab === "stock"
              ? "flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-left text-sm font-bold text-gray-950"
              : "flex min-h-12 items-center gap-2 rounded-xl border border-gray-600 px-4 text-left text-sm font-semibold text-white hover:bg-gray-800"}>
            <FiPackage aria-hidden="true" className="shrink-0 text-lg" />
            1. Existencias, reserva y conteo
          </button>
          <button type="button" aria-pressed={tab === "document"}
            onClick={() => setTab("document")}
            className={tab === "document"
              ? "flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-left text-sm font-bold text-gray-950"
              : "flex min-h-12 items-center gap-2 rounded-xl border border-gray-600 px-4 text-left text-sm font-semibold text-white hover:bg-gray-800"}>
            <FiFileText aria-hidden="true" className="shrink-0 text-lg" />
            2. Datos para la guía de traslado
          </button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">{notice}</p>}
      {loading && <p role="status" className="text-xs text-gray-600">Consultando información…</p>}
      {!loading && tab === "stock" && preparation && (
        <div role="tabpanel" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
            <FiMapPin aria-hidden="true" className="text-lg text-gray-600" />
            <span><strong>Sale de:</strong> {preparation.source}</span>
            <span aria-hidden="true" className="text-gray-400">→</span>
            <span><strong>Se prepara para:</strong> {preparation.destination}</span>
          </div>
          <p className="text-sm leading-6 text-gray-700">
            Las unidades se reservan por guía de recepción y colegio, sin cambiar
            de almacén ni generar una venta.
          </p>
          {canManage && preparation.status === "planned" && (
            <fieldset className="rounded-lg border border-gray-200 bg-white p-3">
              <legend className="px-1 text-xs font-bold text-gray-900">
                ¿Cómo se elegirán los lotes?
              </legend>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-5">
                <label className="flex min-h-10 items-center gap-2 text-xs text-gray-800">
                  <input type="radio" name={`lot-selection-${operation.id}`}
                    checked={!manualSelection} onChange={() => setManualSelection(false)} />
                  Automáticamente, por orden de recepción
                </label>
                <label className="flex min-h-10 items-center gap-2 text-xs text-gray-800">
                  <input type="radio" name={`lot-selection-${operation.id}`}
                    checked={manualSelection} onChange={() => setManualSelection(true)} />
                  Elegir guía y cantidades
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Solo se usarán existencias conformes del colegio y del lugar de salida.
              </p>
            </fieldset>
          )}
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
                {preparation.status === "planned" && !manualSelection && row.lots.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Lotes: {row.lots.filter((lot) => lot.free > 0).map(
                      (lot) => `${lot.receipt_number} (${lot.free})`,
                    ).join(", ") || "Sin unidades libres"}
                  </p>
                )}
                {preparation.status === "planned" && manualSelection && canManage && (
                  <div className="mt-2 space-y-2">
                    {row.lots.filter((lot) => lot.free > 0).map((lot) => (
                      <label key={lot.stock_entry_id}
                        className="block rounded-lg bg-gray-50 p-2 text-xs text-gray-800">
                        Guía {lot.receipt_number} · Disponibles: {lot.free}
                        <input type="number" min="0" max={lot.free} step="1"
                          inputMode="numeric" className={input}
                          value={lotQuantities[lot.stock_entry_id] ?? ""}
                          onChange={(event) => setLotQuantities((previous) => ({
                            ...previous,
                            [lot.stock_entry_id]: event.target.value,
                          }))}
                          placeholder="Unidades de esta guía" />
                      </label>
                    ))}
                    <p className={`text-xs font-semibold ${
                      lotSelection.totals[row.product_id] === row.planned
                        ? "text-gray-700" : "text-red-700"
                    }`}>
                      Seleccionadas: {lotSelection.totals[row.product_id] ?? 0} de {row.planned}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {preparation.status === "planned" && !preparation.can_reserve && (
            <div role="status" className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-xl text-amber-800" />
              <div className="space-y-2 text-sm text-amber-950">
                <p className="font-bold">No se puede reservar todavía: falta disponibilidad en el lugar de salida.</p>
                {shortageItems.map((item) => (
                  <p key={item.product_id}>
                    {item.product}: planificados {item.planned}, libres {item.free_at_origin},
                    faltan <strong>{item.shortage}</strong> ejemplares conformes.
                  </p>
                ))}
                <p>Las unidades observadas no se pueden preparar como libros conformes.
                  Revisa primero las entradas y el saldo por ubicación.
                </p>
                <Link to="/admin/erp/almacen/inventario?vista=consolidado"
                  className="inline-flex min-h-10 items-center rounded-lg border border-amber-600 px-3 font-bold text-amber-950 hover:bg-amber-100">
                  Revisar inventario
                </Link>
              </div>
            </div>
          )}
          {canManage && preparation.status === "planned" && (
            <div className="space-y-2">
              <button type="button" className={primary}
                disabled={busy || !preparation.can_reserve || (manualSelection && !lotSelection.valid)}
                onClick={() => applyAction("reserve")}>
                Reservar existencias de esta entrega
              </button>
              {preparation.can_reserve && manualSelection && !lotSelection.valid && (
                <p className="text-sm font-medium text-gray-700">
                  Elige cantidades por guía que sumen exactamente lo planificado.
                </p>
              )}
            </div>
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
