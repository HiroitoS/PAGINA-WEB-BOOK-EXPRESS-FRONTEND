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

export async function obtenerRecepcion(id) {
  const { data } = await axiosClient.get(`${BASE}/${id}/`);
  return data;
}

export async function listarRecepcionesPendientesAprobacion() {
  const { data } = await axiosClient.get(`${BASE}/pendientes-aprobacion/`);
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

export async function listarEvidenciasRecepcion(id) {
  const { data } = await axiosClient.get(`${BASE}/${id}/evidencias/`);
  return data;
}

export async function subirEvidenciaRecepcion(id, { lineId, kind, description, file }) {
  const form = new FormData();
  form.append("receipt_line_id", String(lineId));
  form.append("kind", kind);
  form.append("description", description);
  form.append("file", file);
  const { data } = await axiosClient.post(`${BASE}/${id}/evidencias/`, form);
  return data;
}

export async function descargarEvidenciaRecepcion(id, evidenceId) {
  const { data } = await axiosClient.get(
    `${BASE}/${id}/evidencias/${evidenceId}/archivo/`,
    { responseType: "blob" },
  );
  return data;
}

export async function prepararReporteEditorial(id) {
  const { data } = await axiosClient.get(`${BASE}/${id}/reporte-editorial/`);
  return data;
}

export async function enviarReporteEditorial(id, recipient, dispatchKey) {
  const { data } = await axiosClient.post(`${BASE}/${id}/reporte-editorial/`, {
    recipient, dispatch_key: dispatchKey,
  });
  return data;
}

export async function solicitarAprobacionRecepcion(id) {
  const { data } = await axiosClient.post(`${BASE}/${id}/solicitar-aprobacion/`, {});
  return data;
}

export async function devolverRecepcion(id, reason) {
  const { data } = await axiosClient.post(`${BASE}/${id}/devolver/`, { reason });
  return data;
}

export async function validarRecepcion(id) {
  const { data } = await axiosClient.post(`${BASE}/${id}/validar/`, {});
  return data;
}

export async function anularBorradorRecepcion(id, reason) {
  const { data } = await axiosClient.post(`${BASE}/${id}/anular-borrador/`, {
    reason,
  });
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

export async function consultarInventarioConsolidado(params = {}) {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/consolidado/`, {
    params,
  });
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

const FAIR_BASE = "/admin/erp/almacen/ferias";

export async function listarFeriasAlmacen() {
  const { data } = await axiosClient.get(`${FAIR_BASE}/`);
  return data;
}

export async function registrarFeriaAlmacen(payload) {
  const { data } = await axiosClient.post(`${FAIR_BASE}/`, payload);
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


export async function consultarAlertasReposicion(locationId) {
  const { data } = await axiosClient.get(`${LOCATION_BASE}/alertas-reposicion/`, {
    params: { location_id: locationId },
  });
  return data;
}

export async function consultarSeguimientoConsignaciones() {
  const { data } = await axiosClient.get(
    `${LOCATION_BASE}/seguimiento-consignaciones/`,
  );
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

export async function buscarLotesParaTraslado({
  sourceId, q = "", page = 1, providerId = "", schoolId = "", receiptId = "",
}) {
  const { data } = await axiosClient.get(`${TRANSFERS_BASE}/lotes/`, {
    params: {
      source_id: sourceId, q, page,
      ...(providerId ? { provider_id: providerId } : {}),
      ...(schoolId ? { school_id: schoolId } : {}),
      ...(receiptId ? { receipt_id: receiptId } : {}),
    },
  });
  return data;
}

export async function consultarFiltrosLotesTraslado(sourceId) {
  const { data } = await axiosClient.get(`${TRANSFERS_BASE}/lotes-filtros/`, {
    params: { source_id: sourceId },
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

const DISTRIBUTION_BASE = "/admin/erp/almacen/operaciones-distribucion";

export async function listarDistribuciones(page = 1, estado = "") {
  const { data } = await axiosClient.get(`${DISTRIBUTION_BASE}/`, {
    params: { page, ...(estado ? { estado } : {}) },
  });
  return data;
}

export async function opcionesDistribucion({ buscar = "", anio = "", page = 1 } = {}) {
  const { data } = await axiosClient.get(`${DISTRIBUTION_BASE}/opciones/`, {
    params: { buscar, anio, page },
  });
  return data;
}

export async function consultarAsignacionDistribucion(adoptionId, operationId = null) {
  const { data } = await axiosClient.get(`${DISTRIBUTION_BASE}/asignacion/`, {
    params: {
      adoption_id: adoptionId,
      ...(operationId ? { operation_id: operationId } : {}),
    },
  });
  return data;
}

export async function crearDistribucion(payload) {
  const { data } = await axiosClient.post(`${DISTRIBUTION_BASE}/`, payload);
  return data;
}

export async function actualizarDistribucion(id, payload) {
  const { data } = await axiosClient.patch(`${DISTRIBUTION_BASE}/${id}/`, payload);
  return data;
}

export async function anularDistribucion(id, reason) {
  const { data } = await axiosClient.post(`${DISTRIBUTION_BASE}/${id}/anular/`, { reason });
  return data;
}

export async function corregirDestinoFeriaPreparada(id, destinationId, reason, verified) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/corregir-destino-feria/`,
    { destination_id: destinationId, reason, fair_verified_for_delivery: verified },
  );
  return data;
}

export async function consultarDocumentoInterno(id) {
  const { data } = await axiosClient.get(`${DISTRIBUTION_BASE}/${id}/documento-interno/`);
  return data;
}

export async function crearDocumentoInterno(id, idempotencyKey) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/documento-interno/`,
    { idempotency_key: idempotencyKey },
  );
  return data;
}

export async function confirmarSalidaInterna(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/confirmar-salida/`, payload,
  );
  return data;
}

