import { http } from "./http";

export interface VentaItem {
  id: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  valorUnitario: number;
  precioUnitario: number;
  afectacionIgv: string;
  montoIGV: number;
  montoTotal: number;
}

export interface Venta {
  id: number;
  tipoDoc: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  receptorNombre: string;
  receptorTipoDoc: string | null;
  receptorNroDoc: string | null;
  total: number;
  estado: string;
  montoEfectivo: number;
  montoYape: number;
  montoTransferencia: number;
  montoTarjeta: number;
  montoOtros: number;
  items?: VentaItem[];
}

export async function listVentasPorSesion(sesionId: number, limit: number = 200): Promise<Venta[]> {
  const { data } = await http.get(`/api/v1/cajas/sesiones/${sesionId}/ventas`, {
    params: { limit }
  });
  return data;
}

export async function getVentaDetalle(ventaId: number): Promise<Venta> {
  const { data } = await http.get(`/api/v1/comprobantes/${ventaId}`);
  return data;
}
