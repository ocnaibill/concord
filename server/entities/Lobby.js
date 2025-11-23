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
                    const roomsData = roomManager.listRooms().map(r => ({
                        ...r,
                        maxUsers: 5,
                        isFull: r.usersCount >= 5
                    }))
                    user.respond('success', { rooms: roomsData });
                } else if (entity === 'users') {
                    const userList = Array.from(this.users.values()).map(u => ({ id: u.id, nick: u.nickname }));
                    user.respond('success', { users: userList });
                }
            },
            'list_all_users': ({ user }) => {
                user.respond('success', { users: userManager.listAll() });
            },
            'nick': ({ user, nickname }) => {
                if (userManager.isNicknameTaken(nickname)) {
                    return user.respond('error', { msg: 'Este nickname já está em uso.' })
                }

                const old = user.nickname;
                user.nickname = nickname;
                user.respond('success', { oldNick: old, newNick: nickname });
            },
            'dm': ({user, targetId, message}) => {
                this.sendDM(user, targetId, message)
            },
            'signal': ({user, targetId, message}) => {
                this.performSignal(user, targetId, message)
            },
        };
    }

    moveUserToRoom(user, room) {
        if (room.users.size >= room.MAX_USERS) {
            throw new Error(`A sala ${room.name} está cheia.`)
        }

        this.removeUser(user.id);
        room.addUser(user);
        
        user.respond('success', { 
            roomName: room.name, 
            roomId: room.id 
        });
    }
}

export const lobbyInstance = new Lobby();