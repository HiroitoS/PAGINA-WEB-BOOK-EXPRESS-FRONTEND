import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FiBox, FiPackage, FiGift, FiTruck, FiCornerUpLeft, FiSliders } from "react-icons/fi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import InventoryCourtesyPanel from "../../../components/admin/InventoryCourtesyPanel";
import { consultarExistencias, consultarResumenInventario, consultarValorizacionPorEditorial, listarEntradasInventario, listarSalidasInventario } from "../../../api/warehouseApi";

function mensajeError(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(" ");
  if (data && typeof data === "object") return Object.values(data).flat().map(String).join(" ");
  return "No se pudo consultar el inventario. Intenta actualizar la página.";
}

function dinero(valor) {
  if (valor === null || valor === undefined || valor === "") return "Por definir";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor));
}

// Módulos futuros visibles como información, nunca como acciones sin API.
const seccionesAlmacen = [
  { nombre: "Existencias", descripcion: "Stock disponible", icono: FiBox, vista: "existencias" },
  { nombre: "Entradas", descripcion: "Recepciones registradas", icono: FiPackage, vista: "movimientos" },
  { nombre: "Cortesías", descripcion: "Entregas sin costo", icono: FiGift, vista: "salidas" },
  { nombre: "Traslados", descripcion: "P-08 · En preparación", icono: FiTruck },
  { nombre: "Devoluciones", descripcion: "Pendiente", icono: FiCornerUpLeft },
  { nombre: "Ajustes", descripcion: "Pendiente", icono: FiSliders },
];

