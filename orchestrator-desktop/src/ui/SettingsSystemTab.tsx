import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { ActiveJavaInfoDto } from "../api/types";
import { Icon } from "./Icons";
import { Modal } from "./Modal";

export function SettingsSystemTab(props: {
  javaPath: string;
  javaError: string | null;
  savingJavaPath: boolean;
  onPickJavaFolder: () => Promise<void>;
  onPickJavaFile: () => Promise<void>;
  onSaveJavaPath: (value: string | null) => Promise<void>;
  onRebuildServices: () => Promise<void>;
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
      <RebuildServicesSection onRebuildServices={props.onRebuildServices} />
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
  const [active, setActive] = useState<ActiveJavaInfoDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const info = await api.getActiveJavaInfo();
        if (!cancelled) setActive(info);
      } catch {
        if (!cancelled) setActive(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.javaPath, props.savingJavaPath]);

  const sourceLabel = props.javaPath ? "Caminho personalizado" : "Detectado automaticamente";

  return (
    <section className="space-y-3 rounded-xl border border-white/[0.08] bg-surface-1/70 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-[#ff7a0014] p-1.5">
            <Icon.Java className="h-4 w-4 text-[#ff7a00]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100">Java do aplicativo</h3>
            <p className="text-2xs text-slate-500">Runtime usado pelo core para executar serviços</p>
          </div>
        </div>
      </header>

      <ActiveJavaCard active={active} sourceLabel={sourceLabel} />

      <div className="space-y-2">
        <label className="text-2xs font-medium text-slate-400 uppercase tracking-wide">
          Caminho personalizado
        </label>
        <div className="flex items-center gap-1.5">
          <input
            className="input flex-1 px-2.5 py-2 text-xs"
            placeholder="Pasta do Java ou caminho do executável"
            value={props.javaPathDraft}
            onChange={(e) => props.onDraftChange(e.target.value)}
          />
          <button
            className="btn btn-ghost text-2xs px-2 py-2"
            onClick={() => void props.onPickJavaFolder()}
            title="Escolher pasta"
          >
            <Icon.Folder className="h-3 w-3" />
          </button>
          <button
            className="btn btn-ghost text-2xs px-2 py-2"
            onClick={() => void props.onPickJavaFile()}
            title="Escolher arquivo"
          >
            <Icon.Code className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xs text-slate-500">Aceita a pasta do JDK ou o executável java.</p>
          <div className="flex items-center gap-1.5">
            <button
              className="btn btn-ghost text-2xs px-2 py-1"
              onClick={() => void props.onSaveJavaPath(null)}
              disabled={props.savingJavaPath || !props.javaPath}
            >
              Restaurar padrão
            </button>
            <button
              className="btn btn-primary text-2xs px-3 py-1 font-semibold disabled:opacity-40"
              disabled={props.savingJavaPath}
              onClick={() => void props.onSaveJavaPath(props.javaPathDraft.trim() || null)}
            >
              {props.savingJavaPath ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
        {props.javaError && (
          <div className="rounded-md border border-[#ff7a0026] bg-[#ff7a0014] px-2.5 py-2 text-2xs text-[#ffb06a]">
            {props.javaError}
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveJavaCard(props: { active: ActiveJavaInfoDto | null; sourceLabel: string }) {
  if (!props.active) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-surface-2/60 px-3 py-2.5 text-2xs text-slate-500">
        Carregando informações do Java...
      </div>
    );
  }
  const major = extractMajor(props.active.javaVersion);
  return (
    <div className="rounded-lg border border-accent/20 bg-accent/[0.04] p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="badge bg-accent/15 text-accent font-mono text-[10px]">{major ?? props.active.javaVersion}</span>
        <span className="text-xs font-semibold text-slate-100">{props.active.javaVersion}</span>
        <span className="ml-auto text-2xs text-slate-500">{props.sourceLabel}</span>
      </div>
      <InfoRow label="Vendor" value={props.active.vendor} />
      <InfoRow label="Java Home" value={props.active.javaHome} mono />
    </div>
  );
}

function InfoRow(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xs text-slate-500 shrink-0 w-16">{props.label}</span>
      <span className={`text-2xs text-slate-300 break-all ${props.mono ? "font-mono" : ""}`}>{props.value}</span>
    </div>
  );
}

function extractMajor(version: string): string | null {
  const match = version.match(/^(\d+)/);
  return match ? `Java ${match[1]}` : null;
}

function RebuildServicesSection(props: { onRebuildServices: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setConfirm(false);
    try {
      await props.onRebuildServices();
    } catch {
    } finally {
      setBusy(false);
    }
  }, [busy, props]);

  return (
    <section className="space-y-2 rounded-xl border border-white/[0.08] bg-surface-1/70 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-warn/10 p-1.5">
            <Icon.Restart className="h-4 w-4 text-warn" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100">Limpar cache e recriar serviços</h3>
            <p className="text-2xs text-slate-500">
              Recadastra cada serviço existente. Útil após trocar a versão do Java ou variáveis de ambiente.
            </p>
          </div>
        </div>
      </header>
      <div className="flex justify-end pt-1">
        <button
          className="btn btn-ghost text-2xs px-3 py-1.5 border border-warn/30 text-warn hover:bg-warn/10 disabled:opacity-40"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          {busy ? "Recriando..." : "Recriar serviços"}
        </button>
      </div>
      <Modal
        open={confirm}
        kind="warning"
        title="Recriar serviços?"
        message={
          "Todos os serviços serão parados, o cache de runtime será limpo e os serviços existentes serão recadastrados.\n\nNenhum serviço será removido permanentemente."
        }
        confirmLabel="Recriar"
        cancelLabel="Cancelar"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
}
