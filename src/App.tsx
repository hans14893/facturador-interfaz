import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./auth/RequireAuth";
import RequireAdmin from "./auth/RequireAdmin";
import { ConnectionStatus } from "./components/ConnectionStatus";

import ComprobantesPage from "./pages/ComprobantesPage";
import ComprobanteDetallePage from "./pages/ComprobanteDetallePage";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminEmpresasPage from "./pages/admin/empresa/AdminEmpresasPage";
import AdminEmpresaHomePage from "./pages/admin/empresa/AdminEmpresaHomePage";
import AdminUsuariosPage from "./pages/admin/empresa/AdminUsuariosPage";
import AdminCertificadoPage from "./pages/admin/empresa/AdminCertificadoPage";
import AdminApiClientsPage from "./pages/admin/empresa/AdminApiClientsPage";
import AdminEmpresaConfigPage from "./pages/admin/empresa/AdminEmpresaConfigPage";
import ConfiguracionGeneralPage from "./pages/admin/ConfiguracionGeneralPage";

// Módulo de Ventas
import ProductosPage from "./pages/admin/ventas/ProductosPage";
import EntidadesComercialesPage from "./pages/admin/ventas/EntidadesComercialesPage";
import PuntoVentaPage from "./pages/admin/ventas/PuntoVentaPage";
import VentasPage from "./pages/admin/ventas/VentasPage";
import NotaCreditoPage from "./pages/admin/ventas/NotaCreditoPage";
import NotaDebitoPage from "./pages/admin/ventas/NotaDebitoPage";
import GuiasRemisionPage from "./pages/admin/ventas/GuiasRemisionPage";

// Módulo de Compras
import ComprasPage from "./pages/admin/compras/ComprasPage";
import PuntoCompraPage from "./pages/admin/compras/PuntoCompraPage";

// Módulo de Caja
import CajasPage from "./pages/admin/caja/CajasPage";
import AbrirCajaModal from "./pages/admin/caja/modals/AbrirCajaModal";
import NuevaCajaFisicaModal from "./pages/admin/caja/modals/NuevaCajaFisicaModal";
import CajaOperacionPage from "./pages/admin/caja/CajaOperacionPage";
import MovimientoModal from "./pages/admin/caja/modals/MovimientoModal";
import ArqueoModal from "./pages/admin/caja/modals/ArqueoModal";
import CerrarCajaModal from "./pages/admin/caja/modals/CerrarCajaModal";
import FinalizarArqueoPage from "./pages/admin/caja/FinalizarArqueoPage";
import VerArqueoModal from "./pages/admin/caja/modals/VerArqueoModal";

// Configuración
import ReportesPage from "./pages/admin/configuracion/ReportesPage";
import MiCuentaPage from "./pages/admin/configuracion/MiCuentaPage";
import ConfiguracionEmpresaPage from "./pages/admin/configuracion/ConfiguracionEmpresaPage";
import SeriesPage from "./pages/admin/configuracion/SeriesPage";
import UnidadesInternaPage from "./pages/admin/configuracion/UnidadesInternaPage";

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionStatus />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Sistema principal - todos los usuarios autenticados */}
          <Route path="/admin" element={<AdminLayout />}>
            {/* Dashboard solo para ADMIN */}
            <Route index element={<AdminDashboardPage />} />
            
            {/* Comprobantes - accesible para todos */}
            <Route path="comprobantes" element={<ComprobantesPage />} />
            <Route path="comprobantes/:id" element={<ComprobanteDetallePage />} />

            {/* Módulo de Punto de Venta - accesible para todos */}
            <Route path="punto-venta" element={<PuntoVentaPage />} />
            <Route path="ventas" element={<VentasPage />} />
            <Route path="notas-credito" element={<NotaCreditoPage />} />
            <Route path="notas-debito" element={<NotaDebitoPage />} />
            <Route path="guias-remision" element={<GuiasRemisionPage />} />
            <Route path="productos" element={<ProductosPage />} />
            {/* Legacy: reemplazado por EntidadComercial */}
            <Route path="clientes" element={<Navigate to="/admin/entidades-comerciales" replace />} />
            <Route path="entidades-comerciales" element={<EntidadesComercialesPage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="compras/nueva" element={<PuntoCompraPage />} />
            <Route path="punto-compra" element={<PuntoCompraPage />} />
            <Route path="reportes" element={<ReportesPage />} />

            {/* Módulo de Caja - accesible para todos */}
            <Route path="cajas" element={<CajasPage />} />
            <Route path="cajas/abrir" element={<AbrirCajaModal />} />
            <Route path="cajas/nueva" element={<NuevaCajaFisicaModal />} />
            <Route path="cajas/:id/operacion" element={<CajaOperacionPage />} />
            <Route path="cajas/:id/movimiento" element={<MovimientoModal />} />
            <Route path="cajas/:id/arqueo" element={<ArqueoModal />} />
            <Route path="cajas/:id/cerrar" element={<CerrarCajaModal />} />
            <Route path="cajas/:id/finalizar-arqueo" element={<FinalizarArqueoPage />} />
            <Route path="cajas/:id/ver-arqueo" element={<VerArqueoModal />} />

            {/* Configuración - accesible para todos */}
            <Route path="mi-cuenta" element={<MiCuentaPage />} />
            <Route path="configuracion-empresa" element={<ConfiguracionEmpresaPage />} />
            <Route path="series" element={<SeriesPage />} />
            <Route path="unidades-medida" element={<UnidadesInternaPage />} />

            {/* ADMIN exclusivo */}
            <Route element={<RequireAdmin />}>
              <Route path="empresas" element={<AdminEmpresasPage />} />
              <Route path="empresas/:empresaId" element={<AdminEmpresaHomePage />} />
              <Route path="empresas/:empresaId/usuarios" element={<AdminUsuariosPage />} />
              <Route path="empresas/:empresaId/certificado" element={<AdminCertificadoPage />} />
              <Route path="empresas/:empresaId/api-clients" element={<AdminApiClientsPage />} />
              <Route path="empresas/:empresaId/configuracion" element={<AdminEmpresaConfigPage />} />
              <Route path="configuracion-general" element={<ConfiguracionGeneralPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
