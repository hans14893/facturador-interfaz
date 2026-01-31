import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCajasFisicas, getSesiones } from '../../../api/cajaApi';
import { getAuth } from '../../../auth/authStore';
import type { CajaFisica, CajaSesion } from '../../../types/caja';

function formatFecha(f: string) {
  if (!f) return "-";
  const d = new Date(f);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CajasPage() {
  const navigate = useNavigate();
  const auth = getAuth();
  const userId = auth?.usuarioId;
  const roles = (auth?.roles ?? []).map(r => r.toUpperCase());
  const canCreateCaja = roles.includes('ADMIN') || roles.includes('ROLE_ADMIN') || roles.includes('CLIENTE') || roles.includes('ROLE_CLIENTE');
  const [cajas, setCajas] = useState<CajaFisica[]>([]);
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCajaId, setFiltroCajaId] = useState<number | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [cajasData, sesionesData] = await Promise.all([
        getCajasFisicas(),
        getSesiones()
      ]);
      setCajas(cajasData);
      setSesiones(sesionesData);
    } catch (error) {
      console.error('Error al cargar cajas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSesionActiva = (cajaId: number): CajaSesion | undefined => {
    return sesiones.find(s => s.cajaFisica.id === cajaId && s.estado === 'ABIERTA');
  };

  const getEstadoBadge = (caja: CajaFisica, sesion?: CajaSesion) => {
    if (caja.estado === 'INACTIVA') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Inactiva</span>;
    }
    
    if (sesion) {
      const esMiSesion = !!userId && sesion.usuarioAperturaId === userId;
      return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          esMiSesion ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {esMiSesion ? 'Mi sesión abierta' : 'En uso'}
        </span>
      );
    }

    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Disponible</span>;
  };

  const handleAccion = (caja: CajaFisica, sesion?: CajaSesion) => {
    if (sesion) {
      if (!!userId && sesion.usuarioAperturaId === userId) {
        navigate(`/admin/cajas/${sesion.id}/operacion`);
      }
    } else if (caja.estado === 'ACTIVA') {
      navigate(`/admin/cajas/abrir?cajaId=${caja.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cajas Registradoras</h1>
          <p className="text-gray-600 mt-1">Gestiona las sesiones de caja y consulta el estado actual</p>
        </div>
        {canCreateCaja && (
          <button
            onClick={() => navigate('/admin/cajas/nueva')}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium"
          >
            + Nueva Caja
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cajas.map(caja => {
          const sesionActiva = getSesionActiva(caja.id);
          const esMiSesion = !!userId && sesionActiva?.usuarioAperturaId === userId;
          const puedeIngresar = caja.estado === 'ACTIVA' && (!sesionActiva || esMiSesion);

          return (
            <div
              key={caja.id}
              className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all hover:shadow-lg ${
                puedeIngresar ? 'border-blue-200 hover:border-blue-400 cursor-pointer' : 'border-gray-200'
              }`}
              onClick={() => puedeIngresar && handleAccion(caja, sesionActiva)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{caja.nombre}</h3>
                  <p className="text-sm text-gray-500">ID: {caja.id}</p>
                </div>
                {getEstadoBadge(caja, sesionActiva)}
              </div>

              {sesionActiva && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Usuario:</span>
                      <span className="font-medium">
                        {esMiSesion ? 'Tú' : `Usuario ${sesionActiva.usuarioAperturaId}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Apertura:</span>
                      <span className="font-medium">
                        {new Date(sesionActiva.fechaApertura).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saldo inicial:</span>
                      <span className="font-medium">S/ {sesionActiva.saldoInicialEfectivo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {!sesionActiva && caja.estado === 'ACTIVA' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/cajas/abrir?cajaId=${caja.id}`);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Abrir Caja
                  </button>
                </div>
              )}

              {sesionActiva && esMiSesion && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/cajas/${sesionActiva.id}/operacion`);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Ingresar a Caja
                  </button>
                </div>
              )}

              {caja.estado === 'INACTIVA' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">Caja desactivada</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cajas.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cajas registradas</h3>
          <p className="mt-1 text-sm text-gray-500">
            {canCreateCaja ? 'Crea una caja para empezar.' : 'Contacta con el administrador para crear una caja.'}
          </p>
        </div>
      )}

      {/* Historial de Sesiones */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            <svg className={`w-5 h-5 transition-transform ${mostrarHistorial ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Historial de Sesiones ({sesiones.length})
          </button>
        </div>

        {mostrarHistorial && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            {/* Filtro por caja */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por caja:</label>
              <select
                value={filtroCajaId || ""}
                onChange={(e) => setFiltroCajaId(e.target.value ? Number(e.target.value) : null)}
                className="w-full md:w-64 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todas las cajas</option>
                {cajas.map((caja) => (
                  <option key={caja.id} value={caja.id}>
                    {caja.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tabla de sesiones */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Caja</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Apertura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cierre</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Saldo Inicial</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Saldo Final</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sesiones
                    .filter(s => !filtroCajaId || s.cajaFisica.id === filtroCajaId)
                    .sort((a, b) => new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime())
                    .map((sesion, index) => {
                      const esMiSesion = !!userId && sesion.usuarioAperturaId === userId;
                      return (
                        <tr key={sesion.id} className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <span className="font-medium text-gray-900">{sesion.cajaFisica.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                              sesion.estado === 'ABIERTA' 
                                ? 'bg-green-100 text-green-700' 
                                : sesion.estado === 'CERRADA_PENDIENTE_ARQUEO'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                sesion.estado === 'ABIERTA' ? 'bg-green-500' :
                                sesion.estado === 'CERRADA_PENDIENTE_ARQUEO' ? 'bg-amber-500' :
                                'bg-gray-500'
                              }`}></span>
                              {sesion.estado === 'ABIERTA' ? 'Abierta' : 
                               sesion.estado === 'CERRADA_PENDIENTE_ARQUEO' ? 'Pend. Arqueo' : 
                               'Cerrada'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatFecha(sesion.fechaApertura)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {sesion.fechaCierre ? formatFecha(sesion.fechaCierre) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            S/ {sesion.saldoInicialEfectivo?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {sesion.saldoFinalEfectivo != null ? `S/ ${sesion.saldoFinalEfectivo.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sesion.estado === 'ABIERTA' && esMiSesion ? (
                              <button
                                onClick={() => navigate(`/admin/cajas/${sesion.id}/operacion`)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Ingresar
                              </button>
                            ) : sesion.estado === 'CERRADA_PENDIENTE_ARQUEO' ? (
                              <button
                                onClick={() => navigate(`/admin/cajas/${sesion.id}/arqueo`)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Arquear
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/admin/cajas/${sesion.id}/ver-arqueo`)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                              >
                                Ver Arqueo
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {sesiones.filter(s => !filtroCajaId || s.cajaFisica.id === filtroCajaId).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No hay sesiones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
