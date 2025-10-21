export class User {
    constructor(id, nickname, port) {
        this.id = id
        this.nickname = nickname
        this.port = port
    }

    respond(statusMsg, bodyObj) {
        this.port.postMessage({
            status: statusMsg,
            body: bodyObj
        })
    }
}