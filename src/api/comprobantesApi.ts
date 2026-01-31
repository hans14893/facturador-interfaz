import { http } from "./http";

export type Comprobante = {
  id: number;
  empresaId: number;
  tipoDoc: string;     // "01" / "03" / "07" / "08" / "99"
  serie: string;       // "F001"
  correlativo: number; // 7
  estado: string;      // ACEPTADO/RECIBIDO/...
  sunatMensaje?: string; // Mensaje de respuesta de SUNAT
  sunatCodigo?: string;  // Código de respuesta SUNAT
  anulado?: boolean;
  motivoAnulacion?: "RA" | "NC" | null;
  receptorNombre?: string;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  total: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  moneda?: string;     // PEN, USD
  opGravada?: number;
  opExonerada?: number;
  opInafecta?: number;
  opGratuita?: number;
  igv?: number;
  metodoPago?: string; // EFECTIVO, CONTADO, CREDITO, etc.
  requiereEnvioSunat?: boolean; // false para ventas internas
  // Para notas de crédito/débito
  comprobanteReferenciaId?: number;
  docReferenciaTipoDoc?: string;
  docReferenciaSerie?: string;
  docReferenciaCorrelativo?: number;
  tipoNotaCodigo?: string;
  motivoNota?: string;
};

export type ItemVenta = {
  codigo?: string;
  descripcion: string;
  unidad?: string;
  unidadImpresion?: string;
  cantidad?: number;
  precioUnitario?: number;
  valorUnitario?: number;
  afectacionIgv?: string;
  igvItem?: number;
  totalItem: number;
};

export type VentaInternaRequest = {
  serie?: string;
  numero?: number;
  fechaEmision: string;
  items: ItemVenta[];
  total: number;
  sucursalId?: number;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  receptorNombre?: string;
};

export type NotaCreditoRequest = {
  serie?: string;
  numero?: number;
  comprobanteReferenciaId: number;
  docReferenciaTipoDoc?: string;
  docReferenciaSerie?: string;
  docReferenciaCorrelativo?: number;
  tipoNotaCodigo: string; // Catálogo 09
  motivoNota: string;
  fechaEmision?: string;
  moneda?: string;
  items: ItemVenta[];
  total: number;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  receptorNombre?: string;
  sucursalId?: number;
};

export type NotaDebitoRequest = {
  serie?: string;
  numero?: number;
  comprobanteReferenciaId: number;
  docReferenciaTipoDoc?: string;
  docReferenciaSerie?: string;
  docReferenciaCorrelativo?: number;
  tipoNotaCodigo: string; // Catálogo 10
  motivoNota: string;
  fechaEmision?: string;
  moneda?: string;
  items: ItemVenta[];
  total: number;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  receptorNombre?: string;
  sucursalId?: number;
};

export async function listComprobantes(): Promise<Comprobante[]> {
  const { data } = await http.get<Comprobante[]>("/api/v1/comprobantes");
  return data;
}

export async function getComprobante(id: number): Promise<Comprobante> {
  const { data } = await http.get<Comprobante>(`/api/v1/comprobantes/${id}`);
  return data;
}

export type ComprobanteConDetalle = {
  id: number;
  tipoDoc: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  receptorNombre?: string;
  totalComprobante: number;
  opGravada: number;
  opExonerada: number;
  opInafecta: number;
  igv: number;
  estado: string;
  items: {
    itemNro?: number;
    codigo?: string;
    descripcion: string;
    unidad?: string;
    cantidad: number;
    valorUnitario: number;
    precioUnitario: number;
    afectacionIgv: string;
    igvItem: number;
    totalItem: number;
  }[];
};

export async function getComprobanteConDetalle(id: number): Promise<ComprobanteConDetalle> {
  const { data } = await http.get<ComprobanteConDetalle>(`/api/v1/comprobantes/${id}/detalle`);
  return data;
}

export async function listarComprobantes(): Promise<Comprobante[]> {
  const { data } = await http.get<Comprobante[]>("/api/v1/comprobantes");
  return data;
}

export async function registrarVentaInterna(request: VentaInternaRequest): Promise<Comprobante> {
  const { data } = await http.post<Comprobante>("/api/v1/comprobantes/ventas-internas", request);
  return data;
}

export async function emitirNotaCredito(request: NotaCreditoRequest): Promise<Comprobante> {
  const { data } = await http.post<Comprobante>("/api/v1/comprobantes/notas-credito", request);
  return data;
}

export async function emitirNotaDebito(request: NotaDebitoRequest): Promise<Comprobante> {
  const { data } = await http.post<Comprobante>("/api/v1/comprobantes/notas-debito", request);
  return data;
}

export type CpeRequest = {
  tipoDoc: string; // "01" factura, "03" boleta
  serie?: string;
  numero?: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  items: {
    codigo?: string;
    descripcion: string;
    unidad?: string;
    unidadImpresion?: string;
    cantidad: number;
    valorUnitario: number;
    precioUnitario: number;
    afectacionIgv: string;
    igvItem: number;
    totalItem: number;
  }[];
  total: number;
  sucursalId?: number;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  receptorNombre?: string;
  tipoPago?: string; // EFECTIVO, YAPE, TRANSFERENCIA, TARJETA
};

export async function emitirComprobante(request: CpeRequest): Promise<Comprobante> {
  const { data } = await http.post<Comprobante>("/api/v1/comprobantes", request);
  return data;
}

export type AnularComprobanteResponse = {
  accion: "RA" | "RC" | "NC";
  ticket?: string | null;
  notaCreditoId?: number | null;
  mensaje?: string | null;
};

export async function anularComprobante(id: number, motivo: string): Promise<AnularComprobanteResponse> {
  const { data } = await http.post<AnularComprobanteResponse>(`/api/v1/comprobantes/${id}/anular`, {
    motivo,
  });
  return data;
}

export type SunatTicketStatusResponse = {
  ticket: string;
  statusCode: string;
  cdrCode?: string | null;
  mensaje?: string | null;
  comprobanteEstado: string;
};

export async function consultarTicketAnulacion(id: number): Promise<SunatTicketStatusResponse> {
  const { data } = await http.get<SunatTicketStatusResponse>(`/api/v1/comprobantes/${id}/anulacion/ticket-status`);
  return data;
}
