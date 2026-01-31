import { useEffect, useMemo, useState } from "react";
import { createProducto, updateProducto, type Producto } from "../../../api/productosApi";
import { listUnidadesMedida, type UnidadMedida } from "../../../api/unidadesMedidaApi";
import { getAuth } from "../../../auth/authStore";
import { handleApiError } from "../../../api/errorHelper";
import Modal from "../../../components/Modal";

interface Props {
  producto: Producto | null;
  onClose: () => void;
  onSuccess: () => void;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function limitDecimalInput(value: string, maxDecimals: number) {
  if (value === "") return "";
  const cleaned = value.replace(/[^0-9.]/g, "");
  const hasDot = cleaned.includes(".");
  const parts = cleaned.split(".");
  const integerPart = parts[0] || "0";
  const decimals = parts.slice(1).join("");
  const trimmedDecimals = decimals.slice(0, Math.max(0, maxDecimals));
  return hasDot ? `${integerPart}.${trimmedDecimals}` : integerPart;
}

const CATEGORIAS_DEFAULT = [
  "PRODUCTOS",
  "SERVICIOS",
  "ALIMENTOS",
  "BEBIDAS",
  "TECNOLOGÍA",
  "ROPA",
  "OTROS",
];

const TIPOS_AFECTACION = [
  { code: "10", label: "Gravado - Operación Onerosa" },
  { code: "20", label: "Exonerado - Operación Onerosa" },
  { code: "30", label: "Inafecto - Operación Onerosa" },
  { code: "40", label: "Exportación" },
];

export default function ProductoFormModal({ producto, onClose, onSuccess }: Props) {
  const auth = getAuth();
  const empresaId = auth?.empresaId;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    descripcion: "",
    categoriaId: undefined as number | undefined,
    unidadMedidaId: undefined as number | undefined,
    tipoAfectacionIgv: "10",
    precioVenta: undefined as number | undefined,
    precioCompra: undefined as number | undefined,
    stock: 0,
  });

  const [showCategoriasDropdown, setShowCategoriasDropdown] = useState(false);
  const [unidadSearchFilter, setUnidadSearchFilter] = useState("");
  const [showUnidadesDropdown, setShowUnidadesDropdown] = useState(false);
  const [categoriaInput, setCategoriaInput] = useState("");
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [unidadesLoading, setUnidadesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        setUnidadesLoading(true);
        try {
          const search = unidadSearchFilter.trim();
          const data = await listUnidadesMedida(search ? { search } : {});
          if (!cancelled) setUnidades(data.filter((u) => u.activo));
        } catch (error) {
          handleApiError(error, "Error al cargar unidades de medida");
        } finally {
          if (!cancelled) setUnidadesLoading(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [unidadSearchFilter]);

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo: producto.codigo ?? "",
        descripcion: producto.descripcion,
        categoriaId: producto.categoria?.id,
        unidadMedidaId: producto.unidadMedida.id,
        tipoAfectacionIgv: producto.tipoAfectacionIgv,
        precioVenta: producto.precioVenta,
        precioCompra: producto.precioCompra,
        stock: producto.stock,
      });
      setCategoriaInput(producto.categoria?.nombre || "");
      setUnidadSearchFilter(producto.unidadMedida.descripcion);
      setShowUnidadesDropdown(false);
    }
  }, [producto]);

  const handleChange = (field: keyof typeof formData, value: string | number | boolean | undefined) => {
    if (field === "descripcion" && typeof value === "string") {
      value = value.toUpperCase();
    }
    setFormData({ ...formData, [field]: value });
  };

  const unidadesFiltradas = useMemo(() => {
    const q = normalizeText(unidadSearchFilter);
    if (!q) return unidades;
    // Filtrar SOLO por nombre (descripcion), no por código/abreviatura
    return unidades.filter((u) => normalizeText(u.descripcion).includes(q));
  }, [unidades, unidadSearchFilter]);

  function selectUnidadMedida(u: UnidadMedida) {
    setFormData((prev) => ({ ...prev, unidadMedidaId: u.id }));
    setUnidadSearchFilter(u.descripcion);
    setShowUnidadesDropdown(false);
  }

  function clearUnidadMedida() {
    setFormData((prev) => ({ ...prev, unidadMedidaId: undefined }));
    setUnidadSearchFilter("");
    setShowUnidadesDropdown(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    if (!formData.codigo || !formData.descripcion || !formData.unidadMedidaId) {
      alert("Por favor complete los campos requeridos");
      return;
    }

    if (formData.precioVenta === undefined) {
      alert("Por favor ingrese el precio de venta");
      return;
    }

    setLoading(true);
    try {
      if (producto) {
        await updateProducto(producto.id, {
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          precioVenta: formData.precioVenta,
          precioCompra: formData.precioCompra,
          tipoAfectacionIgv: formData.tipoAfectacionIgv,
          unidadMedidaId: formData.unidadMedidaId,
          categoriaId: formData.categoriaId,
          escalas: [
            {
              minCantidad: 1,
              precioVenta: formData.precioVenta,
            },
          ],
        });
      } else {
        await createProducto({
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          precioVenta: formData.precioVenta,
          precioCompra: formData.precioCompra,
          tipoAfectacionIgv: formData.tipoAfectacionIgv,
          unidadMedidaId: formData.unidadMedidaId,
          categoriaId: formData.categoriaId,
          escalas: [
            {
              minCantidad: 1,
              precioVenta: formData.precioVenta,
            },
          ],
        });
      }
      onSuccess();
    } catch (error) {
      handleApiError(error, "Error al guardar producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={producto ? "Editar Producto" : "Nuevo Producto"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fila 1: Código y Descripción */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => handleChange("codigo", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stock
            </label>
            <input
              type="number"
              value={formData.stock}
              disabled
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
          </div>
        </div>

        {/* Fila 2: Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value.toUpperCase())}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Fila 3: Categoría y Unidad SUNAT */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Categoría
            </label>
            <input
              type="text"
              value={categoriaInput}
              onChange={(e) => setCategoriaInput(e.target.value)}
              onFocus={() => setShowCategoriasDropdown(true)}
              onBlur={() => setTimeout(() => setShowCategoriasDropdown(false), 200)}
              placeholder="Elegir Categoría"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {showCategoriasDropdown && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                {CATEGORIAS_DEFAULT.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoriaInput(cat);
                      setShowCategoriasDropdown(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unidad de medida SUNAT <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={unidadSearchFilter}
                  onChange={(e) => {
                    setUnidadSearchFilter(e.target.value);
                    setShowUnidadesDropdown(true);
                  }}
                  onFocus={() => setShowUnidadesDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUnidadesDropdown(false), 200)}
                  placeholder="Escribir para buscar por nombre... (ej: kilogramo, metro, litro)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm pr-8 focus:border-blue-500 focus:outline-none"
                />
                {formData.unidadMedidaId && (
                  <button
                    type="button"
                    onClick={clearUnidadMedida}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Limpiar unidad de medida"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showUnidadesDropdown && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-300 bg-white shadow-lg">
                  {unidadesLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-600">Cargando unidades...</div>
                  ) : unidadesFiltradas.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      {unidadesFiltradas.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectUnidadMedida(u)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">{u.descripcion}</div>
                          <div className="text-xs text-slate-600">{u.codigo}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-600">Sin resultados</div>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-slate-500">
                {unidadesLoading
                  ? ""
                  : formData.unidadMedidaId
                    ? "Unidad seleccionada"
                    : "Seleccione una unidad de medida"}
              </p>
            </div>
          </div>
        </div>

        {/* Fila 4: Precios */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio Venta
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.precioVenta || ""}
              onChange={(e) => {
                const v = limitDecimalInput(e.target.value, 6);
                handleChange("precioVenta", v ? parseFloat(v) : undefined);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio Compra
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.precioCompra || ""}
              onChange={(e) => {
                const v = limitDecimalInput(e.target.value, 6);
                handleChange("precioCompra", v ? parseFloat(v) : undefined);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Fila 5: Tipo de afectación */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tipo de afectación IGV
          </label>
          <select
            value={formData.tipoAfectacionIgv}
            onChange={(e) => handleChange("tipoAfectacionIgv", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {TIPOS_AFECTACION.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
