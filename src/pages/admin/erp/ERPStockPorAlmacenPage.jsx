import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiAlertTriangle, FiArrowLeft, FiBox, FiMapPin, FiTruck } from "react-icons/fi";
import {
  buscarLotesParaTraslado,
  consultarAlertasReposicion,
  consultarResumenUbicaciones,
  listarUbicacionesAlmacen,
} from "../../../api/warehouseApi";

function formatoDinero(valor) {
  if (valor === null || valor === undefined || valor === "") return "Por definir";
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(numero)
    : "Por definir";
}

export default function ERPStockPorAlmacenPage() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [ubicacionId, setUbicacionId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ results: [], count: 0, pages: 1 });
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");
  const [alertas, setAlertas] = useState(null);
  const [alertasCargando, setAlertasCargando] = useState(false);
  const [alertasError, setAlertasError] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([listarUbicacionesAlmacen(), consultarResumenUbicaciones()])
      .then(([locations, summary]) => {
        if (ignore) return;
        const items = Array.isArray(locations) ? locations : locations?.results ?? [];
        setUbicaciones(items);
        setResumen(summary);
        setUbicacionId((actual) => actual || String(
          items.find((item) => item.is_active && item.kind === "main")?.id
          ?? items.find((item) => item.is_active)?.id
          ?? ""
        ));
      })
      .catch(() => {
        if (!ignore) setError("No pudimos consultar los almacenes. Actualiza la página para intentarlo de nuevo.");
      })
      .finally(() => { if (!ignore) setCargando(false); });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!ubicacionId) return undefined;
    const timer = setTimeout(() => {
      setConsultando(true);
      buscarLotesParaTraslado({ sourceId: ubicacionId, q: busqueda.trim(), page: pagina })
        .then((data) => {
          if (!ignore) {
            setDatos({ results: data?.results ?? [], count: data?.count ?? 0, pages: data?.pages ?? 1 });
            setError("");
          }
        })
        .catch(() => {
          if (!ignore) {
            setDatos({ results: [], count: 0, pages: 1 });
            setError("No pudimos consultar los libros de este almacén. Comprueba la conexión e inténtalo de nuevo.");
          }
        })
        .finally(() => { if (!ignore) setConsultando(false); });
    }, busqueda.trim() ? 300 : 0);
    return () => { ignore = true; clearTimeout(timer); };
  }, [ubicacionId, busqueda, pagina]);

  useEffect(() => {
    let ignore = false;
    if (!ubicacionId) return undefined;
    const timer = setTimeout(() => {
      setAlertasCargando(true);
      setAlertas(null);
      setAlertasError("");
      consultarAlertasReposicion(ubicacionId)
        .then((response) => {
          if (!ignore) setAlertas(response);
        })
        .catch(() => {
          if (!ignore) setAlertasError(
            "No pudimos verificar las necesidades pendientes de este almacén."
          );
        })
        .finally(() => {
          if (!ignore) setAlertasCargando(false);
        });
    }, 0);
    return () => { ignore = true; clearTimeout(timer); };
  }, [ubicacionId]);

  const ubicacion = ubicaciones.find((item) => String(item.id) === ubicacionId);
  const saldo = (resumen?.locations ?? []).find((item) => String(item.id) === ubicacionId);
  const sinUbicacion = resumen?.unassigned?.lots ?? 0;
  const tieneReserva = (saldo?.reserved ?? 0) > 0;
  const libreParaTraslado = saldo?.free_to_transfer ?? 0;
  const sinLibresPorReserva = !busqueda.trim() && (saldo?.available ?? 0) > 0
    && libreParaTraslado === 0 && tieneReserva;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP / Almacén / Inventario</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
              <FiBox aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Existencias por almacén</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Consulta qué libros están disponibles en cada lugar. Los traslados cambian
                el saldo de origen y destino, pero no el inventario total.
              </p>
            </div>
          </div>
          <Link to="/admin/erp/almacen/inventario"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:border-red-300 hover:text-red-700">
            <FiArrowLeft aria-hidden="true" /> Inventario general
          </Link>
        </div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        {cargando ? (
          <p role="status" className="text-sm text-gray-600">Consultando almacenes…</p>
        ) : ubicaciones.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-6 text-center">
            <FiMapPin className="mx-auto text-gray-600" aria-hidden="true" size={24} />
            <h2 className="mt-2 text-base font-black text-gray-950">Todavía no hay almacenes registrados</h2>
            <p className="mt-2 text-sm text-gray-600">Registra primero el almacén principal para organizar las existencias.</p>
            <Link to="/admin/erp/almacen/ubicaciones" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white">Ver ubicaciones</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold text-gray-800">
                Selecciona el almacén
                <select value={ubicacionId} onChange={(e) => { setUbicacionId(e.target.value); setPagina(1); }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-600 focus:outline-none">
                  {[
                    { kind: "main", label: "Almacén principal" },
                    { kind: "store", label: "Tiendas" },
                    { kind: "fair", label: "Ferias y puntos temporales" },
                    { kind: "consignment", label: "Consignaciones" },
                    { kind: "other", label: "Otros depósitos" },
                  ].map(({ kind, label }) => {
                    const locations = ubicaciones.filter((item) => item.is_active && item.kind === kind);
                    return locations.length > 0 ? (
                      <optgroup key={kind} label={label}>
                        {locations.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </optgroup>
                    ) : null;
                  })}
                </select>
              </label>
              <label className="block text-sm font-bold text-gray-800">
                Buscar libro, editorial, colegio o guía
                <input type="search" value={busqueda} maxLength={100}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  placeholder="Escribe para filtrar los libros"
                  className="mt-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-600 focus:outline-none" />
              </label>
            </div>
            {ubicacion?.kind === "fair" && (
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-950">Custodia de feria: {ubicacion.name}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Cada feria conserva su propio saldo, responsable y trazabilidad. Esta
                    agrupación es visual: no transfiere libros al depósito llamado
                    «Almacén Feria» ni mezcla existencias de colegios diferentes.
                  </p>
                </div>
                <Link to="/admin/erp/almacen/ubicaciones"
                  className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 hover:border-red-600">
                  Gestionar ferias
                </Link>
              </div>
            )}
            {ubicacion && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Existencias físicas conformes</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-gray-950">{saldo?.available ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Reservadas para entregas</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-gray-950">{saldo?.reserved ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Libres para traslado</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-gray-950">{libreParaTraslado}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Unidades observadas</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-gray-950">{saldo?.observed ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Valor disponible referencial</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-gray-950">{formatoDinero(saldo?.available_value_reference)}</p>
                  {(saldo?.unvalued_available_units ?? 0) > 0 && (
                    <p className="mt-1 text-xs text-amber-800">{saldo.unvalued_available_units} unidades sin costo registrado.</p>
                  )}
                </div>
              </div>
            )}
            {alertasCargando && (
              <p role="status" className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                Comprobando necesidades de las entregas pendientes…
              </p>
            )}
            {alertasError && (
              <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {alertasError} El inventario sigue disponible para consulta.
              </p>
            )}
            {alertas && alertas.products_with_shortage > 0 && (
              <section aria-labelledby="alerta-reposicion" className="mt-4 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                      <FiAlertTriangle aria-hidden="true" size={20} />
                    </span>
                    <div>
                      <h2 id="alerta-reposicion" className="text-base font-black text-amber-950">
                        Faltan libros para entregas planificadas
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-amber-900">
                        {alertas.missing_units} unidades por cubrir en {alertas.products_with_shortage}
                        {" "}{alertas.products_with_shortage === 1 ? "producto" : "productos"}.
                        Se compararon las cantidades por preparar con el stock libre de este almacén.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-900">
                        No es una orden de compra. Revisa primero traslados disponibles
                        en otros almacenes y los pedidos a editoriales existentes.
                      </p>
                    </div>
                  </div>
                  <Link to="/admin/erp/compras/pedidos"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">
                    <FiTruck aria-hidden="true" /> Revisar pedidos
                  </Link>
                </div>
                <div className="divide-y divide-amber-200 border-t border-amber-200 bg-white">
                  {alertas.results.slice(0, 5).map((row) => (
                    <div key={row.product_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-bold text-gray-950">{row.product}</p>
                        <p className="mt-1 text-xs text-gray-600">
                          {row.editorial} · {row.operations.length} {row.operations.length === 1 ? "entrega" : "entregas"} por preparar
                        </p>
                        <p className="mt-1 text-xs text-gray-700">
                          Colegios: {[...new Set(row.operations.map((item) => item.school))].slice(0, 3).join(", ")}
                          {new Set(row.operations.map((item) => item.school)).size > 3 ? " y otros" : ""}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-700">
                        <p>Requeridas: <strong>{row.required}</strong> · Libres: <strong>{row.free}</strong></p>
                        <p className="mt-1 font-black text-red-700">Faltan {row.shortage}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {alertas.products_with_shortage > 5 && (
                  <p className="border-t border-amber-200 px-4 py-3 text-xs text-amber-900">
                    Hay más productos con faltantes. Revisa las distribuciones y pedidos antes de solicitar.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
                  <Link to="/admin/erp/almacen/distribuciones"
                    className="inline-flex min-h-10 items-center rounded-lg border border-amber-400 bg-white px-3 text-xs font-bold text-amber-950 hover:border-amber-600">
                    Revisar entregas pendientes
                  </Link>
                  <Link to="/admin/erp/almacen/solicitudes"
                    className="inline-flex min-h-10 items-center rounded-lg border border-amber-400 bg-white px-3 text-xs font-bold text-amber-950 hover:border-amber-600">
                    Solicitar traslado interno
                  </Link>
                </div>
              </section>
            )}
            {alertas && alertas.products_with_shortage === 0 && (
              <p role="status" className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                Las entregas por preparar no presentan faltantes frente al saldo libre
                de esta ubicación. Esto no significa que exista cobertura para todas
                las adopciones futuras.
              </p>
            )}
            {sinUbicacion > 0 && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                Hay {sinUbicacion} lotes sin ubicación verificada. Se deben revisar físicamente desde Ubicaciones antes de incluirlos en el saldo de un almacén.
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-black text-gray-950">Lotes libres para traslado</h2>
              <span className="text-xs text-gray-600">{datos.count} lotes</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              El detalle muestra lotes con unidades conformes libres, descontando las
              reservas para entregas en preparación. Los lotes reservados siguen en
              existencias físicas y no pueden trasladarse dos veces. Las unidades
              observadas se incluyen solo en el resumen.
              El costo histórico corresponde a la recepción de ese lote; no equivale a la deuda pendiente con la editorial.
            </p>
            {consultando ? (
              <p role="status" className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Consultando libros…</p>
            ) : datos.results.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left text-sm text-gray-600">
                {busqueda
                  ? "No encontramos lotes libres que coincidan con esta búsqueda."
                  : sinLibresPorReserva
                    ? "Este almacén tiene libros, pero todos están reservados para entregas en preparación. Revisa Distribuciones para gestionar las reservas; no es un almacén vacío."
                    : (saldo?.available ?? 0) > 0 && libreParaTraslado > 0
                      ? "El resumen indica saldo libre, pero no encontramos lotes trasladables. Revisa la conciliación de ubicaciones y los movimientos antes de operar."
                      : "No hay lotes conformes libres para traslado en esta ubicación."}
              </p>
            ) : (
              <>
                <div className="mt-3 grid gap-2 md:hidden">
                  {datos.results.map((item) => (
                    <article key={item.id} className="rounded-xl border border-gray-200 p-3">
                      <p className="break-words text-sm font-black text-gray-950">{item.product}</p>
                      <p className="mt-1 text-xs text-gray-600">{item.editorial} · Guía {item.guide}</p>
                      <p className="mt-1 text-xs text-gray-600">Colegio: {item.school || "No especificado"}</p>
                      <p className="mt-2 text-sm font-bold text-gray-950">Disponibles: {item.available}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2 text-xs">
                        <div><dt className="text-gray-600">Costo histórico c/u</dt>
                          <dd className="mt-1 font-bold text-gray-950">{formatoDinero(item.unit_cost)}</dd>
                        </div>
                        <div><dt className="text-gray-600">Valor disponible</dt>
                          <dd className="mt-1 font-bold text-gray-950">{formatoDinero(item.value_reference)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
                <div className="mt-3 hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
                  <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-600">
                      <tr><th className="p-3">Libro</th><th className="p-3">Editorial</th><th className="p-3">Guía</th><th className="p-3">Colegio</th><th className="p-3 text-right">Disponible</th><th className="p-3 text-right">Costo histórico c/u</th><th className="p-3 text-right">Valor disponible</th></tr>
                    </thead>
                    <tbody>{datos.results.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="p-3 font-semibold text-gray-950">{item.product}</td>
                        <td className="p-3">{item.editorial}</td>
                        <td className="p-3">{item.guide}</td>
                        <td className="p-3">{item.school || "—"}</td>
                        <td className="p-3 text-right font-black tabular-nums">{item.available}</td>
                        <td className="p-3 text-right tabular-nums">{formatoDinero(item.unit_cost)}</td>
                        <td className="p-3 text-right font-bold tabular-nums">{formatoDinero(item.value_reference)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-600">Página {pagina} de {datos.pages}</p>
              <div className="flex gap-2">
                <button type="button" disabled={pagina <= 1 || consultando}
                  onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
                  className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700 disabled:opacity-40">Anterior</button>
                <button type="button" disabled={pagina >= datos.pages || consultando}
                  onClick={() => setPagina((valor) => valor + 1)}
                  className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
