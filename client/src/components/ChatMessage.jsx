// client/src/components/ChatMessage.jsx (Faça esta mudança)

import React from 'react';

function ChatMessage({ message }) {
  // MUDANÇA AQUI:
  // Antes: message.sender === 'user'
  // Agora: message.sender === 'Você'
  const isUser = message.sender === 'Você';
  
  // MUDANÇA AQUI:
  // Antes: senderName = isUser ? 'Você' : 'Servidor'
  // Agora: senderName = message.sender (Ele já vem formatado como "Você", "Servidor", ou "NomeDoOutro")
  const senderName = message.sender;

  return (
    <div className={`flex w-full my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`px-4 py-2 text-white rounded-[45px] flex flex-col
                  ${isUser ? 'bg-[#7F7E7E]' : 'bg-[#5a5a5a]'} /* Sugestão: mude a cor para diferenciar */
                  max-w-[316px]`}
      >
        <p className="text-sm font-bold opacity-80 mb-1">
          {senderName}
        </p>

        <p className="break-words">
          {message.text}
        </p>

        {message.time && (
          <p className="text-xs opacity-70 mt-2 self-end">
            {message.time}
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;