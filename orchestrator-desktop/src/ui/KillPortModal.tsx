import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Icon } from "./Icons";
import type { ToastType } from "./Toast";

export function KillPortModal(props: {
  open: boolean;
  onClose: () => void;
  onToast: (type: ToastType, msg: string) => void;
}) {
  const [port, setPort] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const portNum = Number(port.trim());
  const valid = Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;

  useEffect(() => {
    if (!props.open) {
      setPort("");
      setBusy(false);
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [props.open]);

  const handleKill = useCallback(async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await api.killPort(portNum);
      props.onToast("success", `Porta ${portNum} liberada com sucesso.`);
      props.onClose();
    } catch (e) {
      props.onToast("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [valid, busy, portNum, props]);

  if (!props.open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={props.onClose}
      />
      <div className="fixed inset-x-0 top-20 mx-auto z-50 w-[26rem] max-w-[calc(100vw-2rem)] animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Icon.Plug className="h-4 w-4 text-danger" />
            <span className="text-xs font-semibold text-slate-200">Derrubar porta</span>
          </div>
          <button className="btn-ghost rounded p-1" onClick={props.onClose} aria-label="Fechar">
            <Icon.X className="h-3 w-3 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-2xs text-slate-500">
            Encerra o processo que estiver usando a porta informada.
          </p>
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={65535}
            placeholder="Ex: 3000"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleKill();
              if (e.key === "Escape") props.onClose();
            }}
            className="input w-full px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="btn btn-ghost text-2xs px-3 py-1.5"
              onClick={props.onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger text-2xs px-3 py-1.5 font-semibold disabled:opacity-40"
              disabled={!valid || busy}
              onClick={() => void handleKill()}
            >
              {busy ? "Derrubando..." : "Derrubar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
