import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { anularComprobante, consultarTicketAnulacion, listComprobantes } from "../api/comprobantesApi";
import type { Comprobante } from "../api/comprobantesApi";
import StatusPill from "../components/StatusPill";
import Modal from "../components/Modal";
import { getAuth } from "../auth/authStore";
import * as XLSX from "xlsx-js-style";

type TipoDoc = "SUNAT_CPE" | "ALL" | "01" | "03" | "07" | "08"; // 01 Factura, 03 Boleta, 07 NC, 08 ND
type Estado = "ALL" | "ACEPTADO" | "RECHAZADO" | "PENDIENTE" | "ANULADO" | "ENVIADO";

const MOTIVOS_ANULACION = [
  "Error en los datos del cliente",
  "RUC o DNI incorrecto",
  "Error en el importe",
  "Producto incorrecto",
  "Precio incorrecto",
  "Cantidad incorrecta",
  "Comprobante duplicado",
  "Pedido cancelado",
  "No se llegó a un acuerdo comercial",
  "Devolución de productos",
  "Anulación total",
  "Otros",
] as const;

type MotivoAnulacionOption = (typeof MOTIVOS_ANULACION)[number];

function boletaSinDocumentoIdentidad(c: { tipoDoc?: string; receptorNroDoc?: string | null; receptorTipoDoc?: string | null }) {
  if (c.tipoDoc !== "03") return false;
  const nro = (c.receptorNroDoc || "").trim();
  
  // Sin documento si no hay número o es todo ceros
  if (!nro || /^0+$/.test(nro)) return true;
  
  // Si tiene un número válido (8 u 11 dígitos), tiene documento
  if (nro.length === 8 || nro.length === 11) return false;
  
  // Otros casos se consideran sin documento válido
  return true;
}

function toInputDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function money(v: unknown) {
  const n = Number(v || 0);
  return n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tipoDocLabel(td: string) {
  switch (td) {
    case "01":
      return "01";
    case "03":
      return "03";
    case "07":
      return "07";
    case "08":
      return "08";
    default:
      return td || "-";
  }
}

export default function ComprobantesPage() {
  const [rows, setRows] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ? Filtros UI (valores del formulario)
  // Por defecto: ALL (todos)
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>("ALL");
  const [qEntidad, setQEntidad] = useState("");
  const [estado, setEstado] = useState<Estado>("ALL");

  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const todayDate = useMemo(() => toInputDate(today), [today]);
  const [desde, setDesde] = useState(todayDate);
  const [hasta, setHasta] = useState(todayDate);

  // ? Filtros aplicados (los que realmente filtran)
  const [appliedTipoDoc, setAppliedTipoDoc] = useState<TipoDoc>("ALL");
  const [appliedQEntidad, setAppliedQEntidad] = useState("");
  const [appliedEstado, setAppliedEstado] = useState<Estado>("ALL");
  const [appliedDesde, setAppliedDesde] = useState(todayDate);
  const [appliedHasta, setAppliedHasta] = useState(todayDate);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [anularOpen, setAnularOpen] = useState(false);
  const [anularMotivoOption, setAnularMotivoOption] = useState<MotivoAnulacionOption | "">("");
  const [anularMotivoOtros, setAnularMotivoOtros] = useState("");
  const [anularTarget, setAnularTarget] = useState<Comprobante | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  // Estados para modal de resultado de anulación
  const [anulacionResultOpen, setAnulacionResultOpen] = useState(false);
  const [anulacionMensaje, setAnulacionMensaje] = useState("");
  const [anulacionTicket, setAnulacionTicket] = useState<string | null>(null);
  const [notaCreditoId, setNotaCreditoId] = useState<number | null>(null);

  // Estados para modal de preview PDF
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);

  const navigate = useNavigate();

  // Función para abrir el previsualizador de PDF en modal
  async function abrirPdfPreview(comprobanteId: number, format: 'A4' | 'TICKET' = 'A4') {
    const maxReintentos = 8;
    let intento = 0;
    
    const intentarAbrirPDF = async (): Promise<boolean> => {
      try {
        intento++;
        const pdfUrl = `/api/v1/comprobantes/${comprobanteId}/files/pdf?format=${format}`;
        const response = await fetch(pdfUrl, {
          headers: {
            'Authorization': `Bearer ${getAuth()?.token}`
          }
        });
        
        if (response.status === 404) {
          if (intento < maxReintentos) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return intentarAbrirPDF();
          } else {
            console.log('PDF no disponible despuós de', intento, 'intentos');
            return false;
          }
        }
        
        if (!response.ok) {
          console.error('Error al obtener PDF:', response.status);
          return false;
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        setShowPdfPreviewModal(true);
        return true;
      } catch (error) {
        console.error('Error abriendo PDF:', error);
        if (intento < maxReintentos) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return intentarAbrirPDF();
        }
        return false;
      }
    };
    
    await intentarAbrirPDF();
  }

  const cerrarPdfPreviewModal = () => {
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setShowPdfPreviewModal(false);
  };

  const imprimirPdfPreview = () => {
    if (pdfPreviewUrl) {
      const a = document.createElement('a');
      a.href = pdfPreviewUrl;
      a.download = 'comprobante.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };


  async function downloadXML(comprobanteId: number) {
    try {
      const response = await fetch(`/api/v1/comprobantes/${comprobanteId}/files/xml`, {
        headers: {
          'Authorization': `Bearer ${getAuth()?.token}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${comprobanteId}.xml`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando XML:', error);
    }
  }

  async function downloadCDR(comprobanteId: number) {
    try {
      const response = await fetch(`/api/v1/comprobantes/${comprobanteId}/files/cdr`, {
        headers: {
          'Authorization': `Bearer ${getAuth()?.token}`
        }
      });

      if (!response.ok) {
        const msg = await response.text();
        alert(msg || `No se pudo descargar CDR (HTTP ${response.status})`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cdr-${comprobanteId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando CDR:', error);
    }
  }

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const data = await listComprobantes();
      setRows(data);
    } catch (ex: unknown) {
      if (ex instanceof AxiosError) {
        const data = ex.response?.data;
        const msg =
          typeof data === "string"
            ? data
            : typeof data === "object" && data !== null && "message" in data
              ? String((data as Record<string, unknown>).message ?? "")
              : "";
        setErr(
          msg || ex.message || "Error cargando comprobantes"
        );
      } else if (ex instanceof Error) {
        setErr(ex.message);
      } else {
        setErr("Error cargando comprobantes");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Función para aplicar los filtros
  function applyFilters() {
    setAppliedTipoDoc(tipoDoc);
    setAppliedQEntidad(qEntidad);
    setAppliedEstado(estado);
    setAppliedDesde(desde);
    setAppliedHasta(hasta);
  }

  // ? Filtrado en frontend (temporal). Luego lo mandas al backend.
  const filtered = useMemo(() => {
    const q = appliedQEntidad.trim().toLowerCase();

    const result = rows.filter((r) => {
      // fecha - comparar solo la parte de fecha sin hora
      if (!r.fechaEmision) return false;
      const fechaComp = r.fechaEmision.split('T')[0]; // "2026-01-09"
      if (fechaComp < appliedDesde || fechaComp > appliedHasta) return false;

      // tipo doc
      if (appliedTipoDoc === "ALL") {
        // "Todos" = solo documentos SUNAT (01, 03, 07, 08)
        if (r.tipoDoc !== "01" && r.tipoDoc !== "03" && r.tipoDoc !== "07" && r.tipoDoc !== "08") return false;
      } else if (appliedTipoDoc === "SUNAT_CPE") {
        // Solo Facturas y Boletas
        if (r.tipoDoc !== "01" && r.tipoDoc !== "03") return false;
      } else {
        if (r.tipoDoc !== appliedTipoDoc) return false;
      }

      // estado
      if (appliedEstado !== "ALL" && (r.estado || "").toUpperCase() !== appliedEstado)
        return false;

      // entidad
      if (q) {
        const nombre = (r.receptorNombre || "").toLowerCase();
        const doc = (r.receptorNroDoc || "").toLowerCase();
        if (!nombre.includes(q) && !doc.includes(q)) return false;
      }

      return true;
    });
    
    return result;
  }, [rows, appliedDesde, appliedHasta, appliedTipoDoc, appliedEstado, appliedQEntidad]);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage]);

  // Resetear a pógina 1 cuando cambien los filtros aplicados
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedDesde, appliedHasta, appliedTipoDoc, appliedEstado, appliedQEntidad]);

  const totals = useMemo(() => {
    let facturas = 0;
    let boletas = 0;
    let notasCredito = 0;
    let notasDebito = 0;

    for (const r of filtered) {
      const t = Number(r.total || 0);
      if (r.tipoDoc === "01") facturas += t;
      else if (r.tipoDoc === "03") boletas += t;
      else if (r.tipoDoc === "07") notasCredito += t;
      else if (r.tipoDoc === "08") notasDebito += t;
    }

    return { facturas, boletas, notasCredito, notasDebito };
  }, [filtered]);

  function onResetFilters() {
    const firstDay = toInputDate(firstDayOfMonth);
    const todayDate = toInputDate(today);
    
    setTipoDoc("SUNAT_CPE");
    setQEntidad("");
    setEstado("ALL");
    setDesde(firstDay);
    setHasta(todayDate);
    
    // Aplicar inmediatamente el reset
    setAppliedTipoDoc("SUNAT_CPE");
    setAppliedQEntidad("");
    setAppliedEstado("ALL");
    setAppliedDesde(firstDay);
    setAppliedHasta(todayDate);
  }

  function getDocRelacionado(r: Comprobante) {
    if (r.docReferenciaTipoDoc && r.docReferenciaSerie && r.docReferenciaCorrelativo) {
      return `${r.docReferenciaTipoDoc}-${r.docReferenciaSerie}-${r.docReferenciaCorrelativo}`;
    }
    return "-";
  }

  function exportExcel() {
    // Estilos para el encabezado
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      fill: { fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    // Estilo para título
    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    // Estilo para subtítulo
    const subtitleStyle = {
      font: { sz: 11, color: { rgb: "666666" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    // Estilos para celdas de datos
    const cellStyle = {
      font: { sz: 9 },
      alignment: { vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "DDDDDD" } },
        bottom: { style: "thin", color: { rgb: "DDDDDD" } },
        left: { style: "thin", color: { rgb: "DDDDDD" } },
        right: { style: "thin", color: { rgb: "DDDDDD" } },
      },
    };

    const cellStyleCenter = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyleRight = { ...cellStyle, alignment: { horizontal: "right", vertical: "center" } };

    // Estilo para moneda
    const currencyStyle = {
      ...cellStyleRight,
      numFmt: '#,##0.00',
    };

    // Estilo SI (verde)
    const siStyle = {
      ...cellStyleCenter,
      font: { sz: 9, bold: true, color: { rgb: "15803D" } },
      fill: { fgColor: { rgb: "DCFCE7" } },
    };

    // Estilo NO (rojo)
    const noStyle = {
      ...cellStyleCenter,
      font: { sz: 9, bold: true, color: { rgb: "DC2626" } },
      fill: { fgColor: { rgb: "FEE2E2" } },
    };

    // Estilo para totales
    const totalLabelStyle = {
      font: { bold: true, sz: 11, color: { rgb: "1E3A5F" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill: { fgColor: { rgb: "E8F4FD" } },
      border: {
        top: { style: "medium", color: { rgb: "1E3A5F" } },
        bottom: { style: "medium", color: { rgb: "1E3A5F" } },
        left: { style: "medium", color: { rgb: "1E3A5F" } },
        right: { style: "thin", color: { rgb: "1E3A5F" } },
      },
    };

    const totalValueStyle = {
      font: { bold: true, sz: 11, color: { rgb: "1E3A5F" } },
      alignment: { horizontal: "right", vertical: "center" },
      fill: { fgColor: { rgb: "E8F4FD" } },
      numFmt: '#,##0.00',
      border: {
        top: { style: "medium", color: { rgb: "1E3A5F" } },
        bottom: { style: "medium", color: { rgb: "1E3A5F" } },
        left: { style: "thin", color: { rgb: "1E3A5F" } },
        right: { style: "medium", color: { rgb: "1E3A5F" } },
      },
    };

    // Crear datos
    const wsData: (string | number | null)[][] = [];

    // Título
    wsData.push(["REPORTE DE COMPROBANTES ELECTRÓNICOS"]);
    wsData.push([`Período: ${new Date(appliedDesde).toLocaleDateString("es-PE")} al ${new Date(appliedHasta).toLocaleDateString("es-PE")}`]);
    wsData.push([`Generado: ${new Date().toLocaleString("es-PE")}`]);
    wsData.push([]); // Fila vacía

    // Función para obtener descripción del tipo de documento de identidad
    const getTipoDocIdentidad = (codigo: string | undefined) => {
      switch (codigo) {
        case "0": return "0-Doc.trib.no.dom.sin.ruc";
        case "1": return "1-DNI";
        case "4": return "4-Carnet extranjería";
        case "6": return "6-RUC";
        case "7": return "7-Pasaporte";
        case "A": return "A-Ced.Diplomática";
        case "B": return "B-Doc.ident.país resid.";
        case "C": return "C-TIN";
        case "D": return "D-IN";
        case "E": return "E-TAM";
        case "F": return "F-PTP";
        default: return codigo || "-";
      }
    };

    // Encabezados completos
    const headers = [
      "FECHA EMISIÓN",
      "FECHA VENC.",
      "TIPO",
      "SERIE",
      "NÚMERO",
      "DOC. ENTIDAD",
      "RUC/DNI",
      "DENOMINACIÓN",
      "MONEDA",
      "GRAVADA",
      "EXONERADA",
      "INAFECTA",
      "IGV",
      "TOTAL",
      "TOTAL GRATUITO",
      "FORMA PAGO",
      "DOC. RELACIONADO",
      "ACEPTADO SUNAT",
      "ESTADO SUNAT - DESCRIPCIÓN",
      "SUNAT RESPONSE CODE",
      "SUNAT ERROR",
      "ANULADO",
    ];
    wsData.push(headers);

    // Datos
    filtered.forEach((r) => {
      const esAceptado = (r.estado || "").toUpperCase() === "ACEPTADO";
      const estadoUpper = (r.estado || "").toUpperCase();
      
      // SUNAT Error: solo mostrar si hay error (no ACEPTADO)
      let sunatError = "-";
      if (estadoUpper === "RECHAZADO" || estadoUpper === "ERROR") {
        sunatError = r.sunatMensaje || "Error en el comprobante";
      }
      
      wsData.push([
        r.fechaEmision ? new Date(r.fechaEmision).toLocaleDateString("es-PE") : "-",
        r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString("es-PE") : "-",
        r.tipoDoc || "-",
        r.serie || "-",
        r.correlativo || 0,
        getTipoDocIdentidad(r.receptorTipoDoc),
        r.receptorNroDoc || "-",
        r.receptorNombre || "-",
        r.moneda || "PEN",
        Number(r.opGravada || 0),
        Number(r.opExonerada || 0),
        Number(r.opInafecta || 0),
        Number(r.igv || 0),
        Number(r.total || 0),
        Number(r.opGratuita || 0),
        r.metodoPago || "CONTADO",
        getDocRelacionado(r),
        esAceptado ? "SI" : "NO",
        r.sunatMensaje || "-",  // Estado SUNAT - Descripción (mensaje completo de SUNAT)
        r.sunatCodigo || "-",    // SUNAT Response Code (código de respuesta)
        sunatError,              // SUNAT Error (solo si hay error)
        r.anulado ? "SI" : "NO",
      ]);
    });

    // Filas vacías antes de totales
    wsData.push([]);
    wsData.push([]);

    // Totales por tipo de documento - Posicionados correctamente debajo de la columna TOTAL (índice 13)
    const totalRow = wsData.length;
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, "TOTAL FACTURAS:", totals.facturas]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, "TOTAL BOLETAS:", totals.boletas]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, "TOTAL NC:", totals.notasCredito]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, "TOTAL ND:", totals.notasDebito]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, "TOTAL GENERAL:", totals.facturas + totals.boletas - totals.notasCredito + totals.notasDebito]);

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar anchos de columna
    ws["!cols"] = [
      { wch: 12 },  // Fecha Emisión
      { wch: 12 },  // Fecha Venc.
      { wch: 6 },   // Tipo
      { wch: 7 },   // Serie
      { wch: 8 },   // Número
      { wch: 22 },  // Doc. Entidad (más ancho para descripción)
      { wch: 12 },  // RUC/DNI
      { wch: 35 },  // Denominación
      { wch: 8 },   // Moneda
      { wch: 11 },  // Gravada
      { wch: 11 },  // Exonerada
      { wch: 11 },  // Inafecta
      { wch: 10 },  // IGV
      { wch: 12 },  // Total
      { wch: 12 },  // Total Gratuito
      { wch: 12 },  // Forma Pago
      { wch: 16 },  // Doc. Relacionado
      { wch: 14 },  // Aceptado SUNAT
      { wch: 50 },  // Estado SUNAT - Descripción (más ancho para mensaje completo)
      { wch: 18 },  // SUNAT Response Code
      { wch: 60 },  // SUNAT Error (más ancho para errores largos)
      { wch: 10 },  // Anulado
    ];

    // Índices de columnas para aplicar estilos
    const COL_GRAVADA = 9;
    const COL_EXONERADA = 10;
    const COL_INAFECTA = 11;
    const COL_IGV = 12;
    const COL_TOTAL = 13;
    const COL_GRATUITO = 14;
    const COL_ACEPTADO = 17;
    const COL_SUNAT_CODE = 19;
    const COL_ANULADO = 21;

    // Aplicar estilos
    // Título
    if (ws["A1"]) ws["A1"].s = titleStyle;
    if (ws["A2"]) ws["A2"].s = subtitleStyle;
    if (ws["A3"]) ws["A3"].s = subtitleStyle;

    // Merge cells para título
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 21 } }, // Título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 21 } }, // Subtítulo 1
      { s: { r: 2, c: 0 }, e: { r: 2, c: 21 } }, // Subtítulo 2
    ];

    // Aplicar estilos a encabezados (fila 5, índice 4)
    const headerRow = 4;
    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    // Aplicar estilos a datos
    for (let row = headerRow + 1; row < totalRow; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef]) {
          // Columnas de moneda
          if (col === COL_GRAVADA || col === COL_EXONERADA || col === COL_INAFECTA || 
              col === COL_IGV || col === COL_TOTAL || col === COL_GRATUITO) {
            ws[cellRef].s = currencyStyle;
          } 
          // Columna Aceptado SUNAT (SI/NO)
          else if (col === COL_ACEPTADO) {
            const val = String(ws[cellRef].v || "").toUpperCase();
            ws[cellRef].s = val === "SI" ? siStyle : noStyle;
          }
          // Columna Anulado (SI/NO)
          else if (col === COL_ANULADO) {
            const val = String(ws[cellRef].v || "").toUpperCase();
            ws[cellRef].s = val === "SI" ? noStyle : siStyle; // Anulado SI = rojo, NO = verde
          }
          // Columnas centradas (fechas, tipo, serie, número, doc entidad, moneda, forma pago, doc relacionado, sunat code)
          else if (col <= 5 || col === 8 || col === 15 || col === 16 || col === COL_SUNAT_CODE) {
            ws[cellRef].s = cellStyleCenter;
          } 
          else {
            ws[cellRef].s = cellStyle;
          }
        }
      }
    }

    // Aplicar estilos a totales - Etiqueta en columna 12 (IGV), valor en columna 13 (TOTAL)
    for (let i = 0; i < 5; i++) {
      const labelRef = XLSX.utils.encode_cell({ r: totalRow + i, c: 12 }); // Columna de etiqueta
      const valueRef = XLSX.utils.encode_cell({ r: totalRow + i, c: 13 }); // Columna de valor (TOTAL)
      if (ws[labelRef]) ws[labelRef].s = totalLabelStyle;
      if (ws[valueRef]) ws[valueRef].s = totalValueStyle;
    }

    // Crear workbook y descargar
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comprobantes");

    // Generar archivo
    XLSX.writeFile(wb, `comprobantes_${appliedDesde}_a_${appliedHasta}.xlsx`);
  }

  function openAnularModal(c: Comprobante) {
    if (c.anulado) {
      alert("Este comprobante ya estó anulado.");
      return;
    }

    if (boletaSinDocumentoIdentidad(c)) {
      alert("SUNAT no permite anular ni emitir Nota de Cródito para una boleta sin DNI/RUC del cliente.");
      return;
    }

    setAnularTarget(c);
    setAnularMotivoOption("");
    setAnularMotivoOtros("");
    setAnularOpen(true);
  }

  function closeAnularModal() {
    if (anulando) return;
    setAnularOpen(false);
    setAnularMotivoOption("");
    setAnularMotivoOtros("");
    setAnularTarget(null);
    setAnularError(null);
  }

  async function confirmAnular() {
    if (!anularTarget) return;

    // Limpiar error previo
    setAnularError(null);

    let motivo = "";
    if (!anularMotivoOption) {
      setAnularError("Debe seleccionar un motivo.");
      return;
    }

    if (anularMotivoOption === "Otros") {
      const otros = anularMotivoOtros.trim();
      if (!otros) {
        setAnularError("Debe escribir el motivo en 'Otros'.");
        return;
      }
      // Se envóa como texto libre, pero con prefijo para trazabilidad
      motivo = `Otros: ${otros}`;
    } else {
      motivo = anularMotivoOption;
    }

    try {
      setAnulando(true);
      const resp = await anularComprobante(anularTarget.id, motivo);

      closeAnularModal();

      // Siempre se genera NC ahora - abrir preview PDF directamente
      if (resp.accion === "NC" && resp.notaCreditoId) {
        // Abrir el previsualizador de PDF
        await abrirPdfPreview(resp.notaCreditoId);
      }
      
      // Recargar lista al final
      await load();
    } catch (e: unknown) {
      if (e instanceof AxiosError) {
        const msg = typeof e.response?.data === "string" ? e.response?.data : e.message;
        setAnularError(msg || "No se pudo generar la Nota de Crédito");
      } else {
        setAnularError(e instanceof Error ? e.message : "No se pudo generar la Nota de Crédito");
      }
    } finally {
      setAnulando(false);
    }
  }

  async function consultarTicket(c: Comprobante) {
    try {
      const resp = await consultarTicketAnulacion(c.id);
      
      // Crear modal personalizado
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
      
      const modal = document.createElement('div');
      modal.style.cssText = 'background: white; border-radius: 16px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);';
      
      modal.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0;">Estado de Anulación</h3>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="margin-bottom: 12px;">
            <span style="font-weight: 500; color: #64748b; font-size: 13px;">Ticket:</span>
            <div style="font-size: 16px; color: #0f172a; font-weight: 600; margin-top: 4px;">${resp.ticket}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="font-weight: 500; color: #64748b; font-size: 13px;">Status Code:</span>
            <div style="font-size: 15px; color: #0f172a; margin-top: 4px;">${resp.statusCode}</div>
          </div>
          ${resp.cdrCode ? `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: 500; color: #64748b; font-size: 13px;">CDR:</span>
            <div style="font-size: 15px; color: #0f172a; margin-top: 4px;">${resp.cdrCode}</div>
          </div>` : ''}
          ${resp.mensaje ? `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: 500; color: #64748b; font-size: 13px;">Mensaje:</span>
            <div style="font-size: 15px; color: #0f172a; margin-top: 4px;">${resp.mensaje}</div>
          </div>` : ''}
          <div>
            <span style="font-weight: 500; color: #64748b; font-size: 13px;">Estado del Comprobante:</span>
            <div style="font-size: 15px; color: #10b981; font-weight: 600; margin-top: 4px;">${resp.comprobanteEstado}</div>
          </div>
        </div>
        <button id="closeModalBtn" style="width: 100%; background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s;">
          Cerrar
        </button>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Hover effect
      const btn = modal.querySelector('#closeModalBtn') as HTMLButtonElement;
      btn.onmouseover = () => btn.style.background = '#2563eb';
      btn.onmouseout = () => btn.style.background = '#3b82f6';
      
      // Cerrar modal
      const closeModal = () => document.body.removeChild(overlay);
      btn.onclick = closeModal;
      overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
      
      await load();
    } catch (e: unknown) {
      if (e instanceof AxiosError) {
        const msg = typeof e.response?.data === "string" ? e.response?.data : e.message;
        alert(msg || "No se pudo consultar el ticket");
      } else {
        alert(e instanceof Error ? e.message : "No se pudo consultar el ticket");
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
                className="h-5 w-5 text-slate-700"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h16M4 12h16M4 17h16"
                />
              </svg>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-semibold leading-tight">
                Comprobantes
              </div>
              <div className="text-xs text-slate-500">
                Facturas y boletas emitidas
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-center mb-6 px-8">
            <button
              onClick={load}
              className="rounded-full bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
              title="Refrescar lista de comprobantes"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"/>
              </svg>
              Refrescar
            </button>
            {/* Botón de prueba removido */}
          </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Tipo doc */}
            <div className="sm:col-span-1 lg:col-span-3">
              <label className="text-xs text-slate-500">Filtrar por tipo</label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value as TipoDoc)}
                className="mt-1 w-full rounded-2xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos (SUNAT)</option>
                <option value="SUNAT_CPE">Facturas y Boletas</option>
                <option value="01">Facturas (01)</option>
                <option value="03">Boletas (03)</option>
                <option value="07">Notas de Crédito (07)</option>
                <option value="08">Notas de Débito (08)</option>
              </select>
            </div>

            {/* Entidad */}
            <div className="sm:col-span-1 lg:col-span-3">
              <label className="text-xs text-slate-500">Buscar por entidad</label>
              <input
                value={qEntidad}
                onChange={(e) => setQEntidad(e.target.value)}
                className="mt-1 w-full rounded-2xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Nombre o RUC/DNI..."
              />
            </div>

            {/* Estado */}
            <div className="sm:col-span-1 lg:col-span-3">
              <label className="text-xs text-slate-500">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as Estado)}
                className="mt-1 w-full rounded-2xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
              >
                <option value="ALL">Todos</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="ENVIADO">Enviado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>

            {/* Rango fechas */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-slate-500">Rango de fechas</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full rounded-2xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="sm:col-span-2 lg:col-span-12 flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <div className="ml-auto flex flex-col sm:flex-row gap-2">
                <button
                  onClick={applyFilters}
                  className="rounded-full bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 3H2l8 9.46v7.54l6 2v-9.54L22 3z"/>
                  </svg>
                  Filtrar
                </button>
                <button
                  onClick={exportExcel}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Descargar Excel
                </button>
                <button
                  onClick={onResetFilters}
                  className="rounded-full bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
                  </svg>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

      {/* Estado carga / error */}
      {loading && <p className="mt-4 text-slate-600">Cargando...</p>}
      {err && <p className="mt-4 text-red-600">{err}</p>}

      {/* Tabla / Cards Responsive */}
      {!loading && !err && (
        <>
          {/* Vista Desktop - Tabla */}
          <div className="hidden lg:block mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                      <th className="px-2 py-2 text-left font-semibold">FECHA</th>
                      <th className="px-2 py-2 text-left font-semibold">TIPO</th>
                      <th className="px-2 py-2 text-left font-semibold">SERIE</th>
                      <th className="px-2 py-2 text-left font-semibold">NUM.</th>
                      <th className="px-2 py-2 text-left font-semibold">RUC/DNI</th>
                      <th className="px-2 py-2 text-left font-semibold">DENOMINACIóN</th>
                      <th className="px-2 py-2 text-right font-semibold">TOTAL</th>
                      <th className="px-2 py-2 text-left font-semibold">ESTADO</th>
                      <th className="px-2 py-2 text-center font-semibold">PDF</th>
                      <th className="px-2 py-2 text-center font-semibold">XML</th>
                      <th className="px-2 py-2 text-center font-semibold">CDR</th>
                      <th className="px-2 py-2 text-center font-semibold">ANULAR</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {paginatedData.map((r) => {
                      const isSel = selectedId === r.id;
                      const strike = r.anulado ? "line-through text-slate-500" : "";
                      const anulacionLabel =
                        r.motivoAnulacion === "NC"
                          ? "ANULADO POR NC"
                          : r.motivoAnulacion === "RA"
                          ? "ANULADO POR RA"
                          : null;

                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={[
                            "cursor-pointer transition",
                            isSel ? "bg-yellow-100/80" : "bg-white hover:bg-yellow-50",
                            r.anulado ? "opacity-80" : "",
                          ].join(" ")}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-700">
                            <span className={strike}>{new Date(r.fechaEmision).toLocaleDateString("es-PE")}</span>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                              <span className={strike}>{tipoDocLabel(r.tipoDoc)}</span>
                            </span>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-800 font-medium">
                            <span className={strike}>{r.serie}</span>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-800">
                            <span className={strike}>{r.correlativo}</span>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-700">
                            <span className={strike}>{r.receptorNroDoc || "-"}</span>
                          </td>

                          <td className="px-2 py-1.5 max-w-xs">
                            <div className="font-medium text-slate-900 truncate">
                              <span className={strike}>{r.receptorNombre || "-"}</span>
                            </div>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-right font-semibold text-slate-900">
                            <span className={strike}>S/ {money(r.total)}</span>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {r.estado === 'ACEPTADO' ? (
                              <div className="inline-flex items-center justify-center cursor-help group relative">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-green-400">
                                  {r.sunatMensaje || 'Documento aceptado por SUNAT'}
                                  <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-green-500"></span>
                                </span>
                              </div>
                            ) : r.estado === 'RECHAZADO' ? (
                              <div className="inline-flex items-center justify-center cursor-help group relative">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border border-red-400">
                                  {r.sunatMensaje || 'Documento rechazado por SUNAT'}
                                  <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-red-500"></span>
                                </span>
                              </div>
                            ) : r.estado === 'PENDIENTE_ENVIO' ? (
                              <div className="inline-flex items-center gap-2 cursor-help group relative">
                                <svg className="animate-spin h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-xs text-orange-600 font-medium">Pendiente</span>
                              </div>
                            ) : (
                              <StatusPill value={r.estado} title={r.sunatMensaje || `Estado: ${r.estado}`} />
                            )}

                            {r.anulado && anulacionLabel ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                  {anulacionLabel}
                                </span>
                              </div>
                            ) : null}
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            <div className="relative inline-block text-left">
                              <select
                                onChange={(e) => {
                                  const format = e.target.value;
                                  if (format) {
                                    abrirPdfPreview(r.id, format as 'A4' | 'TICKET');
                                    e.target.value = '';
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer"
                              >
                                <option value="">PDF </option>
                                <option value="A4">A4</option>
                                <option value="TICKET">Ticket</option>
                              </select>
                            </div>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadXML(r.id); }}
                              className="inline-flex items-center justify-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-green-500"
                            >
                              XML
                            </button>
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            {r.estado === 'PENDIENTE_ENVIO' || r.estado === 'PENDIENTE_BAJA' ? (
                              <div className="inline-flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadCDR(r.id); }}
                                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-sky-500"
                              >
                                CDR
                              </button>
                            )}
                          </td>

                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            {((r.tipoDoc === "01" || r.tipoDoc === "03") && (r.estado || "").toUpperCase() === "ACEPTADO" && !r.anulado) ? (
                              boletaSinDocumentoIdentidad(r) ? (
                                <button
                                  type="button"
                                  disabled
                                  title="SUNAT no permite anular boletas sin DNI/RUC del cliente"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center rounded-full bg-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 cursor-not-allowed"
                                >
                                  Anular
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openAnularModal(r); }}
                                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  Anular
                                </button>
                              )
                            ) : (r.estado === 'PENDIENTE_BAJA' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); consultarTicket(r); }}
                                className="inline-flex items-center justify-center rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-orange-500"
                              >
                                Consultar ticket
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vista Móvil - Cards */}
            <div className="lg:hidden mt-4 space-y-3">
              {paginatedData.map((r) => (
                <div
                  key={r.id}
                  className={[
                    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
                    r.anulado ? "opacity-80" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {tipoDocLabel(r.tipoDoc)}
                        </span>
                        <span className={["font-bold text-slate-900", r.anulado ? "line-through text-slate-500" : ""].join(" ")}>
                          {r.serie}-{r.correlativo}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className={r.anulado ? "line-through" : ""}>
                          {new Date(r.fechaEmision).toLocaleDateString("es-PE")}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill value={r.estado} title={r.sunatMensaje || `Estado: ${r.estado}`} />
                      {r.anulado ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          {r.motivoAnulacion === "NC" ? "ANULADO POR NC" : r.motivoAnulacion === "RA" ? "ANULADO POR RA" : "ANULADO"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-3 pb-3 border-b border-slate-100">
                    <div className={["font-medium text-slate-900", r.anulado ? "line-through text-slate-500" : ""].join(" ")}>
                      {r.receptorNombre || "-"}
                    </div>
                    <div className={["text-sm text-slate-600", r.anulado ? "line-through text-slate-500" : ""].join(" ")}>
                      {r.receptorNroDoc || "-"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className={["text-lg font-bold text-slate-900", r.anulado ? "line-through text-slate-500" : ""].join(" ")}>
                      S/ {money(r.total)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        const format = e.target.value;
                        if (format) {
                          abrirPdfPreview(r.id, format as 'A4' | 'TICKET');
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer"
                    >
                      <option value="">PDF</option>
                      <option value="A4">A4</option>
                      <option value="TICKET">Ticket</option>
                    </select>
                    <button
                      onClick={() => downloadXML(r.id)}
                      className="flex-1 rounded-full bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500"
                    >
                      XML
                    </button>
                    <button
                      onClick={() => downloadCDR(r.id)}
                      className="flex-1 rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500"
                      disabled={r.estado === 'PENDIENTE_ENVIO' || r.estado === 'PENDIENTE_BAJA'}
                    >
                      CDR
                    </button>

                    {((r.tipoDoc === "01" || r.tipoDoc === "03") && (r.estado || "").toUpperCase() === "ACEPTADO" && !r.anulado) && (
                      boletaSinDocumentoIdentidad(r) ? (
                        <button
                          type="button"
                          disabled
                          title="SUNAT no permite anular boletas sin DNI/RUC del cliente"
                          className="flex-1 rounded-full bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 cursor-not-allowed"
                        >
                          Anular
                        </button>
                      ) : (
                        <button
                          onClick={() => openAnularModal(r)}
                          className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          title="Emitir Nota de Cródito por anulación"
                        >
                          Anular (NC)
                        </button>
                      )
                    )}

                    {r.estado === 'PENDIENTE_BAJA' && (
                      <button
                        onClick={() => consultarTicket(r)}
                        className="flex-1 rounded-full bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500"
                      >
                        Consultar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  No hay comprobantes con esos filtros.
                </div>
              )}
            </div>

            <Modal
              isOpen={anularOpen}
              onClose={closeAnularModal}
              title="Emitir Nota de Cródito"
              size="sm"
            >
              <div className="space-y-3">
                <div className="text-sm text-slate-700">
                  {anularTarget ? (
                    <>
                      <div className="font-semibold text-slate-900">
                        {anularTarget.tipoDoc}-{anularTarget.serie}-{anularTarget.correlativo}
                      </div>
                      <div className="text-xs text-slate-500">
                        Fecha: {new Date(anularTarget.fechaEmision).toLocaleDateString("es-PE")} ó Total: S/ {money(anularTarget.total)}
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-blue-800">
                            <span className="font-semibold">Se generaró una Nota de Cródito (tipo 01)</span> por anulación total del comprobante, incluyendo todos los ótems originales.
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Motivo</label>

                  <select
                    value={anularMotivoOption}
                    onChange={(e) => setAnularMotivoOption(e.target.value as MotivoAnulacionOption)}
                    disabled={anulando}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">Seleccione un motivo</option>
                    {MOTIVOS_ANULACION.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {anularMotivoOption === "Otros" ? (
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Especifique</label>
                      <textarea
                        value={anularMotivoOtros}
                        onChange={(e) => setAnularMotivoOtros(e.target.value)}
                        rows={3}
                        disabled={anulando}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="Escriba el motivo..."
                      />
                    </div>
                  ) : null}

                  <div className="mt-2 text-[11px] text-slate-500">
                    Si seleccionas "Otros", recién se habilita el campo para escribir.
                  </div>

                  {/* Mensaje de error */}
                  {anularError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-xs text-red-800 font-medium">
                          {anularError}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeAnularModal}
                    disabled={anulando}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmAnular}
                    disabled={anulando}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {anulando ? "Generando NC..." : "Generar Nota de Cródito"}
                  </button>
                </div>
              </div>
            </Modal>

            {/* Controles de paginación */}
            {filtered.length > itemsPerPage && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                <div className="text-sm text-slate-600">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} comprobantes
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Primera
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={[
                            "w-9 h-9 rounded-lg text-sm font-medium",
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                          ].join(" ")}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    óltima
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Resumen de totales */}
        {!loading && !err && filtered.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">REGISTROS</div>
                <div className="text-xl font-bold text-slate-900">
                  {filtered.length}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">FACTURAS</div>
                <div className="text-xl font-bold text-slate-900">
                  S/ {money(totals.facturas)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">BOLETAS</div>
                <div className="text-xl font-bold text-slate-900">
                  S/ {money(totals.boletas)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">NOTAS CRÉDITO</div>
                <div className="text-xl font-bold text-slate-900">
                  S/ {money(totals.notasCredito)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">NOTAS DÉBITO</div>
                <div className="text-xl font-bold text-slate-900">
                  S/ {money(totals.notasDebito)}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-2 -m-2">
                <div className="text-xs text-blue-600 mb-1 font-medium">TOTAL</div>
                <div className="text-xl font-bold text-blue-700">
                  S/ {money(totals.facturas + totals.boletas - totals.notasCredito + totals.notasDebito)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de resultado de anulación */}
      {anulacionResultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {notaCreditoId ? "Nota de Cródito Creada" : "Anulación Enviada"}
                  </h3>
                  <p className="text-sm text-green-100 mt-0.5">Operación exitosa</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-slate-700 text-sm leading-relaxed">
                  {anulacionMensaje}
                </p>
              </div>

              {anulacionTicket && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-blue-900 mb-1">Nómero de Ticket</p>
                      <p className="text-sm font-mono text-blue-700 font-medium">{anulacionTicket}</p>
                    </div>
                  </div>
                </div>
              )}

              {notaCreditoId && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-900 mb-2">Nota de Credito Generada</p>
                      <button
                        onClick={() => {
                          setAnulacionResultOpen(false);
                          if (notaCreditoId) {
                            navigate(`/admin/comprobantes/${notaCreditoId}`);
                          }
                        }}
                        className="text-sm font-medium text-amber-700 hover:text-amber-800 underline"
                      >
                        Ver detalles del comprobante ?
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setAnulacionResultOpen(false);
                  setAnulacionMensaje("");
                  setAnulacionTicket(null);
                  setNotaCreditoId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview PDF */}
      {showPdfPreviewModal && pdfPreviewUrl && (
        <Modal
          isOpen={showPdfPreviewModal}
          onClose={cerrarPdfPreviewModal}
          title="Vista Previa - Nota de Cródito"
          size="xl"
        >
          <div className="flex flex-col h-[75vh]">
            <div className="flex justify-end gap-2 p-3 border-b border-slate-200">
              <button
                onClick={cerrarPdfPreviewModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={imprimirPdfPreview}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
            </div>
            <div className="flex-1">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0 rounded"
                title="Vista previa de la Nota de Cródito"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
