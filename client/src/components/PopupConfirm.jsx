import React from 'react';

function PopupConfirm({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#353333] p-6 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-200 mb-4">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-md text-white font-semibold transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PopupConfirm;