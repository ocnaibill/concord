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

    createRoom(user, roomName) {
        const room = {
            id: this.#roomIdAccumulator,
            name: roomName,
            port: new Worker('./server/workers/RoomWorker.js')
        }

        user.port.removeAllListeners('message')
        room.port.postMessage({
            msg: 'opened',
            payload: { creator: user, roomName: room.name }
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

                this.broadcastMessage(null, 'removed-room', `A sala ${room.name} foi removida`)
            }
        })

        this.broadcastMessage(null, 'created-room', `A sala ${room.name} foi criada`)

        this.removeUser(user.id)
        this.rooms.set(this.#roomIdAccumulator, room)
        this.#roomIdAccumulator++
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
        return [...this.rooms.values()].map(room => ({ id: room.id, name: room.name }))
    }
}