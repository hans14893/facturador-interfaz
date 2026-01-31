import { http } from "./http";

export interface DetalleCompra {
  id?: number;
  productoId: number;
  productoDescripcion?: string;
  formatoId?: number;
  formatoNombre?: string;
  cantidad: number;
  precioUnitario: number;
  precioVenta?: number;
  subtotal: number;
  esBonificacion?: boolean;
}

export interface Compra {
  id: number;
  empresaId: number;
  proveedorId: number;
  numeroComprobante: string;
  tipoComprobante: string;
  fecha: string;
  moneda: string;
  subtotal: number;
  igv: number;
  total: number;
  observaciones?: string;
  estado: "PENDIENTE" | "RECIBIDO" | "CANCELADO" | "ANULADO";
  detalles: DetalleCompra[];
  proveedor?: {
    id: number;
    numeroDocumento: string;
    razonSocial: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompraDTO {
  proveedorId?: number;
  entidadComercialId?: number;
  numeroComprobante: string;
  tipoComprobante: string;
  fecha: string;
  moneda: string;
  observaciones?: string;
  detalles: Omit<DetalleCompra, "subtotal">[];
}

export interface UpdateCompraDTO {
  estado?: "PENDIENTE" | "RECIBIDO" | "CANCELADO" | "ANULADO";
  observaciones?: string;
}

export interface ComprasQuery {
  page?: number;
  limit?: number;
  search?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  proveedorId?: number;
}

export interface ComprasResponse {
  data: Compra[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const comprasApi = {
  // Obtener todas las compras de una empresa
  getAll: async (empresaId: number, query?: ComprasQuery): Promise<ComprasResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.search) params.append("search", query.search);
    if (query?.estado) params.append("estado", query.estado);
    if (query?.fechaDesde) params.append("fechaDesde", query.fechaDesde);
    if (query?.fechaHasta) params.append("fechaHasta", query.fechaHasta);
    if (query?.proveedorId) params.append("proveedorId", query.proveedorId.toString());
    
    const { data } = await http.get<ComprasResponse>(
      `/api/empresas/${empresaId}/compras?${params.toString()}`
    );
    return data;
  },

  // Obtener una compra por ID
  getById: async (empresaId: number, id: number): Promise<Compra> => {
    const { data } = await http.get<Compra>(`/api/empresas/${empresaId}/compras/${id}`);
    return data;
  },

  // Crear una nueva compra
  create: async (empresaId: number, compra: CreateCompraDTO): Promise<Compra> => {
    const { data } = await http.post<Compra>(`/api/empresas/${empresaId}/compras`, compra);
    return data;
  },

  // Actualizar una compra
  update: async (empresaId: number, id: number, compra: UpdateCompraDTO): Promise<Compra> => {
    const { data } = await http.put<Compra>(`/api/empresas/${empresaId}/compras/${id}`, compra);
    return data;
  },

  // Eliminar una compra
  delete: async (empresaId: number, id: number): Promise<void> => {
    await http.delete(`/api/empresas/${empresaId}/compras/${id}`);
  },
};
