import { useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import UnidadMedidaFormModal from "./UnidadMedidaFormModal";
import type { UnidadMedidaInterna } from "../../../api/formatosApi";

export interface EscalaForm {
  cantidadMinima: string;
  precioUnitario: string;
}

export interface FormatoForm {
  unidadInternaId: string;
  factorBase: string;
  precioVenta: string;
  precioCompra: string;
  codigoBarra: string;
  pesoUnitario: string;
  esPrincipal: boolean;
  escalas: EscalaForm[];
}

interface Props {
  isOpen: boolean;
  formato: FormatoForm | null;
  unidadesInternas: UnidadMedidaInterna[];
  pesoBasePrincipal?: number;
  permitirPrincipal: boolean;
  onClose: () => void;
  onSave: (formato: FormatoForm) => void;
}

function findUnidadDefault(unidadesInternas: UnidadMedidaInterna[]): UnidadMedidaInterna | undefined {
  return unidadesInternas.find(
    (u) => u.nombre.toLowerCase() === "unidad" || u.abreviatura.toLowerCase() === "und",
  );
}

function computePesoUnitario(pesoBasePrincipal: number | undefined, factorBase: string): string {
  const factor = parseInt(factorBase) || 1;
  if (!pesoBasePrincipal) return "";
  return (pesoBasePrincipal * factor).toFixed(4);
}

export default function FormatoFormModal({ 
  isOpen, formato, unidadesInternas, pesoBasePrincipal, permitirPrincipal, onClose, onSave 
}: Props) {
  const [showCrearUnidadModal, setShowCrearUnidadModal] = useState(false);
  const [unidadesKey, setUnidadesKey] = useState(0);

  const handleUnidadCreada = () => {
    setUnidadesKey(prev => prev + 1);
  };

  // Función para limitar a 6 decimales
  const limitDecimal = (value: string, maxDecimals: number = 6): string => {
    if (!value) return value;
    const parts = value.split('.');
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    return value;
  };

  const resetKey = useMemo(() => {
    // Forzar remount del formulario al abrir y/o cambiar el formato
    const fmtKey = formato
      ? `${formato.unidadInternaId}|${formato.factorBase}|${formato.precioVenta}|${formato.codigoBarra}|${formato.esPrincipal}|${formato.escalas.length}`
      : "new";
    const unidadesKeyStr = `${unidadesInternas.length}:${unidadesKey}`;
    return `${isOpen ? "open" : "closed"}:${fmtKey}:${unidadesKeyStr}`;
  }, [isOpen, formato, unidadesInternas.length, unidadesKey]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={formato ? "Editar Formato" : "Nuevo Formato"} size="lg">
        {isOpen ? (
          <FormatoFormBody
            key={resetKey}
            formato={formato}
            unidadesInternas={unidadesInternas}
            pesoBasePrincipal={pesoBasePrincipal}
            permitirPrincipal={permitirPrincipal}
            onClose={onClose}
            onSave={onSave}
            limitDecimal={limitDecimal}
            onCrearUnidad={() => setShowCrearUnidadModal(true)}
          />
        ) : null}
      </Modal>

      <UnidadMedidaFormModal
        isOpen={showCrearUnidadModal}
        onClose={() => setShowCrearUnidadModal(false)}
        onUnidadCreada={handleUnidadCreada}
      />
    </>
  );
}

function FormatoFormBody({
  formato,
  unidadesInternas,
  pesoBasePrincipal,
  permitirPrincipal,
  onClose,
  onSave,
  limitDecimal,
  onCrearUnidad,
}: {
  formato: FormatoForm | null;
  unidadesInternas: UnidadMedidaInterna[];
  pesoBasePrincipal?: number;
  permitirPrincipal: boolean;
  onClose: () => void;
  onSave: (formato: FormatoForm) => void;
  limitDecimal: (value: string, maxDecimals?: number) => string;
  onCrearUnidad: () => void;
}) {
  const unidadDefault = useMemo(() => findUnidadDefault(unidadesInternas), [unidadesInternas]);

  const [unidadInternaId, setUnidadInternaId] = useState(() => {
    if (formato) return formato.unidadInternaId;
    return unidadDefault?.id.toString() || "";
  });
  const [factorBase, setFactorBase] = useState(() => (formato ? formato.factorBase : "1"));
  const [precioVenta, setPrecioVenta] = useState(() => (formato ? formato.precioVenta : ""));
  const [precioCompra, setPrecioCompra] = useState(() => (formato ? formato.precioCompra : ""));
  const [codigoBarra, setCodigoBarra] = useState(() => (formato ? formato.codigoBarra : ""));
  const [pesoUnitario, setPesoUnitario] = useState(() => {
    if (formato) return formato.pesoUnitario;
    return "";
  });
  const [esPrincipal, setEsPrincipal] = useState(() => (formato ? formato.esPrincipal : false));
  const [escalas, setEscalas] = useState<EscalaForm[]>(() => (formato ? [...formato.escalas] : []));
  const [error, setError] = useState<string | null>(null);

  function agregarEscala() {
    setEscalas([...escalas, { cantidadMinima: "", precioUnitario: "" }]);
  }

  function eliminarEscala(idx: number) {
    setEscalas(escalas.filter((_, i) => i !== idx));
  }

  function actualizarEscala(idx: number, campo: keyof EscalaForm, valor: string) {
    const nuevas = [...escalas];
    nuevas[idx] = { ...nuevas[idx], [campo]: valor };
    setEscalas(nuevas);
  }

  function handleGuardar() {
    setError(null);
    
    if (!unidadInternaId) {
      setError("Debe seleccionar una unidad de medida");
      return;
    }
    if (!precioVenta || parseFloat(precioVenta) <= 0) {
      setError("El precio de venta es requerido");
      return;
    }
    if (!factorBase || parseInt(factorBase) < 1) {
      setError("El factor debe ser al menos 1");
      return;
    }

    // Validar escalas: a mayor cantidad, menor precio
    const escalasValidas = escalas.filter(e => e.cantidadMinima && e.precioUnitario);
    if (escalasValidas.length > 0) {
      // Ordenar por cantidad ascendente
      const escalasOrdenadas = [...escalasValidas].sort(
        (a, b) => parseInt(a.cantidadMinima) - parseInt(b.cantidadMinima)
      );
      
      // El precio base debe ser mayor que el precio de la primera escala
      const precioBase = parseFloat(precioVenta);
      const primerEscalaPrecio = parseFloat(escalasOrdenadas[0].precioUnitario);
      if (primerEscalaPrecio >= precioBase) {
        setError(`El precio de escala (${escalasOrdenadas[0].cantidadMinima}+) debe ser menor al precio base S/ ${precioBase.toFixed(2)}`);
        return;
      }
      
      // Validar que cada escala siguiente tenga precio menor
      for (let i = 1; i < escalasOrdenadas.length; i++) {
        const cantidadActual = parseInt(escalasOrdenadas[i].cantidadMinima);
        const precioActual = parseFloat(escalasOrdenadas[i].precioUnitario);
        const cantidadAnterior = parseInt(escalasOrdenadas[i - 1].cantidadMinima);
        const precioAnterior = parseFloat(escalasOrdenadas[i - 1].precioUnitario);
        
        if (precioActual >= precioAnterior) {
          setError(`Escala ${cantidadActual}+ (S/ ${precioActual.toFixed(2)}) debe tener precio menor que escala ${cantidadAnterior}+ (S/ ${precioAnterior.toFixed(2)})`);
          return;
        }
      }
    }

    const nuevoFormato: FormatoForm = {
      unidadInternaId,
      factorBase,
      precioVenta,
      precioCompra,
      codigoBarra,
      pesoUnitario,
      esPrincipal,
      escalas: escalasValidas,
    };

    onSave(nuevoFormato);
    onClose();
  }

  const unidadSeleccionada = unidadesInternas.find(u => u.id.toString() === unidadInternaId);

  return (
      <div className="space-y-4 text-sm">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Información del Formato - Todo en un solo grupo */}
        <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-700 text-xs">Información del Formato</h4>
          </div>
          
          <div className="space-y-1.5">
            {/* Fila 1: Unidad, Factor, Precio Venta */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Unidad <span className="text-red-500">*</span></label>
                <div className="flex gap-0.5">
                  <select value={unidadInternaId} onChange={e => setUnidadInternaId(e.target.value)}
                    className="flex-1 px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white">
                    <option value="">Seleccionar...</option>
                    {unidadesInternas.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onCrearUnidad}
                    className="px-1.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition flex items-center gap-0.5"
                    title="Nueva unidad"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                {unidadSeleccionada && (
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    SUNAT: {unidadSeleccionada.unidadSunat.codigo}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Factor <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={factorBase}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^0-9]/g, "");
                    setFactorBase(next);
                    if (!esPrincipal && pesoBasePrincipal) {
                      setPesoUnitario(computePesoUnitario(pesoBasePrincipal, next));
                    }
                  }}
                  onKeyDown={e => { if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault(); }}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" min="1" step="1" placeholder="1" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Precio Venta <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-slate-400 font-medium text-xs">S/</span>
                  <input type="number" step="0.000001" min="0" value={precioVenta} onChange={e => setPrecioVenta(limitDecimal(e.target.value))}
                    onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    className="w-full pl-7 pr-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" placeholder="0.00" />
                </div>
              </div>
            </div>

            {/* Fila 2: Precio Compra, Peso, Código */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Precio Compra</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-slate-400 font-medium text-xs">S/</span>
                  <input type="number" step="0.000001" min="0" value={precioCompra} onChange={e => setPrecioCompra(limitDecimal(e.target.value))}
                    onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    className="w-full pl-7 pr-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Peso (kg)</label>
                <input type="number" step="0.0001" min="0" value={pesoUnitario} onChange={e => setPesoUnitario(e.target.value)}
                  onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                  className={`w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${!esPrincipal && pesoBasePrincipal ? "bg-slate-50" : ""}`}
                  placeholder="0.0000" />
                {!esPrincipal && pesoBasePrincipal && (
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    Auto: {pesoBasePrincipal} x {factorBase || 1}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Código de Barras</label>
                <input type="text" value={codigoBarra} onChange={e => setCodigoBarra(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent transition uppercase" placeholder="EAN/UPC" />
              </div>
            </div>

            {/* Es Principal */}
            {permitirPrincipal && (
              <div className="flex items-center gap-1.5 p-1.5 bg-blue-100/50 rounded border border-blue-200">
                <input
                  type="checkbox"
                  id="esPrincipal"
                  checked={esPrincipal}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEsPrincipal(checked);
                    if (!checked && pesoBasePrincipal) {
                      setPesoUnitario(computePesoUnitario(pesoBasePrincipal, factorBase));
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500" />
                <label htmlFor="esPrincipal" className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-blue-800 text-[11px]">Formato Principal</span>
                  <span className="text-[9px] text-blue-600">(unidad base)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Escalas de Precio */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-700 text-sm">Escalas de Precio</h4>
            </div>
            <button type="button" onClick={agregarEscala}
              className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>
          </div>

          {escalas.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-lg border border-dashed border-blue-300">
              <svg className="w-8 h-8 text-blue-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-slate-500 text-xs">Sin escalas de precio</p>
              <p className="text-slate-400 text-[10px] mt-1">El precio base aplica para cualquier cantidad</p>
            </div>
          ) : (
            <div className="space-y-2 bg-white rounded-lg p-3 border border-blue-100">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
                <span className="col-span-5">Desde cantidad</span>
                <span className="col-span-5">Precio unitario</span>
                <span className="col-span-2"></span>
              </div>
              {escalas.map((esc, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input type="number" value={esc.cantidadMinima} onChange={e => actualizarEscala(idx, "cantidadMinima", e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => { if (e.key === '.' || e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    className="col-span-5 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" min="1" step="1" placeholder="1" />
                  <div className="col-span-5 relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-medium">S/</span>
                    <input type="number" step="0.000001" min="0" value={esc.precioUnitario} onChange={e => actualizarEscala(idx, "precioUnitario", limitDecimal(e.target.value))}
                      onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                      className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" placeholder="0.000000" />
                  </div>
                  <button type="button" onClick={() => eliminarEscala(idx)}
                    className="col-span-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 p-2.5 bg-blue-100/50 rounded-lg flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700">
              Las escalas definen precios especiales segun cantidad.<br/>
              Ejemplo: Desde 10 unidades S/ 0.80 | Desde 50 S/ 0.70
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-700">
            Cancelar
          </button>
          <button type="button" onClick={handleGuardar}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {formato ? "Guardar Cambios" : "Agregar Formato"}
          </button>
        </div>
      </div>
  );
}
