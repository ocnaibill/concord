import { Room } from '../entities/Room.js';

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.roomIdAcc = 0;
    }

    createRoom(name, creator) {
        const id = this.roomIdAcc++;
        const room = new Room(id, name, this);
        this.rooms.set(id, room);
        return room;
    }

    getRoom(id) {
        return this.rooms.get(Number(id));
    }

    removeRoom(id) {
        this.rooms.delete(Number(id));
    }

    listRooms() {
        return Array.from(this.rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            usersCount: r.users.size
        }));
    }
}

export const roomManager = new RoomManager();