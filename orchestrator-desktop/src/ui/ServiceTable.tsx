import { useState } from "react";
import { api } from "../api/client";
import type { ContainerDto, JdkInfo, ServiceDto } from "../api/types";
import { ContextMenu } from "./ContextMenu";
import { Icon } from "./Icons";
import { Modal } from "./Modal";
import type { ToastType } from "./Toast";
import { Tooltip } from "./Tooltip";

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

export function ServiceTable(props: {
  services: ServiceDto[];
  selected: string | null;
  onSelect: (name: string) => void;
  onAction: () => Promise<void>;
  onServicesUpdate?: (s: ServiceDto[]) => void;
  selectedContainer?: string | null;
  containers?: ContainerDto[];
  jdks?: JdkInfo[];
  onToast?: (t: ToastType, m: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const containers = props.containers ?? [];
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rmContTarget, setRmContTarget] = useState<{ svc: string; cid: string; cname: string } | null>(null);

  async function addTo(svc: string, cid: string) {
    setMenuOpen(null);
    try {
      const u = await api.addServiceToContainer(svc, cid);
      props.onServicesUpdate?.(u);
      await props.onAction();
    } catch (e) {
      props.onToast?.("error", String(e));
    }
  }

  async function confirmRemoveService() {
    if (!deleteTarget) return;
    const name = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.removeService(name);
      await props.onAction();
    } catch (e) {
      props.onToast?.("error", String(e));
    }
  }

  async function confirmRmCont() {
    if (!rmContTarget) return;
    try {
      const u = await api.removeServiceFromContainer(rmContTarget.svc, rmContTarget.cid);
      props.onServicesUpdate?.(u);
      await props.onAction();
    } catch (e) {
      props.onToast?.("error", String(e));
    }
    setRmContTarget(null);
  }

  return (
    <div className="px-2 pb-2 space-y-1 select-none">
      {props.services.map((s, idx) => (
        <ServiceRow
          key={s.name}
          s={s}
          idx={idx}
          sel={props.selected === s.name}
          busy={busy}
          containers={containers}
          jdks={props.jdks ?? []}
          menuOpen={menuOpen === s.name}
          onSelect={() => props.onSelect(s.name)}
          onMenuToggle={() => setMenuOpen(menuOpen === s.name ? null : s.name)}
          onMenuClose={() => setMenuOpen(null)}
          onDelete={() => { setMenuOpen(null); setDeleteTarget(s.name); }}
          onAdd={addTo}
          onRemove={(svc, cid) => {
            const c = containers.find((ct) => ct.id === cid);
            setMenuOpen(null);
            setRmContTarget({ svc, cid, cname: c?.name ?? "" });
          }}
          onSetJava={async (name, ver) => {
            setMenuOpen(null);
            try {
              const u = await api.setServiceJavaVersion(name, ver);
              props.onServicesUpdate?.(u);
              props.onToast?.("success", `Java ${ver ?? "padrão"} → ${name}`);
            } catch (e) {
              props.onToast?.("error", String(e));
            }
          }}
          onStart={async () => { setBusy(s.name); try { await api.start(s.name); await props.onAction(); } finally { setBusy(null); } }}
          onStop={async () => { setBusy(s.name); try { await api.stop(s.name); await props.onAction(); } finally { setBusy(null); } }}
          onRestart={async () => { setBusy(s.name); try { await api.restart(s.name); await props.onAction(); } finally { setBusy(null); } }}
        />
      ))}
      {props.services.length === 0 && (
        <div className="flex flex-col items-center py-12 animate-fade-in">
          <Icon.Box className="h-10 w-10 mb-3 text-slate-800" />
          <p className="text-xs text-slate-600">Nenhum serviço</p>
          <p className="text-2xs text-slate-700 mt-1">Importe um projeto para começar</p>
        </div>
      )}
      <Modal open={!!deleteTarget} title="Remover serviço" message={`Remover "${deleteTarget}"?\nIsso não deleta o projeto.`}
        kind="danger" confirmLabel="Remover" onConfirm={() => void confirmRemoveService()} onCancel={() => setDeleteTarget(null)} />
      <Modal open={!!rmContTarget} title="Remover do container" message={`Remover serviço de "${rmContTarget?.cname}"?`}
        kind="warning" confirmLabel="Remover" onConfirm={() => void confirmRmCont()} onCancel={() => setRmContTarget(null)} />
    </div>
  );
}

