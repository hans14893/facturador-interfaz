import { useState, useEffect } from "react";
import { listComprobantes, emitirNotaDebito, type Comprobante, type ItemVenta } from "../../../api/comprobantesApi";
import StatusPill from "../../../components/StatusPill";

const primaryButtonStyles = "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50";
const secondaryButtonStyles = "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50";

// Catálogo 10 SUNAT - Tipos de Nota de Débito
const tiposNotaDebito = [
  { codigo: "01", nombre: "Intereses por mora" },
  { codigo: "02", nombre: "Aumento en el valor" },
  { codigo: "03", nombre: "Penalidades / otros conceptos" },
  { codigo: "11", nombre: "Ajustes de operaciones de exportación" },
  { codigo: "12", nombre: "Ajustes afectos al IVAP" }
];

export default function NotaDebitoPage() {
  type ComprobanteConSaldo = {
    comprobante: Comprobante;
    totalNcAplicado: number;
    saldoDisponible: number;
  };

  const [comprobantes, setComprobantes] = useState<ComprobanteConSaldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Formulario
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<Comprobante | null>(null);
  const [tipoNotaCodigo, setTipoNotaCodigo] = useState("01");
  const [motivoNota, setMotivoNota] = useState("");
  const [items, setItems] = useState<ItemVenta[]>([{
    descripcion: "",
    cantidad: 1,
    precioUnitario: 0,
    totalItem: 0
  }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    cargarComprobantes();
  }, []);

  async function cargarComprobantes() {
    try {
      const data = await listComprobantes();

      const boletaTieneDni = (c: Comprobante) => {
        // Regla: solo permitir boletas con DNI (8 dígitos) o RUC (11 dígitos)
        if (c.tipoDoc !== "03") return true; // Facturas siempre OK
        const doc = (c.receptorNroDoc || "").trim();
        if (!doc) return false; // Sin documento = no permitir
        // Debe tener exactamente 8 o 11 dígitos
        return doc.length === 8 || doc.length === 11;
      };

      // Originales elegibles: ACEPTADOS (01/03) + boletas con DNI
      const originales = data.filter(
        (c) => c.estado === "ACEPTADO" && (c.tipoDoc === "01" || c.tipoDoc === "03") && boletaTieneDni(c)
      );

      // Notas de Crédito existentes para calcular saldo y excluir anuladas totales
      const notasCredito = data.filter(
        (c) => c.tipoDoc === "07" && !!c.comprobanteReferenciaId && c.estado !== "RECHAZADO" && c.estado !== "ANULADO"
      );

      const TIPOS_NC_TOTAL = new Set(["01", "02", "06"]);
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

      const TOLERANCIA_SALDO = 0.05;

      // Regla pedida: comprobantes anulados totalmente por NC no deben aparecer para ND
      const elegibles: ComprobanteConSaldo[] = originales
        .map((c) => {
          const totalNcAplicado = totalNcPorRef.get(c.id) ?? 0;
          const saldoDisponible = Math.max(0, Number(c.total ?? 0) - totalNcAplicado);
          return { comprobante: c, totalNcAplicado, saldoDisponible };
        })
        .filter((r) => !hayNcTotalPorRef.has(r.comprobante.id) && r.saldoDisponible > TOLERANCIA_SALDO);

      setComprobantes(elegibles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const comprobantesFiltrados = comprobantes.filter((row) => {
    const c = row.comprobante;
    const texto = busqueda.toLowerCase();
    return (
      c.serie.toLowerCase().includes(texto) ||
      c.correlativo.toString().includes(texto) ||
      c.receptorNombre?.toLowerCase().includes(texto) ||
      c.receptorNroDoc?.includes(texto)
    );
  });

  function seleccionarComprobante(row: ComprobanteConSaldo) {
    setComprobanteSeleccionado(row.comprobante);
    setError("");
    setSuccess("");
    // Reset form
    setTipoNotaCodigo("01");
    setMotivoNota("");
    setItems([{
      descripcion: "",
      cantidad: 1,
      precioUnitario: 0,
      totalItem: 0
    }]);
  }

  function actualizarItem(index: number, campo: keyof ItemVenta, valor: string | number) {
    const nuevosItems = [...items];
    (nuevosItems[index] as Record<string, unknown>)[campo] = valor;
    
    // Recalcular total del item
    const item = nuevosItems[index];
    if (item.cantidad && item.precioUnitario) {
      item.totalItem = item.cantidad * item.precioUnitario;
    }
    
    setItems(nuevosItems);
  }

  function agregarItem() {
    setItems([...items, {
      descripcion: "",
      cantidad: 1,
      precioUnitario: 0,
      totalItem: 0
    }]);
  }

  function eliminarItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  const totalND = items.reduce((sum, item) => sum + (item.totalItem || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comprobanteSeleccionado) return;

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      // Validar items
      for (const item of items) {
        if (!item.descripcion || !item.cantidad || !item.precioUnitario) {
          throw new Error("Todos los items deben tener descripción, cantidad y precio");
        }
      }

      const result = await emitirNotaDebito({
        comprobanteReferenciaId: comprobanteSeleccionado.id,
        tipoNotaCodigo,
        motivoNota,
        items,
        total: totalND
      });

      setSuccess(`✅ Nota de Débito ${result.serie}-${result.correlativo} emitida correctamente`);
      
      // Limpiar formulario
      setTimeout(() => {
        setComprobanteSeleccionado(null);
        setSuccess("");
      }, 3000);

      // Recargar lista
      cargarComprobantes();
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      setError(error.response?.data || error.message || "Error al emitir la nota de débito");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notas de Débito</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Búsqueda de comprobantes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Buscar Comprobante Original</h2>
          
          <input
            type="text"
            placeholder="Buscar por serie, número, cliente..."
            className="w-full px-4 py-2 border rounded-lg mb-4"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {loading && <p className="text-gray-500">Cargando...</p>}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {comprobantesFiltrados.length === 0 && !loading && (
              <p className="text-gray-500">No hay comprobantes disponibles</p>
            )}

            {comprobantesFiltrados.map((row) => {
              const c = row.comprobante;
              return (
              <div
                key={c.id}
                onClick={() => seleccionarComprobante(row)}
                className={`p-4 border rounded-lg cursor-pointer transition ${
                  comprobanteSeleccionado?.id === c.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{c.serie}-{c.correlativo}</span>
                  <StatusPill value={c.estado} />
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Cliente:</strong> {c.receptorNombre || "Sin nombre"}</p>
                  <p><strong>RUC/DNI:</strong> {c.receptorNroDoc || "-"}</p>
                  <p><strong>Total:</strong> S/ {c.total.toFixed(2)}</p>
                  <p><strong>Saldo disponible (por NC):</strong> S/ {row.saldoDisponible.toFixed(2)}</p>
                  <p><strong>Fecha:</strong> {new Date(c.fechaEmision).toLocaleDateString()}</p>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Panel derecho: Formulario de ND */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Emitir Nota de Débito</h2>

          {!comprobanteSeleccionado ? (
            <p className="text-gray-500">Selecciona un comprobante de la izquierda para emitir una nota de débito</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Comprobante referencia */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">Comprobante Original:</p>
                <p className="text-sm">{comprobanteSeleccionado.serie}-{comprobanteSeleccionado.correlativo}</p>
                <p className="text-sm">Cliente: {comprobanteSeleccionado.receptorNombre}</p>
                <p className="text-sm">Total: S/ {comprobanteSeleccionado.total.toFixed(2)}</p>
              </div>

              {/* Tipo de ND */}
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Nota de Débito</label>
                <select
                  value={tipoNotaCodigo}
                  onChange={(e) => setTipoNotaCodigo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {tiposNotaDebito.map(t => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.codigo} - {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium mb-1">Motivo / Sustento</label>
                <textarea
                  value={motivoNota}
                  onChange={(e) => setMotivoNota(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Describe el motivo del cargo adicional..."
                  required
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium mb-2">Conceptos a cobrar</label>
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 mb-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Descripción (ej: Intereses mora 15 días)"
                      value={item.descripcion}
                      onChange={(e) => actualizarItem(idx, "descripcion", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cantidad"
                        value={item.cantidad || ""}
                        onChange={(e) => actualizarItem(idx, "cantidad", parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio Unit."
                        value={item.precioUnitario || ""}
                        onChange={(e) => actualizarItem(idx, "precioUnitario", parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Total"
                        value={item.totalItem.toFixed(2)}
                        disabled
                        className="px-3 py-2 border rounded-lg text-sm bg-gray-100"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={agregarItem}
                  className={secondaryButtonStyles + " w-full"}
                >
                  + Agregar concepto
                </button>
              </div>

              {/* Total */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Nota de Débito:</span>
                  <span className="text-2xl font-bold text-green-600">
                    S/ {totalND.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Mensajes */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setComprobanteSeleccionado(null);
                    setError("");
                    setSuccess("");
                  }}
                  className={secondaryButtonStyles}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={primaryButtonStyles + " flex-1"}
                  disabled={submitting}
                >
                  {submitting ? "Emitiendo..." : "Emitir Nota de Débito"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
