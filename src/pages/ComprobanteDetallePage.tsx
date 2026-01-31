import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AxiosError } from "axios";
import { getComprobante } from "../api/comprobantesApi";
import type { Comprobante } from "../api/comprobantesApi";
import StatusPill from "../components/StatusPill";

export default function ComprobanteDetallePage() {
  const { id } = useParams();
  const cid = Number(id);

  const getErrorMessageFromUnknown = (data: unknown): string | null => {
    if (!data || typeof data !== "object") return null;
    if (!("message" in data)) return null;
    const msg = (data as { message?: unknown }).message;
    return typeof msg === "string" && msg.trim() ? msg : null;
  };

  const [row, setRow] = useState<Comprobante | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        setRow(await getComprobante(cid));
      } catch (ex: unknown) {
        if (ex instanceof AxiosError) {
          const apiMsg = getErrorMessageFromUnknown(ex.response?.data);
          setErr(
            apiMsg || ex.message || "Error cargando comprobante"
          );
        } else if (ex instanceof Error) {
          setErr(ex.message);
        } else {
          setErr("Error cargando comprobante");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [cid]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/comprobantes"
          className="text-sm text-slate-300 hover:text-white"
        >
          ← Volver
        </Link>
      </div>

      {loading && <p className="mt-4 text-slate-400">Cargando...</p>}
      {err && <p className="mt-4 text-red-300">{err}</p>}

      {row && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h1 className="text-xl font-semibold">
              {row.tipoDoc}-{row.serie}-{row.correlativo}
            </h1>
            <StatusPill value={row.estado} />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-slate-400 text-xs">Receptor</div>
              <div className="font-medium">{row.receptorNombre || "-"}</div>
              <div className="text-slate-300">
                {row.receptorNroDoc || ""}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-slate-400 text-xs">Total</div>
              <div className="text-lg font-semibold">
                {Number(row.total).toFixed(2)}
              </div>
              <div className="text-slate-300">
                {row.fechaEmision ? new Date(row.fechaEmision).toLocaleString() : '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
