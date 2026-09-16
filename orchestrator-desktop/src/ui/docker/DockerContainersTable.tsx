import type { DockerContainerDto } from "../../api/types";
import { Icon } from "../Icons";
import { Tooltip } from "../Tooltip";
import { isRunning, shortPorts, stateTone } from "./dockerFormat";
import { DockerRow, DockerRowAction, DockerTableShell } from "./DockerTableShell";
import type { DockerColumn } from "./DockerTableShell";
import { selectionKey } from "./dockerSelection";

const COLS = {
  name: "flex-1 min-w-0",
  image: "w-48 shrink-0 min-w-0",
  state: "w-32 shrink-0 text-center",
  ports: "w-28 shrink-0 text-center",
  actions: "w-20 shrink-0",
};

const COLUMNS: DockerColumn[] = [
  { key: "name", label: "Container", className: COLS.name },
  { key: "image", label: "Imagem", className: COLS.image },
  { key: "state", label: "Estado", className: COLS.state },
  { key: "ports", label: "Portas", className: COLS.ports },
  { key: "actions", label: "", className: COLS.actions },
];

export function DockerContainersTable(props: {
  containers: DockerContainerDto[];
  selection: Set<string>;
  busyIds: Record<string, string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], selected: boolean) => void;
  onStart: (container: DockerContainerDto) => void;
  onStop: (container: DockerContainerDto) => void;
  onRestart: (container: DockerContainerDto) => void;
  onRemove: (container: DockerContainerDto) => void;
}) {
  const keys = props.containers.map((c) => selectionKey("CONTAINER", c.id));
  const selectedCount = keys.filter((key) => props.selection.has(key)).length;

  return (
    <DockerTableShell
      columns={COLUMNS}
      allSelected={keys.length > 0 && selectedCount === keys.length}
      someSelected={selectedCount > 0}
      onToggleAll={(checked) => props.onToggleAll(keys, checked)}
      isEmpty={props.containers.length === 0}
      emptyLabel="Nenhum container encontrado"
    >
      {props.containers.map((container) => {
        const key = selectionKey("CONTAINER", container.id);
        const running = isRunning(container.state);
        const busy = props.busyIds[container.id];
        const ports = shortPorts(container.ports);
        return (
          <DockerRow
            key={container.id}
            selected={props.selection.has(key)}
            onToggle={() => props.onToggle(key)}
            label={`Selecionar container ${container.name}`}
            actionsClassName={COLS.actions}
            actions={
              <>
                {running ? (
                  <Tooltip text="Parar">
                    <DockerRowAction tone="danger" disabled={!!busy} onClick={() => props.onStop(container)}>
                      <Icon.Stop className="h-3 w-3" />
                    </DockerRowAction>
                  </Tooltip>
                ) : (
                  <Tooltip text="Iniciar">
                    <DockerRowAction tone="accent" disabled={!!busy} onClick={() => props.onStart(container)}>
                      <Icon.Play className="h-3 w-3" />
                    </DockerRowAction>
                  </Tooltip>
                )}
                <Tooltip text="Reiniciar">
                  <DockerRowAction tone="neutral" disabled={!!busy} onClick={() => props.onRestart(container)}>
                    <Icon.Restart className="h-3 w-3" />
                  </DockerRowAction>
                </Tooltip>
                <Tooltip text="Remover">
                  <DockerRowAction tone="neutral" disabled={!!busy} onClick={() => props.onRemove(container)}>
                    <Icon.Trash className="h-3 w-3" />
                  </DockerRowAction>
                </Tooltip>
              </>
            }
          >
            <div className={COLS.name}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-xs font-medium text-slate-200" title={container.name}>
                  {container.name}
                </span>
                {container.project && (
                  <span className="badge shrink-0 bg-surface-3 text-slate-500" title="Projeto Compose">
                    {container.project}
                  </span>
                )}
              </div>
              <span className="mt-1 block truncate font-mono text-2xs text-slate-600" title={container.command}>
                {container.id} · {container.command}
              </span>
            </div>
            <span className={`${COLS.image} truncate font-mono text-2xs text-slate-500`} title={container.image}>
              {container.image}
            </span>
            <span className={COLS.state}>
              <span className={`badge ${stateTone(container.state)}`}>
                {busy ? busy : container.state}
              </span>
              <span className="mt-1 block truncate text-2xs text-slate-600" title={container.status}>
                {container.status}
              </span>
            </span>
            <span className={`${COLS.ports} truncate font-mono text-2xs text-slate-500`} title={container.ports}>
              {ports || "—"}
            </span>
          </DockerRow>
        );
      })}
    </DockerTableShell>
  );
}
