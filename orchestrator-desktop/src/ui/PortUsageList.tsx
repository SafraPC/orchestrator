import { useMemo, useState } from "react";
import type { ListeningPortDto, PortOrigin } from "../api/types";
import { Icon } from "./Icons";

const ORIGIN_LABELS: Record<PortOrigin, string> = {
  cursor: "Cursor",
  vscode: "VS Code",
  ide: "IDE",
  terminal: "Terminal",
  docker: "Docker",
  runtime: "Runtime",
  system: "Sistema",
};

const ORIGIN_STYLES: Record<PortOrigin, string> = {
  cursor: "bg-accent/10 text-accent",
  vscode: "bg-sky-400/10 text-sky-300",
  ide: "bg-violet-400/10 text-violet-300",
  terminal: "bg-white/[0.06] text-slate-300",
  docker: "bg-blue-400/10 text-blue-300",
  runtime: "bg-warn/10 text-warn",
  system: "bg-white/[0.04] text-slate-500",
};

const FILTERS = [
  { id: "all", label: "Todas", match: () => true },
  { id: "dev", label: "Dev", match: (p: ListeningPortDto) => p.devPort },
  { id: "tools", label: "Editor/Terminal", match: (p: ListeningPortDto) => p.devRelated },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function PortUsageList(props: {
  ports: ListeningPortDto[];
  loading: boolean;
  error: string | null;
  busyPort: number | null;
  onRefresh: () => void;
  onKill: (port: number) => void;
}) {
  const [filterId, setFilterId] = useState<FilterId>("all");
  const [term, setTerm] = useState("");

  const visible = useMemo(() => {
    const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
    const needle = term.trim().toLowerCase();
    return props.ports.filter((p) => {
      if (!filter.match(p)) return false;
      if (!needle) return true;
      return `${p.port} ${p.processName} ${p.command}`.toLowerCase().includes(needle);
    });
  }, [props.ports, filterId, term]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`btn text-2xs px-2 py-1 ${filterId === f.id ? "btn-success" : "btn-ghost"}`}
              onClick={() => setFilterId(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-ghost text-2xs px-2 py-1"
          onClick={props.onRefresh}
          disabled={props.loading}
          title="Atualizar lista"
        >
          <Icon.Restart className="h-3 w-3" />
          {props.loading ? "Lendo..." : "Atualizar"}
        </button>
      </div>

      <div className="relative shrink-0">
        <Icon.Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Filtrar por porta ou processo"
          className="input pl-7"
        />
      </div>

      {props.error ? (
        <p className="shrink-0 text-2xs text-danger">Não foi possível listar as portas em uso: {props.error}</p>
      ) : null}

      <div className="min-h-[12rem] flex-1 overflow-y-auto rounded border border-white/[0.06] divide-y divide-white/[0.04]">
        {visible.length === 0 ? (
          <p className="px-3 py-4 text-2xs text-slate-500">
            {props.loading ? "Lendo portas em uso..." : "Nenhuma porta encontrada para este filtro."}
          </p>
        ) : (
          visible.map((p) => (
            <PortRow
              key={`${p.pid}:${p.port}`}
              port={p}
              busy={props.busyPort === p.port}
              disabled={props.busyPort !== null}
              onKill={() => props.onKill(p.port)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PortRow(props: {
  port: ListeningPortDto;
  busy: boolean;
  disabled: boolean;
  onKill: () => void;
}) {
  const p = props.port;
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 hover:bg-white/[0.03]">
      <span className="w-14 shrink-0 font-mono text-xs font-semibold text-slate-200">{p.port}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-2xs font-medium text-slate-300">{p.processName || "desconhecido"}</span>
          <span className={`badge ${ORIGIN_STYLES[p.origin]}`}>{ORIGIN_LABELS[p.origin]}</span>
        </div>
        <p className="truncate text-2xs text-slate-600 font-mono" title={p.command || undefined}>
          PID {p.pid} · {p.address} {p.command ? `· ${p.command}` : ""}
        </p>
      </div>
      <button
        className="btn btn-danger text-2xs px-2 py-1 shrink-0 disabled:opacity-40"
        onClick={props.onKill}
        disabled={props.disabled}
      >
        {props.busy ? "..." : "Derrubar"}
      </button>
    </div>
  );
}
