import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { api } from "../../../api/client";
import type { CoreEvent } from "../../../api/events";

export type MonitorLine = { service: string; line: string };

export function useMonitorLogStream(serviceNames: string[]) {
  const [lines, setLines] = useState<MonitorLine[]>([]);
  const [connected, setConnected] = useState(false);
  const svcKey = serviceNames.join(",");

  useEffect(() => {
    setLines([]);
    setConnected(false);
    if (serviceNames.length === 0) {
      return;
    }

    let alive = true;
    let unlisten: (() => void) | null = null;
    const subIds: string[] = [];
    const subIdToService = new Map<string, string>();

    (async () => {
      unlisten = await listen<CoreEvent>("core_event", (e) => {
        if (!alive) {
          return;
        }
        const ev = e.payload as Record<string, unknown>;
        if (!ev || ev.event !== "log") {
          return;
        }
        const p = ev.payload as Record<string, unknown> | undefined;
        if (!p) {
          return;
        }
        const sid = String(p.subId ?? "");
        const fromMap = sid ? subIdToService.get(sid) : undefined;
        const svcName = String(p.service ?? "");
        const svc = fromMap ?? (svcName && serviceNames.includes(svcName) ? svcName : undefined);
        if (!svc) {
          return;
        }
        const msg = String(p.line ?? "");
        if (msg) {
          setLines((prev) => {
            const next = [...prev, { service: svc, line: msg }];
            return next.length > 2000 ? next.slice(-2000) : next;
          });
        }
      });
      for (const name of serviceNames) {
        try {
          const sub = await api.subscribeLogs(name, 50);
          if (!alive) {
            void api.unsubscribeLogs(sub.subId).catch(() => {});
            continue;
          }
          subIds.push(sub.subId);
          subIdToService.set(sub.subId, name);
        } catch {}
      }
      if (alive) {
        setConnected(true);
      }
    })().catch(() => {});

    return () => {
      alive = false;
      setConnected(false);
      if (unlisten) {
        unlisten();
      }
      for (const id of subIds) {
        void api.unsubscribeLogs(id).catch(() => {});
      }
    };
  }, [svcKey]);

  return { lines, setLines, connected };
}
