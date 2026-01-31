import { useCallback, useEffect, useState } from "react";
import { proveedoresApi, type Proveedor, type ProveedorRequest } from "../../../api/proveedoresApi";
import { getAuth } from "../../../auth/authStore";
import { getErrorMessage } from "../../../api/errorHelper";
import Modal from "../../../components/Modal";
import ConfirmModal from "../../../components/ConfirmModal";
import { btnDeleteSm, btnEditSm, btnViewSm } from "../../../ui/buttonStyles";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proveedorToDelete, setProveedorToDelete] = useState<Proveedor | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Form states
  const [tipoDocumento, setTipoDocumento] = useState("6");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const auth = getAuth();
  const empresaId = auth?.empresaId;

  const loadProveedores = useCallback(async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      const response = await proveedoresApi.getAll(empresaId, {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
      });

      setProveedores(response.content);
      setPagination((prev) => ({
        ...prev,
        total: response.totalElements,
        page: response.number + 1,
        limit: response.size,
        totalPages: response.totalPages,
      }));
    } catch (error) {
      setErr(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [empresaId, pagination.page, pagination.limit, searchTerm]);

  useEffect(() => {
    loadProveedores();
  }, [loadProveedores]);

  const handleOpenModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setTipoDocumento(proveedor.tipoDocumento);
      setNumeroDocumento(proveedor.numeroDocumento);
      setRazonSocial(proveedor.razonSocial);
      setNombreComercial(proveedor.nombreComercial || "");
      setDireccion(proveedor.direccion || "");
      setTelefono(proveedor.telefono || "");
      setEmail(proveedor.email || "");
      setContactoNombre(proveedor.contactoNombre || "");
      setContactoTelefono(proveedor.contactoTelefono || "");
      setObservaciones(proveedor.observaciones || "");
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingProveedor(null);
    setTipoDocumento("6");
    setNumeroDocumento("");
    setRazonSocial("");
    setNombreComercial("");
    setDireccion("");
    setTelefono("");
    setEmail("");
    setContactoNombre("");
    setContactoTelefono("");
    setObservaciones("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    setErr(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    setErr(null);
    setSuccess(null);

    const request: ProveedorRequest = {
      tipoDocumento,
      numeroDocumento,
      razonSocial,
      nombreComercial: nombreComercial || undefined,
      direccion: direccion || undefined,
      telefono: telefono || undefined,
      email: email || undefined,
      contactoNombre: contactoNombre || undefined,
      contactoTelefono: contactoTelefono || undefined,
      observaciones: observaciones || undefined,
    };

    try {
      if (editingProveedor) {
        await proveedoresApi.update(empresaId, editingProveedor.id, request);
        setSuccess("Proveedor actualizado exitosamente");
      } else {
        await proveedoresApi.create(empresaId, request);
        setSuccess("Proveedor creado exitosamente");
      }
      handleCloseModal();
      loadProveedores();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setErr(getErrorMessage(error));
    }
  };

  const handleDeleteClick = (proveedor: Proveedor) => {
    setProveedorToDelete(proveedor);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!empresaId || !proveedorToDelete) return;

    try {
      await proveedoresApi.delete(empresaId, proveedorToDelete.id);
      setSuccess("Proveedor eliminado exitosamente");
      setShowDeleteModal(false);
      setProveedorToDelete(null);
      loadProveedores();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setErr(getErrorMessage(error));
      setShowDeleteModal(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-500">Gestiona los proveedores de tu empresa</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Nuevo Proveedor
        </button>
      </div>

      {/* Mensajes */}
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {err}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por RUC, razón social o nombre comercial..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                Tipo Doc.
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                Número Doc.
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                Razón Social
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                Nombre Comercial
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                Teléfono
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                Dirección
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  Cargando proveedores...
                </td>
              </tr>
            ) : proveedores.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  No se encontraron proveedores
                </td>
              </tr>
            ) : (
              proveedores.map((proveedor) => (
                <tr key={proveedor.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {proveedor.tipoDocumento === "6" ? "RUC" : "DNI"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {proveedor.numeroDocumento}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {proveedor.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {proveedor.nombreComercial || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {proveedor.telefono || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {proveedor.direccion || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(proveedor)}
                        className={btnViewSm}
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleOpenModal(proveedor)}
                        className={btnEditSm}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(proveedor)}
                        className={btnDeleteSm}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Mostrando {proveedores.length} de {pagination.total} proveedores
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm text-slate-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Formulario */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
      >
        <form onSubmit={handleSubmit}>
          {err && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {err}
            </div>
          )}

          <div className="space-y-4">
            {/* Tipo y Número de Documento */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tipo Doc. <span className="text-red-500">*</span>
                </label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  required
                >
                  <option value="6">RUC</option>
                  <option value="1">DNI</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Número de Documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  required
                  maxLength={tipoDocumento === "6" ? 11 : 8}
                />
              </div>
            </div>

            {/* Razón Social */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                required
                maxLength={250}
              />
            </div>

            {/* Nombre Comercial */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                maxLength={250}
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                maxLength={250}
              />
            </div>

            {/* Teléfono y Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre de Contacto
                </label>
                <input
                  type="text"
                  value={contactoNombre}
                  onChange={(e) => setContactoNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={contactoTelefono}
                  onChange={(e) => setContactoTelefono(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  maxLength={50}
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                rows={3}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {editingProveedor ? "Guardar Cambios" : "Crear Proveedor"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de que deseas eliminar al proveedor "${proveedorToDelete?.razonSocial}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
