import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { ContainerDto, ServiceDto } from "../api/types";
import { confirm } from "@tauri-apps/plugin-dialog";

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ContainersPanel(props: {
  services: ServiceDto[];
  selectedContainer: string | null;
  onSelectContainer: (id: string | null) => void | Promise<void>;
  onRefresh: () => Promise<void>;
  onContainersChanged?: () => void;
}) {
  const [containers, setContainers] = useState<ContainerDto[]>([]);
  const [newContainerName, setNewContainerName] = useState("");
  const [newContainerDesc, setNewContainerDesc] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function loadContainers() {
    const list = await api.listContainers();
    setContainers(list);
  }

  useEffect(() => {
    void loadContainers();
  }, []);

  const containerServiceCount = (containerId: string) => {
    return props.services.filter((s) => s.containerIds?.includes(containerId)).length;
  };

  async function handleCreateContainer() {
    if (!newContainerName.trim()) return;
    try {
      await api.createContainer(newContainerName.trim(), newContainerDesc.trim() || undefined);
      setNewContainerName("");
      setNewContainerDesc("");
      setShowCreateForm(false);
      await loadContainers();
      props.onContainersChanged?.();
    } catch (error) {
      console.error("Erro ao criar container:", error);
    }
  }

  async function handleDeleteContainer(id: string, name: string) {
    try {
      let confirmed = false;
      try {
        confirmed = await confirm(
          `Tem certeza que deseja excluir o container "${name}"?\n\nIsso não remove os serviços, apenas remove a organização.`,
          {
            title: "Confirmar exclusão",
            kind: "warning",
            okLabel: "Excluir",
            cancelLabel: "Cancelar",
          }
        );
      } catch (confirmError) {
        console.error("Erro ao exibir modal de confirmação:", confirmError);
        confirmed = window.confirm(
          `Tem certeza que deseja excluir o container "${name}"?\n\nIsso não remove os serviços, apenas remove a organização.`
        );
      }
      
      if (!confirmed) {
        return;
      }

      await api.deleteContainer(id);
      if (props.selectedContainer === id) {
        props.onSelectContainer(null);
      }
      await loadContainers();
      await props.onRefresh();
    } catch (error) {
      console.error("Erro ao excluir container:", error);
      alert(`Erro ao excluir container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function handleStartContainer(containerId: string) {
    try {
      await api.startContainer(containerId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await props.onRefresh();
    } catch (error) {
      console.error("Erro ao iniciar container:", error);
    }
  }

  async function handleStopContainer(containerId: string) {
    try {
      await api.stopContainer(containerId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await props.onRefresh();
    } catch (error) {
      console.error("Erro ao parar container:", error);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pt-3 shrink-0">
        <div className="flex items-center justify-end">
          <button
            className="rounded-md bg-sky-700 p-1.5 hover:bg-sky-600"
            onClick={() => setShowCreateForm(!showCreateForm)}
            title="Criar novo container"
          >
            <PlusIcon />
          </button>
        </div>
        {showCreateForm && (
          <div className="mt-3 space-y-2 rounded-md border border-slate-700 bg-slate-900/50 p-3">
            <input
              type="text"
              placeholder="Nome do container"
              value={newContainerName}
              onChange={(e) => setNewContainerName(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleCreateContainer();
                } else if (e.key === "Escape") {
                  setShowCreateForm(false);
                  setNewContainerName("");
                  setNewContainerDesc("");
                }
              }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={newContainerDesc}
              onChange={(e) => setNewContainerDesc(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleCreateContainer();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                className="rounded-md bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600"
                onClick={() => void handleCreateContainer()}
              >
                Criar
              </button>
              <button
                className="rounded-md bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewContainerName("");
                  setNewContainerDesc("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-2">
          {containers.map((container) => {
            const isSelected = props.selectedContainer === container.id;
            const count = containerServiceCount(container.id);
            return (
              <div
                key={container.id}
                className={`cursor-pointer rounded-md border px-4 py-3 transition ${
                  isSelected
                    ? "border-sky-600 bg-sky-950/30"
                    : "border-slate-800 bg-slate-950/20 hover:bg-slate-950/40"
                }`}
                onClick={async (e) => {
                  e.stopPropagation();
                  await props.onSelectContainer(isSelected ? null : container.id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="truncate font-medium text-sm">{container.name}</div>
                      <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                        {count} serviço(s)
                      </span>
                    </div>
                    {container.description && (
                      <div className="truncate text-xs text-slate-400" title={container.description}>
                        {container.description}
                      </div>
                    )}
                  </div>
                  {/* Botões de ação alinhados ao topo */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="rounded-md bg-emerald-700/50 p-1.5 hover:bg-emerald-600/50 transition-colors"
                      onClick={() => void handleStartContainer(container.id)}
                      title="Iniciar todos os serviços do container"
                    >
                      <PlayIcon />
                    </button>
                    <button
                      className="rounded-md bg-rose-700/50 p-1.5 hover:bg-rose-600/50 transition-colors"
                      onClick={() => void handleStopContainer(container.id)}
                      title="Parar todos os serviços do container"
                    >
                      <StopIcon />
                    </button>
                    <button
                      className="rounded-md bg-rose-800/50 p-1.5 hover:bg-rose-700/50 transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        await handleDeleteContainer(container.id, container.name);
                      }}
                      title="Excluir container"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {containers.length === 0 && (
            <div className="rounded-md border border-slate-800 bg-slate-950/20 p-4 text-sm text-slate-300">
              Nenhum container criado. Clique no botão + para criar um.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
