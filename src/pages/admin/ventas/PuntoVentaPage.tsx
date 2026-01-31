import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listProductos } from "../../../api/productosApi";
import type { Producto } from "../../../api/productosApi";
import { buscarFormatoPorCodigoBarra, buscarFormatos, type FormatoBusquedaResponse } from "../../../api/formatosApi";
import { clientesApi } from "../../../api/clientesApi";
import type { Cliente } from "../../../api/clientesApi";
import { getAuth } from "../../../auth/authStore";
import { getConfiguracion } from "../../../api/configuracionApi";
import { getSesionActiva } from "../../../api/cajaApi";
import { getMyEmpresa } from "../../../api/adminEmpresasApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import ConfirmModal from "../../../components/ConfirmModal";
import Modal from "../../../components/Modal";
import { emitirComprobante, registrarVentaInterna, listarComprobantes, type CpeRequest, type Comprobante, type ComprobanteConDetalle } from "../../../api/comprobantesApi";
import ElegirCajaPage from "./ElegirCajaPage";
import DetalleVentaModal from "./DetalleVentaModal";
import ProductoFormModal from "./ProductoFormModal";
import EntidadComercialFormModal from "./EntidadComercialFormModal";
import type { CajaSesion } from "../../../types/caja";

interface ItemVenta {
  id: string;
  producto: Producto;
  formatoId?: number;
  formatoAbreviatura?: string;
  formatoCodigoSunat?: string;
  formatoFactorBase?: number;
  formatoEscalas?: Array<{ cantidadMinima: number; cantidadMaxima?: number; precioUnitario: number; activo?: boolean }>;
  formatoPrecioBase?: number | null;
  formatoPrecioCompra?: number | null;  // Para detectar venta bajo costo
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descripcionPersonalizada?: string;
}

interface ClienteEventual {
  tipoDoc: string;
  nroDoc: string;
  nombre: string;
  direccion?: string;
}

