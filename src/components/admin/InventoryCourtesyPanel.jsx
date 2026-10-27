import { useEffect, useState } from "react";
import { buscarEntradasParaCortesia, registrarCortesiaInventario } from "../../api/warehouseApi";
import ConfirmActionDialog from "./ConfirmActionDialog";

function formatoCosto(valor) {
  if (valor === null || valor === undefined || valor === "") return "Sin costo registrado";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor));
}

function explicarError(err) {
  const data = err?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(" ");
  if (data && typeof data === "object") return Object.values(data).flat().map(String).join(" ");
  return "No se pudo registrar la cortesía. Revisa las cantidades e intenta de nuevo.";
}

export default function InventoryCourtesyPanel({ outflows, canManage, onRefresh }) {
  const [buscar, setBuscar] = useState("");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [candidatas, setCandidatas] = useState([]);
  const [total, setTotal] = useState(0);
  const [paginaSiguiente, setPaginaSiguiente] = useState(false);
  const [cargandoEntradas, setCargandoEntradas] = useState(true);
  const [actualizacion, setActualizacion] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [destinatario, setDestinatario] = useState("");
  const [cargo, setCargo] = useState("Directora o director");
  const [nota, setNota] = useState("");
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => buscarEntradasParaCortesia(consulta, pagina)).then((data) => {
      if (ignore) return;
      const rows = Array.isArray(data) ? data : data.results ?? [];
      setCandidatas(rows);
      setTotal(Array.isArray(data) ? rows.length : data.count ?? rows.length);
      setPaginaSiguiente(Boolean(data.next));
    }).catch((err) => {
      if (!ignore) setError(explicarError(err));
    }).finally(() => {
      if (!ignore) setCargandoEntradas(false);
    });
    return () => { ignore = true; };
  }, [consulta, pagina, actualizacion]);


  function iniciar(entry) {
    setSeleccion(entry);
    setCantidad("1");
    setDestinatario("");
    setCargo("Directora o director");
    setNota("");
    setClave(crypto.randomUUID());
    setConfirmar(false);
    setError("");
    setMensaje("");
  }

  async function registrar() {
    if (!seleccion || procesando) return;
    setProcesando(true);
    setError("");
    try {
      const resultado = await registrarCortesiaInventario({
        stock_entry_id: seleccion.id,
        school_id: seleccion.school_id,
        quantity: Number(cantidad),
        recipient_name: destinatario.trim(),
        recipient_role: cargo.trim(),
        notes: nota.trim(),
        idempotency_key: clave,
      });
      setConfirmar(false);
      setSeleccion(null);
      setMensaje(resultado.message);
      await onRefresh();
      setActualizacion((valor) => valor + 1);
    } catch (err) {
      setConfirmar(false);
      setError(explicarError(err));
    } finally {
      setProcesando(false);
    }
  }

  const cantidadValida = Number.isSafeInteger(Number(cantidad)) &&
    Number(cantidad) > 0 && Number(cantidad) <= Number(seleccion?.net_available ?? 0);

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Salidas por cortesía a colegios</h2>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Se retiran únicamente unidades conformes del mismo colegio. Cada entrega deja trazabilidad de la guía y del destinatario.
          </p>
        </div>
        <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {outflows.length} salidas registradas
        </span>
      </div>
      {mensaje && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{mensaje}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {canManage ? (
        <>
          <form onSubmit={(event) => {
            event.preventDefault();
            setError("");
            setPagina(1);
            setCargandoEntradas(true);
            setConsulta(buscar.trim());
          }} className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-semibold text-gray-700">
              Buscar mercadería de un colegio
              <input value={buscar} onChange={(event) => setBuscar(event.target.value)}
                placeholder="Libro, colegio o número de guía…"
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-red-600 focus:outline-none"/>
            </label>
            <button type="submit" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">Buscar</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr><th className="p-2">Producto</th><th className="p-2">Colegio de origen</th>
                  <th className="p-2">Guía</th><th className="p-2 text-right">Disponible</th>
                  <th className="p-2 text-right">Costo unit.</th><th className="p-2 text-right">Acción</th></tr>
              </thead>
              <tbody>{candidatas.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2 font-semibold">{entry.product}</td><td className="p-2">{entry.school}</td>
                  <td className="p-2">{entry.guide}</td>
                  <td className="p-2 text-right font-bold tabular-nums">{entry.net_available}</td>
                  <td className="p-2 text-right">{formatoCosto(entry.unit_cost)}</td>
                  <td className="p-2 text-right">
                    <button type="button" onClick={() => iniciar(entry)}
                      className="rounded-lg border border-red-200 px-2 py-1 font-semibold text-red-700 transition hover:bg-red-50">
                      Registrar salida
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {!cargandoEntradas && candidatas.length === 0 && <p className="p-4 text-center text-sm text-gray-600">No se encontraron entradas con stock disponible y colegio identificado.</p>}
            {cargandoEntradas && <p role="status" className="p-4 text-center text-sm text-gray-500">Consultando existencias disponibles…</p>}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
            <span>{total} entradas disponibles con colegio identificado · Página {pagina}</span>
            <div className="flex gap-2">
              <button type="button" disabled={pagina <= 1 || cargandoEntradas}
                onClick={() => { setCargandoEntradas(true); setPagina((n) => n - 1); }}
                className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40">Anterior</button>
              <button type="button" disabled={!paginaSiguiente || cargandoEntradas}
                onClick={() => { setCargandoEntradas(true); setPagina((n) => n + 1); }}
                className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40">Siguiente</button>
            </div>
          </div>
          {seleccion && (
            <form onSubmit={(event) => { event.preventDefault(); if (cantidadValida && destinatario.trim() && cargo.trim()) setConfirmar(true); }}
              className="rounded-xl border border-gray-300 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-gray-900">Registrar cortesía · {seleccion.school}</h3>
                <button type="button" onClick={() => setSeleccion(null)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">Cancelar</button>
              </div>
              <p className="mt-1 text-xs text-gray-600">{seleccion.product} · Guía {seleccion.guide} · Disponible {seleccion.net_available}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-gray-700">Cantidad
                  <input type="number" min="1" max={seleccion.net_available} step="1" required value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"/>
                </label>
                <label className="text-xs font-semibold text-gray-700">Nombre de quien recibe
                  <input required maxLength={200} value={destinatario} onChange={(e) => setDestinatario(e.target.value)}
                    placeholder="Nombre completo" className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"/>
                </label>
                <label className="text-xs font-semibold text-gray-700">Cargo
                  <input required maxLength={80} value={cargo} onChange={(e) => setCargo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"/>
                </label>
              </div>
              <label className="mt-3 block text-xs font-semibold text-gray-700">Detalle opcional
                <textarea rows={2} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"/>
              </label>
              <div className="mt-3 flex justify-end">
                <button type="submit" disabled={!cantidadValida || !destinatario.trim() || !cargo.trim() || procesando}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50">
                  Revisar salida
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Puedes consultar el historial. Solo los usuarios autorizados registran cortesías.</p>
      )}

      <div className="border-t border-gray-200 pt-3">
        <h3 className="text-sm font-bold text-gray-900">Historial de cortesías</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr><th className="p-2">Producto</th><th className="p-2">Colegio</th>
                <th className="p-2">Destinatario</th><th className="p-2 text-right">Unid.</th>
                <th className="p-2 text-right">Valor de referencia</th></tr>
            </thead>
            <tbody>{outflows.map((move) => <tr key={move.id} className="border-b border-gray-100">
              <td className="p-2">{move.product}</td><td className="p-2">{move.school}</td>
              <td className="p-2">{move.recipient_name} · {move.recipient_role}</td>
              <td className="p-2 text-right font-bold tabular-nums">{move.quantity}</td>
              <td className="p-2 text-right tabular-nums">{formatoCosto(move.cost_reference)}</td>
            </tr>)}</tbody>
          </table>
          {outflows.length === 0 && <p className="p-4 text-center text-sm text-gray-500">Aún no hay salidas por cortesía.</p>}
        </div>
      </div>
      <ConfirmActionDialog
        open={confirmar && Boolean(seleccion)}
        eyebrow="Confirmación de almacén"
        title="Confirmar salida por cortesía"
        description={`Entregarás ${cantidad} unidades de ${seleccion?.product ?? ""} para ${seleccion?.school ?? ""}. Esta salida reducirá el stock disponible.`}
        confirmLabel="Confirmar salida"
        processing={procesando}
        onCancel={() => setConfirmar(false)}
        onConfirm={registrar}>
        {seleccion && <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p><strong>Guía de origen:</strong> {seleccion.guide}</p>
          <p><strong>Recibe:</strong> {destinatario} · {cargo}</p>
          <p><strong>Costo de referencia:</strong> {seleccion.unit_cost == null ? "Sin costo registrado" : formatoCosto(Number(cantidad) * Number(seleccion.unit_cost))}</p>
          <p className="mt-2 text-xs text-gray-600">No registra una venta ni una deuda a la editorial.</p>
        </div>}
      </ConfirmActionDialog>
    </div>
  );
}
