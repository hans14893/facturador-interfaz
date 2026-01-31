import { useCallback, useEffect } from "react";
import Modal from "./Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  message = "Esta acción no se puede deshacer.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
}: Props) {
  const colors = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
    info: "bg-blue-600 hover:bg-blue-700 text-white",
  };

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose, handleConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="py-4">
        <p className="text-sm text-slate-600 whitespace-pre-line">{message}</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          autoFocus
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition ${colors[variant]}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
