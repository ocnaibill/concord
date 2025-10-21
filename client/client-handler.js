import net from 'net';

let socket = null;
let mainWindow = null;

// --- Funções de Comando (Interface) ---
// Estas funções preparam o objeto JSON para cada comando específico.

/**
 * Prepara o comando para criar uma nova sala.
 * @param {string} roomName O nome da sala a ser criada.
 */
function handleCreateCommand(roomName) {
  if (!roomName) {
    console.warn('O nome da sala não pode estar vazio.');
    // Opcional: Enviar um erro de volta para a UI
    // mainWindow.webContents.send('tcp-error', { msg: 'Comando inválido. Use: /create <nome_da_sala>' });
    return;
  }
  const command = { command: 'create', payload: roomName };
  sendJsonToServer(command);
}

/**
 * Prepara o comando para entrar numa sala existente.
 * @param {string} roomId O ID da sala para entrar.
 */
function handleJoinCommand(roomId) {
  if (!roomId) {
    console.warn('O ID da sala não pode estar vazio.');
    return;
  }
  const command = { command: 'join', payload: roomId };
  sendJsonToServer(command);
}

/**
 * Prepara o comando para alterar o nome de utilizador.
 * @param {string} newNick O novo nome de utilizador.
 */
function handleNickCommand(newNick) {
  if (!newNick) {
    console.warn('O novo nome não pode estar vazio.');
    return;
  }
  const command = { command: 'nick', payload: newNick };
  sendJsonToServer(command);
}

/**
 * Prepara o comando para sair da sala atual.
 */
function handleLeaveCommand() {
  const command = { command: 'leave', payload: null };
  sendJsonToServer(command);
}

/**
 * Prepara uma mensagem de chat normal.
 * @param {string} message O conteúdo da mensagem.
 */
function handleChatMessage(message) {
    const command = { command: 'message', payload: message };
    sendJsonToServer(command);
}


// --- Lógica Principal de Comunicação ---

/**
 * Analisa a entrada do utilizador, diferencia entre comandos e mensagens,
 * e chama a função de tratamento apropriada.
 * @param {string} input A string completa digitada pelo utilizador.
 */
function processUserInput(input) {
  if (!input || !socket) {
    return;
  }

  // Verifica se a entrada é um comando (começa com '/')
  if (input.startsWith('/')) {
    const parts = input.trim().split(' ');
    const command = parts[0]; // ex: /create
    const arg = parts.slice(1).join(' '); // ex: "nome da sala"

    switch (command) {
      case '/create':
        handleCreateCommand(arg);
        break;
      case '/join':
        handleJoinCommand(arg);
        break;
      case '/nick':
        handleNickCommand(arg);
        break;
      case '/leave':
        handleLeaveCommand();
        break;
      default:
        console.warn(`Comando desconhecido: ${command}`);
        // Opcional: Enviar erro para a UI
        // mainWindow.webContents.send('tcp-error', { msg: `Comando desconhecido: ${command}` });
    }
  } else {
    // Se não for um comando, é uma mensagem de chat.
    handleChatMessage(input);
  }
}

/**
 * Envia um objeto JSON para o servidor.
 * Todas as comunicações do cliente para o servidor passarão por aqui.
 * @param {object} dataObject O objeto JavaScript a ser enviado.
 */
function sendJsonToServer(dataObject) {
  if (socket && socket.writable) {
    const messageString = JSON.stringify(dataObject);
    console.log(`A enviar JSON para o servidor: ${messageString}`);
    socket.write(messageString + '\n');
  } else {
    console.warn('Tentativa de enviar mensagem sem uma conexão ativa.');
  }
}

function connect(win) {
  mainWindow = win;
  if (socket || !mainWindow) {
    return;
  }
  console.log('A iniciar conexão com o servidor...');
  socket = new net.Socket();

  socket.connect(65432, '127.0.0.1', () => {
    console.log('Conexão TCP estabelecida com sucesso!');
    mainWindow.webContents.send('tcp-status', { connected: true });
  });

  socket.on('data', (data) => {
    const messageStr = data.toString('utf-8').trim();
    console.log(`Dados recebidos do servidor: ${messageStr}`);
    
    // O servidor agora envia JSON. Tentamos fazer o parse.
    try {
      const parsedData = JSON.parse(messageStr);
      // Reencaminha o objeto JSON já processado para a interface.
      mainWindow.webContents.send('tcp-data', parsedData);
    } catch (error) {
      console.error('Erro ao fazer parse do JSON vindo do servidor:', error);
      // Se falhar, envia os dados brutos como uma mensagem de status de erro.
      mainWindow.webContents.send('tcp-data', {
        status: 'error',
        msg: `O servidor enviou dados malformados: ${messageStr}`
      });
    }
  });

  socket.on('close', () => {
    console.log('A conexão com o servidor foi fechada.');
    socket = null;
    mainWindow.webContents.send('tcp-status', { connected: false });
  });

  socket.on('error', (err) => {
    console.error(`Erro na conexão TCP: ${err.message}`);
    socket = null;
    mainWindow.webContents.send('tcp-status', { connected: false, error: err.message });
  });
}

// Exportamos a função que o main.js irá chamar para processar a entrada do utilizador.
// A antiga `sendMessage` foi substituída por `processUserInput`.
export { connect, processUserInput };