export async function confirmarLlegadaInterna(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/confirmar-llegada/`, payload,
  );
  return data;
}

export async function registrarDiferenciaLlegada(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/registrar-diferencia-llegada/`, payload,
  );
  return data;
}

export async function prepararRetornoDestino(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/preparar-retorno-destino/`, payload,
  );
  return data;
}

export async function registrarRetornoDestino(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/registrar-retorno-destino/`, payload,
  );
  return data;
}

export async function registrarRetornoFeria(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/registrar-retorno-feria/`, payload,
  );
  return data;
}

export async function resolverDiferenciaLlegada(id, payload) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/resolver-diferencia-llegada/`, payload,
  );
  return data;
}

export async function consultarPreparacionDistribucion(id) {
  const { data } = await axiosClient.get(`${DISTRIBUTION_BASE}/${id}/preparacion/`);
  return data;
}

export async function separarDisponiblesDistribucion(id, idempotencyKey) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/separar-disponibles/`,
    { idempotency_key: idempotencyKey },
  );
  return data;
}

export async function reservarDistribucion(id, lots = null) {
  const payload = lots === null ? {} : { lots };
  const { data } = await axiosClient.post(`${DISTRIBUTION_BASE}/${id}/reservar/`, payload);
  return data;
}

export async function confirmarPreparacionDistribucion(id, counts) {
  const { data } = await axiosClient.post(
    `${DISTRIBUTION_BASE}/${id}/confirmar-preparacion/`,
    { counts },
  );
  return data;
}

export async function consultarBorradorTransporte(id) {
  const { data } = await axiosClient.get(`${DISTRIBUTION_BASE}/${id}/documento-traslado/`);
  return data;
}

export async function guardarBorradorTransporte(id, payload) {
  const { data } = await axiosClient.put(
    `${DISTRIBUTION_BASE}/${id}/documento-traslado/`,
    payload,
  );
  return data;
}

export async function consultarAvisosRecepcion() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/avisos-recepcion/`);
  return data;
}

export async function consultarFiltrosInventarioConsolidado() {
  const { data } = await axiosClient.get(`${INVENTORY_BASE}/consolidado-filtros/`);
  return data;
}
