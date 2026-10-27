import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { consultarExistencias, listarEntradasInventario, listarRecepciones, registrarEntradaInventario } from "../../../api/warehouseApi";

function mensajeError(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data)) return data.join(" ");
  if (data && typeof data === "object") return Object.values(data).flat().map(String).join(" ");
  return "No se pudo completar la operación.";
}

export default function ERPInventarioPage() {
  const [existencias, setExistencias] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [seleccion, setSeleccion] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async (ignore = () => false) => {
    const [stock, movimientos, documentos] = await Promise.all([
      consultarExistencias(), listarEntradasInventario(), listarRecepciones(),
    ]);
    if (ignore()) return;
    setExistencias(stock);
    setEntradas(Array.isArray(movimientos) ? movimientos : movimientos.results ?? []);
    setRecepciones((Array.isArray(documentos) ? documentos : documentos.results ?? []).filter((r) => r.status === "validated"));
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => cargar(() => ignore)).catch((err) => {
      if (!ignore) setError(mensajeError(err));
    }).finally(() => {
      if (!ignore) setCargando(false);
    });
    return () => { ignore = true; };
  }, [cargar]);

  async function ingresar() {
    if (!seleccion || procesando) return;
    if (!window.confirm("¿Confirmar el ingreso de esta recepción validada al Inventario? La operación quedará registrada.")) return;
    setProcesando(true);
    setMensaje("");
    setError("");
    try {
      const result = await registrarEntradaInventario(Number(seleccion));
      await cargar();
      setMensaje(result.message);
      setSeleccion("");
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setProcesando(false);
    }
  }

  const visibles = existencias.filter((item) => `${item.product} ${item.editorial}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));
  const total = existencias.reduce((s, x) => s + x.physical, 0);
  const disponible = existencias.reduce((s, x) => s + x.available, 0);
  const noConforme = existencias.reduce((s, x) => s + x.nonconforming, 0);

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-600">Existencias y entradas registradas desde recepciones validadas.</p>
        </div>
        <Link to="/admin/erp/almacen/recepciones" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Ver recepciones</Link>
      </header>
      {mensaje && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-900">{mensaje}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Físico",total],["Conforme",disponible],["No conforme",noConforme],["Productos",existencias.length]].map(([name,value]) =>
          <div key={name} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <p className="text-xs text-gray-500">{name}</p><p className="text-2xl font-black tabular-nums text-gray-900">{value}</p>
          </div>)}
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-bold text-gray-900">Registrar ingreso desde recepción</h2>
        <p className="mt-1 text-xs text-gray-600">Solo se contabilizan recepciones validadas. Registrar otra vez la misma guía no duplica existencias.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select aria-label="Recepción validada" className="min-w-0 flex-1 rounded-lg border border-gray-300 p-2 text-sm" value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
            <option value="">Seleccionar recepción validada</option>
            {recepciones.map((r) => <option key={r.id} value={r.id}>{r.provider_name} · {r.document_number} · N.º {r.id}</option>)}
          </select>
          <button type="button" disabled={!seleccion || procesando} onClick={ingresar} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50">{procesando ? "Registrando..." : "Registrar entrada"}</button>
        </div>
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Existencias por producto</h2>
          <input aria-label="Buscar producto o editorial" placeholder="Buscar libro o editorial" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>
            <th className="p-2">Producto</th><th className="p-2">Editorial</th><th className="p-2 text-right">Físico</th><th className="p-2 text-right">Conforme</th><th className="p-2 text-right">No conforme</th><th className="p-2 text-right">Adicionales incluidos</th>
          </tr></thead><tbody>{visibles.map((item) => <tr key={item.product_id} className="border-b border-gray-100">
            <td className="p-2 font-semibold">{item.product}</td><td className="p-2">{item.editorial}</td>
            {[item.physical,item.available,item.nonconforming,item.extra_included].map((v,i) => <td key={i} className="p-2 text-right tabular-nums">{v}</td>)}
          </tr>)}</tbody></table>
          {!cargando && !visibles.length && <p className="p-4 text-sm text-gray-500">No hay existencias registradas para esta búsqueda.</p>}
        </div>
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Últimos ingresos registrados</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50"><tr><th className="p-2">Guía</th><th className="p-2">Producto</th><th className="p-2">Colegio</th><th className="p-2 text-right">Conformes</th><th className="p-2 text-right">Costo unit.</th></tr></thead>
          <tbody>{entradas.map((e) => <tr key={e.id} className="border-b border-gray-100"><td className="p-2">{e.guide}</td><td className="p-2">{e.product}</td><td className="p-2">{e.school}</td><td className="p-2 text-right">{e.available}</td><td className="p-2 text-right">{e.unit_cost ?? "Sin costo"}</td></tr>)}</tbody>
        </table></div>
      </section>
    </main>
  );
}
