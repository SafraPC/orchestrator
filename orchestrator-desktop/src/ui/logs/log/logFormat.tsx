import type { ReactNode } from "react";

export type LogLevel = "error" | "warn" | "info" | "debug" | "status" | "normal";

export function classifyLogLine(line: string): LogLevel {
  if (line.includes("[STATUS]")) {
    return "status";
  }
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("EXCEPTION") || upper.includes("FATAL")) {
    return "error";
  }
  if (upper.includes("WARN")) {
    return "warn";
  }
  if (upper.includes("DEBUG") || upper.includes("TRACE")) {
    return "debug";
  }
  if (upper.includes("INFO")) {
    return "info";
  }
  return "normal";
}

export const LOG_COLORS: Record<LogLevel, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-sky-400",
  debug: "text-slate-600",
  status: "text-yellow-300",
  normal: "text-slate-400",
};

export function highlightSearch(line: string, search: string): ReactNode {
  const parts: ReactNode[] = [];
  const lower = line.toLowerCase();
  const needle = search.toLowerCase();
  let last = 0;
  let pos = lower.indexOf(needle, last);
  while (pos !== -1) {
    if (pos > last) {
      parts.push(line.slice(last, pos));
    }
    parts.push(
      <mark key={pos} className="bg-accent/30 text-accent rounded px-0.5">
        {line.slice(pos, pos + search.length)}
      </mark>,
    );
    last = pos + search.length;
    pos = lower.indexOf(needle, last);
  }
  if (last < line.length) {
    parts.push(line.slice(last));
  }
  return <>{parts}</>;
}
