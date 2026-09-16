import type { DockerEngineStatusDto, DockerResourceKind } from "../../api/types";

const KIND_LABELS: Record<DockerResourceKind, { singular: string; plural: string }> = {
  CONTAINER: { singular: "container", plural: "containers" },
  IMAGE: { singular: "imagem", plural: "imagens" },
  VOLUME: { singular: "volume", plural: "volumes" },
};

const RUNNING_STATES = new Set(["running", "restarting"]);
const TRANSIENT_STATES = new Set(["created", "paused", "restarting", "removing"]);

export function kindLabel(kind: DockerResourceKind, count = 1): string {
  const labels = KIND_LABELS[kind];
  return count === 1 ? labels.singular : labels.plural;
}

export function isRunning(state: string): boolean {
  return RUNNING_STATES.has(state.toLowerCase());
}

export function stateTone(state: string): string {
  const normalized = state.toLowerCase();
  if (RUNNING_STATES.has(normalized)) return "bg-accent/10 text-accent";
  if (normalized === "exited" || normalized === "dead") return "bg-danger/10 text-danger";
  if (TRANSIENT_STATES.has(normalized)) return "bg-warn/10 text-warn";
  return "bg-surface-3 text-slate-500";
}

export function imageReference(repository: string, tag: string, id: string): string {
  if (!repository || repository === "<none>") return id;
  if (!tag || tag === "<none>") return repository;
  return `${repository}:${tag}`;
}

export function shortPorts(ports: string): string {
  if (!ports) return "";
  const seen = new Set<string>();
  for (const chunk of ports.split(",")) {
    const match = chunk.trim().match(/:(\d+)->(\d+)/);
    if (match) seen.add(`${match[1]}→${match[2]}`);
  }
  return [...seen].join(", ");
}

export function providerLabel(status: DockerEngineStatusDto): string {
  switch (status.provider) {
    case "COLIMA":
      return status.colimaProfile ? `Colima (${status.colimaProfile})` : "Colima";
    case "DOCKER_DESKTOP":
      return "Docker Desktop";
    case "SYSTEMD":
      return "systemd";
    default:
      return "Docker";
  }
}

export function engineHeadline(status: DockerEngineStatusDto): string {
  if (status.starting) return "Iniciando Docker...";
  if (status.engineRunning) return "Docker ativo";
  if (!status.cliAvailable) return "Docker CLI não encontrado";
  return "Docker inativo";
}
