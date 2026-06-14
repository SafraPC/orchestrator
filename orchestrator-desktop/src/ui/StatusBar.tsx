import type { ServiceDto } from "../api/types";
import type { AppUpdateState } from "./useAppUpdater";
import { Icon } from "./Icons";
import { Tooltip } from "./Tooltip";

export function StatusBar(props: {
  services: ServiceDto[];
  selectedContainer: string | null;
  filteredCount: number;
  update: AppUpdateState;
}) {
  const running = props.services.filter((s) => s.status === "RUNNING").length;
  const stopped = props.services.filter((s) => s.status === "STOPPED").length;
  const errors = props.services.filter((s) => s.status === "ERROR").length;
  const total = props.services.length;
  const { update } = props;

  return (
    <div className="divider px-3 py-2 shrink-0">
      <div className="flex items-center justify-between gap-2 text-2xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium shrink-0">
            {props.filteredCount}/{total}
            {props.selectedContainer ? " filtrado" : ""}
          </span>
          <UpdateNotice update={update} />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {running > 0 && <Pill color="bg-mint" count={running} />}
          {stopped > 0 && <Pill color="bg-slate-600" count={stopped} />}
          {errors > 0 && <Pill color="bg-danger" count={errors} />}
        </div>
      </div>
    </div>
  );
}

function UpdateNotice(props: { update: AppUpdateState }) {
  const { update } = props;

  if (update.installing) {
    const label = update.progress != null ? `Baixando atualização ${update.progress}%` : "Instalando atualização…";
    return (
      <span className="flex items-center gap-1 truncate text-accent">
        <Icon.Restart className="h-3 w-3 shrink-0 animate-spin" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (update.available && update.version) {
    const tip = update.notes?.trim() ? update.notes : `Versão ${update.version} disponível no GitHub.`;
    return (
      <Tooltip text={tip}>
        <button
          type="button"
          className="flex max-w-[14rem] items-center gap-1 truncate rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent transition-colors hover:bg-accent/20"
          onClick={() => void props.update.installUpdate()}
        >
          <Icon.Download className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium">Atualização v{update.version}</span>
        </button>
      </Tooltip>
    );
  }

  if (update.checking) {
    return <span className="truncate text-slate-600">Verificando atualizações…</span>;
  }

  return null;
}

function Pill(props: { color: string; count: number }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${props.color}`} />
      <span className="tabular-nums">{props.count}</span>
    </span>
  );
}
