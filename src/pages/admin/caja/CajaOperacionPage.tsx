import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getSesionById, 
  getResumenSesion, 
  getMovimientosPorSesion,
  getVentasPorSesion
} from '../../../api/cajaApi';
import type { CajaSesion, CajaMovimiento, ResumenCajaSesion, CajaVenta } from '../../../types/caja';

export default function CajaOperacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [sesion, setSesion] = useState<CajaSesion | null>(null);
  const [resumen, setResumen] = useState<ResumenCajaSesion | null>(null);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [ventas, setVentas] = useState<CajaVenta[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState<'ventas' | 'movimientos'>('movimientos');

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [sesionData, resumenData, movimientosData] = await Promise.all([
        getSesionById(parseInt(id!)),
        getResumenSesion(parseInt(id!)),
        getMovimientosPorSesion(parseInt(id!))
      ]);
      setSesion(sesionData);
      setResumen(resumenData);
      setMovimientos(movimientosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    cargarDatos();
    const interval = setInterval(cargarDatos, 30000); // Refresh cada 30 seg
    return () => clearInterval(interval);
  }, [id, cargarDatos]);

  useEffect(() => {
    if (!id) return;
    if (tabActiva !== 'ventas') return;

    (async () => {
      try {
        setLoadingVentas(true);
        const data = await getVentasPorSesion(parseInt(id), 200);
        setVentas(data);
      } catch (error) {
        console.error('Error al cargar ventas:', error);
      } finally {
        setLoadingVentas(false);
      }
    })();
  }, [id, tabActiva]);

  if (loading || !sesion || !resumen) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const saldos = resumen.saldosEsperados;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sesion.cajaFisica.nombre}</h1>
            <p className="text-gray-600 mt-1">
              Apertura: {new Date(sesion.fechaApertura).toLocaleString('es-PE')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Saldo inicial: S/ {sesion.saldoInicialEfectivo.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/cajas')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Saldos por método de pago */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(saldos).map(([metodo, saldo]) => (
          <div key={metodo} className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">
              {metodo}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              S/ {saldo.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen total */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm">Total Esperado</p>
            <p className="text-3xl font-bold">S/ {resumen.totalEsperado.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Transacciones</p>
            <p className="text-2xl font-bold">{resumen.cantidadVentas} ventas | {resumen.cantidadMovimientos} movimientos</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate(`/admin/cajas/${id}/movimiento?tipo=INGRESO`)}
          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          + Registrar Ingreso
        </button>
        <button
          onClick={() => navigate(`/admin/cajas/${id}/movimiento?tipo=EGRESO`)}
          className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          - Registrar Egreso
        </button>
        <button
          onClick={() => navigate(`/admin/cajas/${id}/arqueo`)}
          className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
        >
          📊 Hacer Arqueo
        </button>
        <button
          onClick={() => navigate(`/admin/cajas/${id}/cerrar`)}
          className="px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
        >
          🔒 Cerrar Caja
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setTabActiva('movimientos')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                tabActiva === 'movimientos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Movimientos ({movimientos.length})
            </button>
            <button
              onClick={() => setTabActiva('ventas')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                tabActiva === 'ventas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ventas ({resumen.cantidadVentas})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {tabActiva === 'movimientos' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientos.map(mov => (
                    <tr key={mov.id} className={mov.estado === 'ANULADO' ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          mov.tipo === 'INGRESO' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{mov.motivo}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{mov.metodoPago}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        S/ {mov.monto.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(mov.fecha).toLocaleString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {mov.estado === 'ANULADO' && (
                          <span className="text-red-600 text-xs">ANULADO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movimientos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay movimientos registrados
                </div>
              )}
            </div>
          )}

          {tabActiva === 'ventas' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprobante</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventas.map(v => {
                    const pagos = [
                      v.montoEfectivo > 0 ? `Efe S/ ${v.montoEfectivo.toFixed(2)}` : null,
                      v.montoYape > 0 ? `Yape S/ ${v.montoYape.toFixed(2)}` : null,
                      v.montoTransferencia > 0 ? `Transf S/ ${v.montoTransferencia.toFixed(2)}` : null,
                      v.montoTarjeta > 0 ? `Tarj S/ ${v.montoTarjeta.toFixed(2)}` : null,
                      v.montoOtros > 0 ? `Otros S/ ${v.montoOtros.toFixed(2)}` : null
                    ].filter(Boolean).join(' | ');

                    return (
                      <tr key={v.id}>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(v.fechaEmision).toLocaleString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {v.tipoDoc}-{v.serie}-{v.correlativo}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[320px] truncate" title={v.receptorNombre || ''}>
                          {v.receptorNombre || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right">
                          S/ {v.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {pagos || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-xs text-gray-700">
                            {v.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/admin/comprobantes/${v.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {loadingVentas && (
                <div className="text-center py-6 text-gray-500">
                  Cargando ventas...
                </div>
              )}

              {!loadingVentas && ventas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay ventas asociadas a esta sesión.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
