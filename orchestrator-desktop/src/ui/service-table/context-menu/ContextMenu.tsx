import { useRef, useState, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../../../api/client";
import type { ContainerDto, JdkInfo, PhpInfo, ServiceDto } from "../../../api/types";
import { ServiceBulkActions, ServiceBulkRemoveAction } from "../service-bulk-actions/ServiceBulkActions";
import { formatScriptLabel, getScriptMenuLabel, isPhpProject } from "../service-meta/serviceMeta";
import { Icon } from "../../icons/Icons";
import { canChangeServicePort } from "../service-meta/serviceMeta";
import { clampTop, MenuItem, SubMenu } from "../../components/context-menu-items/ContextMenuItems";
import type { ToastType } from "../../toast/Toast";

async function runServiceTool(
  onClose: () => void,
  onToast: ((type: ToastType, message: string) => void) | undefined,
  action: () => Promise<unknown>,
  fallback: string,
) {
  onClose();

  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : fallback;
    onToast?.("error", message);
  }
}

export function ContextMenu(props: {
  s: ServiceDto;
  port?: string;
  containers: ContainerDto[];
  jdks: JdkInfo[];
  phps: PhpInfo[];
  onAdd: (s: string, c: string) => Promise<void>;
  onRemove: (s: string, c: string) => void;
  onClose: () => void;
  onDelete: () => void;
  bulkSelected: boolean;
  bulkCount: number;
  onBulkToggle: () => void;
  onBulkRemove: () => void;
  onBulkAddToContainer: (containerId: string) => Promise<void>;
  onBulkRemoveFromContainer: (containerId: string) => Promise<void>;
  onSetJava: (name: string, ver: string | null) => Promise<void>;
  onSetPhp: (name: string, ver: string | null) => Promise<void>;
  onSetScript: (name: string, script: string) => Promise<void>;
  onSetPhpCommand: (service: ServiceDto) => void;
  onSetPort: (name: string, currentPort?: string) => void;
  onSetMvnWrapper: (name: string, enabled: boolean) => Promise<void>;
  onToast?: (type: ToastType, message: string) => void;
}) {
  const { s } = props;
  const uniqueVersions = [...new Set(props.jdks.map((j) => j.majorVersion))];
  const uniquePhpVersions = [...new Set(props.phps.map((p) => p.version))];
  const isPhp = isPhpProject(s.projectType);
  const isJs = s.projectType && s.projectType !== "SPRING_BOOT" && !isPhp;
  const isConfigurable = isJs || isPhp;
  const isJava = !s.projectType || s.projectType === "SPRING_BOOT";
  const canChangePort = canChangeServicePort(s);
  const usingMvnWrapper = !!s.useMvnWrapper;
  const hasMvnWrapper = !!s.hasMvnWrapper;
  const scripts = s.availableScripts ?? [];
  const activeScript = s.selectedScript ?? null;
  const [openSub, setOpenSub] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const adjusted = useRef(false);

  useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    adjusted.current = false;
    setPos({ top: r.bottom + 4, left: Math.max(0, r.right - 224) });
  }, []);

  useLayoutEffect(() => {
    if (!menuRef.current || !pos || adjusted.current) return;
    const h = menuRef.current.getBoundingClientRect().height;
    const clamped = clampTop(pos.top, h);
    if (clamped !== pos.top) {
      adjusted.current = true;
      setPos((p) => p ? { ...p, top: clamped } : p);
    }
  }, [pos]);

  const scheduleClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSub(null), 150);
  }, []);

  const cancelClose = useCallback((key: string) => {
    clearTimeout(closeTimer.current);
    setOpenSub(key);
  }, []);

  const menu = (
    <>
      <div className="fixed inset-0 z-[200]" onClick={props.onClose} />
      <div
        ref={menuRef}
        className="fixed z-[201] w-56 animate-scale-in rounded-lg border border-white/[0.08] bg-surface-2 shadow-elevated backdrop-blur-xl"
        style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" as const }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-1">
          <MenuItem icon="Folder" label="Abrir pasta" onClick={() => void runServiceTool(props.onClose, props.onToast, () => api.openServiceFolder(s.name), "Não foi possível abrir a pasta")} />
          <MenuItem icon="Terminal" label="Abrir terminal" onClick={() => void runServiceTool(props.onClose, props.onToast, () => api.openServiceTerminal(s.name), "Não foi possível abrir o terminal")} />
          <MenuItem icon="Code" label="Abrir no editor" onClick={() => void runServiceTool(props.onClose, props.onToast, () => api.openServiceInEditor(s.name), "Não foi possível abrir o editor")} />
          <MenuItem icon="File" label="Abrir arquivo da porta" onClick={() => void runServiceTool(props.onClose, props.onToast, () => api.openServicePortFile(s.name), "Não foi possível abrir o arquivo da porta")} />
          {props.port && <MenuItem icon="Globe" label={`localhost:${props.port}`} onClick={() => void runServiceTool(props.onClose, props.onToast, () => openUrl(`http://localhost:${props.port}`), "Não foi possível abrir o endereço")} />}

          {uniqueVersions.length > 0 && (!s.projectType || s.projectType === "SPRING_BOOT") && (
            <>
              <div className="divider my-1" />
              <SubMenu label="Java Version" icon="Code" isOpen={openSub === "java"}
                menuRef={menuRef} onEnter={() => cancelClose("java")} onLeave={scheduleClose}>
                {uniqueVersions.map((v) => {
                  const isActive = s.javaVersion === v;
                  const jdk = props.jdks.find((j) => j.majorVersion === v);
                  return (
                    <button key={v} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${isActive ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-surface-3 hover:text-slate-200"}`}
                      onClick={() => void props.onSetJava(s.name, v)}>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-2xs">J{v}</span>
                        <span className="text-2xs text-slate-600 truncate">{jdk?.vendor}</span>
                      </span>
                      {isActive && <Icon.Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
                <button className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${!s.javaVersion ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-surface-3 hover:text-slate-200"}`}
                  onClick={() => void props.onSetJava(s.name, null)}>
                  <span className="text-2xs">Padrão (JAVA_HOME)</span>
                  {!s.javaVersion && <Icon.Check className="h-3 w-3 shrink-0" />}
                </button>
              </SubMenu>
            </>
          )}

          {uniquePhpVersions.length > 0 && isPhp && (
            <>
              <div className="divider my-1" />
              <SubMenu label="Versão PHP" icon="Code" isOpen={openSub === "php"}
                menuRef={menuRef} onEnter={() => cancelClose("php")} onLeave={scheduleClose}>
                {uniquePhpVersions.map((v) => {
                  const isActive = s.phpVersion === v;
                  const runtime = props.phps.find((p) => p.version === v);
                  return (
                    <button key={v} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${isActive ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-surface-3 hover:text-slate-200"}`}
                      onClick={() => void props.onSetPhp(s.name, v)}>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-2xs">P{v}</span>
                        <span className="text-2xs text-slate-600 truncate">{runtime?.source}</span>
                      </span>
                      {isActive && <Icon.Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
                <button className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${!s.phpVersion ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-surface-3 hover:text-slate-200"}`}
                  onClick={() => void props.onSetPhp(s.name, null)}>
                  <span className="text-2xs">Padrão (PATH)</span>
                  {!s.phpVersion && <Icon.Check className="h-3 w-3 shrink-0" />}
                </button>
              </SubMenu>
            </>
          )}

          {isConfigurable && scripts.length > 1 && (
            <>
              <div className="divider my-1" />
              <SubMenu label={getScriptMenuLabel(s.projectType)} icon="Terminal" isOpen={openSub === "script"}
                menuRef={menuRef} onEnter={() => cancelClose("script")} onLeave={scheduleClose}>
                {scripts.map((sc) => {
                  const isActive = activeScript === sc;
                  return (
                    <button key={sc} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${isActive ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-surface-3 hover:text-slate-200"}`}
                      onClick={() => void props.onSetScript(s.name, sc)}>
                      <span className="font-mono text-2xs">{formatScriptLabel(sc, s.projectType)}</span>
                      {isActive && <Icon.Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </SubMenu>
            </>
          )}
          {isPhp && (
            <MenuItem
              icon="Terminal"
              label="Comando PHP manual"
              onClick={() => {
                props.onSetPhpCommand(s);
                props.onClose();
              }}
            />
          )}
          {isConfigurable && canChangePort && (
            <MenuItem
              icon="Globe"
              label="Alterar porta"
              onClick={async () => {
                props.onSetPort(s.name, props.port ?? s.env?.PORT);
                props.onClose();
              }}
            />
          )}

          {isJava && hasMvnWrapper && (
            <>
              <div className="divider my-1" />
              <MenuItem
                icon={usingMvnWrapper ? "X" : "Check"}
                label={usingMvnWrapper ? "Não usar wrapper Maven" : "Usar wrapper Maven (mvnw)"}
                onClick={async () => {
                  await props.onSetMvnWrapper(s.name, !usingMvnWrapper);
                  props.onClose();
                }}
              />
            </>
          )}

          {props.containers.length > 0 && (
            <>
              <div className="divider my-1" />
              <SubMenu label="Containers" icon="Box" isOpen={openSub === "containers"}
                menuRef={menuRef} onEnter={() => cancelClose("containers")} onLeave={scheduleClose}>
                {props.containers.map((c) => {
                  const inC = s.containerIds?.includes(c.id);
                  return (
                    <button key={c.id} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${inC ? "bg-accent/10 text-accent" : "text-slate-400 hover:bg-surface-3 hover:text-slate-200"}`}
                      onClick={(e) => { e.stopPropagation(); if (inC) { props.onRemove(s.name, c.id); } else { void props.onAdd(s.name, c.id); } }}>
                      <span className="truncate mr-2">{c.name}</span>
                      {inC && <Icon.Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </SubMenu>
            </>
          )}
          {props.bulkCount > 1 && props.containers.length > 0 && (
            <>
              <div className="divider my-1" />
              <SubMenu label="Mover selecionados" icon="Box" isOpen={openSub === "bulk-add"}
                menuRef={menuRef} onEnter={() => cancelClose("bulk-add")} onLeave={scheduleClose}>
                {props.containers.map((c) => (
                  <button key={c.id} className="flex w-full items-center rounded px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-surface-3 hover:text-slate-200"
                    onClick={() => { void props.onBulkAddToContainer(c.id); props.onClose(); }}>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </SubMenu>
              <SubMenu label="Remover selecionados de" icon="Box" isOpen={openSub === "bulk-remove-container"}
                menuRef={menuRef} onEnter={() => cancelClose("bulk-remove-container")} onLeave={scheduleClose}>
                {props.containers.map((c) => (
                  <button key={c.id} className="flex w-full items-center rounded px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-surface-3 hover:text-slate-200"
                    onClick={() => { void props.onBulkRemoveFromContainer(c.id); props.onClose(); }}>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </SubMenu>
            </>
          )}

          <div className="divider my-1" />
          <ServiceBulkActions
            selected={props.bulkSelected}
            onToggle={props.onBulkToggle}
            onClose={props.onClose}
          />
          <MenuItem icon="Trash" label="Remover serviço" cls="text-danger/70 hover:text-danger hover:bg-danger/10" onClick={props.onDelete} />
          <ServiceBulkRemoveAction
            count={props.bulkCount}
            onRemoveMany={props.onBulkRemove}
            onClose={props.onClose}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      <div ref={anchorRef} className="absolute right-0 top-full" />
      {createPortal(menu, document.body)}
    </>
  );
}
