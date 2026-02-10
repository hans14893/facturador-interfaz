export default function StatusPill({ value, title }: { value: string; title?: string }) {
  const v = (value || "").toUpperCase();

  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border cursor-help";

  const map: Record<string, string> = {
    ACEPTADO: "border-emerald-300 bg-emerald-50 text-emerald-700",
    RECIBIDO: "border-green-300 bg-green-50 text-green-700",
    PENDIENTE: "border-amber-300 bg-amber-50 text-amber-700",
    PENDIENTE_ENVIO: "border-amber-300 bg-amber-50 text-amber-700",
    ENVIADO: "border-cyan-300 bg-cyan-50 text-cyan-700",
    RECHAZADO: "border-red-300 bg-red-50 text-red-700",
    OBSERVADO: "border-purple-300 bg-purple-50 text-purple-700",
    ANULADO: "border-red-300 bg-red-50 text-red-700",
    CANCELADO: "border-slate-300 bg-slate-100 text-slate-600",
  };

  // Colores de tooltip según el estado
  const tooltipColors: Record<string, string> = {
    ACEPTADO: "bg-gradient-to-r from-green-600 to-green-500 border-green-400 text-white",
    RECHAZADO: "bg-gradient-to-r from-red-600 to-red-500 border-red-400 text-white",
    OBSERVADO: "bg-gradient-to-r from-purple-600 to-purple-500 border-purple-400 text-white",
  };

  const tooltipArrowColors: Record<string, string> = {
    ACEPTADO: "border-t-green-500",
    RECHAZADO: "border-t-red-500",
    OBSERVADO: "border-t-purple-500",
  };

  const tooltipColor = tooltipColors[v] || "bg-slate-700 border-slate-500 text-white";
  const arrowColor = tooltipArrowColors[v] || "border-t-slate-800";

  const tooltipStyle = {
    position: 'relative' as const,
  };

  return (
    <span 
      className={`${base} ${map[v] || "border-slate-300 bg-slate-100 text-slate-600"} group`}
      style={tooltipStyle}
    >
      {v}
      {title && (
        <span className={`invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 text-sm font-medium rounded-lg shadow-xl whitespace-nowrap z-50 border ${tooltipColor}`}>
          {title}
          <span className={`absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent ${arrowColor}`}></span>
        </span>
      )}
    </span>
  );
}
