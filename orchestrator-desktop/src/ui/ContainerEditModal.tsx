import { useEffect, useMemo, useState } from "react";
import type { ContainerDto } from "../api/types";
import { ContainerContextMenu } from "./ContainerContextMenu";
import { Icon } from "./Icons";

export function ContainerEditModal(props: {
  container: ContainerDto | null;
  onCancel: () => void;
  onConfirm: (id: string, name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!props.container) return;
    setName(props.container.name);
    setDescription(props.container.description ?? "");
    setBusy(false);
  }, [props.container]);

  useEffect(() => {
    if (!props.container) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) props.onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.container, busy, props.onCancel]);

  const error = useMemo(() => {
    if (!name.trim()) return "Informe o nome do container.";
    return null;
  }, [name]);

  const canApply = !!props.container && !busy && !error;

  if (!props.container) return null;

  async function submit() {
    if (!canApply || !props.container) return;
    setBusy(true);
    try {
      await props.onConfirm(props.container.id, name.trim(), description.trim());
    } catch {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !busy && props.onCancel()} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated ring-1 ring-accent/20">
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg p-2 text-accent bg-accent/10">
                <Icon.Pencil className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100">Editar container</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed truncate">{props.container.name}</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-2xs text-slate-500">Nome</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submit();
                  }}
                  className="input"
                  placeholder="Nome do container"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-2xs text-slate-500">Descrição</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Descrição opcional"
                />
              </label>
              {error && <p className="text-2xs text-danger/90">{error}</p>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
            <button className="btn btn-ghost text-xs" onClick={props.onCancel} disabled={busy}>Cancelar</button>
            <button
              className="btn btn-primary text-xs font-semibold disabled:opacity-50"
              disabled={!canApply}
              onClick={() => void submit()}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ContainerEditOverlay(props: {
  menu: { container: ContainerDto; x: number; y: number } | null;
  editTarget: ContainerDto | null;
  onCloseMenu: () => void;
  onStartEdit: (container: ContainerDto) => void;
  onCancel: () => void;
  onConfirm: (id: string, name: string, description: string) => Promise<void>;
}) {
  return (
    <>
      {props.menu && (
        <ContainerContextMenu
          x={props.menu.x}
          y={props.menu.y}
          onClose={props.onCloseMenu}
          onEdit={() => {
            const target = props.menu;
            if (target) props.onStartEdit(target.container);
          }}
        />
      )}
      <ContainerEditModal
        container={props.editTarget}
        onCancel={props.onCancel}
        onConfirm={props.onConfirm}
      />
    </>
  );
}
