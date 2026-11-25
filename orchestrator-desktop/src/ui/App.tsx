import { useCallback, useEffect, useMemo, useState } from "react";
import type { ServiceDto } from "../api/types";
import { DockerView } from "./docker/docker/DockerView";
import { ServicesWorkspace } from "./layout/ServicesWorkspace";
import { Toolbar } from "./layout/Toolbar";
import type { AppSection } from "./layout/Toolbar";
import { KillPortModal } from "./ports/KillPortModal";
import { SettingsPanel, useSettings } from "./config/SettingsPanel";
import { Toast, useToast } from "./toast/Toast";
import { mergeSubsetOrder } from "./workspace/merge/mergeSubsetOrder";
import { useAppUpdater } from "./workspace/hooks/useAppUpdater";
import { useCoreEvents } from "./workspace/hooks/useCoreEvents";
import { useJavaRuntime } from "./workspace/hooks/useJavaRuntime";
import { useWorkspaceData } from "./workspace/hooks/useWorkspaceData";
import { useServiceBranchPolling } from "./service-table/hooks/useServiceBranchPolling";
import { useServiceFilters } from "./service-table/hooks/useServiceFilters";
import { useServiceShortcuts } from "./service-table/hooks/useServiceShortcuts";

export function App(props: { onReady?: () => void }) {
  const [section, setSection] = useState<AppSection>("services");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [containersCollapsed, setContainersCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [killPortOpen, setKillPortOpen] = useState(false);
  const [sideW, setSideW] = useState(300);
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
      setSelectedServices((prev) => prev.filter((name) => list.some((s) => s.name === name)));
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
    rebuildServices,
    refreshDeclaredPorts,
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
  const selectedLogServices = useMemo(
    () => selectedServices.map((name) => services.find((s) => s.name === name)).filter((s): s is ServiceDto => !!s),
    [selectedServices, services],
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
        if (svcInContainer.length < 2 && svcInContainer.length > 0) {
          setSelected(svcInContainer[0].name);
        }
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
        section={section}
        onSectionChange={setSection}
      />
      <ServicesWorkspace
        hidden={section !== "services"}
        containersCollapsed={containersCollapsed}
        onToggleContainers={() => setContainersCollapsed(!containersCollapsed)}
        sideW={sideW}
        onSideW={setSideW}
        svcW={svcW}
        onSvcW={setSvcW}
        services={services}
        containers={containers}
        selectedContainer={selectedContainer}
        onSelectContainer={handleSelectContainer}
        onRefresh={refresh}
        onRefreshPorts={async () => {
          await refreshDeclaredPorts(selectedContainer);
        }}
        onContainersReorder={setContainers}
        onToast={addToast}
        filterText={filterText}
        onFilterText={setFilterText}
        techFilter={techFilter}
        onTechFilter={setTechFilter}
        availableTechs={availableTechs}
        techDropdownOptions={techDropdownOptions}
        filteredServices={filteredServices}
        selected={selected}
        onSelect={setSelected}
        selectedServices={selectedServices}
        onSelectedServicesChange={setSelectedServices}
        onServicesUpdate={handleServicesReorder}
        jdks={jdks}
        phps={phps}
        loading={loading}
        selectedService={selectedService}
        selectedLogServices={selectedLogServices}
        containerServices={containerServices}
        fontSize={settings.fontSize}
        lineWrap={settings.logLineWrap}
        update={appUpdate}
      />
      <section
        className="flex-1 min-h-0 flex-col"
        style={{ display: section === "docker" ? "flex" : "none" }}
      >
        <DockerView active={section === "docker"} onToast={addToast} />
      </section>
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
