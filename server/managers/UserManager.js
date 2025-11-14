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
            nickname: u.nickname 
        }));
    }
}

export const userManager = new UserManager();