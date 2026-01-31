import { AxiosError } from "axios";

export function getErrorMessage(error: unknown, fallback = "Error desconocido"): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? error.response?.data ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function handleApiError(error: unknown, fallback = "Error desconocido"): void {
  const message = getErrorMessage(error, fallback);
  alert(message);
  console.error(fallback, error);
}
