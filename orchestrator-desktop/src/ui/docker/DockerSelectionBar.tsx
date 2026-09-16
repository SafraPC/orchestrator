import type { DockerResourceKind } from "../../api/types";
import { Icon } from "../Icons";
import { kindLabel } from "./dockerFormat";

export function DockerSelectionBar(props: {
  counts: Record<DockerResourceKind, number>;
  total: number;
  busy: boolean;
  onClear: () => void;
  onRemove: () => void;
}) {
  if (props.total === 0) return null;

  const parts = (Object.keys(props.counts) as DockerResourceKind[])
    .filter((kind) => props.counts[kind] > 0)
    .map((kind) => `${props.counts[kind]} ${kindLabel(kind, props.counts[kind])}`);

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-accent/20 bg-accent/[0.06] px-4 py-2 animate-slide-up">
      <div className="flex min-w-0 items-center gap-2">
        <Icon.Check className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="truncate text-2xs text-slate-300">
          <strong className="font-semibold text-accent">{props.total}</strong> selecionado(s) — {parts.join(", ")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="btn btn-ghost text-2xs px-2 py-1" onClick={props.onClear} disabled={props.busy}>
          Limpar seleção
        </button>
        <button
          className="btn btn-danger gap-1.5 text-2xs px-2.5 py-1 font-semibold disabled:opacity-40"
          onClick={props.onRemove}
          disabled={props.busy}
        >
          <Icon.Trash className="h-3.5 w-3.5" />
          {props.busy ? "Removendo..." : "Remover selecionados"}
        </button>
      </div>
    </div>
  );
}
