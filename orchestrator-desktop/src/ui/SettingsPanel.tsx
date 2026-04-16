import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Icon } from "./Icons";

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18] as const;
const ZOOM_LEVELS = [80, 90, 100, 110, 120, 130] as const;
const STORAGE_KEY = "orchestrator-settings";

export type Settings = {
  fontSize: number;
  zoom: number;
  logLineWrap: boolean;
};

const DEFAULTS: Settings = { fontSize: 12, zoom: 100, logLineWrap: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    save(settings);
    document.documentElement.style.fontSize = `${settings.zoom}%`;
  }, [settings]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setSettings((p) => {
          const idx = ZOOM_LEVELS.indexOf(p.zoom as (typeof ZOOM_LEVELS)[number]);
          const next = idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : p.zoom;
          return { ...p, zoom: next ?? p.zoom };
        });
      }
      if (e.key === "-") {
        e.preventDefault();
        setSettings((p) => {
          const idx = ZOOM_LEVELS.indexOf(p.zoom as (typeof ZOOM_LEVELS)[number]);
          const next = idx > 0 ? ZOOM_LEVELS[idx - 1] : p.zoom;
          return { ...p, zoom: next ?? p.zoom };
        });
      }
      if (e.key === "0") {
        e.preventDefault();
        setSettings((p) => ({ ...p, zoom: 100 }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { settings, setSettings };
}

type Tab = "accessibility" | "system";

export function SettingsPanel(props: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (s: Settings) => void;
  javaPath: string;
  javaError: string | null;
  savingJavaPath: boolean;
  onPickJavaFolder: () => Promise<void>;
  onPickJavaFile: () => Promise<void>;
  onSaveJavaPath: (value: string | null) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("accessibility");

  if (!props.open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={props.onClose} />
      <div className="fixed inset-x-0 top-12 mx-auto z-50 w-[32rem] max-w-[calc(100vw-2rem)] animate-scale-in rounded-xl border border-white/[0.08] bg-surface-2 shadow-elevated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Icon.Settings className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-200">Configurações</span>
          </div>
          <button className="btn-ghost rounded p-1" onClick={props.onClose}>
            <Icon.X className="h-3 w-3 text-slate-500" />
          </button>
        </div>
        <div className="flex border-b border-white/[0.06]">
          <TabBtn active={tab === "accessibility"} onClick={() => setTab("accessibility")}>Acessibilidade</TabBtn>
          <TabBtn active={tab === "system"} onClick={() => setTab("system")}>Ajustes do sistema</TabBtn>
        </div>
        <div className="p-4">
          {tab === "accessibility" && <AccessibilityTab settings={props.settings} onChange={props.onChange} />}
          {tab === "system" && (
            <SystemTab
              javaPath={props.javaPath}
              javaError={props.javaError}
              savingJavaPath={props.savingJavaPath}
              onPickJavaFolder={props.onPickJavaFolder}
              onPickJavaFile={props.onPickJavaFile}
              onSaveJavaPath={props.onSaveJavaPath}
            />
          )}
        </div>
      </div>
    </>
  );
}

function TabBtn(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`flex-1 py-2 text-2xs font-medium transition-colors ${props.active ? "text-accent border-b-2 border-accent" : "text-slate-500 hover:text-slate-300"}`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function AccessibilityTab(props: { settings: Settings; onChange: (s: Settings) => void }) {
  const { settings, onChange } = props;
  return (
    <div className="space-y-4">
      <SettingRow label="Zoom da interface">
        <div className="flex items-center gap-2">
          <button className="btn-ghost rounded p-1" onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(settings.zoom as (typeof ZOOM_LEVELS)[number]);
            if (idx > 0) onChange({ ...settings, zoom: ZOOM_LEVELS[idx - 1] });
          }}>
            <Icon.ZoomOut className="h-3 w-3 text-slate-400" />
          </button>
          <span className="text-xs font-mono text-slate-300 w-10 text-center tabular-nums">{settings.zoom}%</span>
          <button className="btn-ghost rounded p-1" onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(settings.zoom as (typeof ZOOM_LEVELS)[number]);
            if (idx < ZOOM_LEVELS.length - 1) onChange({ ...settings, zoom: ZOOM_LEVELS[idx + 1] });
          }}>
            <Icon.ZoomIn className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      </SettingRow>
      <SettingRow label="Tamanho da fonte (logs)">
        <select
          className="input py-1 px-2 w-20 text-xs"
          value={settings.fontSize}
          onChange={(e) => onChange({ ...settings, fontSize: Number(e.target.value) })}
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>
      </SettingRow>
      <SettingRow label="Quebrar linhas (logs)">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.logLineWrap}
            onChange={(e) => onChange({ ...settings, logLineWrap: e.target.checked })}
          />
          <div className="w-8 h-[18px] bg-surface-4 rounded-full peer peer-checked:bg-accent/50 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-3.5" />
        </label>
      </SettingRow>
      <div className="divider" />
      <div className="text-2xs text-slate-600 space-y-1">
        <p><kbd className="kbd">Ctrl +</kbd> / <kbd className="kbd">Ctrl -</kbd> Zoom</p>
        <p><kbd className="kbd">Ctrl 0</kbd> Reset zoom</p>
      </div>
    </div>
  );
}

