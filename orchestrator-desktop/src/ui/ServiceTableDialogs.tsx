import { api } from "../api/client";
import type { ServiceDto } from "../api/types";
import { Modal } from "./Modal";
import { PhpCommandModal } from "./PhpCommandModal";
import { ServicePortModal } from "./ServicePortModal";
import type { ToastType } from "./Toast";

type PortTarget = {
  name: string;
  currentPort?: string;
  detectedPort?: string | null;
  hasCustomPort: boolean;
};

export function ServiceTableDialogs(props: {
  deleteTarget: string | null;
  rmContTarget: { svc: string; cid: string; cname: string } | null;
  portTarget: PortTarget | null;
  phpCommandTarget: ServiceDto | null;
  allServices: ServiceDto[];
  bulkRemoveOpen: boolean;
  bulkRemoveCount: number;
  onDeleteTarget: (value: string | null) => void;
  onRmContTarget: (value: { svc: string; cid: string; cname: string } | null) => void;
  onPortTarget: (value: PortTarget | null) => void;
  onPhpCommandTarget: (value: ServiceDto | null) => void;
  onBulkRemoveOpen: (value: boolean) => void;
  onBulkRemove: () => void;
  onServicesUpdate?: (services: ServiceDto[]) => void;
  onAction: () => Promise<void>;
  onToast?: (type: ToastType, message: string) => void;
}) {
  async function confirmRemoveService() {
    if (!props.deleteTarget) return;
    const name = props.deleteTarget;
    props.onDeleteTarget(null);
    try {
      await api.removeService(name);
      await props.onAction();
      props.onToast?.("success", `"${name}" removido`);
    } catch (error) {
      props.onToast?.("error", String(error));
    }
  }

  async function confirmRmCont() {
    if (!props.rmContTarget) return;
    try {
      const updated = await api.removeServiceFromContainer(props.rmContTarget.svc, props.rmContTarget.cid);
      props.onServicesUpdate?.(updated);
      await props.onAction();
    } catch (error) {
      props.onToast?.("error", String(error));
    }
    props.onRmContTarget(null);
  }

  return (
    <>
      <Modal
        open={!!props.deleteTarget}
        title="Remover serviço"
        message={`Remover "${props.deleteTarget}"?\nIsso não deleta o projeto.`}
        kind="danger"
        confirmLabel="Remover"
        onConfirm={() => void confirmRemoveService()}
        onCancel={() => props.onDeleteTarget(null)}
      />
      <Modal
        open={!!props.rmContTarget}
        title="Remover do container"
        message={`Remover serviço de "${props.rmContTarget?.cname}"?`}
        kind="warning"
        confirmLabel="Remover"
        onConfirm={() => void confirmRmCont()}
        onCancel={() => props.onRmContTarget(null)}
      />
      <ServicePortModal
        open={!!props.portTarget}
        serviceName={props.portTarget?.name ?? null}
        currentPort={props.portTarget?.currentPort}
        detectedPort={props.portTarget?.detectedPort}
        hasCustomPort={props.portTarget?.hasCustomPort}
        allServices={props.allServices}
        onCancel={() => props.onPortTarget(null)}
        onConfirm={async (name, port) => {
          try {
            const updated = await api.setServicePort(name, port);
            props.onServicesUpdate?.(updated);
            props.onToast?.("success", `Porta ${port} → ${name}`);
          } catch (error) {
            props.onToast?.("error", String(error));
          } finally {
            props.onPortTarget(null);
          }
        }}
      />
      <Modal
        open={props.bulkRemoveOpen}
        title="Remover vários"
        message={`Remover ${props.bulkRemoveCount} serviço(s)?\nIsso não deleta os projetos.`}
        kind="danger"
        confirmLabel="Remover"
        onConfirm={() => {
          props.onBulkRemoveOpen(false);
          props.onBulkRemove();
        }}
        onCancel={() => props.onBulkRemoveOpen(false)}
      />
      <PhpCommandModal
        open={!!props.phpCommandTarget}
        serviceName={props.phpCommandTarget?.name ?? null}
        selectedScript={props.phpCommandTarget?.selectedScript}
        onCancel={() => props.onPhpCommandTarget(null)}
        onConfirm={async (name, command) => {
          try {
            const updated = await api.setServicePhpCommand(name, command);
            props.onServicesUpdate?.(updated);
            props.onToast?.("success", `Comando PHP atualizado em ${name}`);
          } catch (error) {
            props.onToast?.("error", String(error));
          } finally {
            props.onPhpCommandTarget(null);
          }
        }}
      />
    </>
  );
}
