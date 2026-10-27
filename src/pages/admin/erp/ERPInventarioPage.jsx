import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { consultarExistencias, listarEntradasInventario } from "../../../api/warehouseApi";

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

const clasesPestana = (activa) => `border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
  activa ? "border-red-700 text-red-700" : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
}`;

export default function ERPInventarioPage() {
  const { user } = useAuth();
  const puedeVerCatalogo = userHasPermission(user, ["catalog.view_catalog"]);
  const [existencias, setExistencias] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editorial, setEditorial] = useState("");
  const [pestana, setPestana] = useState("existencias");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (ignorar) => {
    const [stock, movimientos] = await Promise.all([
      consultarExistencias(), listarEntradasInventario(),
    ]);
    if (ignorar()) return;
    setExistencias(stock);
    setEntradas(Array.isArray(movimientos) ? movimientos : movimientos.results ?? []);
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

  const resumen = useMemo(() => existencias.reduce((total, item) => ({
    physical: total.physical + item.physical,
    available: total.available + item.available,
    nonconforming: total.nonconforming + item.nonconforming,
    extra: total.extra + item.extra_included,
  }), { physical: 0, available: 0, nonconforming: 0, extra: 0 }), [existencias]);

  const tarjetas = [
    { titulo: "Existencia física", valor: resumen.physical, ayuda: "Incluye observados" },
    { titulo: "Conformes ingresados", valor: resumen.available, ayuda: "Antes de salidas y reservas" },
    { titulo: "Observados", valor: resumen.nonconforming, ayuda: "No disponibles para venta" },
    { titulo: "Adicionales", valor: resumen.extra, ayuda: "Incluidos en conformes" },
  ];

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
          <h1 className="mt-1 text-2xl font-black text-gray-950">Inventario</h1>
          <p className="mt-1 text-sm text-gray-600">Las recepciones validadas ingresan automáticamente. Consulta existencias y movimientos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeVerCatalogo && <Link to="/admin/productos" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Catálogo de productos</Link>}
          <Link to="/admin/erp/almacen/recepciones" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Ver recepciones</Link>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((item) => (
          <div key={item.titulo} className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-semibold text-gray-600">{item.titulo}</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-gray-950">{cargando ? "—" : item.valor}</p>
            <p className="mt-1 text-xs text-gray-500">{item.ayuda}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-4">
          <div role="tablist" aria-label="Información del inventario" className="flex gap-1">
            <button type="button" role="tab" aria-selected={pestana === "existencias"} onClick={() => setPestana("existencias")} className={clasesPestana(pestana === "existencias")}>Existencias</button>
            <button type="button" role="tab" aria-selected={pestana === "movimientos"} onClick={() => setPestana("movimientos")} className={clasesPestana(pestana === "movimientos")}>Movimientos</button>
          </div>
          <span className="py-2 text-xs text-gray-500">{existencias.length} productos con entradas</span>
        </div>

        {pestana === "existencias" ? (
          <div role="tabpanel" className="p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <input aria-label="Buscar libro o editorial" placeholder="Buscar libro o editorial…" value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none" />
              <select aria-label="Filtrar por editorial" value={editorial} onChange={(event) => setEditorial(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:w-52">
                <option value="">Todas las editoriales</option>
                {editoriales.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th scope="col" className="p-2">Producto</th>
                    <th scope="col" className="p-2">Editorial</th>
                    <th scope="col" className="p-2 text-right">Físico</th>
                    <th scope="col" className="p-2 text-right">Conformes</th>
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
              {!cargando && visibles.length === 0 && <p className="p-4 text-center text-sm text-gray-500">No hay existencias para los filtros seleccionados.</p>}
              {cargando && <p role="status" className="p-4 text-center text-sm text-gray-500">Consultando existencias…</p>}
            </div>
            <p className="mt-3 text-xs text-gray-500">Los adicionales ya están incluidos en las unidades conformes. Las salidas, reservas y traslados se incorporarán cuando sus movimientos estén disponibles.</p>
          </div>
        ) : (
          <div role="tabpanel" className="p-3 sm:p-4">
            <h2 className="mb-3 text-sm font-bold text-gray-900">Entradas recientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="p-2">Guía</th>
                    <th scope="col" className="p-2">Producto</th>
                    <th scope="col" className="p-2">Colegio</th>
                    <th scope="col" className="p-2 text-right">Conformes</th>
                    <th scope="col" className="p-2 text-right">Adic.</th>
                    <th scope="col" className="p-2 text-right">Costo unit.</th>
                    <th scope="col" className="p-2 text-right">Valor entrada</th>
                  </tr>
                </thead>
                <tbody>{entradas.map((item) => <tr key={item.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                  <td className="p-2">{item.guide}</td>
                  <td className="p-2 font-semibold">{item.product}</td>
                  <td className="p-2">{item.school}</td>
                  <td className="p-2 text-right tabular-nums">{item.available}</td>
                  <td className="p-2 text-right tabular-nums">{item.extra_included}</td>
                  <td className="p-2 text-right tabular-nums">{dinero(item.unit_cost)}</td>
                  <td className="p-2 text-right tabular-nums">{dinero(item.entry_value)}</td>
                </tr>)}</tbody>
              </table>
              {!cargando && entradas.length === 0 && <p className="p-4 text-center text-sm text-gray-500">Aún no hay ingresos registrados.</p>}
            </div>
            <p className="mt-3 text-xs text-gray-500">Valores históricos calculados por Django según el costo registrado en el pedido. No incluyen movimientos de salida.</p>
          </div>
        )}
      </section>
    </main>
  );
}
