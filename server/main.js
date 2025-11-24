import { WebSocketServer } from 'ws';
import { User } from './core/User.js';
import { lobbyInstance } from './entities/Lobby.js';
import { userManager } from './managers/UserManager.js';

const wss = new WebSocketServer({ port: 3000 });

console.log('[SERVER] WebSocket rodando na porta 3000');

wss.on('connection', (ws, req) => {
    const user = new User(ws, req);
    userManager.addUser(user); 

    console.log(`[CONNECTION] Nova conexão: ${user.nickname} (ID: ${user.id})`);
    
    lobbyInstance.addUser(user);
    user.respond('connected', { msg: 'Bem-vindo ao Chat WebSocket!', userId: user.id });

    ws.on('message', (rawMessage) => {
        try {
            const packet = JSON.parse(rawMessage);
            const { command, payload } = packet;

            // --- 1. PING/PONG (Latência) ---
            if (command === 'ping') {
                // Responde imediatamente devolvendo o timestamp do cliente
                user.respond('pong', { timestamp: payload.timestamp });
                return;
            }

            // --- 2. SINALIZAÇÃO WEBRTC ---
            if (command === 'signal') {
                const { targetId, type, data } = payload;
                const targetUser = userManager.getUser ? userManager.getUser(targetId) : (userManager.users.get(targetId) || userManager.users[targetId]);

                if (targetUser) {
                    // console.log(`[SIGNAL] Repassando ${type} de ${user.nickname} -> ${targetUser.nickname}`);
                    const signalPacket = JSON.stringify({
                        status: 'signal',
                        body: {
                            type: type,
                            data: data,
                            senderId: user.id,
                            targetId: targetId
                        }
                    });

                    if (targetUser.ws && targetUser.ws.readyState === 1) {
                        targetUser.ws.send(signalPacket);
                    } else if (targetUser.send) {
                        targetUser.send(signalPacket);
                    }
                }
                return; 
            }

            // --- 3. COMANDOS DE CHAT (Lobby/Sala) ---
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
    
    ws.on('error', console.error);
});