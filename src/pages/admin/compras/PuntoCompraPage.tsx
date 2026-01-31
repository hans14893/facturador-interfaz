import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { buscarFormatos, type FormatoBusquedaResponse } from "../../../api/formatosApi";
import { entidadesComercialesApi, type EntidadComercial } from "../../../api/entidadesComercialesApi";
import { comprasApi, type CreateCompraDTO } from "../../../api/comprasApi";
import { getAuth } from "../../../auth/authStore";
import { getMyEmpresa } from "../../../api/adminEmpresasApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import { handleApiError } from "../../../api/errorHelper";
import ConfirmModal from "../../../components/ConfirmModal";

interface ItemCompra {
  id: string;
  productoId: number;
  productoDescripcion: string;
  productoCodigo?: string | null;
  formatoId?: number;
  formatoAbreviatura?: string;
  formatoFactor?: number;
  tipoAfectacionIgv?: string;  // "10" = Gravado, "20" = Exonerado, "30" = Inafecto
  esBonificacion?: boolean;     // Producto bonificado (sin costo)
  cantidad: number;
  precioUnitario: number;       // Precio de compra
  precioVenta: number;          // Precio de venta del formato
  subtotal: number;
}

export default function PuntoCompraPage() {
  const [formatosEncontrados, setFormatosEncontrados] = useState<FormatoBusquedaResponse[]>([]);
  const [proveedores, setProveedores] = useState<EntidadComercial[]>([]);
  const [itemsCompra, setItemsCompra] = useState<ItemCompra[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<EntidadComercial | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const [searchProducto, setSearchProducto] = useState("");
  const [searchProveedor, setSearchProveedor] = useState("");
  const [showProductos, setShowProductos] = useState(false);
  const [showProveedores, setShowProveedores] = useState(false);
  const [selectedProductoIndex, setSelectedProductoIndex] = useState(0);
  const [selectedProveedorIndex, setSelectedProveedorIndex] = useState(0);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);

  const [showCantidadModal, setShowCantidadModal] = useState(false);
  const [editCantidad, setEditCantidad] = useState("");

  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [editPrecio, setEditPrecio] = useState("");
  
  const [showPrecioVentaModal, setShowPrecioVentaModal] = useState(false);
  const [editPrecioVenta, setEditPrecioVenta] = useState("");

  const [showLimpiarModal, setShowLimpiarModal] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number>(-1);

  // Datos de la compra
  const [tipoComprobante, setTipoComprobante] = useState("00");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split("T")[0]);
  const [observaciones, setObservaciones] = useState("");

  const [registrando, setRegistrando] = useState(false);

  const inputProductoRef = useRef<HTMLInputElement>(null);
  const inputProveedorRef = useRef<HTMLInputElement>(null);
  const carritoScrollRef = useRef<HTMLDivElement>(null);

  const auth = getAuth();
  const empresaId = auth?.empresaId;

  // ========= CALLBACKS (definidos antes de los useEffect) =========

  const loadEmpresa = useCallback(async () => {
    try {
      const data = await getMyEmpresa();
      setEmpresa(data);
    } catch (e) {
      console.error("Error cargando empresa", e);
    }
  }, []);

  const loadProveedores = useCallback(async () => {
    if (!empresaId) return;
    try {
      const res = await entidadesComercialesApi.getAll(empresaId, { rol: "PROVEEDOR", limit: 500 });
      setProveedores(res.content.filter(e => e.activo));
    } catch (e) {
      console.error("Error cargando proveedores", e);
    }
  }, [empresaId]);

  const agregarFormato = useCallback((formato: FormatoBusquedaResponse) => {
    const precioCompra = formato.formato?.precioCompra || 0;
    const precioVenta = formato.precioBase || formato.precioUnitario || 0;
    const nuevoItem: ItemCompra = {
      id: `${Date.now()}-${Math.random()}`,
      productoId: formato.productoId,
      productoDescripcion: formato.productoDescripcion,
      productoCodigo: formato.productoCodigo,
      formatoId: formato.formatoId,
      formatoAbreviatura: formato.abreviatura,
      formatoFactor: formato.factorBase,
      tipoAfectacionIgv: formato.tipoAfectacionIgv,
      esBonificacion: false,
      cantidad: 1,
      precioUnitario: precioCompra,
      precioVenta: precioVenta,
      subtotal: precioCompra,
    };

    setItemsCompra((prev) => {
      setSelectedItemIndex(prev.length);
      return [...prev, nuevoItem];
    });
    setSearchProducto("");
    setShowProductos(false);
    inputProductoRef.current?.focus();
  }, []);

  const handleRegistrar = useCallback(async () => {
    if (!empresaId) return;

    if (!proveedorSeleccionado) {
      setError("Debe seleccionar un proveedor");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (itemsCompra.length === 0) {
      setError("Debe agregar al menos un producto");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setRegistrando(true);
    try {
      const compra: CreateCompraDTO = {
        entidadComercialId: proveedorSeleccionado.id,
        numeroComprobante: numeroComprobante || `COMP-${Date.now()}`,
        tipoComprobante: tipoComprobante,
        fecha: fechaCompra,
        moneda: "PEN",
        observaciones: observaciones || undefined,
        detalles: itemsCompra.map((item) => ({
          productoId: item.productoId,
          formatoId: item.formatoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          precioVenta: item.precioVenta,
          esBonificacion: item.esBonificacion || false,
        })),
      };

      const result = await comprasApi.create(empresaId, compra);

      // Marcar como recibido automáticamente
      await comprasApi.update(empresaId, result.id, { estado: "RECIBIDO" });
      // El stock se actualiza automáticamente en el backend si "usarStock" está activado
      setSuccess(empresa?.usarStock 
        ? "Compra registrada y stock actualizado" 
        : "Compra registrada");

      setItemsCompra([]);
      setProveedorSeleccionado(null);
      setSelectedItemIndex(-1);
      setNumeroComprobante("");
      setObservaciones("");
      setTipoComprobante("00");
      setFechaCompra(new Date().toISOString().split("T")[0]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      handleApiError(e, "Error al registrar compra");
    } finally {
      setRegistrando(false);
    }
  }, [empresaId, proveedorSeleccionado, itemsCompra, empresa]);

  // ========= EFFECTS =========

  // Cargar datos iniciales
  useEffect(() => {
    if (empresaId) {
      loadEmpresa();
      loadProveedores();
    }
  }, [empresaId, loadEmpresa, loadProveedores]);

  // Auto-focus en producto
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (showCantidadModal || showPrecioModal || showPrecioVentaModal || showEliminarModal || showLimpiarModal) return;

      const activeElement = document.activeElement;
      if (
        activeElement !== inputProductoRef.current &&
        activeElement !== inputProveedorRef.current &&
        activeElement?.tagName !== "INPUT" &&
        activeElement?.tagName !== "TEXTAREA" &&
        activeElement?.tagName !== "SELECT"
      ) {
        inputProductoRef.current?.focus();
      }
    }, 500);

    return () => clearInterval(focusInterval);
  }, [showCantidadModal, showPrecioModal, showPrecioVentaModal, showEliminarModal, showLimpiarModal]);

  // Búsqueda de productos
  useEffect(() => {
    let cancelled = false;
    const q = searchProducto.trim();
    if (q.length > 1) {
      setShowProductos(true);
      setSelectedProductoIndex(0);

      const t = setTimeout(async () => {
        try {
          const data = await buscarFormatos(q, 10);
          if (!cancelled) setFormatosEncontrados(data);
        } catch (e) {
          console.error("Error buscando formatos", e);
          if (!cancelled) setFormatosEncontrados([]);
        }
      }, 200);

      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    setFormatosEncontrados([]);
    setShowProductos(false);
  }, [searchProducto]);

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = useMemo(() => {
    if (!searchProveedor.trim()) return [];
    const q = searchProveedor.toLowerCase();
    return proveedores.filter(
      (p) =>
        p.razonSocial.toLowerCase().includes(q) ||
        p.numeroDocumento.includes(q) ||
        (p.nombreComercial || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [proveedores, searchProveedor]);

  useEffect(() => {
    if (searchProveedor.length > 1 && proveedoresFiltrados.length > 0) {
      setShowProveedores(true);
      setSelectedProveedorIndex(0);
    } else {
      setShowProveedores(false);
    }
  }, [searchProveedor, proveedoresFiltrados]);

  // Scroll al item seleccionado
  useEffect(() => {
    if (selectedItemIndex < 0) return;
    const container = carritoScrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const row = container.querySelector<HTMLTableRowElement>(
        `tr[data-item-index="${selectedItemIndex}"]`
      );
      row?.scrollIntoView({ block: "nearest" });
    });
  }, [selectedItemIndex, itemsCompra.length]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCantidadModal || showPrecioModal || showPrecioVentaModal || showEliminarModal || showLimpiarModal) return;

      // F5 - Desactivar recarga
      if (e.key === "F5") {
        e.preventDefault();
        return;
      }

      // F3 - Ir a búsqueda de proveedores
      if (e.key === "F3") {
        e.preventDefault();
        inputProveedorRef.current?.focus();
        return;
      }

      // F12 - Registrar compra
      if (e.key === "F12") {
        e.preventDefault();
        handleRegistrar();
        return;
      }

      // Escape - Limpiar búsqueda
      if (e.key === "Escape" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        setSearchProducto("");
        setShowProductos(false);
        return;
      }

      // Enter en productos
      if (e.key === "Enter" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        if (showProductos && formatosEncontrados.length > 0) {
          agregarFormato(formatosEncontrados[selectedProductoIndex]);
        }
        return;
      }

      // Enter en proveedores
      if (e.key === "Enter" && document.activeElement === inputProveedorRef.current) {
        e.preventDefault();
        if (showProveedores && proveedoresFiltrados.length > 0) {
          setProveedorSeleccionado(proveedoresFiltrados[selectedProveedorIndex]);
          setSearchProveedor("");
          setShowProveedores(false);
          inputProductoRef.current?.focus();
        }
        return;
      }

      // Navegación en dropdown de proveedores
      if (showProveedores && proveedoresFiltrados.length > 0 && document.activeElement === inputProveedorRef.current) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedProveedorIndex((prev) => (prev < proveedoresFiltrados.length - 1 ? prev + 1 : 0));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedProveedorIndex((prev) => (prev > 0 ? prev - 1 : proveedoresFiltrados.length - 1));
          return;
        }
      }

      // Navegación en dropdown de productos
      if (showProductos && formatosEncontrados.length > 0 && document.activeElement === inputProductoRef.current) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedProductoIndex((prev) => (prev < formatosEncontrados.length - 1 ? prev + 1 : 0));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedProductoIndex((prev) => (prev > 0 ? prev - 1 : formatosEncontrados.length - 1));
          return;
        }
      }

      // Navegación en tabla de items
      if (!showProductos && !showProveedores && itemsCompra.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedItemIndex((prev) => (prev < itemsCompra.length - 1 ? prev + 1 : 0));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedItemIndex((prev) => (prev > 0 ? prev - 1 : itemsCompra.length - 1));
          return;
        }
        // Ctrl+D - Eliminar item
        if (e.ctrlKey && (e.key === "d" || e.key === "D") && selectedItemIndex >= 0) {
          e.preventDefault();
          setItemToDelete(selectedItemIndex);
          setShowEliminarModal(true);
          return;
        }
      }

      // * - Editar cantidad (funciona desde el input de producto)
      if (e.key === "*" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        const idx = selectedItemIndex >= 0 ? selectedItemIndex : itemsCompra.length - 1;
        if (idx >= 0) {
          const item = itemsCompra[idx];
          setSelectedItemIndex(idx);
          setEditCantidad(item.cantidad.toString());
          setShowCantidadModal(true);
        }
        return;
      }

      // / - Editar precio (funciona desde el input de producto)
      if (e.key === "/" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        const idx = selectedItemIndex >= 0 ? selectedItemIndex : itemsCompra.length - 1;
        if (idx >= 0) {
          const item = itemsCompra[idx];
          setSelectedItemIndex(idx);
          setEditPrecio(item.precioUnitario.toString());
          setShowPrecioModal(true);
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    showProductos,
    showProveedores,
    formatosEncontrados,
    proveedoresFiltrados,
    selectedProductoIndex,
    selectedProveedorIndex,
    selectedItemIndex,
    itemsCompra,
    showCantidadModal,
    showPrecioModal,
    showPrecioVentaModal,
    showEliminarModal,
    showLimpiarModal,
    agregarFormato,
    handleRegistrar,
  ]);

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) return;
    setItemsCompra((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, cantidad, subtotal: cantidad * item.precioUnitario }
          : item
      )
    );
  };

  const actualizarPrecio = (index: number, precio: number) => {
    if (precio < 0) return;
    setItemsCompra((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, precioUnitario: precio, subtotal: item.cantidad * precio, esBonificacion: precio === 0 }
          : item
      )
    );
  };

  const actualizarPrecioVenta = (index: number, precio: number) => {
    if (precio < 0) return;
    setItemsCompra((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, precioVenta: precio }
          : item
      )
    );
  };

  const toggleBonificacion = (index: number) => {
    setItemsCompra((prev) =>
      prev.map((item, i) =>
        i === index
          ? { 
              ...item, 
              esBonificacion: !item.esBonificacion,
              precioUnitario: item.esBonificacion ? (item.precioUnitario || 0) : 0,
              subtotal: item.esBonificacion ? item.cantidad * (item.precioUnitario || 0) : 0
            }
          : item
      )
    );
  };

  const eliminarItem = (index: number) => {
    setItemsCompra((prev) => prev.filter((_, i) => i !== index));
    if (selectedItemIndex >= itemsCompra.length - 1) {
      setSelectedItemIndex(itemsCompra.length - 2);
    }
  };

  const limpiarCarrito = () => {
    setItemsCompra([]);
    setSelectedItemIndex(-1);
    setShowLimpiarModal(false);
  };

  // Calcular totales
  const totales = useMemo(() => {
    // Separar subtotal gravado y exonerado
    // Solo contar subtotales de items que no son bonificación
    const itemsConPrecio = itemsCompra.filter(item => !item.esBonificacion);
    const itemsBonificados = itemsCompra.filter(item => item.esBonificacion);
    
    const subtotalGravado = itemsConPrecio
      .filter(item => item.tipoAfectacionIgv === "10")
      .reduce((sum, item) => sum + item.subtotal, 0);
    const subtotalExonerado = itemsConPrecio
      .filter(item => item.tipoAfectacionIgv !== "10")
      .reduce((sum, item) => sum + item.subtotal, 0);
    
    const subtotal = subtotalGravado + subtotalExonerado;
    const igvPorcentaje = empresa?.igvPorcentaje || 18;
    const igv = subtotalGravado * (igvPorcentaje / 100);
    const total = subtotal + igv;
    return { 
      subtotal, 
      subtotalGravado, 
      subtotalExonerado, 
      igv, 
      total, 
      cantidadItems: itemsCompra.length,
      cantidadBonificados: itemsBonificados.length
    };
  }, [itemsCompra, empresa]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100">
      {/* Panel izquierdo - Búsqueda y carrito */}
      <div className="flex flex-1 flex-col p-3 gap-3">
        {/* Header con proveedor */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex items-center gap-4">
            {/* Proveedor */}
            <div className="flex-1 relative">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Proveedor (F3) *
              </label>
              {proveedorSeleccionado ? (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-800">
                      {proveedorSeleccionado.razonSocial}
                    </p>
                    <p className="text-xs text-slate-500">
                      {proveedorSeleccionado.tipoDocumento}: {proveedorSeleccionado.numeroDocumento}
                    </p>
                  </div>
                  <button
                    onClick={() => setProveedorSeleccionado(null)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={inputProveedorRef}
                    type="text"
                    value={searchProveedor}
                    onChange={(e) => setSearchProveedor(e.target.value)}
                    placeholder="Buscar proveedor por RUC o nombre..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {showProveedores && proveedoresFiltrados.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {proveedoresFiltrados.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setProveedorSeleccionado(p);
                            setSearchProveedor("");
                            setShowProveedores(false);
                            inputProductoRef.current?.focus();
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${
                            idx === selectedProveedorIndex ? "bg-blue-50" : ""
                          }`}
                        >
                          <p className="font-medium">{p.razonSocial}</p>
                          <p className="text-xs text-slate-500">{p.tipoDocumento}: {p.numeroDocumento}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>


          </div>
          
          {/* Fila de datos del comprobante */}
          <div className="flex items-end gap-4 mt-3 pt-3 border-t border-slate-200">
            {/* Tipo de comprobante */}
            <div className="w-44">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Tipo Comprobante
              </label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="00">Sin comprobante</option>
                <option value="01">Factura</option>
                <option value="03">Boleta</option>
                <option value="07">Nota de crédito</option>
                <option value="08">Nota de débito</option>
                <option value="09">Guía de remisión</option>
                <option value="99">Otros</option>
              </select>
            </div>
            
            {/* Número de comprobante */}
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Nº Comprobante
              </label>
              <input
                type="text"
                value={numeroComprobante}
                onChange={(e) => setNumeroComprobante(e.target.value.toUpperCase())}
                placeholder="F001-00001234"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
              />
            </div>
            
            {/* Fecha */}
            <div className="w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {/* Observaciones */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales de la compra..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Búsqueda de productos */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="relative">
            <input
              ref={inputProductoRef}
              type="text"
              value={searchProducto}
              onChange={(e) => setSearchProducto(e.target.value)}
              placeholder="Buscar producto por código, descripción o código de barras..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {showProductos && formatosEncontrados.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-auto">
                {formatosEncontrados.map((f, idx) => (
                  <button
                    key={`${f.productoId}-${f.formatoId || "base"}`}
                    onClick={() => agregarFormato(f)}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-100 border-b border-slate-100 last:border-0 ${
                      idx === selectedProductoIndex ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{f.productoDescripcion}</p>
                        <p className="text-xs text-slate-500">
                          {f.productoCodigo && `${f.productoCodigo} • `}
                          {f.abreviatura} {f.factorBase > 1 && `(x${f.factorBase})`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 text-sm">
                          S/ {(f.formato?.precioCompra || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500">P.Compra</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Tabla de items */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 text-sm">
              Items de Compra ({totales.cantidadItems})
            </h3>
            {itemsCompra.length > 0 && (
              <button
                onClick={() => setShowLimpiarModal(true)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Limpiar todo
              </button>
            )}
          </div>
          <div ref={carritoScrollRef} className="flex-1 overflow-auto">
            {itemsCompra.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p>Busca productos para agregar</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Producto</th>
                    <th className="text-center px-2 py-2 font-medium text-slate-600 w-16">IGV</th>
                    <th className="text-center px-2 py-2 font-medium text-slate-600 w-16">Cant.</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">P.Compra</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">P.Venta</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">Subtotal</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemsCompra.map((item, idx) => (
                    <tr
                      key={item.id}
                      data-item-index={idx}
                      className={`border-b border-slate-100 cursor-pointer ${
                        idx === selectedItemIndex ? "bg-blue-50" : "hover:bg-slate-50"
                      } ${item.esBonificacion ? "bg-purple-50" : ""}`}
                      onClick={() => setSelectedItemIndex(idx)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-slate-800">
                              {item.productoDescripcion}
                              {item.esBonificacion && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-purple-500 text-white rounded">
                                  BONIF
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.productoCodigo && `${item.productoCodigo} • `}
                              {item.formatoAbreviatura}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                          item.tipoAfectacionIgv === "10" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.tipoAfectacionIgv === "10" ? "GRAV" : "EXON"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemIndex(idx);
                            setEditCantidad(item.cantidad.toString());
                            setShowCantidadModal(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-medium min-w-[50px]"
                        >
                          {item.cantidad}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {item.esBonificacion ? (
                          <span className="text-purple-600 font-medium">GRATIS</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemIndex(idx);
                              setEditPrecio(item.precioUnitario.toString());
                              setShowPrecioModal(true);
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded font-medium transition"
                          >
                            S/ {item.precioUnitario.toFixed(4)}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemIndex(idx);
                            setEditPrecioVenta(item.precioVenta.toString());
                            setShowPrecioVentaModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded font-medium transition"
                        >
                          S/ {item.precioVenta.toFixed(4)}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-slate-800">
                        {item.esBonificacion ? (
                          <span className="text-purple-600">S/ 0.00</span>
                        ) : (
                          `S/ ${item.subtotal.toFixed(2)}`
                        )}
                      </td>
                      <td className="pr-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBonificacion(idx);
                            }}
                            title={item.esBonificacion ? "Quitar bonificación" : "Marcar como bonificación"}
                            className={`p-1.5 rounded ${
                              item.esBonificacion 
                                ? "text-purple-600 bg-purple-100 hover:bg-purple-200" 
                                : "text-slate-400 hover:text-purple-500 hover:bg-purple-50"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(idx);
                              setShowEliminarModal(true);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
                            title="Eliminar item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Panel derecho - Totales */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Resumen de Compra</h2>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            {totales.subtotalGravado > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Gravado:</span>
                <span className="font-medium">S/ {totales.subtotalGravado.toFixed(2)}</span>
              </div>
            )}
            {totales.subtotalExonerado > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Exonerado:</span>
                <span className="font-medium">S/ {totales.subtotalExonerado.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">S/ {totales.subtotal.toFixed(2)}</span>
            </div>
            {totales.igv > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IGV ({empresa?.igvPorcentaje || 18}%):</span>
                <span className="font-medium">S/ {totales.igv.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between">
              <span className="text-lg font-bold text-slate-800">TOTAL:</span>
              <span className="text-2xl font-bold text-blue-600">
                S/ {totales.total.toFixed(2)}
              </span>
            </div>
            {totales.cantidadBonificados > 0 && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 text-purple-700 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <span className="font-medium">
                    {totales.cantidadBonificados} {totales.cantidadBonificados === 1 ? 'producto' : 'productos'} bonificado{totales.cantidadBonificados === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Atajos de teclado */}
          <div className="text-xs text-slate-500 space-y-1 border-t border-slate-200 pt-3">
            <p><kbd className="bg-slate-100 px-1 rounded">↑↓</kbd> Navegar</p>
            <p><kbd className="bg-slate-100 px-1 rounded">*</kbd> Editar cantidad</p>
            <p><kbd className="bg-slate-100 px-1 rounded">/</kbd> Editar precio</p>
            <p><kbd className="bg-slate-100 px-1 rounded">Ctrl+D</kbd> Eliminar item</p>
            <p><kbd className="bg-slate-100 px-1 rounded">F3</kbd> Buscar proveedor</p>
            <p><kbd className="bg-slate-100 px-1 rounded">F12</kbd> Registrar</p>
          </div>

          {/* Botón registrar */}
          <button
            onClick={handleRegistrar}
            disabled={registrando || itemsCompra.length === 0 || !proveedorSeleccionado}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg text-lg transition-colors"
          >
            {registrando ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Registrando...
              </span>
            ) : (
              <>Registrar Compra (F12)</>
            )}
          </button>
        </div>
      </div>

      {/* Modal editar cantidad */}
      {showCantidadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-72 shadow-xl">
            <h3 className="font-bold mb-3">Editar Cantidad</h3>
            <input
              type="number"
              value={editCantidad}
              onChange={(e) => setEditCantidad(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-lg text-center focus:border-blue-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const cant = parseFloat(editCantidad);
                  if (cant > 0) {
                    actualizarCantidad(selectedItemIndex, cant);
                  }
                  setShowCantidadModal(false);
                }
                if (e.key === "Escape") setShowCantidadModal(false);
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowCantidadModal(false)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const cant = parseFloat(editCantidad);
                  if (cant > 0) {
                    actualizarCantidad(selectedItemIndex, cant);
                  }
                  setShowCantidadModal(false);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar precio */}
      {showPrecioModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-72 shadow-xl">
            <h3 className="font-bold mb-3">Editar Precio</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-600">S/</span>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={editPrecio}
                onChange={(e) => {
                  const value = e.target.value;
                  const parts = value.split('.');
                  if (parts.length === 2 && parts[1].length > 6) {
                    return;
                  }
                  setEditPrecio(value);
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-lg text-right focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const precio = parseFloat(editPrecio);
                    if (precio >= 0) {
                      actualizarPrecio(selectedItemIndex, precio);
                    }
                    setShowPrecioModal(false);
                  }
                  if (e.key === "Escape") setShowPrecioModal(false);
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">Hasta 6 decimales</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowPrecioModal(false)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const precio = parseFloat(editPrecio);
                  if (precio >= 0) {
                    actualizarPrecio(selectedItemIndex, precio);
                  }
                  setShowPrecioModal(false);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar precio de venta */}
      {showPrecioVentaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-72 shadow-xl">
            <h3 className="font-bold mb-3 text-blue-700">Editar Precio de Venta</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-600">S/</span>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={editPrecioVenta}
                onChange={(e) => {
                  const value = e.target.value;
                  const parts = value.split('.');
                  if (parts.length === 2 && parts[1].length > 6) {
                    return;
                  }
                  setEditPrecioVenta(value);
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-lg text-right focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const precio = parseFloat(editPrecioVenta);
                    if (precio >= 0) {
                      actualizarPrecioVenta(selectedItemIndex, precio);
                    }
                    setShowPrecioVentaModal(false);
                  }
                  if (e.key === "Escape") setShowPrecioVentaModal(false);
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">Hasta 6 decimales</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowPrecioVentaModal(false)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const precio = parseFloat(editPrecioVenta);
                  if (precio >= 0) {
                    actualizarPrecioVenta(selectedItemIndex, precio);
                  }
                  setShowPrecioVentaModal(false);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      <ConfirmModal
        isOpen={showEliminarModal}
        title="Eliminar Item"
        message={`¿Eliminar "${itemsCompra[itemToDelete]?.productoDescripcion || ""}" del carrito?`}
        onConfirm={() => {
          eliminarItem(itemToDelete);
          setShowEliminarModal(false);
        }}
        onClose={() => setShowEliminarModal(false)}
      />

      {/* Modal confirmar limpiar */}
      <ConfirmModal
        isOpen={showLimpiarModal}
        title="Limpiar Carrito"
        message="¿Está seguro de eliminar todos los items?"
        onConfirm={limpiarCarrito}
        onClose={() => setShowLimpiarModal(false)}
      />
    </div>
  );
}
