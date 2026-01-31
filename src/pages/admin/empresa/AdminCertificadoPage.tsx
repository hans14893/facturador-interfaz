import { useState } from "react";
import { useParams } from "react-router-dom";
import { uploadCertificado } from "../../../api/adminCertificadoApi";
import { getErrorMessage } from "../../../api/errorHelper";

export default function AdminCertificadoPage() {
  const { empresaId = "" } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);

    if (!file) return setErr("Selecciona un .pfx");
    if (!password.trim()) return setErr("Password requerido");

    setLoading(true);
    try {
      const resp = await uploadCertificado(empresaId, file, password);
      setMsg(typeof resp === "string" ? resp : "OK certificado subido");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error subiendo certificado"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900">Certificado · Empresa #{empresaId}</h1>
      <p className="mt-1 text-sm text-slate-600">Sube el .PFX para firmar XML (SUNAT).</p>

      <form onSubmit={onSubmit} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3">
          <input
            type="file"
            accept=".pfx,.p12"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <input
            type="password"
            placeholder="Password del PFX"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        {err && <div className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{msg}</div>}

        <button
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Subiendo..." : "Subir certificado"}
        </button>
      </form>
    </div>
  );
}
