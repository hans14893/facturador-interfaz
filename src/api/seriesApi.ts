import { http } from './http';

export type Serie = {
  id?: number;
  empresaId?: number;
  tipoDoc: string;
  serie: string;
  ultimoCorrelativo?: number;
  activa: boolean;
  descripcion?: string;
  sucursalId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Listar series de la empresa
 * @param tipoDoc Filtro opcional por tipo de documento
 * @param soloActivas Filtro opcional para mostrar solo las series activas
 */
export const listarSeries = async (tipoDoc?: string, soloActivas?: boolean): Promise<Serie[]> => {
  const params: Record<string, string> = {};
  
  if (tipoDoc) params.tipoDoc = tipoDoc;
  if (soloActivas !== undefined) params.soloActivas = soloActivas.toString();

  const response = await http.get('/api/v1/series', { params });
  return response.data;
};

/**
 * Obtener una serie por ID
 */
export const obtenerSerie = async (id: number): Promise<Serie> => {
  const response = await http.get(`/api/v1/series/${id}`);
  return response.data;
};

/**
 * Crear una nueva serie
 */
export const crearSerie = async (serie: Omit<Serie, 'id' | 'empresaId' | 'createdAt' | 'updatedAt'>): Promise<Serie> => {
  const response = await http.post('/api/v1/series', serie);
  return response.data;
};

/**
 * Actualizar una serie existente
 */
export const actualizarSerie = async (id: number, serie: Partial<Serie>): Promise<Serie> => {
  const response = await http.put(`/api/v1/series/${id}`, serie);
  return response.data;
};

/**
 * Eliminar (desactivar) una serie
 */
export const eliminarSerie = async (id: number): Promise<void> => {
  await http.delete(`/api/v1/series/${id}`);
};

/**
 * Obtener serie sugerida para un tipo de documento
 */
export const obtenerSerieSugerida = async (tipoDoc: string): Promise<string> => {
  const response = await http.get(`/api/v1/series/sugerida/${tipoDoc}`);
  return response.data.serie;
};

/**
 * Reiniciar correlativo de una serie (CUIDADO)
 */
export const reiniciarCorrelativo = async (id: number): Promise<void> => {
  await http.post(`/api/v1/series/${id}/reiniciar-correlativo`, null);
};

// Nombres de tipos de documento para mostrar en UI
export const TIPOS_DOCUMENTO: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de Crédito',
  '08': 'Nota de Débito',
  '09': 'Guía de Remisión',
  '31': 'Guía de Remisión Transportista',
  '99': 'Venta Interna',
};

// Opciones extendidas para crear series (separando NC y ND por tipo de doc original)
export const TIPOS_DOCUMENTO_SERIES: { code: string; name: string; serie: string }[] = [
  { code: '01', name: 'Factura', serie: 'F001' },
  { code: '03', name: 'Boleta', serie: 'B001' },
  { code: '07', name: 'Nota de Crédito (Factura)', serie: 'FC01' },
  { code: '07', name: 'Nota de Crédito (Boleta)', serie: 'BC01' },
  { code: '08', name: 'Nota de Débito (Factura)', serie: 'FD01' },
  { code: '08', name: 'Nota de Débito (Boleta)', serie: 'BD01' },
  { code: '09', name: 'Guía de Remisión', serie: 'T001' },
  { code: '31', name: 'Guía de Remisión Transportista', serie: 'V001' },
  { code: '99', name: 'Venta Interna', serie: 'VI01' },
];

// Series por defecto sugeridas
export const SERIES_POR_DEFECTO: Record<string, string> = {
  '01': 'F001',
  '03': 'B001',
  '07': 'FC01',  // NC de Factura (BC01 para NC de Boleta)
  '08': 'FD01',  // ND de Factura (BD01 para ND de Boleta)
  '09': 'T001',
  '31': 'T001',
  '99': 'VI01',
};

// Series para NC y ND según tipo de documento original (SUNAT Error 2116)
export const SERIES_NC_ND: Record<string, { factura: string; boleta: string }> = {
  '07': { factura: 'FC01', boleta: 'BC01' },  // Nota de Crédito
  '08': { factura: 'FD01', boleta: 'BD01' },  // Nota de Débito
};

/**
 * Obtiene la serie correcta para NC o ND según el tipo de documento original
 * @param tipoNota '07' para NC, '08' para ND
 * @param tipoDocOriginal '01' para Factura, '03' para Boleta
 */
export const obtenerSeriePorTipoDocOriginal = (
  tipoNota: '07' | '08',
  tipoDocOriginal: '01' | '03'
): string => {
  const series = SERIES_NC_ND[tipoNota];
  return tipoDocOriginal === '03' ? series.boleta : series.factura;
};
