import axiosClient from "./axiosClient";

const BASE = "/admin/erp/compras/pedidos";

export async function obtenerPedidos(params = {}) {
  const { data } = await axiosClient.get(`${BASE}/`, { params });
  return data;
}

export async function obtenerPedido(id) {
  const { data } = await axiosClient.get(`${BASE}/${id}/`);
  return data;
}

export async function generarPedidosDesdeAdopcion(adoptionId) {
  const { data } = await axiosClient.post(`${BASE}/generar-desde-adopcion/`, {
    adoption_id: adoptionId,
  });
  return data;
}

export async function modificarCantidadPedido(orderId, itemId, quantity) {
  const { data } = await axiosClient.post(`${BASE}/${orderId}/cambiar-cantidad/`, {
    item_id: itemId,
    quantity,
  });
  return data;
}

export async function aprobarPedido(orderId) {
  const { data } = await axiosClient.post(`${BASE}/${orderId}/aprobar/`);
  return data;
}

export async function registrarEnvioPedido(orderId, evidence) {
  const { data } = await axiosClient.post(`${BASE}/${orderId}/registrar-envio/`, {
    evidence,
  });
  return data;
}

export async function obtenerAdopcionesConfirmadas(params = {}) {
  const { data } = await axiosClient.get(`${BASE}/adopciones-confirmadas/`, { params });
  return data;
}

export async function obtenerAdopcionesPorEditorial(params = {}) {
  const { data } = await axiosClient.get(`${BASE}/adopciones-por-editorial/`, { params });
  return data;
}

export async function descargarOrdenCompraPdf(orderId) {
  const { data } = await axiosClient.get(`${BASE}/${orderId}/orden-pdf/`, {
    responseType: "blob",
  });
  return data;
}
