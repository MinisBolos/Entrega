
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShoppingBag, Truck, ChefHat, LogOut, Lock, Download } from 'lucide-react';
import InstallPwaBanner from './InstallPwaBanner';

const Layout: React.FC<{ children: React.ReactNode, onLoginClick: () => void }> = ({ children, onLoginClick }) => {
  const { role, setRole, cart, isAdminLoggedIn, logoutAdmin, toggleCart } = useApp();
  
  // Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    logoutAdmin();
    setRole(UserRole.CUSTOMER);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50 pt-safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span 
                className="text-2xl font-bold text-orange-600 tracking-tight cursor-pointer"
                onClick={() => setRole(UserRole.CUSTOMER)}
              >
                EntregaLocal
              </span>
              {role === UserRole.DRIVER && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">Entregador</span>}
              {role === UserRole.ADMIN && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">Admin</span>}
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* Install Button in Header (Desktop/Top) */}
              {showInstallButton && role === UserRole.CUSTOMER && (
                <button
                  onClick={handleInstallClick}
                  className="hidden md:flex items-center gap-2 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-800 transition-colors animate-pulse"
                >
                  <Download className="w-4 h-4" /> Instalar App
                </button>
              )}

              {role === UserRole.CUSTOMER && (
                <button 
                  onClick={toggleCart}
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ShoppingBag className="h-6 w-6 text-gray-600" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
              
              {(role === UserRole.ADMIN || role === UserRole.DRIVER) && (
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 ml-4 bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto pb-safe-bottom">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-center text-sm text-gray-500">
            &copy; 2024 EntregaLocal AI. Powered by Google Gemini.
          </p>
          
          <div className="flex items-center gap-4">
            {role === UserRole.CUSTOMER && (
              <button 
                onClick={onLoginClick}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3" /> Acesso Parceiro
              </button>
            )}
          </div>
        </div>
      </footer>
      
      {/* PWA Banner for Mobile */}
      {role === UserRole.CUSTOMER && (
        <InstallPwaBanner 
          deferredPrompt={deferredPrompt} 
          onInstall={handleInstallClick} 
        />
      )}
    </div>
  );
};

export default Layout;
