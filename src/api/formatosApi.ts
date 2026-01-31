import { http } from "./http";

// ==================== TIPOS ====================

export interface UnidadMedidaSunat {
  codigo: string;
  descripcion: string;
  activo: boolean;
}

export interface UnidadMedidaInterna {
  id: number;
  empresaId: number;
  nombre: string;
  abreviatura: string;
  unidadSunat: UnidadMedidaSunat;
  activo: boolean;
}

export interface EscalaPrecio {
  id?: number;
  cantidadMinima: number;
  cantidadMaxima?: number;
  precioUnitario: number;
  activo?: boolean;
}

export interface ProductoFormatoVenta {
  id: number;
  productoId: number;
  unidadInterna: UnidadMedidaInterna;
  factorBase: number;
  precioBase: number | null;
  precioCompra: number | null;
  codigoBarra: string | null;
  pesoUnitario: number | null;
  esPrincipal: boolean;
  activo: boolean;
  escalas: EscalaPrecio[];
}

export interface FormatoVentaRequest {
  unidadInternaId: number;
  factorBase: number;
  precioBase?: number;
  precioCompra?: number;
  codigoBarra?: string;
  pesoUnitario?: number;
  esPrincipal?: boolean;
  escalas?: EscalaPrecio[];
}

export interface CalculoPrecio {
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  pesoTotal: number;
  unidadesBase: number;
}

export interface FormatoBusquedaResponse {
  productoId: number;
  productoCodigo: string | null;
  productoDescripcion: string;
  tipoAfectacionIgv: string;
  stock: number;

  formatoId: number;
  codigoBarra: string | null;
  factorBase: number;
  unidad: string;
  abreviatura: string;
  codigoSunat: string;

  precioUnitario: number;
  precioBase: number | null;
  escalas: EscalaPrecio[];

  formato: ProductoFormatoVenta;
}

// ==================== UNIDADES SUNAT ====================

export async function listarUnidadesSunat(): Promise<UnidadMedidaSunat[]> {
  const { data } = await http.get<UnidadMedidaSunat[]>("/api/v1/unidades/sunat");
  return data;
}

export async function obtenerUnidadSunat(codigo: string): Promise<UnidadMedidaSunat> {
  const { data } = await http.get<UnidadMedidaSunat>(`/api/v1/unidades/sunat/${codigo}`);
  return data;
}

// ==================== UNIDADES INTERNAS ====================

export async function listarUnidadesInternas(): Promise<UnidadMedidaInterna[]> {
  const { data } = await http.get<UnidadMedidaInterna[]>("/api/v1/unidades/internas");
  return data;
}

export async function listarUnidadesInternasActivas(): Promise<UnidadMedidaInterna[]> {
  const { data } = await http.get<UnidadMedidaInterna[]>("/api/v1/unidades/internas/activas");
  return data;
}

export async function obtenerUnidadInterna(id: number): Promise<UnidadMedidaInterna> {
  const { data } = await http.get<UnidadMedidaInterna>(`/api/v1/unidades/internas/${id}`);
  return data;
}

export async function crearUnidadInterna(
  nombre: string,
  abreviatura: string,
  sunatCodigo: string
): Promise<UnidadMedidaInterna> {
  const { data } = await http.post<UnidadMedidaInterna>("/api/v1/unidades/internas", {
    nombre,
    abreviatura,
    sunatCodigo,
  });
  return data;
}

export async function actualizarUnidadInterna(
  id: number,
  nombre: string,
  abreviatura: string,
  sunatCodigo: string
): Promise<UnidadMedidaInterna> {
  const { data } = await http.put<UnidadMedidaInterna>(`/api/v1/unidades/internas/${id}`, {
    nombre,
    abreviatura,
    sunatCodigo,
  });
  return data;
}

export async function desactivarUnidadInterna(id: number): Promise<void> {
  await http.post(`/api/v1/unidades/internas/${id}/desactivar`);
}

export async function activarUnidadInterna(id: number): Promise<void> {
  await http.post(`/api/v1/unidades/internas/${id}/activar`);
}

// ==================== FORMATOS DE VENTA ====================

