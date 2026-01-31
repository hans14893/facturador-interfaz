import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { 
  validarArqueo, 
  getResumenSesion, 
  cerrarCaja 
} from '../../../../api/cajaApi';
import Modal from '../../../../components/Modal';
import type { ResumenCajaSesion } from '../../../../types/caja';

const MOTIVOS_CIERRE = [
  'Fin de turno',
  'Cambio de cajero',
  'Fin de jornada',
  'Cierre por emergencia',
  'Otro'
];

export default function CerrarCajaModal() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const getErrorMessageFromUnknown = (data: unknown): string | null => {
    if (typeof data === 'string' && data.trim()) return data;
    if (!data || typeof data !== 'object') return null;
    if ('message' in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return null;
  };

  const [tieneArqueo, setTieneArqueo] = useState<boolean>(false);
  const [resumen, setResumen] = useState<ResumenCajaSesion | null>(null);
  const [motivoCierre, setMotivoCierre] = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [arqueoValido, resumenData] = await Promise.all([
        validarArqueo(parseInt(id!)),
        getResumenSesion(parseInt(id!))
      ]);

      setTieneArqueo(arqueoValido);
      setResumen(resumenData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('No se pudo cargar la información de la sesión');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const motivoFinal = motivoCierre === 'Otro' ? motivoCustom : motivoCierre;
    if (!motivoFinal.trim()) {
      setError('Debes especificar un motivo de cierre');
      return;
    }

    try {
      setSubmitting(true);
      
      await cerrarCaja(parseInt(id!), {
        motivoCierre: motivoFinal,
        observacion: observacion.trim() || undefined
      });

      navigate('/admin/cajas', { 
        state: { message: 'Caja cerrada correctamente' } 
      });
    } catch (err: unknown) {
      console.error('Error al cerrar caja:', err);
      if (err instanceof AxiosError) {
        const apiMsg = getErrorMessageFromUnknown(err.response?.data);
        setError(apiMsg || err.message || 'Error al cerrar la caja');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cerrar la caja');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Modal
        isOpen={true}
        onClose={() => navigate(`/admin/cajas/${id}/operacion`)}
        title="Cerrar Caja"
      >
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validando datos...</p>
        </div>
      </Modal>
    );
  }

  // Si no tiene arqueo, mostrar advertencia
  if (!tieneArqueo) {
    return (
      <Modal
        isOpen={true}
        onClose={() => navigate(`/admin/cajas/${id}/operacion`)}
        title="Cerrar Caja"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">
                  Arqueo pendiente
                </h3>
                <p className="text-sm text-yellow-700">
                  Debes realizar el arqueo de caja antes de cerrarla. El arqueo es obligatorio para verificar que el dinero físico coincida con el sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/admin/cajas/${id}/operacion`)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              onClick={() => navigate(`/admin/cajas/${id}/arqueo`)}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md"
            >
              Ir a Arqueo
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const diferenciaTotal = resumen?.arqueo?.diferenciaTotal || 0;
  const tieneDiferenciaAlta = Math.abs(diferenciaTotal) > 50;

  return (
    <Modal
      isOpen={true}
      onClose={() => navigate(`/admin/cajas/${id}/operacion`)}
      title="Cerrar Caja"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
          <p className="text-sm text-blue-700">
            ✅ El arqueo ha sido completado. Revisa el resumen antes de confirmar el cierre.
          </p>
        </div>

        {tieneDiferenciaAlta && (
          <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
            <div className="flex items-start">
              <span className="text-xl mr-2">⚠️</span>
              <div>
                <h4 className="font-semibold text-yellow-800">Diferencia detectada</h4>
                <p className="text-sm text-yellow-700">
                  Hay una diferencia de <strong>S/ {Math.abs(diferenciaTotal).toFixed(2)}</strong> {diferenciaTotal > 0 ? 'a favor' : 'en contra'} en el arqueo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resumen de la sesión */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 mb-3">Resumen de la Sesión</h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Saldo Inicial:</span>
              <p className="font-semibold">S/ {resumen?.saldoInicial?.toFixed(2)}</p>
            </div>
            
            <div>
              <span className="text-gray-600">Total Ventas:</span>
              <p className="font-semibold text-green-600">
                +S/ {resumen?.totalVentas?.toFixed(2)}
              </p>
            </div>
            
            <div>
              <span className="text-gray-600">Movimientos (Neto):</span>
              <p className={`font-semibold ${resumen && (resumen.totalMovimientos ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {resumen && (resumen.totalMovimientos ?? 0) >= 0 ? '+' : ''}S/ {resumen?.totalMovimientos?.toFixed(2)}
              </p>
            </div>
            
            <div>
              <span className="text-gray-600">Saldo Esperado:</span>
              <p className="font-semibold text-blue-600">
                S/ {resumen?.totalEsperado?.toFixed(2)}
              </p>
            </div>
          </div>

          {resumen?.arqueo && (
            <div className="pt-3 border-t mt-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Total Contado:</span>
                  <p className="font-semibold">
                    S/ {(
                      resumen.arqueo.contadoEfectivo +
                      resumen.arqueo.contadoYape +
                      resumen.arqueo.contadoTransferencia +
                      resumen.arqueo.contadoTarjeta +
                      resumen.arqueo.contadoOtros
                    ).toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-600">Diferencia:</span>
                  <p className={`font-semibold ${diferenciaTotal > 0 ? 'text-green-600' : diferenciaTotal < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {diferenciaTotal >= 0 ? '+' : ''}S/ {diferenciaTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de Cierre <span className="text-red-500">*</span>
          </label>
          <select
            value={motivoCierre}
            onChange={(e) => setMotivoCierre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={submitting}
          >
            <option value="">Seleccione un motivo</option>
            {MOTIVOS_CIERRE.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {motivoCierre === 'Otro' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Especificar motivo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={motivoCustom}
              onChange={(e) => setMotivoCustom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe el motivo"
              required
              disabled={submitting}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observación
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notas adicionales (opcional)"
            disabled={submitting}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/cajas/${id}/operacion`)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Cerrando...' : 'Cerrar Caja'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
