export default function StatusPill({ value, title }: { value: string; title?: string }) {
  const v = (value || "").toUpperCase();

  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border cursor-help";

  const map: Record<string, string> = {
    ACEPTADO: "border-emerald-700 bg-emerald-950/40 text-emerald-200",
    RECIBIDO: "border-green-600 bg-green-950/40 text-green-200",
    PENDIENTE: "border-amber-600 bg-amber-950/40 text-amber-200",
    PENDIENTE_ENVIO: "border-amber-700 bg-amber-950/40 text-amber-200",
    ENVIADO: "border-cyan-700 bg-cyan-950/40 text-cyan-200",
    RECHAZADO: "border-red-700 bg-red-950/40 text-red-200",
    OBSERVADO: "border-purple-700 bg-purple-950/40 text-purple-200",
    ANULADO: "border-red-600 bg-red-950/40 text-red-300",
    CANCELADO: "border-slate-700 bg-slate-950/40 text-slate-300",
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
      className={`${base} ${map[v] || "border-slate-700 bg-slate-950/40 text-slate-200"} group`}
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
