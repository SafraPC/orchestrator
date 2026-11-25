import { useState } from "react";
import { api } from "../../api/client";
import { Icon } from "../icons/Icons";
import type { ToastType } from "../toast/Toast";
import { Tooltip } from "../tooltip/Tooltip";

export function ImportSection(props: {
  onImported: () => Promise<void>;
  onRefreshPorts: () => Promise<void>;
  containerId: string | null;
  addToast: (type: ToastType, msg: string) => void;
}) {
  const [rootInput, setRootInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      let paths: string[] = [];
      if (!rootInput.trim()) {
        const picked = await api.selectFolder();
        if (picked?.trim()) {
          paths = picked.trim().split("|").filter(Boolean);
          setRootInput(paths.length === 1 ? paths[0] : `${paths.length} pastas`);
        } else {
          props.addToast("error", "Nenhuma pasta selecionada.");
          setImporting(false);
          return;
        }
      } else {
        paths = [rootInput.trim()];
      }
      const before = await api.listServices();
      const beforeNames = new Set(before.map((s) => s.name));
      const result = await api.importRootsAndScan(paths);
      const all = Array.isArray(result) ? result : [];
      const added = all.filter((s) => !beforeNames.has(s.name));
      if (added.length > 0) {
        const names = added.map((s) => s.name).join(", ");
        props.addToast("success", `${added.length} novo(s): ${names}`);
        setRootInput("");
        await props.onImported();
      } else if (all.length > 0) {
        props.addToast("info", "Nenhum serviço novo encontrado.");
        setRootInput("");
        await props.onImported();
      } else {
        props.addToast("error", "Nenhum serviço encontrado.");
        await props.onImported();
      }
    } catch (e) {
      props.addToast("error", e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setImporting(false);
    }
  }

  async function handleRefreshPorts() {
    setRefreshing(true);

    try {
      await props.onRefreshPorts();
      props.addToast(
        "success",
        props.containerId ? "Portas do container relidas" : "Portas relidas dos projetos",
      );
    } catch (error) {
      props.addToast("error", error instanceof Error ? error.message : "Erro ao reler portas");
    } finally {
      setRefreshing(false);
    }
  }

  const refreshLabel = props.containerId ? "Reler portas deste container" : "Reler portas de todos os projetos";

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1 min-w-0">
        <Icon.Folder className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" />
        <input
          value={rootInput}
          onChange={(e) => setRootInput(e.target.value)}
          placeholder="Caminho ou selecione..."
          className="input pl-7 pr-2 py-1.5 text-2xs"
          disabled={importing || refreshing}
          onKeyDown={(e) => e.key === "Enter" && void handleImport()}
        />
      </div>
      <button className="btn btn-primary py-1.5 text-2xs" disabled={importing || refreshing} onClick={() => void handleImport()}>
        {importing ? <span className="animate-spin-slow inline-block">⟳</span> : <Icon.Import className="h-3 w-3" />}
      </button>
      <Tooltip text={refreshLabel}>
        <button
          className="btn btn-ghost py-1.5 text-2xs"
          disabled={importing || refreshing}
          aria-label={refreshLabel}
          onClick={() => void handleRefreshPorts()}
        >
          <Icon.Refresh className={`h-3 w-3 ${refreshing ? "animate-spin-slow" : ""}`} />
        </button>
      </Tooltip>
    </div>
  );
}
