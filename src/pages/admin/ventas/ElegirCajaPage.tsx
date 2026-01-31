import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCajasActivasConEstado, abrirCaja } from '../../../api/cajaApi';
import Modal from '../../../components/Modal';
import { getErrorMessage } from '../../../api/errorHelper';

interface CajaConEstado {
  id: number;
  nombre: string;
  estado: string; // ACTIVA/INACTIVA
  estadoOcupacion: string; // LIBRE/OCUPADA
  ocupada: boolean;
  sesionActivaId?: number;
}

export default function ElegirCajaPage() {
  const navigate = useNavigate();
  const [cajas, setCajas] = useState<CajaConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null);
  const [showModalAbrirCaja, setShowModalAbrirCaja] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState('0.00');
  const [observacion, setObservacion] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    cargarCajas();
  }, []);

  const cargarCajas = async () => {
    try {
      setLoading(true);
      console.log('Cargando cajas con estado...');
      const data = await getCajasActivasConEstado();
      console.log('Cajas cargadas:', data);
      setCajas(data);
      if (data.length === 0) {
        setError('No hay cajas activas disponibles en el sistema');
      }
    } catch (error: unknown) {
      console.error('Error al cargar cajas:', error);
      setError(`Error al cargar las cajas: ${getErrorMessage(error, 'Error desconocido')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarCaja = (caja: CajaConEstado) => {
    console.log('Seleccionando caja:', caja);
    if (caja.ocupada) {
      setError(`La caja "${caja.nombre}" está ocupada. Por favor, selecciona una caja libre.`);
      return;
    }
    setSelectedCajaId(caja.id);
    setShowModalAbrirCaja(true);
    setError('');
  };

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCajaId) {
      setError('Debes seleccionar una caja');
      return;
    }

    const saldo = parseFloat(saldoInicial);
    if (isNaN(saldo) || saldo < 0) {
      setError('El saldo inicial debe ser un número mayor o igual a 0');
      return;
    }

    try {
      setAbriendo(true);
      const sesion = await abrirCaja({
        cajaFisicaId: selectedCajaId,
        saldoInicialEfectivo: saldo,
        observacion: observacion.trim() || undefined
      });

      // Redirigir a PuntoVentaPage con la sesión abierta
      console.log('Caja abierta exitosamente, sesión:', sesion);
      // Esperar un poco para que el backend procese
      await new Promise(resolve => setTimeout(resolve, 500));
      // Recargar la página para que se detecte la nueva sesión
      window.location.href = '/admin/punto-venta';
    } catch (error: unknown) {
      console.error('Error al abrir caja:', error);
      setError(getErrorMessage(error, 'Error al abrir la caja. Intenta nuevamente.'));
    } finally {
      setAbriendo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cajasLibres = cajas.filter(c => !c.ocupada);

  return (
    <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Elegir Caja</h1>
          <p className="text-slate-600">Selecciona una caja disponible para iniciar a vender</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* No cajas disponibles */}
        {cajasLibres.length === 0 && (
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
            <div className="text-lg font-bold text-amber-900 mb-2">No hay cajas disponibles</div>
            <p className="text-amber-800 mb-4">
              Todas las cajas están ocupadas o no hay cajas activas en el sistema.
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* Grid de cajas */}
        {cajasLibres.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {cajas.map(caja => (
              <button
                key={caja.id}
                onClick={() => handleSeleccionarCaja(caja)}
                disabled={caja.ocupada}
                className={`text-left rounded-lg border-2 p-5 transition-all ${
                  caja.ocupada
                    ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
                    : 'border-blue-300 bg-white cursor-pointer hover:border-blue-500 hover:shadow-lg hover:scale-105'
                }`}
              >
                {/* Estado indicador */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        caja.ocupada ? 'bg-red-500' : 'bg-green-500 animate-pulse'
                      }`}
                    ></div>
                    <span
                      className={`text-xs font-bold uppercase ${
                        caja.ocupada ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {caja.estadoOcupacion}
                    </span>
                  </div>
                  {caja.ocupada && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                      No disponible
                    </span>
                  )}
                </div>

                {/* Nombre de caja */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">{caja.nombre}</h3>

                {/* Indicador de acción */}
                {!caja.ocupada && (
                  <div className="text-sm text-blue-600 font-semibold mt-3">
                    ➜ Seleccionar
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Resumen de ocupación */}
        {cajas.length > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-700">
              <strong>{cajasLibres.length}</strong> caja(s) disponible(s) de <strong>{cajas.length}</strong> total
            </p>
          </div>
        )}
      </div>

      {/* Modal para abrir caja */}
      <Modal
        isOpen={showModalAbrirCaja}
        title="Abrir Caja"
        onClose={() => {
          setShowModalAbrirCaja(false);
          setSelectedCajaId(null);
          setSaldoInicial('0.00');
          setObservacion('');
        }}
        size="md"
      >
        <form onSubmit={handleAbrirCaja} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caja Seleccionada
              </label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold text-slate-900">
                  {cajas.find(c => c.id === selectedCajaId)?.nombre}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo Inicial en Efectivo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={abriendo}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observación (opcional)
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={abriendo}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModalAbrirCaja(false);
                  setSelectedCajaId(null);
                  setSaldoInicial('0.00');
                  setObservacion('');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                disabled={abriendo}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                disabled={abriendo}
              >
                {abriendo ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
}
