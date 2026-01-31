import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { 
  getSaldosEsperados, 
  registrarArqueo, 
  getUmbralDiferencia,
  getSesionById
} from '../../../../api/cajaApi';
import Modal from '../../../../components/Modal';
import type { SaldosPorMetodo, CajaSesion } from '../../../../types/caja';

export default function ArqueoModal() {
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

  const [sesion, setSesion] = useState<CajaSesion | null>(null);
  const [esperados, setEsperados] = useState<SaldosPorMetodo | null>(null);
  const [umbral, setUmbral] = useState<number>(0);
  
  const [contadoEfectivo, setContadoEfectivo] = useState<string>('0');
  const [contadoYape, setContadoYape] = useState<string>('0');
  const [contadoTransferencia, setContadoTransferencia] = useState<string>('0');
  const [contadoTarjeta, setContadoTarjeta] = useState<string>('0');
  const [contadoOtros, setContadoOtros] = useState<string>('0');
  
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determina si es sesión pendiente de arqueo (ya cerrada automáticamente)
  const esSesionPendienteArqueo = sesion?.estado === 'CERRADA_PENDIENTE_ARQUEO';

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    try {
      const [sesionData, saldos, umbralValue] = await Promise.all([
        getSesionById(parseInt(id!)),
        getSaldosEsperados(parseInt(id!)),
        getUmbralDiferencia()
      ]);
      
      setSesion(sesionData);
      setEsperados(saldos);
      setUmbral(umbralValue);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('No se pudo cargar los saldos esperados');
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleClose = () => {
    if (esSesionPendienteArqueo) {
      navigate('/admin/cajas');
    } else {
      navigate(`/admin/cajas/${id}/operacion`);
    }
  };

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
      setLoading(true);
      
      await registrarArqueo({
        cajaSesionId: parseInt(id!),
        contadoEfectivo: parseFloat(contadoEfectivo) || 0,
        contadoYape: parseFloat(contadoYape) || 0,
        contadoTransferencia: parseFloat(contadoTransferencia) || 0,
        contadoTarjeta: parseFloat(contadoTarjeta) || 0,
        contadoOtros: parseFloat(contadoOtros) || 0,
        observacion: observacion.trim() || undefined
      });

      // Si es sesión pendiente de arqueo (cerrada automáticamente), ir a cajas
      // Si no, continuar con el proceso de cierre
      if (esSesionPendienteArqueo) {
        navigate('/admin/cajas');
      } else {
        navigate(`/admin/cajas/${id}/cerrar`);
      }
    } catch (err: unknown) {
      console.error('Error al registrar arqueo:', err);
      if (err instanceof AxiosError) {
        const apiMsg = getErrorMessageFromUnknown(err.response?.data);
        setError(apiMsg || err.message || 'Error al registrar el arqueo');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al registrar el arqueo');
      }
    } finally {
      setLoading(false);
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
        <td className="py-1.5 px-2 font-medium text-sm">{metodo}</td>
        <td className="py-1.5 px-2 text-right text-sm">S/ {esperado.toFixed(2)}</td>
        <td className="py-1.5 px-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={contado}
            onChange={(e) => setContado(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
            disabled={loading}
          />
        </td>
        <td className={`py-1.5 px-2 text-right font-semibold text-sm ${colorDif}`}>
          S/ {diferencia.toFixed(2)}
        </td>
      </tr>
    );
  };

  if (!esperados) {
    return (
      <Modal
        isOpen={true}
        onClose={handleClose}
        title="Arqueo de Caja"
      >
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </Modal>
    );
  }

  const diferenciaTotal = getDiferenciaTotal();
  const colorTotal = diferenciaTotal > 0 
    ? 'bg-green-50 border-green-200 text-green-700'
    : diferenciaTotal < 0 
    ? 'bg-red-50 border-red-200 text-red-700' 
    : 'bg-gray-50 border-gray-200 text-gray-700';

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={esSesionPendienteArqueo ? "Arqueo de Caja (Cerrada Automáticamente)" : "Arqueo de Caja"}
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {esSesionPendienteArqueo && (
          <div className="bg-amber-50 border border-amber-200 p-2 rounded text-xs text-amber-700">
            ⚠️ Esta sesión fue cerrada automáticamente. Completa el arqueo para finalizar.
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 p-2 rounded text-xs text-blue-700">
          📊 Ingresa los montos contados físicamente
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-1.5 px-2 text-left text-xs font-semibold">Método</th>
                <th className="py-1.5 px-2 text-right text-xs font-semibold">Esperado</th>
                <th className="py-1.5 px-2 text-right text-xs font-semibold">Contado</th>
                <th className="py-1.5 px-2 text-right text-xs font-semibold">Diferencia</th>
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
                <td className="py-2 px-2 font-bold text-sm">TOTAL</td>
                <td className="py-2 px-2 text-right font-bold text-sm">
                  S/ {getTotalEsperado().toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right font-bold text-sm">
                  S/ {getTotalContado().toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right font-bold text-sm">
                  S/ {diferenciaTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {Math.abs(diferenciaTotal) > umbral && (
          <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
            ⚠️ Diferencia supera umbral (S/ {umbral.toFixed(2)}). Agrega observación.
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Observación {requiereObservacion() && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={requiereObservacion() ? "Explica la diferencia" : "Notas (opcional)"}
            required={requiereObservacion()}
            disabled={loading}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Confirmar Arqueo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
