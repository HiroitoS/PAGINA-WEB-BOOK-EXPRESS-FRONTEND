import { useEffect, useRef, useState } from "react";
import { buscarEntradasParaCortesia, registrarCortesiaInventario } from "../../api/warehouseApi";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { CRM_POSITION_OPTIONS } from "../../utils/crmPositionOptions";

function formatoCosto(valor) {
  if (valor === null || valor === undefined || valor === "") return "Sin costo registrado";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor));
}

function explicarError(err) {
  const data = err?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(" ");
  if (data && typeof data === "object") return Object.values(data).flat().map(String).join(" ");
  return "No se pudo completar la operación. Revisa los datos e intenta de nuevo.";
}

export default function InventoryCourtesyPanel({ outflows, canManage, onRefresh }) {
  const formularioRef = useRef(null);
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(1);
  const [candidatas, setCandidatas] = useState([]);
  const [total, setTotal] = useState(0);
  const [paginaSiguiente, setPaginaSiguiente] = useState(false);
  const [cargandoEntradas, setCargandoEntradas] = useState(true);
  const [actualizacion, setActualizacion] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [destinatario, setDestinatario] = useState("");
  const [cargo, setCargo] = useState("");
  const [cargoOtro, setCargoOtro] = useState("");
  const [nota, setNota] = useState("");
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let ignore = false;
    // Búsqueda automática con debounce; el servidor mantiene la paginación.
    const timer = setTimeout(() => {
      setCargandoEntradas(true);
      buscarEntradasParaCortesia(buscar.trim(), pagina).then((data) => {
        if (ignore) return;
        setError("");
        const rows = Array.isArray(data) ? data : data.results ?? [];
        setCandidatas(rows);
        setTotal(Array.isArray(data) ? rows.length : data.count ?? rows.length);
        setPaginaSiguiente(Boolean(data.next));
      }).catch((err) => {
        if (!ignore) {
          setCandidatas([]);
          setTotal(0);
          setPaginaSiguiente(false);
          setError(explicarError(err));
        }
      }).finally(() => {
        if (!ignore) setCargandoEntradas(false);
      });
    }, buscar.trim() ? 300 : 0);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [buscar, pagina, actualizacion]);


  function iniciar(entry) {
    setSeleccion(entry);
    setCantidad("1");
    setDestinatario("");
    setCargo("");
    setCargoOtro("");
    setNota("");
    setClave(crypto.randomUUID());
    setConfirmar(false);
    setError("");
    setMensaje("");
    // En móvil el formulario está después de la lista: acercarlo tras elegir lote.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  const cargoFinal = cargo === "Otro" ? cargoOtro.trim() : cargo;

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
        recipient_role: cargoFinal,
        notes: nota.trim(),
        idempotency_key: clave,
      });
      setConfirmar(false);
      setSeleccion(null);
      setMensaje(resultado.message || "La salida se registró correctamente.");
      setActualizacion((valor) => valor + 1);
      try {
        await onRefresh();
      } catch {
        setError("La salida se registró, pero no se actualizó el resumen. Actualiza la página para ver el saldo.");
      }
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
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Salidas por cortesía a colegios</h2>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Se retiran únicamente unidades conformes del mismo colegio. Cada entrega deja trazabilidad de la guía y del destinatario.
          </p>
        </div>
        <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {outflows.length} cortesías recientes
        </span>
      </div>
      {mensaje && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-800">{mensaje}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {canManage ? (
        <>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <section aria-labelledby="cortesia-lotes" className="min-w-0 rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 id="cortesia-lotes" className="text-sm font-black text-gray-900">1. Seleccionar mercadería</h3>
                  <p className="mt-1 text-xs text-gray-600">Busca libros asignados al mismo colegio que recibirá la cortesía.</p>
                </div>
                <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {total} lotes
                </span>
              </div>
              <div role="search" className="mb-2 flex items-end gap-2">
                <label className="min-w-0 flex-1 text-xs font-semibold text-gray-700">
                  Buscar libro, colegio o guía
                  <input
                    type="search"
                    aria-label="Buscar libro, colegio o guía"
                    value={buscar}
                    onChange={(event) => {
                      setBuscar(event.target.value);
                      setPagina(1);
                      setCargandoEntradas(true);
                    }}
                    placeholder="Escribe para filtrar automáticamente…"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm focus:border-red-600 focus:outline-none"
                  />
                </label>
                {buscar && (
                  <button type="button" onClick={() => {
                    setBuscar("");
                    setPagina(1);
                    setCargandoEntradas(true);
                  }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="max-h-44 space-y-1.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-72" aria-busy={cargandoEntradas}>
                {!cargandoEntradas && candidatas.map((entry) => (
                  <button type="button" key={entry.id} onClick={() => iniciar(entry)}
                    aria-pressed={seleccion?.id === entry.id}
                    className={seleccion?.id === entry.id
                      ? "w-full rounded-lg border border-red-600 bg-red-50 p-2.5 text-left transition-colors"
                      : "w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left transition-colors hover:border-gray-400 hover:bg-gray-50"}>
                    <span className="block text-xs font-bold leading-5 text-gray-900">{entry.product}</span>
                    <span className="mt-1 block text-xs text-gray-600">{entry.school} · Guía {entry.guide}</span>
                    <span className="mt-1 flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-gray-900">Disponible: {entry.net_available}</span>
                      <span className="text-xs text-gray-500">Costo: {formatoCosto(entry.unit_cost)}</span>
                    </span>
                  </button>
                ))}
                {!cargandoEntradas && candidatas.length === 0 && (
                  <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
                    No se encontraron libros disponibles con colegio identificado.
                  </p>
                )}
                {cargandoEntradas && (
                  <p role="status" className="p-4 text-center text-sm text-gray-600">Buscando mercadería…</p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
                <span>{total} lotes disponibles · Página {pagina}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={pagina <= 1 || cargandoEntradas}
                    onClick={() => { setCargandoEntradas(true); setPagina((n) => n - 1); }}
                    className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40">Anterior</button>
                  <button type="button" disabled={!paginaSiguiente || cargandoEntradas}
                    onClick={() => { setCargandoEntradas(true); setPagina((n) => n + 1); }}
                    className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            </section>
            <section ref={formularioRef} aria-labelledby="cortesia-formulario" className="min-w-0 scroll-mt-24 rounded-xl border border-gray-200 bg-gray-50 p-3 lg:sticky lg:top-4">
              <h3 id="cortesia-formulario" className="text-sm font-black text-gray-900">2. Registrar salida por cortesía</h3>
              {!seleccion ? (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center">
                  <p className="text-sm font-semibold text-gray-800">Selecciona un libro de la izquierda</p>
                  <p className="mt-2 text-xs leading-5 text-gray-600">
                    Aquí aparecerán la cantidad, el destinatario y la confirmación de entrega.
                  </p>
                </div>
              ) : (
                <form onSubmit={(event) => {
                  event.preventDefault();
                  if (cantidadValida && destinatario.trim() && cargoFinal) setConfirmar(true);
                }}>
                  <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black text-gray-900">{seleccion.school}</p>
                      <button type="button" onClick={() => setSeleccion(null)}
                        className="text-xs font-bold text-red-700 hover:underline">Cambiar libro</button>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-700">{seleccion.product}</p>
                    <p className="mt-1 text-xs text-gray-600">Guía {seleccion.guide} · {seleccion.net_available} unidades disponibles</p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-gray-700">Cantidad a entregar
                      <input type="number" min="1" max={seleccion.net_available} step="1" required
                        value={cantidad} onChange={(event) => setCantidad(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" />
                    </label>
                    <label className="text-xs font-semibold text-gray-700">Cargo de quien recibe
                      <select required value={cargo} onChange={(event) => {
                        setCargo(event.target.value);
                        setCargoOtro("");
                      }} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm">
                        <option value="">Seleccionar cargo</option>
                        {CRM_POSITION_OPTIONS.map((opcion) => (
                          <option key={opcion} value={opcion}>{opcion}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {cargo === "Otro" && (
                    <label className="mt-3 block text-xs font-semibold text-gray-700">
                      Especificar cargo
                      <input type="text" required maxLength={80} value={cargoOtro}
                        onChange={(event) => setCargoOtro(event.target.value)}
                        placeholder="Cargo de quien recibe"
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" />
                    </label>
                  )}
                  <label className="mt-3 block text-xs font-semibold text-gray-700">
                    Nombre completo de quien recibe
                    <input required maxLength={200} value={destinatario}
                      onChange={(event) => setDestinatario(event.target.value)}
                      placeholder="Nombre del destinatario"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" />
                  </label>
                  <label className="mt-3 block text-xs font-semibold text-gray-700">
                    Observación (opcional)
                    <textarea rows={2} maxLength={500} value={nota}
                      onChange={(event) => setNota(event.target.value)}
                      placeholder="Referencia de entrega, autorización u otro detalle"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" />
                  </label>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="max-w-xs text-xs leading-5 text-gray-600">Se descontará únicamente stock del colegio seleccionado.</p>
                    <button type="submit" disabled={!cantidadValida || !destinatario.trim() || !cargoFinal || procesando}
                      className="shrink-0 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50">
                      Revisar salida
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </>
      ) : (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Puedes consultar el historial. Solo los usuarios autorizados registran cortesías.</p>
      )}

      <div className="border-t border-gray-200 pt-3">
        <h3 className="text-sm font-bold text-gray-900">Salidas registradas · Cortesías</h3>
        <div className="mt-2 max-h-64 overflow-auto overscroll-contain">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr><th className="p-2">Fecha</th><th className="p-2">Guía</th><th className="p-2">Producto</th><th className="p-2">Colegio</th>
                <th className="p-2">Destinatario</th><th className="p-2 text-right">Unid.</th>
                <th className="p-2 text-right">Valor de referencia</th></tr>
            </thead>
            <tbody>{outflows.map((move) => <tr key={move.id} className="border-b border-gray-100">
              <td className="p-2">{new Intl.DateTimeFormat("es-PE", { dateStyle: "short" }).format(new Date(move.created_at))}</td>
              <td className="p-2">{move.guide}</td>
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
          <p><strong>Recibe:</strong> {destinatario} · {cargoFinal}</p>
          <p><strong>Costo unitario de referencia:</strong> {formatoCosto(seleccion.unit_cost)}</p>
          <p className="mt-1 text-xs text-gray-600">El valor total se registra en el backend y aparecerá en el historial.</p>
          <p className="mt-2 text-xs text-gray-600">No registra una venta ni una deuda a la editorial.</p>
        </div>}
      </ConfirmActionDialog>
    </div>
  );
}
