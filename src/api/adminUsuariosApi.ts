import { http } from "../api/http";

export type Rol = {
  id: number;
  empresaId: number;
  nombre: string;
  activo: boolean;
  createdAt?: string;
};

export type Usuario = {
  id: number;
  empresaId: number;
  username: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  roles?: string[]; // Array de nombres de roles
};

export async function listUsuarios(empresaId?: string | number | null): Promise<Usuario[]> {
  // Si hay empresaId, filtrar por empresa. Si no (superadmin), listar todos
  const endpoint = empresaId 
    ? `/api/v1/admin/usuarios/empresa/${empresaId}` 
    : `/api/v1/admin/usuarios`;
  const { data } = await http.get(endpoint);
  return data;
}

export async function createUsuario(empresaId: string | number, payload: {
  username: string;
  password: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  roles: string[];
}) {
  const { data } = await http.post(`/api/v1/admin/usuarios`, { ...payload, empresaId });
  return data;
}

export async function listRoles(empresaId?: string | number): Promise<Rol[]> {
  const params = empresaId ? { empresaId } : {};
  const { data } = await http.get(`/api/v1/roles`, { params });
  return data;
}

export async function updateUsuario(empresaId: string | number, usuarioId: number, payload: {
  username?: string;
  password?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  roles?: string[];
  activo?: boolean;
}) {
  const { data } = await http.put(`/api/v1/admin/usuarios/${usuarioId}`, payload);
  return data;
}

export async function deleteUsuario(usuarioId: number) {
  const { data } = await http.delete(`/api/v1/admin/usuarios/${usuarioId}`);
  return data;
}

export async function desactivarUsuario(usuarioId: number) {
  const { data } = await http.patch(`/api/v1/admin/usuarios/${usuarioId}/desactivar`);
  return data;
}

export async function activarUsuario(usuarioId: number) {
  const { data } = await http.patch(`/api/v1/admin/usuarios/${usuarioId}/activar`);
  return data;
}
