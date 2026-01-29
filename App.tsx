import React, { Component, useState, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import CustomerView from './views/CustomerView';
import DriverView from './views/DriverView';
import AdminView from './views/AdminView';
import { UserRole } from './types';
import { Lock, Truck, X, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-gray-500 mb-4">Ocorreu um erro inesperado na aplicação.</p>
            <div className="bg-red-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-800 break-words">
                {this.state.error?.message}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { setRole, loginAdmin, drivers, resetAdminPassword } = useApp();
  const [adminPassword, setAdminPassword] = useState('');
  
  // Driver Login State
  const [driverId, setDriverId] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  
  // Recovery State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  
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

  const handleRecovery = () => {
    if (resetAdminPassword(recoveryKey)) {
       setRecoveryMessage('Sucesso! Senha resetada para "1234".');
       setTimeout(() => {
         setIsRecoveryMode(false);
         setRecoveryMessage('');
         setRecoveryKey('');
       }, 2000);
    } else {
       setRecoveryMessage('Chave mestra inválida.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">
            {isRecoveryMode ? 'Recuperar Acesso' : 'Acesso Restrito'}
          </h2>
          <button onClick={() => { onClose(); setIsRecoveryMode(false); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {isRecoveryMode ? (
            <div className="space-y-4 animate-in slide-in-from-right">
               <p className="text-sm text-gray-600">
                 Digite a chave mestra do sistema para resetar a senha do administrador para o padrão (1234).
               </p>
               <input 
                 type="password" 
                 placeholder="Chave Mestra" 
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                 value={recoveryKey}
                 onChange={e => setRecoveryKey(e.target.value)}
               />
               {recoveryMessage && (
                 <p className={`text-xs font-bold ${recoveryMessage.includes('Sucesso') ? 'text-green-600' : 'text-red-500'}`}>
                   {recoveryMessage}
                 </p>
               )}
               <button 
                  onClick={handleRecovery}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700"
               >
                 Resetar Senha
               </button>
               <button 
                  onClick={() => setIsRecoveryMode(false)}
                  className="w-full text-gray-500 text-sm hover:underline"
               >
                 Voltar para Login
               </button>
            </div>
          ) : (
            <>
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
                <div className="flex justify-between items-center">
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button 
                    onClick={() => setIsRecoveryMode(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline ml-auto"
                  >
                    Esqueci a senha
                  </button>
                </div>
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
            </>
          )}
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
    <ErrorBoundary>
      <AppProvider>
        <Main />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;