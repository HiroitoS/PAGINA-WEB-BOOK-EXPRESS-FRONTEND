import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import {
  aprobarPedido, descargarOrdenCompraPdf, generarPedidosDesdeAdopcion, guardarCantidadesPedido,
  obtenerAdopcionesPorEditorial,
  obtenerPedido, obtenerPedidos, registrarEnvioPedido,
} from "../../../api/purchasingApi";

const estados = {
  draft: "Pedido en borrador", approved: "Aprobado para enviar", sent: "Enviado a editorial",
  partially_received: "Recepción parcial", received: "Recibido",
  closed_partial: "Cerrado con saldo", cancelled: "Anulado",
};

const estadosFiltro = ["draft", "approved", "sent"];

function estadoSemaforo(pedidoId, estadoPedido) {
  if (!pedidoId) return { tipo: "sinPedido", texto: "Sin pedido generado", punto: "bg-red-600", estilo: "border-red-200 bg-red-50 text-red-800" };
  if (estadoPedido === "cancelled") return { tipo: "sinPedido", texto: "Pedido anulado", punto: "bg-red-600", estilo: "border-red-200 bg-red-50 text-red-800" };
  if (["sent", "partially_received", "received", "closed_partial"].includes(estadoPedido)) {
    return { tipo: "enviado", texto: "Enviado a editorial", punto: "bg-green-600", estilo: "border-green-200 bg-green-50 text-green-800" };
  }
  return { tipo: "porEnviar", texto: "Pendiente de envío", punto: "bg-amber-500", estilo: "border-amber-200 bg-amber-50 text-amber-900" };
}

