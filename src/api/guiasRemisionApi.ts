import { http } from './http';

export type GuiaRemisionRequest = {
  serie?: string;
  numero?: number;
  fechaEmision?: string;
  fechaInicioTraslado: string;
  moneda?: string;
  
  // Motivo y modalidad
  motivoTrasladoCodigo: string; // Catálogo 20
  motivoTrasladoDescripcion?: string;
  modalidadTransporte: string; // 01=Público, 02=Privado
  
  // Datos del traslado
  pesoBrutoTotal: number;
  numeroBultos: number;
  unidadMedidaPeso?: string;
  
  // Partida y llegada
  partidaUbigeo: string;
  partidaDireccion: string;
  llegadaUbigeo: string;
  llegadaDireccion: string;
  
  // Destinatario
  destinatarioTipoDoc: string;
  destinatarioNroDoc: string;
  destinatarioNombre: string;
  
  // Transportista (modalidad pública)
  transportistaTipoDoc?: string;
  transportistaNroDoc?: string;
  transportistaNombre?: string;
  
  // Conductor y vehículo (modalidad privada)
  conductorTipoDoc?: string;
  conductorNroDoc?: string;
  conductorNombres?: string;
  conductorApellidos?: string;
  conductorLicencia?: string;
  vehiculoPlaca?: string;
  vehiculoMarca?: string;
  
  // Documento relacionado (opcional)
  documentoRelacionadoTipo?: string;
  documentoRelacionadoSerie?: string;
  documentoRelacionadoCorrelativo?: number;
  
  // Items
  items: ItemGuia[];
  
  sucursalId?: number;
};

export type ItemGuia = {
  codigo?: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
};

// Catálogo 20: Motivos de traslado
export const MOTIVOS_TRASLADO: Record<string, string> = {
  '01': 'Venta',
  '02': 'Compra',
  '04': 'Traslado entre establecimientos de la misma empresa',
  '08': 'Importación',
  '09': 'Exportación',
  '13': 'Otros',
  '14': 'Venta sujeta a confirmación del comprador',
  '18': 'Traslado emisor itinerante CP',
  '19': 'Traslado a zona primaria',
};

export const emitirGuiaRemision = async (request: GuiaRemisionRequest) => {
  const { data } = await http.post('/api/v1/comprobantes/guias-remision', request);
  return data;
};
