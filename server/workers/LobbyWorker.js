import { parentPort } from "node:worker_threads";
import { Lobby } from "../entities/Lobby.js";

let lobby = new Lobby(parentPort)

lobby.port.on('message', ({msg, payload}) => {
    console.log('[LOBBY] Nova conexão recebida com sucesso.')
    
    if(msg === 'connect') {
        const port = payload
        lobby.addUser(port)
    }
})