
# Fluxograma de Funcionamento do Projeto Concord

Este documento detalha o funcionamento do projeto Concord, um chat em tempo real com suporte a salas e mensagens diretas, construído com React, Electron e Node.js (WebSocket).

## Visão Geral da Arquitetura

O projeto segue uma arquitetura Cliente-Servidor clássica utilizando WebSockets para comunicação bidirecional em tempo real.

-   **Frontend (Cliente)**: React rodando dentro do Electron. Gerencia a interface do usuário e o estado local.
-   **Backend (Servidor)**: Node.js com  `ws`. Gerencia conexões, salas, usuários e roteamento de mensagens.
## Detalhamento dos Componentes

### Backend (`server/`)

1.  main.js: Ponto de entrada. Inicializa o servidor WebSocket e escuta conexões.
2.  core/User.js: Representa um cliente conectado. Mantém o socket e o estado do usuário (canal atual, nick).
3.  core/Channel.js: Classe base para canais de comunicação. Gerencia lista de usuários e broadcast de mensagens.
4.  entities/Lobby.js: O canal padrão. Permite listar, criar e entrar em salas.
5.  entities/Room.js: Canal de chat específico. Permite mensagens em grupo e sair da sala.
6.  managers/UserManager.js: Mantém o registro global de todos os usuários conectados.
7.  managers/RoomManager.js: Gerencia o ciclo de vida das salas (criação, remoção quando vazia).

### Frontend (`client/`)

1.  App.jsx: Componente principal. Gerencia o estado global da aplicação (mensagens, salas, usuário atual).
2.  services/socketService.js: Camada de abstração para o WebSocket. Lida com conexão, reconexão e eventos.
3.  ChatPage.jsx: Interface principal do chat. Exibe lista de salas, usuários e mensagens.
4.  SettingsPage.jsx: Tela de configurações (ex: troca de nick).
5.  useWebRTC.js: Hook para gerenciar conexões Peer-to-Peer para chamadas de voz/vídeo.

## Funcionalidades Principais

1.  **Chat em Tempo Real**: Mensagens instantâneas via WebSocket.
2.  **Sistema de Salas**: Usuários podem criar e entrar em salas públicas.
3.  **Mensagens Diretas (DM)**: Conversas privadas entre usuários.
4.  **Chamadas de Voz/Vídeo**: Suporte a WebRTC (sinalização via WebSocket, mídia P2P).
5.  **Gerenciamento de Estado**: O servidor mantém o estado da verdade (quem está onde), e o cliente sincroniza via eventos.