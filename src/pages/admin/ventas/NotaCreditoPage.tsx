import { useState, useEffect } from "react";
import { listComprobantes, emitirNotaCredito, getComprobanteConDetalle } from "../../../api/comprobantesApi";
import type { Comprobante, NotaCreditoRequest, ItemVenta, ComprobanteConDetalle } from "../../../api/comprobantesApi";
import { getErrorMessage } from "../../../api/errorHelper";

// Tipos de Nota de Crédito según catálogo 09 SUNAT
const TIPOS_NOTA_CREDITO = [
  { codigo: "01", descripcion: "Anulación de la operación" },
  { codigo: "02", descripcion: "Anulación por error en el RUC" },
  { codigo: "03", descripcion: "Corrección por error en la descripción" },
  { codigo: "04", descripcion: "Descuento global" },
  { codigo: "05", descripcion: "Descuento por ítem" },
  { codigo: "06", descripcion: "Devolución total" },
  { codigo: "07", descripcion: "Devolución por ítem" },
  { codigo: "08", descripcion: "Bonificación" },
  { codigo: "09", descripcion: "Disminución en el valor" },
  { codigo: "10", descripcion: "Otros conceptos" },
];

const TIPOS_NC_TOTAL = new Set(["01", "02", "06"]);

const TOLERANCIA_SALDO = 0.05;

function boletaTieneDni(c: Comprobante) {
  // Regla: solo bloquear boletas SIN identificación (sin DNI/RUC).
  if (c.tipoDoc !== "03") return true; // Si no es boleta, siempre permitir
  
  const doc = (c.receptorNroDoc || "").trim();
  
  // Sin documento si no hay número o es todo ceros
  if (!doc || /^0+$/.test(doc)) return false;
  
  // Si tiene un número válido (8 u 11 dígitos), tiene documento
  if (doc.length === 8 || doc.length === 11) return true;
  
  // Otros casos se consideran sin documento válido
  return false;
}

type ComprobanteConSaldo = {
  comprobante: Comprobante;
  totalNcAplicado: number;
  saldoDisponible: number;
  bloqueado: boolean;
  motivoBloqueo?: string;
};

