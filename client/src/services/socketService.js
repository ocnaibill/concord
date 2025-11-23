// client/src/services/socketService.js

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = {};
        this.isConnected = false;
    }

    connect(url = 'ws://localhost:3000') {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket já está conectado ou conectando.');
            return;
        }

        console.log(`Conectando ao WebSocket em ${url}...`);
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('WebSocket conectado!');
            this.isConnected = true;
            this.emit('status', { connected: true });
        };

        this.socket.onmessage = (event) => {
            this.emit('data', event.data);
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket desconectado.', event.reason);
            this.isConnected = false;
            this.socket = null;
            this.emit('status', { connected: false, error: event.reason });
        };

        this.socket.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            this.emit('status', { connected: false, error: 'Erro de conexão' });
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.isConnected = false;
        }
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(data);
        } else {
            console.warn('Tentativa de enviar mensagem sem conexão WebSocket ativa.');
        }
    }

    // Gerenciamento de Eventos (Padrão Observer simples)
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

const socketService = new SocketService();
export default socketService;
