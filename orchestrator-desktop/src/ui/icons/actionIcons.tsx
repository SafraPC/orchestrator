const s = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.5 };

export const actionIcons = {
  Play: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 2.5a.75.75 0 011.137-.643l8 4.8a.75.75 0 010 1.286l-8 4.8A.75.75 0 014.5 12.1V2.5z" />
    </svg>
  ),
  Stop: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
    </svg>
  ),
  Restart: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M2.5 3v3.5H6M13.5 13V9.5H10" />
      <path d="M4.2 9.5A4.5 4.5 0 018 4a4.5 4.5 0 013.8 2.1m0 0M11.8 6.5A4.5 4.5 0 018 12a4.5 4.5 0 01-3.8-2.1" />
    </svg>
  ),
  Download: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 2.5v7M5.5 7 8 9.5 10.5 7" />
      <path d="M3.5 13.5h9" />
    </svg>
  ),
  Undo: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M5.5 5H12a2.5 2.5 0 010 5H8" />
      <path d="M5.5 5l2.5-2.5M5.5 5l2.5 2.5" />
    </svg>
  ),
  Branch: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <circle cx="5" cy="3.5" r="1.5" />
      <circle cx="11" cy="12.5" r="1.5" />
      <circle cx="5" cy="12.5" r="1.5" />
      <path d="M5 5v4a3.5 3.5 0 003.5 3.5H9.5" />
      <path d="M5 9h1.5A2.5 2.5 0 009 6.5V5" />
    </svg>
  ),
  Trash: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M5.5 2.5h5M2.5 4.5h11M10.5 4.5v7.5a1 1 0 01-1 1h-3a1 1 0 01-1-1v-7.5M6.5 7v3.5M9.5 7v3.5" />
    </svg>
  ),
  Plus: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  Plug: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...s}>
      <path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8z" />
      <path d="M12 17v5" />
    </svg>
  ),
  Search: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <circle cx="7" cy="7" r="4" />
      <path d="M13 13l-3-3" />
    </svg>
  ),
  Copy: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <rect x="5.5" y="5.5" width="7" height="7" rx="1" />
      <path d="M3.5 10.5v-7a1 1 0 011-1h7" />
    </svg>
  ),
  Folder: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M2.5 4.5v7a1 1 0 001 1h9a1 1 0 001-1v-5a1 1 0 00-1-1H8L6.5 4h-3a1 1 0 00-1 .5z" />
    </svg>
  ),
  Terminal: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M4 5l3 3-3 3M8.5 11H12" />
    </svg>
  ),
  File: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M4 2.5h5l3 3V13.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-10a1 1 0 011-1z" />
      <path d="M9 2.5V6h3.5" />
    </svg>
  ),
  Code: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4" />
    </svg>
  ),
  Globe: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11M8 2.5c-2 2-2 9 0 11M8 2.5c2 2 2 9 0 11" />
    </svg>
  ),
  Dots: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3.5" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="8" cy="12.5" r="1.25" />
    </svg>
  ),
  Chevron: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M10 4l-4 4 4 4" />
    </svg>
  ),
  Scan: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M2 5V3a1 1 0 011-1h2M11 2h2a1 1 0 011 1v2M14 11v2a1 1 0 01-1 1h-2M5 14H3a1 1 0 01-1-1v-2M5 8h6M8 5v6" />
    </svg>
  ),
  Eraser: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M4 12h8M5 8l6-6M3.5 9.5l3 3 7-7-3-3-7 7z" />
    </svg>
  ),
  ArrowDown: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 3v10M4 9l4 4 4-4" />
    </svg>
  ),
  Box: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M14 5L8 2 2 5v6l6 3 6-3V5zM2 5l6 3M8 14V8M14 5l-6 3" />
    </svg>
  ),
  Import: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 2v8M4 6l4 4 4-4M2.5 11v1.5a1 1 0 001 1h9a1 1 0 001-1V11" />
    </svg>
  ),
  FolderImport: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M1.5 3.5a1 1 0 011-1h3l1.5 1.5h5.5a1 1 0 011 1v7a1 1 0 01-1 1h-10a1 1 0 01-1-1v-8.5z" />
      <path d="M8 6.5v4M6 8.5l2 2 2-2" />
    </svg>
  ),
  Palette: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <circle cx="8" cy="8" r="6.5" />
      <circle cx="6" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Log: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M4 4h8M4 7h6M4 10h8M4 13h4" />
    </svg>
  ),
  Check: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M3.5 8.5l3 3 6-6" />
    </svg>
  ),
  X: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  Settings: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...s}>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ZoomIn: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <circle cx="7" cy="7" r="4" />
      <path d="M13 13l-3-3M7 5v4M5 7h4" />
    </svg>
  ),
  Pencil: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" />
    </svg>
  ),
  ZoomOut: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <circle cx="7" cy="7" r="4" />
      <path d="M13 13l-3-3M5 7h4" />
    </svg>
  ),
  Grip: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5.5" cy="4" r="1" />
      <circle cx="10.5" cy="4" r="1" />
      <circle cx="5.5" cy="8" r="1" />
      <circle cx="10.5" cy="8" r="1" />
      <circle cx="5.5" cy="12" r="1" />
      <circle cx="10.5" cy="12" r="1" />
    </svg>
  ),
};
