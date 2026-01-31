import { useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { registrarIngreso, registrarEgreso } from '../../../../api/cajaApi';
import Modal from '../../../../components/Modal';
import { MetodoPago } from '../../../../types/caja';

const MOTIVOS_INGRESO = [
  'Venta directa',
  'Préstamo',
  'Devolución',
  'Ajuste de caja',
  'Otro'
];

const MOTIVOS_EGRESO = [
  'Pago a proveedor',
  'Gastos operativos',
  'Gastos varios',
  'Retiro autorizado',
  'Otro'
];

export default function MovimientoModal() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get('tipo') as 'INGRESO' | 'EGRESO';

  const getErrorMessageFromUnknown = (data: unknown): string | null => {
    if (typeof data === 'string' && data.trim()) return data;
    if (!data || typeof data !== 'object') return null;
    if ('message' in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return null;
  };

  const [motivo, setMotivo] = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO);
  const [monto, setMonto] = useState<string>('');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const motivos = tipo === 'INGRESO' ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    const motivoFinal = motivo === 'Otro' ? motivoCustom : motivo;
    if (!motivoFinal.trim()) {
      setError('Debes especificar un motivo');
      return;
    }

    try {
      setLoading(true);
      
      const request = {
        cajaSesionId: parseInt(id!),
        motivo: motivoFinal,
        metodoPago,
        monto: montoNum,
        observacion: observacion.trim() || undefined
      };

      if (tipo === 'INGRESO') {
        await registrarIngreso(request);
      } else {
        await registrarEgreso(request);
      }

      navigate(`/admin/cajas/${id}/operacion`);
    } catch (err: unknown) {
      console.error('Error al registrar movimiento:', err);
      if (err instanceof AxiosError) {
        const apiMsg = getErrorMessageFromUnknown(err.response?.data);
        setError(apiMsg || err.message || 'Error al registrar el movimiento');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al registrar el movimiento');
      }
    } finally {
      setLoading(false);
    }
  };

  const colorClass = tipo === 'INGRESO' 
    ? 'text-green-600 bg-green-50 border-green-200' 
    : 'text-red-600 bg-red-50 border-red-200';

  const buttonClass = tipo === 'INGRESO'
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-red-600 hover:bg-red-700';

  return (
    <Modal
      isOpen={true}
      onClose={() => navigate(`/admin/cajas/${id}/operacion`)}
      title={`Registrar ${tipo}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`p-3 border rounded-md ${colorClass}`}>
          <p className="text-sm font-medium">
            {tipo === 'INGRESO' 
              ? '✅ Estás registrando un ingreso de dinero' 
              : '⚠️ Estás registrando un egreso de dinero'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo <span className="text-red-500">*</span>
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          >
            <option value="">Seleccione un motivo</option>
            {motivos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {motivo === 'Otro' && (
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
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de Pago <span className="text-red-500">*</span>
          </label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          >
            {Object.values(MetodoPago).map(metodo => (
              <option key={metodo} value={metodo}>{metodo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">S/</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observación
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detalles adicionales (opcional)"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/cajas/${id}/operacion`)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${buttonClass}`}
            disabled={loading}
          >
            {loading ? 'Registrando...' : `Confirmar ${tipo}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
