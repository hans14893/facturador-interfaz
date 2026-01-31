import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getSesionById,
  getArqueoPorSesion,
  getSaldosEsperados
} from '../../../../api/cajaApi';
import Modal from '../../../../components/Modal';
import type { CajaSesion, CajaArqueo, SaldosPorMetodo } from '../../../../types/caja';

function formatFecha(f: string) {
  if (!f) return "-";
  const d = new Date(f);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VerArqueoModal() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [sesion, setSesion] = useState<CajaSesion | null>(null);
  const [arqueo, setArqueo] = useState<CajaArqueo | null>(null);
  const [esperados, setEsperados] = useState<SaldosPorMetodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [sesionData, arqueoData, saldosData] = await Promise.all([
          getSesionById(parseInt(id!)),
          getArqueoPorSesion(parseInt(id!)),
          getSaldosEsperados(parseInt(id!))
        ]);
        
        setSesion(sesionData);
        setArqueo(arqueoData);
        setEsperados(saldosData);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('No se pudo cargar la información del arqueo');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [id]);

  const handleClose = () => {
    navigate('/admin/cajas');
  };

  const getDiferencia = (esperado: number, contado: number) => {
    return contado - esperado;
  };

  const getDiferenciaClass = (diferencia: number): string => {
    if (diferencia === 0) return 'text-green-600';
    if (diferencia > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={handleClose} title="Arqueo de Caja">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </Modal>
    );
  }

  if (!sesion) {
    return (
      <Modal isOpen={true} onClose={handleClose} title="Error">
        <div className="text-center py-8 text-red-600">
          Sesión no encontrada
        </div>
      </Modal>
    );
  }

  if (!arqueo) {
    return (
      <Modal isOpen={true} onClose={handleClose} title="Arqueo de Caja">
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 font-medium">No hay arqueo registrado</p>
          <p className="text-sm text-gray-400 mt-1">Esta sesión no tiene un arqueo asociado</p>
        </div>
      </Modal>
    );
  }

  const totalEsperado = (esperados?.EFECTIVO || 0) + (esperados?.YAPE || 0) + 
                        (esperados?.TRANSFERENCIA || 0) + (esperados?.TARJETA || 0) + 
                        (esperados?.OTROS || 0);

  const totalContado = arqueo.contadoEfectivo + arqueo.contadoYape + 
                       arqueo.contadoTransferencia + arqueo.contadoTarjeta + 
                       arqueo.contadoOtros;

  const diferenciaTotal = totalContado - totalEsperado;

  const renderFila = (
    metodo: string,
    icono: React.ReactNode,
    esperado: number,
    contado: number
  ) => {
    const diferencia = getDiferencia(esperado, contado);
    return (
      <tr key={metodo} className="border-b border-gray-100">
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-2">
            {icono}
            <span className="font-medium text-gray-700 text-sm">{metodo}</span>
          </div>
        </td>
        <td className="py-2.5 px-2 text-right text-sm text-gray-600">
          S/ {esperado.toFixed(2)}
        </td>
        <td className="py-2.5 px-2 text-right text-sm font-medium text-gray-900">
          S/ {contado.toFixed(2)}
        </td>
        <td className={`py-2.5 px-2 text-right text-sm font-bold ${getDiferenciaClass(diferencia)}`}>
          S/ {diferencia.toFixed(2)}
        </td>
      </tr>
    );
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Detalle del Arqueo">
      <div className="space-y-4">
        {/* Info de la sesión */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="font-semibold text-gray-900">{sesion.cajaFisica.nombre}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Apertura:</span> {formatFecha(sesion.fechaApertura)}
            </div>
            <div>
              <span className="text-gray-400">Cierre:</span> {sesion.fechaCierre ? formatFecha(sesion.fechaCierre) : '-'}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Tabla de arqueo */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-2 text-left text-xs font-semibold text-gray-600">Método</th>
                <th className="py-2 px-2 text-right text-xs font-semibold text-gray-600">Esperado</th>
                <th className="py-2 px-2 text-right text-xs font-semibold text-gray-600">Contado</th>
                <th className="py-2 px-2 text-right text-xs font-semibold text-gray-600">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {renderFila('Efectivo', 
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>,
                esperados?.EFECTIVO || 0, 
                arqueo.contadoEfectivo
              )}
              {renderFila('Yape/Plin',
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>,
                esperados?.YAPE || 0, 
                arqueo.contadoYape
              )}
              {renderFila('Transferencia',
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>,
                esperados?.TRANSFERENCIA || 0, 
                arqueo.contadoTransferencia
              )}
              {renderFila('Tarjeta',
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>,
                esperados?.TARJETA || 0, 
                arqueo.contadoTarjeta
              )}
              {renderFila('Otros',
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>,
                esperados?.OTROS || 0, 
                arqueo.contadoOtros
              )}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${
                diferenciaTotal === 0 ? 'bg-green-50' : 
                diferenciaTotal > 0 ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                <td className="py-2.5 px-2 font-bold text-gray-900 text-sm">TOTAL</td>
                <td className="py-2.5 px-2 text-right font-bold text-gray-700 text-sm">
                  S/ {totalEsperado.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right font-bold text-gray-900 text-sm">
                  S/ {totalContado.toFixed(2)}
                </td>
                <td className={`py-2.5 px-2 text-right font-bold text-sm ${getDiferenciaClass(diferenciaTotal)}`}>
                  S/ {diferenciaTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Resumen de diferencia */}
        <div className={`p-3 rounded-lg border ${
          diferenciaTotal === 0 ? 'bg-green-50 border-green-200' :
          diferenciaTotal > 0 ? 'bg-blue-50 border-blue-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {diferenciaTotal === 0 ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : diferenciaTotal > 0 ? (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span className={`text-sm font-medium ${
              diferenciaTotal === 0 ? 'text-green-700' :
              diferenciaTotal > 0 ? 'text-blue-700' :
              'text-red-700'
            }`}>
              {diferenciaTotal === 0 ? 'Arqueo cuadrado correctamente' :
               diferenciaTotal > 0 ? `Sobrante de S/ ${diferenciaTotal.toFixed(2)}` :
               `Faltante de S/ ${Math.abs(diferenciaTotal).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Observación */}
        {arqueo.observacion && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Observación:</p>
            <p className="text-sm text-gray-700">{arqueo.observacion}</p>
          </div>
        )}

        {/* Botón cerrar */}
        <div className="pt-2">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
