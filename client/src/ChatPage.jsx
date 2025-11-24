import React, { useEffect, useRef, useState } from 'react';
import ChatSidebar from './components/ChatSidebar.jsx';
import InfoBackground from './components/InfoBackground.jsx';
import SettingsIcon from './assets/config-icon.png';
import SendIcon from './assets/send-icon.png';
import ChatMessage from './components/ChatMessage.jsx';
import PopupNome from './components/PopUpNome.jsx';
import PopupErro from './components/PopUpErro.jsx';
import PopupCriarSala from './components/PopupCriarSala.jsx';
import VideoCall from './components/VideoCall.jsx'; 

function ChatPage({
  setCurrentPage,
  isConnected,
  message,
  setMessage,
  chatMessages,
  statusMessage,
  handleConnect,
  handleSendMessage,
  
  // Popups
  isNicknamePopupOpen,
  handleSetNickname,
  isErrorPopupOpen,
  setIsErrorPopupOpen,
  errorMessage,
  isCreateRoomPopupOpen,
  setIsCreateRoomPopupOpen,
  handleCreateRoom,
  
  // Props da Sidebar Antigas
  rooms,
  currentRoomId,
  handleJoinRoom,
  handleLeaveRoom,
  isInRoom,

  // --- NOVAS PROPS PARA DM ---
  sidebarMode,
  onToggleSidebar,
  onlineUsers,
  onSelectUser,
  dmHistory,
  currentDmUserId,
  myId // ID local vindo do App.jsx
}) {
  
  const chatAreaRef = useRef(null);
  
  // Estado para controlar a visibilidade do vídeo
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  // Resetar o vídeo se mudar de usuário
  useEffect(() => {
    setIsVideoEnabled(false);
  }, [currentDmUserId, sidebarMode]);

  // Auto-scroll
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const canType = (isConnected && !isNicknamePopupOpen) && (isInRoom || (sidebarMode === 'users' && currentDmUserId));

  // --- LÓGICA DE VÍDEO ---
  const isDM = sidebarMode === 'users' && currentDmUserId;
  const canRenderVideo = isDM && isVideoEnabled && myId && currentDmUserId;
  const amICaller = canRenderVideo ? (String(myId) > String(currentDmUserId)) : false;

  const getPlaceholder = () => {
      if (!isConnected) return 'Conecte-se para enviar mensagens';
      if (isInRoom) return 'Digite sua mensagem na sala...';
      if (currentDmUserId) return 'Digite sua mensagem privada...';
      return 'Entre em uma sala ou selecione um usuário';
  };

  // Função para forçar o fechamento do vídeo (usada quando o outro desliga)
  const handleRemoteHangup = () => {
      console.log("📴 O outro usuário encerrou a chamada.");
      setIsVideoEnabled(false);
  };

  const renderChatContent = () => (
    <>
        <div className="absolute inset-0 bg-imagemchat bg-repeat invert opacity-20 pointer-events-none"></div>
        <div
          ref={chatAreaRef}
          className="absolute top-0 left-0 right-0 bottom-24 px-6 overflow-y-auto custom-scrollbar"
        >
          {chatMessages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
        </div>
        
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Istok+Web:ital,wght@1,700&display=swap');
            .custom-placeholder::placeholder {
                font-family: 'Istok Web', sans-serif; font-weight: 700; font-style: italic; color: #FFFFFF;
            }
            .custom-scrollbar::-webkit-scrollbar { width: 12px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #555;
                border-radius: 10px;
                border: 3px solid transparent;
                background-clip: content-box;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #888; }
        `}</style>
        
        <div className="absolute bottom-[26px] left-[35px] right-[35px]">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={getPlaceholder()}
                disabled={!canType}
                className="flex-grow w-full bg-[#404040] text-white rounded-[50px] p-4 pr-[70px] focus:outline-none focus:ring-2 focus:ring-cyan-500 custom-placeholder disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                />
                <button
                type="submit"
                disabled={!canType}
                className="absolute right-[14px] w-[42px] h-[42px] bg-white rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                >
                <img src={SendIcon} alt="Enviar" className="w-[30px] h-[30px]" />
                </button>
            </form>
        </div>
    </>
  );

  return (
    <div className="flex h-full gap-6 p-6" style={{ backgroundColor: '#242323' }}>
      
      {/* Popups */}
      <PopupNome isOpen={isNicknamePopupOpen} onClose={() => {}} onConfirm={handleSetNickname} />
      <PopupErro isOpen={isErrorPopupOpen} onClose={() => setIsErrorPopupOpen(false)} message={errorMessage || "Ocorreu um erro desconhecido."} />
      <PopupCriarSala isOpen={isCreateRoomPopupOpen} onClose={() => setIsCreateRoomPopupOpen(false)} onConfirm={handleCreateRoom} />

      <ChatSidebar
        chats={rooms}
        selectedId={currentRoomId}
        onSelect={handleJoinRoom}
        onAdd={() => setIsCreateRoomPopupOpen(true)}
        isInRoom={isInRoom}
        onLeave={handleLeaveRoom}
        sidebarMode={sidebarMode}
        onToggleSidebar={onToggleSidebar}
        onlineUsers={onlineUsers}
        onSelectUser={onSelectUser}
        dmHistory={dmHistory}
        currentDmUserId={currentDmUserId}
      />
      
      <InfoBackground className="flex-1">
        <div className="flex flex-col h-full p-4">
          
          <header className="flex justify-between items-center mb-4 flex-shrink-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-400">Concord</h1>
              <p className="text-gray-400">{statusMessage}</p>
            </div>
            
            <div className="flex items-center gap-4">
                 {/* Botão de Câmera (Só aparece em DM) */}
                 {isDM && (
                    <button
                    onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                        isVideoEnabled 
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                        : "bg-[#404040] hover:bg-cyan-500 text-gray-200 hover:text-white"
                    }`}
                    title={isVideoEnabled ? "Desligar Câmera" : "Ligar Câmera"}
                    >
                     {/* Ícone de Câmera SVG */}
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                     </svg>
                    </button>
                )}

                <button
                onClick={() => setCurrentPage('settings')}
                className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors duration-200 cursor-pointer"
                >
                <span className="font-semibold">Configurações →</span>
                <img src={SettingsIcon} alt="Configurações" className="w-10 h-10" />
                </button>
            </div>
          </header>

          {!isConnected && (
            <div className="mb-4 flex-shrink-0">
              <button
                onClick={handleConnect}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Conectar ao Servidor
              </button>
            </div>
          )}
          
          {/* =====================================================
             CONTAINER PRINCIPAL DO CHAT / VÍDEO
             =====================================================
          */}
          
          {/* Se estiver em chamada de vídeo válida, renderiza o container do topo */}
          {canRenderVideo && (
             <div className="h-1/2 w-full bg-[#242222] border-b border-white/10 relative z-20 flex-shrink-0 rounded-t-xl mb-1 overflow-hidden">
                 <VideoCall targetUserId={currentDmUserId} isCaller={amICaller} onCallEnded={handleRemoteHangup}/>
             </div>
          )}

          {/* Área do Chat (Mensagens + Input) */}
          {/* - Se o vídeo existe: isso ocupa a outra metade (flex-1 ou h-1/2 implícito pelo flex container)
              - Se vídeo NÃO existe: flex-grow faz ele ocupar TODO o espaço restante (comportamento original)
          */}
          <div className={`relative bg-[#353333] overflow-hidden rounded-xl w-full transition-all duration-300 ${
              canRenderVideo ? 'h-1/2 rounded-t-none' : 'flex-grow'
          }`}>
             {/* Função que renderiza o conteúdo original com positions absolute */}
             {renderChatContent()}
             
             {/* Feedback visual se o vídeo estiver "ligado" mas aguardando conexão */}
             {isDM && isVideoEnabled && (!myId || !currentDmUserId) && (
                 <div className="absolute top-0 left-0 right-0 bg-yellow-600/80 text-white text-xs p-1 text-center z-50">
                     Aguardando conexão para iniciar vídeo...
                 </div>
             )}
          </div>

        </div>
      </InfoBackground>
    </div>
  );
}

export default ChatPage;