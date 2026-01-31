import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import ConfirmModal from "../../../components/ConfirmModal";
import { getAuth } from "../../../auth/authStore";
import { getErrorMessage } from "../../../api/errorHelper";
import {
  entidadesComercialesApi,
  type EntidadComercial,
  type EntidadComercialRequest,
  type RolEntidadComercial,
} from "../../../api/entidadesComercialesApi";
import { consultarRuc, consultarDni } from "../../../api/consultaApi";

export default function EntidadesComercialesPage() {
  const auth = getAuth();
  const empresaId = auth?.empresaId;

  const [data, setData] = useState<EntidadComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rol, setRol] = useState<RolEntidadComercial | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EntidadComercial | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete] = useState<EntidadComercial | null>(null);

  // Form
  const [tipoDocumento, setTipoDocumento] = useState("6");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const [esCliente, setEsCliente] = useState(true);
  const [esProveedor, setEsProveedor] = useState(false);
  const [esTransportista, setEsTransportista] = useState(false);

  const [placaVehiculo, setPlacaVehiculo] = useState("");
  const [marcaVehiculo, setMarcaVehiculo] = useState("");
  const [certificadoMtc, setCertificadoMtc] = useState("");
  const [licenciaConducir, setLicenciaConducir] = useState("");
  const [choferNombre, setChoferNombre] = useState("");
  const [choferDni, setChoferDni] = useState("");

  // Legacy fields (útiles si unificas todo)
  const [ubigeo, setUbigeo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");

  const [emailPrincipal, setEmailPrincipal] = useState("");
  const [emailSecundario, setEmailSecundario] = useState("");
  const [emailTerciario, setEmailTerciario] = useState("");

  const [codigoCliente, setCodigoCliente] = useState("");

  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [buscandoChofer, setBuscandoChofer] = useState(false);

  const canLoad = useMemo(() => !!empresaId, [empresaId]);

  const load = useCallback(async () => {
    if (!empresaId) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await entidadesComercialesApi.getAll(empresaId, {
        rol: rol || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setData(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [empresaId, rol, search, page, limit]);

  useEffect(() => {
    if (!canLoad) return;
    load();
  }, [canLoad, load]);

  function resetForm() {
    setEditing(null);
    setTipoDocumento("6");
    setNumeroDocumento("");
    setRazonSocial("");
    setNombreComercial("");
    setDireccion("");
    setTelefono("");
    setEmail("");

    setEsCliente(true);
    setEsProveedor(false);
    setEsTransportista(false);

    setPlacaVehiculo("");
    setMarcaVehiculo("");
    setCertificadoMtc("");
    setLicenciaConducir("");
    setChoferNombre("");
    setChoferDni("");

    setUbigeo("");
    setDepartamento("");
    setProvincia("");
    setDistrito("");

    setEmailPrincipal("");
    setEmailSecundario("");
    setEmailTerciario("");

    setCodigoCliente("");

    setContactoNombre("");
    setContactoTelefono("");
    setObservaciones("");
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(item: EntidadComercial) {
    setEditing(item);
    setTipoDocumento(item.tipoDocumento);
    setNumeroDocumento(item.numeroDocumento);
    setRazonSocial(item.razonSocial);
    setNombreComercial(item.nombreComercial || "");
    setDireccion(item.direccion || "");
    setTelefono(item.telefono || "");
    setEmail(item.email || "");

    setEsCliente(!!item.esCliente);
    setEsProveedor(!!item.esProveedor);
    setEsTransportista(!!item.esTransportista);

    setPlacaVehiculo(item.placaVehiculo || "");
    setMarcaVehiculo(item.marcaVehiculo || "");
    setCertificadoMtc(item.certificadoMtc || "");
    setLicenciaConducir(item.licenciaConducir || "");
    setChoferNombre(item.choferNombre || "");
    setChoferDni(item.choferDni || "");

    setUbigeo(item.ubigeo || "");
    setDepartamento(item.departamento || "");
    setProvincia(item.provincia || "");
    setDistrito(item.distrito || "");

    setEmailPrincipal(item.emailPrincipal || "");
    setEmailSecundario(item.emailSecundario || "");
    setEmailTerciario(item.emailTerciario || "");

    setCodigoCliente(item.codigoCliente || "");

    setContactoNombre(item.contactoNombre || "");
    setContactoTelefono(item.contactoTelefono || "");
    setObservaciones(item.observaciones || "");

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setErr(null);
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
        // RUC
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
          setDepartamento(res.departamento || "");
          setProvincia(res.provincia || "");
          setDistrito(res.distrito || "");
          setSuccess("Datos obtenidos de SUNAT");
          setTimeout(() => setSuccess(null), 2500);
        } else {
          setErr(res.mensaje || "No se encontró información del RUC");
        }
      } else if (tipoDocumento === "1") {
        // DNI
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

  async function buscarChoferPorDni() {
    if (!choferDni.trim()) {
      setErr("Ingresa el DNI del chofer");
      return;
    }
    if (choferDni.length !== 8) {
      setErr("El DNI debe tener 8 dígitos");
      return;
    }

    setBuscandoChofer(true);
    setErr(null);

    try {
      const res = await consultarDni(choferDni);
      if (res.estado && res.nombreCompleto) {
        setChoferNombre(res.nombreCompleto);
        setSuccess("Datos del chofer obtenidos");
        setTimeout(() => setSuccess(null), 2500);
      } else {
        setErr(res.mensaje || "No se encontró información del DNI");
      }
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBuscandoChofer(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaId) return;

    setErr(null);
    setSuccess(null);

    const payload: EntidadComercialRequest = {
      tipoDocumento,
      numeroDocumento,
      razonSocial,
      nombreComercial: nombreComercial || undefined,
      direccion: direccion || undefined,
      telefono: telefono || undefined,
      email: email || undefined,

      ubigeo: ubigeo || undefined,
      departamento: departamento || undefined,
      provincia: provincia || undefined,
      distrito: distrito || undefined,

      emailPrincipal: emailPrincipal || undefined,
      emailSecundario: emailSecundario || undefined,
      emailTerciario: emailTerciario || undefined,

      codigoCliente: codigoCliente || undefined,

      contactoNombre: contactoNombre || undefined,
      contactoTelefono: contactoTelefono || undefined,
      observaciones: observaciones || undefined,

      esCliente,
      esProveedor,
      esTransportista,

      placaVehiculo: placaVehiculo || undefined,
      marcaVehiculo: marcaVehiculo || undefined,
      certificadoMtc: certificadoMtc || undefined,
      licenciaConducir: licenciaConducir || undefined,
      choferNombre: choferNombre || undefined,
      choferDni: choferDni || undefined,

      activo: true,
    };

    try {
      if (editing) {
        await entidadesComercialesApi.update(empresaId, editing.id, payload);
        setSuccess("Entidad comercial actualizada");
      } else {
        await entidadesComercialesApi.create(empresaId, payload);
        setSuccess("Entidad comercial creada");
      }
      closeModal();
      load();
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  }

  function askDelete(item: EntidadComercial) {
    setToDelete(item);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!empresaId || !toDelete) return;
    try {
      await entidadesComercialesApi.delete(empresaId, toDelete.id);
      setSuccess("Entidad comercial desactivada");
      setToDelete(null);
      load();
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  }

  const rolBadges = (e: EntidadComercial) => {
    const badges: React.ReactNode[] = [];
    if (e.esCliente) badges.push(
      <span key="c" className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Cliente</span>
    );
    if (e.esProveedor) badges.push(
      <span key="p" className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Proveedor</span>
    );
    if (e.esTransportista) badges.push(
      <span key="t" className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Transportista</span>
    );
    return badges.length ? badges : <span className="text-slate-400">—</span>;
  };

  const tipoDocLabel = (tipo: string) => {
    const tipos: Record<string, string> = { "6": "RUC", "1": "DNI", "4": "CE", "7": "PAS" };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Entidades Comerciales</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva
        </button>
      </div>

      {!empresaId && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          No se encontró empresaId en sesión.
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => { setRol(""); setPage(1); }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${rol === "" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Todos
          </button>
          <button
            onClick={() => { setRol("CLIENTE"); setPage(1); }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${rol === "CLIENTE" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Clientes
          </button>
          <button
            onClick={() => { setRol("PROVEEDOR"); setPage(1); }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${rol === "PROVEEDOR" ? "bg-purple-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Proveedores
          </button>
          <button
            onClick={() => { setRol("TRANSPORTISTA"); setPage(1); }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${rol === "TRANSPORTISTA" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Transportistas
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          title="Actualizar"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Documento</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Razón Social</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Contacto</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Roles</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  <svg className="mx-auto h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No hay entidades registradas
                </td>
              </tr>
            ) : (
              data.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500">{tipoDocLabel(e.tipoDocumento)}</span>
                      <span className="font-mono text-slate-700">{e.numeroDocumento}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900 truncate max-w-[200px]" title={e.razonSocial}>{e.razonSocial}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {e.telefono || e.email || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">{rolBadges(e)}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-0.5">
                      <button onClick={() => openEdit(e)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Editar">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => askDelete(e)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Desactivar">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Pág. {page}/{totalPages}</span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              ← Ant
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Sig →
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? "Editar Entidad" : "Nueva Entidad"}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Mensajes dentro del modal */}
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

          {/* Razón Social + Nombre Comercial */}
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Razón social / Nombre *"
              required
            />
            <input
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Nombre comercial (opcional)"
            />
          </div>

          {/* Dirección */}
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Dirección"
          />

          {/* Contacto */}
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Teléfono"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Email"
            />
            <input
              value={codigoCliente}
              onChange={(e) => setCodigoCliente(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Código interno"
            />
          </div>

          {/* Roles */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Roles:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setEsCliente(!esCliente)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  esCliente
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setEsProveedor(!esProveedor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  esProveedor
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Proveedor
              </button>
              <button
                type="button"
                onClick={() => setEsTransportista(!esTransportista)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  esTransportista
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Transportista
              </button>
            </div>
          </div>

          {/* Datos Transportista (colapsable) */}
          {esTransportista && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-2 text-xs font-semibold text-amber-700">Datos de Transportista</div>
              <div className="grid gap-2 md:grid-cols-3">
                <input value={placaVehiculo} onChange={(e) => setPlacaVehiculo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Placa" />
                <input value={marcaVehiculo} onChange={(e) => setMarcaVehiculo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Marca vehículo" />
                <input value={certificadoMtc} onChange={(e) => setCertificadoMtc(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Certificado MTC" />
              </div>
              <div className="mt-2 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-amber-700">DNI Chofer</label>
                  <div className="flex gap-1">
                    <input value={choferDni} onChange={(e) => setChoferDni(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="8 dígitos" />
                    <button
                      type="button"
                      onClick={buscarChoferPorDni}
                      disabled={buscandoChofer}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {buscandoChofer ? "..." : "Buscar"}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-amber-700">Nombre Chofer</label>
                  <input value={choferNombre} onChange={(e) => setChoferNombre(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Nombre completo" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-amber-700">Licencia</label>
                  <input value={licenciaConducir} onChange={(e) => setLicenciaConducir(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Licencia conducir" />
                </div>
              </div>
            </div>
          )}

          {/* Campos adicionales (colapsable) */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
              <span className="ml-1">Mostrar campos adicionales</span>
            </summary>
            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="grid gap-2 md:grid-cols-4">
                <input value={ubigeo} onChange={(e) => setUbigeo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Ubigeo" />
                <input value={departamento} onChange={(e) => setDepartamento(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Departamento" />
                <input value={provincia} onChange={(e) => setProvincia(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Provincia" />
                <input value={distrito} onChange={(e) => setDistrito(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Distrito" />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <input value={emailPrincipal} onChange={(e) => setEmailPrincipal(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Email principal" />
                <input value={emailSecundario} onChange={(e) => setEmailSecundario(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Email secundario" />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <input value={emailTerciario} onChange={(e) => setEmailTerciario(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Email terciario" />
                <input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Contacto nombre" />
                <input value={contactoTelefono} onChange={(e) => setContactoTelefono(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Contacto teléfono" />
              </div>
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Observaciones" />
            </div>
          </details>

          {/* Botones */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              {editing ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Desactivar entidad"
        message={toDelete ? `Se desactivará: ${toDelete.razonSocial}` : ""}
        confirmText="Desactivar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
