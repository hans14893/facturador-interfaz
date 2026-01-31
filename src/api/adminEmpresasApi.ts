import { http } from "../api/http";
import { AxiosError } from "axios";

export type Empresa = {
  id: number;
  ruc: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  sunatAmbiente?: "BETA" | "PROD";
  telefono?: string;
  email?: string;
  igvPorcentaje?: number;
  usarStock?: boolean;
  noVenderStockCero?: boolean;
  unificarItemsVenta?: boolean;
  tipoAfectacionIgvDefault?: string;
  formatoImpresion?: string;
  activo?: boolean;
  apiConsultaUrl?: string;
  apiConsultaToken?: string;
};

export async function listEmpresas(): Promise<Empresa[]> {
  const { data } = await http.get("/api/v1/admin/empresas");
  return data;
}

export async function getEmpresa(id: number): Promise<Empresa> {
  const { data } = await http.get(`/api/v1/admin/empresas/${id}`);
  return data;
}

export async function createEmpresa(payload: {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  sunatAmbiente?: "BETA" | "PROD";
  igvPorcentaje?: number;
}): Promise<Empresa> {
  const { data } = await http.post("/api/v1/admin/empresas", payload);
  return data;
}

export async function updateEmpresa(id: number, payload: {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  sunatAmbiente?: "BETA" | "PROD";
  igvPorcentaje?: number;
  apiConsultaUrl?: string;
  apiConsultaToken?: string;
}): Promise<Empresa> {
  const { data } = await http.put(`/api/v1/admin/empresas/${id}`, payload);
  return data;
}

export async function uploadLogo(empresaId: number, file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  await http.post(`/api/v1/admin/empresas/${empresaId}/logo`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function getLogoUrl(empresaId: number): Promise<string | null> {
  try {
    const response = await http.get(`/api/v1/admin/empresas/${empresaId}/logo`, {
      responseType: 'blob',
      // Suprimir errores 404 en la consola (el logo puede no existir)
      validateStatus: (status) => status === 200 || status === 404,
    });
    
    if (response.status === 404) {
      return null;
    }
    
    return URL.createObjectURL(response.data);
  } catch (error: unknown) {
    // Error diferente a 404
    console.error('Error cargando logo:', error);
    return null;
  }
}

export async function deleteLogo(empresaId: number): Promise<void> {
  await http.delete(`/api/v1/admin/empresas/${empresaId}/logo`);
}

// ============ ENDPOINTS PARA USUARIOS NORMALES ============

export async function getMyEmpresa(): Promise<Empresa> {
  const { data } = await http.get("/api/v1/empresas/me");
  return data;
}

export async function updateMyEmpresa(payload: {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  sunatAmbiente?: "BETA" | "PROD";
  igvPorcentaje?: number;
  usarStock?: boolean;
  noVenderStockCero?: boolean;
  unificarItemsVenta?: boolean;
  tipoAfectacionIgvDefault?: string;
  formatoImpresion?: string;
}): Promise<Empresa> {
  const { data } = await http.put("/api/v1/empresas/me", payload);
  return data;
}

export async function uploadMyLogo(file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  await http.post("/api/v1/empresas/me/logo", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function getMyLogoUrl(): Promise<string | null> {
  try {
    const response = await http.get("/api/v1/empresas/me/logo", {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
