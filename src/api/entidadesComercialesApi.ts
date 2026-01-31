import { http } from "./http";

export type RolEntidadComercial = "CLIENTE" | "PROVEEDOR" | "TRANSPORTISTA";

export interface EntidadComercial {
  id: number;
  empresaId: number;

  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  telefono?: string;

  email?: string;
  emailPrincipal?: string;
  emailSecundario?: string;
  emailTerciario?: string;

  codigoCliente?: string;

  contactoNombre?: string;
  contactoTelefono?: string;
  observaciones?: string;

  activo: boolean;
  esCliente: boolean;
  esProveedor: boolean;
  esTransportista: boolean;

  placaVehiculo?: string;
  marcaVehiculo?: string;
  certificadoMtc?: string;
  licenciaConducir?: string;
  choferNombre?: string;
  choferDni?: string;

  createdAt: string;
  updatedAt: string;
}

export interface EntidadComercialRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  telefono?: string;

  email?: string;
  emailPrincipal?: string;
  emailSecundario?: string;
  emailTerciario?: string;

  codigoCliente?: string;

  contactoNombre?: string;
  contactoTelefono?: string;
  observaciones?: string;

  activo?: boolean;

  esCliente: boolean;
  esProveedor: boolean;
  esTransportista: boolean;

  placaVehiculo?: string;
  marcaVehiculo?: string;
  certificadoMtc?: string;
  licenciaConducir?: string;
  choferNombre?: string;
  choferDni?: string;
}

export interface EntidadesComercialesQuery {
  rol?: RolEntidadComercial;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EntidadesComercialesResponse {
  content: EntidadComercial[];
  totalElements: number;
  number: number;
  size: number;
  totalPages: number;
}

export const entidadesComercialesApi = {
  getAll: async (empresaId: number, query?: EntidadesComercialesQuery): Promise<EntidadesComercialesResponse> => {
    const params = new URLSearchParams();
    if (query?.rol) params.append("rol", query.rol);
    if (query?.search) params.append("search", query.search);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());

    const { data } = await http.get<EntidadesComercialesResponse>(
      `/api/empresas/${empresaId}/entidades-comerciales?${params.toString()}`
    );
    return data;
  },

  getById: async (empresaId: number, id: number): Promise<EntidadComercial> => {
    const { data } = await http.get<EntidadComercial>(
      `/api/empresas/${empresaId}/entidades-comerciales/${id}`
    );
    return data;
  },

  create: async (empresaId: number, body: EntidadComercialRequest): Promise<EntidadComercial> => {
    const { data } = await http.post<EntidadComercial>(
      `/api/empresas/${empresaId}/entidades-comerciales`,
      body
    );
    return data;
  },

  update: async (empresaId: number, id: number, body: EntidadComercialRequest): Promise<EntidadComercial> => {
    const { data } = await http.put<EntidadComercial>(
      `/api/empresas/${empresaId}/entidades-comerciales/${id}`,
      body
    );
    return data;
  },

  delete: async (empresaId: number, id: number): Promise<void> => {
    await http.delete(`/api/empresas/${empresaId}/entidades-comerciales/${id}`);
  },
};
