import { http } from "./http";

export type Categoria = {
  id: number;
  nombre: string;
  descripcion?: string;
  empresaId: number;
  activo: boolean;
  createdAt: string;
};

export async function listCategorias(): Promise<Categoria[]> {
  const { data } = await http.get("/api/v1/categorias");
  return data;
}

export async function createCategoria(payload: {
  nombre: string;
  descripcion?: string;
}): Promise<Categoria> {
  const { data } = await http.post("/api/v1/categorias", payload);
  return data;
}

export async function updateCategoria(id: number, payload: {
  nombre?: string;
  descripcion?: string;
}): Promise<Categoria> {
  const { data } = await http.put(`/api/v1/categorias/${id}`, payload);
  return data;
}

export async function deleteCategoria(id: number): Promise<void> {
  await http.delete(`/api/v1/categorias/${id}`);
}
