import { useEffect, useState } from "react";
import type { DockerEngineStatusDto } from "../../api/types";
import { Icon } from "../Icons";
import { providerLabel } from "./dockerFormat";

export function DockerStartCommandModal(props: {
  open: boolean;
  status: DockerEngineStatusDto | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (command: string, startNow: boolean) => void;
}) {
  const [command, setCommand] = useState("");

  useEffect(() => {
    if (props.open) setCommand(props.status?.startCommand ?? "");
  }, [props.open, props.status?.startCommand]);

  useEffect(() => {
    if (!props.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [props.open, props.onClose]);

  if (!props.open) return null;
  const valid = command.trim().length > 0;
  const status = props.status;
  const alreadyRunning = status?.engineRunning ?? false;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={props.onClose} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated ring-1 ring-accent/20">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon.Terminal className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold text-slate-200">Comando de start do Docker</span>
            </div>
            <button className="btn-ghost rounded p-1" onClick={props.onClose} aria-label="Fechar">
              <Icon.X className="h-3 w-3 text-slate-500" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            <p className="text-2xs leading-relaxed text-slate-500">
              {status?.colimaAvailable
                ? "Colima foi detectado nesta máquina. Confirme o comando usado para subir a VM — ele fica salvo para os próximos starts."
                : `Runtime detectado: ${status ? providerLabel(status) : "Docker"}. Ajuste o comando usado para iniciar o daemon.`}
            </p>
            <input
              type="text"
              value={command}
              autoFocus
              spellCheck={false}
              placeholder="colima start"
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid) props.onConfirm(command.trim(), !alreadyRunning);
              }}
              className="input font-mono text-xs"
            />
            {status?.colimaAvailable && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions(status.colimaProfile).map((option) => (
                  <button
                    key={option}
                    className="rounded border border-white/[0.08] bg-surface-0 px-2 py-1 font-mono text-2xs text-slate-400 transition-colors hover:border-accent/30 hover:text-accent"
                    onClick={() => setCommand(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-4 py-3">
            <button className="btn btn-ghost text-xs" onClick={props.onClose} disabled={props.saving}>
              Cancelar
            </button>
            <button
              className="btn btn-ghost text-xs text-slate-300 disabled:opacity-40"
              onClick={() => props.onConfirm(command.trim(), false)}
              disabled={!valid || props.saving}
            >
              Salvar
            </button>
            {!alreadyRunning && (
              <button
                className="btn btn-primary text-xs font-semibold disabled:opacity-40"
                onClick={() => props.onConfirm(command.trim(), true)}
                disabled={!valid || props.saving}
              >
                Salvar e iniciar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function suggestions(profile?: string | null): string[] {
  const base = profile && profile !== "default" ? `colima start ${profile}` : "colima start";
  return [base, `${base} --cpu 4 --memory 8`, `${base} --vm-type vz`];
}
