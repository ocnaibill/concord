import { Channel } from '../core/Channel.js';
import { lobbyInstance } from '../entities/Lobby.js';
import { userManager } from '../managers/UserManager.js';
import { roomManager } from '../managers/RoomManager.js';

const broadcastGlobalRoomList = () => {
    const rooms = roomManager.listRooms();
    const payload = { type: 'room-list-update', rooms };
    // Envia para TODOS os usuários conectados no servidor (Lobby e Salas)
    userManager.users.forEach(u => u.send('broadcast', payload));
};

export class Room extends Channel {
    constructor(id, name, manager) {
        super(name);
        this.id = id;
        this.manager = manager;
        
        this.commands = {
            'message': ({ user, message }) => {
                this.broadcast('message', message, user.id);
                user.respond('success', { msg: message });
            },
            'leave': ({ user }) => {
                this.removeUser(user.id);
                lobbyInstance.addUser(user)
                user.send('success', { msg: 'Você retornou ao lobby.' });
                
                this.broadcast('user-leaved', `${user.nickname} saiu.`);
                
                if (this.users.size === 0) {
                    this.manager.removeRoom(this.id);
                    console.log(`Sala ${this.name} removida.`);
                }
                // AVISA GERAL QUE O NÚMERO MUDOU (OU SALA SUMIU)
                broadcastGlobalRoomList();
            },
            'nick': ({ user, nickname }) => {
                const old = user.nickname;
                user.nickname = nickname;
                user.respond('success', { oldNick: old, newNick: nickname });
                this.broadcast('nick-change', `${old} agora é ${nickname}.`, user.id);
            },
            'list': ({ user, entity }) => {
                if (entity === 'users') {
                    const userList = Array.from(this.users.values()).map(u => ({ id: u.id, nick: u.nickname }));
                    user.respond('success', { users: userList });
                } else {
                    user.respond('error', { msg: 'Entidade não reconhecida (apenas "users" é válido aqui)' });
                }
            },
            'list_all_users': ({ user }) => {
                user.respond('success', { users: userManager.listAll() });
            },
        };
    }

    addUser(user) {
        super.addUser(user);
        this.broadcast('user-joined', `${user.nickname} entrou na sala.`);
        // AVISA GERAL QUE O NÚMERO MUDOU (OU SALA SUMIU)
        broadcastGlobalRoomList();
    }
}