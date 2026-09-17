import axiosClient from "./axiosClient";

export async function getPublicProducts(params = {}) {
  const response = await axiosClient.get("/public/products/", {
    params,
  });

  return response.data;
}

export async function getPublicProductBySlug(slug) {
  const response = await axiosClient.get(`/public/products/${slug}/`);
  return response.data;
}

export async function getPublicProviders() {
  const response = await axiosClient.get("/public/providers/");
  return response.data;
}

export async function getPublicLevels() {
  const response = await axiosClient.get("/public/levels/");
  return response.data;
}

export async function getPublicGrades() {
  const response = await axiosClient.get("/public/grades/");
  return response.data;
}

export async function getPublicAreas() {
  const response = await axiosClient.get("/public/areas/");
  return response.data;
}

export async function getPublicSeries() {
  const response = await axiosClient.get("/public/series/");
  return response.data;
}

export async function getPublicProductTypes() {
  const response = await axiosClient.get("/public/product-types/");
  return response.data;
}

export async function createPublicContactRequest(payload) {
  const response = await axiosClient.post("/public/contact-requests/", payload);
  return response.data;
}