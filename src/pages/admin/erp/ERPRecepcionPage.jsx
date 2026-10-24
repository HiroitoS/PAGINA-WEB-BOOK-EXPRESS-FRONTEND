import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import {
  actualizarRecepcion,
  crearRecepcion,
  consultarSeguimientoRecepcion,
  listarPedidosPorRecibir,
  listarRecepciones,
  validarRecepcion,
} from "../../../api/warehouseApi";

function fechaHoy() {
  return new Date().toLocaleDateString("sv-SE");
}

const documentoInicial = () => ({
  document_type: "guide",
  document_number: "",
  received_on: fechaHoy(),
  notes: "",
});

const estilosCampo = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-600 focus:outline-none";
const estilosBoton = "rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50";

function formatearFechaHora(valor) {
  if (!valor) return "Fecha no disponible";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "Fecha no disponible"
    : fecha.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

function nombreEvento(accion) {
  return {
    created: "Recepción registrada",
    updated: "Borrador corregido",
    validated: "Recepción validada",
  }[accion] || "Acción registrada";
}

function errorLegible(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(" ");
  if (data && typeof data === "object") {
    return Object.values(data).flat().map(String).join(" ");
  }
  return "No se pudo completar la operación. Revisa los datos e inténtalo nuevamente.";
}

function normalizarListado(response) {
  return {
    items: Array.isArray(response) ? response : (response?.results ?? []),
    next: Boolean(response?.next),
  };
}

function EstadoRecepcion({ estado, cumplimiento }) {
  const validada = estado === "validated";
  const completo = validada && cumplimiento === "complete";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${validada ? "border-gray-300 bg-white text-gray-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
        {validada ? "Recepción validada" : "En borrador"}
      </span>
      {validada && (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold ${completo ? "border-green-300 bg-green-100 text-green-900" : "border-amber-300 bg-amber-100 text-amber-950"}`}>
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${completo ? "bg-green-600" : "bg-amber-500"}`} />
          {completo ? "Pedido completo hoy" : "Saldo pendiente hoy"}
        </span>
      )}
    </span>
  );
}

function colorTarjetaRecepcion(recepcion) {
  if (recepcion.status !== "validated") return "border-gray-200 bg-gray-50";
  return recepcion.fulfillment_status === "complete"
    ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50";
}

function validarLineas(lineas) {
  if (!lineas.length) return "Ingresa al menos un producto con mercadería recibida.";
  for (const linea of lineas) {
    const llegada = Number(linea.quantity_arrived);
    const observada = Number(linea.quantity_observed);
    if (!Number.isSafeInteger(llegada) || llegada < 1
      || !Number.isSafeInteger(observada) || observada < 0 || observada > llegada) {
      return "Las cantidades deben ser enteras y la observada no puede exceder la llegada.";
    }
    const aceptada = llegada - observada;
    if (linea.pendientes !== undefined && aceptada > linea.pendientes) {
      return `La cantidad aceptada supera el saldo pendiente de ${linea.producto}.`;
    }
  }
  return "";
}

