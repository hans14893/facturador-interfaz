import { useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuth } from "../../auth/authStore";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function Card({
  title,
  desc,
  to,
  icon,
}: {
  title: string;
  desc: string;
  to: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <span className="opacity-0 transition group-hover:opacity-100 text-slate-400">
              →
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const a = getAuth();
  const nav = useNavigate();

  const roles = useMemo(() => (a?.roles ?? []).map((r) => r.toUpperCase()), [a]);
  const isAdmin = roles.includes("ADMIN");

  // ✅ Guard: si no es admin, redirigir a comprobantes
  useEffect(() => {
    if (!a?.token) {
      nav("/login", { replace: true });
      return;
    }
    if (!isAdmin) {
      nav("/admin/comprobantes", { replace: true });
    }
  }, [a?.token, isAdmin, nav]);

  // Mostrar null mientras redirige
  if (!a?.token || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* Hero */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Dashboard Admin
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestiona empresas, usuarios, certificados y credenciales API.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>Usuario: {a.username ?? "-"}</Badge>
              <Badge>Roles: {(a.roles ?? []).join(", ") || "-"}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-[320px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Estado</div>
              <div className="mt-1 text-sm font-bold text-emerald-700">Activo</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Acceso</div>
              <div className="mt-1 text-sm font-bold text-slate-900">ADMIN</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          Acciones principales
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              title="Comprobantes"
              desc="Ver y auditar comprobantes emitidos, estados SUNAT, descargas."
              to="/admin/comprobantes"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3v3h3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            <Card
              title="API Clients"
              desc="Genera API keys para integraciones (POS / sistema de ventas)."
              to="/admin/api-clients"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            <Card
              title="Certificado digital"
              desc="Sube el .PFX, valida vigencia y úsalo para firmar XML."
              to="/admin/certificado"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
          </div>
        </section>

        {/* Info + security */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="text-base font-bold text-slate-900">Checklist de configuración</h3>
            <p className="mt-1 text-sm text-slate-600">
              Esto te deja listo para integrar un sistema de ventas.
            </p>

            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <svg className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Crear empresa y usuarios (ADMIN / USER)</span>
              </li>
              <li className="flex gap-2">
                <svg className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Generar API Client (id:secret) para integraciones</span>
              </li>
              <li className="flex gap-2">
                <svg className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Subir certificado PFX para firma de XML</span>
              </li>
              <li className="flex gap-2">
                <svg className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Probar emisión / envío SUNAT (mock o beta)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Seguridad</h3>
            <p className="mt-1 text-sm text-slate-600">
              Recomendaciones para producción.
            </p>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500">JWT</div>
                <div className="mt-1 font-semibold">
                  Usa <span className="font-bold">JWT_SECRET</span> real (32+ chars).
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-500">API Keys</div>
                <div className="mt-1 font-semibold">
                  Guarda el <span className="font-bold">secret</span> solo una vez (no se muestra de nuevo).
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Mi Facturador · Admin Panel
        </div>
    </>
  );
}