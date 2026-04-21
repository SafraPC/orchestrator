import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icons";

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Icon;
  iconClassName?: string;
};

export function Dropdown<T extends string>(props: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  align?: "left" | "right";
  placeholder?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const align = props.align ?? "right";
  const selected = props.options.find((o) => o.value === props.value);

  const measure = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const minWidth = Math.max(r.width, 140);
    const left = align === "right" ? Math.max(8, r.right - minWidth) : r.left;
    setPos({ top: r.bottom + 4, left, width: minWidth });
  }, [align]);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSelect = useCallback(
    (value: T) => {
      props.onChange(value);
      setOpen(false);
    },
    [props],
  );

  const SelectedIcon = selected?.icon ? Icon[selected.icon] : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group inline-flex items-center justify-between gap-1.5 rounded border border-white/[0.08] bg-surface-2 px-2 py-1 text-2xs text-slate-300 transition-colors hover:border-white/[0.16] hover:text-slate-100 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 ${
          open ? "border-accent/40 ring-1 ring-accent/20 text-slate-100" : ""
        } ${props.className ?? ""}`}
      >
        <span className="inline-flex items-center gap-1.5 truncate">
          {SelectedIcon && <SelectedIcon className={`h-3 w-3 shrink-0 ${selected?.iconClassName ?? ""}`} />}
          <span className="truncate">{selected?.label ?? props.placeholder ?? ""}</span>
        </span>
        <Icon.Chevron
          className={`h-3 w-3 shrink-0 text-slate-500 transition-transform duration-150 ${open ? "rotate-90" : "-rotate-90"}`}
        />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="fixed z-[201] animate-scale-in rounded-lg border border-white/[0.08] bg-surface-2 p-1 shadow-elevated backdrop-blur-xl"
            style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          >
            {props.options.map((opt) => {
              const Ic = opt.icon ? Icon[opt.icon] : null;
              const active = opt.value === props.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-2xs transition-colors ${
                    active ? "bg-accent/10 text-accent" : "text-slate-300 hover:bg-surface-3 hover:text-slate-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    {Ic && <Ic className={`h-3 w-3 shrink-0 ${opt.iconClassName ?? ""}`} />}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {active && <Icon.Check className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
