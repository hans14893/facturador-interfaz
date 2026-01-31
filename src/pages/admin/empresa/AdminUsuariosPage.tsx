import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createUsuario, listRoles, listUsuarios, desactivarUsuario, activarUsuario, deleteUsuario } from "../../../api/adminUsuariosApi";
import type { Usuario } from "../../../api/adminUsuariosApi";
import { getErrorMessage } from "../../../api/errorHelper";
import ConfirmModal from "../../../components/ConfirmModal";
import { btnDeleteSm } from "../../../ui/buttonStyles";

export default function AdminUsuariosPage() {
  const { empresaId = "" } = useParams();
  const [items, setItems] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["USER"]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const [u, r] = await Promise.all([
        listUsuarios(empresaId),
        listRoles(empresaId),
      ]);
      setItems(u);
      setRoles(r.map((x) => x.nombre));
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error"));
    }
  }, [empresaId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await refresh();
    })();
    return () => { mounted = false; };
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await createUsuario(empresaId, { username, password, nombre, email, telefono, roles: selectedRoles });
      setUsername(""); setPassword(""); setNombre(""); setEmail(""); setTelefono("");
      await refresh();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error creando usuario"));
    }
  }

  async function onToggleActivo(usuario: Usuario) {
    setErr(null);
    try {
      if (usuario.activo) {
        await desactivarUsuario(usuario.id);
      } else {
        await activarUsuario(usuario.id);
      }
      await refresh();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error actualizando usuario"));
    }
  }

  function openDeleteConfirm(usuario: Usuario) {
    setUsuarioToDelete(usuario);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!usuarioToDelete) return;
    setErr(null);
    try {
      await deleteUsuario(usuarioToDelete.id);
      await refresh();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error eliminando usuario"));
    } finally {
      setUsuarioToDelete(null);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900">Usuarios · Empresa #{empresaId}</h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form onSubmit={onCreate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-900">Crear usuario</div>

          <div className="mt-3 grid gap-3">
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Username"
              value={username} onChange={(e) => setUsername(e.target.value)}
            />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Nombre"
              value={nombre} onChange={(e) => setNombre(e.target.value)}
            />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Teléfono"
              value={telefono} onChange={(e) => setTelefono(e.target.value)}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold text-slate-600">Roles</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(roles.length ? roles : ["ADMIN", "USER"]).map((r) => {
                  const active = selectedRoles.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                        )
                      }
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold border " +
                        (active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200")
                      }
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {err && <div className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}

          <button className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:opacity-95">
            Crear usuario
          </button>
        </form>

        <div>
          <div className="text-sm font-bold text-slate-900">Listado</div>
          <div className="mt-3 space-y-2">
            {items.map(u => (
              <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-slate-900">{u.username}</div>
                      {!u.activo && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {u.nombre ?? "-"} · {u.email ?? "-"} · {u.telefono ?? "-"}
                    </div>
                    {u.roles && u.roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onToggleActivo(u)}
                      className={
                        "rounded-lg px-3 py-1.5 text-xs font-bold transition " +
                        (u.activo
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200")
                      }
                      title={u.activo ? "Desactivar" : "Activar"}
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(u)}
                      className={btnDeleteSm}
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-sm text-slate-500">Sin usuarios</div>}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUsuarioToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar permanentemente al usuario "${usuarioToDelete?.username}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
