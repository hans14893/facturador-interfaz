import { http } from "../api/http";

export type ApiClient = {
  id: number;
  empresaId: number;
  nombre: string;
  clientId: string;
  scopes?: string;
  activo?: boolean;
};

export async function listApiClients(empresaId: string | number): Promise<ApiClient[]> {
  const { data } = await http.get(`/api/v1/admin/api-clients/by-empresa/${empresaId}`);
  return data;
}

export async function createApiClient(empresaId: string | number, payload: {
  nombre: string;
  scopes?: string;
}): Promise<{ client: ApiClient; apiKey: string }> {
  const params = new URLSearchParams();
  params.append('nombre', payload.nombre);
  params.append('empresaId', empresaId.toString());
  if (payload.scopes) {
    params.append('scopes', payload.scopes);
  }
  
  const { data } = await http.post(`/api/v1/admin/api-clients/generate?${params.toString()}`);
  return data; // { client: ApiClient, apiKey: string }
}

export async function regenerateSecret(empresaId: string | number, clientId: number): Promise<{ apiKey: string }> {
  const { data } = await http.post(`/api/v1/admin/api-clients/${clientId}/regenerate-secret`);
  return { apiKey: data };
}
