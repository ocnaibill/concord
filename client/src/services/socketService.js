// client/src/services/socketService.js

// Cria uma instância única do WebSocket
// Nota: Em produção, você pode querer gerenciar a reconexão e erros de forma mais robusta.
const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
    console.log('WebSocket conectado (socketService)!');
};

socket.onerror = (error) => {
    console.error('Erro no WebSocket:', error);
};

export { socket };
