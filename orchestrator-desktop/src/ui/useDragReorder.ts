import { useCallback, useRef, useState } from "react";

export interface GripProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export function useDragReorder<T>(
  items: T[],
  getId: (item: T) => string,
  onCommit: (reordered: T[]) => void
) {
  const [localOrder, setLocalOrder] = useState<T[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ items, getId, onCommit });
  stateRef.current = { items, getId, onCommit };

  const display = localOrder ?? items;

  const startDrag = useCallback((id: string, startClientY: number) => {
    const container = containerRef.current;
    const { items: srcItems, getId: gid } = stateRef.current;
    if (!container) return;

    const srcIdx = srcItems.findIndex((it) => gid(it) === id);
    if (srcIdx < 0) return;

    const dragChildren = Array.from(
      container.querySelectorAll<HTMLElement>("[data-drag-item]")
    );
    if (dragChildren.length < 2) return;

    const heights = dragChildren.map((c) => c.getBoundingClientRect().height);
    const gap = dragChildren.length > 1
      ? dragChildren[1].getBoundingClientRect().top - dragChildren[0].getBoundingClientRect().bottom
      : 4;

    let currentOrder = [...srcItems];
    let currentIdx = srcIdx;

    setActiveId(id);
    setLocalOrder([...srcItems]);

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    let lastY = startClientY;
    let accumulated = 0;

    const onMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - lastY;
      lastY = ev.clientY;
      accumulated += deltaY;

      let newIdx = currentIdx;

      if (accumulated > 0) {
        let threshold = 0;
        for (let i = currentIdx + 1; i < currentOrder.length; i++) {
          threshold += (heights[i] + gap) / 2;
          if (accumulated > threshold) newIdx = i;
          else break;
        }
      } else if (accumulated < 0) {
        let threshold = 0;
        for (let i = currentIdx - 1; i >= 0; i--) {
          threshold -= (heights[i] + gap) / 2;
          if (accumulated < threshold) newIdx = i;
          else break;
        }
      }

      if (newIdx !== currentIdx) {
        const copy = [...currentOrder];
        const [moved] = copy.splice(currentIdx, 1);
        copy.splice(newIdx, 0, moved);

        const movedH = heights[currentIdx];
        heights.splice(currentIdx, 1);
        heights.splice(newIdx, 0, movedH);

        currentOrder = copy;
        currentIdx = newIdx;
        accumulated = 0;

        setLocalOrder(copy);
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const { items: latestItems, getId: latestGetId, onCommit: latestCommit } = stateRef.current;
      const changed = currentOrder.some((it, i) =>
        i < latestItems.length && latestGetId(it) !== latestGetId(latestItems[i])
      );

      setActiveId(null);
      setLocalOrder(null);

      if (changed) latestCommit(currentOrder);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const gripProps = useCallback(
    (id: string): GripProps => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startDrag(id, e.clientY);
      },
    }),
    [startDrag]
  );

  return { items: display, containerRef, gripProps, activeId };
}