function SemaforoPedido({ pedidoId, estadoPedido }) {
  const indicador = estadoSemaforo(pedidoId, estadoPedido);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm font-bold ${indicador.estilo}`}>
      <span aria-hidden="true" className={`inline-block h-3 w-3 shrink-0 rounded-full ${indicador.punto}`} />
      {indicador.texto}
    </span>
  );
}

function datosCorreoPedido(pedido) {
  const numero = `BE-SL-${String(pedido.id).padStart(6, "0")}`;
  const archivo = `${numero}.pdf`;
  const unidades = (pedido.items || []).reduce((total, item) => total + Number(item.quantity_ordered), 0);
  const asunto = `Solicitud de libros ${numero} - ${pedido.provider_name_snapshot} - ${pedido.school_name_snapshot || "Pedido independiente"}`;
  const mensaje = [
    "Buen día:",
    "",
    `Por medio del presente, solicitamos la atención de nuestro pedido de libros y materiales educativos, detallado en la Solicitud de Libros N.º ${numero}.`,
    "",
    `Editorial: ${pedido.provider_name_snapshot}`,
    `Colegio: ${pedido.school_name_snapshot || "Pedido independiente"}`,
    `Campaña: ${pedido.campaign_name_snapshot}`,
    `Cantidad total solicitada: ${unidades} unidades`,
    "",
    "Agradeceremos confirmar la recepción del pedido e informarnos la disponibilidad de los productos y la fecha estimada de despacho. En caso de entregas parciales, agradeceremos indicar las cantidades disponibles y pendientes.",
    "",
    "Quedamos atentos a su confirmación.",
    "",
    "Saludos cordiales,",
    "Book Express",
  ].join("\n");
  return { asunto, mensaje, archivo };
}

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
  const [pestana, setPestana] = useState("adopciones");
  const [seleccionado, setSeleccionado] = useState(null);
  const [gruposEditoriales, setGruposEditoriales] = useState([]);
  const [busquedaColegio, setBusquedaColegio] = useState("");
  const [cargandoAdopciones, setCargandoAdopciones] = useState(false);
  const [editorialAbierta, setEditorialAbierta] = useState(null);
  const [evidencia, setEvidencia] = useState("");
  const [mostrarCorreo, setMostrarCorreo] = useState(false);
  const [cantidades, setCantidades] = useState({});
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const estadoFiltro = filtros.status;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const params = estadoFiltro ? { status: estadoFiltro } : {};
      const data = await obtenerPedidos(params);
      setPedidos(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      setError(obtenerError(err));
    } finally {
      setCargando(false);
    }
  }, [estadoFiltro]);

  useEffect(() => {
    let ignore = false;
    async function consultar() {
      setCargando(true);
      try {
        const params = estadoFiltro ? { status: estadoFiltro } : {};
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
  }, [estadoFiltro]);

  useEffect(() => {
    if (!puedeEditar) return undefined;
    let ignore = false;
    async function consultarAdopciones() {
      setCargandoAdopciones(true);
      try {
        const response = await obtenerAdopcionesPorEditorial(
          busquedaColegio.trim() ? { buscar: busquedaColegio.trim() } : {},
        );
        if (!ignore) setGruposEditoriales(Array.isArray(response) ? response : response?.results ?? []);
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
      setMostrarCorreo(false);
      setCantidades(Object.fromEntries(pedido.items.map((item) => [item.id, String(item.quantity_ordered)])));
    } catch (err) {
      setError(obtenerError(err));
    }
  }

  async function descargarPdf(formato = "solicitud") {
    if (!seleccionado || procesando) return;
    setProcesando(true);
    setError("");
    setMensaje("");
    try {
      const archivo = await descargarOrdenCompraPdf(seleccionado.id, formato);
      const enlace = URL.createObjectURL(new Blob([archivo], { type: "application/pdf" }));
      const descarga = document.createElement("a");
      descarga.href = enlace;
      descarga.download = `${formato === "solicitud" ? "BE-SL" : "BE-OC"}-${String(seleccionado.id).padStart(6, "0")}.pdf`;
      document.body.appendChild(descarga);
      descarga.click();
      descarga.remove();
      window.setTimeout(() => URL.revokeObjectURL(enlace), 1000);
      setMensaje(formato === "solicitud" ? "Solicitud de libros descargada. Puedes enviarla manualmente a la editorial." : "Orden valorizada descargada para uso interno.");
    } catch (err) {
      setError(obtenerError(err));
    } finally {
      setProcesando(false);
    }
  }

  async function operar(callback, success, editorialId = null) {
    if (procesando) return;
    setProcesando(true);
    setMensaje("");
    setError("");
    try {
      const result = await callback();
      setMensaje(success);
      if (Array.isArray(result) && result.length) {
        const pedidoGenerado = result.find((pedido) => pedido.provider === editorialId) ?? result[0];
        await seleccionar(pedidoGenerado.id);
      } else if (seleccionado?.id) {
        await seleccionar(seleccionado.id);
      }
      await cargar();
      const response = await obtenerAdopcionesPorEditorial(
        busquedaColegio.trim() ? { buscar: busquedaColegio.trim() } : {},
      );
      setGruposEditoriales(Array.isArray(response) ? response : response?.results ?? []);
      return true;
    } catch (err) {
      setError(obtenerError(err));
      return false;
    } finally {
      setProcesando(false);
    }
  }

  const cambiosPendientes = seleccionado?.status === "draft"
    ? (seleccionado.items || []).filter((item) =>
      String(cantidades[item.id] ?? item.quantity_ordered) !== String(item.quantity_ordered)
    ).map((item) => ({
      item_id: item.id,
      quantity: Number(cantidades[item.id]),
    }))
    : [];
  const cambiosInvalidos = cambiosPendientes.some(({ quantity }) =>
    !Number.isSafeInteger(quantity) || quantity < 1
  );

  const opcionesEditoriales = [...new Set(
    pedidos.map((pedido) => pedido.provider_name_snapshot).filter(Boolean),
  )].sort();
  const opcionesCampanias = [...new Set(
    pedidos.map((pedido) => pedido.campaign_name_snapshot).filter(Boolean),
  )].sort();
  const pedidosVisibles = pedidos.filter((pedido) =>
    (!filtros.provider || pedido.provider_name_snapshot === filtros.provider)
    && (!filtros.campaign || pedido.campaign_name_snapshot === filtros.campaign)
    && (!filtros.school || (pedido.school_name_snapshot || "").toLocaleLowerCase("es")
      .includes(filtros.school.toLocaleLowerCase("es")))
  );

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Pedidos</p>
        <h1 className="mt-1 text-2xl font-black text-gray-950">Pedidos a Editoriales</h1>
        <p className="mt-2 text-sm text-gray-600">Prepara órdenes por colegio y editorial, apruébalas y registra su envío por correo. Las recepciones se gestionan en Almacén.</p>
      </header>

      <div role="tablist" aria-label="Secciones de pedidos" className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2">
        <button role="tab" aria-selected={pestana === "adopciones"} type="button" onClick={() => setPestana("adopciones")}
          className={`rounded-xl px-4 py-3 text-sm font-bold transition ${pestana === "adopciones" ? "bg-red-700 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
          Adopciones confirmadas
        </button>
        <button role="tab" aria-selected={pestana === "pedidos"} type="button" onClick={() => setPestana("pedidos")}
          className={`rounded-xl px-4 py-3 text-sm font-bold transition ${pestana === "pedidos" ? "bg-red-700 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
          Pedidos generados
        </button>
      </div>

      {pestana === "adopciones" && puedeEditar && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-base font-black text-gray-950">Adopciones confirmadas por editorial</h2>
          <p className="text-sm text-gray-600">Revisa el total por editorial y los colegios asociados. Los pedidos se controlan individualmente por colegio.</p>
          <label className="block max-w-md space-y-1 text-sm font-semibold text-gray-700">
            Buscar colegio
            <input type="search" value={busquedaColegio}
              onChange={(event) => setBusquedaColegio(event.target.value)}
              placeholder="Nombre del colegio"
              className="block w-full rounded-xl border border-gray-300 px-3 py-2" />
          </label>
          {cargandoAdopciones && <p className="text-sm text-gray-500">Consultando adopciones…</p>}
          {!cargandoAdopciones && gruposEditoriales.length === 0 && (
            <p className="text-sm text-gray-500">No hay adopciones confirmadas para esta búsqueda.</p>
          )}
          <div className="space-y-2">
            {gruposEditoriales.map((grupo) => (
              <div key={grupo.editorial_id} className="overflow-hidden rounded-xl border border-gray-200">
                <button type="button" onClick={() => setEditorialAbierta((actual) => actual === grupo.editorial_id ? null : grupo.editorial_id)}
                  aria-expanded={editorialAbierta === grupo.editorial_id}
                  className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left font-bold text-gray-900">
                  <span>{grupo.editorial}</span>
<span className="text-sm font-semibold text-gray-600">
                    {grupo.adopciones.length} adopción(es) · {grupo.adopciones.reduce((total, adopcion) => total + adopcion.unidades, 0)} unidades · <span className="text-red-700">{grupo.adopciones.filter((adopcion) => estadoSemaforo(adopcion.pedido_id, adopcion.estado_pedido).tipo === "sinPedido").length} sin pedido</span>
                    {" · "}
                    <span className="text-amber-800">{grupo.adopciones.filter((adopcion) => estadoSemaforo(adopcion.pedido_id, adopcion.estado_pedido).tipo === "porEnviar").length} por enviar</span>
                    {" · "}
                    <span className="text-green-700">{grupo.adopciones.filter((adopcion) => estadoSemaforo(adopcion.pedido_id, adopcion.estado_pedido).tipo === "enviado").length} enviados</span>
                    {" "}{editorialAbierta === grupo.editorial_id ? "▲" : "▼"}
                  </span>
                </button>
                {editorialAbierta === grupo.editorial_id && (
                  <div className="divide-y divide-gray-100">
                    {grupo.adopciones.map((adopcion) => (
                      <div key={adopcion.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                        <div>
                          <p className="font-semibold text-gray-900">{adopcion.colegio}</p>
                          <p className="text-xs text-gray-600">
                            Adopción N.º {adopcion.id}{adopcion.version ? ` · versión ${adopcion.version}` : ""} · {adopcion.campania} · {adopcion.lineas} producto(s) · {adopcion.unidades} unidad(es)
                          </p>
                          <p className="mt-1"><SemaforoPedido pedidoId={adopcion.pedido_id} estadoPedido={adopcion.estado_pedido} /></p>
                          {grupo.adopciones.filter((otra) =>
                            otra.colegio === adopcion.colegio && otra.campania === adopcion.campania
                          ).length > 1 && (
                            <p className="text-xs font-semibold text-amber-800">
                              Revisar: existe otra adopción de este colegio en la misma campaña.
                            </p>
                          )}
                        </div>
                        <button type="button" disabled={procesando}
                          onClick={async () => {
                            if (adopcion.pedido_id) {
                              setFiltros({ status: "", provider: "", school: "", campaign: "" });
                              await seleccionar(adopcion.pedido_id);
                              setPestana("pedidos");
                              return;
                            }
                            setFiltros({ status: "", provider: "", school: "", campaign: "" });
                            const generado = await operar(
                              () => generarPedidosDesdeAdopcion(adopcion.id, grupo.editorial_id),
                              "Pedidos generados correctamente.",
                              grupo.editorial_id,
                            );
                            if (generado) setPestana("pedidos");
                          }}
                          className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                          {adopcion.pedido_id ? "Abrir pedido" : "Generar pedido"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800">{mensaje}</p>}

      {pestana === "pedidos" && <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-3 xl:col-span-2">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-3">
            <label className="col-span-2 text-sm font-semibold text-gray-700">Estado
              <select value={filtros.status} onChange={(e) => { setFiltros((prev) => ({ ...prev, status: e.target.value })); setSeleccionado(null); }}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2">
                <option value="">Todos</option>
                {estadosFiltro.map((value) => <option key={value} value={value}>{estados[value]}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">Editorial
              <select value={filtros.provider} onChange={(e) => { setFiltros((prev) => ({ ...prev, provider: e.target.value })); setSeleccionado(null); }}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm">
                <option value="">Todas</option>
                {opcionesEditoriales.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">Campaña
              <select value={filtros.campaign} onChange={(e) => { setFiltros((prev) => ({ ...prev, campaign: e.target.value })); setSeleccionado(null); }}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm">
                <option value="">Todas</option>
                {opcionesCampanias.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </label>
            <label className="col-span-2 text-xs font-semibold text-gray-600">Colegio
              <input type="search" value={filtros.school} placeholder="Buscar por nombre"
                onChange={(e) => { setFiltros((prev) => ({ ...prev, school: e.target.value })); setSeleccionado(null); }}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" />
            </label>
          </div>
          <div className="space-y-2">
            {filtros.status === "approved" && (
              <p className="text-xs text-gray-600">Aprobado = validado por Compras, pendiente de registrar el envío a la editorial.</p>
            )}
            {cargando && <p className="text-sm text-gray-500">Consultando pedidos…</p>}
            {!cargando && pedidosVisibles.length === 0 && (
              <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                {filtros.status === "sent"
                  ? "Todavía no hay órdenes registradas como enviadas. Descarga la solicitud de un pedido aprobado, envíala a la editorial y registra la constancia de envío."
                  : "No hay pedidos que coincidan con los filtros seleccionados."}
              </p>
            )}
            {pedidosVisibles.map((pedido) => (
              <button key={pedido.id} type="button" onClick={() => seleccionar(pedido.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition hover:border-red-300 ${seleccionado?.id === pedido.id ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}>
                <p className="font-bold text-gray-950">{pedido.provider_name_snapshot}</p>
                <p className="text-sm text-gray-600">{pedido.school_name_snapshot || "Compra independiente"}</p>
                <p className="text-xs text-gray-500">{pedido.campaign_name_snapshot}{pedido.adoption ? ` · Adopción N.º ${pedido.adoption}` : ""} · BE-OC-{String(pedido.id).padStart(6, "0")}</p>
                <p className="mt-1"><SemaforoPedido pedidoId={pedido.id} estadoPedido={pedido.status} /></p>
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
                <p><SemaforoPedido pedidoId={seleccionado.id} estadoPedido={seleccionado.status} /></p>
                {seleccionado.status !== "sent" && (
                  <p className="mt-1 text-xs font-semibold text-gray-500">{estados[seleccionado.status]}</p>
                )}
                <h2 className="text-xl font-black text-gray-950">{seleccionado.provider_name_snapshot}</h2>
                <p className="text-sm text-gray-600">{seleccionado.school_name_snapshot || "Pedido independiente"} · {seleccionado.campaign_name_snapshot}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-96 text-left text-sm">
                  <thead className="border-b border-gray-200 text-gray-600"><tr><th className="py-2">Libro</th><th>Cantidad</th><th>Costo editorial</th></tr></thead>
                  <tbody>
                    {seleccionado.items?.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-semibold">{item.product_name_snapshot}</td>
                        <td>
                          {seleccionado.status === "draft" && puedeEditar ? (
                            <input aria-label={`Cantidad de ${item.product_name_snapshot}`} type="number" min="1"
                              disabled={procesando}
                              value={cantidades[item.id] ?? item.quantity_ordered}
                              onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-20 rounded-lg border border-gray-300 p-2" />
                          ) : (
                            <span className="font-semibold text-gray-900">{item.quantity_ordered}</span>
                          )}
                        </td>
                        <td>S/ {item.unit_supplier_cost}</td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {seleccionado.status === "draft" && puedeEditar && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-600">
                    {cambiosPendientes.length
                      ? `${cambiosPendientes.length} producto(s) con cambios sin guardar.`
                      : "Las cantidades coinciden con el pedido guardado."}
                  </p>
                  <button type="button" disabled={procesando || !cambiosPendientes.length || cambiosInvalidos}
                    onClick={() => operar(
                      () => guardarCantidadesPedido(seleccionado.id, cambiosPendientes),
                      "Cantidades guardadas correctamente.",
                    )}
                    className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                    Guardar cambios
                  </button>
                  {cambiosInvalidos && <p role="alert" className="w-full text-xs text-red-700">Introduce cantidades enteras mayores que cero.</p>}
                  {cambiosPendientes.length > 0 && !cambiosInvalidos && (
                    <p className="w-full text-xs text-gray-500">Guarda los cambios antes de aprobar o cambiar de pedido.</p>
                  )}
                </div>
              )}
              {["approved", "sent", "partially_received", "received", "closed_partial"].includes(seleccionado.status) && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={procesando} onClick={() => descargarPdf("solicitud")}
                    className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    Solicitud de libros (sin precios)
                  </button>
                  {puedeAprobar && (
                    <button type="button" disabled={procesando} onClick={() => descargarPdf("valorizada")}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-50">
                      Orden valorizada (uso interno)
                    </button>
                  )}
                </div>
              )}
              {seleccionado.status === "draft" && (
                <p className="text-xs text-gray-500">
                  La orden formal estará disponible cuando apruebes este pedido.
                </p>
              )}
              {seleccionado.status === "draft" && puedeAprobar && (
                <button type="button" disabled={procesando || cambiosPendientes.length > 0} onClick={() => operar(() => aprobarPedido(seleccionado.id), "Pedido aprobado.")}
                  className="rounded-xl bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">Aprobar pedido</button>
              )}
              {seleccionado.status === "approved" && puedeEnviar && (
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <button type="button" onClick={() => setMostrarCorreo((actual) => !actual)}
                    aria-expanded={mostrarCorreo}
                    className="text-sm font-bold text-gray-900 underline underline-offset-2">
                    {mostrarCorreo ? "Ocultar correo preparado" : "Preparar correo para Outlook"}
                  </button>
                  {mostrarCorreo && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">Preparamos el mensaje, pero no guardamos ni enviamos correos desde el ERP. Revisa el destinatario y adjunta manualmente el PDF.</p>
                      <label className="block text-xs font-semibold text-gray-700">Asunto
                        <input readOnly value={datosCorreoPedido(seleccionado).asunto}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" />
                      </label>
                      <label className="block text-xs font-semibold text-gray-700">Mensaje
                        <textarea readOnly value={datosCorreoPedido(seleccionado).mensaje}
                          rows={8} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" />
                      </label>
                      <button type="button"
                        onClick={() => {
                          const { asunto, mensaje } = datosCorreoPedido(seleccionado);
                          window.location.href = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje.replace(/\n/g, "\r\n"))}`;
                        }}
                        className="rounded-lg border border-gray-800 bg-white px-3 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100">
                        Abrir en mi aplicación de correo
                      </button>
                      <button type="button"
                        onClick={async () => {
                          const { asunto, mensaje } = datosCorreoPedido(seleccionado);
                          try {
                            await navigator.clipboard.writeText(`Asunto: ${asunto}\n\n${mensaje}`);
                            setMensaje("Texto del correo copiado. Pégalo en Outlook y adjunta el PDF antes de enviar.");
                            setError("");
                          } catch {
                            setError("No se pudo copiar automáticamente. Selecciona y copia el asunto y el mensaje.");
                          }
                        }}
                        className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
                        Copiar correo
                      </button>
                      <p className="text-xs text-gray-600">
                        Si Outlook es tu aplicación de correo predeterminada, se abrirá allí. Si usas Outlook web, puedes copiar el mensaje y pegarlo. Antes de enviar, añade el destinatario correcto y el archivo {datosCorreoPedido(seleccionado).archivo}. El envío se registrará posteriormente en el ERP.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {seleccionado.status === "approved" && puedeEnviar && (
                <form className="space-y-2" onSubmit={(event) => {
                  event.preventDefault();
                  operar(() => registrarEnvioPedido(seleccionado.id, evidencia), "Orden registrada como enviada a la editorial.")
                    .then((registrado) => {
                      if (registrado) setFiltros((prev) => ({ ...prev, status: "sent" }));
                    });
                }}>
                  <label className="block text-sm font-semibold text-gray-700">Constancia de envío de la orden a la editorial (correo, fecha y destinatario)
                    <textarea required maxLength="2000" value={evidencia} onChange={(event) => setEvidencia(event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-gray-300 p-3" rows="3" />
                  </label>
                  <p className="text-xs text-gray-500">Registra esta acción solamente después de enviar el PDF por tus medios habituales. No registra salida ni recepción física de libros.</p>
                  <button disabled={procesando || !evidencia.trim()} type="submit"
                    className="rounded-xl bg-gray-950 px-4 py-2 font-bold text-white disabled:opacity-50">Marcar orden enviada</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>}
    </section>
  );
}
