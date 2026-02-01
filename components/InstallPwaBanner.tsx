
import React, { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

interface Props {
  deferredPrompt: any;
  onInstall: () => void;
}

const InstallPwaBanner: React.FC<Props> = ({ deferredPrompt, onInstall }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if strictly in browser (not standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setTimeout(() => setShowBanner(true), 3000);
    } else if (deferredPrompt) {
      // If we have a prompt (Android/Desktop), show banner
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [deferredPrompt]);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-500 md:hidden">
      <div className="bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 relative border border-gray-200">
        <button 
          onClick={() => setShowBanner(false)} 
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600">
             {isIOS ? <Share className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Instalar Aplicativo</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isIOS ? 'Adicione à Tela de Início' : 'Instale para uma melhor experiência'}
            </p>
          </div>
        </div>

        {isIOS ? (
           <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-2 border border-gray-100">
             <span>Toque em</span>
             <Share className="w-4 h-4 text-blue-500" />
             <span>e depois em <b>"Adicionar à Tela de Início"</b></span>
           </div>
        ) : (
          <button 
            onClick={onInstall}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
          >
            <Download className="w-4 h-4" /> Instalar Agora
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallPwaBanner;
