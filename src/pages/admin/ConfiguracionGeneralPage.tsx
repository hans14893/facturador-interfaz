import { useState, useEffect } from "react";
import { getConfiguracion, updateConfiguracion } from "../../api/configuracionApi";
import { handleApiError } from "../../api/errorHelper";

export default function ConfiguracionGeneralPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiUrlRuc, setApiUrlRuc] = useState("");
  const [apiUrlDni, setApiUrlDni] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  async function loadData() {
    setLoading(true);
    try {
      const config = await getConfiguracion();
      setApiUrlRuc(config.api_consulta_ruc_url || "https://api.perudevs.com/api/v1/ruc");
      setApiUrlDni(config.api_consulta_dni_url || "https://api.perudevs.com/api/v1/dni/simple");
      setApiToken(config.api_consulta_token || "");
    } catch (err) {
      handleApiError(err, "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateConfiguracion("api_consulta_ruc_url", apiUrlRuc);
      await updateConfiguracion("api_consulta_dni_url", apiUrlDni);
      await updateConfiguracion("api_consulta_token", apiToken);
      setSuccessMessage("✓ Configuración guardada correctamente");
    } catch (err) {
      handleApiError(err, "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("¿Restablecer configuración a valores por defecto?")) return;

    setSaving(true);
    try {
      const defaultUrlRuc = "https://api.perudevs.com/api/v1/ruc";
      const defaultUrlDni = "https://api.perudevs.com/api/v1/dni/simple";
      const defaultToken = "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjhlZmQxNWQyZGZhMTIyNjA3ZTgzZTkw";
      await updateConfiguracion("api_consulta_ruc_url", defaultUrlRuc);
      await updateConfiguracion("api_consulta_dni_url", defaultUrlDni);
      await updateConfiguracion("api_consulta_token", defaultToken);
      setApiUrlRuc(defaultUrlRuc);
      setApiUrlDni(defaultUrlDni);
      setApiToken(defaultToken);
      setSuccessMessage("✓ Configuración restablecida a valores por defecto");
    } catch (err) {
      handleApiError(err, "Error al restablecer configuración");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">Cargando configuración...</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración General</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configura la API para consultar documentos (DNI/RUC) al crear clientes.
        </p>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 animate-fade-in">
          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-green-800">{successMessage}</span>
        </div>
      )}

      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              URL de API para RUC
            </label>
            <input
              type="text"
              value={apiUrlRuc}
              onChange={(e) => setApiUrlRuc(e.target.value)}
              placeholder="https://api.perudevs.com/api/v1/ruc"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Endpoint completo para consultar RUC (se agregará ?document=XX&key=TOKEN)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              URL de API para DNI
            </label>
            <input
              type="text"
              value={apiUrlDni}
              onChange={(e) => setApiUrlDni(e.target.value)}
              placeholder="https://api.perudevs.com/api/v1/dni/simple"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Endpoint completo para consultar DNI (se agregará ?document=XX&key=TOKEN)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Token de API
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Token de autenticación"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-24 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {showToken ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Token proporcionado por el proveedor de la API (compartido para ambos endpoints)
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Información</h3>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>• Esta configuración es global para todo el sistema</li>
                  <li>• Se usa al crear clientes con el botón "EXTRAER"</li>
                  <li>• URLs separadas permiten usar diferentes proveedores para RUC y DNI</li>
                  <li>• El sistema agregará automáticamente los parámetros: ?document=XX&key=TOKEN</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Restablecer
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
