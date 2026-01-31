import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  listApiClients,
  createApiClient,
  regenerateSecret,
} from "../../../api/adminApiClientsApi";
import type { ApiClient } from "../../../api/adminApiClientsApi";
import { getErrorMessage } from "../../../api/errorHelper";

export default function AdminApiClientsPage() {
  const { empresaId = "" } = useParams();
  const [items, setItems] = useState<ApiClient[]>([]);
  const [nombre, setNombre] = useState("");
  const [scopes, setScopes] = useState("CPE_EMITIR,CPE_CONSULTAR");
  const [apiKeyOnce, setApiKeyOnce] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      setItems(await listApiClients(empresaId));
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error"));
    }
  }, [empresaId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await refresh();
    })();
    return () => { mounted = false; };
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setApiKeyOnce(null);
    setErr(null);
    try {
      const resp = await createApiClient(empresaId, { nombre, scopes });
      setApiKeyOnce(resp.apiKey); // ✅ mostrar 1 vez y copiar
      setNombre("");
      await refresh();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error creando api client"));
    }
  }

  async function onRegen(id: number) {
    setApiKeyOnce(null);
    setErr(null);
    try {
      const resp = await regenerateSecret(empresaId, id);
      setApiKeyOnce(resp.apiKey);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error regenerando secret"));
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900">API Clients · Empresa #{empresaId}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Genera API Keys para integraciones. El secret se muestra una sola vez.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form onSubmit={onCreate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-900">Crear API Client</div>

          <div className="mt-3 grid gap-3">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Nombre (ej: POS Tienda Miraflores)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Scopes"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
            />
          </div>

          {apiKeyOnce && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-semibold text-emerald-800">API KEY (cópiala ahora)</div>
              <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-sm font-mono text-slate-900 border border-emerald-200">
                {apiKeyOnce}
              </div>
              <button
                type="button"
                onClick={() => copy(apiKeyOnce)}
                className="mt-3 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:opacity-95"
              >
                Copiar
              </button>
              <div className="mt-2 text-xs text-emerald-800">
                Guarda esto en un lugar seguro. No se volverá a mostrar.
              </div>
            </div>
          )}

          {err && <div className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}

          <button className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:opacity-95">
            Crear
          </button>
        </form>

        <div>
          <div className="text-sm font-bold text-slate-900">Listado</div>
          <div className="mt-3 space-y-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">{c.nombre}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      clientId: <span className="font-mono">{c.clientId}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      scopes: {c.scopes ?? "-"}
                    </div>
                  </div>

                  <button
                    onClick={() => onRegen(c.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Regenerar secret
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-sm text-slate-500">Sin API clients</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
