import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { getEmpresa, updateEmpresa, type Empresa } from "../../../api/adminEmpresasApi";

export default function AdminEmpresaConfigPage() {
  const { empresaId } = useParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (id: string) => {
    try {
      const data = await getEmpresa(Number(id));
      setEmpresa(data);
      setApiUrl(data.apiConsultaUrl || "https://api.perudevs.com/api/v1");
      setApiToken(data.apiConsultaToken || "");
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    void loadData(empresaId);
  }, [empresaId, loadData]);

  async function handleSave() {
    if (!empresaId) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await updateEmpresa(Number(empresaId), {
        apiConsultaUrl: apiUrl,
        apiConsultaToken: apiToken,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const data = err.response?.data;
        const msg =
          typeof data === "string"
            ? data
            : typeof data === "object" && data !== null && "message" in data
              ? String((data as Record<string, unknown>).message ?? "")
              : "";
        setError(msg || "Error al guardar configuración");
      } else {
        setError(err instanceof Error ? err.message : "Error al guardar configuración");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!empresa) {
    return <div className="text-sm text-slate-600">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900">Configuración de API</h1>
      <p className="mt-1 text-sm text-slate-600">
        Configura la API para consultar documentos (DNI/RUC) al crear clientes.
      </p>

      <div className="mt-6 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">URL de API</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.perudevs.com/api/v1"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Por defecto: https://api.perudevs.com/api/v1
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Token de API</label>
            <div className="relative mt-1">
              <input
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Token de autenticación"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-20 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {showToken ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Token proporcionado por el proveedor de la API
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Configuración guardada correctamente
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => {
                setApiUrl("https://api.perudevs.com/api/v1");
                setApiToken("");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Restablecer
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Información</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li>• Esta configuración permite consultar DNI y RUC automáticamente al crear clientes</li>
            <li>• El sistema usa estos valores cuando se presiona el botón "EXTRAER" en el formulario</li>
            <li>• Si no se configura, se usarán valores por defecto (PeruDevs API)</li>
            <li>• Endpoint RUC: {apiUrl}/ruc?document=XX&key=TOKEN</li>
            <li>• Endpoint DNI: {apiUrl}/dni/simple?document=XX&key=TOKEN</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
