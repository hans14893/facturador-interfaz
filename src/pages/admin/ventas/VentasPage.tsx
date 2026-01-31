import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listVentasPorSesion, type Venta } from "../../../api/ventasApi";
import { getSesiones } from "../../../api/cajaApi";
import type { CajaSesion } from "../../../types/caja";
import StatusPill from "../../../components/StatusPill";
import Modal from "../../../components/Modal";
import DetalleVentaModal from "./DetalleVentaModal";
import { clearAuth, getAuth } from "../../../auth/authStore";

function money(v: unknown) {
  const n = Number(v ?? 0);
  return n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tipoDocLabel(td: string) {
  switch (td) {
    case "01":
      return "Factura";
    case "03":
      return "Boleta";
    case "07":
      return "Nota Crédito";
    case "08":
      return "Nota Débito";
    default:
      return td || "-";
  }
}

function dateKeyFromUnknownDate(input: string) {
  // Evita problemas de zona horaria comparando por YYYY-MM-DD.
  // - Si viene ISO completo: 2026-01-20T10:11:12 -> 2026-01-20
  // - Si viene solo fecha: 2026-01-20 -> 2026-01-20
  // - Si viene vacío -> ""
  return (input || "").slice(0, 10);
}

function formatFecha(f: string) {
  if (!f) return "-";
  const key = dateKeyFromUnknownDate(f);
  const d = f.includes("T") ? new Date(f) : new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key || "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toInputDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function VentasPage() {
  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );
  const todayDate = useMemo(() => toInputDate(today), [today]);
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [filtroDesde, setFiltroDesde] = useState<string>(todayDate);
  const [filtroHasta, setFiltroHasta] = useState<string>(todayDate);
  const [filtroCajaId, setFiltroCajaId] = useState<number | null>(null); // null = todas las cajas

  // Estados para modal de preview PDF
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfPreviewFormato, setPdfPreviewFormato] = useState<"A4" | "TICKET">("A4");

  // Estado para modal de detalle de venta
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState<number | null>(null);

  const handleLogout = useCallback(() => {
    clearAuth();
    window.location.href = "/login";
  }, []);

  const ventasFiltradas = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase();

    return (ventas || []).filter((v) => {
      const ventaKey = dateKeyFromUnknownDate(v.fechaEmision);
      if (filtroDesde && ventaKey && ventaKey < filtroDesde) return false;
      if (filtroHasta && ventaKey && ventaKey > filtroHasta) return false;

      if (!q) return true;

      const correlativo = String(v.correlativo ?? "").padStart(8, "0");
      const comprobante = `${v.serie || ""}-${correlativo}`.toLowerCase();
      const receptorNombre = (v.receptorNombre || "").toLowerCase();
      const receptorDoc = (v.receptorNroDoc || "").toLowerCase();
      const idStr = String(v.id || "");

      return (
        receptorNombre.includes(q) ||
        receptorDoc.includes(q) ||
        comprobante.includes(q) ||
        (v.serie || "").toLowerCase().includes(q) ||
        correlativo.includes(q) ||
        idStr.includes(q)
      );
    });
  }, [ventas, filtroTexto, filtroDesde, filtroHasta]);

  // Lista de cajas físicas únicas
  const cajasUnicas = useMemo(() => {
    const cajasMap = new Map<number, { id: number; nombre: string }>();
    sesiones.forEach((s) => {
      if (s.cajaFisica && !cajasMap.has(s.cajaFisica.id)) {
        cajasMap.set(s.cajaFisica.id, {
          id: s.cajaFisica.id,
          nombre: s.cajaFisica.nombre,
        });
      }
    });
    return Array.from(cajasMap.values());
  }, [sesiones]);

  const fetchSesiones = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await getSesiones();
      data.sort(
        (a, b) =>
          new Date(b.fechaApertura).getTime() -
          new Date(a.fechaApertura).getTime(),
      );
      setSesiones(data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setErr("Error al cargar sesiones de caja");
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  const fetchVentasPorCaja = useCallback(
    async (cajaId: number | null) => {
      setLoading(true);
      setErr(null);
      try {
        const sesionesACargar = cajaId
          ? sesiones.filter((s) => s.cajaFisica?.id === cajaId)
          : sesiones;

        const ventasPromises = sesionesACargar.map((s) =>
          listVentasPorSesion(s.id),
        );
        const ventasArrays = await Promise.all(ventasPromises);

        const todasLasVentas = ventasArrays.flat();
        todasLasVentas.sort(
          (a, b) =>
            new Date(b.fechaEmision).getTime() -
            new Date(a.fechaEmision).getTime(),
        );
        setVentas(todasLasVentas);
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 401) {
          handleLogout();
        } else {
          setErr("Error al cargar ventas");
        }
      } finally {
        setLoading(false);
      }
    },
    [handleLogout, sesiones],
  );

  useEffect(() => {
    fetchSesiones();
  }, [fetchSesiones]);

  useEffect(() => {
    if (sesiones.length > 0) {
      fetchVentasPorCaja(filtroCajaId);
    }
  }, [filtroCajaId, sesiones.length, fetchVentasPorCaja]);

  async function abrirPdfPreview(ventaId: number, format: "A4" | "TICKET" = "A4") {
    try {
      const maxReintentos = 8;
      let intento = 0;

      const intentarAbrirPDF = async (): Promise<boolean> => {
        try {
          intento++;
          const pdfUrl = `/api/v1/comprobantes/${ventaId}/files/pdf?format=${format}`;
          const response = await fetch(pdfUrl, {
            headers: {
              Authorization: `Bearer ${getAuth()?.token}`,
            },
          });

          if (response.status === 404) {
            if (intento < maxReintentos) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              return intentarAbrirPDF();
            }
            return false;
          }

          if (!response.ok) throw new Error(`Error al obtener PDF (HTTP ${response.status})`);

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          setPdfPreviewUrl(url);
          setPdfPreviewFormato(format);
          setShowPdfPreviewModal(true);
          return true;
        } catch (error) {
          console.error('Error abriendo PDF:', error);
          if (intento < maxReintentos) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return intentarAbrirPDF();
          }
          return false;
        }
      };

      const ok = await intentarAbrirPDF();
      if (!ok) {
        alert('No se pudo generar el PDF todavía. Intenta nuevamente en unos segundos.');
      }
    } catch (error) {
      console.error("Error abriendo PDF:", error);
      alert("Error al abrir el PDF");
    }
  }

  function cerrarPdfPreview() {
    setShowPdfPreviewModal(false);
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  }

  if (loading && sesiones.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        {err}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lista de Ventas</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona y visualiza todas las ventas realizadas</p>
        </div>
        <button
          onClick={() => fetchVentasPorCaja(filtroCajaId)}
          disabled={sesiones.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Alerta cuando no hay sesiones */}
      {sesiones.length === 0 && (
        <div className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>No hay sesiones de caja.</span>
          <Link to="/admin/cajas" className="font-semibold underline hover:text-amber-800">Abrir sesión de caja</Link>
        </div>
      )}

      {/* Filtros mejorados */}
      {sesiones.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-slate-700">Filtros de búsqueda</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Buscar
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  placeholder="Cliente, DNI/RUC, serie o correlativo..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Caja
              </label>
              <select
                value={filtroCajaId || ""}
                onChange={(e) => setFiltroCajaId(e.target.value ? Number(e.target.value) : null)}
                className="w-full py-2.5 rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">Todas las cajas</option>
                {cajasUnicas.map((caja) => (
                  <option key={caja.id} value={caja.id}>
                    {caja.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Desde
              </label>
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="w-full py-2.5 rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                Hasta
              </label>
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="w-full py-2.5 rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="text-sm text-slate-600">
              Mostrando <span className="font-semibold text-blue-600">{ventasFiltradas.length}</span> de{" "}
              <span className="font-semibold text-slate-900">{ventas.length}</span> ventas
            </div>
            <button
              onClick={() => {
                setFiltroTexto("");
                setFiltroDesde(toInputDate(firstDayOfMonth));
                setFiltroHasta(toInputDate(tomorrow));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          </div>
        </div>
      )}
      {/* Tabla de ventas mejorada */}
      {sesiones.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Comprobante
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm text-slate-500">Cargando ventas...</span>
                      </div>
                    </td>
                  </tr>
                ) : ventas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-slate-500 font-medium">No hay ventas en esta sesión</span>
                        <span className="text-sm text-slate-400">Las ventas aparecerán aquí cuando se registren</span>
                      </div>
                    </td>
                  </tr>
                ) : ventasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-slate-500 font-medium">Sin resultados</span>
                        <span className="text-sm text-slate-400">Prueba con otros filtros de búsqueda</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((v, index) => (
                    <tr key={v.id} className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                            {v.tipoDoc === "01" ? "F" : v.tipoDoc === "03" ? "B" : v.tipoDoc === "07" ? "NC" : "V"}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{v.serie}-{String(v.correlativo).padStart(8, "0")}</p>
                            <p className="text-[10px] text-slate-400">ID: {v.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                          v.tipoDoc === "01" ? "bg-amber-100 text-amber-700" :
                          v.tipoDoc === "03" ? "bg-blue-100 text-blue-700" :
                          v.tipoDoc === "07" ? "bg-purple-100 text-purple-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {tipoDocLabel(v.tipoDoc)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="text-xs text-slate-900">{formatFecha(v.fechaEmision).split(' ')[0]}</p>
                          <p className="text-[10px] text-slate-400">{formatFecha(v.fechaEmision).split(' ')[1]}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-slate-900 truncate max-w-[180px]">{v.receptorNombre || "Cliente General"}</p>
                          <p className="text-[10px] text-slate-400">{v.receptorNroDoc || "Sin documento"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-sm font-bold text-slate-900">S/ {money(v.total)}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusPill value={v.estado} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setVentaSeleccionadaId(v.id);
                              setShowDetalleModal(true);
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors text-[11px] font-medium"
                            title="Ver detalle"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Detalle
                          </button>
                          <button
                            onClick={() => abrirPdfPreview(v.id, 'A4')}
                            className="inline-flex items-center gap-0.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-[11px] font-medium"
                            title="PDF A4"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            A4
                          </button>
                          <button
                            onClick={() => abrirPdfPreview(v.id, 'TICKET')}
                            className="inline-flex items-center gap-0.5 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition-colors text-[11px] font-medium"
                            title="Ticket"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Venta */}
      {ventaSeleccionadaId && (
        <DetalleVentaModal
          isOpen={showDetalleModal}
          onClose={() => {
            setShowDetalleModal(false);
            setVentaSeleccionadaId(null);
          }}
          comprobanteId={ventaSeleccionadaId}
        />
      )}

      {/* Modal de previsualización de PDF mejorado */}
      <Modal
        isOpen={showPdfPreviewModal}
        onClose={cerrarPdfPreview}
        title=""
        size="lg"
      >
        <div className="flex flex-col h-[80vh]">
          {/* Header del modal */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Vista Previa del Comprobante</h3>
                <p className="text-sm text-slate-500">Formato: {pdfPreviewFormato === "A4" ? "A4 (Hoja completa)" : "Ticket (80mm)"}</p>
              </div>
            </div>
            <button
              onClick={cerrarPdfPreview}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Visor PDF */}
          {pdfPreviewUrl && (
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="Vista previa PDF"
              />
            </div>
          )}

          {/* Footer con acciones */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Puedes imprimir directamente desde el visor PDF</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={cerrarPdfPreview}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Cerrar
              </button>
              {pdfPreviewUrl && (
                <a
                  href={pdfPreviewUrl}
                  download="comprobante.pdf"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
