import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiAlertCircle, FiSearch, FiRefreshCw } from "react-icons/fi";
import { consultarInventarioConsolidado } from "../../api/warehouseApi";

const GRUPOS = [
  { value: "editorial", label: "Editorial", fullLabel: "Por editorial" },
  { value: "colegio", label: "Colegio", fullLabel: "Por colegio de origen" },
  { value: "almacen", label: "Almacén", fullLabel: "Por almacén" },
];

function soles(value) {
  if (value === null || value === undefined || value === "") return "Por definir";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount)
    : "Por definir";
}

function errorText(error) {
  if (!error?.response) return "No pudimos conectarnos. Comprueba tu conexión e inténtalo nuevamente.";
  if (error.response.status === 403) return "No tienes autorización para consultar las existencias.";
  return "No pudimos cargar el inventario consolidado. Intenta actualizar la consulta.";
}

export default function InventoryConsolidatedPanel() {
  const [grupo, setGrupo] = useState("editorial");
  const [buscar, setBuscar] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const criterio = buscar.trim();
      if (criterio !== busquedaAplicada) {
        setCargando(true);
        setBusquedaAplicada(criterio);
        setPagina(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [buscar, busquedaAplicada]);

  useEffect(() => {
    let ignore = false;
    consultarInventarioConsolidado({
      grupo, buscar: busquedaAplicada, pagina,
    }).then((response) => {
      if (ignore) return;
      setDatos(response);
      setError("");
    }).catch((err) => {
      if (!ignore) {
        setError(errorText(err));
        setDatos(null);
      }
    }).finally(() => {
      if (!ignore) setCargando(false);
    });
    return () => { ignore = true; };
  }, [grupo, busquedaAplicada, pagina, version]);

  function cambiarGrupo(next) {
    setCargando(true);
    setPagina(1);
    setGrupo(next);
  }

  function cambiarPagina(next) {
    setCargando(true);
    setPagina(next);
  }

  const resumen = datos?.resumen;
  const registros = datos?.resultados ?? [];
  const etiquetaGrupo = grupo === "editorial"
    ? "Editorial" : grupo === "colegio" ? "Colegio de origen" : "Almacén";

  return (
    <section className="min-w-0 space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
      aria-label="Inventario consolidado por ubicación y procedencia">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-gray-950 sm:text-base">Inventario consolidado</h2>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Todos los almacenes en una consulta, sin duplicar traslados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {grupo === "almacen" && (
            <Link to="/admin/erp/almacen/stock-por-almacen"
              className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 transition-colors hover:border-red-300 hover:text-red-700">
              Ver libros por almacén
            </Link>
          )}
          <button type="button" onClick={() => {
            setCargando(true);
            setVersion((v) => v + 1);
          }} disabled={cargando}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50">
            <FiRefreshCw aria-hidden="true" size={14} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <div aria-label="Agrupar existencias" className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
          {GRUPOS.map((opcion) => (
            <button key={opcion.value} type="button" aria-pressed={grupo === opcion.value}
              title={opcion.fullLabel} onClick={() => cambiarGrupo(opcion.value)}
              className={`min-h-11 min-w-0 rounded-lg px-2 text-xs font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:text-sm ${grupo === opcion.value
                ? "bg-white text-red-700 shadow-sm"
                : "text-gray-700 hover:bg-white/70 hover:text-gray-950"}`}>
              {opcion.label}
            </button>
          ))}
        </div>
        <label className="block min-w-0 lg:w-80">
          <span className="sr-only">Buscar libro, editorial, colegio o guía</span>
          <span className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 focus-within:border-red-700">
            <FiSearch className="shrink-0 text-gray-500" aria-hidden="true" />
            <input type="search" value={buscar} maxLength={100}
              onChange={(event) => setBuscar(event.target.value)}
              placeholder="Buscar libro, editorial, colegio o guía"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm font-normal text-gray-950 outline-none" />
          </span>
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {cargando && <p role="status" className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Consultando existencias…</p>}

      {!cargando && datos && (
        <>
          {busquedaAplicada && (
            <div aria-label="Totales de la búsqueda"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
              <span className="font-bold text-gray-900">Esta búsqueda:</span>
              <span>Disponibles <strong className="tabular-nums text-gray-950">{resumen?.disponible ?? 0}</strong></span>
              <span>Observados <strong className="tabular-nums text-gray-950">{resumen?.observado ?? 0}</strong></span>
              <span>Valor <strong className="tabular-nums text-gray-950">{soles(resumen?.valor_referencial)}</strong></span>
            </div>
          )}
          {Number(resumen?.unidades_sin_costo ?? 0) > 0 && (
            <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
              {resumen.unidades_sin_costo} unidades sin costo registrado. La valorización está pendiente.
            </p>
          )}
          {Number(resumen?.unidades_sin_ubicacion ?? 0) > 0 && (
            <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              <FiAlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
              {resumen.unidades_sin_ubicacion} unidades necesitan verificar su ubicación.
            </p>
          )}
          {grupo === "colegio" && (
            <p className="text-xs leading-5 text-gray-600">
              El colegio identifica el origen del pedido, no una reserva exclusiva de mercadería.
            </p>
          )}
          {registros.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
              No encontramos libros para esta consulta.
            </p>
          ) : (
            <>
              <div className="space-y-2 lg:hidden">
                {registros.map((item) => (
                  <article key={`${String(item.grupo_id)}-${item.grupo_nombre}-${item.producto_id}`}
                    className="rounded-xl border border-gray-200 p-3">
                    <p className="break-words text-xs font-black uppercase tracking-wide text-red-700">
                      {item.grupo_nombre}
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-gray-950">{item.producto}</p>
                    {grupo !== "editorial" && <p className="text-xs text-gray-600">{item.editorial}</p>}
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {[
                        ["Disponibles", item.disponible],
                        ["Observados", item.observado],
                        ["Costo promedio c/u", soles(item.costo_promedio)],
                        ["Valor disponible", soles(item.valor_referencial)],
                      ].map(([name, value]) => (
                        <div key={name} className="min-w-0 rounded-lg bg-gray-50 p-2">
                          <dt className="text-gray-600">{name}</dt>
                          <dd className="mt-1 break-words font-black text-gray-950">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th scope="col" className="p-3">{etiquetaGrupo}</th>
                      <th scope="col" className="p-3">Producto</th>
                      <th scope="col" className="p-3 text-right">Disponibles</th>
                      <th scope="col" className="p-3 text-right">Observados</th>
                      <th scope="col" className="p-3 text-right">Costo prom. c/u</th>
                      <th scope="col" className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registros.map((item) => (
                      <tr key={`${String(item.grupo_id)}-${item.grupo_nombre}-${item.producto_id}`}>
                        <td className="p-3 align-top font-bold text-gray-950">{item.grupo_nombre}</td>
                        <td className="p-3 align-top">
                          <p className="font-bold text-gray-900">{item.producto}</p>
                          {grupo !== "editorial" && <p className="text-gray-500">{item.editorial}</p>}
                        </td>
                        <td className="p-3 text-right tabular-nums">{item.disponible}</td>
                        <td className="p-3 text-right tabular-nums">{item.observado}</td>
                        <td className="p-3 text-right tabular-nums">{soles(item.costo_promedio)}</td>
                        <td className="p-3 text-right font-bold tabular-nums">{soles(item.valor_referencial)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-600">
              {datos.conteo} registros · Página {datos.pagina} de {datos.paginas}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={cargando || pagina <= 1}
                onClick={() => cambiarPagina(pagina - 1)}
                className="min-h-11 rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-700 disabled:opacity-40">
                Anterior
              </button>
              <button type="button" disabled={cargando || pagina >= datos.paginas}
                onClick={() => cambiarPagina(pagina + 1)}
                className="min-h-11 rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-700 disabled:opacity-40">
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
