import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import {
  aprobarPedido, generarPedidosDesdeAdopcion, modificarCantidadPedido,
  obtenerAdopcionesConfirmadas,
  obtenerPedido, obtenerPedidos, registrarEnvioPedido,
} from "../../../api/purchasingApi";

const estados = {
  draft: "Borrador", approved: "Aprobado", sent: "Enviado",
  partially_received: "Recepción parcial", received: "Recibido",
  closed_partial: "Cerrado con saldo", cancelled: "Anulado",
};

function obtenerError(error) {
  const detail = error?.response?.data?.detail;
  return Array.isArray(detail) ? detail.join(" ") : typeof detail === "string"
    ? detail : "No fue posible completar la operación. Inténtalo nuevamente.";
}

export default function ERPPedidosPage() {
  const { user } = useAuth();
  const puedeEditar = userHasPermission(user, ["purchasing.manage_purchasing"]);
  const puedeAprobar = userHasPermission(user, ["purchasing.approve_purchasing"]);
  const puedeEnviar = userHasPermission(user, ["purchasing.record_purchase_dispatch"]);
  const [pedidos, setPedidos] = useState([]);
  const [filtros, setFiltros] = useState({ status: "", provider: "", school: "", campaign: "" });
  const [seleccionado, setSeleccionado] = useState(null);
  const [adopcionId, setAdopcionId] = useState("");
  const [adopciones, setAdopciones] = useState([]);
  const [busquedaColegio, setBusquedaColegio] = useState("");
  const [cargandoAdopciones, setCargandoAdopciones] = useState(false);
  const [evidencia, setEvidencia] = useState("");
  const [cantidades, setCantidades] = useState({});
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, value]) => value));
      const data = await obtenerPedidos(params);
      setPedidos(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      setError(obtenerError(err));
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    let ignore = false;
    async function consultar() {
      setCargando(true);
      try {
        const params = Object.fromEntries(Object.entries(filtros).filter(([, value]) => value));
        const data = await obtenerPedidos(params);
        if (!ignore) {
          setPedidos(Array.isArray(data) ? data : data?.results ?? []);
          setError("");
        }
      } catch (err) {
        if (!ignore) setError(obtenerError(err));
      } finally {
        if (!ignore) setCargando(false);
      }
    }
    consultar();
    return () => { ignore = true; };
  }, [filtros]);

  useEffect(() => {
    if (!puedeEditar) return undefined;
    let ignore = false;
    async function consultarAdopciones() {
      setCargandoAdopciones(true);
      try {
        const response = await obtenerAdopcionesConfirmadas(
          busquedaColegio.trim() ? { buscar: busquedaColegio.trim() } : {},
        );
        if (!ignore) setAdopciones(Array.isArray(response) ? response : response?.results ?? []);
      } catch (err) {
        if (!ignore) setError(obtenerError(err));
      } finally {
        if (!ignore) setCargandoAdopciones(false);
      }
    }
    consultarAdopciones();
    return () => { ignore = true; };
  }, [puedeEditar, busquedaColegio]);

  async function seleccionar(id) {
    setError("");
    try {
      const pedido = await obtenerPedido(id);
      setSeleccionado(pedido);
      setEvidencia("");
      setCantidades(Object.fromEntries(pedido.items.map((item) => [item.id, String(item.quantity_ordered)])));
    } catch (err) {
      setError(obtenerError(err));
    }
  }

  async function operar(callback, success) {
    if (procesando) return;
    setProcesando(true);
    setMensaje("");
    setError("");
    try {
      const result = await callback();
      setMensaje(success);
      if (seleccionado?.id) {
        const pedido = await obtenerPedido(seleccionado.id);
        setSeleccionado(pedido);
        setCantidades(Object.fromEntries(pedido.items.map((item) => [item.id, String(item.quantity_ordered)])));
      } else if (Array.isArray(result) && result.length) {
        await seleccionar(result[0].id);
      }
      await cargar();
    } catch (err) {
      setError(obtenerError(err));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Compras</p>
        <h1 className="mt-1 text-2xl font-black text-gray-950">Pedidos a Editoriales</h1>
        <p className="mt-2 text-sm text-gray-600">Prepara pedidos por colegio, revisa cantidades y registra su aprobación y envío.</p>
      </header>

      {puedeEditar && (
        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!adopcionId || Number(adopcionId) < 1) return;
            setFiltros({ status: "", provider: "", school: "", campaign: "" });
            operar(() => generarPedidosDesdeAdopcion(Number(adopcionId)), "Pedidos generados o recuperados correctamente.");
          }}>
          <label className="space-y-1 text-sm font-semibold text-gray-800">
            <span>Buscar colegio con adopción confirmada</span>
            <input type="search" value={busquedaColegio} onChange={(event) => { setBusquedaColegio(event.target.value); setAdopcionId(""); }}
              placeholder="Nombre del colegio" className="block w-64 rounded-xl border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm font-semibold text-gray-800">
            <span>Adopción vigente</span>
            <select required value={adopcionId} onChange={(event) => setAdopcionId(event.target.value)}
              className="block w-72 rounded-xl border border-gray-300 px-3 py-2">
              <option value="">{cargandoAdopciones ? "Consultando adopciones..." : "Seleccionar colegio y campaña"}</option>
              {adopciones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.colegio} · {item.campania} · V{item.version} · {item.pedidos_existentes ? "Con pedidos" : "Sin pedidos"}
                </option>
              ))}
            </select>
          </label>
          <button disabled={procesando} type="submit" className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">
            Generar pedidos
          </button>
        </form>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800">{mensaje}</p>}

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-3 xl:col-span-2">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-3">
            <label className="col-span-2 text-sm font-semibold text-gray-700">Estado
              <select value={filtros.status} onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2">
                <option value="">Todos</option>
                {Object.entries(estados).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {["provider", "school", "campaign"].map((key) => (
              <label key={key} className="text-xs font-semibold text-gray-600">{({ provider: "Editorial ID", school: "Colegio ID", campaign: "Campaña ID" })[key]}
                <input type="number" min="1" value={filtros[key]}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" />
              </label>
            ))}
          </div>
          <div className="space-y-2">
            {cargando && <p className="text-sm text-gray-500">Consultando pedidos…</p>}
            {!cargando && pedidos.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">No hay pedidos para estos filtros.</p>}
            {pedidos.map((pedido) => (
              <button key={pedido.id} type="button" onClick={() => seleccionar(pedido.id)}
                className={`w-full rounded-xl border p-4 text-left transition hover:border-red-300 ${seleccionado?.id === pedido.id ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}>
                <p className="font-bold text-gray-950">{pedido.provider_name_snapshot}</p>
                <p className="mt-1 text-sm text-gray-600">{pedido.school_name_snapshot || "Compra independiente"}</p>
                <p className="mt-1 text-xs text-gray-500">{pedido.campaign_name_snapshot} · {estados[pedido.status] || pedido.status}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-3">
          {!seleccionado ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Selecciona un pedido para consultar sus productos.</div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase text-red-700">{estados[seleccionado.status]}</p>
                <h2 className="text-xl font-black text-gray-950">{seleccionado.provider_name_snapshot}</h2>
                <p className="text-sm text-gray-600">{seleccionado.school_name_snapshot || "Pedido independiente"} · {seleccionado.campaign_name_snapshot}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-96 text-left text-sm">
                  <thead className="border-b border-gray-200 text-gray-600"><tr><th className="py-2">Libro</th><th>Cantidad</th><th>Costo unit.</th><th>Acción</th></tr></thead>
                  <tbody>
                    {seleccionado.items?.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-semibold">{item.product_name_snapshot}</td>
                        <td><input aria-label={`Cantidad de ${item.product_name_snapshot}`} type="number" min="1"
                          disabled={!puedeEditar || seleccionado.status !== "draft" || procesando}
                          value={cantidades[item.id] ?? item.quantity_ordered}
                          onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-20 rounded-lg border border-gray-300 p-2 disabled:bg-gray-100" /></td>
                        <td>S/ {item.unit_supplier_cost}</td>
                        <td>
                          {puedeEditar && seleccionado.status === "draft" && (
                            <button type="button" disabled={procesando || Number(cantidades[item.id]) < 1}
                              onClick={() => operar(() => modificarCantidadPedido(seleccionado.id, item.id, Number(cantidades[item.id])), "Cantidad actualizada.")}
                              className="text-xs font-bold text-red-700 disabled:opacity-50">Guardar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {seleccionado.status === "draft" && puedeAprobar && (
                <button type="button" disabled={procesando} onClick={() => operar(() => aprobarPedido(seleccionado.id), "Pedido aprobado.")}
                  className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">Aprobar pedido</button>
              )}
              {seleccionado.status === "approved" && puedeEnviar && (
                <form className="space-y-2" onSubmit={(event) => {
                  event.preventDefault();
                  operar(() => registrarEnvioPedido(seleccionado.id, evidencia), "Envío registrado.");
                }}>
                  <label className="block text-sm font-semibold text-gray-700">Referencia o evidencia del envío
                    <textarea required maxLength="2000" value={evidencia} onChange={(event) => setEvidencia(event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-gray-300 p-3" rows="3" />
                  </label>
                  <button disabled={procesando || !evidencia.trim()} type="submit"
                    className="rounded-xl bg-gray-950 px-4 py-2 font-bold text-white disabled:opacity-50">Registrar envío</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
