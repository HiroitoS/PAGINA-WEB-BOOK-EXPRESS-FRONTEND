import axios from "axios";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

let refreshPromise = null;

function isPublicApiRequest(url = "") {
  return url.startsWith("/public/") || url.includes("/public/");
}

function isAdminPage() {
  return window.location.pathname.startsWith("/admin");
}

function redirectToLogin() {
  clearAuthStorage();

  if (isAdminPage()) {
    window.location.href = "/admin/login";
  }
}

async function getRefreshedAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const currentRefreshToken = getRefreshToken();

  if (!currentRefreshToken) {
    throw new Error("No hay refresh token disponible.");
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh/`, {
      refresh: currentRefreshToken,
    })
    .then((response) => {
      const newAccessToken = response.data.access;
      const newRefreshToken = response.data.refresh || currentRefreshToken;

      saveTokens({
        access: newAccessToken,
        refresh: newRefreshToken,
      });

      return newAccessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

axiosClient.interceptors.request.use(
  (config) => {
    if (isPublicApiRequest(config.url)) {
      return config;
    }

    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isPublicRequest = isPublicApiRequest(originalRequest?.url);

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      getRefreshToken() &&
      !isPublicRequest
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await getRefreshedAccessToken();

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return axiosClient(originalRequest);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && isAdminPage()) {
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
