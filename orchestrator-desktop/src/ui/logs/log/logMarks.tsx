import { useState } from "react";
import { Icon } from "../../icons/Icons";

export function useLogMarks() {
  const [markA, setMarkA] = useState<number | null>(null);
  const [markB, setMarkB] = useState<number | null>(null);

  function handleLineClick(idx: number) {
    if (markA === null) {
      setMarkA(idx);
      setMarkB(null);
    } else if (markB === null) {
      setMarkB(idx);
    } else {
      setMarkA(idx);
      setMarkB(null);
    }
  }

  function clearMarks() {
    setMarkA(null);
    setMarkB(null);
  }

  const rangeMin = markA !== null && markB !== null ? Math.min(markA, markB) : null;
  const rangeMax = markA !== null && markB !== null ? Math.max(markA, markB) : null;

  return { markA, markB, handleLineClick, clearMarks, rangeMin, rangeMax };
}

export function LogRangeHint(props: {
  markA: number | null;
  markB: number | null;
  onCopy: () => void;
  onCancel: () => void;
}) {
  if (props.markA === null) {
    return null;
  }
  return (
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 animate-slide-up z-10">
      {props.markB === null ? (
        <span className="inline-flex items-center gap-2 rounded-lg bg-surface-3 border border-accent/25 text-accent shadow-glow-accent text-xs px-3 py-1.5 font-medium">
          <Icon.Pencil className="h-3 w-3" />
          Clique em outra linha para selecionar o trecho
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-lg bg-surface-3 border border-accent/25 shadow-glow-accent text-xs px-2 py-1">
          <span className="text-accent font-medium tabular-nums">
            {Math.abs(props.markB - props.markA) + 1} linhas
          </span>
          <button className="btn btn-primary text-2xs px-2.5 py-1" onClick={props.onCopy}>
            <Icon.Copy className="h-3 w-3" /> Copiar
          </button>
          <button className="btn btn-ghost text-2xs px-1.5 py-1 text-slate-500" onClick={props.onCancel}>
            <Icon.X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}

export function JumpToEndButton(props: { onClick: () => void }) {
  return (
    <button
      className="absolute bottom-6 right-6 btn btn-primary shadow-glow animate-slide-up select-none"
      onClick={props.onClick}
    >
      <Icon.ArrowDown className="h-3 w-3" /> Final
    </button>
  );
}

export function LogToolbarButton(props: {
  icon: keyof typeof Icon;
  active?: boolean;
  onClick: () => void;
}) {
  const Ic = Icon[props.icon];
  return (
    <button
      className={`btn btn-ghost px-2 py-1 ${props.active ? "bg-accent/15 text-accent" : ""}`}
      onClick={props.onClick}
    >
      <Ic className="h-3.5 w-3.5" />
    </button>
  );
}
