import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { customPhpCommandText } from "./serviceMeta";

type PhpCommandModalProps = {
  open: boolean;
  serviceName: string | null;
  selectedScript?: string | null;
  onCancel: () => void;
  onConfirm: (serviceName: string, command: string) => Promise<void>;
};

export function PhpCommandModal(props: PhpCommandModalProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setValue(customPhpCommandText(props.selectedScript) ?? "");
  }, [props.open, props.selectedScript]);

  useEffect(() => {
    if (!props.open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) props.onCancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [props.open, busy, props.onCancel]);

  const error = useMemo(() => {
    if (!value.trim()) return "Informe o comando PHP.";
    return null;
  }, [value]);

  const canApply = !busy && !error;

  if (!props.open || !props.serviceName) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !busy && props.onCancel()} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated ring-1 ring-accent/20">
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg p-2 text-accent bg-accent/10">
                <Icon.Terminal className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100">Comando PHP manual</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{props.serviceName}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="php artisan serve"
                className="input w-full px-2 py-1.5 text-xs font-mono"
              />
              <p className="text-2xs text-slate-500">
                O comando roda na pasta do projeto e não recebe porta automaticamente.
              </p>
              {error && <p className="text-2xs text-danger/90">{error}</p>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
            <button className="btn btn-ghost text-xs" onClick={props.onCancel} disabled={busy}>Cancelar</button>
            <button
              className="btn btn-primary text-xs font-semibold disabled:opacity-50"
              disabled={!canApply}
              onClick={async () => {
                if (!canApply || !props.serviceName) return;
                setBusy(true);
                try {
                  await props.onConfirm(props.serviceName, value.trim());
                } finally {
                  setBusy(false);
                }
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
