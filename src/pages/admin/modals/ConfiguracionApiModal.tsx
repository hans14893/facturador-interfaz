import { useState, useEffect } from "react";
import { getEmpresa, updateEmpresa } from "../../../api/adminEmpresasApi";
import { handleApiError } from "../../../api/errorHelper";
import Modal from "../../../components/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
}

export default function ConfiguracionApiModal({ isOpen, onClose, empresaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen && empresaId) {
      loadData();
    }
  }, [isOpen, empresaId]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getEmpresa(empresaId);
      setApiUrl(data.apiConsultaUrl || "https://api.perudevs.com/api/v1");
      setApiToken(data.apiConsultaToken || "");
    } catch (err) {
      handleApiError(err, "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateEmpresa(empresaId, {
        apiConsultaUrl: apiUrl,
        apiConsultaToken: apiToken,
      });
      alert("Configuración guardada correctamente");
      onClose();
    } catch (err) {
      handleApiError(err, "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar configuración? Se usarán valores por defecto.")) return;

    setSaving(true);
    try {
      await updateEmpresa(empresaId, {
        apiConsultaUrl: "",
        apiConsultaToken: "",
      });
      alert("Configuración eliminada. Se usarán valores por defecto.");
      onClose();
    } catch (err) {
      handleApiError(err, "Error al eliminar configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración API Consulta RUC/DNI" size="md">
      {loading ? (
        <div className="py-8 text-center text-slate-500">Cargando...</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              URL de API
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.perudevs.com/api/v1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Por defecto: https://api.perudevs.com/api/v1
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Token de API
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Token de autenticación"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-20 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {showToken ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <strong>Información:</strong> Esta configuración permite consultar RUC y DNI automáticamente
            al crear clientes. Si está vacía, se usarán valores por defecto.
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
