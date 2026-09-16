import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Icon } from "./Icons";
import { PortUsageList } from "./PortUsageList";
import type { ToastType } from "./Toast";
import { useListeningPorts } from "./useListeningPorts";

export function KillPortModal(props: {
  open: boolean;
  onClose: () => void;
  onToast: (type: ToastType, msg: string) => void;
}) {
  const [port, setPort] = useState("");
  const [busyPort, setBusyPort] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { ports, loading, error, refresh } = useListeningPorts(props.open);

  const portNum = Number(port.trim());
  const valid = Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;

  useEffect(() => {
    if (!props.open) {
      setPort("");
      setBusyPort(null);
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.open, props.onClose]);

  const killPort = useCallback(
    async (target: number) => {
      if (busyPort !== null) return;
      setBusyPort(target);
      try {
        const result = await api.killPort(target);
        const check = await api.checkPortFree(target);
        if (!check.free) {
          props.onToast("error", `Porta ${target} ainda em uso após a tentativa de encerrar.`);
          return;
        }
        props.onToast(
          "success",
          result.killed ? `Porta ${target} liberada com sucesso.` : `Porta ${target} já estava livre.`
        );
      } catch (e) {
        props.onToast("error", e instanceof Error ? e.message : String(e));
      } finally {
        setBusyPort(null);
        void refresh();
      }
    },
    [busyPort, props, refresh]
  );

  const handleManualKill = useCallback(() => {
    if (!valid) return;
    void killPort(portNum);
  }, [valid, portNum, killPort]);

  if (!props.open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={props.onClose}
      />
      <div className="fixed inset-x-0 top-10 mx-auto z-50 flex max-h-[calc(100vh-5rem)] w-[34rem] max-w-[calc(100vw-2rem)] flex-col animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated">
        <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Icon.Plug className="h-4 w-4 text-danger" />
            <span className="text-xs font-semibold text-slate-200">Derrubar porta</span>
          </div>
          <button className="btn-ghost rounded p-1" onClick={props.onClose} aria-label="Fechar">
            <Icon.X className="h-3 w-3 text-slate-500" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <p className="text-2xs text-slate-500">
            Encerra o processo na porta e a árvore de processos relacionada (ex.: composer serve).
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={65535}
              placeholder="Ex: 3000"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualKill();
              }}
              className="input flex-1 px-3 py-2 text-sm"
            />
            <button
              className="btn btn-danger text-2xs px-3 py-2 font-semibold disabled:opacity-40"
              disabled={!valid || busyPort !== null}
              onClick={handleManualKill}
            >
              {busyPort === portNum ? "Derrubando..." : "Derrubar"}
            </button>
          </div>
          <PortUsageList
            ports={ports}
            loading={loading}
            error={error}
            busyPort={busyPort}
            onRefresh={() => void refresh()}
            onKill={(target) => void killPort(target)}
          />
          <div className="flex shrink-0 justify-end pt-1">
            <button className="btn btn-ghost text-2xs px-3 py-1.5" onClick={props.onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
