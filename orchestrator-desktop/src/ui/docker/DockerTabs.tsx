import type { DockerDiskUsageDto } from "../../api/types";
import { Icon } from "../Icons";

export type DockerTab = "containers" | "images" | "volumes";

const TABS: { id: DockerTab; label: string; icon: "Docker" | "Layers" | "Database"; usageType: string }[] = [
  { id: "containers", label: "Containers", icon: "Docker", usageType: "Containers" },
  { id: "images", label: "Imagens", icon: "Layers", usageType: "Images" },
  { id: "volumes", label: "Volumes", icon: "Database", usageType: "Local Volumes" },
];

export function DockerTabs(props: {
  active: DockerTab;
  counts: Record<DockerTab, number>;
  selectedCounts: Record<DockerTab, number>;
  diskUsage: DockerDiskUsageDto[];
  onSelect: (tab: DockerTab) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.06] px-3">
      {TABS.map((tab) => {
        const active = props.active === tab.id;
        const Ic = Icon[tab.icon];
        const selected = props.selectedCounts[tab.id];
        const usage = props.diskUsage.find((entry) => entry.type === tab.usageType);
        return (
          <button
            key={tab.id}
            onClick={() => props.onSelect(tab.id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-2xs font-medium transition-colors ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Ic className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            <span className={`badge ${active ? "bg-accent/10 text-accent" : "bg-surface-3 text-slate-500"}`}>
              {props.counts[tab.id]}
            </span>
            {selected > 0 && (
              <span className="badge bg-accent/20 text-accent" title="Selecionados nesta aba">
                {selected} sel.
              </span>
            )}
            {usage && usage.size !== "0B" && (
              <span className="hidden font-mono text-[10px] text-slate-600 lg:inline">{usage.size}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
