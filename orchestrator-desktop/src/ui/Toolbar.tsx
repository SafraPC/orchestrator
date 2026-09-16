import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { Tooltip } from "./Tooltip";

export type AppSection = "services" | "docker";

const SECTIONS: { id: AppSection; label: string; icon: "Box" | "Docker"; hint: string }[] = [
  { id: "services", label: "Serviços", icon: "Box", hint: "Projetos e containers de aplicação" },
  { id: "docker", label: "Docker", icon: "Docker", hint: "Containers, imagens e volumes do Docker" },
];

export function Toolbar(props: {
  onSettings: () => void;
  onKillPort: () => void;
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
}) {
  const version = useAppVersion();
  return (
    <header
      className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#ff7a0026] bg-[#04070d]/95 backdrop-blur-md shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div
        className="flex items-center gap-3"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/lemain-icon.png"
            alt="Orchestrator"
            className="h-7 w-7 rounded-xl border border-[#ff7a0045] shadow-[0_0_18px_rgba(255,122,0,0.2)] object-cover"
          />
          <span className="text-xs font-semibold text-slate-200 tracking-tight">Orchestrator</span>
          {version && (
            <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 rounded border border-white/[0.06] bg-surface-2/60">
              v{version}
            </span>
          )}
        </div>
        <div className="h-5 w-px bg-white/[0.06]" />
        <nav className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-surface-1/70 p-0.5">
          {SECTIONS.map((section) => {
            const active = props.section === section.id;
            const Ic = Icon[section.icon];
            return (
              <Tooltip key={section.id} text={section.hint}>
                <button
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-2xs font-medium transition-all duration-150 ${
                    active
                      ? "bg-accent/15 text-accent shadow-glow"
                      : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                  }`}
                  onClick={() => props.onSectionChange(section.id)}
                  aria-current={active ? "page" : undefined}
                >
                  <Ic className="h-3.5 w-3.5" />
                  <span>{section.label}</span>
                </button>
              </Tooltip>
            );
          })}
        </nav>
        <div className="h-5 w-px bg-white/[0.06]" />
        <div className="flex items-center gap-1">
          <Tooltip text="Configurações (⌘ ,)">
            <button
              className="btn btn-ghost text-2xs gap-1.5 px-2 py-1"
              onClick={props.onSettings}
              aria-label="Configurações"
            >
              <Icon.Settings className="h-3.5 w-3.5" />
              <span>Configurações</span>
            </button>
          </Tooltip>
          <Tooltip text="Encerra processo escutando uma porta">
            <button
              className="btn btn-ghost text-2xs gap-1.5 px-2 py-1"
              onClick={props.onKillPort}
              aria-label="Derrubar porta"
            >
              <Icon.Plug className="h-3.5 w-3.5 text-danger" />
              <span>Derrubar porta</span>
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import("@tauri-apps/api/app");
        const v = await mod.getVersion();
        if (!cancelled) setVersion(v);
      } catch {
        if (!cancelled) setVersion(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
