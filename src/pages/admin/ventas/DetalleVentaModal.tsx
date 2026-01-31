import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { getComprobanteConDetalle, type ComprobanteConDetalle } from "../../../api/comprobantesApi";

interface DetalleVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobanteId: number;
}

export default function DetalleVentaModal({ isOpen, onClose, comprobanteId }: DetalleVentaModalProps) {
  const [detalle, setDetalle] = useState<ComprobanteConDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && comprobanteId) {
      cargarDetalle();
    }
  }, [isOpen, comprobanteId]);

  const cargarDetalle = async () => {
    setLoading(true);
    try {
      const data = await getComprobanteConDetalle(comprobanteId);
      setDetalle(data);
    } catch (error) {
      console.error("Error al cargar detalle:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoDocumento = (codigo: string) => {
    switch (codigo) {
      case '01': return 'FACTURA';
      case '03': return 'BOLETA';
      case '99': return 'VENTA INTERNA';
      default: return 'DOCUMENTO';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Venta" size="lg">
      {loading ? (
        <div className="flex flex-col justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-slate-600">Cargando detalle...</p>
        </div>
      ) : detalle ? (
        <div className="space-y-5">
          {/* Encabezado */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">Tipo de Documento</p>
                <p className="text-lg font-bold text-slate-800">{getTipoDocumento(detalle.tipoDoc)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">Serie - Número</p>
                <p className="text-lg font-bold font-mono text-slate-800">{detalle.serie}-{detalle.correlativo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">Estado</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  detalle.estado === 'ACEPTADO' ? 'bg-green-50 text-green-700 border border-green-200' :
                  detalle.estado === 'RECHAZADO' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {detalle.estado || 'PENDIENTE'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">Fecha de Emisión</p>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(detalle.fechaEmision).toLocaleDateString('es-PE', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-slate-50 border-l-4 border-slate-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-slate-200 rounded-lg p-2">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cliente</h3>
                <p className="text-base font-bold text-slate-800">{detalle.receptorNombre || 'Cliente General'}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {detalle.receptorTipoDoc === '6' ? 'RUC' : detalle.receptorTipoDoc === '1' ? 'DNI' : 'Documento'}: 
                  <span className="font-mono font-semibold ml-1">{detalle.receptorNroDoc || 'N/A'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Productos / Servicios</h3>
                <span className="ml-auto text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  {detalle.items.length} {detalle.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wide">Und.</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">P. Unitario</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalle.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500 font-medium">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{item.descripcion}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-slate-600 font-medium uppercase">{item.unidad}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-700">{item.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">
                        <span className="font-mono">S/ {item.precioUnitario.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-mono font-bold text-slate-800">S/ {item.totalItem.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <div className="space-y-3">
              {detalle.opGravada > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Op. Gravada:</span>
                  <span className="font-mono font-semibold text-slate-700">S/ {detalle.opGravada.toFixed(2)}</span>
                </div>
              )}
              {detalle.opExonerada > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Op. Exonerada:</span>
                  <span className="font-mono font-semibold text-slate-700">S/ {detalle.opExonerada.toFixed(2)}</span>
                </div>
              )}
              {detalle.opInafecta > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Op. Inafecta:</span>
                  <span className="font-mono font-semibold text-slate-700">S/ {detalle.opInafecta.toFixed(2)}</span>
                </div>
              )}
              {detalle.igv > 0 && (
                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-3">
                  <span className="text-slate-600 font-medium">IGV 18%:</span>
                  <span className="font-mono font-semibold text-slate-700">S/ {detalle.igv.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-slate-800">TOTAL:</span>
                <span className="text-2xl font-black font-mono text-slate-900">S/ {detalle.totalComprobante.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-700 font-semibold">No se pudo cargar el detalle</p>
          <p className="text-sm text-slate-500 mt-1">Intenta nuevamente más tarde</p>
        </div>
      )}
    </Modal>
  );
}
