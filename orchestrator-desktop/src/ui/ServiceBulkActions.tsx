import { Icon } from "./Icons";

export function ServiceBulkActions(props: {
  selected: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <MenuAction
      icon={props.selected ? "X" : "Check"}
      label={props.selected ? "Remover da seleção" : "Selecionar +1"}
      onClick={() => {
        props.onToggle();
        props.onClose();
      }}
    />
  );
}

export function ServiceBulkRemoveAction(props: {
  count: number;
  onRemoveMany: () => void;
  onClose: () => void;
}) {
  if (props.count === 0) return null;
  return (
    <MenuAction
      icon="Trash"
      label={`Remover vários (${props.count})`}
      danger
      onClick={() => {
        props.onRemoveMany();
        props.onClose();
      }}
    />
  );
}

function MenuAction(props: {
  icon: keyof typeof Icon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const Ic = Icon[props.icon];
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
        props.danger ? "text-danger/70 hover:text-danger hover:bg-danger/10" : "text-slate-400 hover:text-slate-200 hover:bg-surface-3"
      }`}
      onClick={props.onClick}
    >
      <Ic className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{props.label}</span>
    </button>
  );
}
