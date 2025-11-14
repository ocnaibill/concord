import { v4 as uuidv4 } from 'uuid'; 

export class User {
    constructor(ws, request) {
        this.id = uuidv4(); 
        this.nickname = `Guest_${this.id.substr(0, 4)}`;
        this.ws = ws;
        this.ip = request.socket.remoteAddress;
        
        this.currentChannel = null; 
    }

    send(type, payload = {}) {
        if (this.ws.readyState === 1) { 
            const packet = JSON.stringify({
                status: type, 
                ...payload 
            });
            this.ws.send(packet);
        }
    }

    respond(status, body) {
        this.send(status, body); 
    }
}