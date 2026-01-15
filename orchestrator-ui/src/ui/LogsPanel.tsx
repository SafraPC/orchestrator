import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ServiceDto } from "../api/types";

type CoreEvent = { event: string; payload: any };

function ClearIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function LogsPanel(props: { service: ServiceDto | null }) {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [hasReceivedLogs, setHasReceivedLogs] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const serviceName = props.service?.name ?? null;
  const title = serviceName ? `Logs: ${serviceName}` : "Selecione um serviço";
  const lastStatusRef = useRef<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (props.service) {
      const currentStatus = props.service.status;
      const currentError = props.service.lastError || null;

      if (currentStatus === "RUNNING") {
        setStatus("🟢 Serviço rodando");
        if (lastStatusRef.current === "ERROR") {
          lastErrorRef.current = null;
        }
      } else if (currentStatus === "ERROR") {
        const errorMsg = currentError || "Erro desconhecido";
        setStatus("🔴 Erro: " + errorMsg);
        if (errorMsg !== lastErrorRef.current) {
          setLines((prev) => {
            const errorLine = `❌ [STATUS] Serviço em erro: ${errorMsg}`;
            const filtered = prev.filter((l) => !l.includes("[STATUS] Serviço em erro"));
            return [...filtered, errorLine];
          });
          lastErrorRef.current = errorMsg;
        }
      } else {
        setStatus("⚪ Serviço parado");
        if (lastStatusRef.current === "RUNNING" && connected && hasReceivedLogs) {
          setLines((prev) => {
            const stopLine = "⚠️ [STATUS] Serviço parou ou foi interrompido";
            const filtered = prev.filter((l) => !l.includes("[STATUS] Serviço parou"));
            return [...filtered, stopLine];
          });
        }
      }

      lastStatusRef.current = currentStatus;
    } else {
      setStatus(null);
      lastStatusRef.current = null;
      lastErrorRef.current = null;
    }
  }, [props.service?.status, props.service?.lastError, connected, hasReceivedLogs]);

  useEffect(() => {
    setLines([]);
    setConnected(false);
    setHasReceivedLogs(false);
    if (!serviceName) return;

    let unlisten: null | (() => void) = null;
    let alive = true;
    let currentSubId: string | null = null;

    (async () => {
      unlisten = await listen<CoreEvent>("core_event", (e) => {
        if (!alive) {
          return;
        }

        const ev = e.payload as any;

        if (!ev) {
          return;
        }

        if (ev.event !== "log") {
          return;
        }

        const payload = ev.payload;
        if (!payload) {
          return;
        }

        if (!currentSubId || payload.subId !== currentSubId) {
          return;
        }

        const msg = String(payload.line ?? "");
        if (msg) {
          setHasReceivedLogs(true);
          setLines((prev) => {
            const next = [...prev, msg];
            if (next.length > 2000) return next.slice(next.length - 2000);
            return next;
          });
        }
      });

      try {
        const sub = await api.subscribeLogs(serviceName, 200);

        if (!alive) {
          await api.unsubscribeLogs(sub.subId).catch(() => {});
          return;
        }

        currentSubId = sub.subId;
        setConnected(true);
      } catch (err) {
        console.error("[LogsPanel] Erro ao criar subscrição:", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setLines([`❌ Erro ao conectar aos logs: ${errorMsg}`]);
        setConnected(false);
      }
    })().catch((err) => {
      console.error("[LogsPanel] Erro ao configurar logs:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setLines([`❌ Erro ao configurar logs: ${errorMsg}`]);
      setConnected(false);
    });

    return () => {
      alive = false;
      setConnected(false);
      if (unlisten) unlisten();
      if (currentSubId) {
        void api.unsubscribeLogs(currentSubId).catch(() => {});
      }
    };
  }, [serviceName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="truncate font-medium text-slate-200">{title}</div>
          <div className="flex items-center gap-2">
            <div
              className={
                connected && hasReceivedLogs ? "text-emerald-300" : connected ? "text-yellow-300" : "text-slate-400"
              }
            >
              {connected && hasReceivedLogs ? "conectado" : connected ? "conectando..." : "desconectado"}
            </div>
            {serviceName && (
              <button
                className="rounded-md bg-slate-700/50 p-1.5 hover:bg-slate-600/50 disabled:opacity-50"
                onClick={() => setLines([])}
                title="Limpar logs"
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>
        {status && <div className="mt-1 text-xs text-slate-400">{status}</div>}
      </div>
      <div className="flex-1 overflow-auto border-t border-slate-800 bg-black/30 px-4 py-3 font-mono text-xs leading-relaxed">
        {serviceName ? (
          <>
            {lines.map((l, idx) => {
              const isError = l.includes("❌") || l.includes("⚠️") || l.includes("Erro") || l.includes("ERROR");
              const isStatus = l.includes("[STATUS]");
              return (
                <div
                  key={idx}
                  className={`whitespace-pre-wrap break-words ${
                    isError ? "text-rose-300" : isStatus ? "text-yellow-300" : "text-slate-100"
                  }`}
                >
                  {l}
                </div>
              );
            })}
            {lines.length === 0 && connected && !hasReceivedLogs && (
              <div className="text-slate-500 italic">Aguardando logs do serviço...</div>
            )}
            {lines.length === 0 && !connected && <div className="text-slate-500 italic">Conectando aos logs...</div>}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="text-slate-400">Escolha um serviço na lista para abrir o stream de logs.</div>
        )}
      </div>
    </div>
  );
}
