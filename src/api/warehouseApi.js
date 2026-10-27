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
