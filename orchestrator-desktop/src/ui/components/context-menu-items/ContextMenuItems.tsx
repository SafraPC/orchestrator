import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../icons/Icons";

export function clampTop(top: number, height: number): number {
  const max = window.innerHeight - height - 8;
  return Math.max(8, Math.min(top, max));
}

export function SubMenu(props: {
  label: string;
  icon: keyof typeof Icon;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onEnter: () => void;
  onLeave: () => void;
  children: React.ReactNode;
}) {
  const Ic = Icon[props.icon];
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);
  const adjusted = useRef(false);

  const recalc = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }
    adjusted.current = false;
    const r = triggerRef.current.getBoundingClientRect();
    const menuRect = props.menuRef.current?.getBoundingClientRect();
    const menuRight = menuRect ? menuRect.right : r.right;
    const menuLeft = menuRect ? menuRect.left : r.left;
    const left = menuRight + 4;
    const fitsRight = left + 192 <= window.innerWidth;
    setSubPos({
      top: r.top,
      left: fitsRight ? left : menuLeft - 196,
    });
  }, [props.menuRef]);

  useLayoutEffect(() => {
    if (!props.isOpen || !panelRef.current || !subPos || adjusted.current) {
      return;
    }
    const h = panelRef.current.getBoundingClientRect().height;
    const clamped = clampTop(subPos.top, h);
    if (clamped !== subPos.top) {
      adjusted.current = true;
      setSubPos((prev) => prev ? { ...prev, top: clamped } : prev);
    }
  }, [props.isOpen, subPos]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => {
        props.onEnter();
        recalc();
      }}
      onMouseLeave={props.onLeave}
    >
      <button className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${props.isOpen ? "bg-surface-3 text-slate-200" : "text-slate-400 hover:text-slate-200 hover:bg-surface-3"}`}>
        <Ic className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{props.label}</span>
        <Icon.Chevron className="h-3 w-3 shrink-0 rotate-180" />
      </button>
      {props.isOpen && subPos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[202] w-48 animate-scale-in rounded-lg border border-white/[0.08] bg-surface-2 shadow-elevated backdrop-blur-xl max-h-60 overflow-y-auto"
          style={{ top: subPos.top, left: subPos.left }}
          onMouseEnter={props.onEnter}
          onMouseLeave={props.onLeave}
        >
          <div className="p-1">{props.children}</div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function MenuItem(props: {
  icon: keyof typeof Icon;
  label: string;
  cls?: string;
  onClick: () => void | Promise<void>;
}) {
  const Ic = Icon[props.icon];
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${props.cls ?? "text-slate-400 hover:text-slate-200 hover:bg-surface-3"}`}
      onClick={() => void props.onClick()}
    >
      <Ic className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{props.label}</span>
    </button>
  );
}
