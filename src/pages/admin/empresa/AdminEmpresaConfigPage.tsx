import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { getEmpresa, updateEmpresa, type Empresa } from "../../../api/adminEmpresasApi";

export default function AdminEmpresaConfigPage() {
  const { empresaId } = useParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [ubigeo, setUbigeo] = useState("");
  const [codigoLocalAnexo, setCodigoLocalAnexo] = useState("0000");
  const [direccion, setDireccion] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [solUsuario, setSolUsuario] = useState("");
  const [solClave, setSolClave] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSolClave, setShowSolClave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (id: string) => {
    try {
      const data = await getEmpresa(Number(id));
      setEmpresa(data);
      setUbigeo(data.ubigeo || "");
      setCodigoLocalAnexo(data.codigoLocalAnexo || "0000");
      setDireccion(data.direccion || "");
      setDepartamento(data.departamento || "");
      setProvincia(data.provincia || "");
      setDistrito(data.distrito || "");
      setApiUrl(data.apiConsultaUrl || "https://api.perudevs.com/api/v1");
      setApiToken(data.apiConsultaToken || "");
      setSolUsuario(data.sunatSolUsuario || "");
      setSolClave("");
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
        ubigeo: ubigeo.trim() || undefined,
        codigoLocalAnexo: codigoLocalAnexo.trim() || undefined,
        direccion: direccion.trim() || undefined,
        departamento: departamento.trim() || undefined,
        provincia: provincia.trim() || undefined,
        distrito: distrito.trim() || undefined,
        apiConsultaUrl: apiUrl,
        apiConsultaToken: apiToken,
        sunatSolUsuario: solUsuario.trim() || undefined,
        sunatSolClave: solClave.trim() || undefined,
      });
      setSuccess(true);
      setSolClave("");
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
          <div className="mb-6 border-b border-slate-200 pb-6">
            <h3 className="text-sm font-semibold text-slate-900">Dirección SUNAT</h3>
            <p className="mt-1 text-xs text-slate-500">
              Estos datos se usan para el emisor en el XML UBL (ubigeo, departamento, provincia, distrito).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Ubigeo</label>
                <input
                  type="text"
                  value={ubigeo}
                  onChange={(e) => setUbigeo(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  placeholder="150101"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Código local anexo</label>
                <input
                  type="text"
                  value={codigoLocalAnexo}
                  onChange={(e) => setCodigoLocalAnexo(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  placeholder="0000"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Dirección fiscal</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. Principal 123"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Departamento</label>
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="LIMA"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Provincia</label>
                <input
                  type="text"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  placeholder="LIMA"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Distrito</label>
                <input
                  type="text"
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  placeholder="LIMA"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

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

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Credenciales SOL (SUNAT)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Configura el usuario secundario de SUNAT para envíos SOAP. El sistema arma el username como RUC+usuario cuando corresponde.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Usuario SOL</label>
                <input
                  type="text"
                  value={solUsuario}
                  onChange={(e) => setSolUsuario(e.target.value)}
                  placeholder="Ej: HANS1489 o 10462016927HANS1489"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Clave SOL (opcional para cambiar)</label>
                <div className="relative mt-1">
                  <input
                    type={showSolClave ? "text" : "password"}
                    value={solClave}
                    onChange={(e) => setSolClave(e.target.value)}
                    placeholder="Dejar en blanco para mantener la clave actual"
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-20 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSolClave(!showSolClave)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    {showSolClave ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>
            </div>
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
            <li>• Para SUNAT SOAP, completa Usuario SOL y Clave SOL en esta misma pantalla</li>
            <li>• Endpoint RUC: {apiUrl}/ruc?document=XX&key=TOKEN</li>
            <li>• Endpoint DNI: {apiUrl}/dni/simple?document=XX&key=TOKEN</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
