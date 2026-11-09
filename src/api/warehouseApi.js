import axiosClient from "./axiosClient";

const BASE = "/admin/erp/almacen/recepciones";

export async function listarPedidosPorRecibir(page = 1) {
  const { data } = await axiosClient.get(`${BASE}/pedidos-pendientes/`, {
    params: { page },
  });
  return data;
}

export async function listarRecepciones(page = 1) {
  const { data } = await axiosClient.get(`${BASE}/`, {
    params: { page },
  });
  return data;
}

export async function crearRecepcion(payload) {
  const { data } = await axiosClient.post(`${BASE}/crear/`, payload);
  return data;
}

export async function actualizarRecepcion(id, payload) {
  const { data } = await axiosClient.post(`${BASE}/${id}/actualizar/`, payload);
  return data;
}

export async function validarRecepcion(id) {
  const { data } = await axiosClient.post(`${BASE}/${id}/validar/`, {});
  return data;
}

export async function consultarSeguimientoRecepcion(id) {
  const { data } = await axiosClient.get(`${BASE}/${id}/seguimiento/`);
  return data;
}

export async function consultarSaldoPedido(id) {
  const { data } = await axiosClient.get(`${BASE}/saldos/`, {
    params: { pedido: id },
  });
  return data;
}

const INVENTORY_BASE = "/admin/erp/almacen/inventario";

export async function consultarExistencias() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/existencias/`);
  return data;
}

export async function consultarResumenInventario() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/resumen/`);
  return data;
}

export async function consultarValorizacionPorEditorial() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/resumen-por-editorial/`);
  return data;
}

export async function listarEntradasInventario() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/`);
  return data;
}

export async function registrarEntradaInventario(receiptId) {
  const { data } = await axiosClient.post(`${INVENTORY_BASE}/registrar-entrada/`, { receipt_id: receiptId });
  return data;
}

export async function listarSalidasInventario() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/salidas/`);
  return data;
}

export async function buscarEntradasParaCortesia(q = "", page = 1) {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/entradas-disponibles/`, {
    params: { q, page },
  });
  return data;
}

export async function registrarCortesiaInventario(payload) {
  const { data } = await axiosClient.post(`${INVENTORY_BASE}/cortesias/`, payload);
  return data;
}

const LOCATION_BASE = "/admin/erp/almacen/ubicaciones";

export async function listarUbicacionesAlmacen() {
  const { data } = await axiosClient.get(`${LOCATION_BASE}/`);
  return data;
}

export async function crearUbicacionAlmacen(payload) {
  const { data } = await axiosClient.post(`${LOCATION_BASE}/`, payload);
  return data;
}

export async function actualizarUbicacionAlmacen(id, payload) {
  const { data } = await axiosClient.patch(`${LOCATION_BASE}/${id}/`, payload);
  return data;
}


export async function consultarResumenUbicaciones() {
  const { data } = await axiosClient.get(`${LOCATION_BASE}/resumen-ubicaciones/`);
  return data;
}

export async function listarPendientesUbicacion({ q = "", page = 1 } = {}) {
  const { data } = await axiosClient.get(`${LOCATION_BASE}/pendientes-asignacion/`, {
    params: { q, page },
  });
  return data;
}

export async function conciliarUbicacion(id, entryIds, notes = "") {
  const { data } = await axiosClient.post(`${LOCATION_BASE}/${id}/conciliar/`, {
    entry_ids: entryIds,
    confirmado_fisicamente: true,
    notes,
  });
  return data;
}


const TRANSFERS_BASE = "/admin/erp/almacen/traslados";

export async function buscarLotesParaTraslado({ sourceId, q = "", page = 1 }) {
  const { data } = await axiosClient.get(`${TRANSFERS_BASE}/lotes/`, {
    params: { source_id: sourceId, q, page },
  });
  return data;
}

export async function listarTrasladosAlmacen(page = 1, filters = {}) {
  const params = { page };
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      params[key] = value;
    }
  }
  const { data } = await axiosClient.get(`${TRANSFERS_BASE}/`, { params });
  return data;
}

export async function registrarTrasladoAlmacen(payload) {
  const { data } = await axiosClient.post(`${TRANSFERS_BASE}/`, payload);
  return data;
}

export async function consultarLotesDeGuia({ receiptId, sourceId }) {
  const { data } = await axiosClient.get(`${TRANSFERS_BASE}/guia/`, {
    params: { receipt_id: receiptId, source_id: sourceId },
  });
  return data;
}

export async function registrarTrasladoPorGuia(payload) {
  const { data } = await axiosClient.post(`${TRANSFERS_BASE}/por-guia/`, payload);
  return data;
}


const INTERNAL_REQUEST_BASE = "/admin/erp/almacen/solicitudes-internas";

export async function listarSolicitudesMercaderia(page = 1, status = "") {
  const { data } = await axiosClient.get(`${INTERNAL_REQUEST_BASE}/`, {
    params: { page, ...(status ? { status } : {}) },
  });
  return data;
}

export async function listarUbicacionesParaSolicitud() {
  const { data } = await axiosClient.get(`${INTERNAL_REQUEST_BASE}/ubicaciones/`);
  return data;
}

export async function buscarLibrosParaSolicitud(q) {
  const { data } = await axiosClient.get(`${INTERNAL_REQUEST_BASE}/productos/`, {
    params: { q },
  });
  return data;
}

export async function crearSolicitudMercaderia(payload) {
  const { data } = await axiosClient.post(`${INTERNAL_REQUEST_BASE}/`, payload);
  return data;
}

export async function resolverSolicitudMercaderia(id, action, note = "") {
  if (!["aprobar", "rechazar", "anular"].includes(action)) {
    throw new Error("Acción de solicitud no válida.");
  }
  const { data } = await axiosClient.post(
    `${INTERNAL_REQUEST_BASE}/${id}/${action}/`,
    { note },
  );
  return data;
}
