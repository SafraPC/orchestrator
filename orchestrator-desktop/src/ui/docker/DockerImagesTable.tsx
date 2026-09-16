import type { DockerImageDto } from "../../api/types";
import { Icon } from "../Icons";
import { Tooltip } from "../Tooltip";
import { imageReference } from "./dockerFormat";
import { DockerRow, DockerRowAction, DockerTableShell } from "./DockerTableShell";
import type { DockerColumn } from "./DockerTableShell";
import { selectionKey } from "./dockerSelection";

const COLS = {
  repository: "flex-1 min-w-0",
  size: "w-24 shrink-0 text-center",
  created: "w-32 shrink-0 text-center",
  usage: "w-24 shrink-0 text-center",
  actions: "w-20 shrink-0",
};

const COLUMNS: DockerColumn[] = [
  { key: "repository", label: "Imagem", className: COLS.repository },
  { key: "size", label: "Tamanho", className: COLS.size },
  { key: "created", label: "Criada", className: COLS.created },
  { key: "usage", label: "Uso", className: COLS.usage },
  { key: "actions", label: "", className: COLS.actions },
];

export function DockerImagesTable(props: {
  images: DockerImageDto[];
  selection: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], selected: boolean) => void;
  onRemove: (image: DockerImageDto) => void;
}) {
  const keys = props.images.map((image) => selectionKey("IMAGE", image.id));
  const selectedCount = keys.filter((key) => props.selection.has(key)).length;

  return (
    <DockerTableShell
      columns={COLUMNS}
      allSelected={keys.length > 0 && selectedCount === keys.length}
      someSelected={selectedCount > 0}
      onToggleAll={(checked) => props.onToggleAll(keys, checked)}
      isEmpty={props.images.length === 0}
      emptyLabel="Nenhuma imagem encontrada"
    >
      {props.images.map((image) => {
        const key = selectionKey("IMAGE", image.id);
        const reference = imageReference(image.repository, image.tag, image.id);
        return (
          <DockerRow
            key={image.id}
            selected={props.selection.has(key)}
            onToggle={() => props.onToggle(key)}
            label={`Selecionar imagem ${reference}`}
            actionsClassName={COLS.actions}
            actions={
              <Tooltip text="Remover">
                <DockerRowAction tone="neutral" onClick={() => props.onRemove(image)}>
                  <Icon.Trash className="h-3 w-3" />
                </DockerRowAction>
              </Tooltip>
            }
          >
            <div className={COLS.repository}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-xs font-medium text-slate-200" title={reference}>
                  {reference}
                </span>
                {image.dangling && (
                  <span className="badge shrink-0 bg-warn/10 text-warn" title="Imagem sem tag">
                    dangling
                  </span>
                )}
              </div>
              <span className="mt-1 block truncate font-mono text-2xs text-slate-600">{image.id}</span>
            </div>
            <span className={`${COLS.size} font-mono text-2xs text-slate-400`}>{image.size}</span>
            <span className={`${COLS.created} truncate text-2xs text-slate-600`} title={image.createdAt}>
              {image.createdSince}
            </span>
            <span className={COLS.usage}>
              <span className={`badge ${image.inUse ? "bg-accent/10 text-accent" : "bg-surface-3 text-slate-500"}`}>
                {image.inUse ? "em uso" : "livre"}
              </span>
            </span>
          </DockerRow>
        );
      })}
    </DockerTableShell>
  );
}
