import { useState, useEffect } from "react";
import {
  listarUnidadesInternas,
  listarUnidadesSunat,
  crearUnidadInterna,
  actualizarUnidadInterna,
  desactivarUnidadInterna,
  activarUnidadInterna,
} from "../../../api/formatosApi";
import type { UnidadMedidaInterna, UnidadMedidaSunat } from "../../../api/formatosApi";
import Modal from "../../../components/Modal";

export default function UnidadesInternaPage() {
  const [unidades, setUnidades] = useState<UnidadMedidaInterna[]>([]);
  const [unidadesSunat, setUnidadesSunat] = useState<UnidadMedidaSunat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<UnidadMedidaInterna | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formAbreviatura, setFormAbreviatura] = useState("");
  const [formSunatCodigo, setFormSunatCodigo] = useState("");
  const [saving, setSaving] = useState(false);

  // Filtro
  const [filtro, setFiltro] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [unidadesData, sunatData] = await Promise.all([
        listarUnidadesInternas(),
        listarUnidadesSunat(),
      ]);
      setUnidades(unidadesData);
      setUnidadesSunat(sunatData);
    } catch (err) {
      setError("Error al cargar unidades");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNueva = () => {
    setEditingUnidad(null);
    setFormNombre("");
    setFormAbreviatura("");
    setFormSunatCodigo("NIU");
    setShowModal(true);
  };

  const abrirModalEditar = (unidad: UnidadMedidaInterna) => {
    setEditingUnidad(unidad);
    setFormNombre(unidad.nombre);
    setFormAbreviatura(unidad.abreviatura);
    setFormSunatCodigo(unidad.unidadSunat.codigo);
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!formNombre.trim() || !formAbreviatura.trim() || !formSunatCodigo) {
      setError("Todos los campos son obligatorios");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingUnidad) {
        await actualizarUnidadInterna(
          editingUnidad.id,
          formNombre.trim(),
          formAbreviatura.trim().toUpperCase(),
          formSunatCodigo
        );
        setSuccess("Unidad actualizada correctamente");
      } else {
        await crearUnidadInterna(
          formNombre.trim(),
          formAbreviatura.trim().toUpperCase(),
          formSunatCodigo
        );
        setSuccess("Unidad creada correctamente");
      }
      setShowModal(false);
      cargarDatos();
    } catch (err: any) {
      const msg = err.response?.data || err.message || "Error al guardar";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (unidad: UnidadMedidaInterna) => {
    try {
      if (unidad.activo) {
        await desactivarUnidadInterna(unidad.id);
        setSuccess("Unidad desactivada");
      } else {
        await activarUnidadInterna(unidad.id);
        setSuccess("Unidad activada");
      }
      cargarDatos();
    } catch (err: any) {
      const msg = err.response?.data || err.message || "Error";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const unidadesFiltradas = unidades.filter((u) => {
    if (!mostrarInactivos && !u.activo) return false;
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.abreviatura.toLowerCase().includes(q) ||
      u.unidadSunat.codigo.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Unidades de Medida Internas</h1>
        <button
          onClick={abrirModalNueva}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Unidad
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Info */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <strong>💡 ¿Qué son las unidades internas?</strong><br />
        Son las unidades que usarás en tu negocio (Unidad, Caja, Paquete, etc.). 
        Cada una debe estar vinculada a un código SUNAT para que al emitir comprobantes 
        electrónicos se envíe el código oficial.
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, abreviatura o código SUNAT..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="rounded"
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Abreviatura</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Código SUNAT</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Descripción SUNAT</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {unidadesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No hay unidades para mostrar
                </td>
              </tr>
            ) : (
              unidadesFiltradas.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 ${!u.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-mono">
                      {u.abreviatura}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-sm font-mono">
                      {u.unidadSunat.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{u.unidadSunat.descripcion}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirModalEditar(u)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleActivo(u)}
                        className={`p-1.5 rounded ${
                          u.activo
                            ? "text-red-600 hover:bg-red-100"
                            : "text-green-600 hover:bg-green-100"
                        }`}
                        title={u.activo ? "Desactivar" : "Activar"}
                      >
                        {u.activo ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editingUnidad ? "Editar Unidad Interna" : "Nueva Unidad Interna"}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value.toUpperCase())}
              placeholder="Ej: CAJA, PAQUETE, KILOGRAMO"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Abreviatura <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formAbreviatura}
              onChange={(e) => setFormAbreviatura(e.target.value.toUpperCase())}
              placeholder="Ej: CJ, PQ, KG"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              maxLength={10}
            />
            <p className="text-xs text-slate-500 mt-1">Esta se mostrará en tickets y PDFs</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código SUNAT <span className="text-red-500">*</span>
            </label>
            <select
              value={formSunatCodigo}
              onChange={(e) => setFormSunatCodigo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Seleccionar...</option>
              {unidadesSunat.map((us) => (
                <option key={us.codigo} value={us.codigo}>
                  {us.codigo} - {us.descripcion}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Este código se enviará a SUNAT al emitir comprobantes electrónicos
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowModal(false)}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editingUnidad ? "Guardar Cambios" : "Crear Unidad"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
