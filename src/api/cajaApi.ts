import { http } from './http';
import { getAuth } from '../auth/authStore';
import type {
  CajaFisica,
  CajaSesion,
  CajaMovimiento,
  CajaArqueo,
  AbrirCajaRequest,
  CerrarCajaRequest,
  MovimientoRequest,
  ArqueoRequest,
  SaldosPorMetodo,
  TotalesPorMetodo,
  ResumenCajaSesion,
  CajaVenta
} from '../types/caja';

const BASE_URL = '/api/v1/cajas';

function getEmpresaParams() {
  const empresaId = getAuth()?.empresaId;
  return empresaId ? { empresaId } : undefined;
}

// ==================== CAJAS FÍSICAS ====================

export const getCajasFisicas = async (): Promise<CajaFisica[]> => {
  const response = await http.get<CajaFisica[]>(BASE_URL, { params: getEmpresaParams() });
  return response.data;
};

export const getCajasActivas = async (): Promise<CajaFisica[]> => {
  const response = await http.get<CajaFisica[]>(`${BASE_URL}/activas`, { params: getEmpresaParams() });
  return response.data;
};

export const getCajasActivasConEstado = async (): Promise<any[]> => {
  const response = await http.get<any[]>(`${BASE_URL}/activas/con-estado`, { params: getEmpresaParams() });
  return response.data;
};

export const getCajaFisicaById = async (id: number): Promise<CajaFisica> => {
  const response = await http.get<CajaFisica>(`${BASE_URL}/${id}`, { params: getEmpresaParams() });
  return response.data;
};

export const crearCajaFisica = async (data: Partial<CajaFisica>): Promise<CajaFisica> => {
  const response = await http.post<CajaFisica>(BASE_URL, data);
  return response.data;
};

export const actualizarCajaFisica = async (id: number, data: Partial<CajaFisica>): Promise<CajaFisica> => {
  const response = await http.put<CajaFisica>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const cambiarEstadoCaja = async (id: number, estado: string): Promise<void> => {
  await http.put(`${BASE_URL}/${id}/estado`, null, { params: { estado } });
};

// ==================== SESIONES ====================

export const getSesiones = async (): Promise<CajaSesion[]> => {
  const response = await http.get<CajaSesion[]>(`${BASE_URL}/sesiones`, { params: getEmpresaParams() });
  return response.data;
};

export const getSesionActiva = async (): Promise<CajaSesion | null> => {
  try {
    const response = await http.get<CajaSesion>(`${BASE_URL}/sesiones/activa`, { params: getEmpresaParams() });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 204) {
      return null;
    }
    throw error;
  }
};

export const getSesionById = async (id: number): Promise<CajaSesion> => {
  const response = await http.get<CajaSesion>(`${BASE_URL}/sesiones/${id}`, { params: getEmpresaParams() });
  return response.data;
};

export const getResumenSesion = async (id: number): Promise<ResumenCajaSesion> => {
  const response = await http.get<ResumenCajaSesion>(`${BASE_URL}/sesiones/${id}/resumen`, { params: getEmpresaParams() });
  return response.data;
};

export const getVentasPorSesion = async (id: number, limit: number = 200): Promise<CajaVenta[]> => {
  const response = await http.get<CajaVenta[]>(`${BASE_URL}/sesiones/${id}/ventas`, {
    params: { limit, ...getEmpresaParams() }
  });
  return response.data;
};

export const getSaldosEsperados = async (id: number): Promise<SaldosPorMetodo> => {
  const response = await http.get<SaldosPorMetodo>(`${BASE_URL}/sesiones/${id}/saldos-esperados`, { params: getEmpresaParams() });
  return response.data;
};

export const abrirCaja = async (request: AbrirCajaRequest): Promise<CajaSesion> => {
  const response = await http.post<CajaSesion>(`${BASE_URL}/sesiones/abrir`, request, { params: getEmpresaParams() });
  return response.data;
};

export const cerrarCaja = async (sesionId: number, request: CerrarCajaRequest): Promise<void> => {
  await http.post(`${BASE_URL}/sesiones/${sesionId}/cerrar`, request, { params: getEmpresaParams() });
};

export const getSesionesAbiertas = async (): Promise<CajaSesion[]> => {
  const response = await http.get<CajaSesion[]>(`${BASE_URL}/sesiones/abiertas`, { params: getEmpresaParams() });
  return response.data;
};

export const listSesionesAbiertas = getSesionesAbiertas; // Alias para mantener compatibilidad

// ==================== MOVIMIENTOS ====================

export const getMovimientosPorSesion = async (cajaSesionId: number): Promise<CajaMovimiento[]> => {
  const response = await http.get<CajaMovimiento[]>(`${BASE_URL}/movimientos/sesion/${cajaSesionId}`, { params: getEmpresaParams() });
  return response.data;
};

export const getMovimientosActivosPorSesion = async (cajaSesionId: number): Promise<CajaMovimiento[]> => {
  const response = await http.get<CajaMovimiento[]>(`${BASE_URL}/movimientos/sesion/${cajaSesionId}/activos`, { params: getEmpresaParams() });
  return response.data;
};

export const getTotalesPorMetodo = async (cajaSesionId: number): Promise<TotalesPorMetodo> => {
  const response = await http.get<TotalesPorMetodo>(`${BASE_URL}/movimientos/sesion/${cajaSesionId}/totales`, { params: getEmpresaParams() });
  return response.data;
};

export const registrarIngreso = async (request: MovimientoRequest): Promise<CajaMovimiento> => {
  const response = await http.post<CajaMovimiento>(`${BASE_URL}/movimientos/ingreso`, request, { params: getEmpresaParams() });
  return response.data;
};

export const registrarEgreso = async (request: MovimientoRequest): Promise<CajaMovimiento> => {
  const response = await http.post<CajaMovimiento>(`${BASE_URL}/movimientos/egreso`, request, { params: getEmpresaParams() });
  return response.data;
};

export const anularMovimiento = async (id: number, motivo: string): Promise<void> => {
  await http.put(`${BASE_URL}/movimientos/${id}/anular`, { motivo }, { params: getEmpresaParams() });
};

// ==================== ARQUEOS ====================

export const getArqueoPorSesion = async (cajaSesionId: number): Promise<CajaArqueo | null> => {
  try {
    const response = await http.get<CajaArqueo>(`${BASE_URL}/arqueos/sesion/${cajaSesionId}`, { params: getEmpresaParams() });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 204) {
      return null;
    }
    throw error;
  }
};

export const validarArqueo = async (cajaSesionId: number): Promise<boolean> => {
  const response = await http.get<{ existe: boolean }>(`${BASE_URL}/arqueos/sesion/${cajaSesionId}/existe`, { params: getEmpresaParams() });
  return response.data.existe;
};

export const registrarArqueo = async (request: ArqueoRequest): Promise<CajaArqueo> => {
  const response = await http.post<CajaArqueo>(`${BASE_URL}/arqueos`, request);
  return response.data;
};

export const getUmbralDiferencia = async (): Promise<number> => {
  const response = await http.get<{ umbral: number }>(`${BASE_URL}/arqueos/umbral-diferencia`);
  return response.data.umbral;
};
