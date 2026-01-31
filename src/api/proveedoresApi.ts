import { http } from "./http";

export interface Proveedor {
  id: number;
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  observaciones?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProveedorRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  observaciones?: string;
}

export interface ProveedoresQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ProveedoresResponse {
  content: Proveedor[];
  totalElements: number;
  number: number;
  size: number;
  totalPages: number;
}

export const proveedoresApi = {
  // Obtener todos los proveedores de una empresa
  getAll: async (empresaId: number, query?: ProveedoresQuery): Promise<ProveedoresResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.search) params.append("search", query.search);
    
    const { data } = await http.get<ProveedoresResponse>(
      `/api/empresas/${empresaId}/proveedores?${params.toString()}`
    );
    return data;
  },

  // Obtener proveedores activos
  getActivos: async (empresaId: number): Promise<Proveedor[]> => {
    const { data } = await http.get<Proveedor[]>(
      `/api/empresas/${empresaId}/proveedores/activos`
    );
    return data;
  },

  // Obtener un proveedor por ID
  getById: async (empresaId: number, id: number): Promise<Proveedor> => {
    const { data } = await http.get<Proveedor>(
      `/api/empresas/${empresaId}/proveedores/${id}`
    );
    return data;
  },

  // Crear nuevo proveedor
  create: async (empresaId: number, proveedor: ProveedorRequest): Promise<Proveedor> => {
    const { data } = await http.post<Proveedor>(
      `/api/empresas/${empresaId}/proveedores`,
      proveedor
    );
    return data;
  },

  // Actualizar proveedor
  update: async (empresaId: number, id: number, proveedor: ProveedorRequest): Promise<Proveedor> => {
    const { data } = await http.put<Proveedor>(
      `/api/empresas/${empresaId}/proveedores/${id}`,
      proveedor
    );
    return data;
  },

  // Eliminar proveedor (soft delete)
  delete: async (empresaId: number, id: number): Promise<void> => {
    await http.delete(`/api/empresas/${empresaId}/proveedores/${id}`);
  },
};
