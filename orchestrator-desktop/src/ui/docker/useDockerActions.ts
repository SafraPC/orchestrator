import { useCallback, useState } from "react";
import { api } from "../../api/client";
import type {
  DockerContainerDto,
  DockerOperationResultDto,
  DockerPruneScope,
  DockerResourceTarget,
} from "../../api/types";
import type { ToastType } from "../Toast";

type LifecycleAction = "start" | "stop" | "restart";

const LIFECYCLE_LABELS: Record<LifecycleAction, string> = {
  start: "Iniciando...",
  stop: "Parando...",
  restart: "Reiniciando...",
};

export function useDockerActions(args: {
  onToast: (type: ToastType, message: string) => void;
  refreshInventory: () => Promise<void>;
  refreshStatus: () => Promise<unknown>;
}) {
  const { onToast, refreshInventory, refreshStatus } = args;
  const [busyIds, setBusyIds] = useState<Record<string, string>>({});
  const [mutating, setMutating] = useState(false);

  const lifecycle = useCallback(
    async (action: LifecycleAction, container: DockerContainerDto) => {
      setBusyIds((prev) => ({ ...prev, [container.id]: LIFECYCLE_LABELS[action] }));
      try {
        const call =
          action === "start"
            ? api.dockerStartContainer
            : action === "stop"
              ? api.dockerStopContainer
              : api.dockerRestartContainer;
        const result = await call(container.id);
        if (result.ok) onToast("success", `${container.name}: ${result.message}`);
        else onToast("error", `${container.name}: ${result.message}`);
        await refreshInventory();
      } catch (e) {
        onToast("error", e instanceof Error ? e.message : String(e));
      } finally {
        setBusyIds((prev) => {
          const next = { ...prev };
          delete next[container.id];
          return next;
        });
      }
    },
    [onToast, refreshInventory],
  );

  const removeTargets = useCallback(
    async (targets: DockerResourceTarget[]) => {
      if (targets.length === 0) return [] as DockerOperationResultDto[];
      setMutating(true);
      try {
        const results = await api.dockerRemoveResources(targets, true);
        reportBatch(results, onToast, (count) => `${count} recurso(s) removido(s).`);
        await refreshInventory();
        return results;
      } catch (e) {
        onToast("error", e instanceof Error ? e.message : String(e));
        return [] as DockerOperationResultDto[];
      } finally {
        setMutating(false);
      }
    },
    [onToast, refreshInventory],
  );

  const prune = useCallback(
    async (scopes: DockerPruneScope[], removeUnusedImages: boolean) => {
      setMutating(true);
      try {
        const results = await api.dockerPrune(scopes, removeUnusedImages);
        reportBatch(results, onToast, (count) => `Limpeza concluída em ${count} escopo(s).`);
        await refreshInventory();
        return results;
      } catch (e) {
        onToast("error", e instanceof Error ? e.message : String(e));
        return [] as DockerOperationResultDto[];
      } finally {
        setMutating(false);
      }
    },
    [onToast, refreshInventory],
  );

  const startEngine = useCallback(
    async (command?: string) => {
      setMutating(true);
      try {
        const status = await api.dockerStartEngine(command);
        if (status.engineRunning) onToast("success", "Docker já está ativo.");
        else onToast("info", "Iniciando o Docker. Isso pode levar alguns minutos.");
        await refreshStatus();
      } catch (e) {
        onToast("error", e instanceof Error ? e.message : String(e));
      } finally {
        setMutating(false);
      }
    },
    [onToast, refreshStatus],
  );

  const saveStartCommand = useCallback(
    async (command: string) => {
      setMutating(true);
      try {
        await api.dockerSetStartCommand(command);
        await refreshStatus();
        onToast("success", "Comando de start salvo.");
        return true;
      } catch (e) {
        onToast("error", e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setMutating(false);
      }
    },
    [onToast, refreshStatus],
  );

  return { busyIds, mutating, lifecycle, removeTargets, prune, startEngine, saveStartCommand };
}

function reportBatch(
  results: DockerOperationResultDto[],
  onToast: (type: ToastType, message: string) => void,
  summary: (count: number) => string,
) {
  const failed = results.filter((result) => !result.ok);
  const succeeded = results.length - failed.length;
  if (succeeded > 0) onToast("success", summary(succeeded));
  for (const failure of failed.slice(0, 3)) onToast("error", failure.message);
  if (failed.length > 3) onToast("error", `+${failed.length - 3} falha(s) adicionais.`);
}
