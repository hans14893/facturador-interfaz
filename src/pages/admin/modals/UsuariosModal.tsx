import { useCallback, useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import ConfirmModal from "../../../components/ConfirmModal";
import { listUsuarios, createUsuario, updateUsuario, listRoles, desactivarUsuario, activarUsuario, deleteUsuario } from "../../../api/adminUsuariosApi";
import type { Usuario, Rol } from "../../../api/adminUsuariosApi";
import { getErrorMessage } from "../../../api/errorHelper";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
};

export default function UsuariosModal({ isOpen, onClose, empresaId }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      console.log('Cargando roles para empresaId:', empresaId);
      const [u, r] = await Promise.all([listUsuarios(empresaId), listRoles(empresaId)]);
      console.log('Roles recibidos:', r);
      setUsuarios(u);
      setRoles(r);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando usuarios"));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  function openCreate() {
    setEditingUsuario(null);
    setUsername("");
    setPassword("");
    setNombre("");
    setEmail("");
    setTelefono("");
    setSelectedRoles([]);
    setShowForm(true);
  }

  function openEdit(u: Usuario) {
    setEditingUsuario(u);
    setUsername(u.username);
    setPassword("");
    setNombre(u.nombre ?? "");
    setEmail(u.email ?? "");
    setTelefono(u.telefono ?? "");
    setSelectedRoles(u.roles ?? []);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // Validación de roles
    if (selectedRoles.length === 0) {
      setErr("Debes seleccionar al menos un rol");
      return;
    }

    try {
      if (editingUsuario) {
        await updateUsuario(empresaId, editingUsuario.id, {
          username,
          ...(password ? { password } : {}),
          nombre,
          email,
          telefono,
          roles: selectedRoles,
        });
      } else {
        await createUsuario(empresaId, {
          username,
          password,
          nombre,
          email,
          telefono,
          roles: selectedRoles,
        });
      }
      setShowForm(false);
      await loadData();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, `Error ${editingUsuario ? "actualizando" : "creando"} usuario`));
    }
  }

  async function handleToggleActivo(u: Usuario) {
    setErr(null);
    try {
      if (u.activo) {
        await desactivarUsuario(u.id);
      } else {
        await activarUsuario(u.id);
      }
      await loadData();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error actualizando usuario"));
    }
  }

  function openDeleteConfirm(u: Usuario) {
    setUsuarioToDelete(u);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!usuarioToDelete) return;
    setErr(null);
    try {
      await deleteUsuario(usuarioToDelete.id);
      await loadData();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error eliminando usuario"));
    } finally {
      setUsuarioToDelete(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Usuarios - Empresa #${empresaId}`} size="lg">
      {!showForm ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">{usuarios.length} usuario(s) registrado(s)</div>
            <button
              onClick={openCreate}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95"
            >
              + Crear Usuario
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Cargando usuarios...
            </div>
          ) : err ? (
            <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>
          ) : usuarios.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-sm text-slate-500">No hay usuarios registrados</div>
              <div className="mt-1 text-xs text-slate-400">Crea el primer usuario</div>
            </div>
          ) : (
            <div className="space-y-3">
              {usuarios.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{u.username}</div>
                      {u.nombre && <div className="text-sm text-slate-600">{u.nombre}</div>}
                      {u.email && <div className="text-xs text-slate-500">{u.email}</div>}
                      {u.telefono && <div className="text-xs text-slate-500">{u.telefono}</div>}
                      {u.roles && u.roles.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.activo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(u)}
                        className={
                          "rounded-xl px-3 py-2 text-xs font-semibold transition " +
                          (u.activo
                            ? "bg-yelloopenDeleteConfirmellow-700 hover:bg-yellow-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200")
                        }
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(u)}
                        className="rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Volver a la lista
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Username *</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Password {editingUsuario ? "(dejar vacío para no cambiar)" : "*"}
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingUsuario}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Teléfono</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="mb-2 block text-xs font-semibold text-slate-700">Roles *</label>
            {roles.length === 0 ? (
              <p className="text-sm text-slate-500">No hay roles disponibles para esta empresa</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                  const active = selectedRoles.includes(r.nombre);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(r.nombre) ? prev.filter((x) => x !== r.nombre) : [...prev, r.nombre]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {r.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {err && <div className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95"
            >
              {editingUsuario ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar permanentemente al usuario "${usuarioToDelete?.username}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </Modal>
  );
}
