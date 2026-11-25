export function MonitorTabs(props: {
  mode: "service" | "monitor";
  onMode: (m: "service" | "monitor") => void;
  canMonitor: boolean;
}) {
  if (!props.canMonitor) {
    return null;
  }
  return (
    <div className="flex items-center gap-1 px-4 pt-2 shrink-0">
      <button
        className={`rounded-md px-2.5 py-1 text-2xs font-medium transition-all duration-150 ${props.mode === "service" ? "bg-accent/15 text-accent" : "text-slate-500 hover:text-slate-300 hover:bg-surface-3"}`}
        onClick={() => props.onMode("service")}
      >
        Serviço
      </button>
      <button
        className={`rounded-md px-2.5 py-1 text-2xs font-medium transition-all duration-150 ${props.mode === "monitor" ? "bg-accent/15 text-accent" : "text-slate-500 hover:text-slate-300 hover:bg-surface-3"}`}
        onClick={() => props.onMode("monitor")}
      >
        Monitor
      </button>
    </div>
  );
}
