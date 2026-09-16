import { useEffect, useRef } from "react";
import type { DockerEngineStatusDto } from "../../api/types";
import { Icon } from "../Icons";
import { providerLabel } from "./dockerFormat";

export function DockerEngineOffline(props: {
  status: DockerEngineStatusDto | null;
  engineLog: string[];
  onStart: () => void;
  onConfigure: () => void;
}) {
  const status = props.status;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [props.engineLog.length]);

  if (!status) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-2xs text-slate-600">Verificando o Docker...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col items-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-xl space-y-4 animate-slide-up">
        <div className="panel p-5">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 rounded-lg p-2 ${
                status.starting ? "bg-warn/10 text-warn" : "bg-danger/10 text-danger"
              }`}
            >
              {status.starting ? <Icon.Power className="h-4 w-4" /> : <Icon.Alert className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-100">
                {status.starting ? "Iniciando o Docker" : "Docker não está ativo"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {status.message ?? "Inicie o daemon do Docker para ver containers, imagens e volumes."}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-2xs">
                <Detail label="Runtime" value={providerLabel(status)} />
                <Detail label="CLI" value={status.cliAvailable ? status.cliPath ?? "disponível" : "não encontrada"} />
                {status.colimaAvailable && (
                  <Detail label="Colima" value={status.colimaRunning ? "rodando" : "parado"} />
                )}
                {status.clientVersion && <Detail label="Versão da CLI" value={status.clientVersion} />}
              </dl>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-600">
              Comando de inicialização
            </span>
            <code className="block truncate rounded border border-white/[0.06] bg-surface-0 px-2.5 py-2 font-mono text-2xs text-slate-300">
              {status.startCommand || "não definido"}
            </code>
            {status.startCommandRequired && (
              <p className="text-2xs text-warn">
                Colima detectado. Confirme o comando de start antes de iniciar.
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                className="btn btn-primary gap-1.5 text-2xs disabled:opacity-40"
                onClick={props.onStart}
                disabled={status.starting || !status.cliAvailable}
              >
                <Icon.Power className="h-3.5 w-3.5" />
                {status.starting ? "Iniciando..." : "Iniciar Docker"}
              </button>
              <button className="btn btn-ghost gap-1.5 text-2xs" onClick={props.onConfigure}>
                <Icon.Pencil className="h-3.5 w-3.5" />
                Alterar comando
              </button>
            </div>
          </div>
        </div>

        {props.engineLog.length > 0 && (
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <Icon.Terminal className="h-3 w-3 text-slate-600" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-600">Saída</span>
            </div>
            <div ref={logRef} className="max-h-56 overflow-y-auto px-3 py-2 font-mono text-2xs text-slate-400">
              {props.engineLog.map((line, index) => (
                <div key={`${index}-${line}`} className="whitespace-pre-wrap break-all leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail(props: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-slate-600">{props.label}</dt>
      <dd className="truncate font-mono text-slate-400" title={props.value}>
        {props.value}
      </dd>
    </div>
  );
}
