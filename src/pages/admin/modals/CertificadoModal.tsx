import { useCallback, useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import { uploadCertificado, getCertificadoInfo } from "../../../api/adminCertificadoApi";
import type { CertificadoInfo } from "../../../api/adminCertificadoApi";
import { getErrorMessage } from "../../../api/errorHelper";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
};

export default function CertificadoModal({ isOpen, onClose, empresaId }: Props) {
  const [certInfo, setCertInfo] = useState<CertificadoInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadCertificadoInfo = useCallback(async () => {
    setLoadingInfo(true);
    try {
      const info = await getCertificadoInfo(empresaId);
      setCertInfo(info);
    } catch {
      // Si no hay certificado, no es error
      setCertInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) {
      loadCertificadoInfo();
    }
  }, [isOpen, loadCertificadoInfo]);

  function getDaysUntilExpiration(fechaVencimiento: string): number {
    const expDate = new Date(fechaVencimiento);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getExpirationStatus(fechaVencimiento?: string): {
    status: "vigente" | "por-vencer" | "vencido" | "sin-info";
    label: string;
    color: string;
  } {
    if (!fechaVencimiento) {
      return { status: "sin-info", label: "Sin información", color: "text-slate-500 bg-slate-100" };
    }

    const days = getDaysUntilExpiration(fechaVencimiento);

    if (days < 0) {
      return { status: "vencido", label: "Vencido", color: "text-red-700 bg-red-100 border-red-200" };
    } else if (days <= 30) {
      return { status: "por-vencer", label: `Por vencer (${days} días)`, color: "text-amber-700 bg-amber-100 border-amber-200" };
    } else {
      return { status: "vigente", label: `Vigente (${days} días)`, color: "text-emerald-700 bg-emerald-100 border-emerald-200" };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!file) {
      setErr("Selecciona un archivo .pfx o .p12");
      return;
    }
    if (!password.trim()) {
      setErr("La contraseña es requerida");
      return;
    }

    setLoading(true);
    try {
      const resp = await uploadCertificado(empresaId, file, password);
      setMsg(typeof resp === "string" ? resp : "Certificado subido correctamente");
      setFile(null);
      setPassword("");
      await loadCertificadoInfo();
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error subiendo certificado"));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setPassword("");
    setMsg(null);
    setErr(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Certificado Digital - Empresa #${empresaId}`} size="md">
      {loadingInfo ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Cargando información del certificado...
        </div>
      ) : certInfo ? (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-900">Certificado Actual</h3>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                getExpirationStatus(certInfo.fechaVencimiento).color
              }`}
            >
              {getExpirationStatus(certInfo.fechaVencimiento).label}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            {certInfo.nombreTitular && (
              <div className="flex justify-between">
                <span className="text-slate-600">Titular:</span>
                <span className="font-semibold text-slate-900">{certInfo.nombreTitular}</span>
              </div>
            )}
            {certInfo.rucTitular && (
              <div className="flex justify-between">
                <span className="text-slate-600">RUC:</span>
                <span className="font-mono font-semibold text-slate-900">{certInfo.rucTitular}</span>
              </div>
            )}
            {certInfo.fechaVencimiento && (
              <div className="flex justify-between">
                <span className="text-slate-600">Vence:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(certInfo.fechaVencimiento).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {getExpirationStatus(certInfo.fechaVencimiento).status === "vencido" && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <strong>Certificado vencido.</strong> Sube un nuevo certificado para poder emitir comprobantes.
                </div>
              </div>
            </div>
          )}

          {getExpirationStatus(certInfo.fechaVencimiento).status === "por-vencer" && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <div>
                  <strong>El certificado está por vencer.</strong> Considera renovarlo pronto.
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-slate-700">
              {getExpirationStatus(certInfo.fechaVencimiento).status === "vencido"
                ? "Subir nuevo certificado"
                : "Reemplazar certificado"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {getExpirationStatus(certInfo.fechaVencimiento).status === "vencido"
                ? "Es necesario subir un nuevo certificado vigente"
                : "Si tienes un certificado renovado, súbelo para reemplazar el actual"}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-blue-900">Primera vez</div>
              <div className="mt-1 text-xs text-blue-800">
                No hay certificado registrado. Sube tu certificado digital para comenzar a emitir comprobantes.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 text-slate-700 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <div className="text-xs font-semibold text-slate-700">Requisitos</div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>• Archivo .pfx o .p12 válido</li>
              <li>• Certificado vigente emitido por una entidad certificadora autorizada</li>
              <li>• Contraseña del certificado</li>
              <li>• El nuevo certificado reemplazará al anterior</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Archivo de Certificado *
            </label>
            <input
              type="file"
              accept=".pfx,.p12"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:opacity-90"
            />
            {file && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Contraseña del Certificado *
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Ingresa la contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Subiendo..." : certInfo ? "Reemplazar Certificado" : "Subir Certificado"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
