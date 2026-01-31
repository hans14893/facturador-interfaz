import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { 
  getSesionById,
  getSaldosEsperados, 
  registrarArqueo, 
  getUmbralDiferencia 
} from '../../../api/cajaApi';
import type { CajaSesion, SaldosPorMetodo } from '../../../types/caja';

export default function FinalizarArqueoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [sesion, setSesion] = useState<CajaSesion | null>(null);
  const [esperados, setEsperados] = useState<SaldosPorMetodo | null>(null);
  const [umbral, setUmbral] = useState<number>(0);
  
  const [contadoEfectivo, setContadoEfectivo] = useState<string>('0');
  const [contadoYape, setContadoYape] = useState<string>('0');
  const [contadoTransferencia, setContadoTransferencia] = useState<string>('0');
  const [contadoTarjeta, setContadoTarjeta] = useState<string>('0');
  const [contadoOtros, setContadoOtros] = useState<string>('0');
  
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getErrorMessageFromUnknown = (err: unknown, fallbackMessage: string) => {
    const axiosError = err as AxiosError<unknown>;
    const data = axiosError?.response?.data;

    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const maybe = data as Record<string, unknown>;
      const msg = maybe.message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }

    if (axiosError?.message) return axiosError.message;
    if (err instanceof Error && err.message) return err.message;
    return fallbackMessage;
  };

  const cargarDatos = useCallback(async () => {
    try {
      if (!id) {
        setError('No se encontró el ID de la sesión');
        return;
      }

      setLoading(true);
      const sesionId = parseInt(id);
      const [sesionData, saldos, umbralValue] = await Promise.all([
        getSesionById(sesionId),
        getSaldosEsperados(sesionId),
        getUmbralDiferencia()
      ]);
      
      setSesion(sesionData);
      setEsperados(saldos);
      setUmbral(umbralValue);
    } catch (err: unknown) {
      console.error('Error al cargar datos:', err);
      setError('No se pudo cargar los datos de la sesión');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const getDiferencia = (esperado: number, contadoStr: string) => {
    const contado = parseFloat(contadoStr) || 0;
    return contado - esperado;
  };

  const getTotalEsperado = () => {
    if (!esperados) return 0;
    return esperados.EFECTIVO + esperados.YAPE + esperados.TRANSFERENCIA + 
           esperados.TARJETA + esperados.OTROS;
  };

  const getTotalContado = () => {
    return (parseFloat(contadoEfectivo) || 0) +
           (parseFloat(contadoYape) || 0) +
           (parseFloat(contadoTransferencia) || 0) +
           (parseFloat(contadoTarjeta) || 0) +
           (parseFloat(contadoOtros) || 0);
  };

  const getDiferenciaTotal = () => {
    return getTotalContado() - getTotalEsperado();
  };

  const requiereObservacion = () => {
    return Math.abs(getDiferenciaTotal()) > umbral;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (requiereObservacion() && !observacion.trim()) {
      setError(`La diferencia supera el umbral (S/ ${umbral.toFixed(2)}). Debes agregar una observación.`);
      return;
    }

    try {
      setSubmitting(true);
      
      await registrarArqueo({
        cajaSesionId: parseInt(id!),
        contadoEfectivo: parseFloat(contadoEfectivo) || 0,
        contadoYape: parseFloat(contadoYape) || 0,
        contadoTransferencia: parseFloat(contadoTransferencia) || 0,
        contadoTarjeta: parseFloat(contadoTarjeta) || 0,
        contadoOtros: parseFloat(contadoOtros) || 0,
        observacion: observacion.trim() || undefined
      });

      navigate('/admin/cajas', { 
        state: { message: 'Arqueo registrado correctamente. La sesión ha sido finalizada.' } 
      });
    } catch (err: unknown) {
      console.error('Error al registrar arqueo:', err);
      setError(getErrorMessageFromUnknown(err, 'Error al registrar el arqueo'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFila = (
    metodo: string, 
    esperado: number, 
    contado: string, 
    setContado: (v: string) => void
  ) => {
    const diferencia = getDiferencia(esperado, contado);
    const colorDif = diferencia > 0 
      ? 'text-green-600' 
      : diferencia < 0 
      ? 'text-red-600' 
      : 'text-gray-600';

    return (
      <tr key={metodo} className="border-b">
        <td className="py-3 px-4 font-medium">{metodo}</td>
        <td className="py-3 px-4 text-right">S/ {esperado.toFixed(2)}</td>
        <td className="py-3 px-4">
          <input
            type="number"
            step="0.01"
            min="0"
            value={contado}
            onChange={(e) => setContado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            disabled={submitting}
          />
        </td>
        <td className={`py-3 px-4 text-right font-semibold ${colorDif}`}>
          S/ {diferencia.toFixed(2)}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sesion || !esperados) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">No se pudo cargar la sesión</p>
        </div>
      </div>
    );
  }

  const diferenciaTotal = getDiferenciaTotal();
  const colorTotal = diferenciaTotal > 0 
    ? 'bg-green-50 border-green-200 text-green-700'
    : diferenciaTotal < 0 
    ? 'bg-red-50 border-red-200 text-red-700' 
    : 'bg-gray-50 border-gray-200 text-gray-700';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/cajas')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
        >
          ← Volver a Cajas
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Finalizar Arqueo</h1>
        <p className="text-gray-600 mt-1">
          Sesión {sesion.id} - {sesion.cajaFisica?.nombre}
        </p>
      </div>

      <div className="space-y-6">
        {/* Alerta de cierre automático */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">
                Esta caja fue cerrada automáticamente
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                El sistema cerró esta sesión automáticamente a las 23:59. 
                Completa el arqueo para finalizar el cierre.
              </p>
            </div>
          </div>
        </div>

        {/* Información de la sesión */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Información de la Sesión</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Fecha Apertura:</span>
              <p className="font-medium">
                {new Date(sesion.fechaApertura).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Fecha Cierre:</span>
              <p className="font-medium">
                {sesion.fechaCierre ? new Date(sesion.fechaCierre).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Usuario:</span>
              <p className="font-medium">{sesion.usuario?.nombre || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Saldo Inicial:</span>
              <p className="font-medium">S/ {sesion.saldoInicialEfectivo.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Formulario de arqueo */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
            <p className="text-sm text-blue-700">
              📊 Ingresa los montos contados físicamente. El sistema calculará las diferencias automáticamente.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Método</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">Esperado</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">Contado</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {renderFila('EFECTIVO', esperados.EFECTIVO, contadoEfectivo, setContadoEfectivo)}
                {renderFila('YAPE', esperados.YAPE, contadoYape, setContadoYape)}
                {renderFila('TRANSFERENCIA', esperados.TRANSFERENCIA, contadoTransferencia, setContadoTransferencia)}
                {renderFila('TARJETA', esperados.TARJETA, contadoTarjeta, setContadoTarjeta)}
                {renderFila('OTROS', esperados.OTROS, contadoOtros, setContadoOtros)}
              </tbody>
              <tfoot className={`border-t-2 ${colorTotal}`}>
                <tr>
                  <td className="py-3 px-4 font-bold">TOTAL</td>
                  <td className="py-3 px-4 text-right font-bold">
                    S/ {getTotalEsperado().toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    S/ {getTotalContado().toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    S/ {diferenciaTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {Math.abs(diferenciaTotal) > umbral && (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ La diferencia supera el umbral permitido (S/ {umbral.toFixed(2)})
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Debes agregar una observación explicando la diferencia.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observación {requiereObservacion() && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={requiereObservacion() 
                ? "Explica la causa de la diferencia (requerido)" 
                : "Notas adicionales (opcional)"}
              required={requiereObservacion()}
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/cajas')}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Registrando...' : 'Finalizar Arqueo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
