import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { getCajasActivas, abrirCaja } from '../../../../api/cajaApi';
import Modal from '../../../../components/Modal';
import type { CajaFisica } from '../../../../types/caja';

export default function AbrirCajaModal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cajaIdParam = searchParams.get('cajaId');

  const getErrorMessageFromUnknown = (data: unknown): string | null => {
    if (typeof data === 'string' && data.trim()) return data;
    if (!data || typeof data !== 'object') return null;
    if ('message' in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return null;
  };

  const [cajas, setCajas] = useState<CajaFisica[]>([]);
  const [cajaFisicaId, setCajaFisicaId] = useState<string>(cajaIdParam || '');
  const [saldoInicial, setSaldoInicial] = useState<string>('0.00');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarCajas();
  }, []);

  const cargarCajas = async () => {
    try {
      const data = await getCajasActivas();
      setCajas(data);
    } catch (error) {
      console.error('Error al cargar cajas:', error);
      setError('Error al cargar las cajas disponibles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cajaFisicaId) {
      setError('Debes seleccionar una caja');
      return;
    }

    const saldo = parseFloat(saldoInicial);
    if (isNaN(saldo) || saldo < 0) {
      setError('El saldo inicial debe ser un número mayor o igual a 0');
      return;
    }

    try {
      setLoading(true);
      const sesion = await abrirCaja({
        cajaFisicaId: parseInt(cajaFisicaId),
        saldoInicialEfectivo: saldo,
        observacion: observacion.trim() || undefined
      });

      navigate(`/admin/cajas/${sesion.id}/operacion`);
    } catch (err: unknown) {
      console.error('Error al abrir caja:', err);
      if (err instanceof AxiosError) {
        const apiMsg = getErrorMessageFromUnknown(err.response?.data);
        setError(apiMsg || err.message || 'Error al abrir la caja. Intenta nuevamente.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al abrir la caja. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => navigate('/admin/cajas')}
      title="Abrir Caja"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caja Física <span className="text-red-500">*</span>
          </label>
          <select
            value={cajaFisicaId}
            onChange={(e) => setCajaFisicaId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          >
            <option value="">Seleccione una caja</option>
            {cajas.map(caja => (
              <option key={caja.id} value={caja.id}>
                {caja.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saldo Inicial en Efectivo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">S/</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
              placeholder="0.00"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ingresa el monto en efectivo con el que inicias la caja
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observación
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notas adicionales (opcional)"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/cajas')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !cajaFisicaId}
          >
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
