import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCertificadoInfo, uploadCertificado, type CertificadoInfo } from "../../../api/adminCertificadoApi";
import { getErrorMessage } from "../../../api/errorHelper";

export default function AdminCertificadoPage() {
  const { empresaId = "" } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<CertificadoInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    void loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function loadInfo() {
    if (!empresaId) return;
    setLoadingInfo(true);
    try {
      const data = await getCertificadoInfo(empresaId);
      setInfo(data);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando info de certificado"));
    } finally {
      setLoadingInfo(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!file) return setErr("Selecciona un .pfx");
    if (!password.trim()) return setErr("Password requerido");

    setLoading(true);
    try {
      const resp = await uploadCertificado(empresaId, file, password);
      setMsg(typeof resp === "string" ? resp : "OK certificado subido");
      await loadInfo();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error subiendo certificado"));
    } finally {
      setLoading(false);
    }
  }

  const formatCertDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "2-digit" });
  };

  const certDaysLeft = (() => {
    if (!info?.fechaVencimiento) return null;
    const date = new Date(info.fechaVencimiento);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  })();

  const certExpiringSoon = typeof certDaysLeft === "number" && certDaysLeft <= 30 && certDaysLeft >= 0;
  const certStatus = info?.vigente ? "Vigente" : "Vencido";
  const certStatusClass = info?.vigente
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Certificado · Empresa #{empresaId}</h1>
          <p className="mt-1 text-sm text-slate-600">Sube el PFX/P12 para firmar XML (SUNAT).</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info ? certStatusClass : "bg-slate-100 text-slate-600"}`}>
            {info ? certStatus : "Sin certificado"}
          </span>
          {info?.fechaVencimiento && (
            <span>Vence: {formatCertDate(info.fechaVencimiento)}</span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3">
            <input
              id="admin-cert-file"
              type="file"
              accept=".pfx,.p12"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <label
                htmlFor="admin-cert-file"
                className="inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95"
              >
                Seleccionar archivo
              </label>
              <span className="text-xs text-slate-500">
                {file?.name ?? "Ningún archivo seleccionado"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password del PFX"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Estado del certificado</div>
          {loadingInfo ? (
            <div className="mt-2 text-sm text-slate-500">Cargando...</div>
          ) : info ? (
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div>Vigencia: {certStatus}</div>
              <div>Vence: {formatCertDate(info.fechaVencimiento)}</div>
              <div>
                Días restantes:{" "}
                {typeof certDaysLeft === "number" ? (
                  <span className={certExpiringSoon ? "font-semibold text-amber-700" : "font-semibold text-slate-700"}>
                    {certDaysLeft}
                  </span>
                ) : (
                  "-"
                )}
              </div>
              <div>Titular: {info.nombreTitular ?? "-"}</div>
              <div>RUC: {info.rucTitular ?? "-"}</div>
              {certExpiringSoon && (
                <div className="mt-1 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                  El certificado vence pronto. Te recomendamos renovarlo.
                </div>
              )}
              {!info.vigente && (
                <div className="mt-1 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-800">
                  Certificado vencido. Sube uno nuevo para emitir comprobantes.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-500">No hay certificado activo.</div>
          )}
        </div>
      </div>
    </div>
  );
}
