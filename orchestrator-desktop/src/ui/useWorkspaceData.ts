import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { ContainerDto, JdkInfo, PhpInfo, ServiceDto } from "../api/types";
import { preserveCurrentBranches } from "./serviceMeta";
import type { ToastType } from "./Toast";

const BOOTSTRAP_MS = 90_000;
const BOOTSTRAP_FALLBACK_MS = 95_000;

function isJavaStartupError(message: string) {
  return /java/i.test(message);
}

export function useWorkspaceData(options: {
  addToast: (type: ToastType, message: string) => void;
  setJavaError: (message: string | null) => void;
  onJavaStartupError?: () => void;
  onReady?: () => void;
  onServicesLoaded?: (services: ServiceDto[]) => void;
}) {
  const { addToast, setJavaError, onJavaStartupError, onReady, onServicesLoaded } = options;
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [containers, setContainers] = useState<ContainerDto[]>([]);
  const [jdks, setJdks] = useState<JdkInfo[]>([]);
  const [phps, setPhps] = useState<PhpInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshJdks = useCallback(async () => {
    try {
      setJdks(await api.listJdks());
    } catch {}
  }, []);

  const refreshPhps = useCallback(async () => {
    try {
      setPhps(await api.listPhpRuntimes());
    } catch {}
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const packed = await Promise.race([
        Promise.all([api.listServices(), api.listContainers()]),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Timeout de ${BOOTSTRAP_MS / 1000}s ao falar com o core.`)),
            BOOTSTRAP_MS,
          );
        }),
      ]);
      const [list, ctrs] = packed as [ServiceDto[], ContainerDto[]];
      setServices((prev) => preserveCurrentBranches(list, prev));
      setContainers(ctrs);
      onServicesLoaded?.(list);
      setJavaError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addToast("error", message);
      if (isJavaStartupError(message)) {
        setJavaError(message);
        onJavaStartupError?.();
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [addToast, setJavaError, onJavaStartupError, onServicesLoaded]);

  const refresh = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  const rebuildServices = useCallback(async () => {
    const list = await api.rebuildServices();
    setServices((prev) => preserveCurrentBranches(list, prev));
    return list;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loading) onReady?.();
  }, [loading, onReady]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      addToast("error", "Core demorou para responder. Abra Configurações e verifique Java.");
    }, BOOTSTRAP_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [loading, addToast]);

  useEffect(() => {
    void refreshJdks();
    void refreshPhps();
  }, [refreshJdks, refreshPhps]);

  return {
    services,
    setServices,
    containers,
    setContainers,
    jdks,
    phps,
    loading,
    refresh,
    refreshData,
    refreshJdks,
    refreshPhps,
    rebuildServices,
  };
}
