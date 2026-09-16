import type { MouseEvent, ReactNode } from "react";
import type { ContainerDto } from "../api/types";
import { ContainerEditOverlay } from "./ContainerEditModal";
import type { ToastType } from "./Toast";
import { useContainerEdit } from "./useContainerEdit";

export function ContainerTabs(props: {
  containers: ContainerDto[];
  selectedContainer: string | null;
  onSelect: (id: string | null) => Promise<void>;
  onContainersChanged?: () => void | Promise<void>;
  onToast?: (type: ToastType, message: string) => void;
}) {
  const editor = useContainerEdit(props.onContainersChanged, props.onToast);

  return (
    <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: "none" }}>
      <TabBtn active={props.selectedContainer === null} onClick={() => void props.onSelect(null)}>
        Todos
      </TabBtn>
      {props.containers.map((c) => (
        <TabBtn
          key={c.id}
          active={props.selectedContainer === c.id}
          onClick={() => void props.onSelect(c.id)}
          onContextMenu={(e) => editor.openMenu(c, e)}
        >
          {c.name}
        </TabBtn>
      ))}
      <ContainerEditOverlay
        menu={editor.menu}
        editTarget={editor.editTarget}
        onCloseMenu={editor.closeMenu}
        onStartEdit={editor.startEdit}
        onCancel={editor.cancelEdit}
        onConfirm={editor.save}
      />
    </div>
  );
}

function TabBtn(props: {
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`rounded-md px-2.5 py-1 text-2xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
        props.active ? "bg-accent/15 text-accent" : "text-slate-500 hover:text-slate-300 hover:bg-surface-3"
      }`}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
    >
      {props.children}
    </button>
  );
}
