import React, { useState, useEffect } from 'react'; 
import UserIcon from './assets/UserIcon.svg';
import ThemeIcon from './assets/ThemeIcon.svg';
import AboutIcon from './assets/AboutIcon.svg';
import BackButtonIcon from './assets/backButton.svg';
import Toast from './components/Toast.jsx';

// Recebe as novas props: currentNickname e handleSetNickname
  function SettingsPage({ 
    setCurrentPage, 
    currentNickname, 
    handleUpdateNickname, 
    nickChangeStatus,  
    resetNickChangeStatus 
  }) {
  const [activeTab, setActiveTab] = useState('nome');
  
  // Estado local para o campo de input do nome
  const [newNickname, setNewNickname] = useState(currentNickname || '');

  // Efeito para resetar o input se o usuário mudar de aba ou o nick oficial mudar
  useEffect(() => {
    if (activeTab === 'nome') {
      setNewNickname(currentNickname || '');
    }
  }, [currentNickname, activeTab]);

  // Handler para o formulário de mudança de nome
    const handleSubmitNickname = (e) => {
        e.preventDefault();
        if (newNickname.trim() && newNickname.trim() !== currentNickname) {
          handleUpdateNickname(newNickname);
        }
      };

  // Função para renderizar o conteúdo com base na aba ativa
  const renderActiveContent = () => {
    switch (activeTab) {
      case 'nome':
        return (
          // Adiciona um <form> para facilitar o 'submit'
          <form onSubmit={handleSubmitNickname}>
            <label htmlFor="username" className="block text-white mb-2 font-semibold">Nome de Utilizador</label>
            <p className="text-sm text-gray-400 mb-4">Este será o nome exibido no chat para outros usuários.</p>
            
            {/* Adiciona um 'wrapper' para o input e o botão */}
            <div className="flex gap-3">
              <input
                type="text"
                id="username"
                className="flex-grow bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" // Use flex-grow
                placeholder="Seu nome..."
                value={newNickname} // Controlado pelo estado local
                onChange={(e) => setNewNickname(e.target.value)} // Atualiza o estado local
              />
              <button
                type="submit"
                className="bg-cyan-600 text-white font-semibold px-5 py-3 rounded-lg hover:bg-cyan-700 transition-colors duration-200
                           disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                // Desabilita se o nome estiver vazio ou for igual ao nome atual
                disabled={!newNickname.trim() || newNickname.trim() === currentNickname}
              >
                Salvar
              </button>
            </div>
          </form>
        );
      case 'tema':
        // ... (o conteúdo de 'tema' não muda)
        return (
          <div>
            <label htmlFor="theme" className="block text-white mb-2 font-semibold">Tema</label>
             <p className="text-sm text-gray-400 mb-4">Personalize a aparência do aplicativo.</p>
            <select
              id="theme"
              className="w-full bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
            >
              <option>Escuro</option>
              <option disabled>Claro (Em breve!)</option>
            </select>
          </div>
        );
      case 'sobre':
        // ... (o conteúdo de 'sobre' não muda)
        return (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Sobre o Concord</h2>
            <p className="text-gray-300">
              Versão 1.0.0 <br />
              Um aplicativo de chat simples e eficiente construído com Electron e React.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // ... (Componente SidebarButton não muda) ...
  const SidebarButton = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
        activeTab === tabName
          ? 'bg-cyan-600 text-white shadow-lg'
          : 'text-gray-300 hover:bg-gray-700/50'
      }`}
    >
      <img src={icon} alt={label} className="w-5 h-5" />
      <span className="font-semibold">{label}</span>
    </button>
  );

  return (
    
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#353333] 
                   before:content-[''] before:absolute before:inset-0 
                   before:bg-imagemchat before:bg-repeat before:invert before:opacity-20">
      
      <div className="relative z-10 flex bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
        
        <aside className="p-4 border-r border-white/10 w-56">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setCurrentPage('chat')}
              className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
              title="Voltar para o Chat"
            >
              <img src={BackButtonIcon} alt="Voltar" className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-white">Configurações</h2>
          </div>
          <nav className="flex flex-col gap-2">
            <SidebarButton tabName="nome" label="Nome" icon={UserIcon} />
            <SidebarButton tabName="tema" label="Tema" icon={ThemeIcon} />
            <SidebarButton tabName="sobre" label="Sobre" icon={AboutIcon} />
          </nav>
        </aside>

        <main className="relative min-w-[542px] min-h-[488px]">
          <header className="absolute top-0 left-0 right-0 min-h-[83px] bg-[#514F4F]/85 flex items-center px-8">
            <h1 className="text-2xl font-bold text-white">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </header>

          <div className="p-8 pt-[110px]">
            <div className="absolute top-[95px] left-1/2 -translate-x-1/2 w-full px-8">
              {nickChangeStatus.status !== 'idle' && (
                <Toast
                  type={nickChangeStatus.status}
                  message={nickChangeStatus.message}
                  onClose={resetNickChangeStatus}
                />
              )}
            </div>

            {renderActiveContent()}
          </div>
        </main>

      </div>
    </div>
  );
}

export default SettingsPage;