import React, { useEffect, useState } from 'react';

/**
 * Um componente de notificação Toast.
 * @param {object} props
 * @param {'success' | 'error'} props.type - O tipo de toast (controla a cor)
 * @param {string} props.message - A mensagem a ser exibida
 * @param {function} props.onClose - Função chamada para fechar o toast
 */
function Toast({ type = 'success', message, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  // Anima a entrada
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Define a cor baseada no tipo
  const bgColor = type === 'success' 
    ? 'from-cyan-500 to-cyan-600' 
    : 'from-red-500 to-red-600';

  // Handler para o botão de fechar (anima a saída)
  const handleClose = () => {
    setIsVisible(false);
    // Espera a animação de saída terminar antes de chamar o onClose real
    setTimeout(onClose, 300); 
  };

  return (
    <div
      className={`relative z-50 flex items-center justify-between gap-4 w-full max-w-md p-4 rounded-lg shadow-lg text-white bg-gradient-to-r ${bgColor}
                  transition-all duration-300 ease-out-quad
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <p className="font-semibold">{message}</p>
      
      <button
        onClick={handleClose}
        className="p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 transition-colors"
        aria-label="Fechar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
}

export default Toast;