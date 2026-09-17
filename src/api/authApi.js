import axiosClient from "./axiosClient";

export async function loginRequest({ username, password }) {
  const response = await axiosClient.post("/auth/login/", {
    username,
    password,
  });

  return response.data;
}

export async function getMeRequest() {
  const response = await axiosClient.get("/auth/me/");
  return response.data;
}

export async function logoutRequest(refreshToken) {
  const response = await axiosClient.post("/auth/logout/", {
    refresh: refreshToken,
  });

  return response.data;
}