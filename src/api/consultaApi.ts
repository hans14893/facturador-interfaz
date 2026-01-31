import { http } from './http';

export type ConsultaRucResponse = {
  estado: boolean;
  mensaje: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  condicion?: string;
  estadoRuc?: string;
};

export type ConsultaDniResponse = {
  estado: boolean;
  mensaje: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
};

/**
 * Consultar RUC en API externa (perudevs.com)
 */
export const consultarRuc = async (ruc: string): Promise<ConsultaRucResponse> => {
  const { data } = await http.get(`/api/v1/consultas/ruc/${ruc}`);
  return data;
};

/**
 * Consultar DNI en API externa (perudevs.com)
 */
export const consultarDni = async (dni: string): Promise<ConsultaDniResponse> => {
  const { data } = await http.get(`/api/v1/consultas/dni/${dni}`);
  return data;
};
