import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { entidadesComercialesApi, type EntidadComercial } from "../../../api/entidadesComercialesApi";
import { productosApi, type Producto } from "../../../api/productosApi";
import { comprasApi, type CreateCompraDTO } from "../../../api/comprasApi";
import { getAuth } from "../../../auth/authStore";
import { handleApiError } from "../../../api/errorHelper";

interface NuevaCompraModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemCompra {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default function NuevaCompraModal({ open, onClose, onSuccess }: NuevaCompraModalProps) {
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState<EntidadComercial[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  
  const [formData, setFormData] = useState({
    entidadComercialId: "",
    numeroComprobante: "",
    tipoComprobante: "01", // Factura por defecto
    fecha: new Date().toISOString().split("T")[0],
    moneda: "PEN",
    observaciones: "",
  });

  const [items, setItems] = useState<ItemCompra[]>([]);
  const [itemActual, setItemActual] = useState({
    productoId: "",
    cantidad: "",
    precioUnitario: "",
  });

  const auth = getAuth();
  const empresaId = auth?.empresaId;

  useEffect(() => {
    if (open && empresaId) {
      loadData();
    }
  }, [open, empresaId]);

  useEffect(() => {
    // Filtrar productos que ya están en los items
    const idsUsados = items.map((i) => i.productoId);
    setProductosDisponibles(productos.filter((p) => !idsUsados.includes(p.id)));
  }, [items, productos]);

  const loadData = async () => {
    if (!empresaId) return;

    try {
      const [provRes, prodRes] = await Promise.all([
        entidadesComercialesApi.getAll(empresaId, { rol: "PROVEEDOR", limit: 500 }),
        productosApi.getActivos(empresaId),
      ]);
      setProveedores(provRes.content.filter(e => e.activo));
      setProductos(prodRes);
      setProductosDisponibles(prodRes);
    } catch (error) {
      handleApiError(error, "Error al cargar datos");
    }
  };

  const agregarItem = () => {
    const productoId = Number(itemActual.productoId);
    const cantidad = Number(itemActual.cantidad);
    const precioUnitario = Number(itemActual.precioUnitario);

    if (!productoId || cantidad <= 0 || precioUnitario <= 0) {
      alert("Complete todos los campos del producto");
      return;
    }

    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;

    const subtotal = cantidad * precioUnitario;

    setItems([
      ...items,
      {
        productoId,
        productoNombre: producto.descripcion,
        cantidad,
        precioUnitario,
        subtotal,
      },
    ]);

    setItemActual({ productoId: "", cantidad: "", precioUnitario: "" });
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return { subtotal, igv, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    if (items.length === 0) {
      alert("Debe agregar al menos un producto");
      return;
    }

    if (!formData.entidadComercialId) {
      alert("Debe seleccionar un proveedor");
      return;
    }

    setLoading(true);
    try {
      const compra: CreateCompraDTO = {
        entidadComercialId: Number(formData.entidadComercialId),
        numeroComprobante: formData.numeroComprobante,
        tipoComprobante: formData.tipoComprobante,
        fecha: formData.fecha,
        moneda: formData.moneda,
        observaciones: formData.observaciones || undefined,
        detalles: items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        })),
      };

      await comprasApi.create(empresaId, compra);
      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      handleApiError(error, "Error al crear compra");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entidadComercialId: "",
      numeroComprobante: "",
      tipoComprobante: "01",
      fecha: new Date().toISOString().split("T")[0],
      moneda: "PEN",
      observaciones: "",
    });
    setItems([]);
    setItemActual({ productoId: "", cantidad: "", precioUnitario: "" });
  };

  const handleClose = () => {
    if (items.length > 0) {
      if (confirm("¿Desea cancelar? Se perderán los datos ingresados")) {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  const { subtotal, igv, total } = calcularTotales();

  return (
    <Modal isOpen={open} onClose={handleClose} title="Nueva Compra">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos del comprobante */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Proveedor *
            </label>
            <select
              value={formData.entidadComercialId}
              onChange={(e) => setFormData({ ...formData, entidadComercialId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              required
            >
              <option value="">Seleccione...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razonSocial} - {p.numeroDocumento}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo Comprobante *
            </label>
            <select
              value={formData.tipoComprobante}
              onChange={(e) => setFormData({ ...formData, tipoComprobante: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              required
            >
              <option value="01">Factura</option>
              <option value="03">Boleta</option>
              <option value="00">Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número Comprobante *
            </label>
            <input
              type="text"
              value={formData.numeroComprobante}
              onChange={(e) => setFormData({ ...formData, numeroComprobante: e.target.value })}
              placeholder="Ej: F001-00001234"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Moneda *
            </label>
            <select
              value={formData.moneda}
              onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>
        </div>

        {/* Agregar productos */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Productos</h3>
          
          <div className="grid grid-cols-12 gap-2 mb-3">
            <div className="col-span-5">
              <select
                value={itemActual.productoId}
                onChange={(e) => setItemActual({ ...itemActual, productoId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">Seleccione producto...</option>
                {productosDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <input
                type="number"
                value={itemActual.cantidad}
                onChange={(e) => setItemActual({ ...itemActual, cantidad: e.target.value })}
                placeholder="Cant."
                min="0.01"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="col-span-3">
              <input
                type="number"
                value={itemActual.precioUnitario}
                onChange={(e) => setItemActual({ ...itemActual, precioUnitario: e.target.value })}
                placeholder="Precio Unit."
                min="0.01"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <button
                type="button"
                onClick={agregarItem}
                className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Lista de items */}
          {items.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Producto</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Cant.</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">P. Unit.</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Subtotal</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-700">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-900">{item.productoNombre}</td>
                      <td className="px-3 py-2 text-right text-slate-900">{item.cantidad}</td>
                      <td className="px-3 py-2 text-right text-slate-900">
                        {formData.moneda} {item.precioUnitario.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        {formData.moneda} {item.subtotal.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarItem(index)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totales */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">
                  {formData.moneda} {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGV (18%):</span>
                <span className="font-medium text-slate-900">
                  {formData.moneda} {igv.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
                <span className="text-slate-900">Total:</span>
                <span className="text-slate-900">
                  {formData.moneda} {total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Observaciones adicionales..."
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={loading || items.length === 0}
          >
            {loading ? "Guardando..." : "Guardar Compra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