function ServiceRow(props: {
  s: ServiceDto; idx: number; sel: boolean; busy: string | null;
  containers: ContainerDto[]; jdks: JdkInfo[]; menuOpen: boolean;
  onSelect: () => void; onMenuToggle: () => void; onMenuClose: () => void;
  onDelete: () => void; onAdd: (s: string, c: string) => Promise<void>;
  onRemove: (s: string, c: string) => void;
  onSetJava: (name: string, ver: string | null) => Promise<void>;
  onStart: () => Promise<void>; onStop: () => Promise<void>; onRestart: () => Promise<void>;
}) {
  const { s, sel, containers } = props;
  const isBusy = props.busy === s.name;
  const port = s.env?.SERVER_PORT;
  const ut = s.status === "RUNNING" ? uptime(s.lastStartAt) : null;
  const isRunning = s.status === "RUNNING";
  const isError = s.status === "ERROR";

  return (
    <div
      className={`group relative animate-fade-in rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-150 ${sel ? "border-accent/25 bg-accent/[0.04] shadow-glow" : "border-transparent hover:border-white/[0.04] hover:bg-surface-2"}`}
      style={{ animationDelay: `${props.idx * 30}ms` }}
      onClick={props.onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          {isRunning && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${isRunning ? "bg-accent" : isError ? "bg-danger" : "bg-slate-600"}`} />
        </span>
        <span className={`truncate text-xs font-medium ${sel ? "text-slate-100" : "text-slate-200"}`}>{s.name}</span>
        {s.javaVersion && (
          <Tooltip text={`Java ${s.javaVersion} (projeto)`}>
            <span className="shrink-0 rounded bg-surface-3 px-1 py-px text-[9px] font-mono font-semibold text-slate-500 leading-none">J{s.javaVersion}</span>
          </Tooltip>
        )}
        <div className="ml-auto flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isRunning && <Tooltip text="Iniciar"><ActionBtn icon="Play" cls="text-accent hover:bg-accent/10" disabled={isBusy} onClick={props.onStart} /></Tooltip>}
          {isRunning && (
            <>
              <Tooltip text="Parar"><ActionBtn icon="Stop" cls="text-danger hover:bg-danger/10" disabled={isBusy} onClick={props.onStop} /></Tooltip>
              <Tooltip text="Reiniciar"><ActionBtn icon="Restart" cls="text-slate-400 hover:bg-white/5" disabled={isBusy} onClick={props.onRestart} /></Tooltip>
            </>
          )}
          <div className="relative">
            <Tooltip text="Menu"><ActionBtn icon="Dots" cls="text-slate-500 hover:bg-white/5" onClick={props.onMenuToggle} /></Tooltip>
            {props.menuOpen && (
              <ContextMenu s={s} port={port} containers={containers} jdks={props.jdks}
                onAdd={props.onAdd} onRemove={props.onRemove} onClose={props.onMenuClose}
                onDelete={props.onDelete} onSetJava={props.onSetJava} />
            )}
          </div>
        </div>
      </div>
      {(port || ut || s.pid || (s.containerIds && s.containerIds.length > 0)) && (
        <div className="mt-1.5 ml-4 flex items-center gap-2 flex-wrap">
          {port && <span className="text-2xs text-accent/70 font-mono cursor-pointer hover:text-accent transition-colors"
            onClick={(e) => { e.stopPropagation(); window.open(`http://localhost:${port}`, "_blank"); }}>PORT:{port}</span>}
          {port && s.pid && <span className="text-2xs text-slate-600 select-none">|</span>}
          {s.pid && <span className="text-2xs text-slate-500 font-mono">PID {s.pid}</span>}
          {ut && <span className="text-2xs text-accent/40 font-mono tabular-nums">{ut}</span>}
          {s.containerIds?.map((cid) => {
            const c = containers.find((ct) => ct.id === cid);
            return c ? <span key={cid} className="badge bg-accent/8 text-accent/70">{c.name}</span> : null;
          })}
        </div>
      )}
      {isError && s.lastError && <p className="mt-1 ml-4 text-2xs text-danger/80 truncate">{s.lastError}</p>}
    </div>
  );
}

function ActionBtn(props: { icon: keyof typeof Icon; cls: string; disabled?: boolean; onClick: () => void | Promise<void> }) {
  const Ic = Icon[props.icon];
  return (
    <button className={`rounded-md p-1 transition-all duration-100 disabled:opacity-30 ${props.cls}`} disabled={props.disabled}
      onClick={(e) => { e.stopPropagation(); void props.onClick(); }}>
      <Ic className="h-3 w-3" />
    </button>
  );
}
