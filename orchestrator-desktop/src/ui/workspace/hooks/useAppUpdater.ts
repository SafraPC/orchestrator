import { useCallback, useEffect, useRef, useState } from "react";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 8_000;

export type AppUpdateState = {
  available: boolean;
  version: string | null;
  notes: string | null;
  checking: boolean;
  installing: boolean;
  progress: number | null;
  error: string | null;
  installUpdate: () => Promise<void>;
  dismiss: () => void;
};

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isProductionBuild(): boolean {
  return !import.meta.env.DEV;
}

export function useAppUpdater(): AppUpdateState {
  const [available, setAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const updateRef = useRef<Awaited<ReturnType<typeof importUpdateCheck>> | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (!isTauriRuntime() || !isProductionBuild()) {
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const update = await importUpdateCheck();
      if (update) {
        updateRef.current = update;
        setVersion(update.version);
        setNotes(update.body ?? null);
        setAvailable(true);
        setDismissed(false);
      } else {
        updateRef.current = null;
        setAvailable(false);
        setVersion(null);
        setNotes(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.toLowerCase().includes("not found") && !message.includes("404")) {
        setError(message);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) {
      return;
    }
    const { ask } = await import("@tauri-apps/plugin-dialog");
    const confirmed = await ask(
      `Instalar a versão ${update.version}? O aplicativo será reiniciado ao concluir.`,
      { title: "Atualização disponível", kind: "info", okLabel: "Instalar", cancelLabel: "Depois" },
    );
    if (!confirmed) {
      return;
    }
    setInstalling(true);
    setProgress(0);
    setError(null);
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          setProgress(0);
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setInstalling(false);
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime() || !isProductionBuild()) {
      return;
    }
    const initial = setTimeout(() => {
      void checkForUpdate();
    }, INITIAL_DELAY_MS);
    const interval = setInterval(() => {
      void checkForUpdate();
    }, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  return {
    available: available && !dismissed,
    version,
    notes,
    checking,
    installing,
    progress,
    error,
    installUpdate,
    dismiss: () => setDismissed(true),
  };
}

async function importUpdateCheck() {
  const { check } = await import("@tauri-apps/plugin-updater");
  return check();
}
