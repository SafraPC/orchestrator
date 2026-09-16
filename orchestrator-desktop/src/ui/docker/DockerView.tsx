import { useCallback, useEffect, useMemo, useState } from "react";
import type { DockerPruneScope, DockerResourceTarget } from "../../api/types";
import { Dropdown } from "../Dropdown";
import { Icon } from "../Icons";
import { Modal } from "../Modal";
import { Tooltip } from "../Tooltip";
import type { ToastType } from "../Toast";
import { DockerContainersTable } from "./DockerContainersTable";
import { DockerEngineBar } from "./DockerEngineBar";
import { DockerEngineOffline } from "./DockerEngineOffline";
import { DockerImagesTable } from "./DockerImagesTable";
import { DockerPruneModal } from "./DockerPruneModal";
import { DockerSelectionBar } from "./DockerSelectionBar";
import { DockerStartCommandModal } from "./DockerStartCommandModal";
import { DockerTabs } from "./DockerTabs";
import type { DockerTab } from "./DockerTabs";
import { DockerVolumesTable } from "./DockerVolumesTable";
import { imageReference } from "./dockerFormat";
import { countByKind, selectionKey, setKeys, toTargets, toggleKey } from "./dockerSelection";
import { CONTAINER_SORT_OPTIONS, sortContainers } from "./dockerSort";
import type { DockerContainerSort } from "./dockerSort";
import { useDockerActions } from "./useDockerActions";
import { useDockerData } from "./useDockerData";

