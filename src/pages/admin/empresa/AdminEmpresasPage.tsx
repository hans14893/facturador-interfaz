import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEmpresas, createEmpresa } from "../../../api/adminEmpresasApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import { getErrorMessage } from "../../../api/errorHelper";

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // --- formulario nueva empresa ---
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    ruc: "",
    razonSocial: "",
    nombreComercial: "",
    direccion: "",
    sunatAmbiente: "BETA" as "BETA" | "PROD",
    igvPorcentaje: 18,
  });

  function resetForm() {
    setForm({ ruc: "", razonSocial: "", nombreComercial: "", direccion: "", sunatAmbiente: "BETA", igvPorcentaje: 18 });
    setFormErr(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ruc.trim() || !form.razonSocial.trim()) {
      setFormErr("RUC y Razón Social son obligatorios");
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      await createEmpresa({
        ruc: form.ruc.trim(),
        razonSocial: form.razonSocial.trim(),
        nombreComercial: form.nombreComercial.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        sunatAmbiente: form.sunatAmbiente,
        igvPorcentaje: form.igvPorcentaje,
      });
      resetForm();
      setShowForm(false);
      await loadEmpresas();
    } catch (e: unknown) {
      setFormErr(getErrorMessage(e, "Error creando empresa"));
    } finally {
      setSaving(false);
    }
  }

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
          onClick={() => { setShowForm((v) => !v); if (!showForm) resetForm(); }}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nueva Empresa"}
        </button>
      </div>

      {/* ── Formulario crear empresa ── */}
      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Crear nueva empresa</h2>

          {formErr && (
            <div className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">{formErr}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">RUC *</label>
              <input
                type="text"
                maxLength={11}
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, "") })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="20123456789"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Razón Social *</label>
              <input
                type="text"
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Mi Empresa S.A.C."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Nombre Comercial</label>
              <input
                type="text"
                value={form.nombreComercial}
                onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Mi Empresa"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Av. Principal 123, Lima"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Ambiente SUNAT</label>
              <select
                value={form.sunatAmbiente}
                onChange={(e) => setForm({ ...form, sunatAmbiente: e.target.value as "BETA" | "PROD" })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="BETA">BETA (pruebas)</option>
                <option value="PROD">PRODUCCIÓN</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">IGV %</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.igvPorcentaje}
                onChange={(e) => setForm({ ...form, igvPorcentaje: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear Empresa"}
            </button>
          </div>
        </form>
      )}

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
            Aún no se ha creado ninguna empresa
          </div>
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
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
                          to={`/admin/empresas/${empresa.id}/api-clients`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar API clientes"
                        >
                          API Clientes
                        </Link>
                        <Link
                          to={`/admin/empresas/${empresa.id}/series`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar series"
                        >
                          Series
                        </Link>
                        <Link
                          to={`/admin/empresas/${empresa.id}/usuarios`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar usuarios"
                        >
                          Usuarios
                        </Link>
                        <Link
                          to={`/admin/empresas/${empresa.id}/certificado`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title="Gestionar certificado"
                        >
                          Certificado
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
