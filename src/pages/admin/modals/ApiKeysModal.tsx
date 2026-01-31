import { useCallback, useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import { listApiClients, createApiClient, regenerateSecret } from "../../../api/adminApiClientsApi";
import type { ApiClient } from "../../../api/adminApiClientsApi";
import { getErrorMessage } from "../../../api/errorHelper";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
};

export default function ApiKeysModal({ isOpen, onClose, empresaId }: Props) {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [scopes, setScopes] = useState("CPE_EMITIR,CPE_CONSULTAR");
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
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
    if (isOpen) {
      loadClients();
    }
  }, [isOpen, loadClients]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setApiKeyOnce(null);

    try {
      const resp = await createApiClient(empresaId, { nombre, scopes });
      setApiKeyOnce(resp.apiKey);
      setNombre("");
      setScopes("CPE_EMITIR,CPE_CONSULTAR");
      await loadClients();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error creando API client"));
    }
  }

  async function handleRegenerate(clientId: number) {
    setErr(null);
    setApiKeyOnce(null);

    try {
      const resp = await regenerateSecret(empresaId, clientId);
      setApiKeyOnce(resp.apiKey);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error regenerando secret"));
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`API Keys - Empresa #${empresaId}`} size="lg">
      {!showForm ? (
        <div>
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <div className="text-sm font-semibold text-amber-900">Importante</div>
                <div className="mt-1 text-xs text-amber-800">
                  Las API Keys se muestran una sola vez al crearlas o regenerarlas. Guárdalas en un lugar seguro.
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">{clients.length} API client(s) activo(s)</div>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95"
            >
              + Generar Nueva API Key
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Cargando API clients...
            </div>
          ) : err && clients.length === 0 ? (
            <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>
          ) : clients.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-sm text-slate-500">No hay API clients generados</div>
              <div className="mt-1 text-xs text-slate-400">Genera el primer API client para integrar tu punto de venta</div>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
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
                      <div className="mt-1">
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
                      Regenerar Secret
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {apiKeyOnce && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
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

          {err && clients.length > 0 && (
            <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>
          )}
        </div>
      ) : (
        <form onSubmit={handleCreate}>
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Volver a la lista
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Nombre del Cliente *
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Ej: POS Tienda Miraflores"
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
          </div>

          {apiKeyOnce && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
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

          {err && <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>}

          <div className="mt-6 flex gap-3">
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
      )}
    </Modal>
  );
}
