import { Outlet, NavLink } from "react-router-dom";
import { clearAuth, getAuth } from "../../auth/authStore";
import { useMemo, useState } from "react";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  "block rounded-xl px-3 py-2 text-sm font-semibold transition " +
  (isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100");

export default function AdminLayout() {
  const a = getAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const roles = useMemo(() => (a?.roles ?? []).map((r) => r.toUpperCase()), [a]);
  const isAdmin = roles.includes("ADMIN");

  function logout() {
    clearAuth();
    // Recargar página completa para limpiar todo el estado en memoria
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fijo arriba - fuera del dashboard */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 lg:px-6 xl:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/escudo.png"
                alt="hmpfacturador"
                className="h-10 w-10 rounded-2xl object-contain"
              />
              <div>
                <div className="text-sm font-bold text-slate-900">hmpfacturador</div>
                <div className="text-xs text-slate-500">{a?.username}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Botón flotante para abrir sidebar cuando está cerrado */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-24 z-50 rounded-xl bg-slate-900 p-3 text-white shadow-lg hover:bg-slate-800 transition-all"
          title="Mostrar menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Dashboard */}
      <div className="container mx-auto px-4 lg:px-6 xl:px-8 py-6">
        <div className={`grid gap-4 ${sidebarOpen ? 'lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]' : 'grid-cols-1'}`}>
          {sidebarOpen && (
            <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Botón para cerrar sidebar */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Ocultar menú"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1">
              {isAdmin ? (
                <>
                  {/* Menú solo para ADMIN */}
                  <NavLink to="/admin" className={itemClass} end>
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </NavLink>
                  <NavLink to="/admin/empresas" className={itemClass}>
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Empresas
                  </NavLink>
                  <NavLink to="/admin/configuracion-general" className={itemClass}>
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuración General
                  </NavLink>
                </>
              ) : (
                <>
                  {/* 🧾 2. FACTURACIÓN */}
                  <div className="px-2 pt-1 pb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Facturación</span>
                  </div>
                  <NavLink to="/admin/comprobantes" className={itemClass}>
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Comprobantes
                  </NavLink>

                  {/* Separador */}
                  <div className="border-t border-slate-200 my-3"></div>

                  {/* 👤 CUENTA */}
                  <div className="px-2 pt-1 pb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuenta</span>
                  </div>
                  <NavLink to="/admin/mi-cuenta" className={itemClass}>
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mi Cuenta
                  </NavLink>
                </>
              )}
            </div>
          </aside>
          )}

          <main className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${!sidebarOpen ? 'col-span-full' : ''}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
