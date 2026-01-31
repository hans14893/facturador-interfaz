import { http } from './http';

// DTOs
export interface DashboardDTO {
  ventasHoy: number;
  ventasSemana: number;
  ventasMes: number;
  comprobantesHoy: number;
  comprasHoy: number;
  comprasMes: number;
  comprasPendientes: number;
  totalProductos: number;
  productosBajoStock: number;
  productosSinStock: number;
  totalClientes: number;
  clientesNuevosMes: number;
  saldoCajaActual: number;
  cajaAbierta: boolean;
  variacionVentasSemana: number;
  variacionVentasMes: number;
}

export interface VentaPorDia {
  fecha: string;
  total: number;
  cantidad: number;
}

export interface VentaPorTipoDoc {
  tipoDoc: string;
  descripcion: string;
  total: number;
  cantidad: number;
}

export interface ReporteVentasDTO {
  fechaDesde: string;
  fechaHasta: string;
  totalVentas: number;
  totalIgv: number;
  totalDescuentos: number;
  cantidadComprobantes: number;
  cantidadFacturas: number;
  cantidadBoletas: number;
  cantidadNotasCredito: number;
  cantidadNotasDebito: number;
  ventasPorDia: VentaPorDia[];
  ventasPorTipo: VentaPorTipoDoc[];
}

export interface CompraPorDia {
  fecha: string;
  total: number;
  cantidad: number;
}

export interface CompraPorProveedor {
  proveedorId: number;
  proveedorNombre: string;
  proveedorRuc: string;
  total: number;
  cantidad: number;
}

export interface ReporteComprasDTO {
  fechaDesde: string;
  fechaHasta: string;
  totalCompras: number;
  totalIgv: number;
  cantidadCompras: number;
  comprasPendientes: number;
  comprasRecibidas: number;
  comprasAnuladas: number;
  comprasPorDia: CompraPorDia[];
  comprasPorProveedor: CompraPorProveedor[];
}

export interface ProductoVendido {
  productoId: number;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidadVendida: number;
  montoTotal: number;
  vecesVendido: number;
}

export interface ProductoStock {
  productoId: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
}

export interface ReporteProductosDTO {
  productosTopVendidos: ProductoVendido[];
  productosTopMonto: ProductoVendido[];
  productosBajoStock: ProductoStock[];
  productosSinStock: ProductoStock[];
}

export interface ClienteTop {
  clienteId: number | null;
  tipoDoc: string;
  nroDoc: string;
  nombre: string;
  montoTotal: number;
  cantidadCompras: number;
  ultimaCompra: string;
}

export interface ReporteClientesDTO {
  clientesTopMonto: ClienteTop[];
  clientesTopFrecuencia: ClienteTop[];
  totalClientes: number;
  clientesNuevos: number;
}

// API Functions
export async function getDashboard(): Promise<DashboardDTO> {
  const resp = await http.get('/api/v1/reportes/dashboard');
  return resp.data;
}

export async function getReporteVentas(fechaDesde: string, fechaHasta: string): Promise<ReporteVentasDTO> {
  const resp = await http.get('/api/v1/reportes/ventas', {
    params: { fechaDesde, fechaHasta }
  });
  return resp.data;
}

export async function getReporteCompras(fechaDesde: string, fechaHasta: string): Promise<ReporteComprasDTO> {
  const resp = await http.get('/api/v1/reportes/compras', {
    params: { fechaDesde, fechaHasta }
  });
  return resp.data;
}

export async function getReporteProductos(fechaDesde: string, fechaHasta: string): Promise<ReporteProductosDTO> {
  const resp = await http.get('/api/v1/reportes/productos', {
    params: { fechaDesde, fechaHasta }
  });
  return resp.data;
}

export async function getReporteClientes(fechaDesde: string, fechaHasta: string): Promise<ReporteClientesDTO> {
  const resp = await http.get('/api/v1/reportes/clientes', {
    params: { fechaDesde, fechaHasta }
  });
  return resp.data;
}
