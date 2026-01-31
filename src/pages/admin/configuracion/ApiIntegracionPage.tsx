import { useState, useEffect, useCallback } from "react";
import { getAuth } from "../../../auth/authStore";
import { listApiClients, createApiClient, regenerateSecret } from "../../../api/adminApiClientsApi";
import type { ApiClient } from "../../../api/adminApiClientsApi";
import { getErrorMessage } from "../../../api/errorHelper";

export default function ApiIntegracionPage() {
  const auth = getAuth();
  const empresaId = auth?.empresaId;

  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [scopes, setScopes] = useState("CPE_EMITIR,CPE_CONSULTAR");
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());

  const loadClients = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setErr(null);
    try {
      setClients(await listApiClients(empresaId));
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando API clients"));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) return;
    
    setErr(null);
    setApiKeyOnce(null);

    try {
      const resp = await createApiClient(empresaId, { nombre, scopes });
      setApiKeyOnce(resp.apiKey);
      setNombre("");
      setScopes("CPE_EMITIR,CPE_CONSULTAR");
      setShowForm(false);
      await loadClients();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error creando API client"));
    }
  }

  async function handleRegenerate(clientId: number) {
    if (!empresaId) return;
    
    if (!confirm("¿Regenerar el secret? La API Key anterior dejará de funcionar.")) {
      return;
    }

    setErr(null);
    setApiKeyOnce(null);

    try {
      const resp = await regenerateSecret(empresaId, clientId);
      setApiKeyOnce(resp.apiKey);
      await loadClients();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error regenerando secret"));
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  }

  if (!empresaId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">No tienes una empresa asignada. Solo el administrador puede ver esta página.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">API de Integración</h1>
        <p className="text-sm text-slate-500">Integra tu sistema con otros servicios mediante nuestra API</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Alerta de API Key generada */}
        {apiKeyOnce && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <svg className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <div className="text-xs font-semibold text-emerald-800">API KEY (cópiala ahora)</div>
            </div>
            <div className="mt-2 break-all rounded-xl border border-emerald-200 bg-white px-3 py-2 font-mono text-sm text-slate-900">
              {apiKeyOnce}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(apiKeyOnce)}
              className="mt-3 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:opacity-95 flex items-center gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copiar
            </button>
            <div className="mt-2 flex items-start gap-2 text-xs text-emerald-800">
              <svg className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>Guarda esto en un lugar seguro. No se volverá a mostrar.</div>
            </div>
          </div>
        )}

        {/* Errores */}
        {err && (
          <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>
        )}

        {/* API Clients */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Tus API Clients</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95"
              >
                + Nueva API Key
              </button>
            )}
          </div>

          {showForm ? (
            <form onSubmit={handleCreate} className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Nombre del Cliente *
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Ej: POS Tienda Principal"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
                <div className="mt-1 text-xs text-slate-500">
                  Identifica tu punto de venta o aplicación
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">Scopes</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="CPE_EMITIR,CPE_CONSULTAR"
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                />
                <div className="mt-1 text-xs text-slate-500">
                  Permisos separados por comas
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95"
                >
                  Generar API Key
                </button>
              </div>
            </form>
          ) : loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Cargando API clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-sm text-slate-500">No hay API clients generados</div>
              <div className="mt-1 text-xs text-slate-400">Genera el primer API client para integrar tu sistema</div>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{c.nombre}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        Client ID: <span className="font-mono text-slate-800">{c.clientId}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Secret: <span className="font-mono text-slate-800">••••••••••••••••</span>
                        <span className="ml-2 text-slate-400">(regenera para ver el nuevo secret)</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Scopes: {c.scopes ?? "-"}</div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            c.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRegenerate(c.id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6M23 20v-6h-6" />
                        <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                      </svg>
                      Regenerar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentación */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Documentación de la API</h2>
          
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Base URL</h3>
              <code className="block bg-slate-900 text-slate-100 px-3 py-2 rounded text-sm font-mono">
                https://api.tudominio.com/v1
              </code>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Headers Requeridos</h3>
              <code className="block bg-slate-900 text-slate-100 px-3 py-2 rounded text-sm font-mono whitespace-pre">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Endpoints Disponibles</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-mono text-xs">GET</span>
                  <code className="text-slate-600">/comprobantes</code>
                  <span className="text-slate-500">- Listar comprobantes</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-mono text-xs">POST</span>
                  <code className="text-slate-600">/comprobantes</code>
                  <span className="text-slate-500">- Crear comprobante</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-mono text-xs">GET</span>
                  <code className="text-slate-600">/productos</code>
                  <span className="text-slate-500">- Listar productos</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-mono text-xs">GET</span>
                  <code className="text-slate-600">/clientes</code>
                  <span className="text-slate-500">- Listar clientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Webhooks */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Webhooks</h2>
          
          <p className="text-sm text-slate-600 mb-4">
            Recibe notificaciones en tiempo real cuando ocurran eventos en tu cuenta.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                URL del Webhook
              </label>
              <input
                type="url"
                placeholder="https://tu-servidor.com/webhook"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Configurar Webhook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
