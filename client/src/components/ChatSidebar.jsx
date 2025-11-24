import React, { useMemo, useState, useEffect } from "react";
import peopleIcon from "../assets/people.svg";
import globeIcon from "../assets/globe.svg";
import socketService from "../services/socketService.js"; // Importar o serviço de socket

// --- ÍCONES E ASSETS ---

function PlusIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function LeaveIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

function SearchIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function CameraIcon({ isOn, className = "w-6 h-6" }) {
    if (isOn) {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                 <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
             <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
        </svg>
    );
}

const SignalIcon = ({ quality, className }) => {
    const bars = [1, 2, 3, 4];
    // quality: 1 (Bom/Verde), 2 (Médio/Amarelo), 3 (Ruim/Vermelho)
    const activeBars = quality === 1 ? 4 : quality === 2 ? 3 : 2;
    const color = quality === 1 ? '#00ff5e' : quality === 2 ? '#ffdd00' : '#ff3b30';

    return (
        <svg viewBox="0 0 24 24" className={className} style={{ width: 20, height: 20 }}>
            {bars.map((bar) => (
                <rect
                    key={bar}
                    x={bar * 5}
                    y={20 - bar * 4}
                    width={3}
                    height={bar * 4}
                    rx={1}
                    fill={bar <= activeBars ? color : "#4a4a4a"}
                />
            ))}
        </svg>
    );
};

// --- COMPONENTE DO PAINEL DE CONEXÃO ---
const ConnectionStatusPanel = ({ user, onCameraToggle, isVideoEnabled }) => {
    const [isHoveringPing, setIsHoveringPing] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [pingMs, setPingMs] = useState(0);
    
    // Estado de qualidade baseado no ping
    // 1: < 80ms, 2: < 150ms, 3: > 150ms
    const connectionQuality = pingMs < 80 ? 1 : pingMs < 150 ? 2 : 3;

    // 1. Timer de Conexão
    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 2. Lógica de PING REAL
    useEffect(() => {
        let pingInterval;

        const measurePing = () => {
            if (socketService.isConnected) {
                const start = Date.now();
                // Envia pacote de ping com timestamp atual
                socketService.send(JSON.stringify({
                    command: 'ping',
                    payload: { timestamp: start }
                }));
            }
        };

        const handlePong = (dataRaw) => {
            try {
                const packet = JSON.parse(dataRaw);
                // Servidor responde com status: 'pong' e o mesmo timestamp
                if (packet.status === 'pong') {
                    const end = Date.now();
                    const start = packet.body.timestamp;
                    const latency = end - start;
                    setPingMs(latency);
                }
            } catch (e) { console.error(e); }
        };

        // Registra o listener
        socketService.on('data', handlePong);

        // Começa a medir a cada 2 segundos
        measurePing(); // Primeira medição imediata
        pingInterval = setInterval(measurePing, 2000);

        return () => {
            clearInterval(pingInterval);
            socketService.off('data', handlePong);
        };
    }, []);

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: '269px', height: '85px' }}>
            
            <svg style={{ display: 'none' }}>
                <filter id="noiseFilterPanel">
                    <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.25 0"/>
                </filter>
            </svg>

            {isHoveringPing && (
                <div 
                    className="absolute z-50 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none border border-white/10 shadow-xl"
                    style={{ top: '-25px', left: '20px' }}
                >
                    {pingMs}ms
                </div>
            )}

            <div 
                className="relative w-full h-full bg-[#2B2929] overflow-hidden shadow-lg"
                style={{ borderRadius: '33px' }}
            >
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: '#524343', opacity: 0.25, filter: 'url(#noiseFilterPanel)' }}
                />

                <div 
                    className="absolute z-10 cursor-help flex items-center justify-center"
                    style={{ top: '10px', left: '27px', width: '20px', height: '20px' }}
                    onMouseEnter={() => setIsHoveringPing(true)}
                    onMouseLeave={() => setIsHoveringPing(false)}
                >
                    <SignalIcon quality={connectionQuality} />
                </div>

                <div 
                    className="absolute z-10 flex items-center"
                    style={{ top: '10px', left: '51px', height: '20px' }}
                >
                    <span className="text-[10px] font-bold text-[#00ff5e] font-sans tracking-wide">
                        Conectado :D
                    </span>
                </div>

                <div 
                    className="absolute z-10 truncate max-w-[120px]"
                    style={{ top: '45px', left: '27px' }}
                >
                    <span className="text-[13px] font-bold text-white block leading-tight">
                        {user.nick || user.name || "Usuário"}
                    </span>
                </div>

                <div 
                    className="absolute z-10"
                    style={{ top: '60px', left: '27px' }}
                >
                    <span className="text-[10px] text-gray-400 font-mono">
                        {formatTime(seconds)} de conexão
                    </span>
                </div>


            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL SIDEBAR ---

