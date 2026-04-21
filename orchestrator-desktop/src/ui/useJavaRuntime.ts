import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { RuntimeSettingsDto } from "../api/types";

export type JavaRuntimeController = {
  runtimeSettings: RuntimeSettingsDto;
  javaError: string | null;
  setJavaError: (value: string | null) => void;
  savingJavaPath: boolean;
  pickFolder: () => Promise<void>;
  pickFile: () => Promise<void>;
  save: (
    value: string | null,
    afterSave: () => Promise<boolean>,
  ) => Promise<boolean>;
};

export function useJavaRuntime(): JavaRuntimeController {
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsDto>({});
  const [javaError, setJavaError] = useState<string | null>(null);
  const [savingJavaPath, setSavingJavaPath] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setRuntimeSettings(await api.getRuntimeSettings());
      } catch {}
    })();
  }, []);

  const pickFolder = useCallback(async () => {
    const picked = await api.selectJavaFolder();
    if (!picked?.trim()) return;
    setRuntimeSettings((prev) => ({ ...prev, javaPath: picked.trim() }));
  }, []);

  const pickFile = useCallback(async () => {
    const picked = await api.selectJavaFile();
    if (!picked?.trim()) return;
    setRuntimeSettings((prev) => ({ ...prev, javaPath: picked.trim() }));
  }, []);

  const save = useCallback(async (value: string | null, afterSave: () => Promise<boolean>) => {
    setSavingJavaPath(true);
    try {
      const next = await api.setJavaRuntimePath(value);
      setRuntimeSettings(next);
      const ok = await afterSave();
      return ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJavaError(message);
      throw error;
    } finally {
      setSavingJavaPath(false);
    }
  }, []);

  return useMemo(
    () => ({ runtimeSettings, javaError, setJavaError, savingJavaPath, pickFolder, pickFile, save }),
    [runtimeSettings, javaError, savingJavaPath, pickFolder, pickFile, save],
  );
}
