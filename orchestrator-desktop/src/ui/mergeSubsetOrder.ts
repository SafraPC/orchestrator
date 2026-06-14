export function mergeSubsetOrder<T>(
  full: readonly T[],
  reorderedSubset: readonly T[],
  getId: (item: T) => string,
): T[] {
  const subIds = new Set(reorderedSubset.map(getId));
  const others = full.filter((item) => !subIds.has(getId(item)));
  const merged: T[] = [];
  let otherIdx = 0;
  let subIdx = 0;
  for (const item of full) {
    if (subIds.has(getId(item))) {
      if (subIdx < reorderedSubset.length) merged.push(reorderedSubset[subIdx++]);
    } else if (otherIdx < others.length) {
      merged.push(others[otherIdx++]);
    }
  }
  while (subIdx < reorderedSubset.length) merged.push(reorderedSubset[subIdx++]);
  while (otherIdx < others.length) merged.push(others[otherIdx++]);
  return merged;
}

export function mergeSubsetOrderIds<T>(
  full: readonly T[],
  reorderedSubset: readonly T[],
  getId: (item: T) => string,
): string[] {
  return mergeSubsetOrder(full, reorderedSubset, getId).map(getId);
}
