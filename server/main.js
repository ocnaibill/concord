import { Worker, MessageChannel } from 'node:worker_threads';
import net from 'net';

let lobby = new Worker('./server/workers/LobbyWorker.js')

const server = net.createServer((socket) => {
    const { port1, port2 } = new MessageChannel()

    // Transfere uma porta de comunicacao a Thread do lobby
    console.log('[MAIN] Iniciando nova conexão...')
    lobby.postMessage({msg: 'connect', payload: port2}, [port2])

    // Informa caso haja a desconexao repentina do usuario
    socket.on('close', () => {
        port1.postMessage({command: 'disconnect', payload: null })
    })

    // Redireciona envio e resposta de mensagens do cliente
    socket.on('data', (packet) => {
    // Decodifica o buffer para string (assumindo UTF-8)
    const packetString = packet.toString('utf-8');

    // O cliente pode enviar múltiplos pacotes de uma vez, separados por '\n'
    packetString.split('\n').forEach(str => {
        if (str) { // Ignora linhas em branco
            try {
                port1.postMessage(JSON.parse(str));
            } catch (e) {
                console.error('[MAIN] Erro ao parsear JSON do cliente:', str, e);
            }
        }
    });
});
    port1.on('message', packet => socket.write(JSON.stringify(packet)+'\n'))
    console.log('[MAIN] Conexão estabelecida.')
});

server.listen(3000, () => {
    console.log('[MAIN] Servidor escutando na porta 3000');
});