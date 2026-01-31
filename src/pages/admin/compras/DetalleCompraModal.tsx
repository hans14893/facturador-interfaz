import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { comprasApi, type Compra } from "../../../api/comprasApi";
import { getAuth } from "../../../auth/authStore";
import { handleApiError } from "../../../api/errorHelper";
import StatusPill from "../../../components/StatusPill";

interface DetalleCompraModalProps {
  open: boolean;
  onClose: () => void;
  compraId: number | null;
  onEstadoChange?: () => void;
}

export default function DetalleCompraModal({
  open,
  onClose,
  compraId,
  onEstadoChange,
}: DetalleCompraModalProps) {
  const [compra, setCompra] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const auth = getAuth();
  const empresaId = auth?.empresaId;

  useEffect(() => {
    if (open && compraId && empresaId) {
      loadCompra();
    }
  }, [open, compraId, empresaId]);

  const loadCompra = async () => {
    if (!empresaId || !compraId) return;

    setLoading(true);
    try {
      const data = await comprasApi.getById(empresaId, compraId);
      setCompra(data);
    } catch (error) {
      handleApiError(error, "Error al cargar detalle de compra");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleEstadoChange = async (nuevoEstado: "PENDIENTE" | "RECIBIDO" | "CANCELADO") => {
    if (!empresaId || !compraId || !compra) return;

    // Confirmación para estados críticos
    if (nuevoEstado === "RECIBIDO") {
      if (!confirm("¿Confirmar recepción? Esto actualizará el stock de los productos.")) {
        return;
      }
    } else if (nuevoEstado === "CANCELADO") {
      if (!confirm("¿Cancelar esta compra?")) {
        return;
      }
    }

    setCambiandoEstado(true);
    try {
      await comprasApi.update(empresaId, compraId, { estado: nuevoEstado });
      setCompra({ ...compra, estado: nuevoEstado });
      if (onEstadoChange) onEstadoChange();
    } catch (error) {
      handleApiError(error, "Error al cambiar estado");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    const colors = {
      PENDIENTE: "warning",
      RECIBIDO: "success",
      CANCELADO: "error",
    };
    return colors[estado as keyof typeof colors] || "default";
  };

  if (!compra && loading) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Detalle de Compra">
        <div className="py-12 text-center text-slate-500">Cargando...</div>
      </Modal>
    );
  }

  if (!compra) {
    return null;
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Detalle de Compra">
      <div className="space-y-6">
        {/* Encabezado con estado */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {compra.numeroComprobante}
            </h2>
            <p className="text-sm text-slate-500">{compra.tipoComprobante}</p>
          </div>
          <div className="text-right">
            <StatusPill value={compra.estado} />
            {compra.estado === "PENDIENTE" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleEstadoChange("RECIBIDO")}
                  disabled={cambiandoEstado}
                  className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Marcar Recibido
                </button>
                <button
                  onClick={() => handleEstadoChange("CANCELADO")}
                  disabled={cambiandoEstado}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Información general */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Información General</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Fecha:</span>{" "}
                <span className="font-medium text-slate-900">
                  {new Date(compra.fecha).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Moneda:</span>{" "}
                <span className="font-medium text-slate-900">{compra.moneda}</span>
              </div>
              <div>
                <span className="text-slate-500">Creado:</span>{" "}
                <span className="text-slate-700">
                  {new Date(compra.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Proveedor</h3>
            {compra.proveedor ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-slate-900">
                    {compra.proveedor.razonSocial}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">RUC/DNI:</span>{" "}
                  <span className="text-slate-700">{compra.proveedor.numeroDocumento}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sin información</p>
            )}
          </div>
        </div>

        {/* Observaciones */}
        {compra.observaciones && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Observaciones</h3>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
              {compra.observaciones}
            </p>
          </div>
        )}

        {/* Detalle de productos */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Productos</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Producto</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Cantidad</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">P. Unitario</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {compra.detalles.map((detalle, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-900">
                      {detalle.productoDescripcion || `Producto ID: ${detalle.productoId}`}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {detalle.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {compra.moneda} {detalle.precioUnitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {compra.moneda} {detalle.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">
                  {compra.moneda} {compra.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGV (18%):</span>
                <span className="font-medium text-slate-900">
                  {compra.moneda} {compra.igv.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
                <span className="text-slate-900">Total:</span>
                <span className="text-slate-900">
                  {compra.moneda} {compra.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón cerrar */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
