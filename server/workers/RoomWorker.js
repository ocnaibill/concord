import { parentPort } from "node:worker_threads";
import { Room } from "../entities/Room.js";

let room = new Room(parentPort)

room.port.on('message', ({ msg, payload }) => {
    
    if(msg === 'opened') {
        const { creator, roomName } = payload
        room.name = roomName
        console.log(`[${room.name}] Criada por ${creator.nickname}`)
        
        const newUser = room.addUser(creator)
        newUser.respond('success', {
            msg: `Você criou a sala ${room.name}.`
        })
    }
    else if(msg === 'joined') {
        const { user } = payload
        console.log(`[${room.name}] ${user.nickname} entrou na sala`)
        const newUser = room.addUser(user)

        newUser.respond('success', {
            msg: `Você entrou na sala ${room.name}.`
        })
    }
})