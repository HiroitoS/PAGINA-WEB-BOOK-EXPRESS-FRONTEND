import { useEffect, useRef, useState } from "react";
import {
  listarUbicacionesAlmacen, consultarResumenUbicaciones,
  buscarLotesParaTraslado, listarTrasladosAlmacen, registrarTrasladoAlmacen,
} from "../../api/warehouseApi";
import ConfirmActionDialog from "./ConfirmActionDialog";

function explicarError(err) {
  const data = err?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(" ");
  if (data && typeof data === "object") return Object.values(data).flat().map(String).join(" ");
  return "No se pudo completar el traslado. Revisa los datos y vuelve a intentarlo.";
}

function soles(value) {
  if (value === null || value === undefined || value === "") return "Costo por definir";
  return new Intl.NumberFormat("es-PE", {
    style: "currency", currency: "PEN",
  }).format(Number(value));
}

const inputClase = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none";

export default function InventoryTransfersPanel({ canManage, onRefresh }) {
  const formRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [lots, setLots] = useState([]);
  const [count, setCount] = useState(0);
  const [pages, setPages] = useState(1);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [entregaConfirmada, setEntregaConfirmada] = useState(false);
  const [key, setKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([
      listarUbicacionesAlmacen(), consultarResumenUbicaciones(), listarTrasladosAlmacen(),
    ]).then(([items, counts, records]) => {
      if (ignore) return;
      const active = (Array.isArray(items) ? items : items.results ?? []).filter((item) => item.is_active);
      setLocations(active);
      setSummary(counts);
      setHistory(records.results ?? []);
      setSourceId((previous) => previous || String(active.find((item) => item.kind === "main")?.id ?? active[0]?.id ?? ""));
      setDestinationId((previous) => previous || String(active.find((item) => item.kind !== "main")?.id ?? ""));
    }).catch((err) => {
      if (!ignore) setError(explicarError(err));
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [refresh]);

  useEffect(() => {
    let ignore = false;
    if (!sourceId) {
      Promise.resolve().then(() => {
        if (!ignore) { setLots([]); setCount(0); }
      });
      return () => { ignore = true; };
    }
    const timer = setTimeout(() => {
      buscarLotesParaTraslado({ sourceId, q, page }).then((data) => {
        if (ignore) return;
        setLots(data.results ?? []);
        setCount(data.count ?? 0);
        setPages(data.pages ?? 1);
      }).catch((err) => {
        if (!ignore) setError(explicarError(err));
      });
    }, 220);
    return () => { ignore = true; clearTimeout(timer); };
  }, [sourceId, q, page, refresh]);

  const origin = locations.find((item) => String(item.id) === sourceId);
  const destination = locations.find((item) => String(item.id) === destinationId);
  const validQuantity = Number.isSafeInteger(Number(quantity))
    && Number(quantity) > 0
    && Number(quantity) <= Number(selected?.available ?? 0);
  const canSubmit = canManage && selected && validQuantity
    && origin && destination && sourceId !== destinationId && entregaConfirmada && !busy;

  function choose(item) {
    setSelected(item);
    setQuantity("1");
    setNotes("");
    setEntregaConfirmada(false);
    setKey(crypto.randomUUID());
    setError("");
    setMessage("");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => formRef.current?.scrollIntoView({
        behavior: "smooth", block: "start",
      }));
    }
  }

  async function confirmTransfer() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const result = await registrarTrasladoAlmacen({
        stock_entry_id: selected.id,
        source_id: Number(sourceId),
        destination_id: Number(destinationId),
        quantity: Number(quantity),
        notes: notes.trim(),
        entrega_confirmada: entregaConfirmada,
        idempotency_key: key,
      });
      setMessage(result.message ?? "Traslado confirmado.");
      setConfirming(false);
      setSelected(null);
      setRefresh((prev) => prev + 1);
      try {
        await onRefresh();
      } catch {
        setError("El traslado quedó guardado, pero el resumen no se actualizó. Actualiza la página.");
      }
    } catch (err) {
      setConfirming(false);
      setError(explicarError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div>
        <h3 className="text-base font-black text-gray-950">Traslados entre almacenes</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Traslada libros conformes sin crear una venta ni modificar el total de Book Express.
          Se conserva el colegio, la guía y el costo histórico de cada lote.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-900">{message}</p>}
      {!!summary?.unassigned?.lots && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Hay {summary.unassigned.lots} lotes sin ubicación conciliada. Antes de trasladarlos,
          confirma su ubicación física desde la sección Ubicaciones.
        </p>
      )}
      {loading ? <p className="text-sm text-gray-600">Consultando almacenes…</p> : (
        <>
          <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-gray-800">Almacén de origen
              <select value={sourceId} onChange={(event) => {
                setSourceId(event.target.value);
                if (destinationId === event.target.value) setDestinationId("");
                setSelected(null); setEntregaConfirmada(false); setPage(1); setMessage(""); setError("");
              }} className={inputClase}>
                <option value="">Selecciona el origen</option>
                {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-gray-800">Almacén de destino
              <select value={destinationId} onChange={(event) => {
                setDestinationId(event.target.value); setEntregaConfirmada(false); setError(""); setMessage("");
              }} className={inputClase}>
                <option value="">Selecciona el destino</option>
                {locations.filter((item) => String(item.id) !== sourceId).map((item) =>
                  <option key={item.id} value={item.id}>{item.name}</option>
                )}
              </select>
            </label>
          </div>
          <details className="rounded-xl border border-gray-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-black text-gray-950">
              Ver existencias y valor por almacén
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(summary?.locations ?? []).map((loc) => (
                <div key={loc.id} className="min-w-0 rounded-lg bg-gray-50 p-3">
                  <p className="break-words text-sm font-bold text-gray-950">{loc.name}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    Disponibles: <strong>{loc.available}</strong> · Observados: {loc.observed}
                  </p>
                  <p className="mt-1 text-sm font-black tabular-nums text-gray-900">
                    {soles(loc.available_value_reference)}
                  </p>
                  {loc.unvalued_available_units > 0 && (
                    <p className="mt-1 text-xs text-amber-800">
                      Parcial: {loc.unvalued_available_units} unidades sin costo
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Saldos por ubicación. El total global no cambia con los traslados.
            </p>
          </details>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <section aria-label="Libros disponibles para traslado" className="min-w-0 rounded-xl border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-gray-900">1. Seleccionar mercadería</h4>
                <span className="text-xs text-gray-500">{count} lotes</span>
              </div>
              <label className="text-xs font-semibold text-gray-700">Buscar libro, colegio o guía
                <input type="search" value={q} onChange={(event) => {
                  setQ(event.target.value); setPage(1); setSelected(null);
                }} placeholder="Filtrar automáticamente…" className={inputClase}/>
              </label>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto overscroll-contain">
                {lots.map((entry) => (
                  <button type="button" key={entry.id} onClick={() => choose(entry)}
                    aria-pressed={selected?.id === entry.id}
                    className={`w-full min-w-0 rounded-lg border p-3 text-left transition ${selected?.id === entry.id
                      ? "border-red-600 bg-red-50" : "border-gray-200 hover:border-red-300"}`}>
                    <span className="block break-words text-sm font-bold text-gray-950">{entry.product}</span>
                    <span className="mt-1 block text-xs text-gray-600">{entry.editorial} · {entry.school} · Guía {entry.guide}</span>
                    <span className="mt-1 block text-xs font-bold text-gray-900">Disponible: {entry.available} unidades · {soles(entry.unit_cost)} c/u</span>
                  </button>
                ))}
                {lots.length === 0 && <p className="py-5 text-center text-xs text-gray-500">No hay lotes trasladables con estos filtros.</p>}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>Página {page} de {pages}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); setSelected(null); }}
                    className="min-h-10 rounded-lg border px-3 disabled:opacity-40">Anterior</button>
                  <button type="button" disabled={page >= pages} onClick={() => { setPage((p) => p + 1); setSelected(null); }}
                    className="min-h-10 rounded-lg border px-3 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            </section>
            <section ref={formRef} aria-label="Confirmar traslado" className="min-w-0 scroll-mt-24 rounded-xl border border-gray-200 p-3">
              <h4 className="text-sm font-black text-gray-900">2. Registrar traslado</h4>
              {selected ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="break-words text-sm font-bold text-gray-900">{selected.product}</p>
                    <p className="mt-1 text-xs text-gray-600">{selected.school} · Guía {selected.guide}</p>
                    <p className="mt-1 text-xs font-semibold">Disponibles en origen: {selected.available}</p>
                  </div>
                  <label className="block text-xs font-semibold text-gray-800">Cantidad a trasladar
                    <input type="number" min="1" max={selected.available} step="1" value={quantity}
                      onChange={(event) => setQuantity(event.target.value)} className={inputClase}/>
                  </label>
                  <label className="block text-xs font-semibold text-gray-800">Referencia u observación (opcional)
                    <textarea rows="2" maxLength="500" value={notes}
                      onChange={(event) => setNotes(event.target.value)} className={inputClase}
                      placeholder="Ej.: envío a tienda para campaña escolar"/>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-gray-900">
                    <input type="checkbox" checked={entregaConfirmada}
                      onChange={(event) => setEntregaConfirmada(event.target.checked)}
                      className="mt-1 size-4 shrink-0 accent-red-700"/>
                    Confirmo que la mercadería ya fue entregada físicamente al destino.
                    No utilices este registro para envíos todavía en tránsito.
                  </label>
                  <p className="text-xs text-gray-600">El traslado descuenta unidades del origen y suma las mismas al destino. No crea más stock.</p>
                  {!canManage && <p className="text-xs text-amber-800">Tu rol puede consultar, pero no confirmar traslados.</p>}
                  <button type="button" disabled={!canSubmit} onClick={() => setConfirming(true)}
                    className="min-h-11 w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-40">
                    Revisar traslado
                  </button>
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
                  Selecciona un libro del almacén de origen para registrar su traslado.
                </p>
              )}
            </section>
          </div>
          <section className="rounded-xl border border-gray-200 p-3">
            <h4 className="text-sm font-black text-gray-900">Traslados confirmados</h4>
            <p className="mt-1 text-xs text-gray-600">Historial inalterable de los últimos movimientos.</p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {history.length === 0 && <p className="text-xs text-gray-500">Aún no hay traslados registrados.</p>}
              {history.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3 text-xs">
                  <p className="break-words font-bold text-gray-950">{item.product}</p>
                  <p className="mt-1 text-gray-700">{item.source} → {item.destination} · {item.quantity} unidades</p>
                  <p className="mt-1 text-gray-600">Guía {item.guide} · {item.school} · {soles(item.value_reference)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <ConfirmActionDialog open={confirming} eyebrow="Confirmación de almacén"
        title="Confirmar traslado entre ubicaciones"
        description={`Se trasladarán ${quantity} unidades de ${selected?.product ?? ""}. Esta operación quedará registrada y no podrá editarse.`}
        confirmLabel="Confirmar traslado" processing={busy}
        onCancel={() => { if (!busy) setConfirming(false); }}
        onConfirm={confirmTransfer}>
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-900">
          <p><strong>Origen:</strong> {origin?.name ?? "Sin definir"}</p>
          <p><strong>Destino:</strong> {destination?.name ?? "Sin definir"}</p>
          <p><strong>Valor de referencia:</strong> {selected?.unit_cost ? soles(Number(quantity) * Number(selected.unit_cost)) : "Por definir"}</p>
          <p className="mt-2 text-xs text-gray-600">No se registra venta ni factura y el inventario global no cambia.</p>
        </div>
      </ConfirmActionDialog>
    </div>
  );
}