function SystemTab(props: {
  javaPath: string;
  javaError: string | null;
  savingJavaPath: boolean;
  onPickJavaFolder: () => Promise<void>;
  onPickJavaFile: () => Promise<void>;
  onSaveJavaPath: (value: string | null) => Promise<void>;
}) {
  const [javaPathDraft, setJavaPathDraft] = useState(props.javaPath);

  useEffect(() => {
    setJavaPathDraft(props.javaPath);
  }, [props.javaPath]);

  return (
    <div className="space-y-4">
      <JavaSection
        javaPath={props.javaPath}
        javaPathDraft={javaPathDraft}
        onDraftChange={setJavaPathDraft}
        javaError={props.javaError}
        savingJavaPath={props.savingJavaPath}
        onPickJavaFolder={props.onPickJavaFolder}
        onPickJavaFile={props.onPickJavaFile}
        onSaveJavaPath={props.onSaveJavaPath}
      />
      <div className="divider" />
      <KillPortSection />
    </div>
  );
}

function JavaSection(props: {
  javaPath: string;
  javaPathDraft: string;
  onDraftChange: (v: string) => void;
  javaError: string | null;
  savingJavaPath: boolean;
  onPickJavaFolder: () => Promise<void>;
  onPickJavaFile: () => Promise<void>;
  onSaveJavaPath: (value: string | null) => Promise<void>;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-white/[0.06] bg-surface-1/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon.Java className="h-4 w-4 text-accent" />
          <span className="text-xs text-slate-300">Java do aplicativo</span>
        </div>
        <span className="text-2xs text-slate-500">{props.javaPath ? "Customizado" : "Automático"}</span>
      </div>
      <input
        className="input w-full px-2 py-1.5 text-xs"
        placeholder="Pasta do Java ou caminho do java.exe"
        value={props.javaPathDraft}
        onChange={(e) => props.onDraftChange(e.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xs text-slate-500">Aceita a pasta do Java ou o executável.</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost text-2xs px-2 py-1" onClick={() => void props.onPickJavaFolder()}>Pasta</button>
          <button className="btn btn-ghost text-2xs px-2 py-1" onClick={() => void props.onPickJavaFile()}>Arquivo</button>
          <button className="btn btn-ghost text-2xs px-2 py-1" onClick={() => void props.onSaveJavaPath(null)}>Limpar</button>
          <button
            className="btn btn-primary text-2xs px-2.5 py-1"
            disabled={props.savingJavaPath}
            onClick={() => void props.onSaveJavaPath(props.javaPathDraft.trim() || null)}
          >
            {props.savingJavaPath ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
      {props.javaError && (
        <div className="rounded-md border border-[#ff7a0026] bg-[#ff7a0014] px-2.5 py-2 text-2xs text-[#ffb06a]">{props.javaError}</div>
      )}
    </div>
  );
}

function KillPortSection() {
  const [port, setPort] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>();

  const portNum = Number(port.trim());
  const valid = Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;

  const handleKill = useCallback(async () => {
    if (!valid) return;
    setBusy(true);
    setResult(null);
    try {
      await api.killPort(portNum);
      setResult({ type: "success", msg: `Porta ${portNum} liberada com sucesso.` });
      setPort("");
    } catch (e) {
      setResult({ type: "error", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setResult(null), 6000);
    }
  }, [valid, portNum]);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  return (
    <div className="space-y-2 rounded-lg border border-white/[0.06] bg-surface-1/70 p-3">
      <div className="flex items-center gap-2">
        <Icon.Trash className="h-4 w-4 text-danger" />
        <span className="text-xs text-slate-300">Derrubar porta</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={65535}
          placeholder="Porta (ex: 3000)"
          value={port}
          onChange={(e) => { setPort(e.target.value); setResult(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && valid && !busy) void handleKill(); }}
          className="input flex-1 px-2 py-1.5 text-xs"
        />
        <button
          className="btn btn-danger text-2xs px-3 py-1.5 font-semibold disabled:opacity-40"
          disabled={!valid || busy}
          onClick={() => void handleKill()}
        >
          {busy ? "Derrubando..." : "Derrubar"}
        </button>
      </div>
      <span className="text-2xs text-slate-500">Encerra o processo que estiver usando a porta informada.</span>
      {result && (
        <div className={`rounded-md px-2.5 py-2 text-2xs ${result.type === "success" ? "border border-accent/20 bg-accent/10 text-accent" : "border border-danger/20 bg-danger/10 text-danger"}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

function SettingRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-400">{props.label}</span>
      {props.children}
    </div>
  );
}
