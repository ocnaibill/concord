export class Channel {
    constructor(name) {
        this.name = name;
        this.users = new Map(); // Map<UserId, User>
        this.commands = {}; // Comandos disponíveis neste canal
    }

    addUser(user) {
        this.users.set(user.id, user);
        user.currentChannel = this
        return user;
    }

    removeUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.currentChannel = null;
            this.users.delete(userId);
        }
        return user;
    }

    broadcast(type, message, senderId = null) {
        const payload = {
            sender: senderId ? this.users.get(senderId)?.nickname : 'System',
            type,
            message
        };

        this.users.forEach(user => {
            if (user.id !== senderId) {
                user.send('broadcast', payload);
            }
        });
    }

    handleMessage(user, command, payload) {
        if (this.commands[command]) {
            try {
                const context = { user, ...payload };
                this.commands[command](context);
            } catch (err) {
                console.error(`Erro no comando ${command}:`, err);
                user.respond('error', { msg: 'Erro interno ao processar comando.' });
            }
        } else {
            user.respond('error', { msg: 'Comando não reconhecido neste canal.' });
        }
    }
}