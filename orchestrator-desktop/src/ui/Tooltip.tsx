import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export function Tooltip(props: { text: string; delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const ms = props.delay ?? 400;

  const show = useCallback(() => {
    timer.current = setTimeout(() => setVisible(true), ms);
  }, [ms]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(false);
    setPos(null);
  }, []);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const half = tip.width / 2;
    const center = trigger.left + trigger.width / 2;
    const left = half * 2 + margin * 2 >= window.innerWidth
      ? window.innerWidth / 2
      : Math.max(margin + half, Math.min(window.innerWidth - margin - half, center));
    const below = trigger.top - gap - tip.height < margin;
    setPos({ top: below ? trigger.bottom + gap : trigger.top - gap, left, below });
  }, [visible, props.text]);

  return (
    <span ref={triggerRef} className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {props.children}
      {visible && createPortal(
        <span
          ref={tipRef}
          className="fixed z-[999] whitespace-nowrap animate-fade-in pointer-events-none"
          style={{
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            transform: pos?.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            visibility: pos ? "visible" : "hidden",
          }}
        >
          <span className="block rounded bg-surface-4 px-2 py-1 text-2xs text-slate-200 shadow-elevated border border-white/[0.08]">
            {props.text}
          </span>
        </span>,
        document.body,
      )}
    </span>
  );
}
