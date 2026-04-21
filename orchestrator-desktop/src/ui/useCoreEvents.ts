import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import type { ServiceDto } from "../api/types";

type CoreEvent = { event: string; payload: unknown };

export function useCoreEvents(args: {
  refresh: () => Promise<void>;
  setServices: React.Dispatch<React.SetStateAction<ServiceDto[]>>;
}) {
  const refreshRef = useRef(args.refresh);
  const setServicesRef = useRef(args.setServices);
  refreshRef.current = args.refresh;
  setServicesRef.current = args.setServices;

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!cancelled) void refreshRef.current();
      }, 400);
    };

    const promise = listen<CoreEvent>("core_event", (event) => {
      if (cancelled) return;
      const raw = event.payload as Record<string, unknown> | null;
      if (!raw || typeof raw !== "object") return;
      const ev = raw.event;
      const payload = raw.payload;

      if (ev === "service" && payload) {
        const service = payload as ServiceDto;
        setServicesRef.current((prev) =>
          prev.map((current) => (current.name === service.name ? service : current)),
        );
        return;
      }
      if (ev === "services" && payload) {
        setServicesRef.current(payload as ServiceDto[]);
        return;
      }
      if (ev === "workspace") {
        scheduleRefresh();
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      void promise.then((unsubscribe) => unsubscribe());
    };
  }, []);
}
