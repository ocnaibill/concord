import React, { useState, useEffect, useRef } from 'react';
import ChatPage from './ChatPage.jsx';
import SettingsPage from './SettingsPage.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('chat');

  // Estados de comunicação
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Pronto para conectar.');

  // Estados do Chat
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userName, setUserName] = useState(null);

  // --- NOVOS ESTADOS ---
  /** Estado para a lista de salas disponíveis */
  const [rooms, setRooms] = useState([]); 
  
  /** Contexto atual do chat: 'lobby' ou 'room' */
  const [chatContext, setChatContext] = useState('lobby'); 
  
  /** Sala ativa no momento (objeto { id, name }) */
  const [currentRoom, setCurrentRoom] = useState(null); 
  
  /** Estado para o novo popup de criar sala */
  const [isCreateRoomPopupOpen, setIsCreateRoomPopupOpen] = useState(false);
  // ---------------------

  // Estados dos Popups
  const [isNicknamePopupOpen, setIsNicknamePopupOpen] = useState(false);
  const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Ref para o 'message'
  const messageRef = useRef(message);
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Função de Envio de Pacote (sem mudanças)
  const sendPacket = (command, payload = {}) => {
    if (isConnected) {
      const packet = { command, payload };
      window.api.tcpSend(JSON.stringify(packet) + '\n');
    }
  };

  // Efeito principal (com listeners atualizados)
  useEffect(() => {
    
    // --- ON TCP DATA (Atualizado) ---
    window.api.onTcpData((data) => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const packets = data.trim().split('\n');
      const newMessages = [];

      packets.forEach(packetStr => {
        if (!packetStr) return;
        try {
          const packet = JSON.parse(packetStr);
          
          if (packet.status === 'error') {
            // ... (lógica de erro igual)
            console.error('Erro do Servidor:', packet.body.msg);
            setErrorMessage(packet.body.msg);
            setIsErrorPopupOpen(true);

          } else if (packet.status === 'success') {
            // ... (lógica de eco de mensagem igual)
            if (packet.body.msg === messageRef.current) {
              newMessages.push({ sender: 'Você', text: packet.body.msg, time: timestamp });
              setMessage('');
            }
            
            // --- NOVAS LÓGICAS DE SUCESSO ---
            
            // 1. Sucesso ao pedir a lista de salas
            if (packet.body.rooms) {
              setRooms(packet.body.rooms);
              
              // (Lógica para corrigir o ID da sala recém-criada)
              if (currentRoom?.id === 'temp_id') {
                const foundRoom = packet.body.rooms.find(r => r.name === currentRoom.name);
                if (foundRoom) setCurrentRoom(foundRoom);
              }
            }
            
            // 2. Sucesso ao criar uma sala
            if (packet.body.msg && packet.body.msg.startsWith('Você criou a sala')) {
              const roomName = packet.body.msg.replace('Você criou a sala ', '').replace('.', '');
              setChatContext('room');
              // ID é temporário, será corrigido pela lista de salas
              setCurrentRoom({ id: 'temp_id', name: roomName }); 
              setStatusMessage(`Conectado à sala: ${roomName}`);
              setChatMessages([]); // Limpa o chat
              sendPacket('list', { entity: 'rooms' }); // Pede a lista atualizada
            }

            // 3. Sucesso ao entrar em uma sala
            if (packet.body.msg && packet.body.msg.startsWith('Você entrou na sala')) {
              const roomName = packet.body.msg.replace('Você entrou na sala ', '').replace('.', '');
              const joinedRoom = rooms.find(r => r.name === roomName);
              
              setChatContext('room');
              setCurrentRoom(joinedRoom || { id: 'unknown', name: roomName });
              setStatusMessage(`Conectado à sala: ${roomName}`);
              setChatMessages([]); // Limpa o chat
            }

            // 4. Sucesso ao sair de uma sala (retornar ao lobby)
            if (packet.body.msg === 'Você retornou ao lobby.') {
              setChatContext('lobby');
              setCurrentRoom(null);
              setStatusMessage(`Conectado como ${userName}. No Lobby.`);
              setChatMessages([]); // Limpa o chat
              sendPacket('list', { entity: 'rooms' }); // Pede a lista de salas
            }
            
          } else if (packet.status === 'broadcast') {
            // ... (lógica de broadcast igual)
            newMessages.push({
              sender: packet.body.sender,
              text: packet.body.message,
              time: timestamp
            });
            
            // --- NOVAS LÓGICAS DE BROADCAST ---
            // Se alguém criou ou removeu uma sala, atualiza nossa lista
            if (packet.body.type === 'created-room' || packet.body.type === 'removed-room') {
              sendPacket('list', { entity: 'rooms' });
            }
          }

        } catch (e) { console.warn('Recebido dado TCP não-JSON:', packetStr, e); }
      });

      if (newMessages.length > 0) {
        setChatMessages((prevMessages) => [...prevMessages, ...newMessages]);
      }
    });

    // --- ON TCP STATUS (sem mudanças) ---
    window.api.onTcpStatus((status) => {
      setIsConnected(status.connected);
      if (status.connected) {
        setStatusMessage('Conectado! Por favor, defina seu nickname.');
        setIsNicknamePopupOpen(true);
      } else {
        // ... (lógica de desconexão igual)
        setStatusMessage(status.error ? `Erro: ${status.error}` : 'Desconectado.');
        setUserName(null);
        setIsNicknamePopupOpen(false);
        setRooms([]); // Limpa as salas
        setChatContext('lobby'); // Reseta contexto
        setCurrentRoom(null); // Reseta sala atual
        if (status.error) {
          setErrorMessage(status.error);
          setIsErrorPopupOpen(true);
        }
      }
    });

    // ... (limpeza)
    return () => {
      window.api.removeAllListeners('tcp-data');
      window.api.removeAllListeners('tcp-status');
    };
  }, [currentRoom]); // Adiciona currentRoom como dependência

  // --- Handlers de Ação ---

  // 1. Conectar (sem mudanças)
  const handleConnect = () => {
    if (isConnected) return;
    setStatusMessage('Tentando conectar...');
    window.api.tcpConnect();
  };

  // 2. Definir Nickname (Atualizado)
  const handleSetNickname = (name) => {
    if (name) {
      setUserName(name);
      sendPacket('nick', { nickname: name });
      setIsNicknamePopupOpen(false);
      setStatusMessage(`Conectado como ${name}. No Lobby.`);
      
      // *** IMPORTANTE: Pede a lista de salas assim que define o nick ***
      sendPacket('list', { entity: 'rooms' });
    }
  };

  // 3. Enviar Mensagem (Atualizado com Contexto)
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !isConnected || !userName) return;

    // *** LÓGICA DE CONTEXTO ***
    if (chatContext === 'room') {
      // Se está numa sala, envia uma mensagem
      sendPacket('message', { message: message });
    } else {
      // Se está no lobby, não faz nada (ou mostra um erro)
      setErrorMessage('Você precisa estar em uma sala para enviar mensagens.');
      setIsErrorPopupOpen(true);
      setMessage(''); // Limpa o input
    }
    // O 'setMessage' e 'setChatMessages' são feitos no 'onTcpData'
  };

  // --- NOVOS HANDLERS (para a Sidebar) ---

  /** 4. Chamado pelo 'onAdd' da Sidebar (via ChatPage) */
  const handleCreateRoom = (roomName) => {
    sendPacket('create', { roomName });
    setIsCreateRoomPopupOpen(false); // Fecha o popup
  };

  /** 5. Chamado pelo 'onSelect' da Sidebar (via ChatPage) */
  const handleJoinRoom = (roomId) => {
    if (currentRoom?.id === roomId) return; // Já está na sala
    
    // Se estiver em outra sala, sai primeiro
    if (chatContext === 'room') {
       sendPacket('leave');
       // O 'onTcpData' vai receber "Você retornou ao lobby"
       // e então podemos tentar entrar na nova sala.
       // (Isso pode precisar de uma lógica mais complexa,
       // como uma fila de ações, mas por ora vamos simplificar)
       
       // Por enquanto, vamos forçar o usuário a sair manualmente
       setErrorMessage('Você já está em uma sala. Saia primeiro.');
       setIsErrorPopupOpen(true);
       return; 
    }
    
    // Se está no lobby, entra direto
    sendPacket('join', { roomId });
  };
  
  /** 6. (Opcional) Adicionar um botão "Sair da Sala" */
  const handleLeaveRoom = () => {
    if (chatContext === 'room') {
      sendPacket('leave');
    }
  };

  // --- Renderização ---

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return (
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
            
            // --- NOVAS PROPS PARA SIDEBAR ---
            rooms={rooms}
            currentRoomId={currentRoom?.id}
            handleJoinRoom={handleJoinRoom}
            isCreateRoomPopupOpen={isCreateRoomPopupOpen}
            setIsCreateRoomPopupOpen={setIsCreateRoomPopupOpen}
            handleCreateRoom={handleCreateRoom}
            
            // (Exemplo de como adicionar a saída)
            handleLeaveRoom={handleLeaveRoom} 
            isInRoom={chatContext === 'room'}
          />
        );

      case 'settings':
        return (
          <SettingsPage setCurrentPage={setCurrentPage} />
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