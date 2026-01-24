import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import CustomerView from './views/CustomerView';
import DriverView from './views/DriverView';
import AdminView from './views/AdminView';
import { UserRole } from './types';
import { Lock, Truck, X } from 'lucide-react';

const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { setRole, loginAdmin, drivers } = useApp();
  const [adminPassword, setAdminPassword] = useState('');
  
  // Driver Login State
  const [driverId, setDriverId] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  
  const [error, setError] = useState('');
  const [driverError, setDriverError] = useState('');

  if (!isOpen) return null;

  const handleAdminLogin = () => {
    if (loginAdmin(adminPassword)) {
      setRole(UserRole.ADMIN);
      setAdminPassword('');
      setError('');
      onClose();
    } else {
      setError('Senha incorreta.');
    }
  };

  const handleDriverLogin = () => {
    const driver = drivers.find(d => d.id === driverId && d.password === driverPassword);
    
    if (driver && driver.active) {
      setRole(UserRole.DRIVER);
      setDriverId('');
      setDriverPassword('');
      setDriverError('');
      onClose();
    } else {
      setDriverError('ID de entregador ou senha inválidos.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Acesso Restrito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Admin Login */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <Lock className="w-4 h-4" /> Administrador
            </h3>
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Senha" 
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
              />
              <button 
                onClick={handleAdminLogin}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Entrar
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OU</span>
            </div>
          </div>

          {/* Driver Login */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4" /> Entregadores
            </h3>
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="ID do Entregador" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="password" 
                  placeholder="Senha" 
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={driverPassword}
                  onChange={e => setDriverPassword(e.target.value)}
                />
                <button 
                  onClick={handleDriverLogin}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Entrar
                </button>
              </div>
            </div>
             {driverError && <p className="text-xs text-red-500">{driverError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const { role } = useApp();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <Layout onLoginClick={() => setIsLoginOpen(true)}>
        {role === UserRole.CUSTOMER && <CustomerView />}
        {role === UserRole.DRIVER && <DriverView />}
        {role === UserRole.ADMIN && <AdminView />}
      </Layout>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
};

export default App;