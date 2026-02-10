import { http } from './http';

export type Serie = {
  id?: number;
  empresaId?: number;
  tipoDoc: string;
  serie: string;
  ultimoCorrelativo?: number;
  activa: boolean;
  descripcion?: string;
  sucursalId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export const listarSeriesAdmin = async (
  empresaId: number,
  tipoDoc?: string,
  soloActivas?: boolean
): Promise<Serie[]> => {
  const params: Record<string, string> = {};
  if (tipoDoc) params.tipoDoc = tipoDoc;
  if (soloActivas !== undefined) params.soloActivas = soloActivas.toString();

  const response = await http.get(`/api/v1/admin/empresas/${empresaId}/series`, { params });
  return response.data;
};

export const crearSerieAdmin = async (
  empresaId: number,
  serie: Omit<Serie, 'id' | 'empresaId' | 'createdAt' | 'updatedAt'>
): Promise<Serie> => {
  const response = await http.post(`/api/v1/admin/empresas/${empresaId}/series`, serie);
  return response.data;
};

export const actualizarSerieAdmin = async (
  empresaId: number,
  id: number,
  serie: Partial<Serie>
): Promise<Serie> => {
  const response = await http.put(`/api/v1/admin/empresas/${empresaId}/series/${id}`, serie);
  return response.data;
};

export const eliminarSerieAdmin = async (empresaId: number, id: number): Promise<void> => {
  await http.delete(`/api/v1/admin/empresas/${empresaId}/series/${id}`);
};

export const reiniciarCorrelativoAdmin = async (empresaId: number, id: number): Promise<void> => {
  await http.post(`/api/v1/admin/empresas/${empresaId}/series/${id}/reiniciar-correlativo`, null);
};
