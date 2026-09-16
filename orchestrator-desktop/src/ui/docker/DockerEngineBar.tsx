import type { DockerEngineStatusDto } from "../../api/types";
import { Icon } from "../Icons";
import { Tooltip } from "../Tooltip";
import { engineHeadline, providerLabel } from "./dockerFormat";

export function DockerEngineBar(props: {
  status: DockerEngineStatusDto | null;
  loading: boolean;
  onRefresh: () => void;
  onStart: () => void;
  onConfigure: () => void;
  onPrune: () => void;
}) {
  const status = props.status;
  const running = status?.engineRunning ?? false;
  const starting = status?.starting ?? false;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            running ? "bg-accent/15" : starting ? "bg-warn/15" : "bg-surface-3"
          }`}
        >
          <Icon.Docker
            className={`h-4 w-4 ${running ? "text-accent" : starting ? "text-warn" : "text-slate-600"}`}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              {status ? engineHeadline(status) : "Verificando Docker..."}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                running ? "bg-accent" : starting ? "animate-pulse bg-warn" : "bg-slate-700"
              }`}
            />
          </div>
          <span className="block truncate text-2xs text-slate-600">{describe(status)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!running && (
          <button
            className="btn btn-primary gap-1.5 text-2xs px-2.5 py-1 disabled:opacity-40"
            onClick={props.onStart}
            disabled={starting || !status}
          >
            <Icon.Power className="h-3.5 w-3.5" />
            {starting ? "Iniciando..." : "Iniciar Docker"}
          </button>
        )}
        {running && (
          <Tooltip text="Liberar espaço removendo recursos não utilizados">
            <button className="btn btn-ghost gap-1.5 text-2xs px-2 py-1" onClick={props.onPrune}>
              <Icon.Eraser className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          </Tooltip>
        )}
        <Tooltip text="Comando de inicialização do Docker">
          <button className="btn btn-ghost gap-1.5 text-2xs px-2 py-1" onClick={props.onConfigure}>
            <Icon.Terminal className="h-3.5 w-3.5" />
            <span>Comando</span>
          </button>
        </Tooltip>
        <Tooltip text="Atualizar">
          <button
            className="btn btn-ghost px-2 py-1 disabled:opacity-40"
            onClick={props.onRefresh}
            disabled={props.loading}
            aria-label="Atualizar"
          >
            <Icon.Refresh className={`h-3.5 w-3.5 ${props.loading ? "animate-spin-slow" : ""}`} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function describe(status: DockerEngineStatusDto | null): string {
  if (!status) return "";
  const parts: string[] = [providerLabel(status)];
  if (status.serverVersion) parts.push(`engine ${status.serverVersion}`);
  else if (status.clientVersion) parts.push(`cli ${status.clientVersion}`);
  if (status.context) parts.push(`contexto ${status.context}`);
  if (!status.engineRunning && status.message) parts.push(status.message);
  return parts.join(" · ");
}
