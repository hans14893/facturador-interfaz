import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { comprasApi } from "../../../api/comprasApi";
import type { Compra, ComprasQuery } from "../../../api/comprasApi";
import { getAuth } from "../../../auth/authStore";
import { handleApiError } from "../../../api/errorHelper";
import StatusPill from "../../../components/StatusPill";
import DetalleCompraModal from "./DetalleCompraModal";
import ConfirmModal from "../../../components/ConfirmModal";

export default function ComprasPage() {
  const navigate = useNavigate();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const [modalDetalle, setModalDetalle] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<number | null>(null);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [compraEliminar, setCompraEliminar] = useState<Compra | null>(null);
  const [modalAnular, setModalAnular] = useState(false);
  const [compraAnular, setCompraAnular] = useState<Compra | null>(null);

  const auth = getAuth();
  const empresaId = auth?.empresaId;

  useEffect(() => {
    if (empresaId) {
      loadCompras();
    }
  }, [empresaId, search, estadoFilter, pagination.page]);

  const loadCompras = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const query: ComprasQuery = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        estado: estadoFilter || undefined,
      };

      const response = await comprasApi.getAll(empresaId, query);
      setCompras(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch (error) {
      handleApiError(error, "Error al cargar compras");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (id: number, estado: "PENDIENTE" | "RECIBIDO" | "CANCELADO" | "ANULADO") => {
    if (!empresaId) return;

    // Confirmación para recibir
    if (estado === "RECIBIDO") {
      if (!confirm("¿Confirmar recepción? Esto actualizará el stock de los productos.")) {
        return;
      }
    }

    try {
      await comprasApi.update(empresaId, id, { estado });
      loadCompras();
    } catch (error) {
      handleApiError(error, "Error al actualizar estado");
    }
  };

  const handleAnular = (compra: Compra) => {
    setCompraAnular(compra);
    setModalAnular(true);
  };

  const confirmarAnular = async () => {
    if (!empresaId || !compraAnular) return;

    try {
      await comprasApi.update(empresaId, compraAnular.id, { estado: "ANULADO" });
      setModalAnular(false);
      setCompraAnular(null);
      loadCompras();
    } catch (error) {
      handleApiError(error, "Error al anular compra");
    }
  };

  const handleVerDetalle = (compra: Compra) => {
    setCompraSeleccionada(compra.id);
    setModalDetalle(true);
  };

  const handleEliminar = (compra: Compra) => {
    setCompraEliminar(compra);
    setModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    if (!empresaId || !compraEliminar) return;

    try {
      await comprasApi.delete(empresaId, compraEliminar.id);
      setModalEliminar(false);
      setCompraEliminar(null);
      loadCompras();
    } catch (error) {
      handleApiError(error, "Error al eliminar compra");
    }
  };

  const getEstadoColor = (estado: string) => {
    const colors = {
      PENDIENTE: "warning",
      RECIBIDO: "success",
      CANCELADO: "error",
      ANULADO: "error",
    };
    return colors[estado as keyof typeof colors] || "default";
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
          <p className="text-sm text-slate-500">Gestiona las compras a proveedores</p>
        </div>
        <button
          onClick={() => navigate("/admin/compras/nueva")}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Nueva Compra
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Buscar por número, proveedor..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination({ ...pagination, page: 1 });
          }}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <select
          value={estadoFilter}
          onChange={(e) => {
            setEstadoFilter(e.target.value);
            setPagination({ ...pagination, page: 1 });
          }}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="RECIBIDO">Recibido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Cargando...</div>
      ) : compras.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          No hay compras registradas
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Comprobante</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Proveedor</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Estado</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((compra) => (
                  <tr key={compra.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(compra.fecha).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{compra.numeroComprobante}</div>
                      <div className="text-xs text-slate-500">{compra.tipoComprobante}</div>
                    </td>
                    <td className="px-4 py-3">
                      {compra.proveedor ? (
                        <>
                          <div className="font-medium text-slate-900">
                            {compra.proveedor.razonSocial}
                          </div>
                          <div className="text-xs text-slate-500">
                            {compra.proveedor.numeroDocumento}
                          </div>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {compra.moneda} {compra.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill value={compra.estado} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleVerDetalle(compra)}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded"
                          title="Ver detalle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {compra.estado === "PENDIENTE" && (
                          <>
                            <button
                              onClick={() => handleUpdateEstado(compra.id, "RECIBIDO")}
                              className="text-green-500 hover:text-green-600 hover:bg-green-50 p-1.5 rounded"
                              title="Marcar como recibido"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEliminar(compra)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
                              title="Eliminar compra"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        {compra.estado === "RECIBIDO" && (
                          <button
                            onClick={() => handleAnular(compra)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
                            title="Anular compra"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Mostrando {compras.length} de {pagination.total} compras
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modales */}
      <DetalleCompraModal
        open={modalDetalle}
        onClose={() => {
          setModalDetalle(false);
          setCompraSeleccionada(null);
        }}
        compraId={compraSeleccionada}
        onEstadoChange={loadCompras}
      />

      <ConfirmModal
        isOpen={modalEliminar}
        onClose={() => {
          setModalEliminar(false);
          setCompraEliminar(null);
        }}
        onConfirm={confirmarEliminar}
        title="Eliminar Compra"
        message={
          compraEliminar
            ? `¿Está seguro de eliminar la compra ${compraEliminar.numeroComprobante}? Esta acción no se puede deshacer.`
            : ""
        }
      />

      <ConfirmModal
        isOpen={modalAnular}
        onClose={() => {
          setModalAnular(false);
          setCompraAnular(null);
        }}
        onConfirm={confirmarAnular}
        title="⚠️ Anular Compra"
        message={
          compraAnular
            ? `¿Está seguro de anular la compra ${compraAnular.numeroComprobante}?\n\n• Se revertirá el stock de todos los productos\n• Esta acción no se puede deshacer`
            : ""
        }
        confirmText="Sí, Anular"
        variant="danger"
      />
    </div>
  );
}
