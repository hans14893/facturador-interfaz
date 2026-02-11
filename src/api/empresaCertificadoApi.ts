import { http } from "../api/http";
import { AxiosError } from "axios";

export type CertificadoInfo = {
  id: number;
  empresaId: number;
  fechaVencimiento?: string;
  nombreTitular?: string;
  rucTitular?: string;
  vigente?: boolean;
};

export async function getMyCertificadoInfo(): Promise<CertificadoInfo | null> {
  try {
    const { data } = await http.get("/api/v1/empresas/me/certificado/info");
    return data;
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function uploadMyCertificado(file: File, password: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("password", password);

  const { data } = await http.post("/api/v1/empresas/me/certificado", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
