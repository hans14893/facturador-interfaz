import { useState, useEffect, useMemo } from "react";
import Modal from "../../../components/Modal";
import FormatoFormModal from "./FormatoFormModal";
import type { FormatoForm } from "./FormatoFormModal";
import { listCategorias } from "../../../api/categoriasApi";
import { listCodigosProductoSunat } from "../../../api/codigosProductoSunatApi";
import { 
  listarUnidadesInternasActivas, 
  listarFormatosProducto,
  crearFormatoVenta, 
  actualizarFormatoVenta,
  eliminarFormatoVenta 
} from "../../../api/formatosApi";
import type { UnidadMedidaInterna, ProductoFormatoVenta } from "../../../api/formatosApi";
import { getMyEmpresa } from "../../../api/adminEmpresasApi";
import { createProducto, updateProducto } from "../../../api/productosApi";
import type { Producto } from "../../../api/productosApi";
import type { Categoria } from "../../../api/categoriasApi";
import type { CodigoProductoSunat } from "../../../api/codigosProductoSunatApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import { getErrorMessage } from "../../../api/errorHelper";

interface Props {
  isOpen: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductoFormModal({ isOpen, producto, onClose, onSaved }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [codigosSunat, setCodigosSunat] = useState<CodigoProductoSunat[]>([]);
  const [unidadesInternas, setUnidadesInternas] = useState<UnidadMedidaInterna[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Datos del producto
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [codigoProductoSunatId, setCodigoProductoSunatId] = useState("");
  const [codigoSunatSearch, setCodigoSunatSearch] = useState("");
  const [showCodigoSunatDropdown, setShowCodigoSunatDropdown] = useState(false);
  const [tipoAfectacionIgv, setTipoAfectacionIgv] = useState("10");
  const [stock, setStock] = useState("0");

  // Formatos
  const [formatos, setFormatos] = useState<FormatoForm[]>([]);
  const [formatosExistentes, setFormatosExistentes] = useState<ProductoFormatoVenta[]>([]);
  const [showFormatoModal, setShowFormatoModal] = useState(false);
  const [formatoEditIndex, setFormatoEditIndex] = useState<number | null>(null);

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadMasterData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !loadingData) initForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadingData]);

  async function loadMasterData() {
    setLoadingData(true);
    try {
      const [cats, codSunat, unisInt, emp] = await Promise.all([
        listCategorias(),
        listCodigosProductoSunat(),
        listarUnidadesInternasActivas(),
        getMyEmpresa(),
      ]);
      setCategorias(cats);
      setCodigosSunat(codSunat);
      setUnidadesInternas(unisInt);
      setEmpresa(emp);
    } catch (e) {
      setError(getErrorMessage(e, "Error cargando datos"));
    } finally {
      setLoadingData(false);
    }
  }

  async function initForm() {
    if (producto) {
      setCodigo(producto.codigo || "");
      setDescripcion(producto.descripcion);
      setCategoriaId(producto.categoria?.id.toString() || "");
      setCodigoProductoSunatId(producto.codigoProductoSunat?.id.toString() || "");
      setCodigoSunatSearch(producto.codigoProductoSunat 
        ? `${producto.codigoProductoSunat.codigo} - ${producto.codigoProductoSunat.descripcion}` : "");
      setTipoAfectacionIgv(producto.tipoAfectacionIgv || empresa?.tipoAfectacionIgvDefault || "10");
      setStock(producto.stock.toString());
      
      // Cargar formatos de venta existentes desde el backend
      try {
        console.log("DEBUG - Cargando formatos para producto:", producto.id);
        const formatosBackend = await listarFormatosProducto(producto.id);
        console.log("DEBUG - formatosBackend recibidos:", formatosBackend);
        setFormatosExistentes(formatosBackend);
        
        if (formatosBackend.length > 0) {
          // Convertir formatos del backend al formato del formulario
          const formatosForm: FormatoForm[] = formatosBackend.map(fb => ({
            unidadInternaId: fb.unidadInterna.id.toString(),
            factorBase: fb.factorBase.toString(),
            precioVenta: (fb.precioBase || producto.precioVenta).toString(),
            precioCompra: fb.precioCompra?.toString() || producto.precioCompra?.toString() || "",
            codigoBarra: fb.codigoBarra || "",
            pesoUnitario: fb.pesoUnitario?.toString() || "",
            esPrincipal: fb.esPrincipal,
            escalas: fb.escalas.map(e => ({
              cantidadMinima: e.cantidadMinima.toString(),
              precioUnitario: e.precioUnitario.toString(),
            })),
          }));
          setFormatos(formatosForm);
        } else {
          // Sin formatos de venta, crear uno basado en el producto
          const fmt = crearFormatoVacio(true);
          fmt.precioVenta = producto.precioVenta.toString();
          fmt.precioCompra = producto.precioCompra?.toString() || "";
          
          // Buscar unidad interna que corresponda a la unidad SUNAT del producto
          if (producto.unidadMedida) {
            const unidadInterna = unidadesInternas.find(
              u => u.unidadSunat.codigo === producto.unidadMedida.codigo
            );
            if (unidadInterna) {
              fmt.unidadInternaId = unidadInterna.id.toString();
            }
          }
          
          // Cargar escalas existentes del producto
          console.log("DEBUG - producto.escalasPrecio:", producto.escalasPrecio);
          if (producto.escalasPrecio && producto.escalasPrecio.length > 0) {
            fmt.escalas = producto.escalasPrecio.map(e => ({
              cantidadMinima: e.minCantidad.toString(),
              precioUnitario: e.precioVenta.toString(),
            }));
            console.log("DEBUG - escalas cargadas:", fmt.escalas);
          }
          
          setFormatos([fmt]);
        }
      } catch (err) {
        // Error cargando formatos, usar datos del producto
        console.error("ERROR cargando formatos:", err);
        const fmt = crearFormatoVacio(true);
        fmt.precioVenta = producto.precioVenta.toString();
        fmt.precioCompra = producto.precioCompra?.toString() || "";
        if (producto.unidadMedida) {
          const unidadInterna = unidadesInternas.find(
            u => u.unidadSunat.codigo === producto.unidadMedida.codigo
          );
          if (unidadInterna) {
            fmt.unidadInternaId = unidadInterna.id.toString();
          }
        }
        if (producto.escalasPrecio && producto.escalasPrecio.length > 0) {
          fmt.escalas = producto.escalasPrecio.map(e => ({
            cantidadMinima: e.minCantidad.toString(),
            precioUnitario: e.precioVenta.toString(),
          }));
        }
        setFormatos([fmt]);
        setFormatosExistentes([]);
      }
    } else {
      setCodigo("");
      setDescripcion("");
      setCategoriaId("");
      setCodigoProductoSunatId("");
      setCodigoSunatSearch("");
      setTipoAfectacionIgv(empresa?.tipoAfectacionIgvDefault || "10");
      setStock("0");
      setFormatos([]);  // Sin formatos por defecto - el usuario agrega si necesita
      setFormatosExistentes([]);
    }
    setError(null);
    setSuccess(null);
  }

  function crearFormatoVacio(esPrincipal: boolean): FormatoForm {
    const unidadDefault = unidadesInternas.find(u => 
      u.nombre.toLowerCase() === "unidad" || u.abreviatura.toLowerCase() === "und"
    );
    return {
      unidadInternaId: unidadDefault?.id.toString() || "",
      factorBase: "1",
      precioVenta: "",
      precioCompra: "",
      codigoBarra: "",
      pesoUnitario: "",
      esPrincipal,
      escalas: [],
    };
  }

  function abrirNuevoFormato() {
    setFormatoEditIndex(null);
    setShowFormatoModal(true);
  }

  function abrirEditarFormato(idx: number) {
    setFormatoEditIndex(idx);
    setShowFormatoModal(true);
  }

  function guardarFormato(formato: FormatoForm) {
    if (formatoEditIndex !== null) {
      // Editando existente
      const nuevos = [...formatos];
      if (formato.esPrincipal) {
        nuevos.forEach((f, i) => { if (i !== formatoEditIndex) f.esPrincipal = false; });
      }
      nuevos[formatoEditIndex] = formato;
      setFormatos(nuevos);
    } else {
      // Agregando nuevo
      const nuevos = [...formatos];
      if (formato.esPrincipal) {
        nuevos.forEach(f => f.esPrincipal = false);
      }
      setFormatos([...nuevos, formato]);
    }
  }

  function eliminarFormato(idx: number) {
    if (formatos.length <= 1) return;
    const nuevos = formatos.filter((_, i) => i !== idx);
    if (formatos[idx].esPrincipal && nuevos.length > 0) {
      nuevos[0].esPrincipal = true;
    }
    setFormatos(nuevos);
  }

  function hacerPrincipal(idx: number) {
    const nuevos = [...formatos];
    nuevos.forEach((f, i) => f.esPrincipal = i === idx);
    setFormatos(nuevos);
  }

  const pesoBasePrincipal = useMemo(() => {
    const principal = formatos.find(f => f.esPrincipal);
    return principal?.pesoUnitario ? parseFloat(principal.pesoUnitario) : undefined;
  }, [formatos]);

  async function handleGuardar() {
    setError(null);
    if (!descripcion.trim()) { setError("La descripción es requerida"); return; }
    
    if (formatos.length === 0) { 
      setError("Debe agregar al menos un formato de venta"); 
      return; 
    }
    
    const formatoPrincipal = formatos.find(f => f.esPrincipal);
    if (!formatoPrincipal) { 
      setError("Debe marcar un formato como principal"); 
      return; 
    }
    if (!formatoPrincipal.precioVenta) { setError("El formato principal debe tener precio"); return; }
    if (!formatoPrincipal.unidadInternaId) { setError("El formato principal debe tener unidad"); return; }
    
    setSaving(true);
    try {
      // 1. Guardar producto base (sin unidadMedidaId - se obtiene del formato)
      const payload = {
        codigo: codigo.trim() || undefined,
        descripcion: descripcion.toUpperCase(),
        precioVenta: formatoPrincipal.precioVenta,
        precioCompra: formatoPrincipal.precioCompra || undefined,
        codigoProductoSunatId: codigoProductoSunatId ? parseInt(codigoProductoSunatId) : undefined,
        tipoAfectacionIgv,
        unidadMedidaId: parseInt(formatoPrincipal.unidadInternaId) || 1,
        categoriaId: categoriaId ? parseInt(categoriaId) : undefined,
        escalas: formatoPrincipal.escalas.filter(e => e.cantidadMinima && e.precioUnitario)
          .map(e => ({ minCantidad: e.cantidadMinima, precioVenta: e.precioUnitario })),
      };
      if (payload.escalas.length === 0) {
        payload.escalas = [{ minCantidad: "1", precioVenta: formatoPrincipal.precioVenta }];
      }
      
      let productoId: number;
      if (producto) {
        await updateProducto(producto.id, payload);
        productoId = producto.id;
      } else {
        const nuevoProducto = await createProducto(payload);
        productoId = nuevoProducto.id;
      }
      
      // 2. Cargar formatos existentes del backend para comparar
      let formatosDelBackend: ProductoFormatoVenta[] = [];
      try {
        formatosDelBackend = await listarFormatosProducto(productoId);
        console.log("DEBUG - formatos del backend:", formatosDelBackend);
      } catch (e) {
        console.log("DEBUG - error cargando formatos del backend:", e);
      }
      
      // 3. Guardar formatos de venta con peso, código de barra, etc.
      // Eliminar formatos que ya no están
      for (const fmtExistente of formatosDelBackend) {
        const sigueExistiendo = formatos.some(f => 
          f.unidadInternaId === fmtExistente.unidadInterna.id.toString()
        );
        if (!sigueExistiendo) {
          try {
            await eliminarFormatoVenta(productoId, fmtExistente.id);
          } catch { /* ignorar si falla */ }
        }
      }
      
      // Crear/actualizar formatos
      for (let i = 0; i < formatos.length; i++) {
        const fmt = formatos[i];
        
        // Validar que tenga unidad interna
        if (!fmt.unidadInternaId) {
          console.warn("Formato sin unidad interna, omitiendo:", fmt);
          continue;
        }
        
        const formatoRequest = {
          unidadInternaId: parseInt(fmt.unidadInternaId),
          factorBase: parseInt(fmt.factorBase) || 1,
          precioBase: parseFloat(fmt.precioVenta) || 0,
          precioCompra: fmt.precioCompra ? parseFloat(fmt.precioCompra) : undefined,
          codigoBarra: fmt.codigoBarra || undefined,
          pesoUnitario: fmt.pesoUnitario ? parseFloat(fmt.pesoUnitario) : undefined,
          esPrincipal: fmt.esPrincipal,
          escalas: fmt.escalas.filter(e => e.cantidadMinima && e.precioUnitario).map(e => ({
            cantidadMinima: parseInt(e.cantidadMinima),
            precioUnitario: parseFloat(e.precioUnitario),
          })),
        };
        
        console.log("DEBUG - Enviando formato:", formatoRequest);
        console.log("DEBUG - formatosDelBackend:", formatosDelBackend);
        
        // Buscar si este formato ya existe (usando formatosDelBackend cargados antes)
        const fmtExistente = formatosDelBackend.find(
          fe => fe.unidadInterna.id.toString() === fmt.unidadInternaId
        );
        
        console.log("DEBUG - fmtExistente encontrado:", fmtExistente);
        
        if (fmtExistente) {
          await actualizarFormatoVenta(productoId, fmtExistente.id, formatoRequest);
        } else {
          await crearFormatoVenta(productoId, formatoRequest);
        }
      }
      
      setSuccess(producto ? "Actualizado" : "Creado");
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e) {
      setError(getErrorMessage(e, "Error al guardar"));
    } finally {
      setSaving(false);
    }
  }

  const codigosSunatFiltrados = useMemo(() => {
    if (!codigoSunatSearch.trim()) return codigosSunat.slice(0, 30);
    const term = codigoSunatSearch.toLowerCase();
    return codigosSunat.filter(c => c.codigo.includes(term) || c.descripcion.toLowerCase().includes(term)).slice(0, 30);
  }, [codigosSunat, codigoSunatSearch]);

  if (loadingData) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Producto" size="lg">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={producto ? "Editar Producto" : "Nuevo Producto"} size="lg">
      <div className="space-y-3 text-sm">
        {/* Mensajes */}
        {error && <div className="p-2 bg-red-100 text-red-700 rounded text-xs">{error}</div>}
        {success && <div className="p-2 bg-green-100 text-green-700 rounded text-xs">{success}</div>}

        {/* ═══════════ DATOS DEL PRODUCTO ═══════════ */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-700 text-sm">Datos del Producto</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Codigo</label>
              <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition uppercase" placeholder="OPCIONAL" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripcion <span className="text-red-500">*</span></label>
              <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition uppercase" placeholder="NOMBRE DEL PRODUCTO" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Stock</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" min="0" step="1" onKeyDown={e => { if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault(); }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-white">
                <option value="">Sin categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo IGV</label>
              <select value={tipoAfectacionIgv} onChange={e => setTipoAfectacionIgv(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-white">
                <option value="10">Gravado</option>
                <option value="20">Exonerado</option>
                <option value="30">Inafecto</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 mb-1">Cod. SUNAT</label>
              <input type="text" value={codigoSunatSearch}
                onChange={e => { setCodigoSunatSearch(e.target.value); setShowCodigoSunatDropdown(true); }}
                onFocus={() => setShowCodigoSunatDropdown(true)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" placeholder="Buscar..." />
              {showCodigoSunatDropdown && codigosSunatFiltrados.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {codigosSunatFiltrados.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setCodigoProductoSunatId(c.id.toString()); setCodigoSunatSearch(`${c.codigo}`); setShowCodigoSunatDropdown(false); }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 truncate border-b border-slate-100 last:border-0">
                      <span className="font-medium text-indigo-600">{c.codigo}</span> - {c.descripcion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ FORMATOS DE VENTA ═══════════ */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-700 text-sm">Formatos de Venta</h3>
            </div>
            <button type="button" onClick={abrirNuevoFormato}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Formato
            </button>
          </div>

          {formatos.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm mb-2">No hay formatos de venta configurados</p>
              <button type="button" onClick={abrirNuevoFormato}
                className="text-indigo-600 underline text-sm">
                Agregar el primer formato
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Lista de formatos */}
              {formatos.map((fmt, idx) => {
                const unidad = unidadesInternas.find(u => u.id.toString() === fmt.unidadInternaId);
                return (
                  <div key={idx} 
                    className={`flex items-center justify-between p-3 rounded-lg border bg-white transition-all ${
                      fmt.esPrincipal ? "border-indigo-400 ring-2 ring-indigo-100 shadow-sm" : "border-slate-200 hover:border-slate-300"
                    }`}>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Unidad y precio */}
                      <div className="flex items-center gap-2">
                        {fmt.esPrincipal && (
                          <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-800">{unidad?.nombre || "-"}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">x{fmt.factorBase}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">
                        S/ {parseFloat(fmt.precioVenta || "0").toFixed(4)}
                      </span>
                      
                      {/* Escalas inline */}
                      {fmt.escalas.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-px h-4 bg-slate-300"></span>
                          {fmt.escalas.map((esc, eIdx) => (
                            <span key={eIdx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                              {esc.cantidadMinima}+ → S/{parseFloat(esc.precioUnitario || "0").toFixed(4)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-3">
                      <button type="button" onClick={() => abrirEditarFormato(idx)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!fmt.esPrincipal && (
                        <button type="button" onClick={() => hacerPrincipal(idx)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition" title="Hacer principal">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      )}
                      {formatos.length > 1 && (
                        <button type="button" onClick={() => eliminarFormato(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-2">
            <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-indigo-700">
              El formato principal (marcado con estrella) define la unidad base del producto para SUNAT.
              Cada formato puede tener sus propias escalas de precio por volumen.
            </p>
          </div>
        </div>

        {/* ═══════════ BOTONES ═══════════ */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button type="button" onClick={handleGuardar} disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm">
            {saving && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {producto ? "Guardar Cambios" : "Crear Producto"}
          </button>
        </div>
      </div>

      {/* Modal para agregar/editar formato */}
      <FormatoFormModal
        isOpen={showFormatoModal}
        formato={formatoEditIndex !== null ? formatos[formatoEditIndex] : null}
        unidadesInternas={unidadesInternas}
        pesoBasePrincipal={pesoBasePrincipal}
        permitirPrincipal={formatoEditIndex === null || !formatos[formatoEditIndex]?.esPrincipal}
        onClose={() => setShowFormatoModal(false)}
        onSave={guardarFormato}
      />
    </Modal>
  );
}
