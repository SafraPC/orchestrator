import { invoke } from "@tauri-apps/api/core";
import type { ContainerDto, ServiceDto, StopResultDto, WorkspaceDto } from "./types";

async function core<T>(method: string, params: unknown = {}): Promise<T> {
  try {
    const resp = await invoke<unknown>("core_request", { method, params });
    
    if (typeof resp === "string") {
      console.error(`[core] Erro no método ${method}:`, resp);
      throw new Error(resp);
    }
    
    return resp as T;
  } catch (error) {
    console.error(`[core] Exceção ao chamar ${method}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Falha no core: ${String(error)}`);
  }
}

export const api = {
  ping: () => core<string>("ping"),
  getWorkspace: () => core<WorkspaceDto>("getWorkspace"),
  setExcludeDirs: (excludeDirs: string[]) => core<WorkspaceDto>("setExcludeDirs", { excludeDirs }),
  importRootAndScan: (root: string) => core<ServiceDto[]>("importRootAndScan", { root }),
  removeRoot: (root: string) => core<ServiceDto[]>("removeRoot", { root }),
  scanRoots: () => core<ServiceDto[]>("scanRoots"),
  listServices: () => core<ServiceDto[]>("listServices"),

  start: (name: string) => core<ServiceDto>("startService", { name }),
  stop: (name: string) => core<StopResultDto>("stopService", { name }),
  restart: (name: string) => core<ServiceDto>("restartService", { name }),
  startAll: () => core<ServiceDto[]>("startAll"),
  stopAll: () => core<StopResultDto[]>("stopAll"),

  subscribeLogs: (name: string, tail = 200) => core<{ subId: string }>("subscribeLogs", { name, tail }),
  unsubscribeLogs: (subId: string) => core<{ ok: boolean }>("unsubscribeLogs", { subId }),
  removeService: (name: string) => core<ServiceDto[]>("removeService", { name }),
  selectFolder: () => invoke<string | null>("select_folder"),

  // Containers
  createContainer: (name: string, description?: string) => core<ContainerDto>("createContainer", { name, description }),
  updateContainer: (id: string, name?: string, description?: string) => core<ContainerDto>("updateContainer", { id, name, description }),
  deleteContainer: (id: string) => core<ContainerDto>("deleteContainer", { id }),
  listContainers: () => core<ContainerDto[]>("listContainers"),
  addServiceToContainer: (serviceName: string, containerId: string) => core<ServiceDto[]>("addServiceToContainer", { name: serviceName, containerId }),
  removeServiceFromContainer: (serviceName: string, containerId: string) => core<ServiceDto[]>("removeServiceFromContainer", { name: serviceName, containerId }),
  getServicesByContainer: (containerId: string) => core<ServiceDto[]>("getServicesByContainer", { containerId }),
  startContainer: (containerId: string) => core<ServiceDto[]>("startContainer", { containerId }),
  stopContainer: (containerId: string) => core<StopResultDto[]>("stopContainer", { containerId }),

  openServiceFolder: (name: string) => core<{ ok: boolean; message: string }>("openServiceFolder", { name }),
  openServiceTerminal: (name: string) => core<{ ok: boolean; message: string }>("openServiceTerminal", { name }),
  openServiceInEditor: (name: string) => core<{ ok: boolean; message: string }>("openServiceInEditor", { name }),
};

