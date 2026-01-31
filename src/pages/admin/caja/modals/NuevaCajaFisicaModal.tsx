import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import Modal from '../../../../components/Modal';
import { crearCajaFisica } from '../../../../api/cajaApi';
import { CajaEstado } from '../../../../types/caja';
import { canCreateCaja } from '../../../../auth/authStore';

export default function NuevaCajaFisicaModal() {
  const navigate = useNavigate();

  const allowed = canCreateCaja();

  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState<CajaEstado>(CajaEstado.ACTIVA);
  const [observacion, setObservacion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onClose = () => navigate('/admin/cajas');

  const getErrorMessageFromUnknown = (data: unknown): string | null => {
    if (typeof data === 'string' && data.trim()) return data;
    if (!data || typeof data !== 'object') return null;
    if ('message' in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return null;
  };

  if (!allowed) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Nueva Caja">
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              No tienes permisos para crear cajas. Solicita acceso a un administrador.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md"
          >
            Volver
          </button>
        </div>
      </Modal>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      await crearCajaFisica({
        nombre: nombre.trim(),
        estado,
        // La API ignora/override empresaId en backend.
        // "observacion" no existe en CajaFisica actualmente, se mantiene solo en UI.
      });

      navigate('/admin/cajas', {
        state: { message: 'Caja creada correctamente' }
      });
    } catch (err: unknown) {
      console.error('Error al crear caja:', err);
      if (err instanceof AxiosError) {
        const apiMsg = getErrorMessageFromUnknown(err.response?.data);
        setError(apiMsg || err.message || 'No se pudo crear la caja');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo crear la caja');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Nueva Caja">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Caja Principal"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as CajaEstado)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          >
            <option value={CajaEstado.ACTIVA}>ACTIVA</option>
            <option value={CajaEstado.INACTIVA}>INACTIVA</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nota (opcional)
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Referencia interna (no se guarda por ahora)"
            disabled={submitting}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
