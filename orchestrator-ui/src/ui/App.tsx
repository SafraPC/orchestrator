import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { ContainerDto, ServiceDto } from "../api/types";
import { ContainersPanel } from "./ContainersPanel";
import { LogsPanel } from "./LogsPanel";
import { ServiceTable } from "./ServiceTable";

export function App() {
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rootInput, setRootInput] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [filterByPath, setFilterByPath] = useState(false);
  const [containersCollapsed, setContainersCollapsed] = useState(false);
  const [servicesCollapsed, setServicesCollapsed] = useState(false);
  const [containersRefreshKey, setContainersRefreshKey] = useState(0);
  const [containers, setContainers] = useState<ContainerDto[]>([]);

  useEffect(() => {
    if (importMessage) {
      const timer = setTimeout(() => {
        setImportMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [importMessage]);
  const selectedService = useMemo(() => services.find((s) => s.name === selected) ?? null, [services, selected]);

  async function refresh() {
    await api.getWorkspace();
    const list = await api.listServices();
    setServices(list);
    if (selected && !list.some((s) => s.name === selected)) {
      setSelected(null);
    }
    const containersList = await api.listContainers();
    setContainers(containersList);
  }

  useEffect(() => {
    void refresh();
    void api.listContainers().then(setContainers);

    const interval = setInterval(() => {
      void refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void api.listContainers().then(setContainers);
  }, [containersRefreshKey]);

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <div className="mx-auto w-full max-w-6xl flex-1 flex flex-col px-4 py-6 min-h-0">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">The Orchestrator</h1>
            <p className="text-sm text-slate-300">Gerencie e monitore seus serviços Spring Boot em um só lugar</p>
          </div>
        </header>

        <main className="mt-6 flex flex-1 gap-4 min-h-0">
          <section
            className={`flex flex-col rounded-lg border border-slate-800 bg-slate-900/40 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
              containersCollapsed ? "w-14" : "w-64"
            }`}
          >
            <div className="relative flex h-full flex-col overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div
                    className={`transition-opacity duration-300 ${
                      containersCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    }`}
                  >
                    <h2 className="text-sm font-medium text-slate-200">Containers</h2>
                  </div>
                  <button
                    className="rounded-md bg-slate-700/50 p-1.5 hover:bg-slate-600/50 transition-colors shrink-0"
                    onClick={() => setContainersCollapsed(!containersCollapsed)}
                    title={containersCollapsed ? "Expandir containers" : "Colapsar containers"}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-300 ${containersCollapsed ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                className={`flex-1 flex flex-col transition-opacity duration-300 min-h-0 overflow-hidden ${
                  containersCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <ContainersPanel
                  services={services}
                  selectedContainer={selectedContainer}
                  onSelectContainer={async (id) => {
                    setSelectedContainer(id);
                    await refresh();
                  }}
                  onRefresh={refresh}
                  onContainersChanged={() => setContainersRefreshKey((k) => k + 1)}
                />
              </div>
            </div>
          </section>

          <section
            className={`flex flex-col rounded-lg border border-slate-800 bg-slate-900/40 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
              servicesCollapsed ? "w-14" : "w-96"
            }`}
          >
            <div className="relative flex h-full flex-col overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div
                    className={`transition-opacity duration-300 ${
                      servicesCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    }`}
                  >
                    <h2 className="text-sm font-medium text-slate-200">Serviços</h2>
                  </div>
                  <button
                    className="rounded-md bg-slate-700/50 p-1 hover:bg-slate-600/50 transition-colors shrink-0"
                    onClick={() => setServicesCollapsed(!servicesCollapsed)}
                    title={servicesCollapsed ? "Expandir serviços" : "Colapsar serviços"}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-300 ${servicesCollapsed ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div
                className={`flex-1 flex flex-col transition-opacity duration-300 min-h-0 overflow-hidden ${
                  servicesCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="mt-3 flex items-center gap-2 overflow-x-auto px-4 shrink-0">
                  <button
                    className={`rounded-md px-2 py-1 text-xs whitespace-nowrap shrink-0 ${
                      selectedContainer === null
                        ? "bg-sky-700 text-slate-100"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                    }`}
                    onClick={async () => {
                      setSelectedContainer(null);
                      setFilterText("");
                      await refresh();
                    }}
                  >
                    Todos
                  </button>
                  {containers.map((c) => (
                    <button
                      key={c.id}
                      className={`rounded-md px-2 py-1 text-xs whitespace-nowrap shrink-0 ${
                        selectedContainer === c.id
                          ? "bg-sky-700 text-slate-100"
                          : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                      }`}
                      onClick={async () => {
                        setSelectedContainer(c.id);
                        setFilterText("");
                        await refresh();
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-2 px-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      value={rootInput}
                      onChange={(e) => {
                        setRootInput(e.target.value);
                        setImportMessage(null);
                      }}
                      placeholder="Cole aqui o caminho da pasta raiz (ex: /Users/.../repos)"
                      className="w-full rounded-md border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                      disabled={importing}
                    />
                    <button
                      className="rounded-md bg-sky-700 px-2 py-1 text-xs hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={importing}
                      onClick={async () => {
                        setImporting(true);
                        setImportMessage({ type: "info", text: "Buscando projetos..." });
                        try {
                          let pathToImport: string | null = null;

                          if (!rootInput.trim()) {
                            setImportMessage({ type: "info", text: "Abrindo seletor de pastas..." });
                            const picked = await api.selectFolder();
                            if (picked && picked.trim()) {
                              pathToImport = picked.trim();
                              setRootInput(pathToImport);
                            } else {
                              setImportMessage({ type: "error", text: "Nenhuma pasta foi selecionada." });
                              setImporting(false);
                              return;
                            }
                          } else {
                            pathToImport = rootInput.trim();
                          }

                          if (!pathToImport) {
                            setImportMessage({ type: "error", text: "Caminho inválido." });
                            setImporting(false);
                            return;
                          }

                          setImportMessage({ type: "info", text: `Escaneando ${pathToImport}...` });
                          const result = await api.importRootAndScan(pathToImport);
                          const count = Array.isArray(result) ? result.length : 0;

                          if (count > 0) {
                            setImportMessage({ type: "success", text: `✓ ${count} serviço(s) encontrado(s)!` });
                            setRootInput("");
                            await refresh();
                          } else {
                            setImportMessage({
                              type: "error",
                              text: "Nenhum serviço Spring Boot encontrado nesta pasta. Verifique se há projetos com pom.xml e mvnw.",
                            });
                          }
                        } catch (error) {
                          const errorMsg = error instanceof Error ? error.message : "Erro ao buscar projetos";
                          setImportMessage({ type: "error", text: `Erro: ${errorMsg}` });
                          console.error("Erro ao buscar projetos:", error);
                        } finally {
                          setImporting(false);
                        }
                      }}
                    >
                      {importing ? "Buscando..." : "Buscar projetos"}
                    </button>
                  </div>
                  {importMessage && (
                    <div
                      className={`rounded-md px-3 py-2 text-xs ${
                        importMessage.type === "success"
                          ? "bg-emerald-900/40 text-emerald-200"
                          : importMessage.type === "error"
                          ? "bg-rose-900/40 text-rose-200"
                          : "bg-sky-900/40 text-sky-200"
                      }`}
                    >
                      {importMessage.text}
                    </div>
                  )}
                </div>
                <div className="border-b border-slate-800 px-4 py-2 mt-3 shrink-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Filtrar por nome..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-950/30 px-2 py-1 text-xs text-slate-100"
                      />
                      <label className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={filterByPath}
                          onChange={(e) => setFilterByPath(e.target.checked)}
                          className="rounded"
                        />
                        <span>Por pasta</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                  <ServiceTable
                    services={useMemo(() => {
                      let filtered = selectedContainer
                        ? services.filter((s) => s.containerIds?.includes(selectedContainer))
                        : services;

                      if (filterText) {
                        const text = filterText.toLowerCase();
                        filtered = filtered.filter((s) => {
                          if (filterByPath) {
                            return s.path.toLowerCase().includes(text);
                          }
                          return s.name.toLowerCase().includes(text);
                        });
                      }

                      return filtered;
                    }, [services, selectedContainer, filterText, filterByPath])}
                    selected={selected}
                    onSelect={setSelected}
                    onAction={async () => {
                      await refresh();
                      setContainersRefreshKey((k) => k + 1);
                    }}
                    onServicesUpdate={(updatedServices) => {
                      setServices(updatedServices);
                    }}
                    selectedContainer={selectedContainer}
                    containersRefreshKey={containersRefreshKey}
                  />
                </div>
                <div className="border-t border-slate-800 px-4 py-2 shrink-0">
                  <div className="text-xs text-slate-400">
                    {(() => {
                      let filtered = selectedContainer
                        ? services.filter((s) => s.containerIds?.includes(selectedContainer))
                        : services;
                      if (filterText) {
                        const text = filterText.toLowerCase();
                        filtered = filtered.filter((s) => {
                          if (filterByPath) {
                            return s.path.toLowerCase().includes(text);
                          }
                          return s.name.toLowerCase().includes(text);
                        });
                      }
                      return filtered.length;
                    })()}{" "}
                    serviço(s)
                    {selectedContainer && " no container"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-1 min-w-0 flex-col rounded-lg border border-slate-800 bg-slate-900/40">
            <div className="border-b border-slate-800 px-4 py-3 shrink-0">
              <h2 className="text-sm font-medium text-slate-200">Logs</h2>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <LogsPanel service={selectedService} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
