import { useCallback, useState, type MouseEvent } from "react";
import { api } from "../api/client";
import type { ContainerDto } from "../api/types";
import type { ToastType } from "./Toast";

export function useContainerEdit(
  onChanged?: () => void | Promise<void>,
  onToast?: (type: ToastType, message: string) => void,
) {
  const [menu, setMenu] = useState<{ container: ContainerDto; x: number; y: number } | null>(null);
  const [editTarget, setEditTarget] = useState<ContainerDto | null>(null);

  const openMenu = useCallback((container: ContainerDto, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ container, x: event.clientX, y: event.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const startEdit = useCallback((container: ContainerDto) => {
    setMenu(null);
    setEditTarget(container);
  }, []);

  const cancelEdit = useCallback(() => setEditTarget(null), []);

  const save = useCallback(async (id: string, name: string, description: string) => {
    try {
      await api.updateContainer(id, name, description);
      setEditTarget(null);
      await onChanged?.();
      onToast?.("success", `"${name}" atualizado`);
    } catch (error) {
      onToast?.("error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [onChanged, onToast]);

  return { menu, editTarget, openMenu, closeMenu, startEdit, cancelEdit, save };
}
