import { useState, useEffect } from "react";
import { getMyEmpresa, updateMyEmpresa, uploadMyLogo, getMyLogoUrl } from "../../../api/adminEmpresasApi";
import type { Empresa } from "../../../api/adminEmpresasApi";
import { getErrorMessage } from "../../../api/errorHelper";

export default function ConfiguracionEmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    ruc: "",
    razonSocial: "",
    nombreComercial: "",
    direccion: "",
    telefono: "",
    email: "",
    igvPorcentaje: 18,
    usarStock: false,
    noVenderStockCero: false,
    unificarItemsVenta: true,
    tipoAfectacionIgvDefault: "10",
    formatoImpresion: "A4",
    logo: "",
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    loadEmpresa();
  }, []);

  async function loadEmpresa() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getMyEmpresa();
      setEmpresa(data);
      setFormData({
        ruc: data.ruc || "",
        razonSocial: data.razonSocial || "",
        nombreComercial: data.nombreComercial || "",
        direccion: data.direccion || "",
        telefono: data.telefono || "",
        email: data.email || "",
        igvPorcentaje: data.igvPorcentaje || 18,
        usarStock: data.usarStock || false,
        noVenderStockCero: data.noVenderStockCero || false,
        unificarItemsVenta: data.unificarItemsVenta !== undefined ? data.unificarItemsVenta : true,
        tipoAfectacionIgvDefault: data.tipoAfectacionIgvDefault || "10",
        formatoImpresion: data.formatoImpresion || "A4",
        logo: "",
      });
      
      // Cargar logo
      try {
        const logoUrl = await getMyLogoUrl();
        if (logoUrl) {
          setFormData(prev => ({ ...prev, logo: logoUrl }));
        }
      } catch {
        // Sin logo
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error cargando datos de la empresa"));
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData({ ...formData, [field]: value });
    setSuccess(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setLogoFile(file);
      setFormData({ ...formData, logo: URL.createObjectURL(file) });
      setErr(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    setErr(null);
    setSuccess(false);
    
    try {
      await updateMyEmpresa({
        ruc: formData.ruc,
        razonSocial: formData.razonSocial,
        nombreComercial: formData.nombreComercial,
        direccion: formData.direccion,
        igvPorcentaje: formData.igvPorcentaje,
        usarStock: formData.usarStock,
        noVenderStockCero: formData.noVenderStockCero,
        unificarItemsVenta: formData.unificarItemsVenta,
        tipoAfectacionIgvDefault: formData.tipoAfectacionIgvDefault,
        formatoImpresion: formData.formatoImpresion,
      });
      
      // Subir logo si hay uno nuevo
      if (logoFile) {
        await uploadMyLogo(logoFile);
        setLogoFile(null);
      }
      
      setSuccess(true);
      await loadEmpresa();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Error actualizando datos de la empresa"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Cargando datos de la empresa...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración de Empresa</h1>
        <p className="text-sm text-slate-500">Gestiona la información de tu empresa</p>
      </div>

      {err && (
        <div className="mb-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-green-100 px-4 py-3 text-sm text-green-700">
          ✓ Datos actualizados correctamente
        </div>
      )}

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Fiscales */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Datos Fiscales</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  RUC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ruc}
                  onChange={(e) => handleChange("ruc", e.target.value)}
                  placeholder="20123456789"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.razonSocial}
                  onChange={(e) => handleChange("razonSocial", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre Comercial
                </label>
                <input
                  type="text"
                  value={formData.nombreComercial}
                  onChange={(e) => handleChange("nombreComercial", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dirección Fiscal
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled
                />
                <p className="mt-1 text-xs text-slate-500">
                  Contacta al administrador para cambiar este campo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled
                />
                <p className="mt-1 text-xs text-slate-500">
                  Contacta al administrador para cambiar este campo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IGV (porcentaje por defecto)
                </label>
                <select
                  value={formData.igvPorcentaje}
                  onChange={(e) => handleChange("igvPorcentaje", Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value={18}>18%</option>
                  <option value={0}>0% (Exonerado)</option>
                  <option value={10}>10%</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Porcentaje de IGV aplicado por defecto en comprobantes
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Afectación IGV por Defecto
                </label>
                <select
                  value={formData.tipoAfectacionIgvDefault}
                  onChange={(e) => handleChange("tipoAfectacionIgvDefault", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="10">Gravado - Operación Onerosa [10]</option>
                  <option value="20">Exonerado - Operación Onerosa [20]</option>
                  <option value="30">Inafecto - Operación Onerosa [30]</option>
                  <option value="40">Exportación [40]</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Tipo de afectación que se pre-seleccionará en productos nuevos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Formato de Impresión
                </label>
                <select
                  value={formData.formatoImpresion}
                  onChange={(e) => handleChange("formatoImpresion", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="A4">A4 (Hoja completa)</option>
                  <option value="TICKET">Ticket 80mm</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Formato utilizado al generar PDFs de comprobantes
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="usar-stock"
                type="checkbox"
                checked={formData.usarStock}
                onChange={(e) => handleChange("usarStock", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="usar-stock" className="text-sm font-medium text-slate-700">
                Activar control de stock
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500 ml-7">
              Si se activa, el sistema controlará el inventario automáticamente al crear comprobantes
            </p>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="no-vender-stock-cero"
                type="checkbox"
                checked={formData.noVenderStockCero}
                onChange={(e) => handleChange("noVenderStockCero", e.target.checked)}
                disabled={!formData.usarStock}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="no-vender-stock-cero" className={`text-sm font-medium ${formData.usarStock ? 'text-slate-700' : 'text-slate-400'}`}>
                No permitir vender con stock cero
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500 ml-7">
              Impide agregar productos al carrito si su stock es cero o negativo (requiere control de stock activado)
            </p>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="unificar-items-venta"
                type="checkbox"
                checked={formData.unificarItemsVenta}
                onChange={(e) => handleChange("unificarItemsVenta", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="unificar-items-venta" className="text-sm font-medium text-slate-700">
                Unificar producto en el mismo ítem
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500 ml-7">
              Al agregar un producto que ya está en el carrito, incrementa su cantidad en lugar de crear una nueva línea
            </p>
          </div>

          {/* Logo */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Logo de la Empresa</h2>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="max-w-full max-h-full" />
                  ) : (
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subir Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Formatos permitidos: JPG, PNG. Tamaño máximo: 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              type="button"
              onClick={loadEmpresa}
              className="rounded-xl border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
