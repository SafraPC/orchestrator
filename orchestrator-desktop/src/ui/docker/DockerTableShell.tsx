import type { ReactNode } from "react";
import { Icon } from "../Icons";

export type DockerColumn = {
  key: string;
  label: string;
  className?: string;
};

export function DockerCheckbox(props: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const state = props.indeterminate ? "indeterminate" : props.checked ? "checked" : "empty";
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-checked={props.indeterminate ? "mixed" : props.checked}
      role="checkbox"
      onClick={(e) => {
        e.stopPropagation();
        props.onChange(!props.checked);
      }}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
        state === "empty"
          ? "border-white/[0.22] bg-surface-0 hover:border-accent/60 hover:bg-accent/[0.08]"
          : "border-accent bg-accent/25"
      }`}
    >
      {state === "checked" && <Icon.Check className="h-2.5 w-2.5 text-accent" />}
      {state === "indeterminate" && <span className="h-0.5 w-2 rounded-full bg-accent" />}
    </button>
  );
}

export function DockerTableShell(props: {
  columns: DockerColumn[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  isEmpty: boolean;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-white/[0.06] bg-surface-1/60 px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-slate-600">
        <DockerCheckbox
          checked={props.allSelected}
          indeterminate={!props.allSelected && props.someSelected}
          onChange={props.onToggleAll}
          label="Selecionar todos"
        />
        {props.columns.map((column) => (
          <span key={column.key} className={column.className ?? "flex-1 min-w-0"}>
            {column.label}
          </span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {props.isEmpty ? (
          <div className="flex flex-col items-center py-14 text-slate-600 animate-fade-in">
            <Icon.Box className="mb-3 h-8 w-8 text-slate-700" />
            <span className="text-2xs">{props.emptyLabel}</span>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">{props.children}</div>
        )}
      </div>
    </div>
  );
}

export function DockerRow(props: {
  selected: boolean;
  onToggle: (checked: boolean) => void;
  label: string;
  actionsClassName: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`group flex items-center gap-4 px-3 py-2.5 transition-colors ${
        props.selected ? "bg-accent/[0.06]" : "hover:bg-surface-1/70"
      }`}
    >
      <DockerCheckbox checked={props.selected} onChange={props.onToggle} label={props.label} />
      {props.children}
      <div
        className={`flex items-center justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 ${props.actionsClassName}`}
      >
        {props.actions}
      </div>
    </div>
  );
}

export function DockerRowAction(props: {
  onClick: () => void;
  disabled?: boolean;
  tone: "accent" | "danger" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    accent: "text-accent hover:bg-accent/10",
    danger: "text-danger hover:bg-danger/10",
    neutral: "text-slate-500 hover:bg-white/5 hover:text-accent",
  };
  return (
    <button
      type="button"
      className={`rounded-md p-1 transition-all duration-100 disabled:opacity-30 ${tones[props.tone]}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
