import { useEffect, useState } from "react";
import {
  conciliarUbicacion,
  consultarResumenUbicaciones,
  listarPendientesUbicacion,
} from "../../api/warehouseApi";

function errorLegible(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data)) return data.join(" ");
  if (Array.isArray(data?.non_field_errors)) return data.non_field_errors.join(" ");
  if (data && typeof data === "object") {
    return Object.values(data).flat().map(String).join(" ");
  }
  return "No fue posible completar la operación. Vuelve a intentarlo.";
}

function numero(value) {
  return Number(value || 0).toLocaleString("es-PE");
}

export default function WarehouseReconciliationPanel({ ubicaciones }) {
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState(String(
    ubicaciones.find((item) => item.kind === "main" && item.is_active)?.id ?? ""
  ));
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!abierto) return undefined;
    let ignore = false;
    Promise.resolve().then(() => {
      return Promise.all([
        listarPendientesUbicacion({ q: busqueda.trim(), page: pagina }),
        consultarResumenUbicaciones(),
      ]);
    }).then(([pendientes, stock]) => {
      if (ignore) return;
      setDatos(pendientes);
      setResumen(stock);
      setCargando(false);
    }).catch((err) => {
      if (ignore) return;
      setError(errorLegible(err));
      setCargando(false);
    });
    return () => { ignore = true; };
  }, [abierto, busqueda, pagina, version]);

  function abrir() {
    setCargando(true);
    setError("");
    setAbierto(true);
  }

  function buscar(value) {
    setBusqueda(value);
    setPagina(1);
    setSeleccionados([]);
    setError("");
  }

  function cambiarPagina(value) {
    setPagina(value);
    setSeleccionados([]);
    setError("");
    setCargando(true);
  }

  function marcar(id, checked) {
    setSeleccionados((anterior) => checked
      ? [...anterior, id]
      : anterior.filter((item) => item !== id));
  }

  async function guardar() {
    if (guardando || !destino || seleccionados.length === 0) return;
    setGuardando(true);
    setError("");
    try {
      const result = await conciliarUbicacion(Number(destino), seleccionados);
      setMensaje(`${result.assigned} lote(s) conciliados. No se agregaron libros al inventario.`);
      setSeleccionados([]);
      setConfirmando(false);
      setCargando(true);
      setVersion((actual) => actual + 1);
    } catch (err) {
      setError(errorLegible(err));
      setConfirmando(false);
    } finally {
      setGuardando(false);
    }
  }

  const activeLocations = ubicaciones.filter((item) => item.is_active);
  const destinationName = activeLocations.find((item) => String(item.id) === destino)?.name ?? "";
  const rows = datos?.results ?? [];
  const hasRows = rows.length > 0;
  const allSelected = hasRows && rows.every((item) => seleccionados.includes(item.id));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-gray-950">Conciliación inicial de existencias</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-gray-600">
            Identifica en qué ubicación están los libros ya ingresados.
            No genera entradas adicionales ni cambia las cantidades de Inventario.
          </p>
        </div>
        <button type="button"
          onClick={() => {
            if (abierto) setAbierto(false);
            else abrir();
          }}
          className="min-h-11 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
          {abierto ? "Ocultar conciliación" : "Revisar lotes pendientes"}
        </button>
      </div>

      {abierto && (
        <div className="mt-4 space-y-4">
          {resumen && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Conformes sin ubicación</p>
                <p className="mt-1 text-xl font-black text-gray-950">{numero(resumen.unassigned.available)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Observados sin ubicación</p>
                <p className="mt-1 text-xl font-black text-gray-950">{numero(resumen.unassigned.observed)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Lotes por verificar</p>
                <p className="mt-1 text-xl font-black text-gray-950">{numero(resumen.unassigned.lots)}</p>
              </div>
            </div>
          )}
          {resumen?.locations?.some((item) => item.lots > 0) && (
            <div className="space-y-1 rounded-lg border border-gray-200 p-3 text-xs text-gray-700">
              <p className="font-bold text-gray-900">Ubicaciones ya identificadas</p>
              {resumen.locations.filter((item) => item.lots > 0).map((item) => (
                <p key={item.id}>{item.name}: {numero(item.available)} conformes y {numero(item.observed)} observados.</p>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-gray-700">
              Destino físico verificado
              <select value={destino}
                onChange={(event) => {
                  setDestino(event.target.value);
                  setSeleccionados([]);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">Seleccionar ubicación</option>
                {activeLocations.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Buscar libro, colegio o guía
              <input value={busqueda} onChange={(event) => buscar(event.target.value)}
                placeholder="Filtrar lotes..."
                className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>

          <p className="text-xs leading-5 text-amber-800">
            Selecciona únicamente lotes completos cuya mercadería física verificaste en el destino.
            Si parte de un mismo lote ya está en otra ubicación, no lo asignes todavía:
            necesita una conciliación dividida antes del traslado.
          </p>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {mensaje && <p role="status" className="rounded-lg bg-gray-50 p-3 text-sm font-semibold text-gray-800">{mensaje}</p>}
          {cargando && <p role="status" className="text-sm text-gray-600">Consultando existencias…</p>}

          {!cargando && datos && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-600">
                  {numero(datos.count)} lotes pendientes · Página {pagina} de {datos.pages}
                </p>
                {hasRows && (
                  <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-gray-800">
                    <input type="checkbox" checked={allSelected}
                      onChange={(event) => setSeleccionados(event.target.checked ? rows.map((item) => item.id) : [])} />
                    Seleccionar los lotes de esta página
                  </label>
                )}
              </div>
              {hasRows ? (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {rows.map((item) => (
                    <label key={item.id}
                      className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:border-red-200">
                      <input type="checkbox" checked={seleccionados.includes(item.id)}
                        onChange={(event) => marcar(item.id, event.target.checked)}
                        className="mt-1" />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-bold text-gray-900">{item.product}</span>
                        <span className="mt-1 block break-words text-xs text-gray-600">
                          {item.school} · {item.editorial} · Guía {item.guide}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-gray-800">
                          {numero(item.available)} conformes · {numero(item.observed)} observados
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No hay lotes pendientes para esta búsqueda.</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button type="button" disabled={pagina <= 1} onClick={() => cambiarPagina(pagina - 1)}
                    className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-40">Anterior</button>
                  <button type="button" disabled={pagina >= datos.pages} onClick={() => cambiarPagina(pagina + 1)}
                    className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-40">Siguiente</button>
                </div>
                <button type="button" disabled={!destino || !seleccionados.length}
                  onClick={() => setConfirmando(true)}
                  className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-40">
                  Revisar asignación ({seleccionados.length})
                </button>
              </div>
            </>
          )}

          {confirmando && (
            <div role="dialog" aria-modal="true" aria-labelledby="confirmar-ubicacion"
              className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4">
              <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
                <h3 id="confirmar-ubicacion" className="text-lg font-black text-gray-950">
                  Confirmar ubicación física
                </h3>
                <p className="text-sm leading-6 text-gray-700">
                  Registrarás {seleccionados.length} lote(s) completos en <strong>{destinationName}</strong>.
                  Confirma únicamente si verificaste físicamente sus cantidades.
                  Esta acción deja registro del responsable y no se puede reasignar desde esta pantalla.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={guardando}
                    onClick={() => setConfirmando(false)}
                    className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold">
                    Revisar nuevamente
                  </button>
                  <button type="button" disabled={guardando} onClick={guardar}
                    className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                    {guardando ? "Registrando…" : "Confirmar lotes verificados"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
