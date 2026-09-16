import { useEffect, useState } from "react";
import type { DockerDiskUsageDto, DockerPruneScope } from "../../api/types";
import { Icon } from "../Icons";

type ScopeOption = {
  scope: DockerPruneScope;
  label: string;
  description: string;
  usageType?: string;
};

const SCOPES: ScopeOption[] = [
  {
    scope: "CONTAINERS",
    label: "Containers parados",
    description: "Remove todos os containers que não estão em execução.",
    usageType: "Containers",
  },
  {
    scope: "IMAGES",
    label: "Imagens",
    description: "Remove imagens sem tag (dangling).",
    usageType: "Images",
  },
  {
    scope: "VOLUMES",
    label: "Volumes não utilizados",
    description: "Remove volumes que não estão vinculados a nenhum container.",
    usageType: "Local Volumes",
  },
  {
    scope: "BUILD_CACHE",
    label: "Cache de build",
    description: "Remove todo o cache do builder.",
    usageType: "Build Cache",
  },
  { scope: "NETWORKS", label: "Redes não utilizadas", description: "Remove redes sem containers conectados." },
];

const DEFAULT_SCOPES: DockerPruneScope[] = ["CONTAINERS", "IMAGES", "BUILD_CACHE"];

export function DockerPruneModal(props: {
  open: boolean;
  busy: boolean;
  diskUsage: DockerDiskUsageDto[];
  onClose: () => void;
  onConfirm: (scopes: DockerPruneScope[], removeUnusedImages: boolean) => void;
}) {
  const [selected, setSelected] = useState<DockerPruneScope[]>(DEFAULT_SCOPES);
  const [removeUnusedImages, setRemoveUnusedImages] = useState(false);

  useEffect(() => {
    if (props.open) {
      setSelected(DEFAULT_SCOPES);
      setRemoveUnusedImages(false);
    }
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const reclaimable = (usageType?: string) =>
    props.diskUsage.find((entry) => entry.type === usageType)?.reclaimable ?? null;

  const toggle = (scope: DockerPruneScope) =>
    setSelected((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={props.onClose} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated ring-1 ring-warn/20">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon.Eraser className="h-3.5 w-3.5 text-warn" />
              <span className="text-xs font-semibold text-slate-200">Limpar recursos do Docker</span>
            </div>
            <button className="btn-ghost rounded p-1" onClick={props.onClose} aria-label="Fechar">
              <Icon.X className="h-3 w-3 text-slate-500" />
            </button>
          </div>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
            {SCOPES.map((option) => {
              const checked = selected.includes(option.scope);
              const free = reclaimable(option.usageType);
              return (
                <label
                  key={option.scope}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                    checked ? "border-warn/25 bg-warn/[0.05]" : "border-white/[0.06] bg-surface-1 hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-warn"
                    checked={checked}
                    onChange={() => toggle(option.scope)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{option.label}</span>
                      {free && free !== "0B" && (
                        <span className="badge bg-surface-3 text-slate-400">{free}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-2xs leading-relaxed text-slate-500">
                      {option.description}
                    </span>
                    {option.scope === "IMAGES" && checked && (
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-2xs text-slate-400">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-danger"
                          checked={removeUnusedImages}
                          onChange={(e) => setRemoveUnusedImages(e.target.checked)}
                        />
                        Remover também imagens sem container associado
                      </label>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
            <span className="text-2xs text-slate-600">
              {selected.length === 0 ? "Selecione ao menos um escopo" : `${selected.length} escopo(s)`}
            </span>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost text-xs" onClick={props.onClose} disabled={props.busy}>
                Cancelar
              </button>
              <button
                className="btn btn-danger text-xs font-semibold disabled:opacity-40"
                disabled={selected.length === 0 || props.busy}
                onClick={() => props.onConfirm(selected, removeUnusedImages)}
              >
                {props.busy ? "Limpando..." : "Limpar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