export default function ERPInventarioPage() {
  const { user } = useAuth();
  const puedeVerCatalogo = userHasPermission(user, ["catalog.view_catalog"]);
  const puedeRegistrarCortesia = userHasPermission(user, ["warehouse.manage_stock_courtesies"]);
  const [existencias, setExistencias] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [valorPorEditorial, setValorPorEditorial] = useState([]);
  const [errorValorizacion, setErrorValorizacion] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [detalleId, setDetalleId] = useState(null);
  const [resumen, setResumen] = useState(null);
  const busqueda = searchParams.get("buscar") ?? "";
  const editorial = searchParams.get("editorial") ?? "";
  const vistaSolicitada = searchParams.get("vista");
  const pestana = vistaSolicitada === "cortesias"
    ? "salidas"
    : ["movimientos", "salidas"].includes(vistaSolicitada) ? vistaSolicitada : "existencias";
  const retornoInventario = `/admin/erp/almacen/inventario${searchParams.toString() ? `?${searchParams}` : ""}`;

  function cambiarFiltro(clave, valor) {
    setSearchParams((anterior) => {
      const siguiente = new URLSearchParams(anterior);
      if (valor) siguiente.set(clave, valor);
      else siguiente.delete(clave);
      return siguiente;
    }, { replace: true });
  }
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (ignorar) => {
    const [stock, movimientos, summary, outflows, editorialReport] = await Promise.all([
      consultarExistencias(), listarEntradasInventario(), consultarResumenInventario(),
      listarSalidasInventario(),
      consultarValorizacionPorEditorial().then(
        (data) => ({ data, error: "" }),
        () => ({ data: [], error: "No se pudo cargar el desglose por editorial. Actualiza la página para reintentarlo." }),
      ),
    ]);
    if (ignorar()) return;
    setExistencias(stock);
    setEntradas(Array.isArray(movimientos) ? movimientos : movimientos.results ?? []);
    setSalidas(Array.isArray(outflows) ? outflows : outflows.results ?? []);
    setResumen(summary);
    setValorPorEditorial(Array.isArray(editorialReport.data) ? editorialReport.data : []);
    setErrorValorizacion(editorialReport.error);
  }, []);

  useEffect(() => {
    let ignore = false;

    // Diferir la consulta evita actualizar estado de forma síncrona
    // durante el efecto. La bandera impide actualizar un componente desmontado.
    Promise.resolve().then(() => cargar(() => ignore)).catch((err) => {
      if (!ignore) setError(mensajeError(err));
    }).finally(() => {
      if (!ignore) setCargando(false);
    });

    return () => { ignore = true; };
  }, [cargar]);

  const editoriales = useMemo(() =>
    [...new Set(existencias.map((item) => item.editorial))].sort((a, b) => a.localeCompare(b, "es")),
  [existencias]);

  const visibles = useMemo(() => existencias.filter((item) =>
    (!editorial || item.editorial === editorial) &&
    `${item.product} ${item.editorial}`.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es"))
  ), [existencias, editorial, busqueda]);

  const tarjetas = [
    { titulo: "Existencia física", valor: resumen?.physical ?? 0, ayuda: "Incluye observados" },
    { titulo: "Conformes disponibles", valor: resumen?.conforming ?? 0, ayuda: "Descontadas las cortesías" },
    { titulo: "Observados", valor: resumen?.nonconforming ?? 0, ayuda: "No disponibles para venta" },
    { titulo: "Adicionales recibidos", valor: resumen?.extra_included ?? 0, ayuda: "Histórico: incluidos en entradas" },
  ];

  return (
    <main className="min-w-0 space-y-3 p-3 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
          <h1 className="mt-1 text-2xl font-black text-gray-950">Inventario</h1>
          <p className="mt-1 text-sm text-gray-600">Las recepciones validadas ingresan automáticamente. Consulta existencias y movimientos.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {puedeVerCatalogo && <Link to="/admin/productos" state={{ inventoryReturnTo: retornoInventario }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:text-sm">Catálogo de productos</Link>}
          <Link to="/admin/erp/almacen/recepciones" state={{ inventoryReturnTo: retornoInventario }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:text-sm">Ver recepciones</Link>
        </div>
      </header>

      <nav aria-label="Operaciones de almacén" className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900">Operaciones de almacén</h2>
          <p className="text-xs text-gray-500">Desliza para ver más opciones en celular. Las pendientes aún no realizan operaciones.</p>
        </div>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
          {seccionesAlmacen.map((item) => {
            const Icono = item.icono;
            const activa = item.vista === pestana;
            const contenido = (
              <>
                <Icono aria-hidden="true" className={activa ? "shrink-0 text-red-700" : "shrink-0 text-gray-500"} size={18} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.nombre}</span>
                  <span className="block text-xs font-normal text-gray-500">{item.descripcion}</span>
                </span>
              </>
            );
            const claseBase = "flex min-h-16 w-48 shrink-0 snap-start items-center gap-2 rounded-lg border p-3 text-left sm:w-full sm:gap-3";
            return item.vista ? (
              <button key={item.nombre} type="button" aria-current={activa ? "page" : undefined}
                onClick={() => cambiarFiltro("vista", item.vista === "existencias" ? "" : item.vista)}
                className={`${claseBase} transition-colors ${activa
                  ? "border-red-600 bg-red-50 text-gray-950"
                  : "border-gray-200 bg-gray-50 text-gray-900 hover:border-red-300 hover:bg-white"}`}>
                {contenido}
              </button>
            ) : (
              <div key={item.nombre} aria-disabled="true"
                className={`${claseBase} cursor-not-allowed border-gray-100 bg-gray-50 text-gray-500 opacity-70`}>
                {contenido}
              </div>
            );
          })}
        </div>
      </nav>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {tarjetas.map((item) => (
          <div key={item.titulo} className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-center shadow-sm">
            <p className="text-xs font-semibold text-gray-600">{item.titulo}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-gray-950">{cargando || error ? "—" : item.valor}</p>
            <p className="mt-1 text-xs text-gray-500">{item.ayuda}</p>
          </div>
        ))}
      </div>

      <section aria-label="Valorización referencial del inventario" className="space-y-2">
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible">
          {[
            { titulo: "Valor físico referencial", valor: resumen?.physical_value_reference, ayuda: "Disponibles más observados", parcial: !resumen?.physical_valuation_complete },
            { titulo: "Stock disponible valorizado", valor: resumen?.value_reference, ayuda: "Descontadas las cortesías", parcial: Number(resumen?.unvalued_units || 0) > 0 },
            { titulo: "Mercadería observada", valor: resumen?.observed_value_reference, ayuda: "Separada del stock vendible", parcial: Number(resumen?.unvalued_observed_units || 0) > 0 },
          ].map((item) => (
            <div key={item.titulo} className="min-w-56 flex-1 snap-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:min-w-0">
              <p className="text-xs font-semibold text-gray-600">{item.titulo}</p>
              <p className="mt-1 text-xl font-black tabular-nums text-gray-950">
                {cargando || error ? "—" : dinero(item.valor)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{item.ayuda}</p>
              {!cargando && !error && item.parcial && (
                <p className="mt-1 text-xs font-bold text-amber-800">Valor parcial: faltan costos unitarios</p>
              )}
            </div>
          ))}
        </div>
        <p className="px-1 text-xs leading-5 text-gray-600">
          Valorización del inventario global registrado a costo histórico referencial. Los adicionales conformes
          ya están incluidos; no se suman nuevamente. No representa deuda con las editoriales ni separa aún
          existencias por almacén físico.
          {resumen?.physical_valuation_complete === false && (
            <span className="block font-bold text-amber-800">
              Valorización parcial: {Number(resumen.unvalued_units || 0) + Number(resumen.unvalued_observed_units || 0)} unidades sin costo histórico.
            </span>
          )}
        </p>
      </section>
      <section aria-label="Detalle de la operación seleccionada" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
          <h2 className="text-sm font-bold text-gray-900">
            {pestana === "existencias" ? "Existencias por producto" : pestana === "movimientos" ? "Entradas de mercadería" : "Cortesías a colegios"}
          </h2>
          <span className="text-xs text-gray-500">{error ? "Consulta no disponible" : `${existencias.length} productos con entradas`}</span>
        </div>

        {pestana === "existencias" ? (
          <div className="space-y-4 p-3 sm:p-4">
            <div className="flex flex-wrap gap-2">
              <input aria-label="Buscar libro o editorial" placeholder="Buscar libro o editorial…" value={busqueda}
                onChange={(event) => cambiarFiltro("buscar", event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none" />
              <select aria-label="Filtrar por editorial" value={editorial} onChange={(event) => cambiarFiltro("editorial", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:w-52">
                <option value="">Todas las editoriales</option>
                {editoriales.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </div>
            <div className="max-h-96 overflow-auto overscroll-contain">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th scope="col" className="p-2">Producto</th>
                    <th scope="col" className="p-2">Editorial</th>
                    <th scope="col" className="p-2 text-right">Físico</th>
                    <th scope="col" className="p-2 text-right">Disponibles</th>
                    <th scope="col" className="p-2 text-right">Observados</th>
                    <th scope="col" className="p-2 text-right">Adicionales</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((item) => <tr key={item.product_id} className="border-b border-gray-100 transition hover:bg-gray-50">
                    <td className="p-2 font-semibold text-gray-900">{item.product}</td>
                    <td className="p-2 text-gray-600">{item.editorial}</td>
                    {[item.physical, item.available, item.nonconforming, item.extra_included].map((value, indice) => (
                      <td key={indice} className="p-2 text-right font-semibold tabular-nums">{value}</td>
                    ))}
                  </tr>)}
                </tbody>
              </table>
              {!cargando && !error && visibles.length === 0 && <p className="p-4 text-center text-sm text-gray-500">No hay existencias para los filtros seleccionados.</p>}
              {cargando && <p role="status" className="p-4 text-center text-sm text-gray-500">Consultando existencias…</p>}
            </div>
            <p className="text-xs text-gray-500">Disponible descuenta las cortesías registradas. Los adicionales son históricos; ventas y traslados se incorporarán después.</p>
            <details className="rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold text-gray-900 transition hover:bg-gray-50">
                Ver desglose por editorial ({valorPorEditorial.length})
              </summary>
              <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600">
                Selecciona una editorial para filtrar los productos de arriba.
              </p>
              {errorValorizacion && (
                <p role="status" className="m-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{errorValorizacion}</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th scope="col" className="p-2">Editorial</th>
                      <th scope="col" className="p-2 text-right">Físico</th>
                      <th scope="col" className="p-2 text-right">Disponible</th>
                      <th scope="col" className="p-2 text-right">Observado</th>
                      <th scope="col" className="p-2 text-right">Adic. históricos</th>
                      <th scope="col" className="p-2 text-right">Valor disponible</th>
                      <th scope="col" className="p-2 text-right">Valor observado</th>
                      <th scope="col" className="p-2 text-right">Valor físico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valorPorEditorial.map((item) => (
                      <tr key={item.editorial_id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-2">
                          <button type="button" onClick={() => cambiarFiltro("editorial", item.editorial)}
                            aria-pressed={editorial === item.editorial}
                            className={editorial === item.editorial
                              ? "font-bold text-red-700 underline underline-offset-4"
                              : "font-semibold text-gray-900 hover:text-red-700 hover:underline"}>
                            {item.editorial}
                          </button>
                        </td>
                        <td className="p-2 text-right tabular-nums">{item.physical}</td>
                        <td className="p-2 text-right tabular-nums">{item.available}</td>
                        <td className="p-2 text-right tabular-nums">{item.observed}</td>
                        <td className="p-2 text-right tabular-nums">{item.extra_received}</td>
                        <td className="p-2 text-right tabular-nums">
                          {dinero(item.available_value_reference)}
                          {Number(item.unvalued_available_units) > 0 && <span className="block text-amber-800">Parcial</span>}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {dinero(item.observed_value_reference)}
                          {Number(item.unvalued_observed_units) > 0 && <span className="block text-amber-800">Parcial</span>}
                        </td>
                        <td className="p-2 text-right font-bold tabular-nums">
                          {dinero(item.physical_value_reference)}
                          {!item.valuation_complete && <span className="block text-amber-800">Parcial</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!cargando && !error && !errorValorizacion && valorPorEditorial.length === 0 && (
                  <p className="p-3 text-center text-sm text-gray-500">Aún no hay mercadería valorizada por editorial.</p>
                )}
              </div>
              <p className="border-t border-gray-100 p-3 text-xs text-gray-500">
                El valor físico incluye también mercadería observada, que no está disponible para venta.
                Los adicionales ya están incluidos en las cantidades conformes.
              </p>
            </details>

          </div>
        ) : pestana === "salidas" ? (
          <div><InventoryCourtesyPanel outflows={salidas}
            canManage={puedeRegistrarCortesia} onRefresh={() => cargar(() => false)} /></div>
        ) : (
          <div  className="p-3 sm:p-4">
            <h2 className="text-sm font-bold text-gray-900">Historial de movimientos de mercadería</h2>
            <p className="mb-3 mt-1 text-xs text-gray-600">Cada registro conserva cuánto ingresó originalmente, su guía, colegio y valor histórico. Las cortesías y su descuento de stock se consultan en Cortesías; los traslados y ventas se incorporarán posteriormente.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="p-2">Guía</th>
                    <th scope="col" className="p-2">Producto</th>
                    <th scope="col" className="p-2">Colegio</th>
                    <th scope="col" className="p-2 text-right">Al pedido</th>
                    <th scope="col" className="p-2 text-right">Adicionales</th>
                    <th scope="col" className="p-2 text-right">Total conforme</th>
                    <th scope="col" className="p-2 text-right">Valor referencial</th>
                    <th scope="col" className="p-2 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody>{entradas.map((item) => (
                  <Fragment key={item.id}>
                    <tr className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="p-2">{item.guide}</td>
                      <td className="p-2 font-semibold">{item.product}</td>
                      <td className="p-2">{item.school}</td>
                      <td className="p-2 text-right tabular-nums">{item.on_order}</td>
                      <td className="p-2 text-right tabular-nums">{item.extra_included}</td>
                      <td className="p-2 text-right font-semibold tabular-nums">{item.available}</td>
                      <td className="p-2 text-right tabular-nums">{dinero(item.entry_value)}</td>
                      <td className="p-2 text-right">
                        <button type="button" aria-expanded={detalleId === item.id}
                          onClick={() => setDetalleId((actual) => actual === item.id ? null : item.id)}
                          className="font-bold text-red-700 underline-offset-2 hover:underline">
                          {detalleId === item.id ? "Ocultar" : "Ver desglose"}
                        </button>
                      </td>
                    </tr>
                    {detalleId === item.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="p-3">
                          <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-4">
                            <div><p className="text-gray-500">Costo unitario de referencia</p><p className="mt-1 font-bold">{dinero(item.unit_cost)}</p></div>
                            <div><p className="text-gray-500">Pedido · {item.on_order} unidades</p><p className="mt-1 font-bold">{dinero(item.order_value_reference)}</p></div>
                            <div><p className="text-gray-500">Adicionales · {item.extra_included} unidades</p><p className="mt-1 font-bold">{dinero(item.extra_value_reference)}</p></div>
                            <div><p className="text-gray-500">Total conforme · {item.available} unidades</p><p className="mt-1 font-bold">{dinero(item.entry_value)}</p></div>
                          </div>
                          <p className="mt-2 text-gray-500">El valor de los adicionales es referencial y no genera por sí solo una obligación de pago a la editorial.</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}</tbody>
              </table>
              {!cargando && !error && entradas.length === 0 && <p className="p-4 text-center text-sm text-gray-500">Aún no hay ingresos registrados.</p>}
            </div>
            <p className="mt-3 text-xs text-gray-500">Valores históricos de entrada calculados por Django. Para el stock actual consulta Existencias; para descuentos por cortesía, Cortesías. No son importes por pagar.</p>
          </div>
        )}
      </section>
    </main>
  );
}
