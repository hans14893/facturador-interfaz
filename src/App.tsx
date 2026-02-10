import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./auth/RequireAuth";
import RequireAdmin from "./auth/RequireAdmin";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { ToastContainer } from "./components/Toast";

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
import AdminEmpresaSeriesPage from "./pages/admin/empresa/AdminEmpresaSeriesPage";
import ConfiguracionGeneralPage from "./pages/admin/ConfiguracionGeneralPage";
import MiCuentaPage from "./pages/admin/configuracion/MiCuentaPage";

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
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

            {/* Cuenta - accesible para todos */}
            <Route path="mi-cuenta" element={<MiCuentaPage />} />

            {/* ADMIN exclusivo */}
            <Route element={<RequireAdmin />}>
              <Route path="empresas" element={<AdminEmpresasPage />} />
              <Route path="empresas/:empresaId" element={<AdminEmpresaHomePage />} />
              <Route path="empresas/:empresaId/usuarios" element={<AdminUsuariosPage />} />
              <Route path="empresas/:empresaId/certificado" element={<AdminCertificadoPage />} />
              <Route path="empresas/:empresaId/api-clients" element={<AdminApiClientsPage />} />
              <Route path="empresas/:empresaId/series" element={<AdminEmpresaSeriesPage />} />
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
