// Enums como const objects (compatible con erasableSyntaxOnly)
export const CajaEstado = {
  ACTIVA: 'ACTIVA',
  INACTIVA: 'INACTIVA'
} as const;
export type CajaEstado = typeof CajaEstado[keyof typeof CajaEstado];

export const CajaSesionEstado = {
  ABIERTA: 'ABIERTA',
  CERRADA: 'CERRADA',
  CERRADA_PENDIENTE_ARQUEO: 'CERRADA_PENDIENTE_ARQUEO'
} as const;
export type CajaSesionEstado = typeof CajaSesionEstado[keyof typeof CajaSesionEstado];

export const MovimientoTipo = {
  INGRESO: 'INGRESO',
  EGRESO: 'EGRESO'
} as const;
export type MovimientoTipo = typeof MovimientoTipo[keyof typeof MovimientoTipo];

export const MovimientoEstado = {
  ACTIVO: 'ACTIVO',
  ANULADO: 'ANULADO'
} as const;
export type MovimientoEstado = typeof MovimientoEstado[keyof typeof MovimientoEstado];

export const MetodoPago = {
  EFECTIVO: 'EFECTIVO',
  YAPE: 'YAPE',
  TRANSFERENCIA: 'TRANSFERENCIA',
  TARJETA: 'TARJETA',
  OTROS: 'OTROS'
} as const;
export type MetodoPago = typeof MetodoPago[keyof typeof MetodoPago];

// Interfaces principales
export interface CajaFisica {
  id: number;
  empresaId: number;
  nombre: string;
  estado: CajaEstado;
}

export interface CajaSesion {
  id: number;
  empresaId: number;
  cajaFisica: CajaFisica;
  usuarioAperturaId: number;
  fechaApertura: string;
  saldoInicialEfectivo: number;
  saldoFinalEfectivo?: number;
  estado: CajaSesionEstado;
  cerradaAutomaticamente: boolean;
  fechaCierre?: string;
  usuarioCierreId?: number;
  motivoCierre?: string;
  observacion?: string;
  usuario?: { nombre: string };
}

export interface CajaMovimiento {
  id: number;
  cajaSesion: CajaSesion;
  tipo: MovimientoTipo;
  motivo: string;
  metodoPago: MetodoPago;
  monto: number;
  observacion?: string;
  usuarioId: number;
  fecha: string;
  estado: MovimientoEstado;
  anuladoMotivo?: string;
  anuladoPor?: number;
  anuladoFecha?: string;
}

export interface CajaArqueo {
  id: number;
  cajaSesion: CajaSesion;
  contadoEfectivo: number;
  contadoYape: number;
  contadoTransferencia: number;
  contadoTarjeta: number;
  contadoOtros: number;
  esperadoEfectivo: number;
  esperadoYape: number;
  esperadoTransferencia: number;
  esperadoTarjeta: number;
  esperadoOtros: number;
  esperadoTotal: number;
  contadoTotal: number;
  diferenciaTotal: number;
  observacion?: string;
  fecha: string;
  usuarioId: number;
}

// DTOs para requests
export interface AbrirCajaRequest {
  cajaFisicaId: number;
  saldoInicialEfectivo: number;
  observacion?: string;
}

export interface CerrarCajaRequest {
  motivoCierre: string;
  observacion?: string;
}

export interface MovimientoRequest {
  cajaSesionId: number;
  motivo: string;
  metodoPago: MetodoPago;
  monto: number;
  observacion?: string;
}

export interface ArqueoRequest {
  cajaSesionId: number;
  contadoEfectivo: number;
  contadoYape: number;
  contadoTransferencia: number;
  contadoTarjeta: number;
  contadoOtros: number;
  observacion?: string;
}

// DTOs para responses
export interface SaldosPorMetodo {
  EFECTIVO: number;
  YAPE: number;
  TRANSFERENCIA: number;
  TARJETA: number;
  OTROS: number;
}

export interface TotalesPorMetodo {
  [key: string]: {
    ingresos: number;
    egresos: number;
    neto: number;
  };
}

export interface ResumenCajaSesion {
  sesion: CajaSesion;
  saldosEsperados: SaldosPorMetodo;
  totalEsperado: number;
  cantidadMovimientos: number;
  cantidadVentas: number;
  saldoInicial?: number;
  totalVentas?: number;
  totalMovimientos?: number;
  arqueo?: CajaArqueo;
}

export interface CajaVenta {
  id: number;
  tipoDoc: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  receptorNombre?: string;
  receptorTipoDoc?: string;
  receptorNroDoc?: string;
  total: number;
  estado: string;
  montoEfectivo: number;
  montoYape: number;
  montoTransferencia: number;
  montoTarjeta: number;
  montoOtros: number;
}
