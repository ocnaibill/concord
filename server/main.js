import { WebSocketServer } from 'ws';
import { User } from './core/User.js';
import { lobbyInstance } from './entities/Lobby.js';
import { userManager } from './managers/UserManager.js';

const wss = new WebSocketServer({ port: 3000 });

console.log('[SERVER] WebSocket rodando na porta 3000');

wss.on('connection', (ws, req) => {
    const user = new User(ws, req);
    userManager.addUser(user); 

    console.log(`[CONNECTION] Nova conexão: ${user.nickname}`);
    
    lobbyInstance.addUser(user);
    user.respond('connected', { msg: 'Bem-vindo ao Chat WebSocket!', userId: user.id });

    ws.on('message', (rawMessage) => {
        try {
            const packet = JSON.parse(rawMessage);
            const { command, payload } = packet;

            // No seu servidor WebSocket (Node.js)
            // Pega o canal atual do usuário (Lobby ou alguma Sala)
            const channel = user.currentChannel;

            if (channel) {
                channel.handleMessage(user, command, payload || {});
            } else {
                // Caso raro onde usuário ficou órfão
                lobbyInstance.addUser(user);
                user.respond('error', { msg: 'Estado recuperado. Você voltou ao lobby.' });
            }

        } catch (err) {
            console.error('Pacote inválido:', err.message);
            user.respond('error', { msg: 'JSON inválido' });
        }
    });

    ws.on('close', () => {
        console.log(`[DISCONNECT] ${user.nickname} saiu.`);

        userManager.removeUser(user.id);
        if (user.currentChannel) {
            // Chama lógica de saída (broadcasts, destruição de sala, etc)
            // Se for Lobby, apenas remove. Se for Sala, pode disparar 'leave'.
            if (user.currentChannel.commands['leave']) {
                // Simula comando de leave para limpar
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