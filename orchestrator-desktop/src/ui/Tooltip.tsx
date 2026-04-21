import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export function Tooltip(props: { text: string; delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ms = props.delay ?? 400;

  const show = useCallback(() => {
    timer.current = setTimeout(() => setVisible(true), ms);
  }, [ms]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(false);
  }, []);

  const [below, setBelow] = useState(false);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const estimatedWidth = Math.min(props.text.length * 7 + 24, 280);
    const half = estimatedWidth / 2;
    const center = r.left + r.width / 2;
    const minLeft = margin + half;
    const maxLeft = window.innerWidth - margin - half;
    const left = Math.max(minLeft, Math.min(maxLeft, center));
    const needsFlip = r.top < 32;
    setBelow(needsFlip);
    if (needsFlip) {
      setPos({ top: r.bottom + 6, left });
    } else {
      setPos({ top: r.top - 6, left });
    }
  }, [visible, props.text]);

  return (
    <span ref={triggerRef} className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {props.children}
      {visible && pos && createPortal(
        <span
          className="fixed z-[999] whitespace-nowrap animate-fade-in pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: below ? "translate(-50%, 0)" : "translate(-50%, -100%)", maxWidth: "280px" }}
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
