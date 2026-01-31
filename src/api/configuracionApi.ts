import { http } from "./http";

export async function getConfiguracion(): Promise<Record<string, string>> {
  const { data } = await http.get("/api/v1/configuracion");
  return data;
}

export async function updateConfiguracion(clave: string, valor: string): Promise<void> {
  try {
    // Intenta actualizar primero
    await http.put(`/api/v1/admin/configuracion/${clave}`, { valor });
  } catch (error: any) {
    // Si no existe (404), créalo con POST
    if (error.response?.status === 404) {
      await http.post("/api/v1/admin/configuracion", { 
        clave, 
        valor,
        descripcion: `Configuración para ${clave}`
      });
    } else {
      throw error;
    }
  }
}
