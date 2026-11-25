import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceDto } from "../../../api/types";
import { Icon } from "../../icons/Icons";
import { Tooltip } from "../../tooltip/Tooltip";
import type { ToastType } from "../../toast/Toast";
import { classifyLogLine, highlightSearch, LOG_COLORS } from "../log/logFormat";
import { JumpToEndButton, LogRangeHint, LogToolbarButton, useLogMarks } from "../log/logMarks";
import { MonitorTabs } from "../log/logTabs";
import { useServiceLogStream } from "../hooks/useServiceLogStream";

export function ServiceLogView(props: {
  service: ServiceDto | null;
  fontSize?: number;
  lineWrap?: boolean;
  onToast?: (t: ToastType, m: string) => void;
  mode: "service" | "monitor";
  onMode: (m: "service" | "monitor") => void;
  canMonitor: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const { markA, markB, handleLineClick, clearMarks, rangeMin, rangeMax } = useLogMarks();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const svcName = props.service?.name ?? null;
  const { lines, setLines, connected, hasLogs } = useServiceLogStream(svcName);
  const toast = props.onToast;

  useEffect(() => {
    setSearch("");
    clearMarks();
  }, [svcName]);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [lines.length, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
    }
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && svcName) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearch("");
        clearMarks();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [svcName]);

  async function copyRange() {
    if (markA === null || markB === null) {
      return;
    }
    const lo = Math.min(markA, markB);
    const hi = Math.max(markA, markB);
    try {
      await navigator.clipboard.writeText(lines.slice(lo, hi + 1).join("\n"));
      flash();
      toast?.("success", `${hi - lo + 1} linhas copiadas`);
    } catch {}
    clearMarks();
  }

  async function copyAll() {
    if (lines.length === 0) {
      toast?.("info", "Nenhum log para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash();
      toast?.("success", `${lines.length} linhas copiadas`);
    } catch {}
  }

  function flash() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const filtered = search
    ? lines.map((l, i) => ({ l, i })).filter(({ l }) => l.toLowerCase().includes(search.toLowerCase()))
    : lines.map((l, i) => ({ l, i }));
  const isRunning = props.service?.status === "RUNNING";
  const isError = props.service?.status === "ERROR";
  const logFontSize = props.fontSize ?? 12;
  const wrap = props.lineWrap !== false;

  return (
    <div className="flex h-full flex-col select-none">
      <MonitorTabs mode={props.mode} onMode={props.onMode} canMonitor={props.canMonitor} />
      <div className="px-4 py-2.5 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon.Log className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            {svcName ? (
              <>
                <span className="truncate text-xs font-medium text-slate-200">{svcName}</span>
                {isRunning && <span className="badge bg-accent/10 text-accent shrink-0">Ativo</span>}
                {isError && <span className="badge bg-danger/10 text-danger shrink-0">Erro</span>}
                {!isRunning && !isError && <span className="badge bg-surface-3 text-slate-500 shrink-0">Parado</span>}
                {connected && (
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${hasLogs ? "bg-accent" : "bg-warn animate-pulse"}`} />
                )}
              </>
            ) : (
              <span className="text-xs text-slate-600">Selecione um serviço</span>
            )}
          </div>
          {svcName && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip text="Buscar (⌘F)">
                <LogToolbarButton
                  icon="Search"
                  active={showSearch}
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) {
                      setTimeout(() => searchRef.current?.focus(), 50);
                    }
                  }}
                />
              </Tooltip>
              <Tooltip text="Copiar tudo">
                <LogToolbarButton icon="Copy" active={copied} onClick={() => void copyAll()} />
              </Tooltip>
              <div className="w-px h-4 bg-white/[0.06] mx-1" />
              <Tooltip text="Limpar logs">
                <LogToolbarButton
                  icon="Trash"
                  onClick={() => {
                    setLines([]);
                    clearMarks();
                    toast?.("info", "Logs limpos");
                  }}
                />
              </Tooltip>
            </div>
          )}
        </div>
        {showSearch && (
          <div className="flex items-center gap-2 animate-slide-up">
            <div className="relative flex-1">
              <Icon.Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar nos logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearch("");
                  }
                }}
              />
            </div>
            {search && <span className="text-2xs text-slate-500 tabular-nums shrink-0">{filtered.length}</span>}
          </div>
        )}
      </div>
      <div className="divider" />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-surface-0/50 px-4 py-3 font-mono leading-relaxed select-text cursor-text"
        style={{ fontSize: `${logFontSize}px` }}
      >
        {svcName ? (
          <>
            {filtered.map(({ l, i }) => {
              const isMarked = markA === i || markB === i;
              const inRange = rangeMin !== null && rangeMax !== null && i >= rangeMin && i <= rangeMax;
              return (
                <div
                  key={i}
                  className={`rounded px-1.5 -mx-1 py-px cursor-pointer transition-colors ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"} ${isMarked ? "bg-accent/25 ring-1 ring-accent/50" : inRange ? "bg-accent/15" : "hover:bg-white/[0.04]"} ${LOG_COLORS[classifyLogLine(l)]}`}
                  onClick={() => handleLineClick(i)}
                >
                  {search ? highlightSearch(l, search) : l}
                </div>
              );
            })}
            {lines.length === 0 && connected && !hasLogs && (
              <p className="text-slate-600 animate-pulse font-sans text-xs select-none">Aguardando logs...</p>
            )}
            {lines.length === 0 && !connected && (
              <p className="text-slate-700 font-sans text-xs select-none">Conectando...</p>
            )}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in font-sans select-none">
            <Icon.Log className="h-10 w-10 mb-3 text-slate-800" />
            <p className="text-xs text-slate-600">Selecione um serviço</p>
            <p className="text-2xs text-slate-700 mt-1">Logs aparecem em tempo real</p>
          </div>
        )}
      </div>
      <LogRangeHint
        markA={markA}
        markB={markB}
        onCopy={() => void copyRange()}
        onCancel={() => {
          clearMarks();
          toast?.("info", "Seleção cancelada");
        }}
      />
      {!autoScroll && lines.length > 0 && (
        <JumpToEndButton
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ block: "end" });
          }}
        />
      )}
    </div>
  );
}
