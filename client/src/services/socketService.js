class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = {};
        this.isConnected = false;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket já está conectado ou conectando.');
            return;
        }

        // --- LÓGICA DE URL ---
        let url;
        
        // Verifica se estamos rodando localmente (localhost ou IP de rede)
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocal) {
            // Desenvolvimento Local
            url = 'ws://localhost:3000';
        } else {
            // Produção (Seu Homelab)
            // Usa o protocolo seguro (wss://) automaticamente se a página for https://
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host; // 'concord.tadalafila.dedyn.io'
            
            // Aponta para o caminho /ws configurado no Nginx
            url = `${protocol}//${host}/ws`;
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

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
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