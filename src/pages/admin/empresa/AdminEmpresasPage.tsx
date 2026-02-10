import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEmpresas } from "../../../api/adminEmpresasApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import { getErrorMessage } from "../../../api/errorHelper";
import EmpresaFormModal from "../modals/EmpresaFormModal";
import UsuariosModal from "../modals/UsuariosModal";
import CertificadoModal from "../modals/CertificadoModal";
import ApiKeysModal from "../modals/ApiKeysModal";
import { btnEditSm } from "../../../ui/buttonStyles";

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Modales
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showCertificadoModal, setShowCertificadoModal] = useState(false);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);

  async function loadEmpresas() {
    setLoading(true);
    setErr(null);
    try {
      setEmpresas(await listEmpresas());
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando empresas"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpresas();
  }, []);

  function openCreateModal() {
    setEditingEmpresa(null);
    setShowEmpresaModal(true);
  }

  function openEditModal(empresa: Empresa) {
    setEditingEmpresa(empresa);
    setShowEmpresaModal(true);
  }

  function openUsuariosModal(empresaId: number) {
    setSelectedEmpresaId(empresaId);
    setShowUsuariosModal(true);
  }

  function openCertificadoModal(empresaId: number) {
    setSelectedEmpresaId(empresaId);
    setShowCertificadoModal(true);
  }

  function openApiKeysModal(empresaId: number) {
    setSelectedEmpresaId(empresaId);
    setShowApiKeysModal(true);
  }

  function handleModalClose() {
    setShowEmpresaModal(false);
    setShowUsuariosModal(false);
    setShowCertificadoModal(false);
    setShowApiKeysModal(false);
    setEditingEmpresa(null);
    setSelectedEmpresaId(null);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Gestión de Empresas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Administra empresas, usuarios, certificados digitales y API keys desde un solo lugar.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:opacity-95 shadow-sm"
        >
          + Nueva Empresa
        </button>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="text-slate-500">Cargando empresas...</div>
        </div>
      ) : err ? (
        <div className="mt-8 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : empresas.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              className="text-slate-400"
            >
              <path
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-base font-semibold text-slate-900">No hay empresas registradas</div>
          <div className="mt-1 text-sm text-slate-500">
            Crea tu primera empresa para comenzar
          </div>
          <button
            onClick={openCreateModal}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:opacity-95"
          >
            + Crear Primera Empresa
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-4 text-sm text-slate-600">
            {empresas.length} empresa{empresas.length !== 1 ? "s" : ""} registrada{empresas.length !== 1 ? "s" : ""}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">RUC</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Razón Social</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Nombre Comercial</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empresas.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-500">#{empresa.id}</td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{empresa.ruc}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{empresa.razonSocial}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{empresa.nombreComercial || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/empresas/${empresa.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Abrir empresa"
                        >
                          Abrir
                        </Link>
                        <Link
                          to={`/admin/empresas/${empresa.id}/series`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar series"
                        >
                          Series
                        </Link>
                        <button
                          onClick={() => openEditModal(empresa)}
                          className={btnEditSm}
                          title="Editar empresa"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => openUsuariosModal(empresa.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar usuarios"
                        >
                          Usuarios
                        </button>
                        <button
                          onClick={() => openCertificadoModal(empresa.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar certificado"
                        >
                          Certificado
                        </button>
                        <button
                          onClick={() => openApiKeysModal(empresa.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar API Keys"
                        >
                          API Keys
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      <EmpresaFormModal
        isOpen={showEmpresaModal}
        onClose={handleModalClose}
        onSuccess={loadEmpresas}
        empresa={editingEmpresa}
      />

      {selectedEmpresaId && (
        <>
          <UsuariosModal
            isOpen={showUsuariosModal}
            onClose={handleModalClose}
            empresaId={selectedEmpresaId}
          />

          <CertificadoModal
            isOpen={showCertificadoModal}
            onClose={handleModalClose}
            empresaId={selectedEmpresaId}
          />

          <ApiKeysModal
            isOpen={showApiKeysModal}
            onClose={handleModalClose}
            empresaId={selectedEmpresaId}
          />
        </>
      )}
    </div>
  );
}
