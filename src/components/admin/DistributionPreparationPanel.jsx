import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiAlertTriangle, FiFileText, FiMapPin, FiPackage, FiTruck } from "react-icons/fi";
import {
  confirmarPreparacionDistribucion,
  consultarBorradorTransporte,
  consultarPreparacionDistribucion,
  guardarBorradorTransporte,
  reservarDistribucion,
  separarDisponiblesDistribucion,
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
  const [splitConfirm, setSplitConfirm] = useState(false);
  const [splitKey, setSplitKey] = useState(() => crypto.randomUUID());
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
      setSplitConfirm(false);
      setSplitKey(crypto.randomUUID());
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
      } else if (action === "split") {
        const response = await separarDisponiblesDistribucion(operation.id, splitKey);
        const reservedQuantity = response.reserved.reservations
          .filter((row) => row.status === "active")
          .reduce((sum, row) => sum + row.quantity, 0);
        const pendingQuantity = response.pending.reduce((sum, row) => sum + row.quantity, 0);
        setNotice(
          `Se reservaron ${reservedQuantity} libros conformes. Quedaron ${pendingQuantity} ` +
          "para otra entrega planificada. Todavía no salieron del almacén.",
        );
        setSplitConfirm(false);
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
  const splitAvailable = (preparation?.items ?? []).reduce(
    (total, item) => total + Math.min(item.planned, item.free_at_origin), 0,
  );
  const splitPending = (preparation?.items ?? []).reduce(
    (total, item) => total + item.shortage, 0,
  );
  const canSplit = preparation?.status === "planned"
    && splitAvailable > 0 && splitPending > 0;
  const requiredFields = [
    "issuer_ruc", "departure_address", "destination_address",
    "destination_name", "destination_id_number", "transport_mode",
    "transfer_reason", "departure_on", "gross_weight_kg",
    ...(documentForm?.transport_mode === "private"
      ? ["license_plate", "driver_document", "driver_license"] : []),
    ...(documentForm?.transport_mode === "public" ? ["carrier_ruc"] : []),
  ];
  const draftMissing = requiredFields.filter((key) => !String(documentForm?.[key] ?? "").trim());
  const canEditDraft = canManage && operation.status !== "cancelled";

  function changeDraft(key, value) {
    if (!canEditDraft) return;
    setDocumentForm((previous) => {
      const updated = { ...previous, [key]: value };
      if (key === "transport_mode" && value === "private") updated.carrier_ruc = "";
      if (key === "transport_mode" && value === "public") {
        updated.license_plate = "";
        updated.driver_document = "";
        updated.driver_license = "";
      }
      return updated;
    });
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
          disabled={!canEditDraft}
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
      {notice && <p role="status" className="rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-900">{notice}</p>}
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
                <p className="font-bold">No hay unidades suficientes para reservar toda esta entrega en una sola salida.</p>
                {shortageItems.map((item) => (
                  <p key={item.product_id}>
                    {item.product}: planificados {item.planned}, libres {item.free_at_origin},
                    faltan <strong>{item.shortage}</strong> ejemplares conformes.
                  </p>
                ))}
                <p>Los libros observados no pueden reservarse como conformes.
                  Puedes programar toda la entrega para después o separar
                  ahora lo disponible, sin perder el saldo pendiente.
                </p>
                <Link to="/admin/erp/almacen/inventario?vista=consolidado"
                  className="inline-flex min-h-10 items-center rounded-lg border border-amber-600 px-3 font-bold text-amber-950 hover:bg-amber-100">
                  Revisar inventario
                </Link>
                {canManage && canSplit && !manualSelection && (
                  <div className="mt-3 space-y-3 rounded-xl border border-amber-300 bg-white p-3">
                    <div>
                      <p className="text-sm font-bold text-gray-950">
                        ¿Quieres separar los libros que sí están disponibles?
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-800">
                        Esta entrega pasará a {splitAvailable} libros reservados.
                        Se creará otra planificación con {splitPending} pendientes.
                        No se despachará ningún libro ni se modificará el stock físico.
                      </p>
                    </div>
                    {!splitConfirm ? (
                      <button type="button"
                        disabled={busy}
                        onClick={() => setSplitConfirm(true)}
                        className={primary}>
                        Reservar {splitAvailable} y dejar {splitPending} pendientes
                      </button>
                    ) : (
                      <div className="space-y-2 rounded-xl border border-gray-300 bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-950">
                          Confirma: se registrarán dos entregas separadas
                          de la misma adopción. La reserva de {splitAvailable} será automática por guía.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy} className={primary}
                            onClick={() => applyAction("split")}>
                            {busy ? "Registrando…" : "Confirmar división y reserva"}
                          </button>
                          <button type="button" disabled={busy}
                            className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800"
                            onClick={() => setSplitConfirm(false)}>
                            Volver
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {canManage && canSplit && manualSelection && (
                  <p className="mt-2 text-xs text-gray-800">
                    Para dividir la entrega automáticamente, selecciona primero
                    «Automáticamente, por orden de recepción».
                  </p>
                )}
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
        <form onSubmit={saveDocument} className="space-y-4" aria-label="Borrador de datos de traslado">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex max-w-2xl items-start gap-3">
              <FiAlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-xl text-amber-900" />
              <div>
                <h5 className="text-sm font-bold text-amber-950">Documento preparatorio, no es una guía SUNAT</h5>
                <p className="mt-1 text-sm leading-6 text-amber-950">
                  Puedes guardar este borrador incompleto. Su información debe ser revisada
                  antes del traslado. Esta pantalla no emite ni valida una Guía de
                  Remisión Electrónica, ni autoriza la salida de libros.
                </p>
              </div>
            </div>
            <span className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-bold text-amber-950">
              Sin emisión
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <FiMapPin aria-hidden="true" className="text-xl text-gray-700" />
              <h5 className="text-sm font-bold text-gray-950">Recorrido previsto de esta entrega</h5>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ubicación interna de origen</p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">{operation.source}</p>
              </div>
              <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ubicación interna de destino</p>
                <p className="mt-1 break-words text-sm font-bold text-gray-900">{operation.destination}</p>
              </div>
            </div>
            {operation.mode === "fair" && (
              <div className="mt-3 space-y-1 rounded-lg border-l-4 border-red-700 bg-white p-3">
                <p className="text-sm font-semibold text-gray-900">Feria: identificar el destino físico concreto</p>
                <p className="text-sm leading-6 text-gray-700">
                  Un almacén genérico denominado Feria no reemplaza el nombre del evento,
                  su recinto, dirección real, fechas y custodio. Antes del despacho,
                  debe registrarse la feria específica y verificar el motivo tributario
                  correspondiente; no todas las ferias equivalen a un establecimiento propio.
                </p>
                <Link to="/admin/erp/almacen/ubicaciones"
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-red-700 underline underline-offset-4">
                  Consultar ubicaciones de almacén
                </Link>
              </div>
            )}
          </div>

          <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
            <legend className="px-2 text-base font-bold text-gray-950">1. Motivo y modalidad</legend>
            <p className="text-sm leading-6 text-gray-600">
              Selecciona el motivo real del movimiento. La modalidad comercial
              Feria, Tienda o Consignación no determina automáticamente el motivo ante SUNAT.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-gray-900">Motivo a revisar</span>
                <select className={input} value={documentForm.transfer_reason ?? ""}
                  disabled={!canEditDraft}
                  onChange={(event) => changeDraft("transfer_reason", event.target.value)}>
                  {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-gray-900">Modalidad de transporte</span>
                <select className={input} value={documentForm.transport_mode ?? ""}
                  disabled={!canEditDraft}
                  onChange={(event) => changeDraft("transport_mode", event.target.value)}>
                  <option value="">Seleccionar transporte</option>
                  <option value="private">Privado · vehículo bajo responsabilidad del remitente</option>
                  <option value="public">Público · empresa transportista</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
            <legend className="px-2 text-base font-bold text-gray-950">2. Remitente y lugar de partida</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {draftField("issuer_ruc", "RUC del remitente", {
                hint: "Escribe el RUC real de la empresa que sustenta el traslado.",
                placeholder: "11 dígitos",
              })}
              {draftField("departure_address", "Dirección física de salida", {
                wide: true,
                hint: "Consigna la dirección exacta desde donde saldrán los libros; no basta el nombre del almacén.",
                placeholder: "Dirección del punto de partida",
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
            <legend className="px-2 text-base font-bold text-gray-950">3. Destinatario y destino real</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {draftField("destination_name", "Destinatario o responsable de recepción", {
                placeholder: "Nombre o razón social real",
              })}
              {draftField("destination_id_number", "Documento del destinatario", {
                placeholder: "RUC u otro documento que corresponda",
              })}
              {draftField("destination_address", "Dirección física de llegada", {
                wide: true,
                hint: "Para Feria, identifica el recinto y dirección real. No se completa automáticamente a partir del subalmacén.",
                placeholder: "Dirección concreta del punto de llegada",
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
            <legend className="px-2 text-base font-bold text-gray-950">4. Transporte y fechas</legend>
            <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
              <FiTruck aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-gray-700" />
              <p className="text-sm leading-6 text-gray-700">
                Los datos del vehículo o transportista se solicitan según
                la modalidad elegida y deben verificarse con el encargado real.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {draftField("departure_on", "Fecha prevista de salida", { type: "date" })}
              {draftField("gross_weight_kg", "Peso bruto total (kg)", {
                type: "number", placeholder: "Ej. 12.500",
              })}
              {documentForm.transport_mode === "private" && (
                <>
                  {draftField("license_plate", "Placa de la unidad", { placeholder: "Placa real" })}
                  {draftField("driver_document", "Documento del conductor", { placeholder: "Documento real" })}
                  {draftField("driver_license", "Licencia de conducir", { placeholder: "Licencia real" })}
                </>
              )}
              {documentForm.transport_mode === "public" &&
                draftField("carrier_ruc", "RUC del transportista", {
                  hint: "Empresa que presta el servicio de transporte.",
                  placeholder: "11 dígitos",
                })}
              {!documentForm.transport_mode && (
                <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 sm:col-span-2">
                  Elige la modalidad de transporte para mostrar los datos que le corresponden.
                </p>
              )}
            </div>
          </fieldset>

          <label className="block rounded-xl border border-gray-200 p-4">
            <span className="text-sm font-bold text-gray-950">Observaciones de documentación (opcional)</span>
            <span className="mt-1 block text-xs leading-5 text-gray-600">
              Anota el recinto, referencias operativas o asuntos pendientes por confirmar.
            </span>
            <textarea rows={3} maxLength={500} className={input}
              disabled={!canEditDraft}
              value={documentForm.notes ?? ""}
              placeholder="Datos para revisión de Jefatura; no reemplazan la guía."
              onChange={(event) => changeDraft("notes", event.target.value)} />
          </label>

          <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
            <h5 className="text-sm font-bold text-gray-950">Resumen de revisión preliminar</h5>
            <p className="mt-1 text-sm leading-6 text-gray-700">
              {draftMissing.length === 0
                ? "Los campos internos están completos para revisión; esto todavía no garantiza conformidad SUNAT."
                : "Faltan " + draftMissing.length + " dato(s) para la revisión interna. Puedes guardar el borrador sin completarlos."}
            </p>
            {draftMissing.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Por completar: {draftMissing.map((key) => FIELD_LABELS[key]).join(", ")}.
              </p>
            )}
            {documentChanged && (
              <p role="status" className="mt-2 text-sm font-bold text-amber-900">
                Hay cambios sin guardar en el borrador.
              </p>
            )}
            {transport && !documentChanged && (
              <p className="mt-2 text-xs text-gray-600">
                Último borrador guardado: {transport.data_complete_for_review
                  ? "campos internos completos" : "con datos pendientes"}.
                La plataforma no ha emitido ninguna guía de remisión.
              </p>
            )}
            {canEditDraft && (
              <button type="submit" className={primary} disabled={busy}>
                {busy ? "Guardando…" : "Guardar borrador para revisión"}
              </button>
            )}
            {!canEditDraft && (
              <p className="mt-2 text-sm text-gray-600">
                {operation.status === "cancelled"
                  ? "Esta entrega fue anulada y su documentación ya no puede modificarse."
                  : "Puedes consultar estos datos, pero no tienes permiso para modificarlos."}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
