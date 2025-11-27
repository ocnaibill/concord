import { WebSocketServer } from 'ws';
import { User } from './core/User.js';
import { lobbyInstance } from './entities/Lobby.js';
import { userManager } from './managers/UserManager.js';

const wss = new WebSocketServer({ port: 3000 });

console.log('[SERVER] WebSocket rodando na porta 3000');

// Função heartbeat para manter conexões ativas
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws, req) => {
    // Configura heartbeat
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const user = new User(ws, req);
    userManager.addUser(user); 

    console.log(`[CONNECTION] Nova conexão: ${user.nickname} (ID: ${user.id})`);
    
    lobbyInstance.addUser(user);
    user.respond('connected', { msg: 'Bem-vindo ao Chat WebSocket!', userId: user.id });

    // --- TRATAMENTO DE ERRO DO CLIENTE ---
    // Impede crash por desconexão abrupta (ECONNRESET) de um usuário específico
    ws.on('error', (error) => {
        // Apenas loga o erro, não derruba o servidor
        console.error(`[SOCKET ERROR] Erro na conexão de ${user.nickname || 'Guest'}:`, error.message);
    });

    ws.on('message', (rawMessage) => {
        try {
            const packet = JSON.parse(rawMessage);
            const { command, payload } = packet;

            // --- 1. PING/PONG (Latência) ---
            if (command === 'ping') {
                user.respond('pong', { timestamp: payload.timestamp });
                return;
            }

            // --- 2. SINALIZAÇÃO WEBRTC ---
            if (command === 'signal') {
                const { targetId, type, data } = payload;
                const targetUser = userManager.getUser ? userManager.getUser(targetId) : (userManager.users.get(targetId) || userManager.users[targetId]);

                if (targetUser) {
                    const signalPacket = JSON.stringify({
                        status: 'signal',
                        body: {
                            type: type,
                            data: data,
                            senderId: user.id,
                            targetId: targetId
                        }
                    });

                    // Verifica se o socket ainda está aberto antes de enviar
                    if (targetUser.ws && targetUser.ws.readyState === 1) { 
                        targetUser.ws.send(signalPacket);
                    } else if (targetUser.send) {
                        targetUser.send(signalPacket);
                    }
                }
                return; 
            }

            // --- 3. COMANDOS DE CHAT ---
            const channel = user.currentChannel;

            if (channel) {
                channel.handleMessage(user, command, payload || {});
            } else {
                lobbyInstance.addUser(user);
                user.respond('error', { msg: 'Estado recuperado. Você voltou ao lobby.' });
            }

        } catch (err) {
            console.error('Pacote inválido:', err.message);
        }
    });

    ws.on('close', () => {
        console.log(`[DISCONNECT] ${user.nickname} saiu.`);
        userManager.removeUser(user.id);
        if (user.currentChannel) {
            if (user.currentChannel.commands['leave']) {
                 try {
                    user.currentChannel.commands['leave']({ user });
                 } catch(e) {} 
            } else {
                user.currentChannel.removeUser(user.id);
            }
        }
    });
});

// Limpeza de conexões mortas a cada 30s
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

// Tratamento de erro do SERVIDOR (wss), não do cliente individual
wss.on('error', (error) => {
    console.error('[SERVER ERROR] Erro fatal no servidor WebSocket:', error);
});