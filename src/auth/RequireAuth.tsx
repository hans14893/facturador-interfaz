import { Navigate, Outlet } from "react-router-dom";
import { isLoggedIn } from "./authStore";

export default function RequireAuth() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <Outlet />;
}
