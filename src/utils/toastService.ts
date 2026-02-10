import type { ToastType } from "../components/Toast";

type AddToastFn = (toast: { type: ToastType; message: string; duration?: number }) => void;

let addToastFn: AddToastFn | null = null;

/** Registra la función interna de Toast (llamado por ToastContainer) */
export function _registerToast(fn: AddToastFn) {
  addToastFn = fn;
}

/** Desregistra (cleanup) */
export function _unregisterToast() {
  addToastFn = null;
}

/** Muestra un toast desde cualquier parte de la app */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration = 4000,
) {
  addToastFn?.({ type, message, duration });
}
