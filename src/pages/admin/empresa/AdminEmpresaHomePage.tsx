import { Link, useParams } from "react-router-dom";

function Quick({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50">
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </Link>
  );
}

export default function AdminEmpresaHomePage() {
  const { empresaId } = useParams();

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900">Empresa #{empresaId}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Administra usuarios, certificado digital y API keys de esta empresa.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Quick
          to={`/admin/empresas/${empresaId}/usuarios`}
          title="Usuarios"
          desc="Crear usuarios y asignar roles."
        />
        <Quick
          to={`/admin/empresas/${empresaId}/certificado`}
          title="Certificado digital"
          desc="Subir PFX para firmar XML."
        />
        <Quick
          to={`/admin/empresas/${empresaId}/api-clients`}
          title="API Clients"
          desc="Generar API key para integraciones."
        />
        <Quick
          to={`/admin/empresas/${empresaId}/series`}
          title="Series"
          desc="Configurar series y correlativos por tipo de documento."
        />
        <Quick
          to={`/admin/empresas/${empresaId}/configuracion`}
          title="Configuración"
          desc="API de consulta de documentos (DNI/RUC)."
        />
      </div>
    </div>
  );
}
