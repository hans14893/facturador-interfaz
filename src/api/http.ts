import axios from "axios";
import { clearAuth, getAuth } from "../auth/authStore"; // 👈 ajusta ruta si tu carpeta cambia

function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl;

  if (typeof window === "undefined") return "http://localhost:9091";

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Dev: usa el origin del Vite dev server + proxy /api -> 9091
    return window.location.origin;
  }

  // Prod: usa el mismo host/puerto donde está Nginx (y el backend va por /api)
  return window.location.origin;
}

const API_BASE_URL = resolveApiBaseUrl();

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// ✅ Agrega JWT a todas las requests del panel
http.interceptors.request.use((config) => {
  const auth = getAuth();
  const token = auth?.token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || '';

    // Suprimir errores 404 en endpoints de logo (es normal que no existan)
    if (status === 404 && url.includes('/logo')) {
      return Promise.resolve({ status: 404, data: null });
    }

    // 401 - Token vencido o inválido
    if (status === 401) {
      clearAuth();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(err);
    }

    // 403 - Sin permisos (puede ser también token vencido)
    if (status === 403) {
      const message = err?.response?.data?.message || '';
      if (message.toLowerCase().includes('token') || message.toLowerCase().includes('empresaid') || message.toLowerCase().includes('missing empresaid')) {
        clearAuth();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      return Promise.reject(err);
    }

    return Promise.reject(err);
  }
);
