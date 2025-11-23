import React, { useState, useEffect, useRef } from 'react';
import ChatPage from './ChatPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import PopupConfirm from './components/PopupConfirm.jsx';
import VideoCall from './components/VideoCall.jsx';
import socketService from './services/socketService.js';
// VideoCall integrated

function App() {
  const [currentPage, setCurrentPage] = useState('chat');
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Pronto para conectar.');
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userName, setUserName] = useState(null);
  const [nickChangeStatus, setNickChangeStatus] = useState({ status: 'idle', message: '' });
  const nickCommandFromSettings = useRef(false);

  // --- NOVOS ESTADOS PARA DM E SIDEBAR ---
  const [sidebarMode, setSidebarMode] = useState('rooms'); // 'rooms' ou 'users'
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentDmUser, setCurrentDmUser] = useState(null); // Usuário atual da DM
  
  // Histórico de DMs persistente (Carrega do localStorage ao iniciar)
  const [dmHistory, setDmHistory] = useState(() => {
    const saved = localStorage.getItem('chat_dms');
    return saved ? JSON.parse(saved) : {}; 
  });
  // ----------------------------------------

  const [rooms, setRooms] = useState([]);
  const [chatContext, setChatContext] = useState('lobby'); // 'lobby', 'room' ou 'dm'
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);

  // Popups
  const [isNicknamePopupOpen, setIsNicknamePopupOpen] = useState(false);
  const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreateRoomPopupOpen, setIsCreateRoomPopupOpen] = useState(false);

  // Estados para o Popup de Confirmação
  const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false);
  const [confirmPopupProps, setConfirmPopupProps] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Ref para "fila de ações"
  const nextActionRef = useRef(null);

  const messageRef = useRef(message);
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // --- EFEITO PARA SALVAR O CACHE DE DMs ---
  useEffect(() => {
    localStorage.setItem('chat_dms', JSON.stringify(dmHistory));
  }, [dmHistory]);

  // Função de Envio de Pacote
  const sendPacket = (command, payload = {}) => {
    const packet = { command, payload };
    socketService.send(JSON.stringify(packet));
  };

  // --- useEffect PRINCIPAL (Listeners) ---
  useEffect(() => {

    const handleData = (data) => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      try {
        const packet = JSON.parse(data);

        if (packet.status === 'error') {
          // --- LÓGICA DE ERRO ---
          if (nickCommandFromSettings.current) {
            setNickChangeStatus({ status: 'error', message: packet.body.msg });
            nickCommandFromSettings.current = false; 
          } else {
            console.error('Erro do Servidor:', packet.body.msg);
            setErrorMessage(packet.body.msg);
            setIsErrorPopupOpen(true);
          }

        } else if (packet.status === 'success') {

          // --- 1. Feedback de mensagem enviada (Lobby/Sala) ---
          if (packet.body.msg === messageRef.current) {
            setChatMessages(prev => [...prev, {
              sender: 'Você', 
              text: packet.body.msg,
              time: timestamp
            }]);
            setMessage(''); 
          }

          // --- 2. Alteração de Nickname ---
          else if (packet.body.newNick) {
            setUserName(packet.body.newNick);
            setStatusMessage(`Conectado como ${packet.body.newNick}.`);

            if (nickCommandFromSettings.current) {
              setNickChangeStatus({ status: 'success', message: `Nickname alterado para ${packet.body.newNick}!` });
              nickCommandFromSettings.current = false; 
            }
          }

          // --- 3. Recebimento da lista de salas ---
          if (packet.body.rooms) {
            setRooms(packet.body.rooms);
            if (currentRoom) {
              const foundRoom = packet.body.rooms.find(r => r.id === currentRoom.id);
              if (foundRoom) setCurrentRoom(foundRoom);
            }
          }
          
          // --- 4. [NOVO] Recebimento da lista de usuários online ---
          if (packet.body.users) {
             // Filtra para não mostrar a si mesmo na lista
            const myName = userNameRef.current;
             const others = packet.body.users.filter(u => u.nick !== myName);
             setOnlineUsers(others);
          }

          // --- 5. Entrar ou Criar Sala (Lógica Unificada) ---
          if (packet.body.roomName && packet.body.roomId !== undefined) {
            const { roomName, roomId } = packet.body;

            setChatContext('room');
            
            // Define usersCount: 1 manualmente para feedback instantâneo
            const newRoomObj = { id: roomId, name: roomName, usersCount: 1 };
            setCurrentRoom(newRoomObj);

            setStatusMessage(`Conectado à sala: ${roomName}`);
            setChatMessages([]);

            setRooms(prevRooms => {
                const exists = prevRooms.some(r => r.id === roomId);
                if (exists) return prevRooms; 
                return [...prevRooms, newRoomObj];
            });
            // Obs: Não enviamos 'list rooms' aqui para evitar erro de entidade.
          }

          // --- 6. Retorno ao Lobby ---
if (packet.body.msg === 'Você retornou ao lobby.') {
            
            // Verifica se a saída foi provocada por uma intenção de ir para DM
            if (nextActionRef.current && nextActionRef.current.type === 'GO_TO_DM') {
                const targetUser = nextActionRef.current.user;
                
                setChatContext('dm');
                setCurrentDmUser(targetUser);
                setStatusMessage(`Conversando com ${targetUser.nick}`);
                setCurrentRoom(null); // Limpa a sala anterior da memória
                setChatMessages([]);
                
                nextActionRef.current = null; // Limpa a ação
            } 
            // Verifica se foi provocada por uma intenção de ir para outra SALA
            else if (nextActionRef.current && nextActionRef.current.command) {
                setChatContext('lobby');
                setCurrentRoom(null);
                setChatMessages([]);
                sendPacket(nextActionRef.current.command, nextActionRef.current.payload);
                nextActionRef.current = null;
            } 
            // Saída normal (clicou em Sair)
            else {
                setChatContext('lobby');
                setCurrentRoom(null);
                setStatusMessage(`Conectado como ${userNameRef.current}. No Lobby.`);
                setChatMessages([]);
                sendPacket('list', { entity: 'rooms' });
            }
          }

        } 
        // --- [NOVO] CONFIRMAÇÃO DE ENVIO DE DM ---
        else if (packet.status === 'success-dm') {
            const { targetId, message } = packet.body;
            setDmHistory(prev => {
                const conversation = prev[targetId] || [];
                return {
                    ...prev,
                    [targetId]: [...conversation, { sender: 'Você', text: message, time: timestamp }]
                };
            });
        }
        // --- [NOVO] RECEBIMENTO DE DM ---
        else if (packet.status === 'direct-message') {
            const { senderId, senderNick, message } = packet.body;
            setDmHistory(prev => {
                const conversation = prev[senderId] || [];
                return {
                    ...prev,
                    [senderId]: [...conversation, { sender: senderNick, text: message, time: timestamp }]
                };
            });
        }
        // --- BROADCASTS ---
        else if (packet.status === 'broadcast') {
          if (packet.body.type === 'room-list-update') {
            setRooms(packet.body.rooms);
          } else {
            // Mensagens de chat de outros usuários (Sala/Lobby)
            setChatMessages(prev => [...prev, {
              sender: packet.body.sender,
              text: packet.body.message,
              time: timestamp
            }]);
          }
        }

      } catch (e) { console.warn('Recebido dado não-JSON:', data, e); }
    };

    const handleStatus = (status) => {
      setIsConnected(status.connected);
      if (status.connected) {
        setStatusMessage('Conectado! Por favor, defina seu nickname.');
        setIsNicknamePopupOpen(true);
      } else {
        setStatusMessage(status.error ? `Erro: ${status.error}` : 'Desconectado.');
        setUserName(null);
        setIsNicknamePopupOpen(false);
        setRooms([]);
        setChatContext('lobby');
        setCurrentRoom(null);
        nextActionRef.current = null; 
        if (status.error) {
          setErrorMessage(status.error);
          setIsErrorPopupOpen(true);
        }
      }
    };

    socketService.on('data', handleData);
    socketService.on('status', handleStatus);

    return () => {
      socketService.off('data', handleData);
      socketService.off('status', handleStatus);
    };
  }, []); 

  // --- Handlers de Ação ---

  const handleConnect = () => {
    if (isConnected) return;
    setStatusMessage('Tentando conectar...');
    socketService.connect();
  };

  const handleSetNickname = (name) => {
    if (name) {
      setUserName(name);
      sendPacket('nick', { nickname: name });
      setIsNicknamePopupOpen(false);
      setStatusMessage(`Conectado como ${name}. No Lobby.`);
      sendPacket('list', { entity: 'rooms' });
    }
  };

  // --- [ATUALIZADO] Envio de Mensagens (Lobby / Sala / DM) ---
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !isConnected || !userName) return;

    if (chatContext === 'room') {
      sendPacket('message', { message: message });
    } else if (chatContext === 'dm' && currentDmUser) {
      // Envio de DM
      sendPacket('dm', { targetId: currentDmUser.id, message: message });
      setMessage(''); // Limpa input (o feedback vem no success-dm)
    } else {
      setErrorMessage('Você precisa estar em uma sala ou conversa privada.');
      setIsErrorPopupOpen(true);
      setMessage('');
    }
  };

  const handleUpdateNickname = (name) => {
    if (!isConnected) return;
    if (name.trim() === userName) return; 

    nickCommandFromSettings.current = true;
    sendPacket('nick', { nickname: name.trim() });
  };

  const resetNickChangeStatus = () => {
    setNickChangeStatus({ status: 'idle', message: '' });
  };

  const executeLeaveAndJoin = (roomId) => {
    if (!isConnected) return;
    nextActionRef.current = { command: 'join', payload: { roomId } };
    sendPacket('leave');
    setIsConfirmPopupOpen(false);
  };

  const handleJoinRoom = (roomId) => {
    if (!isConnected) return;
    
    if (chatContext === 'room' && currentRoom?.id === roomId) return; 

    const roomToJoin = rooms.find(r => r.id === roomId);
    if (!roomToJoin) return; 

    if (chatContext === 'room') {
      setConfirmPopupProps({
        title: 'Mudar de Sala',
        message: `Deseja sair da sala atual e entrar em "${roomToJoin.name}"?`,
        onConfirm: () => executeLeaveAndJoin(roomId),
      });
      setIsConfirmPopupOpen(true);
    } 
    else {

        if (currentRoom?.id === roomId) {
             // Apenas restaura a visão
             setChatContext('room');
             setStatusMessage(`Conectado à sala: ${roomToJoin.name}`);
        } else {
             // Manda o comando para o servidor
             sendPacket('join', { roomId });
        }
    }
  };

  const handleLeaveRoom = () => {
    if (!isConnected) return;
    if (chatContext === 'room') {
      sendPacket('leave');
    }
  };

  const handleCreateRoom = (roomName) => {
      if (!isConnected) return;


      if (chatContext === 'lobby' || chatContext === 'dm') {
        sendPacket('create', { roomName });
        setIsCreateRoomPopupOpen(false);
      } else {
        setErrorMessage('Você deve sair da sala atual antes de criar uma nova.');
        setIsErrorPopupOpen(true);
      }
  };

  // --- [NOVO] Handlers para Sidebar de Usuários ---
  const handleToggleSidebar = () => {
    if (sidebarMode === 'rooms') {
        setSidebarMode('users');
        sendPacket('list_all_users'); // Pede lista atualizada
    } else {
        setSidebarMode('rooms');
    }
  };

  const handleSelectUser = (userTarget) => {
      // Se estiver em uma sala, sai dela primeiro
      if (chatContext === 'room') {
          // Prepara a "próxima ação" para ser executada quando o servidor confirmar a saída
          nextActionRef.current = { type: 'GO_TO_DM', user: userTarget };
          sendPacket('leave');
      } else {
          // Se já estiver no Lobby ou em outra DM, troca direto
          setChatContext('dm');
          setCurrentDmUser(userTarget);
          setSidebarMode('users'); // Garante que a sidebar continue na lista
          setStatusMessage(`Conversando com ${userTarget.nick}`);
      }
    };

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        // Define quais mensagens mostrar (Sala ou DM)
        let messagesToDisplay = [];
        if (chatContext === 'dm' && currentDmUser) {
            messagesToDisplay = dmHistory[currentDmUser.id] || [];
        } else {
            messagesToDisplay = chatMessages;
        }

        return (
          <>
            <ChatPage
              setCurrentPage={setCurrentPage}
              isConnected={isConnected}
              message={message}
              setMessage={setMessage}
              chatMessages={messagesToDisplay} // Passa lista dinâmica
              statusMessage={statusMessage}
              handleConnect={handleConnect}
              handleSendMessage={handleSendMessage}

              // Popups
              isNicknamePopupOpen={isNicknamePopupOpen}
              handleSetNickname={handleSetNickname}
              isErrorPopupOpen={isErrorPopupOpen}
              setIsErrorPopupOpen={setIsErrorPopupOpen}
              errorMessage={errorMessage}

              // Popup Criar Sala
              isCreateRoomPopupOpen={isCreateRoomPopupOpen}
              setIsCreateRoomPopupOpen={setIsCreateRoomPopupOpen}
              handleCreateRoom={handleCreateRoom}

              // Props da Sidebar (Atualizadas)
              rooms={rooms}
              currentRoomId={currentRoom?.id}
              handleJoinRoom={handleJoinRoom}
              handleLeaveRoom={handleLeaveRoom}
              isInRoom={chatContext === 'room'}
              
              // Novas Props DM
              sidebarMode={sidebarMode}
              onToggleSidebar={handleToggleSidebar}
              onlineUsers={onlineUsers}
              onSelectUser={handleSelectUser}
              dmHistory={dmHistory}
              currentDmUserId={currentDmUser?.id}
            />
            
            <PopupConfirm
              isOpen={isConfirmPopupOpen}
              onClose={() => setIsConfirmPopupOpen(false)}
              onConfirm={confirmPopupProps.onConfirm}
              title={confirmPopupProps.title}
              message={confirmPopupProps.message}
            />
            <VideoCall targetUserId="self-test" isCaller={true} />
          </>
        );

      case 'settings':
        return (
          <SettingsPage
            setCurrentPage={setCurrentPage}
            currentNickname={userName}
            handleUpdateNickname={handleUpdateNickname}
            nickChangeStatus={nickChangeStatus}
            resetNickChangeStatus={resetNickChangeStatus}
          />
        );
      default:
        return <div>Página não encontrada</div>;
    }
  };

  return (
    <div className="bg-gray-900 text-white h-screen font-mono">
      {renderPage()}
    </div>
  );
}

export default App;