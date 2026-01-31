import { useMemo, useState, useEffect, useRef } from "react";
import { listProductos, deleteProducto, importarProductos, type ImportProductosResult } from "../../../api/productosApi";
import { listCategorias, createCategoria, updateCategoria, deleteCategoria } from "../../../api/categoriasApi";
import XLSX from "xlsx-js-style";
import type { Producto } from "../../../api/productosApi";
import type { Categoria } from "../../../api/categoriasApi";
import { getErrorMessage } from "../../../api/errorHelper";
import { btnDeleteSm, btnEditSm } from "../../../ui/buttonStyles";
import ProductoFormModal from "./ProductoFormModal";
import ConfirmModal from "../../../components/ConfirmModal";

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGestionCategoriasModal, setShowGestionCategoriasModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");

  // Estado para el modal de producto con formatos
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [productoParaEditar, setProductoParaEditar] = useState<Producto | null>(null);

  // Estado para el modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [showDeleteCatModal, setShowDeleteCatModal] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<Categoria | null>(null);

  // Estados para importación de productos
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState<ImportProductosResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states - Categoria
  const [catNombre, setCatNombre] = useState("");
  const [catDescripcion, setCatDescripcion] = useState("");

  // Form states - Edición de categoría en modal
  const [editCatNombre, setEditCatNombre] = useState("");
  const [editCatDescripcion, setEditCatDescripcion] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        listProductos(),
        listCategorias(),
      ]);
      setProductos(prods);
      setCategorias(cats);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando datos"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProducto(id: number) {
    try {
      await deleteProducto(id);
      setSuccess("Producto eliminado correctamente");
      setShowDeleteModal(false);
      setProductoAEliminar(null);
      await loadData();
    } catch (e) {
      setErr(getErrorMessage(e, "Error eliminando producto"));
    }
  }

  async function handleImportarProductos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    setImportResult(null);
    setErr(null);
    try {
      const result = await importarProductos(file);
      setImportResult(result);
      if (result.importados > 0 || result.actualizados > 0 || (result.formatos && result.formatos > 0)) {
        const msgs = [];
        if (result.importados > 0) msgs.push(`${result.importados} nuevos`);
        if (result.actualizados > 0) msgs.push(`${result.actualizados} actualizados`);
        if (result.formatos && result.formatos > 0) msgs.push(`${result.formatos} formatos`);
        setSuccess(`Importación completada: ${msgs.join(", ")}`);
        await loadData();
      }
    } catch (error) {
      setErr(getErrorMessage(error, "Error al importar productos"));
    } finally {
      setImportando(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // ──────────────── CATEGORÍAS ────────────────

  async function handleSaveCategoria(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!catNombre.trim()) {
      setErr("El nombre de la categoría es requerido");
      return;
    }
    try {
      await createCategoria({ nombre: catNombre, descripcion: catDescripcion || undefined });
      setSuccess("Categoria creada");
      setCatNombre("");
      setCatDescripcion("");
      await loadData();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error al crear categoria"));
    }
  }

  function startEditCategoria(cat: Categoria) {
    setEditingCategoria(cat);
    setEditCatNombre(cat.nombre);
    setEditCatDescripcion(cat.descripcion || "");
  }

  function cancelEditCategoria() {
    setEditingCategoria(null);
    setEditCatNombre("");
    setEditCatDescripcion("");
  }

  async function handleUpdateCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategoria) return;
    setErr(null);
    if (!editCatNombre.trim()) {
      setErr("El nombre de la categoría es requerido");
      return;
    }
    try {
      await updateCategoria(editingCategoria.id, { nombre: editCatNombre, descripcion: editCatDescripcion || undefined });
      setSuccess("Categoria actualizada");
      cancelEditCategoria();
      await loadData();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error al actualizar categoría"));
    }
  }

  async function handleDeleteCategoria(id: number) {
    try {
      await deleteCategoria(id);
      setSuccess("Categoría eliminada correctamente");
      setShowDeleteCatModal(false);
      setCategoriaAEliminar(null);
      await loadData();
    } catch (e) {
      setErr(getErrorMessage(e, "Error eliminando categoría"));
    }
  }

  // Productos filtrados
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = !searchTerm || 
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategoria = !categoriaFilter || p.categoria?.id.toString() === categoriaFilter;
      return matchSearch && matchCategoria;
    });
  }, [productos, searchTerm, categoriaFilter]);

  function descargarPlantilla() {
    // Estilos para encabezados
    const headerObligatorio = {
      fill: { fgColor: { rgb: "DC2626" } }, // Rojo para obligatorios
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" }
    };
    const headerOpcional = {
      fill: { fgColor: { rgb: "3B82F6" } }, // Azul para opcionales
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" }
    };

    // Crear libro y hoja
    const wb = XLSX.utils.book_new();
    
    // Datos con cabeceras y ejemplos
    const ws = XLSX.utils.aoa_to_sheet([
      ["CODIGO", "DESCRIPCION", "STOCK", "CATEGORIA", "UNIDAD_INTERNA", "FACTOR", "PRECIO_VENTA", "PRECIO_COMPRA", "ES_PRINCIPAL", "TIPO_IGV"],
      ["PROD001", "Arroz Extra", 100, "Abarrotes", "UND", 1, 5.50, 4.20, "SI", "10"],
      ["PROD001", "", "", "", "CJ", 12, 60.00, 48.00, "NO", ""],
      ["PROD002", "Gaseosa Cola", 50, "Bebidas", "UND", 1, 3.00, 2.20, "SI", "10"],
      ["PROD002", "", "", "", "PK", 6, 16.00, 12.00, "NO", ""],
      ["", "Producto Nuevo", 20, "", "UND", 1, 10.00, 8.00, "SI", "20"],
    ]);

    // Aplicar estilos a encabezados (fila 1)
    // Obligatorios: B (DESCRIPCION), E (UNIDAD_INTERNA), G (PRECIO_VENTA)
    // Opcionales: A, C, D, F, H, I, J
    const colsObligatorios = ["B1", "E1", "G1"]; // DESCRIPCION, UNIDAD_INTERNA, PRECIO_VENTA
    const colsOpcionales = ["A1", "C1", "D1", "F1", "H1", "I1", "J1"]; // Resto
    
    colsObligatorios.forEach(cell => {
      if (ws[cell]) ws[cell].s = headerObligatorio;
    });
    colsOpcionales.forEach(cell => {
      if (ws[cell]) ws[cell].s = headerOpcional;
    });

    // Configurar anchos de columna
    ws["!cols"] = [
      { wch: 12 },  // CODIGO
      { wch: 25 },  // DESCRIPCION
      { wch: 8 },   // STOCK
      { wch: 15 },  // CATEGORIA
      { wch: 14 },  // UNIDAD_INTERNA
      { wch: 8 },   // FACTOR
      { wch: 12 },  // PRECIO_VENTA
      { wch: 12 },  // PRECIO_COMPRA
      { wch: 12 },  // ES_PRINCIPAL
      { wch: 10 },  // TIPO_IGV
    ];

    // Hoja de instrucciones con estilos
    const instrucciones = [
      ["INSTRUCCIONES DE USO"],
      [""],
      ["LEYENDA DE COLORES:"],
      ["🔴 ROJO", "Campos OBLIGATORIOS"],
      ["🔵 AZUL", "Campos opcionales"],
      [""],
      ["COLUMNAS OBLIGATORIAS:"],
      ["DESCRIPCION", "Nombre del producto (requerido en primera fila)"],
      ["UNIDAD_INTERNA", "Abreviatura: UND, CJ, PK, DOC, KG, etc."],
      ["PRECIO_VENTA", "Precio de venta para este formato"],
      [""],
      ["COLUMNAS OPCIONALES:"],
      ["CODIGO", "Código único del producto"],
      ["STOCK", "Cantidad en stock (solo primera fila)"],
      ["CATEGORIA", "Nombre de categoría (se crea si no existe)"],
      ["FACTOR", "Factor de conversión (UND=1, CJ=12, etc.)"],
      ["PRECIO_COMPRA", "Precio de compra"],
      ["ES_PRINCIPAL", "SI o NO - Solo uno por producto"],
      ["TIPO_IGV", "Tipo afectación IGV: 10 Gravado, 20 Exonerado, 30 Inafecto (opcional, por defecto 10)"],
      [""],
      ["NOTAS:"],
      ["- Un producto puede tener múltiples formatos (filas con mismo código)"],
      ["- La primera fila de cada producto debe tener DESCRIPCION"],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instrucciones);
    
    // Estilo para título de instrucciones
    if (wsInst["A1"]) {
      wsInst["A1"].s = { font: { bold: true, sz: 14, color: { rgb: "1E40AF" } } };
    }
    // Estilo para leyenda rojo
    if (wsInst["A4"]) {
      wsInst["A4"].s = { font: { bold: true, color: { rgb: "DC2626" } } };
    }
    // Estilo para leyenda azul  
    if (wsInst["A5"]) {
      wsInst["A5"].s = { font: { bold: true, color: { rgb: "3B82F6" } } };
    }
    
    wsInst["!cols"] = [{ wch: 18 }, { wch: 55 }];

    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");

    // Descargar
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  }

  const btnPrimary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700";
  const btnSecondary = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">Gestiona tu catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportarProductos}
            className="hidden"
            id="import-productos-file"
          />
          <label
            htmlFor="import-productos-file"
            className={`${btnSecondary} flex items-center gap-2 cursor-pointer ${importando ? "opacity-50 pointer-events-none" : ""}`}
          >
            {importando ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar Excel
              </>
            )}
          </label>
          <button
            onClick={descargarPlantilla}
            className={`${btnSecondary} flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Formato
          </button>
          <button
            onClick={() => setShowGestionCategoriasModal(true)}
            className={`${btnSecondary} flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Categorias
          </button>
          <button
            onClick={() => {
              setProductoParaEditar(null);
              setShowProductoModal(true);
            }}
            className={`${btnPrimary} flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {importResult && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <div className="font-semibold text-slate-800">Resultado de importación</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
            <span>
              Importados: <span className="font-semibold">{importResult.importados}</span>
            </span>
            <span>
              Actualizados: <span className="font-semibold">{importResult.actualizados}</span>
            </span>
            {typeof importResult.formatos === "number" && (
              <span>
                Formatos: <span className="font-semibold">{importResult.formatos}</span>
              </span>
            )}
          </div>
          {importResult.errores?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-red-700">Errores ({importResult.errores.length})</div>
              <ul className="mt-1 list-disc pl-5 text-red-700">
                {importResult.errores.slice(0, 20).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
              {importResult.errores.length > 20 && (
                <div className="mt-1 text-xs text-slate-500">
                  Mostrando 20 de {importResult.errores.length} errores.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Código</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Descripción</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Categoría</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Precio</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Stock</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {productosFiltrados.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-xs">{p.codigo || "-"}</td>
                <td className="px-3 py-2 text-xs font-medium">{p.descripcion}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{p.categoria?.nombre || '-'}</td>
                <td className="px-3 py-2 text-right text-xs">S/ {p.precioVenta.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-xs">{p.stock.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProductoParaEditar(p);
                        setShowProductoModal(true);
                      }}
                      className={btnEditSm}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductoAEliminar(p);
                        setShowDeleteModal(true);
                      }}
                      className={btnDeleteSm}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productosFiltrados.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            No hay productos para mostrar
          </div>
        )}
      </div>

      {/* Modal de Gestión de Categorías */}
      {showGestionCategoriasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Gestionar Categorías</h2>
            
            {/* Form para crear categoría */}
            <form onSubmit={handleSaveCategoria} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-semibold mb-3">Nueva Categoría</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={catNombre}
                    onChange={(e) => setCatNombre(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                    placeholder="EJ: BEBIDAS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
                  <input
                    type="text"
                    value={catDescripcion}
                    onChange={(e) => setCatDescripcion(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                    placeholder="OPCIONAL"
                  />
                </div>
                <button type="submit" className={btnPrimary}>
                  Crear Categoría
                </button>
              </div>
            </form>

            {/* Lista de categorías */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Categorías existentes</h3>
              {categorias.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No hay categorías creadas</p>
              ) : (
                categorias.map(cat => (
                  <div key={cat.id} className="border rounded-lg p-3">
                    {editingCategoria?.id === cat.id ? (
                      <form onSubmit={handleUpdateCategoria} className="space-y-2">
                        <input
                          type="text"
                          value={editCatNombre}
                          onChange={(e) => setEditCatNombre(e.target.value.toUpperCase())}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm uppercase"
                        />
                        <input
                          type="text"
                          value={editCatDescripcion}
                          onChange={(e) => setEditCatDescripcion(e.target.value.toUpperCase())}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm uppercase"
                          placeholder="DESCRIPCION"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="text-sm text-blue-600 hover:underline">
                            Guardar
                          </button>
                          <button type="button" onClick={cancelEditCategoria} className="text-sm text-slate-500 hover:underline">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900">{cat.nombre}</h3>
                          {cat.descripcion && (
                            <p className="text-sm text-slate-500 mt-1">{cat.descripcion}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            type="button"
                            onClick={() => startEditCategoria(cat)}
                            className={btnEditSm}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoriaAEliminar(cat);
                              setShowDeleteCatModal(true);
                            }}
                            className={btnDeleteSm}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowGestionCategoriasModal(false);
                  cancelEditCategoria();
                }}
                className={btnSecondary}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Producto con Formatos Integrados */}
      <ProductoFormModal
        isOpen={showProductoModal}
        producto={productoParaEditar}
        onClose={() => {
          setShowProductoModal(false);
          setProductoParaEditar(null);
        }}
        onSaved={() => {
          loadData();
          setSuccess("Producto guardado correctamente");
        }}
      />

      {/* Modal de confirmación para eliminar producto */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setProductoAEliminar(null);
        }}
        onConfirm={() => productoAEliminar && handleDeleteProducto(productoAEliminar.id)}
        title="🗑️ Eliminar Producto"
        message={
          productoAEliminar
            ? `¿Estás seguro de eliminar "${productoAEliminar.descripcion}"?\n\nEsta acción no se puede deshacer y se perderán todos los formatos y escalas de precio asociados.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de confirmación para eliminar categoría */}
      <ConfirmModal
        isOpen={showDeleteCatModal}
        onClose={() => {
          setShowDeleteCatModal(false);
          setCategoriaAEliminar(null);
        }}
        onConfirm={() => categoriaAEliminar && handleDeleteCategoria(categoriaAEliminar.id)}
        title="🗑️ Eliminar Categoría"
        message={
          categoriaAEliminar
            ? `¿Estás seguro de eliminar la categoría "${categoriaAEliminar.nombre}"?\n\nLos productos de esta categoría quedarán sin categoría asignada.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
