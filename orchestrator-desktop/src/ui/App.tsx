import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { ContainerDto, ServiceDto } from "../api/types";
import { ContainersPanel } from "./ContainersPanel";
import { ContainerTabs } from "./ContainerTabs";
import { Dropdown } from "./Dropdown";
import { Icon } from "./Icons";
import { ImportSection } from "./ImportSection";
import { KillPortModal } from "./KillPortModal";
import { LogsPanel } from "./LogsPanel";
import { mergeSubsetOrder } from "./mergeSubsetOrder";
import { ResizeHandle } from "./ResizeHandle";
import { ServiceTable } from "./ServiceTable";
import { SettingsPanel, useSettings } from "./SettingsPanel";
import { StatusBar } from "./StatusBar";
import { Toast, useToast } from "./Toast";
import { Toolbar } from "./Toolbar";
import { Tooltip } from "./Tooltip";
import { useCoreEvents } from "./useCoreEvents";
import { useJavaRuntime } from "./useJavaRuntime";
import { useServiceBranchPolling } from "./useServiceBranchPolling";
import { useServiceFilters } from "./useServiceFilters";
import { useServiceShortcuts } from "./useServiceShortcuts";
import { useAppUpdater } from "./useAppUpdater";
import { useWorkspaceData } from "./useWorkspaceData";

