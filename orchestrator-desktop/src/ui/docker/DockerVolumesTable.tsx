import type { DockerVolumeDto } from "../../api/types";
import { Icon } from "../Icons";
import { Tooltip } from "../Tooltip";
import { DockerRow, DockerRowAction, DockerTableShell } from "./DockerTableShell";
import type { DockerColumn } from "./DockerTableShell";
import { selectionKey } from "./dockerSelection";

const COLS = {
  name: "flex-1 min-w-0",
  driver: "w-24 shrink-0 text-center",
  usage: "w-24 shrink-0 text-center",
  actions: "w-20 shrink-0",
};

const COLUMNS: DockerColumn[] = [
  { key: "name", label: "Volume", className: COLS.name },
  { key: "driver", label: "Driver", className: COLS.driver },
  { key: "usage", label: "Uso", className: COLS.usage },
  { key: "actions", label: "", className: COLS.actions },
];

export function DockerVolumesTable(props: {
  volumes: DockerVolumeDto[];
  selection: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], selected: boolean) => void;
  onRemove: (volume: DockerVolumeDto) => void;
}) {
  const keys = props.volumes.map((volume) => selectionKey("VOLUME", volume.name));
  const selectedCount = keys.filter((key) => props.selection.has(key)).length;

  return (
    <DockerTableShell
      columns={COLUMNS}
      allSelected={keys.length > 0 && selectedCount === keys.length}
      someSelected={selectedCount > 0}
      onToggleAll={(checked) => props.onToggleAll(keys, checked)}
      isEmpty={props.volumes.length === 0}
      emptyLabel="Nenhum volume encontrado"
    >
      {props.volumes.map((volume) => {
        const key = selectionKey("VOLUME", volume.name);
        return (
          <DockerRow
            key={volume.name}
            selected={props.selection.has(key)}
            onToggle={() => props.onToggle(key)}
            label={`Selecionar volume ${volume.name}`}
            actionsClassName={COLS.actions}
            actions={
              <Tooltip text="Remover">
                <DockerRowAction tone="neutral" onClick={() => props.onRemove(volume)}>
                  <Icon.Trash className="h-3 w-3" />
                </DockerRowAction>
              </Tooltip>
            }
          >
            <div className={COLS.name}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-xs font-medium text-slate-200" title={volume.name}>
                  {volume.name}
                </span>
                {volume.anonymous && (
                  <span className="badge shrink-0 bg-warn/10 text-warn" title="Volume anônimo">
                    anônimo
                  </span>
                )}
              </div>
              <span className="mt-1 block truncate font-mono text-2xs text-slate-600" title={volume.mountpoint}>
                {volume.mountpoint}
              </span>
            </div>
            <span className={`${COLS.driver} font-mono text-2xs text-slate-500`}>{volume.driver}</span>
            <span className={COLS.usage}>
              <span className={`badge ${volume.inUse ? "bg-accent/10 text-accent" : "bg-surface-3 text-slate-500"}`}>
                {volume.inUse ? "em uso" : "livre"}
              </span>
            </span>
          </DockerRow>
        );
      })}
    </DockerTableShell>
  );
}
