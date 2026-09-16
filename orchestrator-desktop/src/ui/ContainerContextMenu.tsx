import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MenuItem } from "./ContextMenu";

export function ContainerContextMenu(props: {
  x: number;
  y: number;
  onEdit: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: props.y, left: props.x });

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setPos({
      top: Math.max(8, Math.min(props.y, window.innerHeight - rect.height - 8)),
      left: Math.max(8, Math.min(props.x, window.innerWidth - rect.width - 8)),
    });
  }, [props.x, props.y]);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200]"
        onClick={props.onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          props.onClose();
        }}
      />
      <div
        ref={menuRef}
        className="fixed z-[201] w-44 animate-scale-in rounded-lg border border-white/[0.08] bg-surface-2 shadow-elevated backdrop-blur-xl"
        style={{ top: pos.top, left: pos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-1">
          <MenuItem
            icon="Pencil"
            label="Editar"
            onClick={() => {
              props.onClose();
              props.onEdit();
            }}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