export default function PuntoVentaPage() {
  const navigate = useNavigate();
  const [todosProductos, setTodosProductos] = useState<Producto[]>([]);
  const [formatosEncontrados, setFormatosEncontrados] = useState<FormatoBusquedaResponse[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteGenerico, setClienteGenerico] = useState<Cliente | null>(null);
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clienteEventual, setClienteEventual] = useState<ClienteEventual | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const [cajaSesionActiva, setCajaSesionActiva] = useState<CajaSesion | null>(null);
  const [cajaLoading, setCajaLoading] = useState(true);
  
  const [searchProducto, setSearchProducto] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [showProductos, setShowProductos] = useState(false);
  const [showClientes, setShowClientes] = useState(false);
  const [selectedProductoIndex, setSelectedProductoIndex] = useState(0);
  const [selectedClienteIndex, setSelectedClienteIndex] = useState(0);
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  
  const [agruparItemsRepetidos, setAgruparItemsRepetidos] = useState(true);
  const [permitirCambiarPrecio, setPermitirCambiarPrecio] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemVenta | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editDescripcion, setEditDescripcion] = useState("");
  
  const [showCantidadModal, setShowCantidadModal] = useState(false);
  const [editCantidad, setEditCantidad] = useState("");
  
  const [showLimpiarModal, setShowLimpiarModal] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number>(-1);
  const [showTipoComprobanteModal, setShowTipoComprobanteModal] = useState(false);
  
  const [showPrecioModal, setShowPrecioModal] = useState(false);
  const [editPrecio, setEditPrecio] = useState("");
  
  const [emitiendo, setEmitiendo] = useState(false);
  const [tipoPagoSeleccionado, setTipoPagoSeleccionado] = useState<string>("EFECTIVO");
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  
  const [consultaDoc, setConsultaDoc] = useState("");
  const [consultaNombre, setConsultaNombre] = useState("");
  const [consultaDireccion, setConsultaDireccion] = useState("");
  const [consultando, setConsultando] = useState(false);
  
  const [showTraerVentasModal, setShowTraerVentasModal] = useState(false);
  const [ventasAnteriores, setVentasAnteriores] = useState<Comprobante[]>([]);
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<string>("TODAS");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>("");
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>("");
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [showDetalleVentaModal, setShowDetalleVentaModal] = useState(false);
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState<number | null>(null);
  
  // Estados para modales de creación rápida
  const [showCrearClienteModal, setShowCrearClienteModal] = useState(false);
  const [showCrearProductoModal, setShowCrearProductoModal] = useState(false);
  
  const inputProductoRef = useRef<HTMLInputElement>(null);
  const inputClienteRef = useRef<HTMLInputElement>(null);
  const carritoScrollRef = useRef<HTMLDivElement>(null);
  const auth = getAuth();
  const empresaId = auth?.empresaId;

  useEffect(() => {
    if (selectedItemIndex < 0) return;
    const container = carritoScrollRef.current;
    if (!container) return;

    // Esperar a que React pinte el <tr> correspondiente
    requestAnimationFrame(() => {
      const row = container.querySelector<HTMLTableRowElement>(
        `tr[data-item-index="${selectedItemIndex}"]`
      );
      row?.scrollIntoView({ block: "nearest" });
    });
  }, [selectedItemIndex, itemsVenta.length]);

  useEffect(() => {
    let cancelled = false;
    async function loadCajaActiva() {
      try {
        setCajaLoading(true);
        const sesion = await getSesionActiva();
        if (!cancelled) setCajaSesionActiva(sesion);
      } catch (e) {
        // Si falla por cualquier otro motivo, no bloqueamos ciegamente: mostramos un estado seguro.
        console.error("Error consultando sesión activa de caja", e);
        if (!cancelled) setCajaSesionActiva(null);
      } finally {
        if (!cancelled) setCajaLoading(false);
      }
    }

    if (empresaId) {
      loadCajaActiva();
    } else {
      setCajaSesionActiva(null);
      setCajaLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  // Función para seleccionar precio según escala
  function selectPrecioVenta(producto: Producto, cantidad: number): number {
    const escalas = (producto.escalasPrecio || []).filter((e) => e.activo !== false);
    if (escalas.length === 0) return producto.precioVenta || 0;

    const cantidadN = Number(cantidad);
    const eligible = escalas
      .filter((e) => {
        const min = Number(e.minCantidad);
        if (!Number.isFinite(min)) return false;
        if (cantidadN < min) return false;
        return true;
      })
      .sort((a, b) => Number(a.minCantidad) - Number(b.minCantidad));

    // Si la cantidad no cae en ninguna escala (p.ej. por debajo del mínimo), usamos precio base.
    if (eligible.length === 0) return Number(producto.precioVenta || 0);

    return Number(eligible[eligible.length - 1]?.precioVenta ?? producto.precioVenta ?? 0);
  }

  function selectPrecioFormato(item: Pick<ItemVenta, "formatoEscalas" | "formatoPrecioBase">, cantidad: number): number {
    const escalas = (item.formatoEscalas || []).filter((e) => e.activo !== false);
    const precioBase = Number(item.formatoPrecioBase ?? 0);
    if (escalas.length === 0) return precioBase;

    const cantidadN = Number(cantidad);
    const eligible = escalas
      .filter((e) => {
        const min = Number(e.cantidadMinima);
        const max = e.cantidadMaxima == null ? undefined : Number(e.cantidadMaxima);
        if (!Number.isFinite(min)) return false;
        if (cantidadN < min) return false;
        if (max != null && Number.isFinite(max) && cantidadN > max) return false;
        return true;
      })
      .sort((a, b) => Number(a.cantidadMinima) - Number(b.cantidadMinima));

    // Si la cantidad no cae en ninguna escala (p.ej. por debajo del mínimo), usamos precio base.
    if (eligible.length === 0) return precioBase;

    return Number(eligible[eligible.length - 1]?.precioUnitario ?? precioBase);
  }

  const formatosFiltrados = useMemo(() => {
    // El backend ya devuelve resultados limitados; este filtro es defensivo.
    const q = searchProducto.toLowerCase();
    return (formatosEncontrados || []).filter((r) => {
      return (
        (r.productoDescripcion || "").toLowerCase().includes(q) ||
        (r.productoCodigo || "").toLowerCase().includes(q) ||
        (r.codigoBarra || "").toLowerCase().includes(q) ||
        (r.abreviatura || "").toLowerCase().includes(q) ||
        (r.unidad || "").toLowerCase().includes(q)
      );
    });
  }, [formatosEncontrados, searchProducto]);

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

  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (
        showTraerVentasModal ||
        showDetalleVentaModal ||
        showTipoComprobanteModal ||
        showEditModal ||
        showCantidadModal ||
        showPrecioModal ||
        showEliminarModal ||
        showCrearClienteModal ||
        showCrearProductoModal
      ) {
        return;
      }

      const activeElement = document.activeElement;
      // No enfocar si estamos en el input de cliente o en algún input/textarea
      if (activeElement !== inputProductoRef.current &&
          activeElement !== inputClienteRef.current &&
          activeElement?.tagName !== 'INPUT' &&
          activeElement?.tagName !== 'TEXTAREA' &&
          activeElement?.tagName !== 'SELECT') {
        inputProductoRef.current?.focus();
      }
    }, 500);

    return () => clearInterval(focusInterval);
  }, [
    showTraerVentasModal,
    showDetalleVentaModal,
    showTipoComprobanteModal,
    showEditModal,
    showCantidadModal,
    showPrecioModal,
    showEliminarModal,
    showCrearClienteModal,
    showCrearProductoModal,
  ]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();

        // Si hay formatos filtrados y el dropdown está visible, agregar el seleccionado
        if (showProductos && formatosFiltrados.length > 0) {
          agregarFormato(formatosFiltrados[selectedProductoIndex]);
        } else {
          // Si no, buscar por código de barras (formato)
          buscarPorCodigoBarras(searchProducto.trim());
        }
      }
    };

    document.addEventListener("keypress", handleKeyPress);
    return () => document.removeEventListener("keypress", handleKeyPress);
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No manejar teclas si hay un modal abierto
      if (showTraerVentasModal || showDetalleVentaModal || showTipoComprobanteModal || showEditModal || showCantidadModal || showPrecioModal || showEliminarModal || showCrearClienteModal || showCrearProductoModal) {
        return;
      }

      // F5 - Desactivar recarga de página
      if (e.key === "F5") {
        e.preventDefault();
        return;
      }

      // F3 - Ir a búsqueda de clientes
      if (e.key === "F3") {
        e.preventDefault();
        inputClienteRef.current?.focus();
        return;
      }

      // Escape - Limpiar búsqueda de producto
      if (e.key === "Escape" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        setSearchProducto("");
        setShowProductos(false);
        return;
      }

      // Enter en búsqueda de clientes - seleccionar cliente resaltado
      if (e.key === "Enter" && document.activeElement === inputClienteRef.current) {
        e.preventDefault();
        if (showClientes && clientes.length > 0) {
          const cliente = clientes[selectedClienteIndex];
          setClienteSeleccionado(cliente);
          setSearchCliente("");
          setShowClientes(false);
          inputProductoRef.current?.focus();
        }
        return;
      }

      // Navegación con flechas en dropdown de clientes
      if (showClientes && clientes.length > 0 && document.activeElement === inputClienteRef.current) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedClienteIndex((prev) => 
            prev < clientes.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedClienteIndex((prev) => 
            prev > 0 ? prev - 1 : clientes.length - 1
          );
          return;
        }
      }

      // Navegación con flechas en dropdown de formatos
      if (showProductos && formatosFiltrados.length > 0 && document.activeElement === inputProductoRef.current) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedProductoIndex((prev) => 
            prev < formatosFiltrados.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedProductoIndex((prev) => 
            prev > 0 ? prev - 1 : formatosFiltrados.length - 1
          );
          return;
        }
      }

      // Navegación con flechas en la tabla de items de venta (cuando no hay dropdown visible)
      if (!showProductos && itemsVenta.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedItemIndex((prev) => 
            prev < itemsVenta.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedItemIndex((prev) => 
            prev > 0 ? prev - 1 : itemsVenta.length - 1
          );
          return;
        }
      }

      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        if (selectedItemIndex >= 0) {
          const item = itemsVenta[selectedItemIndex];
          setEditingItem(item);
          setEditingIndex(selectedItemIndex);
          setEditDescripcion(item.producto.descripcion);
          setShowEditModal(true);
        }
      }

      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        if (selectedItemIndex >= 0) {
          setItemToDelete(selectedItemIndex);
          setShowEliminarModal(true);
        }
      }

      if (e.key === "*" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        const idx = selectedItemIndex >= 0 ? selectedItemIndex : itemsVenta.length - 1;
        if (idx >= 0) {
          const item = itemsVenta[idx];
          setEditingItem(item);
          setEditingIndex(idx);
          setEditCantidad(item.cantidad.toString());
          setShowCantidadModal(true);
        }
      }

      if (e.key === "/" && document.activeElement === inputProductoRef.current) {
        e.preventDefault();
        
        if (!permitirCambiarPrecio) {
          alert("No está permitido cambiar precios según la configuración del sistema");
          inputProductoRef.current?.focus();
          return;
        }

        const idx = selectedItemIndex >= 0 ? selectedItemIndex : itemsVenta.length - 1;
        if (idx >= 0) {
          const item = itemsVenta[idx];
          setEditingItem(item);
          setEditingIndex(idx);
          setEditPrecio(item.precioUnitario.toFixed(4));
          setShowPrecioModal(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemIndex, itemsVenta, permitirCambiarPrecio, showProductos, formatosFiltrados, selectedProductoIndex, showClientes, clientes, selectedClienteIndex, showTraerVentasModal, showDetalleVentaModal, showTipoComprobanteModal, showEditModal, showCantidadModal, showPrecioModal, showEliminarModal]);

  const loadConfiguracion = useCallback(async () => {
    try {
      // Cargar configuración general
      const config = await getConfiguracion();
      setPermitirCambiarPrecio(config["POS_PERMITIR_CAMBIAR_PRECIO"] !== "false");
      
      // Cargar configuración de empresa
      const empresaData = await getMyEmpresa();
      setEmpresa(empresaData);
      
      // La configuración de agrupar items viene de la empresa
      setAgruparItemsRepetidos(empresaData.unificarItemsVenta !== false);
      
      console.log('Configuración cargada:', {
        usarStock: empresaData.usarStock,
        noVenderStockCero: empresaData.noVenderStockCero,
        unificarItemsVenta: empresaData.unificarItemsVenta
      });
    } catch (error) {
      console.error("Error al cargar configuración:", error);
    }
  }, []);

  const loadProductos = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      const data = await listProductos();
      console.log('Productos cargados con escalas:', data.map(p => ({ 
        id: p.id, 
        descripcion: p.descripcion, 
        escalas: p.escalasPrecio?.length || 0 
      })));
      setTodosProductos(data);
    } catch (error) {
      console.error("Error al cargar productos", error);
    }
  }, [empresaId]);

  const loadClientes = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      console.log('Buscando clientes con:', searchCliente);
      const data = await clientesApi.getAll({
        search: searchCliente,
        tipoEntidad: "CLIENTE",
        limit: 10,
      });
      console.log('Clientes encontrados:', data);
      setClientes(data);
      setShowClientes(true);
    } catch (error) {
      console.error("Error al cargar clientes", error);
    }
  }, [empresaId, searchCliente]);

  const loadClienteGenerico = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      // Buscar el cliente genérico "CLIENTES VARIOS"
      const data = await clientesApi.getAll({
        search: "CLIENTES VARIOS",
        tipoEntidad: "CLIENTE",
        limit: 1,
      });
      
      if (data.length > 0) {
        const generico = data[0];
        setClienteGenerico(generico);
        // Autoseleccionar el cliente genérico al iniciar
        setClienteSeleccionado(generico);
      }
    } catch (error) {
      console.error("Error al cargar cliente genérico", error);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) {
      loadProductos();
      loadConfiguracion();
      loadClienteGenerico();
    }
  }, [empresaId, loadProductos, loadConfiguracion, loadClienteGenerico]);

  useEffect(() => {
    if (empresaId && searchCliente.length > 2) {
      loadClientes();
      setSelectedClienteIndex(0);
    } else {
      setClientes([]);
      setShowClientes(false);
    }
  }, [empresaId, searchCliente, loadClientes]);

  const construirItemsDesdeDetalle = (detalle: ComprobanteConDetalle): ItemVenta[] => {
    return (detalle.items || []).map((item, index: number) => {
      const producto: Producto = {
        id: 0,
        codigo: item.codigo || '',
        descripcion: item.descripcion,
        precioVenta: item.precioUnitario,
        stock: 0,
        unidadMedida: {
          id: 0,
          codigo: String(item.unidad || 'NIU'),
          descripcion: "",
          activo: true,
        },
        tipoAfectacionIgv: String(item.afectacionIgv || '10'),
        empresaId: Number(empresaId || 0),
        activo: true,
        createdAt: new Date().toISOString(),
      };

      return {
        id: `temp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        producto,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.totalItem,
        descripcionPersonalizada: item.descripcion
      };
    });
  };

  const combinarItems = (actuales: ItemVenta[], nuevos: ItemVenta[]): ItemVenta[] => {
    if (!agruparItemsRepetidos) {
      return [...actuales, ...nuevos];
    }

    const acumulado = new Map<string, ItemVenta>();

    const addItem = (item: ItemVenta) => {
      const descripcion = item.descripcionPersonalizada || item.producto.descripcion || '';
      const codigo = item.producto.codigo || '';
      const precio = Number(item.precioUnitario);
      const key = `${codigo}||${descripcion}||${precio}`;

      const existente = acumulado.get(key);
      if (!existente) {
        acumulado.set(key, { ...item });
        return;
      }

      const nuevaCantidad = Number(existente.cantidad) + Number(item.cantidad);
      existente.cantidad = nuevaCantidad;
      existente.subtotal = nuevaCantidad * precio;
    };

    actuales.forEach(addItem);
    nuevos.forEach(addItem);

    return Array.from(acumulado.values());
  };

  const aplicarClienteDesdeDetalle = async (detalle: ComprobanteConDetalle) => {
    const nroDoc = String(detalle.receptorNroDoc || '').trim();
    const tipoDoc = String(detalle.receptorTipoDoc || '0').trim();
    const nombre = String(detalle.receptorNombre || '').trim();

    if (nroDoc && nroDoc !== '0' && !/^0+$/.test(nroDoc)) {
      try {
        const data = await clientesApi.getAll({
          search: nroDoc,
          tipoEntidad: "CLIENTE",
          limit: 1,
        });

        if (data.length > 0) {
          const cliente = data[0];
          setClienteSeleccionado(cliente);
          setClienteEventual(null);
          setSearchCliente("");
          setShowClientes(false);
          setConsultaDoc(cliente.numeroDocumento || "");
          setConsultaNombre(cliente.razonSocial || "");
          setConsultaDireccion(cliente.direccion || "");
          return;
        }
      } catch (error) {
        console.error("Error buscando cliente por documento:", error);
      }
    }

    if (nombre || nroDoc) {
      setClienteSeleccionado(null);
      setClienteEventual({
        tipoDoc: tipoDoc || '0',
        nroDoc: nroDoc || 'SIN DOCUMENTO',
        nombre: nombre || 'CLIENTE EVENTUAL',
      });
      setConsultaDoc(nroDoc || "");
      setConsultaNombre(nombre || "");
      setConsultaDireccion("");
    }
  };

  const buscarPorCodigoBarras = async (codigo: string) => {
    if (!codigo) return;

    try {
      const found = await buscarFormatoPorCodigoBarra(codigo);
      if (found?.formato) {
        const producto = todosProductos.find((p) => p.id === found.productoId);
        if (producto) {
          agregarFormato({
            productoId: found.productoId,
            productoCodigo: producto.codigo || null,
            productoDescripcion: producto.descripcion,
            tipoAfectacionIgv: producto.tipoAfectacionIgv || "10",
            stock: Number(producto.stock || 0),
            formatoId: found.formato.id,
            codigoBarra: found.formato.codigoBarra,
            factorBase: found.factorBase,
            unidad: found.unidad,
            abreviatura: found.abreviatura,
            codigoSunat: found.codigoSunat,
            precioUnitario: Number(found.precioUnitario || 0),
            precioBase: Number(found.formato.precioBase || 0),
            escalas: found.formato.escalas || [],
            formato: found.formato,
          });
        } else {
          // Fallback: sin producto cargado
          alert(`Formato encontrado pero el producto no está cargado (ID ${found.productoId}). Recarga la página.`);
        }
      } else {
        alert(`Código "${codigo}" no encontrado`);
      }
    } catch (e) {
      console.error("Error buscando por código de barras", e);
      alert("Error buscando por código de barras");
    } finally {
      setSearchProducto("");
      setShowProductos(false);
    }
  };

  const agregarFormato = (res: FormatoBusquedaResponse) => {
    const producto = todosProductos.find((p) => p.id === res.productoId);
    if (!producto) {
      setError("No se encontró el producto para el formato seleccionado. Recarga e intenta nuevamente.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    // Validación de stock
    if (empresa?.usarStock && empresa?.noVenderStockCero) {
      const stockActual = Number(producto.stock || 0);
      
      // Calcular stock considerando items ya en el carrito (en unidades base)
      const cantidadEnCarritoBase = itemsVenta
        .filter(item => item.producto.id === producto.id)
        .reduce((sum, item) => sum + (Number(item.cantidad) * Number(item.formatoFactorBase || 1)), 0);
      const factor = Number(res.factorBase || 1);
      const solicitadoBase = 1 * factor;
      
      const stockDisponible = stockActual - cantidadEnCarritoBase;
      
      if (stockDisponible < solicitadoBase) {
        setError(`No se puede agregar "${producto.descripcion}" (${res.abreviatura}). Stock insuficiente (disponible: ${stockActual}, en carrito: ${cantidadEnCarritoBase})`);
        setTimeout(() => setError(null), 4000);
        return;
      }
    }
    
    if (agruparItemsRepetidos) {
      const existente = itemsVenta.find((item) => (item.formatoId || item.producto.id) === res.formatoId);

      if (existente) {
        const idx = itemsVenta.findIndex((item) => (item.formatoId || item.producto.id) === res.formatoId);
        const nuevaCantidad = existente.cantidad + 1;
        setSelectedItemIndex(idx);
        actualizarCantidad(idx, nuevaCantidad);
        return;
      }
    }

    const precioBaseFormato = Number(res.precioBase ?? res.precioUnitario ?? producto.precioVenta ?? 0);
    const precioUnitario = Number(res.precioUnitario ?? precioBaseFormato);
    const precioCompra = res.formato?.precioCompra ?? null;
    
    // Alerta si el precio de venta es menor al precio de compra
    if (precioCompra !== null && precioUnitario < precioCompra) {
      setError(`⚠️ ALERTA: "${producto.descripcion}" se venderá a S/ ${precioUnitario.toFixed(2)} (menor al costo: S/ ${precioCompra.toFixed(2)})`);
      setTimeout(() => setError(null), 5000);
    }
    
    const nuevoItem: ItemVenta = {
      id: `${producto.id}-${res.formatoId}-${Date.now()}`,
      producto,
      formatoId: res.formatoId,
      formatoAbreviatura: res.abreviatura,
      formatoCodigoSunat: res.codigoSunat,
      formatoFactorBase: res.factorBase,
      formatoEscalas: (res.escalas || []).map(e => ({
        cantidadMinima: e.cantidadMinima,
        cantidadMaxima: e.cantidadMaxima,
        precioUnitario: e.precioUnitario,
        activo: e.activo,
      })),
      formatoPrecioBase: precioBaseFormato,
      formatoPrecioCompra: precioCompra,
      cantidad: 1,
      precioUnitario,
      subtotal: precioUnitario,
    };

    setItemsVenta((prev) => {
      const next = [...prev, nuevoItem];
      setSelectedItemIndex(next.length - 1);
      return next;
    });
    setSearchProducto("");
    setShowProductos(false);
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarItem(index);
      return;
    }

    setItemsVenta((prev) => {
      const current = prev[index];
      if (!current) return prev;

      // Validación de stock al actualizar cantidad
      if (empresa?.usarStock && empresa?.noVenderStockCero) {
        const stockActual = Number(current.producto.stock || 0);
        const factorItem = Number(current.formatoFactorBase || 1);

        // Calcular stock considerando otros items del mismo producto en el carrito (en unidades base)
        const cantidadOtrosItemsBase = prev
          .filter((it, i) => i !== index && it.producto.id === current.producto.id)
          .reduce((sum, it) => sum + (Number(it.cantidad) * Number(it.formatoFactorBase || 1)), 0);

        const stockDisponible = stockActual - cantidadOtrosItemsBase;
        const solicitadoBase = Number(cantidad) * factorItem;

        if (solicitadoBase > stockDisponible) {
          setError(
            `Stock insuficiente para "${current.producto.descripcion}" (${current.formatoAbreviatura || 'UND'}). Máximo disponible: ${stockDisponible}`
          );
          setTimeout(() => setError(null), 4000);
          return prev;
        }
      }

      return prev.map((item, i) => {
        if (i !== index) return item;
        const precioUnitario = item.formatoId
          ? selectPrecioFormato(item, cantidad)
          : selectPrecioVenta(item.producto, cantidad);
        return {
          ...item,
          cantidad,
          precioUnitario,
          subtotal: cantidad * precioUnitario,
        };
      });
    });
  };

  const actualizarPrecio = (index: number, precio: number) => {
    if (!permitirCambiarPrecio) {
      alert("No está permitido cambiar precios según la configuración del sistema");
      return;
    }

    setItemsVenta((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              precioUnitario: precio,
              subtotal: item.cantidad * precio,
            }
          : item
      )
    );
  };

  const eliminarItem = (index: number) => {
    setItemsVenta((prev) => prev.filter((_, i) => i !== index));
    setSelectedItemIndex((prev) => (prev === index ? -1 : prev));
    setShowEliminarModal(false);
    setItemToDelete(-1);
  };

  const guardarEdicionItem = () => {
    if (editingIndex >= 0) {
      setItemsVenta(
        itemsVenta.map((item, i) =>
          i === editingIndex
            ? {
                ...item,
                descripcionPersonalizada: editDescripcion,
              }
            : item
        )
      );
    }
    setShowEditModal(false);
    setEditingItem(null);
    setEditingIndex(-1);
    setEditDescripcion("");
  };

  const guardarCantidad = () => {
    const cantidad = parseFloat(editCantidad);
    if (!isNaN(cantidad) && cantidad > 0 && editingIndex >= 0) {
      actualizarCantidad(editingIndex, cantidad);
    }
    setShowCantidadModal(false);
    setEditingItem(null);
    setEditingIndex(-1);
    setEditCantidad("");
  };

  const guardarPrecio = () => {
    const precio = parseFloat(editPrecio);
    if (!isNaN(precio) && precio > 0 && editingIndex >= 0) {
      actualizarPrecio(editingIndex, precio);
    }
    setShowPrecioModal(false);
    setEditingItem(null);
    setEditingIndex(-1);
    setEditPrecio("");
  };

  const calcularTotales = () => {
    let totalGravado = 0;
    let totalExonerado = 0;
    let totalInafecto = 0;
    let itemsBajoCosto = 0;

    itemsVenta.forEach((item) => {
      const afectacion = item.producto.tipoAfectacionIgv || "10";
      
      if (afectacion === "10") {
        // Gravado - Operación Onerosa
        totalGravado += item.subtotal;
      } else if (afectacion === "20") {
        // Exonerado
        totalExonerado += item.subtotal;
      } else if (afectacion === "30") {
        // Inafecto
        totalInafecto += item.subtotal;
      } else {
        // Por defecto, considerar como gravado
        totalGravado += item.subtotal;
      }
      
      // Contar items bajo costo
      if (item.formatoPrecioCompra !== null && 
          item.formatoPrecioCompra !== undefined && 
          item.precioUnitario < item.formatoPrecioCompra) {
        itemsBajoCosto++;
      }
    });

    const subtotal = totalGravado + totalExonerado + totalInafecto;
    const igv = totalGravado * 0.18; // Solo sobre operaciones gravadas
    const total = subtotal + igv;

    return { 
      subtotal, 
      igv, 
      total,
      totalGravado,
      totalExonerado,
      totalInafecto,
      itemsBajoCosto
    };
  };

  const consultarDocumento = async () => {
    if (!consultaDoc || (consultaDoc.length !== 8 && consultaDoc.length !== 11)) {
      alert("Ingrese un documento válido:\n• DNI: 8 dígitos\n• RUC: 11 dígitos");
      return;
    }

    setConsultando(true);
    try {
      const tipoDoc = consultaDoc.length === 8 ? "1" : "6";
      const response = await clientesApi.consultarDocumento(tipoDoc, consultaDoc);
      
      if (response.estado) {
        // Si es RUC
        if (tipoDoc === "6" && response.razonSocial) {
          setConsultaNombre(response.razonSocial);
          setConsultaDireccion(response.direccion || "");
        }
        // Si es DNI
        else if (tipoDoc === "1" && response.nombres) {
          const nombreCompleto = `${response.nombres} ${response.apellidoPaterno || ''} ${response.apellidoMaterno || ''}`.trim();
          setConsultaNombre(nombreCompleto);
          setConsultaDireccion("");
        }
      } else {
        alert(`${response.mensaje || 'No se pudo consultar el documento'}`);
      }
    } catch (error) {
      console.error("Error al consultar documento:", error);
      alert("Error al consultar el documento. Ingrese los datos manualmente.");
    } finally {
      setConsultando(false);
    }
  };

  const agregarClienteEventual = () => {
    if (!consultaNombre.trim()) {
      alert("Ingrese al menos el nombre o razón social");
      return;
    }

    // Limpiar cliente anterior (si existe)
    setClienteSeleccionado(null);
    
    // Establecer nuevo cliente eventual
    setClienteEventual({
      tipoDoc: consultaDoc.length === 8 ? "1" : consultaDoc.length === 11 ? "6" : "0",
      nroDoc: consultaDoc || "SIN DOCUMENTO",
      nombre: consultaNombre,
      direccion: consultaDireccion || undefined
    });

    // Limpiar campos
    setConsultaDoc("");
    setConsultaNombre("");
    setConsultaDireccion("");
  };

  const handleLimpiar = () => {
    setItemsVenta([]);
    // Restablecer al cliente genérico después de limpiar
    setClienteSeleccionado(clienteGenerico);
    setClienteEventual(null);
    setSearchCliente("");
    setSelectedItemIndex(-1);
    setConsultaDoc("");
    setConsultaNombre("");
    setConsultaDireccion("");
    setSearchProducto("");
    setFechaVencimiento("");
  };

  const cargarVentasAnteriores = async () => {
    setLoadingVentas(true);
    try {
      const comprobantes = await listarComprobantes();
      setVentasAnteriores(comprobantes);
    } catch (error) {
      console.error("Error al cargar ventas anteriores:", error);
    } finally {
      setLoadingVentas(false);
    }
  };

  const abrirModalTraerVentas = () => {
    setShowTraerVentasModal(true);
    const hoy = new Date().toISOString().split('T')[0];
    setFiltroFechaDesde(hoy); // Fecha de hoy por defecto
    setFiltroFechaHasta(hoy);
    cargarVentasAnteriores();
  };

  const verDetalleVenta = (id: number) => {
    setVentaSeleccionadaId(id);
    setShowDetalleVentaModal(true);
  };

  const traerVenta = async (id: number) => {
    try {
      const { getComprobanteConDetalle } = await import("../../../api/comprobantesApi");
      const detalle = await getComprobanteConDetalle(id);

      const nuevosItems = construirItemsDesdeDetalle(detalle);
      setItemsVenta((prev) => combinarItems(prev, nuevosItems));
      setShowTraerVentasModal(false);

      await aplicarClienteDesdeDetalle(detalle);

      // Sin mensaje emergente
    } catch (error) {
      console.error('Error al traer venta:', error);
      alert('❌ Error al cargar la venta');
    }
  };

  const ventasFiltradas = useMemo(() => {
    let resultado = ventasAnteriores;

    // Filtrar por tipo de documento
    if (filtroTipoDoc === "BOLETA") {
      resultado = resultado.filter(v => v.tipoDoc === "03");
    } else if (filtroTipoDoc === "FACTURA") {
      resultado = resultado.filter(v => v.tipoDoc === "01");
    } else if (filtroTipoDoc === "VENTA_INTERNA") {
      resultado = resultado.filter(v => v.tipoDoc === "99");
    } else if (filtroTipoDoc === "COTIZACION") {
      resultado = resultado.filter(v => v.tipoDoc === "CO");
    }
    // Si es "TODAS", no se filtra

    // Filtrar por rango de fechas
    if (filtroFechaDesde) {
      resultado = resultado.filter(v => {
        const fechaVenta = new Date(v.fechaEmision).toISOString().split('T')[0];
        return fechaVenta >= filtroFechaDesde;
      });
    }
    
    if (filtroFechaHasta) {
      resultado = resultado.filter(v => {
        const fechaVenta = new Date(v.fechaEmision).toISOString().split('T')[0];
        return fechaVenta <= filtroFechaHasta;
      });
    }

    // Filtrar por búsqueda (nombre, código, número)
    if (filtroBusqueda.trim()) {
      const busqueda = filtroBusqueda.toLowerCase();
      resultado = resultado.filter(v => 
        v.receptorNombre?.toLowerCase().includes(busqueda) ||
        v.serie?.toLowerCase().includes(busqueda) ||
        v.correlativo?.toString().includes(busqueda) ||
        `${v.serie}-${v.correlativo}`.toLowerCase().includes(busqueda)
      );
    }

    return resultado;
  }, [ventasAnteriores, filtroTipoDoc, filtroFechaDesde, filtroFechaHasta, filtroBusqueda]);

  const obtenerFormatoImpresion = async (): Promise<string> => {
    try {
      const response = await fetch(`/api/v1/empresas/me`, {
        headers: {
          'Authorization': `Bearer ${getAuth()?.token}`
        }
      });
      console.log("Response status obtener formato:", response.status);
      if (response.ok) {
        const empresa = await response.json();
        console.log("Empresa obtenida:", empresa);
        console.log("Formato de impresión configurado:", empresa.formatoImpresion);
        return empresa.formatoImpresion || "A4";
      } else {
        console.error("Error al obtener empresa, status:", response.status);
      }
    } catch (err) {
      console.error("Error obteniendo formato de impresión:", err);
    }
    return "A4"; // Fallback por defecto
  };

  const abrirPDF = async (comprobanteId: number) => {
    const maxReintentos = 8;
    let intento = 0;
    
    // Obtener formato de impresión de la empresa desde la configuración
    const formato = await obtenerFormatoImpresion();
    console.log("Formato a usar para PDF:", formato);
    
    const intentarAbrirPDF = async (): Promise<boolean> => {
      try {
        intento++;
        const pdfUrl = `/api/v1/comprobantes/${comprobanteId}/files/pdf?format=${formato}`;
        console.log("URL del PDF:", pdfUrl);
        const response = await fetch(pdfUrl, {
          headers: {
            'Authorization': `Bearer ${getAuth()?.token}`
          }
        });
        
        if (response.status === 404) {
          if (intento < maxReintentos) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return intentarAbrirPDF();
          } else {
            console.log('PDF no disponible después de', intento, 'intentos');
            return false;
          }
        }
        
        if (!response.ok) {
          console.error('Error al obtener PDF:', response.status);
          return false;
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
        setShowPdfModal(true);
        return true;
      } catch (error) {
        console.error('Error abriendo PDF:', error);
        if (intento < maxReintentos) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return intentarAbrirPDF();
        }
        return false;
      }
    };
    
    await intentarAbrirPDF();
  };

  const cerrarPdfModal = () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setShowPdfModal(false);
  };

  const imprimirPDF = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'comprobante.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleCobrar = () => {
    if (!cajaSesionActiva) {
      alert("⚠️ Debe abrir una caja antes de registrar ventas");
      navigate("/admin/cajas");
      return;
    }

    if (itemsVenta.length === 0) {
      alert("Agregue productos a la venta");
      return;
    }

    if (!clienteSeleccionado && !clienteEventual) {
      alert("Seleccione o consulte un cliente");
      return;
    }

    setShowTipoComprobanteModal(true);
  };

  const handleClienteCreado = () => {
    loadClientes();
    setShowCrearClienteModal(false);
    setSuccess("Cliente creado exitosamente");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleProductoCreado = () => {
    loadProductos();
    setShowCrearProductoModal(false);
    setSuccess("Producto creado exitosamente");
    setTimeout(() => setSuccess(null), 3000);
  };

  const totales = calcularTotales();

  if (cajaLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cajaSesionActiva) {
    return <ElegirCajaPage />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
      {/* Sección compacta: Datos del Cliente */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Datos del Cliente
          </h3>
          
          {/* Indicador de Caja Activa - Compacto en línea */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-green-900">
              {cajaSesionActiva?.cajaFisica?.nombre || 'Caja'} - Sesión #{cajaSesionActiva?.id}
            </span>
            <button
              onClick={() => navigate(`/admin/cajas/sesiones/${cajaSesionActiva?.id}`)}
              className="text-xs font-semibold text-green-700 hover:text-green-900 hover:underline"
            >
              Ver →
            </button>
          </div>
        </div>
        
        {/* Layout en dos columnas */}
        <div className="grid grid-cols-2 gap-3">
          {/* Columna Izquierda: Buscar por Nombre + Cliente Seleccionado */}
          <div className="space-y-3">
            {/* Buscar por Nombre con botón de Nuevo Cliente */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600">Buscar por Nombre</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCrearClienteModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 transition-colors shadow-sm"
                    title="Crear nuevo cliente"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowCrearProductoModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 transition-colors shadow-sm hover:shadow-md"
                    title="Crear nuevo producto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </button>
                </div>
              </div>
              <input
                ref={inputClienteRef}
                type="text"
                placeholder="Nombre o razón social..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                onFocus={() => searchCliente.length > 2 && setShowClientes(true)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none pl-9"
              />
              <svg className="w-4 h-4 absolute left-3 top-9 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              {showClientes && clientes && clientes.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border-2 border-blue-500 bg-white shadow-xl max-h-48 overflow-y-auto">
                  {clientes.map((cliente, index) => (
                    <button
                      key={cliente.id}
                      onClick={() => {
                        setClienteEventual(null);
                        setClienteSeleccionado(cliente);
                        setSearchCliente("");
                        setShowClientes(false);
                        setConsultaDoc(cliente.numeroDocumento || "");
                        setConsultaNombre(cliente.razonSocial || "");
                        setConsultaDireccion(cliente.direccion || "");
                      }}
                      className={`block w-full px-3 py-2 text-left border-b transition ${
                        index === selectedClienteIndex
                          ? "bg-blue-500 text-white"
                          : "hover:bg-blue-50"
                      }`}>
                      <div className={`font-semibold text-xs ${
                        index === selectedClienteIndex ? "text-white" : "text-slate-900"
                      }`}>{cliente.razonSocial}</div>
                      <div className={`text-xs ${
                        index === selectedClienteIndex ? "text-blue-100" : "text-slate-600"
                      }`}>
                        {cliente.tipoDocumento === '6' ? 'RUC' : 'DNI'}: {cliente.numeroDocumento}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cliente seleccionado */}
            {(clienteSeleccionado || clienteEventual) && (
              <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-[11px]">
                <div className="font-bold text-slate-900 leading-tight">
                  {clienteSeleccionado?.razonSocial || clienteEventual?.nombre}
                  {clienteSeleccionado?.id === clienteGenerico?.id && (
                    <span className="ml-1.5 font-normal text-amber-600">(Por defecto - Max S/ 700)</span>
                  )}
                </div>
                <div className="text-slate-600 mt-0.5">
                  {clienteSeleccionado?.tipoDocumento === '6' || clienteEventual?.tipoDoc === '6' ? 'RUC' : 
                   clienteSeleccionado?.tipoDocumento === '1' || clienteEventual?.tipoDoc === '1' ? 'DNI' : 'Sin Doc'}:
                  {' '}{clienteSeleccionado?.numeroDocumento || clienteEventual?.nroDoc || '-'}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Buscar por DNI/RUC + Nombre/Razón Social */}
          <div className="space-y-3">
            {/* Buscar por DNI/RUC */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Buscar por DNI/RUC</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ingrese DNI o RUC..."
                  value={consultaDoc}
                  onChange={(e) => setConsultaDoc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={consultarDocumento}
                  disabled={consultando || (consultaDoc.length !== 8 && consultaDoc.length !== 11)}
                  title="Consultar SUNAT"
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {consultando ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Nombre/Razón Social con botones */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / Razón Social</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ingrese nombre completo o razón social"
                  value={consultaNombre}
                  onChange={(e) => setConsultaNombre(e.target.value.toUpperCase())}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={agregarClienteEventual}
                  disabled={!consultaNombre.trim()}
                  title="Usar datos"
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Usar
                </button>
                {((clienteSeleccionado?.id !== clienteGenerico?.id) || clienteEventual) && (
                  <button
                    onClick={() => {
                      setClienteSeleccionado(clienteGenerico);
                      setClienteEventual(null);
                      setConsultaDoc("");
                      setConsultaNombre("");
                      setConsultaDireccion("");
                    }}
                    title="Limpiar"
                    className="px-3 py-2 rounded-lg bg-slate-400 text-white text-sm hover:bg-slate-500 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de éxito/error */}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-2">
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-2">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* SECCIÓN CENTRAL: Búsqueda de productos, tabla y resumen */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Tabla de productos */}
        <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 p-4 flex flex-col overflow-hidden">
          <div className="relative mb-3">
            <div className="flex gap-2 items-center">
              <input
                ref={inputProductoRef}
                type="text"
                placeholder="BUSCAR PRODUCTO POR NOMBRE, CODIGO O ESCANEAR (ENTER)..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value.toUpperCase())}
                onFocus={() => searchProducto.length > 2 && setShowProductos(true)}
                autoFocus={!showTraerVentasModal && !showDetalleVentaModal}
                className="flex-1 rounded-xl border-2 border-blue-500 px-4 py-3 text-sm font-medium focus:border-blue-600 focus:outline-none uppercase"
              />
              <div className="text-xs text-gray-600 flex gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                <span><kbd className="px-2 py-1 bg-white border rounded text-xs">*</kbd> Cantidad</span>
                <span><kbd className="px-2 py-1 bg-white border rounded text-xs">/</kbd> Precio</span>
                <span><kbd className="px-2 py-1 bg-white border rounded text-xs">Ctrl+D</kbd> Editar</span>
                <span><kbd className="px-2 py-1 bg-white border rounded text-xs">Ctrl+R</kbd> Eliminar</span>
              </div>
            </div>
            
            {showProductos && formatosFiltrados.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border-2 border-blue-500 bg-white shadow-2xl max-h-80 overflow-y-auto">
                {formatosFiltrados.map((res, index) => {
                  const producto = todosProductos.find((p) => p.id === res.productoId);
                  const precio = Number(res.precioUnitario || 0);
                  const escalasActivas = (res.escalas || []).filter((e) => e.activo !== false);
                  return (
                  <button
                    key={`${res.productoId}-${res.formatoId}`}
                    onClick={() => agregarFormato(res)}
                    className={`block w-full px-3 py-1.5 text-left border-b transition ${
                      index === selectedProductoIndex 
                        ? "bg-blue-100 text-slate-900" 
                        : "hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
                        <span className={`font-semibold ${
                          index === selectedProductoIndex ? "text-blue-700" : "text-slate-900"
                        }`}>
                          {res.productoDescripcion}
                        </span>
                        <span className={`${
                          index === selectedProductoIndex ? "text-slate-600" : "text-slate-500"
                        }`}>
                          • Cód: {res.productoCodigo || (producto?.codigo ?? '')}
                        </span>
                        <span className={`${
                          index === selectedProductoIndex ? "text-slate-600" : "text-slate-500"
                        }`}>
                          • <strong className="font-black">{res.abreviatura}</strong> ×{res.factorBase}
                        </span>
                        <span className={`font-bold ${
                          (producto?.stock && Number(producto.stock) > 0) 
                            ? "text-blue-600" 
                            : "text-red-600"
                        }`}>
                          • Stock: {producto?.stock || 0}
                        </span>
                        {/* Mostrar escalas de precio del FORMATO si existen */}
                        {escalasActivas.length > 0 && (
                          <span className={`font-bold ${
                            index === selectedProductoIndex ? "text-amber-700" : "text-amber-600"
                          }`}>
                            • [{escalasActivas
                              .sort((a, b) => Number(a.cantidadMinima) - Number(b.cantidadMinima))
                              .map(e => `${e.cantidadMinima}+=S/${Number(e.precioUnitario).toFixed(4)}`)
                              .join(' ')}]
                          </span>
                        )}
                      </div>
                      <span className={`font-bold text-sm whitespace-nowrap ${
                        index === selectedProductoIndex ? "text-green-700" : "text-green-600"
                      }`}>
                        S/ {precio.toFixed(4)}
                      </span>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={carritoScrollRef} className="flex-1 overflow-y-auto border-2 border-slate-200 rounded-lg">
            {itemsVenta.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-lg font-medium">Carrito vacío</p>
                  <p className="text-sm">Busca y agrega productos para comenzar</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b-2 border-slate-300 bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-slate-700 w-12">#</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-700">Producto</th>
                    <th className="px-3 py-2 text-center font-bold text-slate-700 w-28">Cantidad</th>
                    <th className="px-3 py-2 text-center font-bold text-slate-700 w-20">Und</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-700 w-28">P. Unit.</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-700 w-32">Subtotal</th>
                    <th className="px-3 py-2 text-center font-bold text-slate-700 w-16">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsVenta.map((item, index) => {
                    const ventaBajoCosto = item.formatoPrecioCompra !== null && 
                      item.formatoPrecioCompra !== undefined && 
                      item.precioUnitario < item.formatoPrecioCompra;
                    return (
                    <tr 
                      key={item.id} 
                      data-item-index={index}
                      className={`border-b hover:bg-blue-50 cursor-pointer ${selectedItemIndex === index ? "bg-blue-100" : ""} ${ventaBajoCosto ? "bg-red-50" : ""}`}
                      onClick={() => setSelectedItemIndex(index)}
                    >
                      <td className="px-3 py-2 text-center font-bold text-slate-600">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.descripcionPersonalizada || item.producto.descripcion}</span>
                          {ventaBajoCosto && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded" title={`Costo: S/ ${item.formatoPrecioCompra?.toFixed(2)}`}>
                              BAJO COSTO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.producto.codigo}
                          {ventaBajoCosto && (
                            <span className="ml-2 text-red-600 font-medium">
                              (Costo: S/ {item.formatoPrecioCompra?.toFixed(2)})
                            </span>
                          )}
                        </div>
                        {item.formatoEscalas && item.formatoEscalas.length > 0 && (
                          <div className="text-[11px] text-amber-700 font-bold">
                            [{item.formatoEscalas
                              .filter(e => e.activo !== false)
                              .sort((a, b) => Number(a.cantidadMinima) - Number(b.cantidadMinima))
                              .map(e => `${e.cantidadMinima}+=S/${Number(e.precioUnitario).toFixed(4)}`)
                              .join(' ')}]
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setEditingIndex(index);
                            setEditCantidad(item.cantidad.toString());
                            setShowCantidadModal(true);
                          }}
                          className="inline-block w-full rounded border bg-slate-50 border-slate-200 px-2 py-1 text-center font-semibold cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
                          title="Clic para editar cantidad"
                        >
                          {item.cantidad}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <strong className="font-black">
                          {item.formatoAbreviatura || item.producto.unidadMedida?.codigo || "NIU"}
                        </strong>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {permitirCambiarPrecio ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setEditingIndex(index);
                              setEditPrecio(item.precioUnitario.toString());
                              setShowPrecioModal(true);
                            }}
                            className={`inline-block w-full rounded border px-2 py-1 text-right font-semibold text-sm cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition ${
                              ventaBajoCosto ? "bg-red-100 text-red-700 border-red-300" : "bg-slate-50 border-slate-200"
                            }`}
                            title="Clic para editar precio"
                          >
                            {item.precioUnitario.toFixed(4)}
                          </button>
                        ) : (
                          <span className={`inline-block w-full rounded border px-2 py-1 text-right font-semibold text-sm cursor-default ${
                            ventaBajoCosto ? "bg-red-100 text-red-700 border-red-300" : "bg-slate-100 text-slate-500"
                          }`}>
                            {item.precioUnitario.toFixed(4)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">
                        S/ {item.subtotal.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(index);
                            setShowEliminarModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>

          {!permitirCambiarPrecio && (
            <div className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 mt-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Modificación de precios deshabilitada</span>
            </div>
          )}
        </div>

        {/* Panel lateral de resumen */}
        <div className="w-56 bg-white rounded-xl border-2 border-slate-200 p-3 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-slate-700 border-b pb-1">RESUMEN DE VENTA</h3>
          
          <div className="flex justify-between items-center py-1 border-b">
            <span className="text-[10px] text-slate-500">ITEMS</span>
            <span className="text-xl font-bold text-slate-900">{itemsVenta.length}</span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-[10px] text-slate-600">GRAVADAS</span>
            <span className="text-sm font-bold text-slate-700">S/ {totales.totalGravado.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-[10px] text-slate-600">EXONERADAS</span>
            <span className="text-sm font-bold text-slate-700">S/ {totales.totalExonerado.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-[10px] text-slate-600">INAFECTAS</span>
            <span className="text-sm font-bold text-slate-700">S/ {totales.totalInafecto.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-t">
            <span className="text-[10px] text-slate-600">IGV (18%)</span>
            <span className="text-sm font-bold text-blue-600">S/ {totales.igv.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-t-2 border-slate-300 bg-green-50 -mx-3 px-3 rounded-lg">
            <span className="text-xs font-bold text-slate-700">TOTAL</span>
            <span className="text-2xl font-black text-green-600">S/ {totales.total.toFixed(2)}</span>
          </div>
          
          {totales.itemsBajoCosto > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg -mx-3 px-3">
              <div className="flex items-center gap-2 text-red-700 text-xs">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-bold">
                  {totales.itemsBajoCosto} item{totales.itemsBajoCosto > 1 ? 's' : ''} bajo costo
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Botones de acción */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={abrirModalTraerVentas}
            className="px-8 py-3 rounded-xl border-2 border-purple-500 text-purple-600 font-bold hover:bg-purple-50 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            TRAER
          </button>
          <button
            onClick={() => setShowLimpiarModal(true)}
            className="px-8 py-3 rounded-xl border-2 border-red-500 text-red-600 font-bold hover:bg-red-50 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            LIMPIAR
          </button>
          <button
            onClick={handleCobrar}
            disabled={itemsVenta.length === 0}
            className="px-12 py-3 rounded-xl bg-green-600 text-white text-lg font-black hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            COBRAR
          </button>
        </div>
      </div>

      {/* Modales de edición */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 border-2 border-blue-500">
            <div className="text-xs text-slate-500 mb-2">
              {editingItem.producto.descripcion}
            </div>
            
            <input
              type="text"
              value={editDescripcion}
              onChange={(e) => setEditDescripcion(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  guardarEdicionItem();
                } else if (e.key === "Escape") {
                  setShowEditModal(false);
                  setEditingItem(null);
                  setEditingIndex(-1);
                  setEditDescripcion("");
                }
              }}
              className="w-full rounded-lg border-2 border-blue-500 px-3 py-2 text-sm font-medium uppercase focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Escriba la descripción..."
              autoFocus
            />
            
            <div className="text-xs text-slate-500 mt-2 text-center">
              Enter: Guardar | Esc: Cancelar
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Cantidad */}
      {showCantidadModal && editingItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-3 border-2 border-green-500">
            <div className="text-xs text-slate-500 mb-2">
              {editingItem.producto.descripcion}
            </div>
            
            <input
              type="number"
              step="1"
              min="1"
              value={editCantidad}
              onChange={(e) => setEditCantidad(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === '+') {
                  e.preventDefault();
                } else if (e.key === "Enter") {
                  guardarCantidad();
                } else if (e.key === "Escape") {
                  setShowCantidadModal(false);
                  setEditingItem(null);
                  setEditingIndex(-1);
                  setEditCantidad("");
                }
              }}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border-2 border-green-500 px-3 py-2 text-lg font-bold text-center focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="0"
              autoFocus
            />
            
            <div className="text-xs text-slate-500 mt-2 text-center">
              Enter: Guardar | Esc: Cancelar
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Precio */}
      {showPrecioModal && editingItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-3 border-2 border-yellow-500">
            <div className="text-xs text-slate-500 mb-2">
              {editingItem.producto.descripcion}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-slate-600">S/</span>
              <input
                type="number"
                step="0.000001"
                min="0.01"
                value={editPrecio}
                onChange={(e) => {
                  const value = e.target.value;
                  const parts = value.split('.');
                  if (parts.length === 2 && parts[1].length > 6) {
                    return;
                  }
                  setEditPrecio(value);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    guardarPrecio();
                  } else if (e.key === "Escape") {
                    setShowPrecioModal(false);
                    setEditingItem(null);
                    setEditingIndex(-1);
                    setEditPrecio("");
                  }
                }}
                className="flex-1 rounded-lg border-2 border-yellow-500 px-3 py-2 text-lg font-bold text-right focus:border-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-200"
                placeholder="0.00"
                autoFocus
              />
            </div>
            
            <div className="text-xs text-slate-500 text-center">
              Enter: Guardar | Esc: Cancelar
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de tipo de comprobante */}
      {showTipoComprobanteModal && (() => {
        const tieneRuc = clienteSeleccionado?.tipoDocumento === '6' || clienteEventual?.tipoDoc === '6';
        
        const handleSeleccionTipo = async (tipo: 'VENTA_INTERNA' | 'BOLETA' | 'FACTURA' | 'COTIZACION') => {
          if (!cajaSesionActiva) {
            alert("⚠️ Debe abrir una caja antes de registrar ventas");
            navigate("/admin/cajas");
            return;
          }

          setShowTipoComprobanteModal(false);
          setEmitiendo(true);
          
          try {
            const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

            // Construir el request según el formato del backend
            const items = itemsVenta.map(item => {
              const afectacion = item.producto.tipoAfectacionIgv || "10";
              const cantidad = Number(item.cantidad);

              // En esta pantalla, el precio que maneja el usuario se interpreta como VALOR unitario (sin IGV)
              // y el total se compone agregando IGV solo para afectación 10.
              const valorUnitario = Number(item.precioUnitario);
              const baseLine = round2(valorUnitario * cantidad);
              const igvItem = afectacion === "10" ? round2(baseLine * 0.18) : 0;
              const precioUnitario = afectacion === "10" ? round2(valorUnitario * 1.18) : round2(valorUnitario);
              const totalItem = round2(baseLine + igvItem);

              const unidadSunat = String(
                item.formatoCodigoSunat || item.producto.unidadMedida?.codigo || item.producto.unidadMedida || 'NIU'
              ).substring(0, 10);

              const unidadMedidaUnknown = item.producto.unidadMedida as unknown;
              let unidadMedidaAbreviatura: string | undefined;
              if (typeof unidadMedidaUnknown === 'object' && unidadMedidaUnknown !== null && 'abreviatura' in unidadMedidaUnknown) {
                unidadMedidaAbreviatura = (unidadMedidaUnknown as { abreviatura?: string }).abreviatura;
              }

              const unidadImpresion = String(
                item.formatoAbreviatura || unidadMedidaAbreviatura || unidadSunat || 'NIU'
              ).substring(0, 10);

              return {
                codigo: String(item.producto.codigo || item.producto.id || ''),
                descripcion: String(item.descripcionPersonalizada || item.producto.descripcion),
                unidad: unidadSunat,
                unidadImpresion,
                cantidad,
                valorUnitario: round2(valorUnitario),
                precioUnitario,
                afectacionIgv: String(afectacion),
                igvItem,
                totalItem,
              };
            });

            const total = round2(items.reduce((sum, it) => sum + Number(it.totalItem || 0), 0));

            const request: CpeRequest = {
              tipoDoc: tipo === 'FACTURA' ? '01' : tipo === 'BOLETA' ? '03' : '99',
              fechaEmision: new Date().toISOString(),
              fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento + 'T00:00:00').toISOString() : undefined,
              items,
              total,
              receptorTipoDoc: String(clienteSeleccionado?.tipoDocumento || clienteEventual?.tipoDoc || '0'),
              receptorNroDoc: String(clienteSeleccionado?.numeroDocumento || clienteEventual?.nroDoc || ''),
              receptorNombre: String(clienteSeleccionado?.razonSocial || clienteEventual?.nombre || 'CLIENTE EVENTUAL'),
              tipoPago: tipoPagoSeleccionado // Enviar el método de pago seleccionado
            };

            // Validación: Cliente genérico solo para boletas
            const esClienteGenerico = clienteSeleccionado?.id === clienteGenerico?.id;
            if (tipo === 'FACTURA' && esClienteGenerico) {
              setError('❌ El cliente "CLIENTES VARIOS" no puede usarse para Facturas. Seleccione un cliente con RUC.');
              setTimeout(() => setError(null), 5000);
              setEmitiendo(false);
              return;
            }

            // Validación: Boleta sin documento no puede superar S/ 700
            if (tipo === 'BOLETA') {
              const nroDoc = String(request.receptorNroDoc || '').trim();
              const tipoDoc = String(request.receptorTipoDoc || '').trim();
              const sinDocumento = !nroDoc || nroDoc === '0' || /^0+$/.test(nroDoc) || !tipoDoc || tipoDoc === '0' || tipoDoc === '-';
              
              console.log('Validación boleta:', { nroDoc, tipoDoc, sinDocumento, total });
              
              if (sinDocumento && total > 700) {
                setError('❌ Las boletas sin documento de identidad no pueden superar S/ 700.00. Debe registrar un cliente con DNI.');
                setTimeout(() => setError(null), 5000);
                setEmitiendo(false);
                return;
              }
            }

            let resultado: Comprobante | null = null;
            
            if (tipo === 'VENTA_INTERNA') {
              // Venta interna - sin envío a SUNAT
              resultado = await registrarVentaInterna(request);
              setSuccess(`✅ Venta interna registrada exitosamente`);
              
              // Abrir PDF en nueva pestaña después de un breve delay
              if (resultado?.id) {
                const id = resultado.id;
                setTimeout(() => abrirPDF(id), 300);
              }
            } else if (tipo === 'BOLETA' || tipo === 'FACTURA') {
              // Boleta o Factura - envío a SUNAT
              resultado = await emitirComprobante(request);
              setSuccess(`✅ ${tipo === 'FACTURA' ? 'Factura' : 'Boleta'} emitida exitosamente: ${resultado.serie}-${resultado.correlativo}`);
              
              // Abrir PDF en nueva pestaña después de un breve delay
              if (resultado?.id) {
                const id = resultado.id;
                setTimeout(() => abrirPDF(id), 300);
              }
            } else if (tipo === 'COTIZACION') {
              // TODO: Implementar lógica de cotización
              alert('🚧 Próximamente: Guardar cotización');
              setEmitiendo(false);
              return;
            }

            // Limpiar la venta después de emitir exitosamente
            setTimeout(() => {
              handleLimpiar();
              setSuccess(null);
              
              // ✅ REFRESCAR PRODUCTOS: Recargar lista para reflejar stock actualizado
              loadProductos();
              console.log('🔄 Productos recargados para reflejar stock actualizado');
            }, 3000);

          } catch (err: unknown) {
            console.error('Error al emitir comprobante:', err);
            const maybe = err as { response?: { data?: unknown }; message?: string };
            const errorMsg =
              (typeof maybe.response?.data === 'string' ? maybe.response.data : undefined) ||
              (maybe.message || (err instanceof Error ? err.message : undefined)) ||
              'Error desconocido';
            setError(`❌ Error al emitir: ${errorMsg}`);
            setTimeout(() => setError(null), 5000);
          } finally {
            setEmitiendo(false);
          }
        };

        return (
          <Modal isOpen={true} onClose={() => !emitiendo && setShowTipoComprobanteModal(false)} title="Seleccionar Tipo de Comprobante y Pago" size="sm">
            <div className="space-y-3">
              {/* Tipo de Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Pago:</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setTipoPagoSeleccionado("EFECTIVO")}
                    className={`px-2 py-2 rounded-lg border-2 text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                      tipoPagoSeleccionado === "EFECTIVO"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-300 text-slate-600 hover:border-green-300"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Efectivo
                  </button>
                  <button
                    onClick={() => setTipoPagoSeleccionado("TARJETA")}
                    className={`px-2 py-2 rounded-lg border-2 text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                      tipoPagoSeleccionado === "TARJETA"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Tarjeta
                  </button>
                  <button
                    onClick={() => setTipoPagoSeleccionado("TRANSFERENCIA")}
                    className={`px-2 py-2 rounded-lg border-2 text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                      tipoPagoSeleccionado === "TRANSFERENCIA"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-slate-300 text-slate-600 hover:border-purple-300"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Transfer.
                  </button>
                  <button
                    onClick={() => setTipoPagoSeleccionado("YAPE")}
                    className={`px-2 py-2 rounded-lg border-2 text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                      tipoPagoSeleccionado === "YAPE"
                        ? "border-pink-500 bg-pink-50 text-pink-700"
                        : "border-slate-300 text-slate-600 hover:border-pink-300"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Yape/Plin
                  </button>
                </div>
              </div>

              {/* Fecha de Vencimiento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha de Vencimiento (opcional):</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Si no se indica, usa fecha de emisión"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Si no indica, se usará la fecha de emisión.</p>
              </div>

              {/* Tipo de Comprobante */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Comprobante:</label>

                <div className="grid grid-cols-2 gap-2">
                {/* Venta Interna */}
                <button
                  onClick={() => handleSeleccionTipo('VENTA_INTERNA')}
                  disabled={emitiendo}
                  className="p-3 rounded-lg border-2 border-slate-300 hover:border-purple-500 hover:bg-purple-50 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-purple-600 mb-1.5">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="font-bold text-sm">VENTA INT.</div>
                  <div className="text-[10px] text-slate-500">Sin tributario</div>
                </button>

                {/* Boleta */}
                <button
                  onClick={() => handleSeleccionTipo('BOLETA')}
                  disabled={emitiendo}
                  className="p-3 rounded-lg border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-blue-600 mb-1.5">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <div className="font-bold text-sm">BOLETA</div>
                  <div className="text-[10px] text-slate-500">03 - B. venta</div>
                </button>

                {/* Factura */}
                <button
                  onClick={() => handleSeleccionTipo('FACTURA')}
                  disabled={!tieneRuc || emitiendo}
                  className={`p-3 rounded-lg border-2 transition text-center ${
                    tieneRuc && !emitiendo
                      ? 'border-slate-300 hover:border-green-500 hover:bg-green-50 cursor-pointer'
                      : 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className={`mb-1.5 ${tieneRuc ? 'text-green-600' : 'text-slate-400'}`}>
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="font-bold text-sm">FACTURA</div>
                  <div className="text-[10px] text-slate-500">
                    {tieneRuc ? '01 - Factura' : 'Req. RUC'}
                  </div>
                </button>

                {/* Cotización */}
                <button
                  onClick={() => handleSeleccionTipo('COTIZACION')}
                  disabled={emitiendo}
                  className="p-3 rounded-lg border-2 border-slate-300 hover:border-yellow-500 hover:bg-yellow-50 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-yellow-600 mb-1.5">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-bold text-sm">COTIZACIÓN</div>
                  <div className="text-[10px] text-slate-500">Presupuesto</div>
                </button>

                {/* Nota de Venta (nueva opción compacta) */}
                <button
                  onClick={() => setShowTipoComprobanteModal(false)}
                  disabled={emitiendo}
                  className="p-3 rounded-lg border-2 border-slate-300 hover:border-slate-500 hover:bg-slate-50 transition text-center disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                >
                  <div className="text-slate-600 mb-1.5">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="font-bold text-sm">CANCELAR</div>
                  <div className="text-[10px] text-slate-500">Volver</div>
                </button>
              </div>
              </div>

              {emitiendo && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-semibold">Procesando...</span>
                </div>
              )}

              {!tieneRuc && !emitiendo && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  ⚠️ <strong>Nota:</strong> La factura requiere que el cliente tenga RUC (tipo documento 6).
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Modal de confirmación para limpiar */}
      <ConfirmModal
        isOpen={showLimpiarModal}
        onClose={() => setShowLimpiarModal(false)}
        onConfirm={handleLimpiar}
        title="🧹 Limpiar Venta"
        message={`¿Estás seguro de limpiar la venta actual? ${itemsVenta.length > 0 ? `Se perderán ${itemsVenta.length} ${itemsVenta.length === 1 ? 'producto' : 'productos'} agregados.` : ''}`}
        confirmText="Sí, Limpiar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de confirmación para eliminar item */}
      <ConfirmModal
        isOpen={showEliminarModal}
        onClose={() => {
          setShowEliminarModal(false);
          setItemToDelete(-1);
        }}
        onConfirm={() => itemToDelete >= 0 && eliminarItem(itemToDelete)}
        title="🗑️ Eliminar Producto"
        message={`¿Estás seguro de eliminar "${itemToDelete >= 0 && itemsVenta[itemToDelete] ? (itemsVenta[itemToDelete].descripcionPersonalizada || itemsVenta[itemToDelete].producto.descripcion) : 'este producto'}" de la venta?`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal para visualizar e imprimir PDF */}
      {showPdfModal && pdfUrl && (
        <Modal
          isOpen={showPdfModal}
          onClose={cerrarPdfModal}
          title="Comprobante Generado"
          size="xl"
        >
          <div className="flex flex-col h-[80vh]">
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={cerrarPdfModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button
                onClick={imprimirPDF}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
            </div>
            <div className="flex-1">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0 rounded"
                title="Vista previa del comprobante"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para Traer Ventas Anteriores */}
      {showTraerVentasModal && (
        <Modal
          isOpen={showTraerVentasModal}
          onClose={() => setShowTraerVentasModal(false)}
          title="Ventas Anteriores"
          size="xl"
        >
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-4 gap-4" onClick={(e) => e.stopPropagation()}>
              {/* Tipo de Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Comprobante:</label>
                <select
                  value={filtroTipoDoc}
                  onChange={(e) => setFiltroTipoDoc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white"
                >
                  <option value="TODAS">Todas las Ventas</option>
                  <option value="VENTA_INTERNA">Ventas Internas</option>
                  <option value="BOLETA">Boletas</option>
                  <option value="FACTURA">Facturas</option>
                  <option value="COTIZACION">Cotizaciones</option>
                </select>
              </div>

              {/* Filtro Fecha Desde */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Desde:</label>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white"
                />
              </div>

              {/* Filtro Fecha Hasta */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hasta:</label>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white"
                />
              </div>

              {/* Búsqueda */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Buscar:</label>
                <input
                  type="text"
                  placeholder="Nombre, serie o número..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* Lista de ventas */}
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              {loadingVentas ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : ventasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-700">No se encontraron ventas</p>
                  <p className="text-xs text-slate-500">Prueba con otros filtros</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-700">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-700">Tipo</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-700">Serie-Número</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-700">Cliente</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-slate-700">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-slate-700">Estado</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-slate-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {ventasFiltradas.map((venta) => (
                      <tr key={venta.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {new Date(venta.fechaEmision).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                            venta.tipoDoc === '01' ? 'bg-green-100 text-green-700' :
                            venta.tipoDoc === '03' ? 'bg-blue-100 text-blue-700' :
                            venta.tipoDoc === '99' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {venta.tipoDoc === '01' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            {venta.tipoDoc === '03' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                              </svg>
                            )}
                            {venta.tipoDoc === '99' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                            {venta.tipoDoc === '01' ? 'Factura' :
                             venta.tipoDoc === '03' ? 'Boleta' :
                             venta.tipoDoc === '99' ? 'V. Interna' :
                             'Cotización'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs font-mono font-semibold text-slate-800">
                          {venta.serie}-{venta.correlativo}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-xs truncate">
                          {venta.receptorNombre || 'Sin cliente'}
                        </td>
                        <td className="px-3 py-2 text-xs font-bold text-right text-green-600">
                          S/ {venta.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-xs text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            venta.estado === 'ACEPTADO' ? 'bg-green-100 text-green-700' :
                            venta.estado === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {venta.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => verDetalleVenta(venta.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                              title="Ver detalle"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver
                            </button>
                            <button
                              onClick={() => traerVenta(venta.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-300 rounded hover:bg-purple-100"
                              title="Traer venta"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Traer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer con contador */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                Mostrando <span className="font-bold">{ventasFiltradas.length}</span> de <span className="font-bold">{ventasAnteriores.length}</span> ventas
              </p>
              <button
                onClick={() => setShowTraerVentasModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Detalle de Venta */}
      {showDetalleVentaModal && ventaSeleccionadaId && (
        <DetalleVentaModal
          isOpen={showDetalleVentaModal}
          onClose={() => {
            setShowDetalleVentaModal(false);
            setVentaSeleccionadaId(null);
          }}
          comprobanteId={ventaSeleccionadaId}
        />
      )}

      {/* Modal de Crear Cliente */}
      <EntidadComercialFormModal
        isOpen={showCrearClienteModal}
        onClose={() => setShowCrearClienteModal(false)}
        onSaved={handleClienteCreado}
      />

      {/* Modal de Crear Producto */}
      <ProductoFormModal
        isOpen={showCrearProductoModal}
        producto={null}
        onClose={() => setShowCrearProductoModal(false)}
        onSaved={handleProductoCreado}
      />
    </div>
  );
}