const ChatSidebar = ({
  chats = [],
  selectedId = null,
  onSelect,
  onAdd,
  isInRoom,
  onLeave,
  sidebarMode = 'rooms',
  onToggleSidebar,
  onlineUsers = [],
  onSelectUser,
  dmHistory = {},
  currentDmUserId,
  onCameraToggle, 
  isVideoEnabled
}) => {
  
  // --- ESTADOS DE BUSCA ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const roomItems = useMemo(
    () => (chats || []).map((c) => ({
        id: c.id,
        title: c.title || c.name || "Sem título",
        preview: c.preview || "",
        usersCount: c.usersCount,
      })),
    [chats]
  );

  const userItems = useMemo(
    () => (onlineUsers || []).map((u) => {
         const history = dmHistory[u.id] || [];
         const hasHistory = history.length > 0;
         return {
            id: u.id,
            title: u.nick,
            preview: hasHistory ? history[history.length - 1].text : "Clique para conversar",
            isUser: true,
            originalUser: u 
         };
      }),
    [onlineUsers, dmHistory]
  );

  const itemsToShow = sidebarMode === 'rooms' ? roomItems : userItems;
  
  const filteredItems = useMemo(() => {
      if (!searchTerm) return itemsToShow;
      return itemsToShow.filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [itemsToShow, searchTerm]);

  const hasItems = filteredItems && filteredItems.length > 0;
  const isRoomsMode = sidebarMode === 'rooms';
  const toggleButtonText = isRoomsMode ? "Mensagens Diretas" : "Conversas Públicas";
  const ToggleIcon = isRoomsMode ? peopleIcon : globeIcon;

  const selectedUserObj = useMemo(() => {
      if (!currentDmUserId) return null;
      return onlineUsers.find(u => u.id === currentDmUserId);
  }, [currentDmUserId, onlineUsers]);

  useEffect(() => {
      setIsSearchOpen(false);
      setSearchTerm("");
  }, [sidebarMode]);

  return (
    <aside className="relative flex h-full w-72 min-w-64 flex-col overflow-hidden rounded-[28px] bg-neutral-900 text-slate-100 ring-1 ring-white/10">
      
      <div className="pointer-events-none absolute inset-0 opacity-[0.2]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
             <defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0%" stopColor="#5b6572"/><stop offset="100%" stopColor="#3c424a"/></linearGradient></defs>
             <path d="M-50 120 C 150 60, 350 140, 560 100 S 980 120, 1100 60" fill="none" stroke="url(#tg)" strokeWidth="2"/>
             <path d="M-50 240 C 160 180, 360 300, 560 240 S 980 260, 1100 180" fill="none" stroke="url(#tg)" strokeWidth="2"/>
             <path d="M-50 360 C 160 300, 360 420, 560 360 S 980 380, 1100 300" fill="none" stroke="url(#tg)" strokeWidth="2"/>
        </svg>
      </div>

      <button
        onClick={onToggleSidebar}
        className="relative z-10 mt-[22px] ml-[13px] flex h-[32px] w-[calc(100%-25px)] items-center justify-center gap-2 rounded-[25px] bg-[#676767] text-[20px] font-bold text-white transition hover:bg-[#5a5a5a]"
        style={{ fontFamily: '"Istok Web Bold", sans-serif' }}
      >
        <span>{toggleButtonText}</span>
        <img src={ToggleIcon} alt="" className="h-6 w-6" />
      </button>

      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/15 min-h-[70px]">
        {isSearchOpen ? (
            <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                <SearchIcon className="w-5 h-5 text-gray-400" />
                <input 
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-lg font-medium"
                />
                <button 
                    onClick={() => { setIsSearchOpen(false); setSearchTerm(""); }}
                    className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                >
                    <CloseIcon />
                </button>
            </div>
        ) : (
            <>
                <div className="flex items-center gap-3 group">
                    <h2 className="text-3xl font-extrabold tracking-tight">
                        {isRoomsMode ? "Chats" : "Online"}
                    </h2>
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="text-gray-500 group-hover:text-white transition-colors duration-200 p-1.5 rounded-full hover:bg-white/5"
                        title="Buscar"
                    >
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </div>

                {isRoomsMode && !isInRoom && (
                <button
                    onClick={onAdd}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 p-1.5 text-slate-200/90 hover:bg-white/10 hover:text-white transition"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
                )}
            </>
        )}
      </div>

      <div className="relative z-10 flex-1 space-y-2 overflow-y-auto p-2">
        {!hasItems && (
          <div className="px-3 py-2 text-sm text-slate-400 text-center mt-4">
             {searchTerm 
                ? `Nenhum resultado para "${searchTerm}"`
                : (isRoomsMode 
                    ? "Nenhuma sala pública disponível :( Crie uma!" 
                    : "Ninguém online no momento.")}
          </div>
        )}

        {filteredItems.map((item) => {
          const isSelected = item.isUser 
                ? String(item.id) === String(currentDmUserId)
                : String(item.id) === String(selectedId);
          
          return (
            <button
              key={item.id}
              onClick={() => {
                  if (item.isUser) {
                      const originalUser = onlineUsers.find(u => u.id === item.id);
                      if (originalUser) onSelectUser(originalUser);
                  } else {
                      onSelect?.(item.id);
                  }
              }}
              className={`group block w-full rounded-xl px-3 py-3 text-left transition ${
                  isSelected ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="truncate text-[15px] font-semibold text-slate-100 flex items-center gap-2">
                  {item.isUser && (
                      <div className="w-2.5 h-2.5 bg-[#00ff5eff] rounded-full shadow-[0_0_5px_rgba(0,255,94,0.6)]"></div>
                  )}
                  {item.title}
                </div>

                {!item.isUser && item.usersCount > 0 && (
                  <div className="flex-shrink-0 ml-2">
                    <div style={{ width: 50, height: 25, backgroundColor: "#727272", opacity: 0.51, borderRadius: 20, display: "flex", alignItems: "center", paddingLeft: 8, gap: 4 }}>
                      <div style={{ width: 11, height: 11, backgroundColor: "#00ff5eff", borderRadius: "50%" }} className="animate-pulse" />
                      <span className="text-xs font-bold text-white-500" style={{ lineHeight: "12px"}}>{Math.min(item.usersCount, 5)}/5</span>
                    </div>
                  </div>
                )}
              </div>
              {item.preview ? <div className="mt-0.5 truncate text-xs text-slate-400 pl-0.5">{item.preview}</div> : null}
            </button>
          );
        })}
      </div>

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

      {!isRoomsMode && selectedUserObj && (
          <div className="relative z-10 p-4 border-t border-white/5 bg-black/20">
              <ConnectionStatusPanel 
                  user={selectedUserObj} 
                  onCameraToggle={onCameraToggle} 
                  isVideoEnabled={isVideoEnabled} 
              />
          </div>
      )}

    </aside>
  );
};

export default ChatSidebar;