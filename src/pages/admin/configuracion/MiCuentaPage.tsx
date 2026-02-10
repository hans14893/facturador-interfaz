import { getAuth } from "../../../auth/authStore";
import { User, Shield, Clock } from "lucide-react";

export default function MiCuentaPage() {
  const auth = getAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mi Cuenta</h1>
        <p className="text-sm text-slate-500">Información de tu perfil y acceso</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Datos actuales (solo lectura) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-600" />
            Información de Perfil
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Usuario
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                {auth?.username || "-"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Email
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                {auth?.email || "No configurado"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Roles
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(auth?.roles ?? []).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    <Shield className="w-3 h-3" />
                    {role}
                  </span>
                ))}
                {(!auth?.roles || auth.roles.length === 0) && (
                  <span className="text-sm text-slate-400">Sin roles asignados</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Empresa ID
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                {auth?.empresaId ?? "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Cambio de contraseña — próximamente */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Cambio de Contraseña</h3>
              <p className="mt-1 text-sm text-slate-500">
                Esta funcionalidad estará disponible próximamente. Por ahora, contacta al administrador para cambiar tu contraseña.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
