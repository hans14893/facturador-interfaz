import { useState, useEffect, useCallback } from "react";
import {
  listarFormatosProducto,
  calcularPrecioFormato,
} from "../../../api/formatosApi";
import type { ProductoFormatoVenta } from "../../../api/formatosApi";
import type { Producto } from "../../../api/productosApi";

interface Props {
  producto: Producto;
  cantidadInicial: number;
  formatoIdInicial?: number;
  onConfirm: (cantidad: number, formatoId: number | null, precioUnitario: number, pesoTotal?: number, codigoUnidadSunat?: string) => void;
  onCancel: () => void;
}

export default function CantidadFormatoModal({
  producto,
  cantidadInicial,
  formatoIdInicial,
  onConfirm,
  onCancel,
}: Props) {
  const [cantidad, setCantidad] = useState(cantidadInicial.toString());
  const [formatos, setFormatos] = useState<ProductoFormatoVenta[]>([]);
  const [formatoId, setFormatoId] = useState<number | null>(formatoIdInicial || null);
  const [precioCalculado, setPrecioCalculado] = useState<number | null>(null);
  const [pesoTotal, setPesoTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);

  const cargarFormatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listarFormatosProducto(producto.id);
      const activos = data.filter((f) => f.activo);
      setFormatos(activos);

      // Si hay formatos, seleccionar el principal o el primero
      if (activos.length > 0) {
        const principal = activos.find((f) => f.esPrincipal) || activos[0];
        setFormatoId(formatoIdInicial || principal.id);
      }
    } catch (err) {
      console.error("Error cargando formatos:", err);
      setFormatos([]);
    } finally {
      setLoading(false);
    }
  }, [producto.id, formatoIdInicial]);

  const calcularPrecio = useCallback(async () => {
    if (!formatoId || !cantidad) return;

    const cantNum = parseFloat(cantidad);
    if (!cantNum || cantNum <= 0) return;

    try {
      setCalculando(true);
      const result = await calcularPrecioFormato(producto.id, formatoId, cantNum);
      setPrecioCalculado(result.precioUnitario);
      setPesoTotal(result.pesoTotal || null);
    } catch (err) {
      console.error("Error calculando precio:", err);
      // Si falla el cálculo, usar precio del formato o del producto
      const formato = formatos.find((f) => f.id === formatoId);
      setPrecioCalculado(formato?.precioBase || producto.precioVenta);
    } finally {
      setCalculando(false);
    }
  }, [cantidad, formatoId, formatos, producto.id, producto.precioVenta]);

  useEffect(() => {
    cargarFormatos();
  }, [cargarFormatos]);

  useEffect(() => {
    void calcularPrecio();
  }, [calcularPrecio]);

  const handleConfirm = () => {
    const cantNum = parseFloat(cantidad) || 1;
    const formato = formatos.find(f => f.id === formatoId);
    const precio = precioCalculado || formato?.precioBase || producto.precioVenta;
    const codigoSunat = formato?.unidadInterna?.unidadSunat?.codigo || producto.unidadMedida?.codigo;
    
    onConfirm(cantNum, formatoId, precio, pesoTotal || undefined, codigoSunat);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const formatoSeleccionado = formatos.find(f => f.id === formatoId);

  // Si no hay formatos configurados, mostrar modal simple de cantidad
  if (!loading && formatos.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-4 border-2 border-green-500">
          <div className="text-xs text-slate-500 mb-2">
            {producto.descripcion}
          </div>
          
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border-2 border-green-500 px-3 py-2 text-lg font-bold text-center focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
            placeholder="1"
            autoFocus
          />
          
          <div className="mt-3 text-center text-sm text-slate-600">
            Precio: S/ {producto.precioVenta.toFixed(2)}
          </div>
          
          <div className="text-xs text-slate-500 mt-2 text-center">
            Enter: Confirmar | Esc: Cancelar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 border-2 border-indigo-500">
        {/* Header */}
        <div className="mb-3">
          <div className="font-semibold text-slate-800 text-sm truncate">
            {producto.descripcion}
          </div>
          <div className="text-xs text-slate-500">
            Selecciona formato y cantidad
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Selector de formato */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Formato de Venta
              </label>
              <div className="grid grid-cols-3 gap-2">
                {formatos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormatoId(f.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      formatoId === f.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <div>{f.unidadInterna.abreviatura}</div>
                    {f.factorBase > 1 && (
                      <div className="text-xs opacity-75">x{f.factorBase}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Info del formato seleccionado */}
            {formatoSeleccionado && (
              <div className="mb-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>1 {formatoSeleccionado.unidadInterna.nombre}</span>
                  <span>= {formatoSeleccionado.factorBase} unid. base</span>
                </div>
                {formatoSeleccionado.escalas && formatoSeleccionado.escalas.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-slate-200">
                    <span className="font-medium">Escalas:</span>
                    {formatoSeleccionado.escalas.slice(0, 3).map((e, i) => (
                      <span key={i} className="ml-2">
                        {e.cantidadMinima}+ → S/{e.precioUnitario.toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input de cantidad */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border-2 border-indigo-500 px-3 py-2 text-xl font-bold text-center focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="1"
                autoFocus
              />
            </div>

            {/* Resumen de precio */}
            <div className="p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Precio unitario:</span>
                <span className="font-semibold text-slate-800">
                  {calculando ? (
                    <span className="text-xs text-slate-500">Calculando...</span>
                  ) : (
                    `S/ ${(precioCalculado || formatoSeleccionado?.precioBase || producto.precioVenta).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-bold text-lg text-indigo-700">
                  S/ {((parseFloat(cantidad) || 1) * (precioCalculado || formatoSeleccionado?.precioBase || producto.precioVenta)).toFixed(2)}
                </span>
              </div>
              {pesoTotal && (
                <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-indigo-200">
                  <span className="text-slate-500">Peso total:</span>
                  <span className="font-medium text-slate-700">{pesoTotal.toFixed(4)} kg</span>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={calculando || !cantidad}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                Confirmar
              </button>
            </div>

            <div className="text-xs text-slate-500 mt-2 text-center">
              Enter: Confirmar | Esc: Cancelar
            </div>
          </>
        )}
      </div>
    </div>
  );
}
