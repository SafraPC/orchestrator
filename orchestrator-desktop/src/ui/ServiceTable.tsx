import { useCallback, useState } from "react";
import { api } from "../api/client";
import type { ContainerDto, JdkInfo, ServiceDto } from "../api/types";
import { Icon } from "./Icons";
import { Modal } from "./Modal";
import { ServicePortModal } from "./ServicePortModal";
import { ServiceRow } from "./ServiceRow";
import { getServicePort } from "./serviceMeta";
import type { ToastType } from "./Toast";
import { useDragReorder } from "./useDragReorder";

export function ServiceTable(props: {
  services: ServiceDto[];
  allServices?: ServiceDto[];
  selected: string | null;
  onSelect: (name: string) => void;
  onAction: () => Promise<void>;
  onServicesUpdate?: (s: ServiceDto[]) => void;
  selectedContainer?: string | null;
  containers?: ContainerDto[];
  jdks?: JdkInfo[];
  onToast?: (t: ToastType, m: string) => void;
  loading?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const containers = props.containers ?? [];
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rmContTarget, setRmContTarget] = useState<{ svc: string; cid: string; cname: string } | null>(null);
  const [portTarget, setPortTarget] = useState<{ name: string; currentPort?: string; detectedPort?: string | null; hasCustomPort: boolean } | null>(null);

  const allSvcs = props.allServices ?? props.services;
  const handleReorder = useCallback(
    (reordered: ServiceDto[]) => {
      props.onServicesUpdate?.(reordered);
      const subNames = new Set(reordered.map((service) => service.name));
      const otherNames = allSvcs.filter((service) => !subNames.has(service.name)).map((service) => service.name);
      const merged: string[] = [];
      let otherIndex = 0;
      let subIndex = 0;
      for (const service of allSvcs) {
        if (subNames.has(service.name)) {
          if (subIndex < reordered.length) merged.push(reordered[subIndex++].name);
        } else if (otherIndex < otherNames.length) {
          merged.push(otherNames[otherIndex++]);
        }
      }
      void api.reorderServices(merged);
    },
    [allSvcs, props.onServicesUpdate],
  );

  const { items: orderedServices, containerRef, gripProps, activeId } = useDragReorder(props.services, (service) => service.name, handleReorder);

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

  async function confirmRemoveService() {
    if (!deleteTarget) return;
    const name = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.removeService(name);
      await props.onAction();
      props.onToast?.("success", `"${name}" removido`);
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  async function confirmRmCont() {
    if (!rmContTarget) return;
    try {
      const updated = await api.removeServiceFromContainer(rmContTarget.svc, rmContTarget.cid);
      props.onServicesUpdate?.(updated);
      await props.onAction();
    } catch (error) {
      props.onToast?.("error", String(error));
    }
    setRmContTarget(null);
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
          menuOpen={menuOpen === service.name}
          isDragging={activeId === service.name}
          gripProps={gripProps(service.name)}
          onSelect={() => props.onSelect(service.name)}
          onMenuToggle={() => setMenuOpen(menuOpen === service.name ? null : service.name)}
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
          onSetScript={async (name, script) => {
            setMenuOpen(null);
            try {
              const updated = await api.setServiceScript(name, script);
              props.onServicesUpdate?.(updated);
              props.onToast?.("success", `npm run ${script} → ${name}`);
            } catch (error) {
              props.onToast?.("error", String(error));
            }
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
      <Modal
        open={!!deleteTarget}
        title="Remover serviço"
        message={`Remover "${deleteTarget}"?\nIsso não deleta o projeto.`}
        kind="danger"
        confirmLabel="Remover"
        onConfirm={() => void confirmRemoveService()}
        onCancel={() => setDeleteTarget(null)}
      />
      <Modal
        open={!!rmContTarget}
        title="Remover do container"
        message={`Remover serviço de "${rmContTarget?.cname}"?`}
        kind="warning"
        confirmLabel="Remover"
        onConfirm={() => void confirmRmCont()}
        onCancel={() => setRmContTarget(null)}
      />
      <ServicePortModal
        open={!!portTarget}
        serviceName={portTarget?.name ?? null}
        currentPort={portTarget?.currentPort}
        detectedPort={portTarget?.detectedPort}
        hasCustomPort={portTarget?.hasCustomPort}
        allServices={allSvcs}
        onCancel={() => setPortTarget(null)}
        onConfirm={async (name, port) => {
          try {
            const updated = await api.setServicePort(name, port);
            props.onServicesUpdate?.(updated);
            props.onToast?.("success", `Porta ${port} → ${name}`);
          } catch (error) {
            props.onToast?.("error", String(error));
          } finally {
            setPortTarget(null);
          }
        }}
      />
    </div>
  );
}
