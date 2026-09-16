import type { DockerContainerDto } from "../../api/types";
import type { DropdownOption } from "../Dropdown";

export type DockerContainerSort = "state" | "name" | "image" | "ports";

export const CONTAINER_SORT_OPTIONS: DropdownOption<DockerContainerSort>[] = [
  { value: "state", label: "Estado", icon: "Power" },
  { value: "name", label: "Container", icon: "Box" },
  { value: "image", label: "Imagem", icon: "Layers" },
  { value: "ports", label: "Portas", icon: "Plug" },
];

const STATE_RANK: Record<string, number> = {
  running: 0,
  restarting: 1,
  paused: 2,
  removing: 3,
  created: 4,
  exited: 5,
  dead: 6,
};

const UNKNOWN_STATE_RANK = 7;
const NO_PORT = Number.MAX_SAFE_INTEGER;

function stateRank(state: string): number {
  return STATE_RANK[state.toLowerCase()] ?? UNKNOWN_STATE_RANK;
}

function firstPublishedPort(ports: string): number {
  const match = ports.match(/:(\d+)->/);
  return match ? Number(match[1]) : NO_PORT;
}

function byName(a: DockerContainerDto, b: DockerContainerDto): number {
  return a.name.localeCompare(b.name, "pt-BR");
}

const COMPARATORS: Record<DockerContainerSort, (a: DockerContainerDto, b: DockerContainerDto) => number> = {
  state: (a, b) => stateRank(a.state) - stateRank(b.state) || byName(a, b),
  name: byName,
  image: (a, b) => a.image.localeCompare(b.image, "pt-BR") || byName(a, b),
  ports: (a, b) => firstPublishedPort(a.ports) - firstPublishedPort(b.ports) || byName(a, b),
};

export function sortContainers(
  containers: DockerContainerDto[],
  sort: DockerContainerSort,
): DockerContainerDto[] {
  return [...containers].sort(COMPARATORS[sort]);
}
