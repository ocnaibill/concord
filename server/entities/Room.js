import { ChannelHandler } from './interfaces/ChannelHandler.js';

export class Room extends ChannelHandler {
    constructor(port) {
        super(port)

        this.commands = {
            'message': ({ user, message }) => {
                this.broadcastMessage(user, 'message', message)

                user.respond('success', {
                    msg: message
                })
            },
            'leave': ({ user }) => {
                this.leaveUser(user)
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
                else {
                    user.respond('error', { msg: 'Entidade não reconhecida' })
                }
            },
            'disconnect': ({ user }) => {
                user.port.close()
                this.removeUser(user)
                this.broadcastMessage(null, 'client-disconnected', `${user.nickname} se desconectou.`)
            },
        }
    }

    addUser(user) {
        const newUser = super.addUser(user.port)
        newUser.nickname = user.nickname
        
        this.broadcastMessage(null, 'user-joined', `${user.nickname} entrou na sala.`)
        return newUser
    }

    changeUserNickname(user, newNickname) {
        const oldNick = user.nickname
        super.changeUserNickname(user, newNickname)

        this.broadcastMessage(null, 'nick-change', `${oldNick} alterou seu apelido para ${user.nickname}`)
    }

    leaveUser(user) {
        this.port.postMessage({msg: 'leaved', payload: user}, [user.port])
        this.removeUser(user.id)

        this.broadcastMessage(null, 'user-leaved', `${user.nickname} saiu da sala.`)
        
        if (this.users.size === 0) {
            this.port.postMessage({msg: 'closed', payload: null})
        }
    }
}