function SeguimientoPedidos({ data, cargando, error, estado }) {
  if (cargando) return <p role="status" className="text-sm text-gray-600">Consultando entregas y saldos actualizados…</p>;
  if (error) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!data) return null;

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4" aria-label="Seguimiento de pedidos">
      <div>
        <h3 className="font-black text-gray-900">Saldos y entregas por pedido</h3>
        <p className="mt-1 text-xs text-gray-600">
          Datos acumulados de recepciones validadas. Las cantidades de la guía seleccionada
          son definitivas solo si esa recepción está validada.
        </p>
      </div>
      {data.pedidos.map((pedido) => (
        <div key={pedido.pedido_id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
          <div>
            <p className="font-bold text-gray-900">{pedido.colegio}</p>
            <p className="text-xs text-gray-500">{pedido.referencia}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2 text-center">
            <div><p className="text-xs text-gray-600">Solicitadas</p><p className="text-lg font-black tabular-nums">{pedido.solicitadas}</p></div>
            <div><p className="text-xs text-gray-600">Aceptadas total</p><p className="text-lg font-black tabular-nums">{pedido.aceptadas}</p></div>
            <div><p className="text-xs text-gray-600">Saldo actual</p>
              <p className={`text-lg font-black tabular-nums ${pedido.pendientes ? "text-amber-800" : "text-green-800"}`}>{pedido.pendientes}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="min-w-48 py-2 pr-2">Libro</th>
                  <th className="px-2 text-center">Solic.</th>
                  <th className="px-2 text-center">{estado === "validated" ? "Acept. esta guía" : "Prop. aceptación"}</th>
                  <th className="px-2 text-center">Observ. esta guía</th>
                  <th className="px-2 text-center">Acept. total</th>
                  <th className="px-2 text-center">Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {pedido.productos.map((linea) => (
                  <tr key={linea.item_id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-semibold text-gray-900">{linea.producto}</td>
                    <td className="px-2 text-center tabular-nums">{linea.solicitadas}</td>
                    <td className="px-2 text-center tabular-nums">{linea.aceptadas_en_guia}</td>
                    <td className="px-2 text-center tabular-nums">{linea.observadas_en_guia}</td>
                    <td className="px-2 text-center tabular-nums">{linea.aceptadas_acumuladas}</td>
                    <td className={`px-2 text-center font-bold tabular-nums ${linea.pendientes ? "text-amber-800" : "text-green-800"}`}>{linea.pendientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="rounded-lg border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm font-bold text-gray-800">
              Entregas validadas de este pedido ({pedido.entregas.length})
            </summary>
            {pedido.entregas.length === 0 ? (
              <p className="mt-2 text-xs text-gray-600">Aún no hay entregas validadas.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-600">
                    <tr><th className="py-2">Fecha</th><th>Guía / documento</th><th className="text-center">Llegaron</th><th className="text-center">Aceptadas</th><th className="text-center">Observadas</th></tr>
                  </thead>
                  <tbody>
                    {pedido.entregas.map((entrega, index) => (
                      <tr key={entrega.receipt_id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{index + 1}. {entrega.received_on}</td>
                        <td className="pr-2">{entrega.document_number}{entrega.es_recepcion_actual ? " · Esta guía" : ""}</td>
                        <td className="text-center tabular-nums">{entrega.llegaron}</td>
                        <td className="text-center tabular-nums">{entrega.aceptadas}</td>
                        <td className="text-center tabular-nums">{entrega.observadas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </div>
      ))}
    </section>
  );
}

export default function ERPRecepcionPage() {
  const { user } = useAuth();
  const puedeCrear = userHasPermission(user, ["warehouse.manage_receiving"]);
  const puedeValidar = userHasPermission(user, ["warehouse.validate_receiving"]);
  const [pestana, setPestana] = useState("registro");
  const [pedidos, setPedidos] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const [paginaRecepciones, setPaginaRecepciones] = useState(1);
  const [masPedidos, setMasPedidos] = useState(false);
  const [masRecepciones, setMasRecepciones] = useState(false);
  const [revision, setRevision] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [editorial, setEditorial] = useState("");
  const [buscarColegio, setBuscarColegio] = useState("");
  const [pedidosMarcados, setPedidosMarcados] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [documento, setDocumento] = useState(documentoInicial);
  const [recepcionId, setRecepcionId] = useState(null);
  const [edicion, setEdicion] = useState(null);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);
  const [seguimiento, setSeguimiento] = useState(null);
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(false);
  const [errorSeguimiento, setErrorSeguimiento] = useState("");

  useEffect(() => {
    let ignore = false;
    async function consultar() {
      try {
        const [ordenes, entradas] = await Promise.all([
          listarPedidosPorRecibir(), listarRecepciones(),
        ]);
        if (ignore) return;
        const lOrdenes = normalizarListado(ordenes);
        const lEntradas = normalizarListado(entradas);
        setPedidos(lOrdenes.items);
        setRecepciones(lEntradas.items);
        setMasPedidos(lOrdenes.next);
        setMasRecepciones(lEntradas.next);
        setPaginaPedidos(1);
        setPaginaRecepciones(1);
        setError("");
      } catch (err) {
        if (!ignore) setError(errorLegible(err));
      } finally {
        if (!ignore) setCargando(false);
      }
    }
    consultar();
    return () => { ignore = true; };
  }, [revision]);

  useEffect(() => {
    if (pestana !== "historial" || !recepcionId) return;
    let ignore = false;
    async function consultar() {
      try {
        const data = await consultarSeguimientoRecepcion(recepcionId);
        if (!ignore) {
          setSeguimiento(data);
          setErrorSeguimiento("");
        }
      } catch (err) {
        if (!ignore) {
          setSeguimiento(null);
          setErrorSeguimiento(errorLegible(err));
        }
      } finally {
        if (!ignore) setCargandoSeguimiento(false);
      }
    }
    consultar();
    return () => { ignore = true; };
  }, [pestana, recepcionId, revision]);

  const editoriales = useMemo(() => {
    const items = new Map();
    for (const pedido of pedidos) items.set(pedido.editorial_id, pedido.editorial);
    return [...items.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [pedidos]);

  const pedidosVisibles = pedidos.filter((pedido) =>
    (!editorial || String(pedido.editorial_id) === editorial)
    && (!buscarColegio || pedido.colegio.toLocaleLowerCase("es")
      .includes(buscarColegio.toLocaleLowerCase("es")))
  );

  const lineasPreparadas = pedidos
    .filter((pedido) => pedidosMarcados.includes(pedido.id))
    .flatMap((pedido) => pedido.productos.map((producto) => ({
      ...producto,
      pedido: pedido.referencia,
      colegio: pedido.colegio,
    })));

  const resumenSeleccion = pedidos
    .filter((pedido) => pedidosMarcados.includes(pedido.id))
    .reduce((suma, pedido) => {
      const totales = pedido.resumen ?? {
        solicitadas: pedido.productos.reduce((n, linea) => n + linea.solicitadas, 0),
        aceptadas: pedido.productos.reduce((n, linea) => n + linea.aceptadas, 0),
        pendientes: pedido.productos.reduce((n, linea) => n + linea.pendientes, 0),
      };
      return {
        solicitadas: suma.solicitadas + (totales.solicitadas || 0),
        aceptadas: suma.aceptadas + (totales.aceptadas || 0),
        pendientes: suma.pendientes + (totales.pendientes || 0),
      };
    }, { solicitadas: 0, aceptadas: 0, pendientes: 0 });

  const recepcionSeleccionada = recepciones.find((recepcion) => recepcion.id === recepcionId);

  function cambiarEditorial(value) {
    setEditorial(value);
    setPedidosMarcados([]);
    setCantidades({});
  }

  function marcarPedido(pedido) {
    if (procesando) return;
    if (pedidosMarcados.includes(pedido.id)) {
      setPedidosMarcados((actual) => actual.filter((id) => id !== pedido.id));
      return;
    }
    if (pedidosMarcados.length) {
      const anterior = pedidos.find((item) => item.id === pedidosMarcados[0]);
      if (anterior?.editorial_id !== pedido.editorial_id) {
        setError("Cada recepción corresponde a una sola editorial.");
        return;
      }
    }
    setPedidosMarcados((actual) => [...actual, pedido.id]);
    setError("");
  }

  function cambiarCantidad(itemId, campo, value) {
    setCantidades((actual) => ({
      ...actual,
      [itemId]: { ...actual[itemId], [campo]: value },
    }));
  }

  async function cargarMas(tipo) {
    if (procesando) return;
    setProcesando(true);
    setError("");
    try {
      if (tipo === "pedidos") {
        const response = normalizarListado(await listarPedidosPorRecibir(paginaPedidos + 1));
        setPedidos((actual) => {
          const encontrados = new Map([...actual, ...response.items].map((pedido) => [pedido.id, pedido]));
          return [...encontrados.values()];
        });
        setPaginaPedidos((actual) => actual + 1);
        setMasPedidos(response.next);
      } else {
        const response = normalizarListado(await listarRecepciones(paginaRecepciones + 1));
        setRecepciones((actual) => {
          const encontrados = new Map([...actual, ...response.items].map((recepcion) => [recepcion.id, recepcion]));
          return [...encontrados.values()];
        });
        setPaginaRecepciones((actual) => actual + 1);
        setMasRecepciones(response.next);
      }
    } catch (err) {
      setError(errorLegible(err));
    } finally {
      setProcesando(false);
    }
  }

  async function registrarBorrador(event) {
    event.preventDefault();
    if (procesando) return;
    const ordenes = pedidos.filter((pedido) => pedidosMarcados.includes(pedido.id));
    const lineas = lineasPreparadas
      .filter((linea) => String(cantidades[linea.item_id]?.llegada ?? "").trim() !== "")
      .map((linea) => {
        const llegada = Number(cantidades[linea.item_id].llegada);
        const observada = Number(cantidades[linea.item_id]?.observada ?? 0);
        return {
          order_item_id: linea.item_id,
          quantity_arrived: llegada,
          quantity_observed: observada,
          quantity_accepted: llegada - observada,
          pendientes: linea.pendientes,
          producto: linea.producto,
        };
      });
    const validacion = validarLineas(lineas);
    if (!ordenes.length || validacion) {
      setError(validacion || "Selecciona al menos un pedido de la editorial.");
      return;
    }
    setProcesando(true);
    setError("");
    setMensaje("");
    try {
      const creada = await crearRecepcion({
        ...documento,
        provider_id: ordenes[0].editorial_id,
        lines: lineas.map(({ order_item_id, quantity_arrived, quantity_observed, quantity_accepted }) => ({
          order_item_id, quantity_arrived, quantity_observed, quantity_accepted,
        })),
      });
      setRecepcionId(creada.id);
      setEdicion({
        provider_id: creada.provider,
        document_type: creada.document_type,
        document_number: creada.document_number,
        received_on: creada.received_on,
        notes: creada.notes,
        lines: creada.lines.map((linea) => ({
          order_item_id: linea.order_item,
          nombre: linea.product_name,
          pedido: linea.order_id,
          quantity_arrived: String(linea.quantity_arrived),
          quantity_observed: String(linea.quantity_observed),
          notes: linea.notes,
        })),
      });
      setDocumento(documentoInicial());
      setCantidades({});
      setPedidosMarcados([]);
      setPestana("historial");
      setMensaje("Recepción guardada en borrador. Revísala y valídala cuando las cantidades estén verificadas.");
      setCargando(true);
      setRevision((actual) => actual + 1);
    } catch (err) {
      setError(errorLegible(err));
    } finally {
      setProcesando(false);
    }
  }

  function abrirRecepcion(recepcion) {
    setSeguimiento(null);
    setCargandoSeguimiento(true);
    setErrorSeguimiento("");
    setRecepcionId(recepcion.id);
    setConfirmacionAbierta(false);
    setCambiosSinGuardar(false);
    setEdicion({
      provider_id: recepcion.provider,
      document_type: recepcion.document_type,
      document_number: recepcion.document_number,
      received_on: recepcion.received_on,
      notes: recepcion.notes,
      lines: recepcion.lines.map((linea) => ({
        order_item_id: linea.order_item,
        nombre: linea.product_name,
        pedido: linea.order_id,
        quantity_arrived: String(linea.quantity_arrived),
        quantity_observed: String(linea.quantity_observed),
        notes: linea.notes,
      })),
    });
  }

  function modificarLinea(index, campo, value) {
    setCambiosSinGuardar(true);
    setEdicion((actual) => ({
      ...actual,
      lines: actual.lines.map((linea, posicion) =>
        posicion === index ? { ...linea, [campo]: value } : linea),
    }));
  }

  async function guardarBorrador(event) {
    event.preventDefault();
    if (!edicion || !recepcionSeleccionada || procesando) return;
    const lineas = edicion.lines.map((linea) => ({
      ...linea,
      producto: linea.nombre,
    }));
    const errorLineas = validarLineas(lineas);
    if (errorLineas) { setError(errorLineas); return; }
    setProcesando(true);
    setError("");
    setMensaje("");
    try {
      await actualizarRecepcion(recepcionId, {
        provider_id: edicion.provider_id,
        document_type: edicion.document_type,
        document_number: edicion.document_number,
        received_on: edicion.received_on,
        notes: edicion.notes,
        lines: edicion.lines.map((linea) => ({
          order_item_id: linea.order_item_id,
          quantity_arrived: Number(linea.quantity_arrived),
          quantity_observed: Number(linea.quantity_observed),
          quantity_accepted: Number(linea.quantity_arrived) - Number(linea.quantity_observed),
          notes: linea.notes,
        })),
      });
      setCambiosSinGuardar(false);
      setMensaje("Borrador corregido y guardado.");
      setCargando(true);
      setRevision((actual) => actual + 1);
    } catch (err) { setError(errorLegible(err)); }
    finally { setProcesando(false); }
  }

  async function confirmarValidacion() {
    if (!recepcionSeleccionada || procesando || !puedeValidar || !confirmacionAbierta) return;
    setProcesando(true);
    setError("");
    setMensaje("");
    try {
      await validarRecepcion(recepcionSeleccionada.id);
      setMensaje("Recepción validada. Los saldos pendientes de los pedidos fueron actualizados. El stock se controlará en Inventario.");
      setEdicion(null);
      setConfirmacionAbierta(false);
      setCargando(true);
      setRevision((actual) => actual + 1);
    } catch (err) { setError(errorLegible(err)); }
    finally { setProcesando(false); }
  }

  function solicitarValidacion() {
    if (cambiosSinGuardar) {
      setError("Guarda las correcciones de cantidades o documento antes de validar.");
      return;
    }
    if (!recepcionSeleccionada || recepcionSeleccionada.status !== "draft") return;
    setError("");
    setConfirmacionAbierta(true);
  }

  const totalLlegado = edicion?.lines.reduce((sum, linea) =>
    sum + Number(linea.quantity_arrived), 0) ?? 0;
  const totalObservado = edicion?.lines.reduce((sum, linea) =>
    sum + Number(linea.quantity_observed), 0) ?? 0;
  const totalAceptado = totalLlegado - totalObservado;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
        <h1 className="mt-1 text-2xl font-black text-gray-950">Recepción de Mercadería</h1>
        <p className="mt-1 text-sm text-gray-600">
          Contrasta los pedidos enviados con los libros recibidos. Registra entregas parciales, observaciones y saldos pendientes.
        </p>
      </header>

      <div role="tablist" aria-label="Secciones de recepción" className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2">
        {[
          ["registro", "Pedidos pendientes"],
          ["historial", "Recepciones registradas"],
        ].map(([value, label]) => (
          <button key={value} role="tab" aria-selected={pestana === value}
            type="button" onClick={() => { setPestana(value); setError(""); }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${pestana === value ? "bg-red-700 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800">{mensaje}</p>}
      {cargando && <p className="text-sm text-gray-600">Actualizando registros…</p>}

      {pestana === "registro" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-3">
            <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <label className="text-sm font-semibold text-gray-700">Editorial
                <select value={editorial} onChange={(event) => cambiarEditorial(event.target.value)} className={`mt-1 ${estilosCampo}`}>
                  <option value="">Todas las editoriales</option>
                  {editoriales.map(([id, nombre]) => <option key={id} value={String(id)}>{nombre}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">Colegio
                <input type="search" value={buscarColegio} onChange={(event) => setBuscarColegio(event.target.value)}
                  placeholder="Buscar colegio" className={`mt-1 ${estilosCampo}`} />
              </label>
            </div>
            <div className="space-y-2">
              {pedidosVisibles.length === 0 && !cargando && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                  No hay pedidos enviados con unidades pendientes en esta búsqueda.
                </div>
              )}
              {pedidosVisibles.map((pedido) => (
                <label key={pedido.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${pedidosMarcados.includes(pedido.id) ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                  <input type="checkbox" checked={pedidosMarcados.includes(pedido.id)}
                    disabled={!puedeCrear || procesando}
                    onChange={() => marcarPedido(pedido)}
                    className="mt-1 h-4 w-4 accent-red-700" />
                  <span className="min-w-0">
                    <span className="block font-bold text-gray-950">{pedido.editorial}</span>
                    <span className="block text-sm text-gray-700">{pedido.colegio}</span>
                    <span className="block text-xs text-gray-500">{pedido.referencia} · {pedido.campania}</span>
                    <span className="mt-1 block text-xs font-semibold text-amber-800">
                      {pedido.productos.reduce((suma, linea) => suma + linea.pendientes, 0)} unidades pendientes
                    </span>
                  </span>
                </label>
              ))}
              {masPedidos && (
                <button type="button" onClick={() => cargarMas("pedidos")} disabled={procesando}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Ver más pedidos
                </button>
              )}
            </div>
          </div>

          <form onSubmit={registrarBorrador} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 xl:col-span-2">
            <div>
              <h2 className="font-black text-gray-950">Registrar entrega física</h2>
              <p className="mt-1 text-sm text-gray-600">Selecciona pedidos de una misma editorial. Una guía puede corresponder a varios colegios.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold text-gray-700">Documento recibido
                <select className={`mt-1 ${estilosCampo}`} value={documento.document_type}
                  onChange={(event) => setDocumento((actual) => ({ ...actual, document_type: event.target.value }))} disabled={!puedeCrear}>
                  <option value="guide">Guía de remisión</option>
                  <option value="invoice">Factura (referencia física)</option>
                  <option value="other">Otro documento</option>
                </select>
              </label>
              <label className="text-xs font-bold text-gray-700">Número del documento
                <input className={`mt-1 ${estilosCampo}`} value={documento.document_number} maxLength={100}
                  onChange={(event) => setDocumento((actual) => ({ ...actual, document_number: event.target.value }))}
                  placeholder="Serie y número" disabled={!puedeCrear} />
              </label>
              <label className="text-xs font-bold text-gray-700">Fecha de recepción
                <input type="date" className={`mt-1 ${estilosCampo}`} value={documento.received_on}
                  onChange={(event) => setDocumento((actual) => ({ ...actual, received_on: event.target.value }))} disabled={!puedeCrear} />
              </label>
            </div>

            {lineasPreparadas.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Marca uno o varios pedidos de la izquierda para registrar sus productos.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                  <div><p className="text-xs text-gray-600">Solicitadas</p><p className="text-lg font-black">{resumenSeleccion.solicitadas}</p></div>
                  <div><p className="text-xs text-gray-600">Aceptadas anteriormente</p><p className="text-lg font-black">{resumenSeleccion.aceptadas}</p></div>
                  <div><p className="text-xs text-gray-600">Pendientes</p><p className="text-lg font-black text-amber-800">{resumenSeleccion.pendientes}</p></div>
                </div>
                <p className="text-xs text-gray-500">El resumen es acumulado por pedido. Solo las recepciones validadas cuentan como aceptadas.</p>
                <div key={pedidosMarcados.join("-")} className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs text-gray-600">
                    <tr>
                       <th className="sticky left-0 z-10 min-w-64 bg-white py-2 pr-3">Producto / pedido</th>
                       <th className="px-2 text-center">Solicitadas</th>
                       <th className="px-2 text-center">Aceptadas prev.</th>
                       <th className="px-2 text-center">Pendiente</th>
                       <th className="px-2">Llegaron hoy</th>
                       <th className="px-2">Observadas</th>
                       <th className="px-2 text-center">Aceptadas hoy</th>
                       <th className="px-2 text-center">Saldo después</th>
                     </tr>
                  </thead>
                  <tbody>
                    {lineasPreparadas.map((linea) => {
                      const llegada = cantidades[linea.item_id]?.llegada ?? "";
                      const observada = cantidades[linea.item_id]?.observada ?? "0";
                      const aceptadas = llegada === "" ? "—" : Number(llegada) - Number(observada);
                      const excedente = llegada === "" ? 0 : Math.max(0, Number(llegada) - linea.pendientes);
                      return (
                        <tr key={linea.item_id} className="border-b border-gray-100">
                          <td className="sticky left-0 z-10 min-w-64 bg-white py-2 pr-3">
                            <span className="block font-semibold text-gray-900">{linea.producto}</span>
                            <span className="text-xs text-gray-500">{linea.colegio} · {linea.pedido}</span>
                            {excedente > 0 && (
                              <span className="mt-1 block text-xs font-semibold text-amber-800">
                                Excedente: {excedente}. Regístralo como observado e indica el motivo.
                              </span>
                            )}
                          </td>
                          <td className="px-2 text-center tabular-nums">{linea.solicitadas}</td>
                           <td className="px-2 text-center tabular-nums">{linea.aceptadas}</td>
                           <td className="px-2 text-center font-semibold tabular-nums text-amber-800">{linea.pendientes}</td>
                          <td className="px-2"><input aria-label={`Llegaron ${linea.producto} ${linea.pedido}`} type="number" min="0" step="1"
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5" value={llegada}
                            onChange={(event) => cambiarCantidad(linea.item_id, "llegada", event.target.value)} disabled={!puedeCrear || procesando} /></td>
                          <td className="px-2"><input aria-label={`Observadas ${linea.producto} ${linea.pedido}`} type="number" min="0" step="1"
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5" value={observada}
                            onChange={(event) => cambiarCantidad(linea.item_id, "observada", event.target.value)} disabled={!puedeCrear || procesando} /></td>
                          <td className={`px-2 text-center font-bold tabular-nums ${Number(aceptadas) > linea.pendientes ? "text-red-700" : "text-gray-900"}`}>{aceptadas}</td>
                           <td className={`px-2 text-center font-bold tabular-nums ${llegada !== "" && Number(aceptadas) > linea.pendientes ? "text-red-700" : "text-gray-900"}`}>
                             {llegada === "" ? "—" : Math.max(0, linea.pendientes - Number(aceptadas))}
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
            <label className="block text-xs font-bold text-gray-700">Observaciones generales
              <textarea className={`mt-1 ${estilosCampo}`} rows={2} value={documento.notes}
                onChange={(event) => setDocumento((actual) => ({ ...actual, notes: event.target.value }))}
                placeholder="Ej.: cajas deterioradas, faltantes comunicados a la editorial" disabled={!puedeCrear} />
            </label>
            <p className="text-xs text-gray-500">
              Las unidades recibidas de más deben registrarse como observadas con una explicación.
              No incrementan el pedido ni generan stock. El borrador no significa disponibilidad.
            </p>
            {puedeCrear && <button type="submit" className={estilosBoton} disabled={procesando || !pedidosMarcados.length}>Guardar recepción en borrador</button>}
          </form>
        </div>
      )}

      {pestana === "historial" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs text-gray-600">El color indica el saldo actual de los pedidos relacionados, no cómo llegó la guía original. Amarillo: pendiente · Verde: completo · Gris: borrador.</p>
            {recepciones.length === 0 && !cargando && (
              <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">Todavía no se registraron recepciones.</p>
            )}
            {recepciones.map((recepcion) => (
              <button type="button" key={recepcion.id} onClick={() => abrirRecepcion(recepcion)}
                className={`w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${colorTarjetaRecepcion(recepcion)} ${recepcionId === recepcion.id ? "ring-2 ring-red-600 ring-offset-1" : ""}`}>
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-gray-950">{recepcion.provider_name}</strong>
                  <EstadoRecepcion estado={recepcion.status} cumplimiento={recepcion.fulfillment_status} />
                </span>
                <span className="mt-1 block text-sm text-gray-700">{recepcion.document_number || "Sin número de documento"}</span>
                <span className="block text-xs text-gray-500">
                   {recepcion.received_on} · {recepcion.lines.length} producto(s)
                   {" · "}{recepcion.lines.reduce((suma, linea) => suma + linea.quantity_accepted, 0)}
                   {recepcion.status === "validated" ? " aceptadas en esta guía" : " propuestas de aceptación"}
                 </span>
              </button>
            ))}
            {masRecepciones && (
              <button type="button" onClick={() => cargarMas("recepciones")} disabled={procesando}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700">
                Ver más recepciones
              </button>
            )}
          </div>

          <div className="xl:col-span-2">
            {!recepcionSeleccionada ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-7 text-center text-sm text-gray-500">Selecciona una recepción para revisar sus cantidades.</div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-gray-950">{recepcionSeleccionada.provider_name}</h2>
                    <p className="text-xs text-gray-600">Recepción N.º {recepcionSeleccionada.id} · {recepcionSeleccionada.received_on}</p>
                  </div>
                  <EstadoRecepcion estado={recepcionSeleccionada.status} cumplimiento={recepcionSeleccionada.fulfillment_status} />
                </div>
                {recepcionSeleccionada.status === "validated" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      <strong>Documento:</strong> {recepcionSeleccionada.document_number}
                    </p>
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                      <div><p className="text-xs text-gray-600">Llegaron en esta guía</p>
                        <p className="text-lg font-black tabular-nums">
                          {recepcionSeleccionada.lines.reduce((suma, linea) => suma + linea.quantity_arrived, 0)}
                        </p>
                      </div>
                      <div><p className="text-xs text-gray-600">Aceptadas en esta guía</p>
                        <p className="text-lg font-black tabular-nums">
                          {recepcionSeleccionada.lines.reduce((suma, linea) => suma + linea.quantity_accepted, 0)}
                        </p>
                      </div>
                      <div><p className="text-xs text-gray-600">Observadas en esta guía</p>
                        <p className="text-lg font-black tabular-nums">
                          {recepcionSeleccionada.lines.reduce((suma, linea) => suma + linea.quantity_observed, 0)}
                        </p>
                      </div>
                    </div>
                    <details className="rounded-lg border border-gray-200 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gray-700">
                        Ver solo los productos de esta guía ({recepcionSeleccionada.lines.length})
                      </summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead><tr className="border-b text-xs text-gray-500"><th className="py-2">Producto</th><th>Llegaron</th><th>Aceptadas</th><th>Observadas</th></tr></thead>
                          <tbody>{recepcionSeleccionada.lines.map((linea) => (
                            <tr key={linea.id} className="border-b border-gray-100">
                              <td className="py-2 font-semibold">{linea.product_name}
                                <span className="block text-xs font-normal text-gray-500">Pedido BE-OC-{String(linea.order_id).padStart(6, "0")}</span>
                              </td>
                              <td>{linea.quantity_arrived}</td>
                              <td>{linea.quantity_accepted}</td>
                              <td>{linea.quantity_observed}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </details>
                    <p className="text-xs text-gray-600">
                      Recepción validada. Estas cantidades son de esta guía; los saldos actuales y las entregas anteriores o posteriores aparecen abajo.
                      Aún no registra stock ni facturas.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={guardarBorrador} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-xs font-bold text-gray-700">Documento
                        <select className={`mt-1 ${estilosCampo}`} value={edicion?.document_type ?? ""}
                          disabled={!puedeCrear} onChange={(event) => { setCambiosSinGuardar(true); setEdicion((actual) => ({ ...actual, document_type: event.target.value })); }}>
                          <option value="guide">Guía de remisión</option>
                          <option value="invoice">Factura (referencia física)</option>
                          <option value="other">Otro documento</option>
                        </select>
                      </label>
                      <label className="text-xs font-bold text-gray-700">Número
                        <input className={`mt-1 ${estilosCampo}`} value={edicion?.document_number ?? ""}
                          onChange={(event) => { setCambiosSinGuardar(true); setEdicion((actual) => ({ ...actual, document_number: event.target.value })); }} disabled={!puedeCrear} />
                      </label>
                      <label className="text-xs font-bold text-gray-700">Fecha
                        <input className={`mt-1 ${estilosCampo}`} type="date" value={edicion?.received_on ?? ""}
                          onChange={(event) => { setCambiosSinGuardar(true); setEdicion((actual) => ({ ...actual, received_on: event.target.value })); }} disabled={!puedeCrear} />
                      </label>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-80 text-left text-sm">
                        <thead><tr className="border-b text-xs text-gray-500"><th className="py-2">Producto / pedido</th><th>Llegaron</th><th>Observadas</th><th>Aceptadas</th></tr></thead>
                        <tbody>{edicion?.lines.map((linea, index) => (
                          <tr key={linea.order_item_id} className="border-b border-gray-100">
                            <td className="py-2 pr-3 font-semibold">{linea.nombre}<span className="block text-xs font-normal text-gray-500">Pedido BE-OC-{String(linea.pedido).padStart(6, "0")}</span></td>
                            <td><input type="number" min="1" step="1" className="w-20 rounded-lg border border-gray-300 p-2"
                              aria-label={`Llegaron ${linea.nombre}`} value={linea.quantity_arrived} disabled={!puedeCrear}
                              onChange={(event) => modificarLinea(index, "quantity_arrived", event.target.value)} /></td>
                            <td><input type="number" min="0" step="1" className="w-20 rounded-lg border border-gray-300 p-2"
                              aria-label={`Observadas ${linea.nombre}`} value={linea.quantity_observed} disabled={!puedeCrear}
                              onChange={(event) => modificarLinea(index, "quantity_observed", event.target.value)} /></td>
                            <td>{Number(linea.quantity_arrived) - Number(linea.quantity_observed)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <label className="block text-xs font-bold text-gray-700">Observaciones
                      <textarea className={`mt-1 ${estilosCampo}`} rows={2} value={edicion?.notes ?? ""}
                        onChange={(event) => { setCambiosSinGuardar(true); setEdicion((actual) => ({ ...actual, notes: event.target.value })); }} disabled={!puedeCrear} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {puedeCrear && <button type="submit" className={estilosBoton} disabled={procesando}>Guardar correcciones</button>}
                      {puedeValidar && <button type="button" onClick={solicitarValidacion} disabled={procesando || cambiosSinGuardar}
                        className="rounded-lg border border-gray-900 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-50">
                        Validar recepción
                      </button>}
                    </div>
                    <p className="text-xs text-gray-500">Valida únicamente después de contrastar la mercadería física y el documento. Esta acción no registra stock.</p>
                  </form>
                )}
                {recepcionSeleccionada.status === "validated" && recepcionSeleccionada.notes && (
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                    <strong>Observaciones:</strong> {recepcionSeleccionada.notes}
                  </p>
                )}
                <SeguimientoPedidos data={seguimiento} cargando={cargandoSeguimiento}
                  error={errorSeguimiento} estado={recepcionSeleccionada.status} />
                <details className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-gray-800">
                    Historial de registro y validación
                    {recepcionSeleccionada.events?.length ? ` (${recepcionSeleccionada.events.length})` : ""}
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-gray-700">
                    <p>
                      <strong>Registrada por:</strong> {recepcionSeleccionada.created_by_name || "No identificado"}
                      {" · "}{formatearFechaHora(recepcionSeleccionada.created_at)}
                    </p>
                    {recepcionSeleccionada.validated_at && (
                      <p>
                        <strong>Validada por:</strong> {recepcionSeleccionada.validated_by_name || "No identificado"}
                        {" · "}{formatearFechaHora(recepcionSeleccionada.validated_at)}
                      </p>
                    )}
                    {recepcionSeleccionada.events?.length > 0 && (
                      <ol className="space-y-1 border-l-2 border-gray-300 pl-3">
                        {recepcionSeleccionada.events.map((evento) => (
                          <li key={evento.id}>
                            <strong>{nombreEvento(evento.action)}</strong>
                            {" · "}{evento.actor_name || "Usuario no identificado"}
                            {" · "}{formatearFechaHora(evento.created_at)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmacionAbierta && recepcionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 py-6">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-recepcion-titulo"
            aria-describedby="confirmar-recepcion-descripcion"
            onKeyDown={(event) => { if (event.key === "Escape" && !procesando) setConfirmacionAbierta(false); }}
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Confirmación de almacén</p>
            <h2 id="confirmar-recepcion-titulo" className="mt-1 text-xl font-black text-gray-950">
              Validar recepción física
            </h2>
            <p id="confirmar-recepcion-descripcion" className="mt-2 text-sm text-gray-700">
              Confirmarás las cantidades verificadas de <strong>{recepcionSeleccionada.provider_name}</strong>,
              documento <strong>{recepcionSeleccionada.document_number}</strong>.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
              <div><p className="text-xs text-gray-600">Llegaron</p><p className="text-lg font-black">{totalLlegado}</p></div>
              <div><p className="text-xs text-gray-600">Aceptadas</p><p className="text-lg font-black">{totalAceptado}</p></div>
              <div><p className="text-xs text-gray-600">Observadas</p><p className="text-lg font-black">{totalObservado}</p></div>
            </div>
            <p className="mt-3 text-sm text-amber-900">
              Después de validar, no podrás editar este documento desde la pantalla.
              Los saldos se actualizarán, pero esto no registra stock ni facturas.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" autoFocus disabled={procesando}
                onClick={() => setConfirmacionAbierta(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                Revisar nuevamente
              </button>
              <button type="button" disabled={procesando} onClick={confirmarValidacion} className={estilosBoton}>
                Confirmar recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
