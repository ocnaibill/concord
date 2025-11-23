class UserManager {
    constructor() {
        this.users = new Map();
    }

    addUser(user) {
        this.users.set(user.id, user);
    }

    removeUser(id) {
        this.users.delete(id);
    }

    getUser(id) {
        return this.users.get(id);
    }

    listAll() {
        return Array.from(this.users.values()).map(u => ({ 
            id: u.id, 
            nick: u.nickname 
        }));
    }

    isNicknameTaken(newNickname) {
        for (const user of this.users.values()) {
            if (user.nickname === newNickname) return true
        }
        return false
    }
}

export const userManager = new UserManager();