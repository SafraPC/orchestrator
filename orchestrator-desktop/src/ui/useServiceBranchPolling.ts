import { useEffect, type Dispatch, type SetStateAction } from "react";
import { api } from "../api/client";
import type { ServiceDto } from "../api/types";
import { applyCurrentBranches } from "./serviceMeta";

type SetServices = Dispatch<SetStateAction<ServiceDto[]>>;

export function useServiceBranchPolling(services: ServiceDto[], setServices: SetServices) {
  useEffect(() => {
    if (services.length === 0) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const branches = await api.listServiceBranches();
        if (cancelled) {
          return;
        }
        setServices((current) => applyCurrentBranches(current, branches));
      } catch {}
    };
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 7000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [services.length, setServices]);
}
