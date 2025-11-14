import { Channel } from '../core/Channel.js';
import { roomManager } from '../managers/RoomManager.js';
import { userManager } from '../managers/UserManager.js';

export class Lobby extends Channel {
    constructor() {
        super('Lobby');
        
        this.commands = {
            'create': ({ user, roomName }) => {
                try {
                    const room = roomManager.createRoom(roomName, user);
                    this.moveUserToRoom(user, room);
                } catch (e) {
                    user.respond('error', { msg: e.message });
                }
            },
            'join': ({ user, roomId }) => {
                const room = roomManager.getRoom(roomId);
                if (!room) return user.respond('error', { msg: 'Sala não encontrada' });
                
                try {
                    this.moveUserToRoom(user, room);
                } catch (e) {
                    user.respond('error', { msg: e.message });
                }
            },
            'list': ({ user, entity }) => {
                if (entity === 'rooms') {
                    user.respond('success', { rooms: roomManager.listRooms() });
                } else if (entity === 'users') {
                    const userList = Array.from(this.users.values()).map(u => ({ id: u.id, nick: u.nickname }));
                    user.respond('success', { users: userList });
                }
            },
            'list_all_users': ({ user }) => {
                user.respond('success', { users: userManager.listAll() });
            },
            'nick': ({ user, nickname }) => {
                const old = user.nickname;
                user.nickname = nickname;
                user.respond('success', { oldNick: old, newNick: nickname });
            },

        };
    }

    moveUserToRoom(user, room) {
        this.removeUser(user.id);
        room.addUser(user);
        
        user.respond('success', { 
            roomName: room.name, 
            roomId: room.id 
        });
    }
}

export const lobbyInstance = new Lobby();