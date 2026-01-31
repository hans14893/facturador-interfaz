import { Navigate, Outlet } from "react-router-dom";
import { isAdmin, isLoggedIn } from "./authStore";

export default function RequireAdmin() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/admin/comprobantes" replace />;
  return <Outlet />;
}
