import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import { createEmpresa, updateEmpresa, uploadLogo, getLogoUrl } from "../../../api/adminEmpresasApi";
import { consultarRuc } from "../../../api/consultaApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import { getErrorMessage } from "../../../api/errorHelper";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresa?: Empresa | null;
};

export default function EmpresaFormModal({ isOpen, onClose, onSuccess, empresa }: Props) {
  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [sunatAmbiente, setSunatAmbiente] = useState<"BETA" | "PROD">("BETA");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [consultandoRuc, setConsultandoRuc] = useState(false);

  const isEdit = !!empresa;

  useEffect(() => {
    if (isOpen && empresa) {
      setRuc(empresa.ruc ?? "");
      setRazonSocial(empresa.razonSocial ?? "");
      setNombreComercial(empresa.nombreComercial ?? "");
      setDireccion(empresa.direccion ?? "");
      setSunatAmbiente(empresa.sunatAmbiente ?? "BETA");
      setLogo(null);
      
      // Cargar logo existente
      if (empresa.id) {
        getLogoUrl(empresa.id).then((url) => {
          setLogoPreview(url);
        }).catch(() => {
          setLogoPreview(null);
        });
      } else {
        setLogoPreview(null);
      }
    } else if (isOpen && !empresa) {
      setRuc("");
      setRazonSocial("");
      setNombreComercial("");
      setDireccion("");
      setSunatAmbiente("BETA");
      setLogo(null);
      setLogoPreview(null);
    }
  }, [isOpen, empresa]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      let empresaId: number;
      
      if (isEdit) {
        await updateEmpresa(empresa.id, { ruc, razonSocial, nombreComercial, direccion, sunatAmbiente });
        empresaId = empresa.id;
      } else {
        const created = await createEmpresa({ ruc, razonSocial, nombreComercial, direccion, sunatAmbiente });
        empresaId = created.id;
      }
      
      // Subir logo si se seleccionó uno nuevo
      if (logo) {
        await uploadLogo(empresaId, logo);
      }
      
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, `Error ${isEdit ? "actualizando" : "creando"} empresa`));
    } finally {
      setLoading(false);
    }
  }

  async function handleConsultarRuc() {
    const rucLimpio = ruc.replace(/\D/g, "").slice(0, 11);
    if (rucLimpio.length !== 11) {
      setErr("El RUC debe tener 11 dígitos");
      return;
    }

    setConsultandoRuc(true);
    setErr(null);

    try {
      const resp = await consultarRuc(rucLimpio);
      if (resp?.estado) {
        if (resp.razonSocial) setRazonSocial(resp.razonSocial.toUpperCase());
        if (resp.nombreComercial && resp.nombreComercial !== "-") {
          setNombreComercial(resp.nombreComercial.toUpperCase());
        }
        if (resp.direccion) setDireccion(resp.direccion.toUpperCase());
      } else {
        setErr(resp?.mensaje || "No se pudo consultar el RUC");
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error consultando RUC"));
    } finally {
      setConsultandoRuc(false);
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErr("Solo se permiten imágenes");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErr("Tamaño máximo: 2MB");
        return;
      }
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
      setErr(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Editar Empresa" : "Crear Nueva Empresa"} size="md">
      <form onSubmit={handleSubmit}>
        {/* Logo */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-2 block text-xs font-semibold text-slate-700">Logo de la empresa</label>
          <div className="flex items-center gap-4">
            {logoPreview && (
              <div className="h-20 w-20 rounded-xl border-2 border-slate-200 bg-white p-2">
                <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:opacity-90"
              />
              <div className="mt-1 text-xs text-slate-500">PNG, JPG o SVG. Máximo 2MB.</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">RUC *</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="11 dígitos"
                value={ruc}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))}
                required
                maxLength={11}
              />
              <button
                type="button"
                onClick={handleConsultarRuc}
                disabled={consultandoRuc || ruc.replace(/\D/g, "").length !== 11}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                title="Consultar RUC"
              >
                {consultandoRuc ? "Buscando..." : "Buscar RUC"}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Razón Social *</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre Comercial</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Dirección</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Ambiente SUNAT</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={sunatAmbiente}
              onChange={(e) => setSunatAmbiente(e.target.value as "BETA" | "PROD")}
            >
              <option value="BETA">BETA (pruebas)</option>
              <option value="PROD">PROD (real)</option>
            </select>
            <div className="mt-1 text-xs text-slate-500">
              BETA para certificado de pruebas; PROD para emitir real.
            </div>
          </div>
        </div>

        {err && <div className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
