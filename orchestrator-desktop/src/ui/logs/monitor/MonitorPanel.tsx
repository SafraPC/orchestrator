import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ServiceDto } from "../../../api/types";
import { Icon } from "../../icons/Icons";
import type { ToastType } from "../../toast/Toast";
import { Tooltip } from "../../tooltip/Tooltip";
import { classifyLogLine, highlightSearch, LOG_COLORS } from "../log/logFormat";
import { JumpToEndButton, LogRangeHint, LogToolbarButton, useLogMarks } from "../log/logMarks";
import { monitorBadgeColor } from "./monitorColors";
import { useMonitorLogStream } from "../hooks/useMonitorLogStream";

export function MonitorPanel(props: {
  services: ServiceDto[];
  fontSize?: number;
  lineWrap?: boolean;
  onToast?: (t: ToastType, m: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const { markA, markB, handleLineClick, clearMarks, rangeMin, rangeMax } = useLogMarks();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const toast = props.onToast;

  const serviceNames = useMemo(() => props.services.map((s) => s.name).sort(), [props.services]);
  const { lines, setLines, connected } = useMonitorLogStream(serviceNames);
  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    serviceNames.forEach((name, i) => m.set(name, monitorBadgeColor(i)));
    return m;
  }, [serviceNames]);

  useEffect(() => {
    setSearch("");
  }, [serviceNames.join(",")]);

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
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
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
  }, []);

  useEffect(() => {
    if (!showLegend) {
      return;
    }
    const h = (e: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setShowLegend(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showLegend]);

  function flash() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyAll() {
    if (lines.length === 0) {
      toast?.("info", "Nenhum log para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(lines.map((l) => `[${l.service}] ${l.line}`).join("\n"));
      flash();
      toast?.("success", `${lines.length} linhas copiadas`);
    } catch {}
  }

  async function copyRange() {
    if (markA === null || markB === null) {
      return;
    }
    const lo = Math.min(markA, markB);
    const hi = Math.max(markA, markB);
    try {
      await navigator.clipboard.writeText(
        lines.slice(lo, hi + 1).map((l) => `[${l.service}] ${l.line}`).join("\n"),
      );
      flash();
      toast?.("success", `${hi - lo + 1} linhas copiadas`);
    } catch {}
    clearMarks();
  }

  const filtered = search
    ? lines.map((l, i) => ({ ...l, i })).filter(({ line }) => line.toLowerCase().includes(search.toLowerCase()))
    : lines.map((l, i) => ({ ...l, i }));
  const logFontSize = props.fontSize ?? 12;
  const wrap = props.lineWrap !== false;

  return (
    <div className="flex flex-1 min-h-0 flex-col select-none">
      <div className="px-4 py-2.5 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon.Log className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <span className="truncate text-xs font-medium text-slate-200">Monitor</span>
            <span className="badge bg-accent/10 text-accent shrink-0">{serviceNames.length} serviços</span>
            {connected && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <div className="relative">
              <Tooltip text="Legendas">
                <LogToolbarButton icon="Palette" active={showLegend} onClick={() => setShowLegend(!showLegend)} />
              </Tooltip>
              {showLegend && (
                <div
                  ref={legendRef}
                  className="absolute right-0 top-full mt-1 z-[300] w-56 rounded-lg border border-white/[0.08] bg-surface-2 shadow-elevated backdrop-blur-xl animate-scale-in"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">Legendas</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                    {serviceNames.map((name, i) => (
                      <div key={name} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-surface-3">
                        <span className="shrink-0 w-3 h-3 rounded" style={{ backgroundColor: monitorBadgeColor(i) }} />
                        <span className="text-xs text-slate-300 truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
        {filtered.map(({ service, line, i }) => {
          const color = colorMap.get(service) ?? "#64748b";
          const isMarked = markA === i || markB === i;
          const inRange = rangeMin !== null && rangeMax !== null && i >= rangeMin && i <= rangeMax;
          return (
            <div
              key={i}
              onClick={() => handleLineClick(i)}
              className={`flex items-start gap-0 py-px cursor-pointer transition-colors ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"} rounded px-1.5 -mx-1 ${isMarked ? "bg-accent/25 ring-1 ring-accent/50" : inRange ? "bg-accent/15" : "hover:bg-white/[0.04]"}`}
            >
              <span
                className="shrink-0 inline-flex items-center rounded px-1.5 py-px text-[10px] font-bold leading-tight mr-2 mt-px"
                style={{ backgroundColor: color, color: "#0f0f0f" }}
              >
                {service}
              </span>
              <span className={LOG_COLORS[classifyLogLine(line)]}>
                {search ? highlightSearch(line, search) : line}
              </span>
            </div>
          );
        })}
        {lines.length === 0 && connected && (
          <p className="text-slate-600 animate-pulse font-sans text-xs select-none">Aguardando logs dos serviços...</p>
        )}
        {lines.length === 0 && !connected && (
          <p className="text-slate-700 font-sans text-xs select-none">Conectando aos serviços...</p>
        )}
        <div ref={bottomRef} />
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
