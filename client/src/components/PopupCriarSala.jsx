import React, { useState } from 'react';

function PopupCriarSala({ isOpen, onClose, onConfirm }) {
  const [roomName, setRoomName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      onConfirm(roomName.trim());
      setRoomName(''); // Limpa o input
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#353333] p-6 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-200 mb-4">Criar Nova Sala</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Nome da sala"
            className="w-full bg-[#404040] text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autoFocus
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-md text-white font-semibold transition-colors"
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PopupCriarSala;