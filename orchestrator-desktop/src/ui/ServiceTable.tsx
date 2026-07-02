import { useCallback, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { api } from "../api/client";
import type { ContainerDto, JdkInfo, PhpInfo, ServiceDto } from "../api/types";
import { Icon } from "./Icons";
import { ServiceRow } from "./ServiceRow";
import { ServiceTableDialogs } from "./ServiceTableDialogs";
import { getServicePort } from "./serviceMeta";
import type { ToastType } from "./Toast";
import { mergeSubsetOrderIds } from "./mergeSubsetOrder";
import { useDragReorder } from "./useDragReorder";

export function ServiceTable(props: {
  services: ServiceDto[];
  allServices?: ServiceDto[];
  selected: string | null;
  onSelect: (name: string) => void;
  selectedServices: string[];
  onSelectedServicesChange: (names: string[]) => void;
  onAction: () => Promise<void>;
  onServicesUpdate?: (s: ServiceDto[]) => void;
  selectedContainer?: string | null;
  containers?: ContainerDto[];
  jdks?: JdkInfo[];
  phps?: PhpInfo[];
  onToast?: (t: ToastType, m: string) => void;
  loading?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const containers = props.containers ?? [];
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rmContTarget, setRmContTarget] = useState<{ svc: string; cid: string; cname: string } | null>(null);
  const [portTarget, setPortTarget] = useState<{ name: string; currentPort?: string; detectedPort?: string | null; hasCustomPort: boolean } | null>(null);
  const [phpCommandTarget, setPhpCommandTarget] = useState<ServiceDto | null>(null);
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

  const allSvcs = props.allServices ?? props.services;
  const handleReorder = useCallback(
    (reordered: ServiceDto[]) => {
      props.onServicesUpdate?.(reordered);
      const merged = mergeSubsetOrderIds(allSvcs, reordered, (service) => service.name);
      void api.reorderServices(merged);
    },
    [allSvcs, props.onServicesUpdate],
  );

  const { items: orderedServices, containerRef, gripProps, activeId } = useDragReorder(props.services, (service) => service.name, handleReorder);
  const selectedSet = useMemo(() => new Set(props.selectedServices), [props.selectedServices]);
  const orderedNames = useMemo(() => orderedServices.map((service) => service.name), [orderedServices]);
  const selectedBulkNames = useMemo(
    () => allSvcs.filter((service) => selectedSet.has(service.name)).map((service) => service.name),
    [allSvcs, selectedSet],
  );

  async function addTo(serviceName: string, containerId: string) {
    setMenuOpen(null);
    try {
      const updated = await api.addServiceToContainer(serviceName, containerId);
      props.onServicesUpdate?.(updated);
      await props.onAction();
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  async function addSelectedToContainer(containerId: string) {
    try {
      const updated = await api.addServicesToContainer(selectedBulkNames, containerId);
      props.onServicesUpdate?.(updated);
      await props.onAction();
      props.onToast?.("success", `${selectedBulkNames.length} serviço(s) movido(s)`);
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  async function removeSelectedFromContainer(containerId: string) {
    try {
      const updated = await api.removeServicesFromContainer(selectedBulkNames, containerId);
      props.onServicesUpdate?.(updated);
      await props.onAction();
      props.onToast?.("success", `${selectedBulkNames.length} serviço(s) removido(s) do container`);
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  async function removeSelectedServices() {
    try {
      const updated = await api.removeServices(selectedBulkNames);
      props.onSelectedServicesChange([]);
      props.onServicesUpdate?.(updated);
      await props.onAction();
      props.onToast?.("success", `${selectedBulkNames.length} serviço(s) removido(s)`);
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  function toggleBulkSelection(name: string) {
    const next = new Set(props.selectedServices);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    props.onSelectedServicesChange([...next]);
    setSelectionAnchor(name);
  }

  function selectRow(service: ServiceDto, event: MouseEvent) {
    props.onSelect(service.name);
    if (event.shiftKey && selectionAnchor) {
      const anchorIndex = orderedNames.indexOf(selectionAnchor);
      const targetIndex = orderedNames.indexOf(service.name);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        props.onSelectedServicesChange(orderedNames.slice(start, end + 1));
        return;
      }
    }
    setSelectionAnchor(service.name);
    props.onSelectedServicesChange([service.name]);
  }

  function openServiceMenu(service: ServiceDto, preserveSelection: boolean) {
    props.onSelect(service.name);
    if (!preserveSelection || !selectedSet.has(service.name)) {
      props.onSelectedServicesChange([service.name]);
      setSelectionAnchor(service.name);
    }
    setMenuOpen(menuOpen === service.name ? null : service.name);
  }

  async function resetPort(name: string) {
    try {
      const updated = await api.resetServicePort(name);
      props.onServicesUpdate?.(updated);
      props.onToast?.("success", `Porta padrão restaurada em ${name}`);
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  if (props.loading) {
    return (
      <div className="px-2 pb-2 space-y-2">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="rounded-lg border border-white/[0.04] bg-surface-1 px-3 py-3 animate-pulse"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded bg-surface-3" />
              <div className="h-2 w-2 rounded-full bg-surface-3" />
              <div className="h-3 rounded bg-surface-3" style={{ width: `${60 + index * 15}px` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-2 pb-2 space-y-2 select-none">
      {orderedServices.map((service) => (
        <ServiceRow
          key={service.name}
          s={service}
          sel={props.selected === service.name}
          busy={busy}
          containers={containers}
          jdks={props.jdks ?? []}
          phps={props.phps ?? []}
          menuOpen={menuOpen === service.name}
          isDragging={activeId === service.name}
          bulkSelected={selectedSet.has(service.name)}
          bulkCount={selectedBulkNames.length}
          gripProps={gripProps(service.name)}
          onSelect={(event) => selectRow(service, event)}
          onBulkToggle={() => toggleBulkSelection(service.name)}
          onBulkRemove={() => setBulkRemoveOpen(true)}
          onBulkAddToContainer={addSelectedToContainer}
          onBulkRemoveFromContainer={removeSelectedFromContainer}
          onMenuToggle={() => openServiceMenu(service, true)}
          onContextMenuOpen={() => openServiceMenu(service, true)}
          onMenuClose={() => setMenuOpen(null)}
          onDelete={() => {
            setMenuOpen(null);
            setDeleteTarget(service.name);
          }}
          onAdd={addTo}
          onRemove={(serviceName, containerId) => {
            const container = containers.find((item) => item.id === containerId);
            setMenuOpen(null);
            setRmContTarget({ svc: serviceName, cid: containerId, cname: container?.name ?? "" });
          }}
          onSetJava={async (name, version) => {
            setMenuOpen(null);
            try {
              const updated = await api.setServiceJavaVersion(name, version);
              props.onServicesUpdate?.(updated);
              props.onToast?.("success", `Java ${version ?? "padrão"} → ${name}`);
            } catch (error) {
              props.onToast?.("error", String(error));
            }
          }}
          onSetPhp={async (name, version) => {
            setMenuOpen(null);
            try {
              const updated = await api.setServicePhpVersion(name, version);
              props.onServicesUpdate?.(updated);
              props.onToast?.("success", `PHP ${version ?? "padrão"} → ${name}`);
            } catch (error) {
              props.onToast?.("error", String(error));
            }
          }}
          onSetScript={async (name, script) => {
            setMenuOpen(null);
            try {
              const updated = await api.setServiceScript(name, script);
              props.onServicesUpdate?.(updated);
              props.onToast?.("success", `Script ${script} → ${name}`);
            } catch (error) {
              props.onToast?.("error", String(error));
            }
          }}
          onSetPhpCommand={(target) => {
            setMenuOpen(null);
            setPhpCommandTarget(target);
          }}
          onSetPort={(target) => {
            setMenuOpen(null);
            setPortTarget({
              name: target.name,
              currentPort: getServicePort(target) ?? undefined,
              detectedPort: target.detectedPort == null ? null : String(target.detectedPort),
              hasCustomPort: !!target.customPort,
            });
          }}
          onResetPort={resetPort}
          onSetMvnWrapper={async (name, enabled) => {
            setMenuOpen(null);
            try {
              const updated = await api.setServiceMvnWrapper(name, enabled);
              props.onServicesUpdate?.(updated);
              props.onToast?.("success", enabled ? `Wrapper Maven ativado em ${name}` : `Wrapper Maven desativado em ${name}`);
            } catch (error) {
              props.onToast?.("error", String(error));
            }
          }}
          onStart={async () => {
            setBusy(service.name);
            try {
              await api.start(service.name);
              await props.onAction();
            } finally {
              setBusy(null);
            }
          }}
          onStop={async () => {
            setBusy(service.name);
            try {
              await api.stop(service.name);
              await props.onAction();
            } finally {
              setBusy(null);
            }
          }}
          onRestart={async () => {
            setBusy(service.name);
            try {
              await api.restart(service.name);
              await props.onAction();
            } finally {
              setBusy(null);
            }
          }}
        />
      ))}
      {props.services.length === 0 && (
        <div className="flex flex-col items-center py-12 animate-fade-in">
          <Icon.Box className="h-10 w-10 mb-3 text-slate-800" />
          <p className="text-xs text-slate-600">Nenhum serviço</p>
          <p className="text-2xs text-slate-700 mt-1">Importe um projeto para começar</p>
        </div>
      )}
      <ServiceTableDialogs
        deleteTarget={deleteTarget}
        rmContTarget={rmContTarget}
        portTarget={portTarget}
        phpCommandTarget={phpCommandTarget}
        allServices={allSvcs}
        bulkRemoveOpen={bulkRemoveOpen}
        bulkRemoveCount={selectedBulkNames.length}
        onDeleteTarget={setDeleteTarget}
        onRmContTarget={setRmContTarget}
        onPortTarget={setPortTarget}
        onPhpCommandTarget={setPhpCommandTarget}
        onBulkRemoveOpen={setBulkRemoveOpen}
        onBulkRemove={() => void removeSelectedServices()}
        onServicesUpdate={props.onServicesUpdate}
        onAction={props.onAction}
        onToast={props.onToast}
      />
    </div>
  );
}
