import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { CoreEvent } from "../../api/events";
import type { DockerEngineStatusDto, DockerInventoryDto } from "../../api/types";

const EMPTY_INVENTORY: DockerInventoryDto = {
  available: false,
  message: null,
  containers: [],
  images: [],
  volumes: [],
  diskUsage: [],
};

const STATUS_POLL_MS = 8000;
const STARTING_POLL_MS = 3000;
const MAX_LOG_LINES = 300;

export function useDockerData(active: boolean) {
  const [status, setStatus] = useState<DockerEngineStatusDto | null>(null);
  const [inventory, setInventory] = useState<DockerInventoryDto>(EMPTY_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineLog, setEngineLog] = useState<string[]>([]);

  const inFlight = useRef(false);
  const wasRunning = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await api.dockerGetStatus();
      setStatus(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const next = await api.dockerListResources();
      setInventory(next);
      setError(next.available ? null : next.message ?? null);
    } catch (e) {
      setInventory(EMPTY_INVENTORY);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const next = await refreshStatus();
    wasRunning.current = next?.engineRunning ?? false;
    if (next?.engineRunning) await refreshInventory();
    else setInventory(EMPTY_INVENTORY);
  }, [refreshStatus, refreshInventory]);

  useEffect(() => {
    if (!active) return;
    void refreshAll();
  }, [active, refreshAll]);

  useEffect(() => {
    if (!active) return;
    const interval = status?.starting ? STARTING_POLL_MS : STATUS_POLL_MS;
    const timer = setInterval(() => {
      void (async () => {
        const next = await refreshStatus();
        if (!next) return;
        const previous = wasRunning.current;
        wasRunning.current = next.engineRunning;
        if (next.engineRunning && !previous) await refreshInventory();
      })();
    }, interval);
    return () => clearInterval(timer);
  }, [active, status?.starting, refreshStatus, refreshInventory]);

  useEffect(() => {
    let cancelled = false;
    const promise = listen<CoreEvent>("core_event", (event) => {
      if (cancelled) return;
      const raw = event.payload as Record<string, unknown> | null;
      if (!raw || typeof raw !== "object") return;
      if (raw.event === "dockerEngineLog") {
        const line = (raw.payload as { line?: string } | null)?.line;
        if (line) setEngineLog((prev) => [...prev, line].slice(-MAX_LOG_LINES));
        return;
      }
      if (raw.event === "dockerEngine" && raw.payload) {
        setStatus(raw.payload as DockerEngineStatusDto);
      }
    });
    return () => {
      cancelled = true;
      void promise.then((unsubscribe) => unsubscribe());
    };
  }, []);

  const clearEngineLog = useCallback(() => setEngineLog([]), []);

  return {
    status,
    inventory,
    loading,
    error,
    engineLog,
    clearEngineLog,
    refreshStatus,
    refreshInventory,
    refreshAll,
  };
}
