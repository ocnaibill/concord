import { User } from "../User.js"

export class ChannelHandler {
    #clientsIdAccummulator = 0

    constructor(commPort) {
        this.port = commPort
        this.users = new Map()
        this.commands = {}
    }

    addUser(port) {
        let user = new User(this.#clientsIdAccummulator, '', port)

        user.port.on('message', ({ command, payload }) => {
            try {
                if (!payload) {
                    payload = {}
                }

                payload['user'] = user
                this.commands[command](payload)
            }
            catch (err) {
                if (err instanceof TypeError) {
                    console.log(err)
                    user.respond('error', { msg: 'Comando não reconhecido' })
                }
                else {
                    console.log('ERRO INESPERADO:', err.message)
                    user.respond('error', { msg: 'Erro inesperado no servidor' })
                }
            }
        })

        this.users.set(this.#clientsIdAccummulator, user)
        this.#clientsIdAccummulator++

        return user
    }

    listUsers() {
        return [...this.users.values()].map(user => user.nickname)
    }

    removeUser(id) {
        return this.users.delete(id)
    }

    changeUserNickname(user, newNickname) {
        const oldNick = user.nickname
        this.users.get(user.id).nickname = newNickname

        user.respond('success', {
            oldNick,
            newNick: newNickname
        })
    }

    broadcastMessage(sender, type, message) {
      [...this.users.values()].forEach(user => {
            sender = sender ?? { id: -1, nickname: 'server' }
            if (user.id === sender.id) return

            user.respond('broadcast', {
                sender: sender.nickname,
                type,
                message,
            })
        });
    }
}
