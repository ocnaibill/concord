import React, { useMemo } from "react";

// Ícone minimalista de "+"
function PlusIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// Overlay topográfico
function TopographyOverlay({ opacity = 0.18 }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="tg" x1="0" x2="1">
          <stop offset="0%" stopColor="#5b6572" />
          <stop offset="100%" stopColor="#3c424a" />
        </linearGradient>
      </defs>
      {[
        "M-50 120 C 150 60, 350 140, 560 100 S 980 120, 1100 60",
        "M-50 240 C 160 180, 360 300, 560 240 S 980 260, 1100 180",
        "M-50 360 C 160 300, 360 420, 560 360 S 980 380, 1100 300",
        "M-50 480 C 160 420, 360 540, 560 480 S 980 500, 1100 420",
        "M-50 600 C 160 540, 360 660, 560 600 S 980 620, 1100 540",
        "M-50 720 C 160 660, 360 780, 560 720 S 980 740, 1100 660",
        "M-50 840 C 160 780, 360 900, 560 840 S 980 860, 1100 780",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="url(#tg)" strokeWidth="2" />
      ))}
    </svg>
  );
}

// ---- componente em constante + export explícito (default e nomeado)
const ChatSidebar = ({ chats = [], selectedId = null, onSelect, onAdd }) => {
  const hasChats = chats && chats.length > 0;

  const items = useMemo(
    () =>
      (chats || []).map((c) => ({
        id: c.id,
        title: c.title || c.name || "Sem título",
        preview: c.preview || "",
      })),
    [chats]
  );

  return (
    <aside className="relative flex h-full w-72 min-w-64 flex-col overflow-hidden rounded-[28px] bg-neutral-900 text-slate-100 ring-1 ring-white/10">
      <TopographyOverlay opacity={0.2} />

      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/15">
        <h2 className="text-3xl font-extrabold tracking-tight">Chats</h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Novo chat"
          className="inline-flex items-center justify-center rounded-full border border-white/20 p-1.5 text-slate-200/90 hover:bg-white/10 hover:text-white transition"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="relative z-10 flex-1 space-y-2 overflow-y-auto p-2">
        {!hasChats && (
          <div className="px-3 py-2 text-sm text-slate-400">Nenhuma conversa ainda.</div>
        )}
        {items.map((item) => {
          const active = String(item.id) === String(selectedId);
          return (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.id)}
              className={`group block w-full rounded-xl px-3 py-3 text-left transition ${
                active ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
              }`}
            >
              <div className="truncate text-[15px] font-semibold text-slate-100">
                {item.title}
              </div>
              {item.preview ? (
                <div className="mt-0.5 truncate text-xs text-slate-400">{item.preview}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default ChatSidebar;
export { ChatSidebar };
