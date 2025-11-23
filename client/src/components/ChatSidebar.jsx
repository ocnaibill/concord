import React, { useMemo } from "react";
import peopleIcon from "../assets/people.svg";
import globeIcon from "../assets/globe.svg";

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

function LeaveIcon({ className = "w-5 h-5" }) {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
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
const ChatSidebar = ({
  chats = [],
  selectedId = null,
  onSelect,
  onAdd,

  // --- Props existentes ---
  isInRoom,
  onLeave,

  // --- NOVAS PROPS DO APP.JSX (DMs) ---
  sidebarMode = 'rooms', // 'rooms' ou 'users'
  onToggleSidebar,       // Função para trocar
  onlineUsers = [],      // Lista de usuários
  onSelectUser,          // Função ao clicar no usuário
  dmHistory = {},        // Histórico de msg
  currentDmUserId        // ID selecionado na DM
}) => {
  
  // Memo para formatar SALAS (Modo Rooms)
  const roomItems = useMemo(
    () =>
      (chats || []).map((c) => ({
        id: c.id,
        title: c.title || c.name || "Sem título",
        preview: c.preview || "",
        usersCount: c.usersCount,
      })),
    [chats]
  );

  // Memo para formatar USUÁRIOS (Modo Users)
  // Reutilizamos a estrutura de dados para aproveitar o mesmo layout do botão
  const userItems = useMemo(
    () => 
      (onlineUsers || []).map((u) => {
         const history = dmHistory[u.id] || [];
         const hasHistory = history.length > 0;
         return {
            id: u.id,
            title: u.nick,
            // Mostra a última mensagem ou um texto padrão
            preview: hasHistory ? history[history.length - 1].text : "Clique para conversar",
            isUser: true // Flag para saber que é usuário
         };
      }),
    [onlineUsers, dmHistory]
  );

  // Define qual lista mostrar baseado no modo
  const itemsToShow = sidebarMode === 'rooms' ? roomItems : userItems;
  const hasItems = itemsToShow && itemsToShow.length > 0;

  // Lógica do botão Toggle
  const isRoomsMode = sidebarMode === 'rooms';
  const toggleButtonText = isRoomsMode ? "Mensagens Diretas" : "Conversas Públicas";
  const ToggleIcon = isRoomsMode ? peopleIcon : globeIcon;

  return (
    <aside className="relative flex h-full w-72 min-w-64 flex-col overflow-hidden rounded-[28px] bg-neutral-900 text-slate-100 ring-1 ring-white/10">
      <TopographyOverlay opacity={0.2} />

      {/* Botão Alternador (Toggle) */}
      <button
        onClick={onToggleSidebar}
        className="relative z-10 mt-[22px] ml-[13px] flex h-[32px] w-[calc(100%-25px)] items-center justify-center gap-2 rounded-[25px] bg-[#676767] text-[20px] font-bold text-white transition hover:bg-[#5a5a5a]"
        style={{ fontFamily: '"Istok Web Bold", sans-serif' }}
      >
        <span>{toggleButtonText}</span>
        <img src={ToggleIcon} alt="" className="h-6 w-6" />
      </button>

      {/* --- HEADER --- */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/15">
        <h2 className="text-3xl font-extrabold tracking-tight">
             {isRoomsMode ? "Chats" : "Online"}
        </h2>

        {/* Mostra o botão "+" apenas se estiver no modo SALAS e NÃO estiver em uma sala */}
        {isRoomsMode && !isInRoom && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Novo chat"
            className="inline-flex items-center justify-center rounded-full border border-white/20 p-1.5 text-slate-200/90 hover:bg-white/10 hover:text-white transition"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Lista de Chats ou Usuários (Scroll) */}
      <div className="relative z-10 flex-1 space-y-2 overflow-y-auto p-2">
        {!hasItems && (
          <div className="px-3 py-2 text-sm text-slate-400">
             {isRoomsMode 
                ? "Nenhuma sala pública disponível :( Crie uma!" 
                : "Ninguém online no momento."}
          </div>
        )}

        {itemsToShow.map((item) => {
          // Lógica de seleção
          // Se for sala: compara com selectedId
          // Se for usuário: compara com currentDmUserId
          const isSelected = item.isUser 
                ? String(item.id) === String(currentDmUserId)
                : String(item.id) === String(selectedId);
          
          return (
            <button
              key={item.id}
              onClick={() => {
                  if (item.isUser) {
                      // Se for usuário, chama onSelectUser passando o objeto original user
                      // Precisamos achar o objeto original na lista onlineUsers
                      const originalUser = onlineUsers.find(u => u.id === item.id);
                      if (originalUser) onSelectUser(originalUser);
                  } else {
                      // Se for sala, chama onSelect normal
                      onSelect?.(item.id);
                  }
              }}
              className={`group block w-full rounded-xl px-3 py-3 text-left transition ${
                  isSelected ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
              }`}
            >
              {/* 1. Adiciona um wrapper flexível */}
              <div className="flex justify-between items-center">

                {/* 2. Título (Nome da Sala ou Nick do Usuário) */}
                <div className="truncate text-[15px] font-semibold text-slate-100 flex items-center gap-2">
                  {/* Se for usuário, mostra bolinha de status online antes do nome */}
                  {item.isUser && (
                      <div className="w-2.5 h-2.5 bg-[#00ff5eff] rounded-full shadow-[0_0_5px_rgba(0,255,94,0.6)]"></div>
                  )}
                  {item.title}
                </div>

                {/* 3. Contagem de Usuários (APENAS PARA SALAS e se > 0) */}
                {!item.isUser && item.usersCount > 0 && (
                  <div className="flex-shrink-0 ml-2">
                    <div
                      style={{
                        width: 50,
                        height: 25,
                        backgroundColor: "#727272",
                        opacity: 0.51,
                        borderRadius: 20,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 8, 
                        gap: 4, 
                      }}
                    >
                      <div
                        style={{
                          width: 11,
                          height: 11,
                          backgroundColor: "#00ff5eff", 
                          borderRadius: "50%",
                        }}
                        className="animate-pulse"
                      />
                      <span
                        className="text-xs font-bold text-white-500"
                        style={{ lineHeight: "12px"}}
                      >
                        {Math.min(item.usersCount, 5)}/5
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Preview da última mensagem (Sala ou DM) */}
              {item.preview ? (
                <div className="mt-0.5 truncate text-xs text-slate-400 pl-0.5">
                    {item.preview}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* --- FOOTER --- */}
      {/* Mostra o botão "Sair" apenas SE estiver em uma sala E no modo Salas */}
      {isInRoom && isRoomsMode && (
        <div className="relative z-10 p-2 border-t border-white/15">
          <button
            onClick={onLeave}
            className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
          >
            <LeaveIcon className="w-5 h-5" />
            Sair da Sala (Lobby)
          </button>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
export { ChatSidebar };