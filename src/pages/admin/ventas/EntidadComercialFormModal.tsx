import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { getAuth } from "../../../auth/authStore";
import { getErrorMessage } from "../../../api/errorHelper";
import {
  entidadesComercialesApi,
  type EntidadComercialRequest,
} from "../../../api/entidadesComercialesApi";
import { consultarRuc, consultarDni } from "../../../api/consultaApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EntidadComercialFormModal({ isOpen, onClose, onSaved }: Props) {
  const auth = getAuth();
  const empresaId = auth?.empresaId;

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [tipoDocumento, setTipoDocumento] = useState("6");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [esCliente, setEsCliente] = useState(true);
  const [buscandoDoc, setBuscandoDoc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  function resetForm() {
    setTipoDocumento("6");
    setNumeroDocumento("");
    setRazonSocial("");
    setNombreComercial("");
    setDireccion("");
    setTelefono("");
    setEmail("");
    setEsCliente(true);
    setErr(null);
    setSuccess(null);
  }

  async function buscarPorDocumento() {
    if (!numeroDocumento.trim()) {
      setErr("Ingresa un número de documento");
      return;
    }

    setBuscandoDoc(true);
    setErr(null);

    try {
      if (tipoDocumento === "6") {
        if (numeroDocumento.length !== 11) {
          setErr("El RUC debe tener 11 dígitos");
          setBuscandoDoc(false);
          return;
        }
        const res = await consultarRuc(numeroDocumento);
        if (res.estado && res.razonSocial) {
          setRazonSocial(res.razonSocial);
          setNombreComercial(res.nombreComercial || "");
          setDireccion(res.direccion || "");
          setSuccess("Datos obtenidos de SUNAT");
          setTimeout(() => setSuccess(null), 2500);
        } else {
          setErr(res.mensaje || "No se encontró información del RUC");
        }
      } else if (tipoDocumento === "1") {
        if (numeroDocumento.length !== 8) {
          setErr("El DNI debe tener 8 dígitos");
          setBuscandoDoc(false);
          return;
        }
        const res = await consultarDni(numeroDocumento);
        if (res.estado && res.nombreCompleto) {
          setRazonSocial(res.nombreCompleto);
          setSuccess("Datos obtenidos de RENIEC");
          setTimeout(() => setSuccess(null), 2500);
        } else {
          setErr(res.mensaje || "No se encontró información del DNI");
        }
      } else {
        setErr("La búsqueda solo está disponible para DNI y RUC");
      }
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBuscandoDoc(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) {
      setErr("No se pudo identificar la empresa. Por favor, recargue la página.");
      return;
    }

    if (!numeroDocumento.trim() || !razonSocial.trim()) {
      setErr("Completa los campos requeridos: documento y razón social");
      return;
    }

    setSaving(true);
    setErr(null);
    setSuccess(null);

    try {
      const req: EntidadComercialRequest = {
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        razonSocial: razonSocial.trim(),
        nombreComercial: nombreComercial.trim() || undefined,
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        esCliente,
        esProveedor: false,
        esTransportista: false,
      };

      await entidadesComercialesApi.create(empresaId, req);
      setSuccess("Cliente creado exitosamente");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (e: any) {
      console.error("Error al crear cliente:", e);
      
      // Manejo específico de errores HTTP
      if (e?.response?.status === 403) {
        setErr("Ya existe un cliente registrado con este número de documento.");
      } else if (e?.response?.status === 409) {
        setErr("Ya existe un cliente con este número de documento.");
      } else if (e?.response?.status === 400) {
        setErr(e?.response?.data?.message || "Datos inválidos. Verifique la información.");
      } else if (e?.response?.data?.message) {
        setErr(e.response.data.message);
      } else {
        setErr(getErrorMessage(e, "Error al crear cliente"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Cliente"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {err && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {err}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {/* Documento + Búsqueda */}
        <div className="flex gap-2">
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="6">RUC</option>
            <option value="1">DNI</option>
            <option value="4">CE</option>
            <option value="7">Pasaporte</option>
          </select>
          <input
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder={tipoDocumento === "6" ? "RUC (11 dígitos)" : tipoDocumento === "1" ? "DNI (8 dígitos)" : "Número de documento"}
            required
          />
          {(tipoDocumento === "6" || tipoDocumento === "1") && (
            <button
              type="button"
              onClick={buscarPorDocumento}
              disabled={buscandoDoc}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              title={tipoDocumento === "6" ? "Buscar en SUNAT" : "Buscar en RENIEC"}
            >
              {buscandoDoc ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              {buscandoDoc ? "..." : "Buscar"}
            </button>
          )}
        </div>

        {/* Razón Social */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Razón Social / Nombre <span className="text-red-500">*</span>
          </label>
          <input
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nombre completo o razón social"
            required
          />
        </div>

        {/* Nombre Comercial */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre Comercial
          </label>
          <input
            value={nombreComercial}
            onChange={(e) => setNombreComercial(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Opcional"
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dirección
          </label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Dirección física"
          />
        </div>

        {/* Teléfono y Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Número de contacto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? "Guardando..." : "Crear Cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
