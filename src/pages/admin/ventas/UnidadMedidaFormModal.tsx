import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import {
  listarUnidadesSunat,
  crearUnidadInterna,
} from "../../../api/formatosApi";
import type { UnidadMedidaSunat } from "../../../api/formatosApi";

type UnidadMedidaFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUnidadCreada: () => void;
};

export default function UnidadMedidaFormModal({
  isOpen,
  onClose,
  onUnidadCreada,
}: UnidadMedidaFormModalProps) {
  const [unidadesSunat, setUnidadesSunat] = useState<UnidadMedidaSunat[]>([]);
  const [formNombre, setFormNombre] = useState("");
  const [formAbreviatura, setFormAbreviatura] = useState("");
  const [formSunatCodigo, setFormSunatCodigo] = useState("NIU");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarUnidadesSunat();
      // Limpiar formulario
      setFormNombre("");
      setFormAbreviatura("");
      setFormSunatCodigo("NIU");
      setError(null);
    }
  }, [isOpen]);

  const cargarUnidadesSunat = async () => {
    try {
      const data = await listarUnidadesSunat();
      setUnidadesSunat(data);
    } catch (err) {
      console.error("Error al cargar unidades SUNAT:", err);
    }
  };

  const handleGuardar = async () => {
    if (!formNombre.trim() || !formAbreviatura.trim() || !formSunatCodigo) {
      setError("Todos los campos son obligatorios");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await crearUnidadInterna(
        formNombre.trim(),
        formAbreviatura.trim().toUpperCase(),
        formSunatCodigo
      );
      onUnidadCreada();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data || err.message || "Error al crear unidad";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Nueva Unidad"
      size="sm"
    >
      <div className="space-y-2">
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-0.5">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value.toUpperCase())}
            placeholder="Ej: CAJA, PAQUETE"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-0.5">
            Abreviatura <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formAbreviatura}
            onChange={(e) => setFormAbreviatura(e.target.value.toUpperCase())}
            placeholder="Ej: CJ, PQ"
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono uppercase"
            maxLength={10}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-0.5">
            Código SUNAT <span className="text-red-500">*</span>
          </label>
          <select
            value={formSunatCodigo}
            onChange={(e) => setFormSunatCodigo(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Seleccionar...</option>
            {unidadesSunat.map((us) => (
              <option key={us.codigo} value={us.codigo}>
                {us.codigo} - {us.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs border border-slate-300 text-slate-700 rounded hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saving && (
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Crear
          </button>
        </div>
      </div>
    </Modal>
  );
}
