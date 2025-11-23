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

  const [rooms, setRooms] = useState([]);
  const [chatContext, setChatContext] = useState('lobby'); // 'lobby' ou 'room'
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

  // Ref para "fila de ações" ---
  const nextActionRef = useRef(null);

  const messageRef = useRef(message);
  useEffect(() => {
    messageRef.current = message;
  }, [message]);


  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);


  // Função de Envio de Pacote
  const sendPacket = (command, payload = {}) => {
    const packet = { command, payload };
    socketService.send(JSON.stringify(packet));
  };

  // --- useEffect CORRIGIDO ---
  useEffect(() => {

    // Listener para DADOS recebidos
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

          // --- 1. Feedback de mensagem enviada pelo próprio usuário ---
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

          // --- 4. [CORREÇÃO] Entrar ou Criar Sala (Lógica Unificada) ---
          // Verifica se o pacote contém dados da sala (roomName e roomId)
          if (packet.body.roomName && packet.body.roomId !== undefined) {
            const { roomName, roomId } = packet.body;

            // A. Define o contexto para 'room' (Libera o input de chat!)
            setChatContext('room');
            
            // B. Atualiza a sala atual
            const newRoomObj = { id: roomId, name: roomName, usersCount: 1 };
            setCurrentRoom(newRoomObj);

            // C. Atualiza status e limpa chat antigo
            setStatusMessage(`Conectado à sala: ${roomName}`);
            setChatMessages([]);

            // D. Atualiza a Sidebar (Adiciona a sala visualmente se ela não existir)
            setRooms(prevRooms => {
                const exists = prevRooms.some(r => r.id === roomId);
                if (exists) return prevRooms; // Se já existe, não mexe
                return [...prevRooms, newRoomObj]; // Se é nova, adiciona com contador 1
            });

          }

          // --- 5. Retorno ao Lobby (Sair da sala) ---
          if (packet.body.msg === 'Você retornou ao lobby.') {
            setChatContext('lobby');
            setCurrentRoom(null);
            setStatusMessage(`Conectado como ${userNameRef.current}. No Lobby.`);
            setChatMessages([]);

            // Checa se há uma ação na fila (ex: entrar em outra sala imediatamente)
            if (nextActionRef.current) {
              sendPacket(nextActionRef.current.command, nextActionRef.current.payload);
              nextActionRef.current = null; 
            } else {
              sendPacket('list', { entity: 'rooms' });
            }
          }

        } else if (packet.status === 'broadcast') {
          
          // --- Broadcast de atualizações ---
          if (packet.body.type === 'room-list-update') {
            setRooms(packet.body.rooms);
          } else {
            // Mensagens de chat de outros usuários
            setChatMessages(prev => [...prev, {
              sender: packet.body.sender,
              text: packet.body.message,
              time: timestamp
            }]);
          }
        }

      } catch (e) { console.warn('Recebido dado não-JSON:', data, e); }
    };

    // Listener para STATUS da conexão
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !isConnected || !userName) return;

    if (chatContext === 'room') {
      sendPacket('message', { message: message });
    } else {
      setErrorMessage('Você precisa estar em uma sala para enviar mensagens.');
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
    if (currentRoom?.id === roomId) return; 

    const roomToJoin = rooms.find(r => r.id === roomId);
    if (!roomToJoin) return; 

    if (chatContext === 'room') {
      setConfirmPopupProps({
        title: 'Mudar de Sala',
        message: `Deseja sair da sala atual e entrar em "${roomToJoin.name}"?`,
        onConfirm: () => executeLeaveAndJoin(roomId),
      });
      setIsConfirmPopupOpen(true);
    } else {
      sendPacket('join', { roomId });
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
    if (chatContext === 'lobby') {
      sendPacket('create', { roomName });
      setIsCreateRoomPopupOpen(false);
    } else {
      setErrorMessage('Você deve estar no Lobby para criar uma sala.');
      setIsErrorPopupOpen(true);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return (
          <>
            <ChatPage
              setCurrentPage={setCurrentPage}
              isConnected={isConnected}
              message={message}
              setMessage={setMessage}
              chatMessages={chatMessages}
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

              // Props da Sidebar
              rooms={rooms}
              currentRoomId={currentRoom?.id}
              handleJoinRoom={handleJoinRoom}
              handleLeaveRoom={handleLeaveRoom}
              isInRoom={chatContext === 'room'}
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