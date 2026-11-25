import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../api/client";
import type { CoreEvent } from "../../../api/events";

export function useServiceLogStream(svcName: string | null) {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [hasLogs, setHasLogs] = useState(false);
  const subIdRef = useRef<string | null>(null);
  const pendingLogLines = useRef<string[]>([]);

  useEffect(() => {
    setLines([]);
    setConnected(false);
    setHasLogs(false);
    if (!svcName) {
      return;
    }
    let unlisten: null | (() => void) = null;
    let alive = true;
    let unsubId: string | null = null;
    subIdRef.current = null;
    pendingLogLines.current = [];
    (async () => {
      try {
        unlisten = await listen<CoreEvent>("core_event", (e) => {
          if (!alive) {
            return;
          }
          const ev = e.payload as Record<string, unknown>;
          if (!ev || ev.event !== "log") {
            return;
          }
          const p = ev.payload as Record<string, unknown> | undefined;
          if (!p || String(p.service ?? "") !== svcName) {
            return;
          }
          const sid = String(p.subId ?? "");
          const bound = subIdRef.current;
          if (bound !== null && sid !== bound) {
            return;
          }
          const msg = String(p.line ?? "");
          if (!msg) {
            return;
          }
          if (bound === null) {
            pendingLogLines.current.push(msg);
            return;
          }
          setHasLogs(true);
          setLines((prev) => {
            const next = [...prev, msg];
            return next.length > 2000 ? next.slice(-2000) : next;
          });
        });
        const sub = await Promise.race([
          api.subscribeLogs(svcName, 200),
          new Promise<{ subId: string }>((_, rej) => {
            setTimeout(() => rej(new Error("Timeout ao conectar aos logs (core não respondeu).")), 45000);
          }),
        ]);
        if (!alive) {
          await api.unsubscribeLogs(sub.subId).catch(() => {});
          return;
        }
        unsubId = sub.subId;
        subIdRef.current = sub.subId;
        const buffered = pendingLogLines.current;
        pendingLogLines.current = [];
        if (buffered.length > 0) {
          setHasLogs(true);
          setLines(buffered.length > 2000 ? buffered.slice(-2000) : buffered);
        }
        setConnected(true);
      } catch (err) {
        setLines([`Erro: ${err instanceof Error ? err.message : String(err)}`]);
        setConnected(true);
      }
    })().catch((err) => setLines([`Erro: ${err instanceof Error ? err.message : String(err)}`]));
    return () => {
      alive = false;
      setConnected(false);
      if (unlisten) {
        unlisten();
      }
      if (unsubId) {
        void api.unsubscribeLogs(unsubId).catch(() => {});
      }
    };
  }, [svcName]);

  return { lines, setLines, connected, hasLogs };
}
