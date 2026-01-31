import { http } from "./http";

export type TipoEntidad = "CLIENTE" | "PROVEEDOR" | "AMBOS";

export interface Cliente {
  id: number;
  empresaId: number;
  numeroDocumento: string;
  tipoDocumento: string;
  tipoEntidad: TipoEntidad;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  ubigeo?: string;
  emailPrincipal?: string;
  emailSecundario?: string;
  emailTerciario?: string;
  telefono?: string;
  codigoCliente?: string;
  licenciaConducir?: string;
  placaVehiculo?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClienteDTO {
  numeroDocumento: string;
  tipoDocumento: string;
  tipoEntidad: TipoEntidad;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  ubigeo?: string;
  emailPrincipal?: string;
  emailSecundario?: string;
  emailTerciario?: string;
  telefono?: string;
  codigoCliente?: string;
  licenciaConducir?: string;
  placaVehiculo?: string;
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {}

export interface ClientesQuery {
  tipoEntidad?: TipoEntidad;
  search?: string;
  limit?: number;
}

export interface ConsultaDocumentoResponse {
  estado: boolean;
  mensaje: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}

export const clientesApi = {
  // Obtener todos los clientes/proveedores
  getAll: async (query?: ClientesQuery): Promise<Cliente[]> => {
    const params = new URLSearchParams();
    if (query?.tipoEntidad) params.append("tipoEntidad", query.tipoEntidad);
    if (query?.search) params.append("search", query.search);
    if (query?.limit) params.append("limit", query.limit.toString());
    
    const { data } = await http.get<Cliente[]>(
      `/api/v1/clientes?${params.toString()}`
    );
    return data;
  },

  // Obtener un cliente por ID
  getById: async (id: number): Promise<Cliente> => {
    const { data } = await http.get<Cliente>(`/api/v1/clientes/${id}`);
    return data;
  },

  // Crear un nuevo cliente
  create: async (cliente: CreateClienteDTO): Promise<Cliente> => {
    const { data } = await http.post<Cliente>(`/api/v1/clientes`, cliente);
    return data;
  },

  // Actualizar un cliente
  update: async (id: number, cliente: UpdateClienteDTO): Promise<Cliente> => {
    const { data } = await http.put<Cliente>(`/api/v1/clientes/${id}`, cliente);
    return data;
  },

  // Eliminar un cliente
  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/v1/clientes/${id}`);
  },

  // Consultar documento (RUC=6, DNI=1) usando API configurada en empresa
  consultarDocumento: async (tipoDocumento: string, numeroDocumento: string): Promise<ConsultaDocumentoResponse> => {
    const { data } = await http.get<ConsultaDocumentoResponse>(
      `/api/v1/clientes/consultar/${tipoDocumento}/${numeroDocumento}`
    );
    return data;
  },
};
