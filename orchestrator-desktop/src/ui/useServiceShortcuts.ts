import { useEffect } from "react";
import { api } from "../api/client";
import type { ServiceDto } from "../api/types";
import type { ToastType } from "./Toast";

export function useServiceShortcuts(args: {
  selected: string | null;
  services: ServiceDto[];
  refresh: () => Promise<void>;
  addToast: (type: ToastType, message: string) => void;
  toggleSettings: () => void;
}) {
  const { selected, services, refresh, addToast, toggleSettings } = args;

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        toggleSettings();
        return;
      }
      if (!selected) return;
      const service = services.find((item) => item.name === selected);
      if (!service) return;

      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        if (service.status !== "RUNNING") {
          void api.start(service.name).then(() => refresh());
          addToast("info", `Iniciando ${service.name}`);
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "x") {
        event.preventDefault();
        if (service.status === "RUNNING") {
          void api.stop(service.name).then(() => refresh());
          addToast("info", `Parando ${service.name}`);
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "r" && !event.shiftKey) {
        event.preventDefault();
        if (service.status === "RUNNING") {
          void api.restart(service.name).then(() => refresh());
          addToast("info", `Reiniciando ${service.name}`);
        }
      }
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [selected, services, refresh, addToast, toggleSettings]);
}
