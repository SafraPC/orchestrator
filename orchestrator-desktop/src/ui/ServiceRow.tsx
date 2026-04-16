import { openUrl } from "@tauri-apps/plugin-opener";
import type { ContainerDto, JdkInfo, ProjectType, ServiceDto } from "../api/types";
import { ContextMenu } from "./ContextMenu";
import { Icon } from "./Icons";
import { Tooltip } from "./Tooltip";
import { formatBranchLabel, getServicePort } from "./serviceMeta";

const TECH_BADGE: Record<string, { icon: keyof typeof Icon; color: string; label: string }> = {
  SPRING_BOOT: { icon: "Java", color: "text-orange-400", label: "Java" },
  NEXT: { icon: "Next", color: "text-white", label: "Next" },
  NEST: { icon: "Nest", color: "text-red-400", label: "Nest" },
  REACT: { icon: "ReactIcon", color: "text-cyan-400", label: "React" },
  VUE: { icon: "Vue", color: "text-emerald-400", label: "Vue" },
};

function uptime(at: string | null | undefined): string | null {
  if (!at) return null;
  const d = Date.now() - new Date(at).getTime();
  if (d < 0) return null;
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${m % 60}m`;
}

export function ServiceRow(props: {
  s: ServiceDto;
  sel: boolean;
  busy: string | null;
  containers: ContainerDto[];
  jdks: JdkInfo[];
  menuOpen: boolean;
  isDragging: boolean;
  gripProps: { onMouseDown: (e: React.MouseEvent) => void };
  onSelect: () => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onDelete: () => void;
  onAdd: (s: string, c: string) => Promise<void>;
  onRemove: (s: string, c: string) => void;
  onSetJava: (name: string, ver: string | null) => Promise<void>;
  onSetScript: (name: string, script: string) => Promise<void>;
  onSetPort: (service: ServiceDto) => void;
  onResetPort: (name: string) => Promise<void>;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRestart: () => Promise<void>;
}) {
  const { s, sel, containers } = props;
  const isBusy = props.busy === s.name;
  const port = getServicePort(s);
  const containerLabel = (s.containerIds ?? [])
    .map((cid) => containers.find((ct) => ct.id === cid)?.name)
    .filter((name): name is string => !!name)
    .join(", ");
  const ut = s.status === "RUNNING" ? uptime(s.lastStartAt) : null;
  const isRunning = s.status === "RUNNING";
  const isError = s.status === "ERROR";

  return (
    <div
      data-drag-item
      className={`group relative rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-200 ${sel ? "border-accent/25 bg-accent/[0.06] shadow-glow" : "border-white/[0.06] bg-surface-1 hover:border-white/[0.10] hover:bg-surface-2"} ${props.isDragging ? "opacity-40 scale-[0.98] shadow-lg shadow-accent/10 border-accent/30 bg-accent/[0.06]" : ""}`}
      onClick={props.onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        props.onSelect();
        props.onMenuToggle();
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 cursor-grab active:cursor-grabbing text-slate-600 opacity-40 group-hover:opacity-100 group-hover:text-slate-400 transition-all"
          {...props.gripProps}
        >
          <Icon.Grip className="h-3.5 w-3.5" />
        </span>
        <span className="relative flex h-2 w-2 shrink-0">
          {isRunning && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${isRunning ? "bg-accent" : isError ? "bg-danger" : "bg-slate-600"}`}
          />
        </span>
        <span className={`truncate text-xs font-medium ${sel ? "text-slate-100" : "text-slate-200"}`}>{s.name}</span>
        <TechBadge projectType={s.projectType} javaVersion={s.javaVersion} />
        <div className="ml-auto flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isRunning && (
            <Tooltip text="Iniciar">
              <ActionBtn icon="Play" cls="text-accent hover:bg-accent/10" disabled={isBusy} onClick={props.onStart} />
            </Tooltip>
          )}
          {isRunning && (
            <>
              <Tooltip text="Parar">
                <ActionBtn icon="Stop" cls="text-danger hover:bg-danger/10" disabled={isBusy} onClick={props.onStop} />
              </Tooltip>
              <Tooltip text="Reiniciar">
                <ActionBtn
                  icon="Restart"
                  cls="text-slate-400 hover:bg-white/5"
                  disabled={isBusy}
                  onClick={props.onRestart}
                />
              </Tooltip>
            </>
          )}
          <div className="relative">
            <Tooltip text="Menu">
              <ActionBtn icon="Dots" cls="text-slate-500 hover:bg-white/5" onClick={props.onMenuToggle} />
            </Tooltip>
            {props.menuOpen && (
              <ContextMenu
                s={s}
                port={port ?? undefined}
                containers={containers}
                jdks={props.jdks}
                onAdd={props.onAdd}
                onRemove={props.onRemove}
                onClose={props.onMenuClose}
                onDelete={props.onDelete}
                onSetJava={props.onSetJava}
                onSetScript={props.onSetScript}
                onSetPort={() => props.onSetPort(s)}
              />
            )}
          </div>
        </div>
      </div>
      {(port || ut || s.pid || s.currentBranch || (s.containerIds && s.containerIds.length > 0)) && (
        <div className="mt-1.5 ml-4 space-y-1">
          {(port || ut || s.pid) && (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {port && (
                <>
                  <span
                    className="text-2xs text-accent/70 font-mono cursor-pointer hover:text-accent transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openUrl(`http://127.0.0.1:${port}`).catch(() => {});
                    }}
                  >
                    PORT:{port}
                  </span>
                  {s.customPort && (
                    <Tooltip text="Reverter porta">
                      <button
                        className="rounded p-0.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          void props.onResetPort(s.name);
                        }}
                      >
                        <Icon.Undo className="h-3 w-3" />
                      </button>
                    </Tooltip>
                  )}
                </>
              )}
              {port && (s.pid || ut) && <span className="text-2xs text-slate-600 select-none">|</span>}
              {s.pid && <span className="text-2xs text-slate-500 font-mono">PID {s.pid}</span>}
              {ut && <span className="text-2xs text-accent/40 font-mono tabular-nums">{ut}</span>}
            </div>
          )}
          {(s.currentBranch || containerLabel) && (
            <div
              className={`grid min-w-0 items-center gap-x-2 ${s.currentBranch && containerLabel ? "grid-cols-[minmax(0,40%)_auto_minmax(0,40%)]" : s.currentBranch ? "grid-cols-[minmax(0,40%)]" : "grid-cols-[minmax(0,100%)]"}`}
            >
              {s.currentBranch && (
                <Tooltip text={s.currentBranch}>
                  <span className="inline-flex min-w-0 w-full items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-2xs text-slate-400">
                    <Icon.Branch className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono">{formatBranchLabel(s.currentBranch)}</span>
                  </span>
                </Tooltip>
              )}
              {s.currentBranch && containerLabel && <span className="text-2xs text-slate-600 select-none">|</span>}
              {containerLabel && <span className="min-w-0 w-full truncate text-2xs text-accent/70">{containerLabel}</span>}
            </div>
          )}
        </div>
      )}
      {isError && s.lastError && <p className="mt-1 ml-4 text-2xs text-danger/80 truncate">{s.lastError}</p>}
    </div>
  );
}

function ActionBtn(props: {
  icon: keyof typeof Icon;
  cls: string;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  const Ic = Icon[props.icon];
  return (
    <button
      className={`rounded-md p-1 transition-all duration-100 disabled:opacity-30 ${props.cls}`}
      disabled={props.disabled}
      onClick={(e) => {
        e.stopPropagation();
        void props.onClick();
      }}
    >
      <Ic className="h-3 w-3" />
    </button>
  );
}

function TechBadge(props: { projectType?: ProjectType; javaVersion?: string | null }) {
  const type = props.projectType ?? "SPRING_BOOT";
  const badge = TECH_BADGE[type];
  if (!badge) return null;
  const Ic = Icon[badge.icon];
  const label = type === "SPRING_BOOT" && props.javaVersion ? `J${props.javaVersion}` : badge.label;
  return (
    <Tooltip text={badge.label}>
      <span
        className={`shrink-0 inline-flex items-center gap-0.5 rounded bg-surface-3 px-1 py-px text-[9px] font-mono font-semibold leading-none ${badge.color}`}
      >
        <Ic className="h-3.5 w-3.5" />
        {label}
      </span>
    </Tooltip>
  );
}
