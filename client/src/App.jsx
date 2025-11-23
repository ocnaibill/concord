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
  // Removemos a checagem 'if (isConnected)' daqui.
  // A checagem será feita nos handlers (ex: handleCreateRoom)
  // Isso evita que o listener 'onTcpData' tenha um 'sendPacket' com estado stale.
  const sendPacket = (command, payload = {}) => {
    const packet = { command, payload };
    socketService.send(JSON.stringify(packet));
  };

  // --- (Request 2) useEffect CORRIGIDO ---
  // Dependência [ ] vazia é CRUCIAL. Roda SÓ UMA VEZ.
  useEffect(() => {

    // Listener para DADOS recebidos
    const handleData = (data) => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // O socketService já envia a mensagem crua, mas pode vir múltiplas se fosse TCP puro.
      // Como é WebSocket, geralmente vem frames completos, mas vamos manter a robustez se necessário.
      // No caso do WebSocket, 'data' é a mensagem.

      try {
        const packet = JSON.parse(data);

        if (packet.status === 'error') {
          // --- LÓGICA DE ERRO ATUALIZADA ---
          // Se o erro foi causado por uma tentativa da SettingsPage...
          if (nickCommandFromSettings.current) {
            // ...envia o erro para o estado do toast, em vez do popup global
            setNickChangeStatus({ status: 'error', message: packet.body.msg });
            nickCommandFromSettings.current = false; // Reseta a flag
          } else {
            // Senão, é um erro global (join, list, etc.)
            console.error('Erro do Servidor:', packet.body.msg);
            setErrorMessage(packet.body.msg);
            setIsErrorPopupOpen(true);
          }

        } else if (packet.status === 'success') {

          // --- LÓGICA DE SUCESSO ATUALIZADA ---
          if (packet.body.msg === messageRef.current) {
            setChatMessages(prev => [...prev, {
              sender: 'Você', // Mostra como "Você"
              text: packet.body.msg,
              time: timestamp
            }]);
            setMessage(''); // Limpa o input
          }

          else if (packet.body.newNick) {
            // O comando 'nick' foi um sucesso
            setUserName(packet.body.newNick); // Define o nome de usuário
            setStatusMessage(`Conectado como ${packet.body.newNick}.`); // Atualiza status global

            // Se foi a SettingsPage que pediu...
            if (nickCommandFromSettings.current) {
              // ...envia a mensagem de sucesso para o estado do toast
              setNickChangeStatus({ status: 'success', message: `Nickname alterado para ${packet.body.newNick}!` });
              nickCommandFromSettings.current = false; // Reseta a flag
            }
          }

          // 1. Sucesso ao pedir a lista de salas
          if (packet.body.rooms) {
            setRooms(packet.body.rooms);
            if (currentRoom?.id === 'temp_id') {
              const foundRoom = packet.body.rooms.find(r => r.name === currentRoom.name);
              if (foundRoom) setCurrentRoom(foundRoom);
            }
          }

          // ... (lógica de criar/entrar sala)
          if (packet.body.msg && packet.body.msg.startsWith('Você criou a sala')) {
            const roomName = packet.body.msg.replace('Você criou a sala ', '').replace('.', '');

            // 1. Cria o objeto da nova sala
            const newRoom = { id: 'temp_id', name: roomName };

            // 2. Atualiza o estado da lista de salas (para a sidebar)
            setRooms(prevRooms => [...prevRooms, newRoom]);

            // 3. Define o contexto e a sala atual
            setChatContext('room');
            setCurrentRoom(newRoom);

            setStatusMessage(`Conectado à sala: ${roomName}`);
            setChatMessages([]);

            // 4. REMOVIDO: sendPacket('list', { entity: 'rooms' });
          }
          // --- *** FIM DA CORREÇÃO *** ---

          if (packet.body.msg && packet.body.msg.startsWith('Você entrou na sala')) {
            const roomName = packet.body.msg.replace('Você entrou na sala ', '').replace('.', '');
            const joinedRoom = rooms.find(r => r.name === roomName);

            setChatContext('room');
            setCurrentRoom(joinedRoom || { id: 'unknown', name: roomName });
            setStatusMessage(`Conectado à sala: ${roomName}`);
            setChatMessages([]);
          }

          // --- (Request 3) Sucesso ao sair e checagem da "fila de ações" ---
          if (packet.body.msg === 'Você retornou ao lobby.') {
            setChatContext('lobby');
            setCurrentRoom(null);
            setStatusMessage(`Conectado como ${userNameRef.current}. No Lobby.`);
            setChatMessages([]);

            // Checa se há uma ação na fila (ex: entrar em outra sala)
            if (nextActionRef.current) {
              sendPacket(nextActionRef.current.command, nextActionRef.current.payload);
              nextActionRef.current = null; // Limpa a fila
            } else {
              // Se não houver, apenas atualiza a lista de salas
              sendPacket('list', { entity: 'rooms' });
            }
          }

        } else if (packet.status === 'broadcast') {

          // --- GRANDE MUDANÇA AQUI ---

          // 2. Em um 'broadcast' (quando estamos em outra sala)
          if (packet.body.type === 'room-list-update') {
            setRooms(packet.body.rooms); // Atualiza a lista de salas DIRETAMENTE

            // Lógica antiga de broadcast de chat
          } else {
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
        // ... (lógica de desconexão)
        setStatusMessage(status.error ? `Erro: ${status.error}` : 'Desconectado.');
        setUserName(null);
        setIsNicknamePopupOpen(false);
        setRooms([]);
        setChatContext('lobby');
        setCurrentRoom(null);
        nextActionRef.current = null; // Limpa fila de ações
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
  }, []); // <-- Array VAZIO é crucial!

  // --- Handlers de Ação (com checagem de conexão) ---

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
    if (name.trim() === userName) return; // Não faz nada se for o mesmo nome

    // Ativa a flag para o 'onTcpData' saber de onde veio o comando
    nickCommandFromSettings.current = true;
    sendPacket('nick', { nickname: name.trim() });
  };

  // --- NOVA FUNÇÃO (para o Toast fechar) ---
  const resetNickChangeStatus = () => {
    setNickChangeStatus({ status: 'idle', message: '' });
  };


  // --- (Request 3) Handler para sair e entrar em seguida ---
  const executeLeaveAndJoin = (roomId) => {
    if (!isConnected) return;
    nextActionRef.current = { command: 'join', payload: { roomId } };
    sendPacket('leave');
    setIsConfirmPopupOpen(false);
  };

  // --- (Request 3) Handler de "Join" ATUALIZADO ---
  const handleJoinRoom = (roomId) => {
    if (!isConnected) return;
    if (currentRoom?.id === roomId) return; // Já está na sala

    const roomToJoin = rooms.find(r => r.id === roomId);
    if (!roomToJoin) return; // Sala não existe mais

    if (chatContext === 'room') {
      // Abre o popup de confirmação
      setConfirmPopupProps({
        title: 'Mudar de Sala',
        message: `Deseja sair da sala atual e entrar em "${roomToJoin.name}"?`,
        onConfirm: () => executeLeaveAndJoin(roomId),
      });
      setIsConfirmPopupOpen(true);
    } else {
      // Se está no lobby, entra direto
      sendPacket('join', { roomId });
    }
  };

  // --- (Request 1) Handler para Sair da Sala ---
  const handleLeaveRoom = () => {
    if (!isConnected) return;
    if (chatContext === 'room') {
      sendPacket('leave');
    }
  };

  // --- (Request 4) Handler para Criar Sala ---
  const handleCreateRoom = (roomName) => {
    if (!isConnected) return;
    // Só pode criar se estiver no lobby
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
            {/* Renderiza o Popup de Confirmação globalmente */}
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