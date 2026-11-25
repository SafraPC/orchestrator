import { useCallback, useRef } from "react";

export function ResizeHandle(props: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = props.value;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const w = Math.min(props.max, Math.max(props.min, startW.current + ev.clientX - startX.current));
        props.onChange(w);
      };
      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [props],
  );

  return (
    <div
      className="w-1 shrink-0 cursor-col-resize hover:bg-accent/20 active:bg-accent/40 transition-colors"
      onMouseDown={onDown}
    />
  );
}
