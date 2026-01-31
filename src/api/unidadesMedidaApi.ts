import { http } from "./http";

export type UnidadMedida = {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
};

export type ListUnidadesMedidaParams = {
  search?: string;
};

export async function listUnidadesMedida(
  params: ListUnidadesMedidaParams = {}
): Promise<UnidadMedida[]> {
  const { data } = await http.get("/api/v1/unidades-medida", {
    params: params.search ? { search: params.search } : undefined,
  });
  return data;
}
