import React, { useEffect, useRef } from 'react';
import ChatSidebar from './components/ChatSidebar.jsx';
import InfoBackground from './components/InfoBackground.jsx';
import SettingsIcon from './assets/config-icon.png';
import SendIcon from './assets/send-icon.png';
import ChatMessage from './components/ChatMessage.jsx';
import PopupNome from './components/PopUpNome.jsx';
import PopupErro from './components/PopUpErro.jsx';
import PopupCriarSala from './components/PopupCriarSala.jsx';

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

  // --- NOVAS PROPS PARA DM (Recebidas do App.jsx) ---
  sidebarMode,
  onToggleSidebar,
  onlineUsers,
  onSelectUser,
  dmHistory,
  currentDmUserId
}) {
  
  const chatAreaRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Lógica para saber se pode digitar:
  // Pode digitar se estiver numa sala OU se estiver numa DM com usuário selecionado
  const canType = (isConnected && !isNicknamePopupOpen) && (isInRoom || (sidebarMode === 'users' && currentDmUserId));

  // Texto do Placeholder dinâmico
  const getPlaceholder = () => {
      if (!isConnected) return 'Conecte-se para enviar mensagens';
      if (isInRoom) return 'Digite sua mensagem na sala...';
      if (currentDmUserId) return 'Digite sua mensagem privada...';
      return 'Entre em uma sala ou selecione um usuário';
  };

  return (
    <div className="flex h-full gap-6 p-6" style={{ backgroundColor: '#242323' }}>
      
      {/* Popups */}
      <PopupNome
        isOpen={isNicknamePopupOpen}
        onClose={() => {}}
        onConfirm={handleSetNickname}
      />
      <PopupErro
        isOpen={isErrorPopupOpen}
        onClose={() => setIsErrorPopupOpen(false)}
        message={errorMessage || "Ocorreu um erro desconhecido."}
      />
      <PopupCriarSala
        isOpen={isCreateRoomPopupOpen}
        onClose={() => setIsCreateRoomPopupOpen(false)}
        onConfirm={handleCreateRoom}
      />

      {/* --- SIDEBAR CONECTADA --- */}
      <ChatSidebar
        chats={rooms}
        selectedId={currentRoomId}
        onSelect={handleJoinRoom}
        onAdd={() => setIsCreateRoomPopupOpen(true)}
        
        isInRoom={isInRoom}
        onLeave={handleLeaveRoom}

        // --- REPASSANDO AS NOVAS PROPS PARA A SIDEBAR ---
        sidebarMode={sidebarMode}
        onToggleSidebar={onToggleSidebar} // <--- O culpado estava aqui (faltava passar)
        onlineUsers={onlineUsers}
        onSelectUser={onSelectUser}
        dmHistory={dmHistory}
        currentDmUserId={currentDmUserId}
      />
      
      <InfoBackground className="flex-1">
        <div className="flex flex-col h-full p-4">
          <header className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-400">Concord</h1>
              <p className="text-gray-400">{statusMessage}</p>
            </div>
            <button
              onClick={() => setCurrentPage('settings')}
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors duration-200 cursor-pointer"
            >
              <span className="font-semibold">Configurações →</span>
              <img src={SettingsIcon} alt="Configurações" className="w-10 h-10" />
            </button>
          </header>

          {/* Botão de Conectar */}
          {!isConnected && (
            <div className="mb-4">
              <button
                onClick={handleConnect}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Conectar ao Servidor
              </button>
            </div>
          )}
          
          {/* Área do Chat */}
          <div className="flex-grow relative bg-[#353333] overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-imagemchat bg-repeat invert opacity-20"></div>
            <div
              ref={chatAreaRef}
              className="absolute top-0 left-0 right-0 bottom-24 px-6 overflow-y-auto custom-scrollbar"
            >
              {chatMessages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
            </div>
            
            <>
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Istok+Web:ital,wght@1,700&display=swap');
                .custom-placeholder::placeholder {
                  font-family: 'Istok Web', sans-serif; font-weight: 700; font-style: italic; color: #FFFFFF;
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: #555;
                  border-radius: 10px;
                  border: 3px solid transparent;
                  background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background-color: #888;
                }
              `}</style>
              <div className="absolute bottom-[26px] left-[35px] right-[35px]">
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={getPlaceholder()} // Placeholder dinâmico
                    disabled={!canType} // Lógica atualizada
                    className="flex-grow w-full bg-[#404040] text-white rounded-[50px] p-4 pr-[70px] focus:outline-none focus:ring-2 focus:ring-cyan-500 custom-placeholder disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!canType} // Lógica atualizada
                    className="absolute right-[14px] w-[42px] h-[42px] bg-white rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    <img src={SendIcon} alt="Enviar" className="w-[30px] h-[30px]" />
                  </button>
                </form>
              </div>
            </>
          </div>
        </div>
      </InfoBackground>
    </div>
  );
}

export default ChatPage;