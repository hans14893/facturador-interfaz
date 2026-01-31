import { http } from "./http";

export type CodigoProductoSunat = {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
};

export async function listCodigosProductoSunat(): Promise<CodigoProductoSunat[]> {
  const { data } = await http.get("/api/v1/codigos-producto-sunat");
  return data;
}
