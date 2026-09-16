import type { DockerResourceKind, DockerResourceTarget } from "../../api/types";

export type DockerSelectionKey = string;

export function selectionKey(kind: DockerResourceKind, id: string): DockerSelectionKey {
  return `${kind}:${id}`;
}

export function toTarget(key: DockerSelectionKey): DockerResourceTarget | null {
  const separator = key.indexOf(":");
  if (separator <= 0) return null;
  const kind = key.slice(0, separator) as DockerResourceKind;
  const id = key.slice(separator + 1);
  if (!id) return null;
  return { kind, id };
}

export function toTargets(keys: Iterable<DockerSelectionKey>): DockerResourceTarget[] {
  const targets: DockerResourceTarget[] = [];
  for (const key of keys) {
    const target = toTarget(key);
    if (target) targets.push(target);
  }
  return targets;
}

export function countByKind(keys: Iterable<DockerSelectionKey>): Record<DockerResourceKind, number> {
  const counts: Record<DockerResourceKind, number> = { CONTAINER: 0, IMAGE: 0, VOLUME: 0 };
  for (const target of toTargets(keys)) counts[target.kind] += 1;
  return counts;
}

export function toggleKey(current: Set<DockerSelectionKey>, key: DockerSelectionKey): Set<DockerSelectionKey> {
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function setKeys(
  current: Set<DockerSelectionKey>,
  keys: DockerSelectionKey[],
  selected: boolean,
): Set<DockerSelectionKey> {
  const next = new Set(current);
  for (const key of keys) {
    if (selected) next.add(key);
    else next.delete(key);
  }
  return next;
}