type DetalleSeleccion = {
  itemNro?: number;
  codigo?: string;
  descripcion: string;
  unidad?: string;
  cantidadOriginal: number;
  valorUnitario: number;
  precioUnitario: number;
  afectacionIgv: string;
  igvItemOriginal: number;
  totalItemOriginal: number;
  cantidadNc: number;
  selected: boolean;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round6(n: number) {
  return Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export default function NotaCreditoPage() {
  const [comprobantes, setComprobantes] = useState<ComprobanteConSaldo[]>([]);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<Comprobante | null>(null);
  const [saldoSeleccionado, setSaldoSeleccionado] = useState<number>(0);
  const [modoPorItem, setModoPorItem] = useState(false);
  const [detalleOriginal, setDetalleOriginal] = useState<ComprobanteConDetalle | null>(null);
  const [detalleSeleccion, setDetalleSeleccion] = useState<DetalleSeleccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [tipoNotaCodigo, setTipoNotaCodigo] = useState("01");
  const [motivoNota, setMotivoNota] = useState("");
  const [serie, setSerie] = useState("");
  const [montoDevolucion, setMontoDevolucion] = useState("");
  const [searchSerie, setSearchSerie] = useState("");
  const [searchCorrelativo, setSearchCorrelativo] = useState("");

  useEffect(() => {
    loadComprobantes();
  }, []);

  async function loadComprobantes() {
    setLoading(true);
    try {
      const data = await listComprobantes();

      // 1) Originales elegibles: Facturas/Boletas ACEPTADAS
      const originales = data.filter(
        (c) => (c.tipoDoc === "01" || c.tipoDoc === "03") && c.estado === "ACEPTADO" && boletaTieneDni(c)
      );

      // 2) Notas de Crédito existentes (no rechazadas/anuladas) para calcular saldo
      const notasCredito = data.filter(
        (c) => c.tipoDoc === "07" && !!c.comprobanteReferenciaId && c.estado !== "RECHAZADO" && c.estado !== "ANULADO"
      );

      const totalNcPorRef = new Map<number, number>();
      const hayNcTotalPorRef = new Set<number>();

      for (const nc of notasCredito) {
        const refId = nc.comprobanteReferenciaId as number;
        const prev = totalNcPorRef.get(refId) ?? 0;
        totalNcPorRef.set(refId, prev + (nc.total ?? 0));

        if (nc.tipoNotaCodigo && TIPOS_NC_TOTAL.has(nc.tipoNotaCodigo)) {
          hayNcTotalPorRef.add(refId);
        }
      }

      const withSaldo: ComprobanteConSaldo[] = originales.map((c) => {
        const totalNcAplicado = totalNcPorRef.get(c.id) ?? 0;
        const saldoDisponible = Math.max(0, Number(c.total ?? 0) - totalNcAplicado);
        const bloqueado = hayNcTotalPorRef.has(c.id) || saldoDisponible <= TOLERANCIA_SALDO;
        const motivoBloqueo = hayNcTotalPorRef.has(c.id)
          ? "Ya tiene una NC total"
          : saldoDisponible <= TOLERANCIA_SALDO
            ? "Saldo 0"
            : undefined;

        return { comprobante: c, totalNcAplicado, saldoDisponible, bloqueado, motivoBloqueo };
      });

      // Regla pedida: comprobantes anulados totalmente no deben aparecer en la lista
      setComprobantes(withSaldo.filter((r) => !r.bloqueado));
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando comprobantes"));
    } finally {
      setLoading(false);
    }
  }

  const comprobantesFiltrados = comprobantes.filter((row) => {
    const c = row.comprobante;
    const matchSerie = !searchSerie || c.serie.toLowerCase().includes(searchSerie.toLowerCase());
    const matchCorrelativo = !searchCorrelativo || c.correlativo.toString().includes(searchCorrelativo);
    return matchSerie && matchCorrelativo;
  });

  function seleccionarComprobante(row: ComprobanteConSaldo) {
    const comprobante = row.comprobante;
    if (row.bloqueado) {
      setErr(`Este comprobante no permite más Notas de Crédito (${row.motivoBloqueo || "bloqueado"}).`);
      return;
    }

    setComprobanteSeleccionado(comprobante);
    setSaldoSeleccionado(row.saldoDisponible);
    setMontoDevolucion(row.saldoDisponible.toFixed(2));
    setModoPorItem(false);
    setDetalleOriginal(null);
    setDetalleSeleccion([]);
    // SUNAT EXIGE series diferentes según tipo de documento (Error 2116):
    // - Factura (01) → FC01
    // - Boleta (03) → BC01
    if (comprobante.tipoDoc === "01") {
      setSerie("FC01"); // Nota de crédito de factura
    } else {
      setSerie("BC01"); // Nota de crédito de boleta
    }
    setErr(null);
  }

  async function activarModoPorItem() {
    if (!comprobanteSeleccionado) return;

    setLoading(true);
    setErr(null);
    try {
      const det = await getComprobanteConDetalle(comprobanteSeleccionado.id);
      setDetalleOriginal(det);

      const mapped: DetalleSeleccion[] = (det.items || []).map((it) => ({
        itemNro: it.itemNro,
        codigo: it.codigo,
        descripcion: it.descripcion,
        unidad: it.unidad,
        cantidadOriginal: Number(it.cantidad || 0),
        valorUnitario: Number(it.valorUnitario || 0),
        precioUnitario: Number(it.precioUnitario || 0),
        afectacionIgv: String(it.afectacionIgv || "10"),
        igvItemOriginal: Number(it.igvItem || 0),
        totalItemOriginal: Number(it.totalItem || 0),
        cantidadNc: 0,
        selected: false,
      }));

      setDetalleSeleccion(mapped);
      setModoPorItem(true);
      setTipoNotaCodigo("07"); // Devolución por ítem
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "No se pudo cargar el detalle del comprobante"));
      setModoPorItem(false);
    } finally {
      setLoading(false);
    }
  }

  function actualizarDetalle(index: number, patch: Partial<DetalleSeleccion>) {
    setDetalleSeleccion((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      // Si ponen cantidad > 0, marcar selected automáticamente
      if ("cantidadNc" in patch) {
        copy[index].selected = (copy[index].cantidadNc || 0) > 0;
      }
      return copy;
    });
  }

  const totalNcPorItems = round2(
    detalleSeleccion
      .filter((it) => it.selected && it.cantidadNc > 0)
      .reduce((sum, it) => {
        const qtyOrig = it.cantidadOriginal || 1;
        const totalUnit = it.totalItemOriginal / qtyOrig;
        return sum + totalUnit * it.cantidadNc;
      }, 0)
  );

  async function handleEmitirNotaCredito() {
    if (!comprobanteSeleccionado) {
      setErr("Seleccione un comprobante");
      return;
    }

    if (!motivoNota.trim()) {
      setErr("Ingrese el motivo de la nota de crédito");
      return;
    }

    const monto = modoPorItem ? totalNcPorItems : parseFloat(montoDevolucion);

    if (!monto || monto <= 0) {
      setErr(modoPorItem ? "Seleccione al menos un ítem con cantidad > 0" : "Ingrese un monto válido");
      return;
    }
    const saldo = saldoSeleccionado || comprobanteSeleccionado.total;

    if (monto > saldo + 0.01) {
      setErr(`El monto no puede ser mayor al saldo disponible (S/ ${saldo.toFixed(2)})`);
      return;
    }

    if (modoPorItem) {
      // Para anular por ítem, el tipo correcto es 07 (devolución por ítem)
      if (tipoNotaCodigo !== "07") {
        setErr("Para Nota de Crédito por ítem, use tipo 07 (Devolución por ítem)");
        return;
      }
    }

    if (TIPOS_NC_TOTAL.has(tipoNotaCodigo)) {
      if (Math.abs(monto - comprobanteSeleccionado.total) > 0.05) {
        setErr("Para este tipo de Nota de Crédito, el monto debe ser igual al total del comprobante original");
        return;
      }
      if (Math.abs(saldo - comprobanteSeleccionado.total) > 0.05) {
        setErr("Este comprobante ya tiene Notas de Crédito previas; no se permite una NC total adicional");
        return;
      }
      // Asegurar que sea el total
      // (el backend también lo valida)
    }

    setLoading(true);
    setErr(null);
    setSuccess(null);

    try {
      let items: ItemVenta[];

      if (modoPorItem) {
        items = detalleSeleccion
          .filter((it) => it.selected && it.cantidadNc > 0)
          .map((it) => {
            const qtyOrig = it.cantidadOriginal || 1;
            const igvUnit = it.igvItemOriginal / qtyOrig;
            const totalUnit = it.totalItemOriginal / qtyOrig;

            const igvItem = round2(igvUnit * it.cantidadNc);
            const totalItem = round2(totalUnit * it.cantidadNc);

            return {
              codigo: it.codigo,
              descripcion: it.descripcion,
              unidad: it.unidad,
              cantidad: round6(it.cantidadNc),
              valorUnitario: round6(it.valorUnitario),
              precioUnitario: round6(it.precioUnitario),
              afectacionIgv: it.afectacionIgv,
              igvItem,
              totalItem,
            };
          });
      } else {
        // Modo simple por monto: asume gravada 18% (si necesitas exonerada/inafecta aquí, lo ampliamos)
        const valorSinIgv = monto / 1.18;
        const igv = monto - valorSinIgv;
        items = [
          {
            descripcion: motivoNota,
            cantidad: 1,
            valorUnitario: round6(valorSinIgv),
            precioUnitario: round6(monto),
            afectacionIgv: "10",
            igvItem: round2(igv),
            totalItem: round2(monto),
          },
        ];
      }

      const request: NotaCreditoRequest = {
        serie,
        comprobanteReferenciaId: comprobanteSeleccionado.id,
        docReferenciaTipoDoc: comprobanteSeleccionado.tipoDoc,
        docReferenciaSerie: comprobanteSeleccionado.serie,
        docReferenciaCorrelativo: comprobanteSeleccionado.correlativo,
        tipoNotaCodigo,
        motivoNota,
        fechaEmision: new Date().toISOString(),
        items,
        total: round2(monto),
      };

      const result = await emitirNotaCredito(request);

      setSuccess(`✅ Nota de crédito emitida: ${result.serie}-${result.correlativo}`);
      
      // Limpiar formulario
      setComprobanteSeleccionado(null);
      setSaldoSeleccionado(0);
      setModoPorItem(false);
      setDetalleOriginal(null);
      setDetalleSeleccion([]);
      setMotivoNota("");
      setMontoDevolucion("");
      setSerie("");
      setSearchSerie("");
      setSearchCorrelativo("");
      
      // Recargar comprobantes
      await loadComprobantes();

      // Ocultar mensaje después de 5 segundos
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error al emitir nota de crédito"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notas de Crédito</h1>
      </div>

      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{err}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo - Buscar comprobante */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            1. Buscar Comprobante
          </h2>

          <div className="space-y-4">
            {/* Filtros de búsqueda */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Serie
                </label>
                <input
                  type="text"
                  placeholder="F001, B001..."
                  value={searchSerie}
                  onChange={(e) => setSearchSerie(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correlativo
                </label>
                <input
                  type="text"
                  placeholder="Número..."
                  value={searchCorrelativo}
                  onChange={(e) => setSearchCorrelativo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Lista de comprobantes */}
            <div className="border border-slate-200 rounded-lg max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500">Cargando...</div>
              ) : comprobantesFiltrados.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No hay comprobantes disponibles
                </div>
              ) : (
                comprobantesFiltrados.map((c) => (
                  <button
                    key={c.comprobante.id}
                    onClick={() => seleccionarComprobante(c)}
                    disabled={c.bloqueado}
                    className={`w-full px-4 py-3 text-left border-b border-slate-100 transition ${
                      c.bloqueado ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"
                    } ${
                      comprobanteSeleccionado?.id === c.comprobante.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-slate-900">
                          {c.comprobante.tipoDoc === "01" ? "Factura" : "Boleta"} {c.comprobante.serie}-{c.comprobante.correlativo}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {c.comprobante.receptorNombre} • {c.comprobante.receptorNroDoc}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(c.comprobante.fechaEmision).toLocaleDateString()}
                          <span className="ml-2">
                            Saldo NC: S/ {c.saldoDisponible.toFixed(2)}
                          </span>
                          {c.bloqueado && (
                            <span className="ml-2 text-red-600">({c.motivoBloqueo})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          S/ {c.comprobante.total.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {c.comprobante.estado}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho - Emitir nota de crédito */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            2. Emitir Nota de Crédito
          </h2>

          {!comprobanteSeleccionado ? (
            <div className="text-center py-12 text-slate-500">
              Seleccione un comprobante para continuar
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info del comprobante seleccionado - REFERENCIA */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                  📄 Documento a Modificar (Referencia)
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    comprobanteSeleccionado.tipoDoc === "01" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-orange-100 text-orange-800"
                  }`}>
                    {comprobanteSeleccionado.tipoDoc === "01" ? "FACTURA" : "BOLETA"}
                  </span>
                  <span className="font-mono font-bold text-lg text-slate-900">
                    {comprobanteSeleccionado.serie}-{comprobanteSeleccionado.correlativo}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Cliente:</span>{" "}
                    <span className="text-slate-800">{comprobanteSeleccionado.receptorNombre}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">RUC/DNI:</span>{" "}
                    <span className="font-mono text-slate-800">{comprobanteSeleccionado.receptorNroDoc}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fecha:</span>{" "}
                    <span className="text-slate-800">{new Date(comprobanteSeleccionado.fechaEmision).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total:</span>{" "}
                    <span className="font-semibold text-slate-800">S/ {comprobanteSeleccionado.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <span className="text-slate-500 text-sm">Saldo disponible para NC:</span>{" "}
                  <span className="font-bold text-blue-700">S/ {saldoSeleccionado.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Modo</div>
                    <div className="text-xs text-slate-500">
                      Para “anular por ítem”, usa Devolución por ítem (07)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModoPorItem(false);
                        setDetalleOriginal(null);
                        setDetalleSeleccion([]);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        !modoPorItem ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      Por monto
                    </button>
                    <button
                      type="button"
                      onClick={activarModoPorItem}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        modoPorItem ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
                      } disabled:opacity-50`}
                    >
                      Por ítem
                    </button>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Serie de la Nota *
                </label>
                <input
                  type="text"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="FC01 (facturas), BC01 (boletas)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Nota *
                </label>
                <select
                  value={tipoNotaCodigo}
                  onChange={(e) => setTipoNotaCodigo(e.target.value)}
                  disabled={modoPorItem}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {TIPOS_NOTA_CREDITO.map((tipo) => (
                    <option key={tipo.codigo} value={tipo.codigo}>
                      {tipo.codigo} - {tipo.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo *
                </label>
                <textarea
                  value={motivoNota}
                  onChange={(e) => setMotivoNota(e.target.value)}
                  placeholder="Describa el motivo de la nota de crédito..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monto de la Nota *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={modoPorItem ? totalNcPorItems.toFixed(2) : montoDevolucion}
                  onChange={(e) => setMontoDevolucion(e.target.value)}
                  disabled={modoPorItem}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Máximo: S/ {saldoSeleccionado.toFixed(2)}
                </p>
              </div>

              {modoPorItem && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Selecciona ítems</div>
                  {!detalleOriginal ? (
                    <div className="text-sm text-slate-500">Cargando detalle...</div>
                  ) : detalleSeleccion.length === 0 ? (
                    <div className="text-sm text-slate-500">No hay ítems en el comprobante</div>
                  ) : (
                    <div className="space-y-2">
                      {detalleSeleccion.map((it, idx) => (
                        <div key={it.itemNro ?? idx} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={it.selected}
                            onChange={(e) => actualizarDetalle(idx, { selected: e.target.checked })}
                          />
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">
                              {it.descripcion}
                              <span className="ml-2 text-xs text-slate-500">
                                ({it.unidad || "-"})
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              Cant. original: {it.cantidadOriginal} • Línea: S/ {it.totalItemOriginal.toFixed(2)}
                            </div>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={it.cantidadOriginal}
                            value={it.cantidadNc}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(it.cantidadOriginal, parseFloat(e.target.value) || 0));
                              actualizarDetalle(idx, { cantidadNc: v });
                            }}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                      <div className="pt-2 text-sm font-semibold text-slate-900">
                        Total NC por ítems: S/ {totalNcPorItems.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleEmitirNotaCredito}
                disabled={loading}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Emitiendo..." : "Emitir Nota de Crédito"}
              </button>

              <p className="text-xs text-slate-500 text-center">
                La nota de crédito se enviará automáticamente a SUNAT
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
