import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  listarSeriesAdmin,
  crearSerieAdmin,
  actualizarSerieAdmin,
  eliminarSerieAdmin,
  reiniciarCorrelativoAdmin,
  type Serie,
} from '../../../api/adminSeriesApi';
import { TIPOS_DOCUMENTO, TIPOS_DOCUMENTO_SERIES } from '../../../api/seriesApi';
import Modal from '../../../components/Modal';
import ConfirmModal from '../../../components/ConfirmModal';
import { btnEditSm, btnDeleteSm } from '../../../ui/buttonStyles';

const AdminEmpresaSeriesPage: React.FC = () => {
  const { empresaId } = useParams();
  const empresaIdNum = Number(empresaId);

  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<string>('');
  const [soloActivas, setSoloActivas] = useState(false);

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editandoSerie, setEditandoSerie] = useState<Serie | null>(null);
  const [formData, setFormData] = useState<Partial<Serie>>({
    tipoDoc: '01',
    serie: '',
    activa: true,
    descripcion: '',
    sucursalId: null,
  });

  // Modal confirmaciones
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [serieSeleccionada, setSerieSeleccionada] = useState<Serie | null>(null);

  const [error, setError] = useState<string>('');
  const [errorModal, setErrorModal] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');

  useEffect(() => {
    if (!Number.isFinite(empresaIdNum) || empresaIdNum <= 0) return;
    cargarSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaIdNum, filtroTipoDoc, soloActivas]);

  const cargarSeries = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listarSeriesAdmin(empresaIdNum, filtroTipoDoc || undefined, soloActivas);
      setSeries(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar series');
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaSerie = () => {
    setEditandoSerie(null);
    setErrorModal('');
    const primera = TIPOS_DOCUMENTO_SERIES[0];
    setFormData({
      tipoDoc: primera.code,
      serie: primera.serie,
      activa: true,
      descripcion: '',
      sucursalId: null,
    });
    setShowModal(true);
  };

  const handleEditarSerie = (serie: Serie) => {
    setEditandoSerie(serie);
    setErrorModal('');
    setFormData({
      tipoDoc: serie.tipoDoc,
      serie: serie.serie,
      activa: serie.activa,
      descripcion: serie.descripcion || '',
      sucursalId: serie.sucursalId,
    });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    setErrorModal('');
    setMensaje('');

    if (!formData.serie || formData.serie.length !== 4) {
      setErrorModal('La serie debe tener exactamente 4 caracteres');
      return;
    }

    try {
      if (editandoSerie) {
        await actualizarSerieAdmin(empresaIdNum, editandoSerie.id!, {
          descripcion: formData.descripcion,
          activa: formData.activa,
          sucursalId: formData.sucursalId,
        });
        setMensaje('Serie actualizada correctamente');
      } else {
        await crearSerieAdmin(empresaIdNum, {
          tipoDoc: formData.tipoDoc!,
          serie: formData.serie!.toUpperCase(),
          activa: formData.activa!,
          descripcion: formData.descripcion,
          sucursalId: formData.sucursalId,
        });
        setMensaje('Serie creada correctamente');
      }

      setShowModal(false);
      cargarSeries();
    } catch (err: any) {
      setErrorModal(err.response?.data || 'Error al guardar serie');
    }
  };

  const handleEliminar = async () => {
    if (!serieSeleccionada) return;

    try {
      await eliminarSerieAdmin(empresaIdNum, serieSeleccionada.id!);
      setMensaje('Serie desactivada correctamente');
      setShowConfirmDelete(false);
      cargarSeries();
    } catch (err: any) {
      setError(err.response?.data || 'Error al eliminar serie');
    }
  };

  const handleReiniciarCorrelativo = async () => {
    if (!serieSeleccionada) return;

    try {
      await reiniciarCorrelativoAdmin(empresaIdNum, serieSeleccionada.id!);
      setMensaje('Correlativo reiniciado a 0');
      setShowConfirmReset(false);
      cargarSeries();
    } catch (err: any) {
      setError(err.response?.data || 'Error al reiniciar correlativo');
    }
  };

  const handleTipoDocChange = (index: number) => {
    const opcion = TIPOS_DOCUMENTO_SERIES[index];
    setFormData({
      ...formData,
      tipoDoc: opcion.code,
      serie: opcion.serie,
    });
  };

  if (!Number.isFinite(empresaIdNum) || empresaIdNum <= 0) {
    return <div className="p-6 text-slate-600">Empresa inválida.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Series</h1>
          <p className="text-sm text-gray-600">Empresa #{empresaIdNum}</p>
        </div>
        <button
          onClick={handleNuevaSerie}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        >
          + Nueva Serie
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
            <select
              value={filtroTipoDoc}
              onChange={(e) => setFiltroTipoDoc(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Todos</option>
              {Object.entries(TIPOS_DOCUMENTO).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} - {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Solo series activas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {mensaje}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando series...</div>
        ) : series.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay series registradas.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Doc</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Correlativo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {series.map((serie) => (
                <tr key={serie.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{serie.tipoDoc}</span>
                    <span className="text-xs text-gray-500 block">{TIPOS_DOCUMENTO[serie.tipoDoc]}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono font-bold text-blue-600">{serie.serie}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {serie.ultimoCorrelativo?.toString().padStart(8, '0') || '00000000'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        serie.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {serie.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{serie.descripcion || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      <button onClick={() => handleEditarSerie(serie)} className={btnEditSm}>
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setSerieSeleccionada(serie);
                          setShowConfirmReset(true);
                        }}
                        className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                        title="Reiniciar correlativo a 0"
                      >
                        Reiniciar
                      </button>
                      <button
                        onClick={() => {
                          setSerieSeleccionada(serie);
                          setShowConfirmDelete(true);
                        }}
                        className={btnDeleteSm}
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editandoSerie ? 'Editar Serie' : 'Nueva Serie'}
      >
        <div className="space-y-4">
          {errorModal && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {errorModal}
            </div>
          )}

          {!editandoSerie && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                <select
                  value={TIPOS_DOCUMENTO_SERIES.findIndex(
                    (t) => t.code === formData.tipoDoc && t.serie === formData.serie
                  )}
                  onChange={(e) => handleTipoDocChange(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {TIPOS_DOCUMENTO_SERIES.map((opcion, index) => (
                    <option key={`${opcion.code}-${opcion.serie}`} value={index}>
                      {opcion.code} - {opcion.name} → {opcion.serie}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Serie * (4 caracteres)
                </label>
                <input
                  type="text"
                  value={formData.serie}
                  onChange={(e) => setFormData({ ...formData, serie: e.target.value.toUpperCase() })}
                  maxLength={4}
                  className="w-full border border-gray-300 rounded px-3 py-2 uppercase font-mono text-lg font-bold"
                  placeholder="F001"
                />
              </div>
            </>
          )}

          {editandoSerie && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tipo:</span> {editandoSerie.tipoDoc} - {TIPOS_DOCUMENTO[editandoSerie.tipoDoc]}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Serie:</span> {editandoSerie.serie}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Serie principal de facturas"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Serie activa</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button onClick={handleGuardar} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {editandoSerie ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleEliminar}
        title="Desactivar Serie"
        message={`¿Está seguro de desactivar la serie ${serieSeleccionada?.serie}? La serie quedará inactiva y no se podrá usar para nuevos comprobantes.`}
        confirmText="Desactivar"
        cancelText="Cancelar"
      />

      <ConfirmModal
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        onConfirm={handleReiniciarCorrelativo}
        title="Reiniciar Correlativo"
        message={`⚠️ ADVERTENCIA: ¿Está seguro de reiniciar el correlativo de la serie ${serieSeleccionada?.serie} a 0? Esta acción puede causar duplicados si ya tiene comprobantes emitidos.`}
        confirmText="Sí, Reiniciar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default AdminEmpresaSeriesPage;
