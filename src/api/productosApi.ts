import { http } from "./http";
import type { UnidadMedida } from "./unidadesMedidaApi";
import type { Categoria } from "./categoriasApi";
import type { CodigoProductoSunat } from "./codigosProductoSunatApi";

export type ProductoPrecioEscala = {
  id?: number;
  minCantidad: number;
  formato?: string | null;
  precioVenta: number;
  activo?: boolean;
  createdAt?: string;
};

export type DecimalInput = number | string;

export type Producto = {
  id: number;
  codigo?: string | null;
  descripcion: string;
  precioVenta: number;
  precioCompra?: number;
  codigoProductoSunat?: CodigoProductoSunat;
  tipoAfectacionIgv: string;
  unidadMedida: UnidadMedida;
  categoria?: Categoria;
  empresaId: number;
  stock: number;
  activo: boolean;
  createdAt: string;

  // Nuevo: escalas de precio (backend: `escalasPrecio`)
  escalasPrecio?: ProductoPrecioEscala[];
};

export async function listProductos(): Promise<Producto[]> {
  const { data } = await http.get("/api/v1/productos");
  return data;
}

export async function createProducto(payload: {
  codigo?: string;
  descripcion: string;
  precioVenta: DecimalInput;
  precioCompra?: DecimalInput;
  codigoProductoSunatId?: number;
  tipoAfectacionIgv?: string;
  unidadMedidaId: number;
  categoriaId?: number;
  stock?: DecimalInput;
  escalas?: Array<{
    minCantidad: DecimalInput;
    formato?: string;
    precioVenta: DecimalInput;
  }>;
}): Promise<Producto> {
  const { data } = await http.post("/api/v1/productos", payload);
  return data;
}

export async function updateProducto(id: number, payload: {
  codigo?: string;
  descripcion?: string;
  precioVenta?: DecimalInput;
  precioCompra?: DecimalInput;
  codigoProductoSunatId?: number;
  tipoAfectacionIgv?: string;
  unidadMedidaId?: number;
  categoriaId?: number;
  stock?: DecimalInput;
  escalas?: Array<{
    minCantidad: DecimalInput;
    formato?: string;
    precioVenta: DecimalInput;
  }>;
}): Promise<Producto> {
  const { data } = await http.put(`/api/v1/productos/${id}`, payload);
  return data;
}

export async function deleteProducto(id: number): Promise<void> {
  await http.delete(`/api/v1/productos/${id}`);
}

export interface ImportProductosResult {
  importados: number;
  actualizados: number;
  formatos?: number;
  errores: string[];
}

export async function importarProductos(file: File): Promise<ImportProductosResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await http.post("/api/v1/productos/importar", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export const productosApi = {
  listProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  
  // Obtener productos activos para una empresa
  getActivos: async (empresaId: number): Promise<Producto[]> => {
    const { data } = await http.get<Producto[]>(`/api/empresas/${empresaId}/productos/activos`);
    return data;
  },
};
