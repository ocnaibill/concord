// Importa módulos essenciais do Electron e path
import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Recria as variáveis __dirname e __filename para Módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isPackaged = app.isPackaged;

// Função principal que cria e configura a janela da aplicação.
function createWindow() {
    // Cria uma nova janela do navegador.
    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    // --- CONFIGURAÇÃO DE PERMISSÕES (Necessário para WebRTC/Câmera) ---
    // Isso garante que o Electron permita o uso da câmera/mic quando o React pedir.
    win.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        if (permission === 'media' || permission === 'mediaKeySystem') {
            return true;
        }
        return false;
    });

    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
            return;
        }
        callback(false);
    });


    // Carrega o arquivo HTML principal na janela.
    if (isPackaged) {
        // --- MODO PRODUÇÃO ---
        const appIndexPath = path.join(__dirname, 'dist', 'index.html');
        win.loadFile(appIndexPath);
    } else {
        // --- MODO DESENVOLVIMENTO ---
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
    }

    // NOTA: Toda a lógica do 'net' e 'ipcMain' referente ao TCP foi removida.
    // A conexão WebSocket será feita diretamente dentro dos componentes React (.jsx)
    // ou em um serviço JS no frontend.
}

// Este método será chamado quando o Electron terminar a inicialização
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});