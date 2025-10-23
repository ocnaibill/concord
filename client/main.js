// client/main.js

// Importa módulos essenciais do Electron e o módulo 'net' e 'path' do Node.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
// Recria as variáveis __dirname e __filename para Módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isPackaged = app.isPackaged;

// Variável para armazenar a instância do socket TCP.
let tcpSocket = null;

// Função principal que cria e configura a janela da aplicação.
function createWindow() {
    // Cria uma nova janela do navegador.
    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            // __dirname aponta para o diretório do arquivo atual (client/)
            // path.join é usado para criar um caminho de arquivo seguro e multiplataforma.
            // preload.js será a ponte entre este processo (Node.js) e o processo de renderização (React).
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        }
    });

    // Carrega o arquivo HTML principal na janela.
    if (isPackaged) {
            // --- MODO PRODUÇÃO - CORREÇÃO FINAL ---
            // Agora, 'dist' está NO MESMO NÍVEL que 'main.js'.
            // __dirname é .../app.asar/client
            // O caminho é .../app.asar/client/dist/index.html
            const appIndexPath = path.join(__dirname, 'dist', 'index.html');
            
            win.loadFile(appIndexPath);

            // (Descomente para depurar se a tela branca persistir)
            //win.webContents.openDevTools(); 

    } else {
        // --- MODO DESENVOLVIMENTO ---
        // Carrega a URL do servidor Vite.
        win.loadURL('http://localhost:5173');

        // Abre as Ferramentas de Desenvolvedor (DevTools), útil para depuração.
        win.webContents.openDevTools();
    }


    // --- LÓGICA DE COMUNICAÇÃO TCP ---

    // Ouve o evento 'tcp-connect' vindo do React (via preload.js)
    ipcMain.on('tcp-connect', () => {
        // Se já estiver conectado, não faz nada.
        if (tcpSocket) return;

        console.log('Recebido pedido de conexão TCP do cliente React...');
        // Cria uma nova instância de socket.
        tcpSocket = new net.Socket();
        
        // Tenta se conectar ao servidor TCP.
        tcpSocket.connect(3000, '127.0.0.1', () => {
            console.log('Conexão TCP estabelecida com o servidor!');
            // Envia uma mensagem para o React informando que a conexão foi bem-sucedida.
            win.webContents.send('tcp-status', { connected: true });
        });

        // Quando recebe dados do servidor...
        tcpSocket.on('data', (data) => {
            // Envia os dados recebidos para o React.
            win.webContents.send('tcp-data', data.toString('utf-8'));
        });

        // Quando a conexão é fechada...
        tcpSocket.on('close', () => {
            console.log('Conexão TCP fechada.');
            tcpSocket = null; // Limpa a variável do socket.
            win.webContents.send('tcp-status', { connected: false });
        });

        // Em caso de erro...
        tcpSocket.on('error', (err) => {
            console.error('Erro na conexão TCP:', err.message);
            tcpSocket = null; // Limpa a variável.
            win.webContents.send('tcp-status', { connected: false, error: err.message });
        });
    });

    // Ouve o evento 'tcp-send' vindo do React.
    ipcMain.on('tcp-send', (event, message) => {
        // Se o socket estiver conectado, envia a mensagem.
        if (tcpSocket) {
            tcpSocket.write(message + '\n');
        }
    });
}

// Este método será chamado quando o Electron terminar a inicialização
// e estiver pronto para criar janelas do navegador.
app.whenReady().then(createWindow);

// Encerra a aplicação quando todas as janelas forem fechadas (exceto no macOS).
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // No macOS, é comum recriar uma janela no aplicativo quando o
    // ícone do dock é clicado e não há outras janelas abertas.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});