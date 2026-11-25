const s = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.5 };

export const techIcons = {
  Java: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.015-10.633-.118-6.943-1.149m-.575-2.627s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218" />
      <path d="M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0 0-8.216 2.051-4.292 6.573" />
      <path d="M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.886 9.578 1.554 17.462-.7 14.977-1.819M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892m7.824 4.374c4.503-2.34 2.421-4.589.968-4.285-.356.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.929 4.562 0 0 .07-.062.091-.118" />
      <path d="M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.889 4.832 0 6.836-2.274-2.053-3.943-3.858-2.824-5.54 1.644-2.469 6.197-3.665 5.189-7.626" />
      <path d="M9.734 23.924c4.322.277 10.959-.154 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0 0 .553.457 3.393.639" />
    </svg>
  ),
  Next: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 12.3L6.2 5.5V11H5V4h1.2l4.9 6.3V4H12v8.3h-.5z" />
    </svg>
  ),
  Nest: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.2 1c-.4 0-.8.2-1 .5.6.2 1 .7 1.1 1.3.1.6-.1 1.2-.5 1.5.1.1.1.2.1.4 0 .6-.5 1-1 1-.2 0-.3 0-.5-.1-.9 1-2.5 1.4-3.8 1-.8-.3-1.4-.8-1.8-1.5-.1.3-.2.6-.2 1 0 2.5 2 4.6 4.5 4.9h.5c2.8 0 5-2.2 5-5C11.5 2.7 10.5 1 9.2 1zM8 14.5c-3.6 0-6.5-2.9-6.5-6.5 0-1.3.4-2.6 1.1-3.6.5 1.3 1.5 2.3 2.9 2.8 1.2.4 2.5.3 3.6-.3C9 7 9 7.1 9 7.2c0 .6-.5 1-1 1-.3 0-.6-.1-.7-.4-.8.8-1.3 1.9-1.3 3.1 0 2.2 1.6 4 3.7 4.3-.5.2-1.1.3-1.7.3z" />
    </svg>
  ),
  ReactIcon: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="1.5" />
      <ellipse cx="8" cy="8" rx="7" ry="2.8" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <ellipse
        cx="8"
        cy="8"
        rx="7"
        ry="2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        transform="rotate(60 8 8)"
      />
      <ellipse
        cx="8"
        cy="8"
        rx="7"
        ry="2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        transform="rotate(120 8 8)"
      />
    </svg>
  ),
  Vue: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.8 1H12L8 8 4 1h2.2L8 4.3 9.8 1z" />
      <path d="M4 1L8 8l4-7h-2.2L8 4.3 6.2 1H4z" opacity="0.6" />
      <path d="M1 1l7 13L15 1h-3l-4 7-4-7H1z" opacity="0.3" />
    </svg>
  ),
  Angular: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.2L1.8 3.6v8.8L8 15.2l6.2-2.8V3.6L8 1.2zm0 1.4l4.8 2.1v6.6L8 13.4l-4.8-2.1V4.7L8 2.6z" />
      <path d="M8 4.8L5.6 10h1l.5-1.2h2.8l.5 1.2h1L8 4.8zm0 1.8l.9 2.1H7.1L8 6.6z" />
    </svg>
  ),
  Express: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.5 10.5V5.5L8 2.5l5.5 3v5L8 13.5 2.5 10.5zm1.2-1.1L8 11.8l4.3-2.4V6.6L8 4.2 3.7 6.6v2.8z" opacity="0.35" />
      <path d="M4.5 8.2h7v1H4.5v-1zm0 2.2h4.5v1H4.5v-1z" />
    </svg>
  ),
  Astro: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.8 10.5L8.9 5.2 7.6 9.1H5.1l3.5-5.9h1.2l2 5.3 1.8-3.4h1.3L10.8 10.5z" />
      <path d="M8 1.5l6.5 12H9.4l-.9-2H5.5l-.9 2H1.5L8 1.5z" opacity="0.25" />
    </svg>
  ),
  Svelte: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.1 11.4c-.8 1.1-2.4 1.6-4.1 1.2-1.8-.4-3.1-1.6-3.4-3-.3-1.3.3-2.4 1.4-3.1.5-.3 1.1-.5 1.7-.6-.1-.4-.3-.8-.6-1.1-1-.9-2.6-.7-3.6.5C2.8 6.7 2.5 8.6 3.4 10c1 1.5 3 2.4 5.1 2.4 1.4 0 2.7-.4 3.6-1z" />
      <path d="M11.8 4.6c.8-1.1 2.4-1.6 4.1-1.2 1.8.4 3.1 1.6 3.4 3 .3 1.3-.3 2.4-1.4 3.1-.5.3-1.1.5-1.7.6.1.4.3.8.6 1.1 1 .9 2.6.7 3.6-.5.8-1.1 1.1-3 .2-4.4-1-1.5-3-2.4-5.1-2.4-1.4 0-2.7.4-3.6 1z" opacity="0.55" />
    </svg>
  ),
  Remix: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 4.5h10v1.8L8.2 11.5H6.8L11 6.3H3V4.5z" />
      <path d="M3 11.8h4.2v1.2H3v-1.2z" opacity="0.7" />
    </svg>
  ),
  Fastify: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.2 1.2L6.1 8.1H3.4l5.8 6.7V9.4l2.1-4.5 2.2 4.5v5.4L14.6 8.1h-2.7L9.2 1.2z" />
    </svg>
  ),
  Docker: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.6 9.3h2.3v2.4h-2.3V9.3zm-3 0h2.3v2.4H9.6V9.3zm-3 0h2.3v2.4H6.6V9.3zm-3 0h2.3v2.4H3.6V9.3zm3-2.9h2.3v2.4H6.6V6.4zm3 0h2.3v2.4H9.6V6.4zm3 0h2.3v2.4h-2.3V6.4zm3 2.9h2.3v2.4h-2.3V9.3zm-6-5.8h2.3v2.4H9.6V3.5z" />
      <path d="M23 11.3c-.5-.4-1.7-.5-2.6-.3-.1-.9-.6-1.6-1.4-2.3l-.5-.3-.3.5c-.4.6-.6 1.5-.5 2.2.1.4.2.8.5 1.1-.2.1-.5.3-.8.4-.6.2-1.2.3-1.9.3H1c-.1 1.5.2 3.4 1.3 4.9 1.2 1.5 3 2.3 5.4 2.3 5.3 0 9.2-2.4 11.1-6.9 1 0 2.1-.2 2.8-1 .2-.2.5-.5.6-.9l.1-.3-.3-.2z" />
    </svg>
  ),
  Layers: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 2L2 5l6 3 6-3-6-3z" />
      <path d="M2 8.5l6 3 6-3M2 11.5l6 3 6-3" />
    </svg>
  ),
  Database: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <ellipse cx="8" cy="4" rx="5" ry="2" />
      <path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4" />
      <path d="M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />
    </svg>
  ),
  Refresh: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M13.5 8a5.5 5.5 0 01-9.4 3.9M2.5 8a5.5 5.5 0 019.4-3.9" />
      <path d="M11.5 2v2.5H14M4.5 14v-2.5H2" />
    </svg>
  ),
  Power: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 2v5" />
      <path d="M4.6 4.6a4.8 4.8 0 106.8 0" />
    </svg>
  ),
  Alert: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M8 2.5l5.5 10H2.5L8 2.5z" />
      <path d="M8 6.5v3M8 11.2v.3" />
    </svg>
  ),
  Sort: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="none" stroke="currentColor" {...s}>
      <path d="M2.5 4h8M2.5 8h5.5M2.5 12h3" />
      <path d="M12 6.5v6M10.2 10.7L12 12.5l1.8-1.8" />
    </svg>
  ),
  Hono: (p: { className?: string }) => (
    <svg className={p.className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2.2c2.2 1.8 3.6 3.8 3.6 5.8 0 2.4-1.6 4.3-3.6 5.8-2-1.5-3.6-3.4-3.6-5.8 0-2 1.4-4 3.6-5.8z" opacity="0.35" />
      <path d="M8 4.5c1.2 1 2 2.1 2 3.5s-.8 2.5-2 3.5c-1.2-1-2-2.1-2-3.5s.8-2.5 2-3.5z" />
    </svg>
  ),
};