export function App(props: { onReady?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [containersCollapsed, setContainersCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [killPortOpen, setKillPortOpen] = useState(false);
  const [sideW, setSideW] = useState(288);
  const [svcW, setSvcW] = useState(288);

  const { toasts, addToast, removeToast } = useToast();
  const appUpdate = useAppUpdater();
  const { settings, setSettings } = useSettings();
  const java = useJavaRuntime();
  const { setJavaError } = java;

  const workspace = useWorkspaceData({
    addToast,
    setJavaError,
    onJavaStartupError: () => setSettingsOpen(true),
    onReady: props.onReady,
    onServicesLoaded: (list) => {
      setSelected((prev) => (prev && !list.some((s) => s.name === prev) ? null : prev));
    },
  });

  const {
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
  } = workspace;

  const {
    filterText,
    setFilterText,
    techFilter,
    setTechFilter,
    availableTechs,
    containerServices,
    filteredServices,
    techDropdownOptions,
  } = useServiceFilters(services, selectedContainer);

  const selectedService = useMemo(
    () => services.find((s) => s.name === selected) ?? null,
    [services, selected],
  );

  useServiceBranchPolling(services, setServices);
  useCoreEvents({ refresh, setServices });
  useServiceShortcuts({
    selected,
    services,
    refresh,
    addToast,
    toggleSettings: () => setSettingsOpen((value) => !value),
  });

  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  const handleServicesReorder = useCallback((reorderedSubset: ServiceDto[]) => {
    setServices((prev) => mergeSubsetOrder(prev, reorderedSubset, (s) => s.name));
  }, [setServices]);

  const handleSelectContainer = useCallback(
    async (id: string | null) => {
      setSelectedContainer(id);
      if (id) {
        const svcInContainer = services.filter((s) => s.containerIds?.includes(id));
        if (svcInContainer.length < 2 && svcInContainer.length > 0) setSelected(svcInContainer[0].name);
      }
      setFilterText("");
      await refresh();
    },
    [services, refresh, setFilterText],
  );

  const handleSaveJavaPath = useCallback(
    async (value: string | null) => {
      try {
        const ok = await java.save(value, refreshData);
        if (ok) {
          await refreshJdks();
          addToast("success", value ? "Java configurado" : "Configuração do Java removida");
          setSettingsOpen(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSettingsOpen(true);
        addToast("error", message);
      }
    },
    [addToast, java, refreshData, refreshJdks],
  );

  const handleRebuildServices = useCallback(async () => {
    try {
      await rebuildServices();
      addToast("success", "Cache limpo e serviços recriados.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addToast("error", message);
      throw error;
    }
  }, [addToast, rebuildServices]);

  return (
    <div className="flex h-screen flex-col bg-surface-0 overflow-hidden">
      <Toolbar
        onSettings={() => setSettingsOpen(true)}
        onKillPort={() => setKillPortOpen(true)}
      />
      <main className="flex flex-1 min-h-0">
        <aside
          className="shrink-0 border-r border-white/[0.04]"
          style={{
            width: containersCollapsed ? 40 : sideW,
            transition: containersCollapsed ? "width 0.2s" : undefined,
          }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04]">
            <span
              className={`text-2xs font-semibold uppercase tracking-widest text-slate-600 transition-opacity ${
                containersCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}
            >
              Containers
            </span>
            <Tooltip text={containersCollapsed ? "Expandir" : "Recolher"}>
              <button
                className="btn-ghost rounded p-1"
                onClick={() => setContainersCollapsed(!containersCollapsed)}
              >
                <Icon.Chevron
                  className={`h-3 w-3 text-slate-600 transition-transform duration-200 ${
                    containersCollapsed ? "rotate-180" : ""
                  }`}
                />
              </button>
            </Tooltip>
          </div>
          <div
            className={`transition-opacity duration-200 ${
              containersCollapsed
                ? "opacity-0 pointer-events-none h-0 overflow-hidden"
                : "opacity-100 h-[calc(100%-37px)]"
            }`}
          >
            <ContainersPanel
              services={services}
              containers={containers}
              selectedContainer={selectedContainer}
              onSelectContainer={handleSelectContainer}
              onRefresh={refresh}
              onContainersChanged={refresh}
              onContainersReorder={setContainers}
              onToast={addToast}
            />
          </div>
        </aside>
        {!containersCollapsed && <ResizeHandle value={sideW} onChange={setSideW} min={140} max={320} />}

        <section className="flex flex-col shrink-0 border-r border-white/[0.04]" style={{ width: svcW }}>
          <div className="px-3 py-2.5 border-b border-white/[0.04] space-y-2">
            <ContainerTabs
              containers={containers}
              selectedContainer={selectedContainer}
              onSelect={handleSelectContainer}
            />
            <ImportSection onImported={refresh} addToast={addToast} />
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Icon.Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="input pl-7 text-2xs"
                />
              </div>
              {availableTechs.length > 1 && (
                <Dropdown
                  value={techFilter}
                  onChange={setTechFilter}
                  options={techDropdownOptions}
                  placeholder="Filtrar"
                  align="right"
                />
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <ServiceTable
              services={filteredServices}
              allServices={services}
              selected={selected}
              onSelect={setSelected}
              onAction={refresh}
              onServicesUpdate={handleServicesReorder}
              selectedContainer={selectedContainer}
              containers={containers}
              jdks={jdks}
              phps={phps}
              onToast={addToast}
              loading={loading}
            />
          </div>
          <StatusBar
            services={services}
            selectedContainer={selectedContainer}
            filteredCount={filteredServices.length}
            update={appUpdate}
          />
        </section>
        <ResizeHandle value={svcW} onChange={setSvcW} min={220} max={450} />

        <section className="flex flex-1 min-w-0 flex-col relative">
          <LogsPanel
            service={selectedService}
            selectedContainer={selectedContainer}
            containerServices={containerServices}
            fontSize={settings.fontSize}
            lineWrap={settings.logLineWrap}
            onToast={addToast}
          />
        </section>
      </main>

      <KillPortModal
        open={killPortOpen}
        onClose={() => setKillPortOpen(false)}
        onToast={addToast}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        javaPath={java.runtimeSettings.javaPath ?? ""}
        javaError={java.javaError}
        savingJavaPath={java.savingJavaPath}
        onPickJavaFolder={java.pickFolder}
        onPickJavaFile={java.pickFile}
        onSaveJavaPath={handleSaveJavaPath}
        onRebuildServices={handleRebuildServices}
      />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