export async function listarFormatosProducto(productoId: number): Promise<ProductoFormatoVenta[]> {
  const { data } = await http.get<ProductoFormatoVenta[]>(`/api/v1/productos/${productoId}/formatos`);
  return data;
}

export async function listarFormatosActivosProducto(productoId: number): Promise<ProductoFormatoVenta[]> {
  const { data } = await http.get<ProductoFormatoVenta[]>(`/api/v1/productos/${productoId}/formatos/activos`);
  return data;
}

export async function obtenerFormatoPrincipal(productoId: number): Promise<ProductoFormatoVenta | null> {
  try {
    const { data } = await http.get<ProductoFormatoVenta>(`/api/v1/productos/${productoId}/formatos/principal`);
    return data;
  } catch {
    return null;
  }
}

export async function crearFormatoVenta(
  productoId: number,
  request: FormatoVentaRequest
): Promise<ProductoFormatoVenta> {
  const { data } = await http.post<ProductoFormatoVenta>(
    `/api/v1/productos/${productoId}/formatos`,
    request
  );
  return data;
}

export async function actualizarFormatoVenta(
  productoId: number,
  formatoId: number,
  request: FormatoVentaRequest
): Promise<ProductoFormatoVenta> {
  const { data } = await http.put<ProductoFormatoVenta>(
    `/api/v1/productos/${productoId}/formatos/${formatoId}`,
    request
  );
  return data;
}

export async function eliminarFormatoVenta(productoId: number, formatoId: number): Promise<void> {
  await http.delete(`/api/v1/productos/${productoId}/formatos/${formatoId}`);
}

export async function desactivarFormatoVenta(productoId: number, formatoId: number): Promise<void> {
  await http.post(`/api/v1/productos/${productoId}/formatos/${formatoId}/desactivar`);
}

// ==================== CÁLCULOS ====================

export async function calcularPrecioFormato(
  productoId: number,
  formatoId: number,
  cantidad: number
): Promise<CalculoPrecio> {
  const { data } = await http.get<CalculoPrecio>(
    `/api/v1/productos/${productoId}/formatos/${formatoId}/precio`,
    { params: { cantidad } }
  );
  return data;
}

export async function buscarFormatoPorCodigoBarra(codigo: string): Promise<{
  formato: ProductoFormatoVenta;
  productoId: number;
  unidad: string;
  abreviatura: string;
  codigoSunat: string;
  precioUnitario: number;
  factorBase: number;
  pesoUnitario: number;
} | null> {
  try {
    const { data } = await http.get(`/api/v1/formatos/buscar-codigo`, {
      params: { codigo },
    });
    return data;
  } catch {
    return null;
  }
}

// ==================== BÚSQUEDA (POS) ====================

export async function buscarFormatos(q: string, limit = 10): Promise<FormatoBusquedaResponse[]> {
  const { data } = await http.get<FormatoBusquedaResponse[]>(`/api/v1/formatos/buscar`, {
    params: { q, limit },
  });
  return data;
}

export async function calcularFormato(
  formatoId: number,
  cantidad: number
): Promise<CalculoPrecio> {
  const { data } = await http.get<CalculoPrecio>(
    `/api/v1/formatos/${formatoId}/calcular`,
    { params: { cantidad } }
  );
  return data;
}

// ==================== ESCALAS DE PRECIO ====================

export async function listarEscalasFormato(
  productoId: number,
  formatoId: number
): Promise<EscalaPrecio[]> {
  const { data } = await http.get<EscalaPrecio[]>(
    `/api/v1/productos/${productoId}/formatos/${formatoId}/escalas`
  );
  return data;
}

export async function agregarEscala(
  productoId: number,
  formatoId: number,
  cantidadMinima: number,
  precioUnitario: number,
  cantidadMaxima?: number
): Promise<EscalaPrecio> {
  const { data } = await http.post<EscalaPrecio>(
    `/api/v1/productos/${productoId}/formatos/${formatoId}/escalas`,
    { cantidadMinima, cantidadMaxima, precioUnitario }
  );
  return data;
}

export async function eliminarEscala(
  productoId: number,
  formatoId: number,
  escalaId: number
): Promise<void> {
  await http.delete(`/api/v1/productos/${productoId}/formatos/${formatoId}/escalas/${escalaId}`);
}
