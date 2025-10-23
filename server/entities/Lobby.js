import { Worker } from 'node:worker_threads';
import { ChannelHandler } from './interfaces/ChannelHandler.js';

export class Lobby extends ChannelHandler {
    #roomIdAccumulator = 0

    constructor(commPort) {
        super(commPort)

        this.commands = {
            'create': ({ user, roomName }) => {
                this.createRoom(user, roomName)
            },
            'join': ({ user, roomId }) => {
                this.joinUserInRoom(user, roomId)
            },
            'nick': ({ user, nickname }) => {
                this.changeUserNickname(user, nickname)
            },
            'list': ({ user, entity }) => {
                if (entity === 'users') {
                    user.respond('success', {
                        users: this.listUsers()
                    })
                }
                else if (entity === 'rooms') {
                    user.respond('success', {
                        rooms: this.listRooms()
                    })
                }
                else {
                    user.respond('error', { msg: 'Entidade não reconhecida' })
                }
            },
            'disconnect': ({ user }) => {
                user.port.close()
                this.removeUser(user)
            },
        }

        this.rooms = new Map()
    }


    broadcastRoomListUpdate() {
        const rooms = this.listRooms();
        const payload = { type: 'room-list-update', rooms: rooms };

        // 1. Envia para todos os usuários no lobby
        this.users.forEach(user => {
            user.respond('broadcast', payload);
        });
        
        // 2. Envia para CADA SALA (worker)
        this.rooms.forEach(room => {
            room.port.postMessage({
                msg: 'lobby-broadcast', // O RoomWorker vai ouvir isso
                payload: payload         // Envia o mesmo payload
            });
        });
    }


    createRoom(user, roomName) {
        const newRoomId = this.#roomIdAccumulator;
        const room = {
            id: newRoomId, 
            name: roomName,
            port: new Worker('./server/workers/RoomWorker.js'),
            userCount: 1 
        }

        user.port.removeAllListeners('message')
        room.port.postMessage({
            msg: 'opened',
            payload: { 
                creator: user, 
                roomName: room.name, 
                roomId: newRoomId 
            }
        }, [user.port])

        room.port.on('message', ({ msg, payload }) => {
            if (msg === 'leaved') {
                const user = payload

                console.log(`[LOBBY] ${user.nickname} saiu da sala ${room.name}.`)
                const connected = this.addUser(user.port)
                connected.nickname = user.nickname
                connected.respond('success', { msg: 'Você retornou ao lobby.' })
            }
            if (msg === 'closed') {
                console.log(`[LOBBY] A sala ${room.name} foi removida.`)
                room.port.terminate()
                this.rooms.delete(room.id)

                this.broadcastRoomListUpdate();
            }
            if (msg === 'count-update') {
                const { count } = payload;
                room.userCount = count; 
                this.broadcastRoomListUpdate();
            }
        })

       

        this.removeUser(user.id)
        this.rooms.set(newRoomId, room)
        this.#roomIdAccumulator++

         this.broadcastRoomListUpdate();
    }

    joinUserInRoom(user, roomId) {
        const room = this.rooms.get(roomId);

        if (!room) {
            user.respond('error', { msg: 'Sala não encontrada' })
        }
        
        room.port.postMessage({
            msg: 'joined',
            payload: { user }
        }, [user.port])

        this.removeUser(user.id)
    }
    
    listRooms() {
        return [...this.rooms.values()].map(room => ({ 
            id: room.id, 
            name: room.name, 
            userCount: room.userCount 
        }))
    }
}