export function DockerView(props: {
  active: boolean;
  onToast: (type: ToastType, message: string) => void;
}) {
  const [tab, setTab] = useState<DockerTab>("containers");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<DockerContainerSort>("state");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [pruneOpen, setPruneOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{ targets: DockerResourceTarget[]; label: string } | null>(null);

  const docker = useDockerData(props.active);
  const actions = useDockerActions({
    onToast: props.onToast,
    refreshInventory: docker.refreshInventory,
    refreshStatus: docker.refreshStatus,
  });

  const { containers, images, volumes } = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matches = (...values: (string | null | undefined)[]) =>
      !needle || values.some((value) => (value ?? "").toLowerCase().includes(needle));
    return {
      containers: sortContainers(
        docker.inventory.containers.filter((c) => matches(c.name, c.image, c.id, c.project, c.service, c.status)),
        sort,
      ),
      images: docker.inventory.images.filter((i) => matches(i.repository, i.tag, i.id)),
      volumes: docker.inventory.volumes.filter((v) => matches(v.name, v.driver, v.mountpoint)),
    };
  }, [docker.inventory, filter, sort]);

  const counts = useMemo(
    () => ({ containers: containers.length, images: images.length, volumes: volumes.length }),
    [containers.length, images.length, volumes.length],
  );

  const selectedCounts = useMemo(() => {
    const byKind = countByKind(selection);
    return { containers: byKind.CONTAINER, images: byKind.IMAGE, volumes: byKind.VOLUME };
  }, [selection]);

  useEffect(() => {
    const existing = new Set<string>([
      ...docker.inventory.containers.map((c) => selectionKey("CONTAINER", c.id)),
      ...docker.inventory.images.map((i) => selectionKey("IMAGE", i.id)),
      ...docker.inventory.volumes.map((v) => selectionKey("VOLUME", v.name)),
    ]);
    setSelection((prev) => {
      const kept = [...prev].filter((key) => existing.has(key));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [docker.inventory]);

  const toggle = useCallback((key: string) => setSelection((prev) => toggleKey(prev, key)), []);
  const toggleAll = useCallback(
    (keys: string[], selected: boolean) => setSelection((prev) => setKeys(prev, keys, selected)),
    [],
  );
  const clearSelection = useCallback(() => setSelection(new Set()), []);

  const requestRemoval = useCallback((targets: DockerResourceTarget[], label: string) => {
    if (targets.length > 0) setPendingRemoval({ targets, label });
  }, []);

  const confirmRemoval = useCallback(async () => {
    const pending = pendingRemoval;
    setPendingRemoval(null);
    if (pending) await actions.removeTargets(pending.targets);
  }, [actions, pendingRemoval]);

  const handlePrune = useCallback(
    async (scopes: DockerPruneScope[], removeUnusedImages: boolean) => {
      setPruneOpen(false);
      await actions.prune(scopes, removeUnusedImages);
      clearSelection();
    },
    [actions, clearSelection],
  );

  const handleCommandConfirm = useCallback(
    async (command: string, startNow: boolean) => {
      setCommandOpen(false);
      const saved = await actions.saveStartCommand(command);
      if (saved && startNow) await actions.startEngine(command);
    },
    [actions],
  );

  const handleStartEngine = useCallback(async () => {
    const status = docker.status;
    if (status && (status.startCommandRequired || !status.startCommand)) {
      setCommandOpen(true);
      return;
    }
    await actions.startEngine();
  }, [actions, docker.status]);

  const engineRunning = docker.status?.engineRunning ?? false;
  const selectionTotal = selection.size;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DockerEngineBar
        status={docker.status}
        loading={docker.loading}
        onRefresh={() => void docker.refreshAll()}
        onStart={() => void handleStartEngine()}
        onConfigure={() => setCommandOpen(true)}
        onPrune={() => setPruneOpen(true)}
      />

      {!engineRunning ? (
        <DockerEngineOffline
          status={docker.status}
          engineLog={docker.engineLog}
          onStart={() => void handleStartEngine()}
          onConfigure={() => setCommandOpen(true)}
        />
      ) : (
        <>
          <DockerTabs
            active={tab}
            counts={counts}
            selectedCounts={selectedCounts}
            diskUsage={docker.inventory.diskUsage}
            onSelect={setTab}
          />
          <div className="flex shrink-0 items-center gap-2 px-3 py-2">
            <div className="relative w-72 max-w-full">
              <Icon.Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                value={filter}
                placeholder="Filtrar por nome, imagem, projeto..."
                onChange={(e) => setFilter(e.target.value)}
                className="input pl-7 text-2xs"
              />
            </div>
            {tab === "containers" && (
              <Tooltip text="Ordenar containers por">
                <span className="flex items-center gap-1.5">
                  <Icon.Sort className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  <Dropdown value={sort} options={CONTAINER_SORT_OPTIONS} onChange={setSort} align="left" className="w-32" />
                </span>
              </Tooltip>
            )}
            {docker.error && (
              <span className="truncate text-2xs text-danger" title={docker.error}>
                {docker.error}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {tab === "containers" && (
              <DockerContainersTable
                containers={containers}
                selection={selection}
                busyIds={actions.busyIds}
                onToggle={toggle}
                onToggleAll={toggleAll}
                onStart={(c) => void actions.lifecycle("start", c)}
                onStop={(c) => void actions.lifecycle("stop", c)}
                onRestart={(c) => void actions.lifecycle("restart", c)}
                onRemove={(c) => requestRemoval([{ kind: "CONTAINER", id: c.id }], `o container "${c.name}"`)}
              />
            )}
            {tab === "images" && (
              <DockerImagesTable
                images={images}
                selection={selection}
                onToggle={toggle}
                onToggleAll={toggleAll}
                onRemove={(image) =>
                  requestRemoval(
                    [{ kind: "IMAGE", id: image.id }],
                    `a imagem "${imageReference(image.repository, image.tag, image.id)}"`,
                  )
                }
              />
            )}
            {tab === "volumes" && (
              <DockerVolumesTable
                volumes={volumes}
                selection={selection}
                onToggle={toggle}
                onToggleAll={toggleAll}
                onRemove={(volume) => requestRemoval([{ kind: "VOLUME", id: volume.name }], `o volume "${volume.name}"`)}
              />
            )}
          </div>

          <DockerSelectionBar
            counts={countByKind(selection)}
            total={selectionTotal}
            busy={actions.mutating}
            onClear={clearSelection}
            onRemove={() => requestRemoval(toTargets(selection), `${selectionTotal} recurso(s) selecionado(s)`)}
          />
        </>
      )}

      <Modal
        open={!!pendingRemoval}
        title="Remover recursos do Docker"
        message={`Remover ${pendingRemoval?.label ?? ""}?\nEsta ação não pode ser desfeita.`}
        kind="danger"
        confirmLabel="Remover"
        onConfirm={() => void confirmRemoval()}
        onCancel={() => setPendingRemoval(null)}
      />
      <DockerPruneModal
        open={pruneOpen}
        busy={actions.mutating}
        diskUsage={docker.inventory.diskUsage}
        onClose={() => setPruneOpen(false)}
        onConfirm={(scopes, all) => void handlePrune(scopes, all)}
      />
      <DockerStartCommandModal
        open={commandOpen}
        status={docker.status}
        saving={actions.mutating}
        onClose={() => setCommandOpen(false)}
        onConfirm={(command, startNow) => void handleCommandConfirm(command, startNow)}
      />
    </div>
  );
}
