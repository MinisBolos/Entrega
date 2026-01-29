import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { generateMenuDescription, generateProductImage } from './geminiService';
import { Edit2, Save, Sparkles, X, Check, ChevronDown, ChevronUp, Map as MapIcon, RefreshCcw, CreditCard, Banknote, QrCode, DollarSign, Archive, Clock, Key, Settings, Users, UserPlus, Truck, ImageIcon, Loader2, PlusCircle, Trash2, Bell, ExternalLink, Eye, Calendar, Filter, TrendingUp, ChefHat, CheckCircle, Bike } from 'lucide-react';
import { MenuItem, OrderStatus, Order, PaymentMethod, PixConfig } from './types';
import { generatePixString } from './pix';

// Declare Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

// Simple notification sound (Base64 MP3 beep)
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFZYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFZYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAFRTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAA0AAAAAAABAAA0AAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAAAAAA0AAAAAAABAAA0AAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAAAAAA0AAAAAAABAAA0AAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAAAAAA0AAAAAAABAAA0AAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAAAAAA0AAAAAAABAAA0AAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const getCoordinates = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) / 3000; 
  const lngOffset = (((hash * 13) % 100) - 50) / 3000;
  return {
    lat: -23.5505 + latOffset,
    lng: -46.6333 + lngOffset
  };
};

const RESTAURANT_LOCATION = { lat: -23.5505, lng: -46.6333 };

const PaymentIcon: React.FC<{ method: PaymentMethod, changeFor?: string }> = ({ method, changeFor }) => {
  switch (method) {
    case 'PIX': return <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded"><QrCode className="w-3 h-3" /> Pix</span>;
    case 'CREDIT': return <span className="flex items-center gap-1 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded"><CreditCard className="w-3 h-3" /> Crédito</span>;
    case 'DEBIT': return <span className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded"><Banknote className="w-3 h-3" /> Débito</span>;
    case 'CASH': return (
      <span className="flex items-center gap-1 text-yellow-700 text-xs font-bold bg-yellow-50 px-2 py-1 rounded">
        <DollarSign className="w-3 h-3" /> Dinheiro
        {changeFor && <span className="text-[10px] text-yellow-600 ml-1 border-l border-yellow-200 pl-1">Troco p/ R$ {changeFor}</span>}
      </span>
    );
    default: return null;
  }
};

const AdminTrackingMap: React.FC<{ activeDeliveries: Order[] }> = ({ activeDeliveries }) => {
  const { driverLocation } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    mapInstanceRef.current = window.L.map(mapRef.current).setView([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], 14);
    
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: 'OpenStreetMap | CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstanceRef.current);

    const map = mapInstanceRef.current;
    const L = window.L;

    const restIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ea580c; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], { icon: restIcon })
      .addTo(map)
      .bindPopup("<b>Restaurante</b>");

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;
    const L = window.L;

    markersRef.current.forEach(layer => map.removeLayer(layer));
    markersRef.current = [];

    activeDeliveries.forEach(order => {
      const coords = getCoordinates(order.id);
      const custIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [12, 12],
      });
      const marker = L.marker([coords.lat, coords.lng], { icon: custIcon })
        .addTo(map)
        .bindPopup(`<b>Cliente: ${order.customerName}</b>`);
      markersRef.current.push(marker);
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
      const driverIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #16a34a; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup("<b>Entregador</b><br>Em movimento");
    }

  }, [activeDeliveries, driverLocation]);

  return <div ref={mapRef} className="w-full h-80 rounded-xl z-0" />;
};

// Notification Component
const NewOrderNotification: React.FC<{ 
  show: boolean; 
  orderId: string; 
  customerName: string; 
  total: number; 
  onClose: () => void;
  onView: () => void;
}> = ({ show, orderId, customerName, total, onClose, onView }) => {
  if (!show) return null;

  return (
    <div className="fixed top-20 right-4 z-[200] animate-in slide-in-from-right duration-500">
      <div className="bg-white border-l-4 border-orange-600 rounded-lg shadow-2xl p-4 w-80">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 text-orange-600 font-bold mb-1">
              <Bell className="w-5 h-5 animate-bounce" />
              <span>Novo Pedido!</span>
            </div>
            <p className="text-sm font-bold text-gray-800">#{orderId} • {customerName}</p>
            <p className="text-sm text-green-600 font-bold mt-1">R$ {total.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <button 
          onClick={onView} 
          className="w-full bg-orange-100 text-orange-700 text-sm font-bold py-2 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" /> Ver Pedido
        </button>
      </div>
    </div>
  );
};

const AdminView: React.FC = () => {
  const { menu, updateMenuItem, addMenuItem, removeMenuItem, orders, updateOrderStatus, assignDriver, isAdminLoggedIn, pixConfig, setPixConfig, drivers, addDriver, removeDriver } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  
  // State for Creating New Product
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<MenuItem>>({ name: '', description: '', price: 0, category: 'Lanches', imageUrl: 'https://placehold.co/400x300' });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Separate loading states for New Product Form
  const [isGeneratingNewDesc, setIsGeneratingNewDesc] = useState(false);
  const [isGeneratingNewImage, setIsGeneratingNewImage] = useState(false);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [viewSection, setViewSection] = useState<'ORDERS' | 'MENU' | 'SETTINGS' | 'DRIVERS'>('ORDERS');
  
  // Settings State
  const [tempPixConfig, setTempPixConfig] = useState<PixConfig>(pixConfig);
  
  // Drivers State
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');

  // History Filter State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELLED'>('ALL');

  // Notification Logic
  const [notification, setNotification] = useState<{show: boolean, orderId: string, customerName: string, total: number} | null>(null);
  const prevOrdersRef = useRef<Order[]>(orders);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio with Base64 for reliability
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.6;
  }, []);

  // Watch for new orders
  useEffect(() => {
    // Only run if we have previous orders to compare against (prevent notification on initial load)
    if (prevOrdersRef.current.length > 0 && orders.length > prevOrdersRef.current.length) {
      // Find the new order(s)
      const newOrders = orders.filter(o => !prevOrdersRef.current.find(po => po.id === o.id));
      const latestNew = newOrders.find(o => o.status === OrderStatus.PENDING);

      if (latestNew) {
        // Trigger Notification
        setNotification({
          show: true,
          orderId: latestNew.id,
          customerName: latestNew.customerName,
          total: latestNew.total
        });

        // Try to play sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.log("Audio autoplay blocked:", e));
        }

        // Auto hide after 15 seconds (extended time to allow interaction)
        const timer = setTimeout(() => {
          setNotification(prev => prev ? { ...prev, show: false } : null);
        }, 15000);
        
        return () => clearTimeout(timer);
      }
    }
    prevOrdersRef.current = orders;
  }, [orders]);

  if (!isAdminLoggedIn) {
    return <div className="p-8 text-center text-red-600">Acesso negado. Faça login.</div>;
  }

  // --- Edit Logic ---
  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm.name && editForm.price) {
      // Ensure the ID is present and valid
      const updatedItem = { ...editForm, id: editingId } as MenuItem;
      updateMenuItem(updatedItem);
      setEditingId(null);
    }
  };

  const handleDeleteProduct = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir este produto do cardápio?")) {
      removeMenuItem(id);
    }
  };

  const handleMagicWrite = async () => {
    if (!editForm.name) return;
    setIsGenerating(true);
    const hint = editForm.description || "ingredientes frescos";
    const newDesc = await generateMenuDescription(editForm.name, hint);
    setEditForm(prev => ({ ...prev, description: newDesc }));
    setIsGenerating(false);
  };

  const handleMagicImage = async () => {
    if (!editForm.name) return;
    setIsGeneratingImage(true);
    const desc = editForm.description || editForm.name;
    const base64Image = await generateProductImage(editForm.name, desc);
    if (base64Image) {
      setEditForm(prev => ({ ...prev, imageUrl: base64Image }));
    } else {
      alert('Não foi possível gerar a imagem. Tente novamente.');
    }
    setIsGeneratingImage(false);
  };

  // --- Create Logic ---
  const handleSaveNewProduct = () => {
    if (newProductForm.name && newProductForm.price && newProductForm.category) {
      const newId = Math.random().toString(36).substr(2, 9);
      const newItem: MenuItem = {
        id: newId,
        name: newProductForm.name!,
        description: newProductForm.description || '',
        price: Number(newProductForm.price),
        category: newProductForm.category!,
        imageUrl: newProductForm.imageUrl || 'https://placehold.co/400x300'
      };
      addMenuItem(newItem);
      setIsCreatingProduct(false);
      setNewProductForm({ name: '', description: '', price: 0, category: 'Lanches', imageUrl: 'https://placehold.co/400x300' });
    } else {
      alert("Preencha o nome, preço e categoria.");
    }
  };

  const handleMagicWriteNew = async () => {
    if (!newProductForm.name) return;
    setIsGeneratingNewDesc(true);
    const hint = newProductForm.description || "delicioso e fresco";
    const newDesc = await generateMenuDescription(newProductForm.name, hint);
    setNewProductForm(prev => ({ ...prev, description: newDesc }));
    setIsGeneratingNewDesc(false);
  };

  const handleMagicImageNew = async () => {
    if (!newProductForm.name) return;
    setIsGeneratingNewImage(true);
    const desc = newProductForm.description || newProductForm.name;
    const base64Image = await generateProductImage(newProductForm.name, desc);
    if (base64Image) {
      setNewProductForm(prev => ({ ...prev, imageUrl: base64Image }));
    } else {
      alert('Não foi possível gerar a imagem.');
    }
    setIsGeneratingNewImage(false);
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const saveSettings = () => {
    setPixConfig(tempPixConfig);
    alert("Configurações Pix Salvas!");
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if(newDriverName && newDriverPhone && newDriverPassword) {
      addDriver(newDriverName, newDriverPhone, newDriverPassword);
      setNewDriverName('');
      setNewDriverPhone('');
      setNewDriverPassword('');
    } else {
      alert("Preencha todos os campos do entregador.");
    }
  };

  // Handlers for Notification Interaction
  const handleViewNotificationOrder = () => {
    if (notification) {
      setViewSection('ORDERS');
      setActiveTab('ACTIVE');
      setExpandedOrderId(notification.orderId);
      setNotification(null);
    }
  };

  // Order Filtering Logic
  const activeOrders = orders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED);
  const historyOrders = orders.filter(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED);
  const deliveringOrders = orders.filter(o => o.status === OrderStatus.DELIVERING);

  // Apply filters to history orders
  const filteredHistoryOrders = historyOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    orderDate.setHours(0,0,0,0);
    
    // Status Filter
    if (historyStatusFilter !== 'ALL' && order.status !== historyStatusFilter) return false;
    
    // Date Range Filter
    if (historyStartDate) {
      const start = new Date(historyStartDate);
      start.setHours(0,0,0,0);
      if (orderDate < start) return false;
    }
    
    if (historyEndDate) {
      const end = new Date(historyEndDate);
      end.setHours(0,0,0,0);
      if (orderDate > end) return false;
    }

    return true;
  });

  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : filteredHistoryOrders;
  
  // Calculate stats for History tab
  const historyTotalRevenue = filteredHistoryOrders
    .filter(o => o.status === OrderStatus.DELIVERED)
    .reduce((acc, curr) => acc + curr.total, 0);
  
  const historyCount = filteredHistoryOrders.length;

  // Pix Preview String
  const previewPixString = generatePixString(tempPixConfig.key, tempPixConfig.holderName, 'SAO PAULO', 1.00);

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <span className="flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pendente</span>;
      case OrderStatus.PREPARING:
        return <span className="flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-blue-100 text-blue-800"><ChefHat className="w-3 h-3 animate-pulse" /> Em Preparação</span>;
      case OrderStatus.READY:
        return <span className="flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-indigo-100 text-indigo-800"><CheckCircle className="w-3 h-3" /> Aguardando Entregador</span>;
      case OrderStatus.DELIVERING:
        return <span className="flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-orange-100 text-orange-800"><Bike className="w-3 h-3 animate-bounce" /> Em Rota de Entrega</span>;
      case OrderStatus.DELIVERED:
        return <span className="flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-gray-200 text-gray-800">Entregue</span>;
      case OrderStatus.CANCELLED:
        return <span className="flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold bg-red-100 text-red-800">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Notifications */}
      {notification && (
        <NewOrderNotification 
          show={notification.show} 
          orderId={notification.orderId}
          customerName={notification.customerName}
          total={notification.total}
          onClose={() => setNotification(null)}
          onView={handleViewNotificationOrder}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2 mb-6">
        <button onClick={() => setViewSection('ORDERS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${viewSection === 'ORDERS' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Gerenciar Pedidos
        </button>
        <button onClick={() => setViewSection('MENU')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${viewSection === 'MENU' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Cardápio
        </button>
        <button onClick={() => setViewSection('DRIVERS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${viewSection === 'DRIVERS' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Entregadores
        </button>
        <button onClick={() => setViewSection('SETTINGS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${viewSection === 'SETTINGS' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Configurações (Pix)
        </button>
      </div>

      {/* SETTINGS SECTION (PIX) */}
      {viewSection === 'SETTINGS' && (
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-600" /> Configuração de Pagamento Pix
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Chave Pix</label>
              <input 
                type="text" 
                value={tempPixConfig.key} 
                onChange={e => setTempPixConfig({...tempPixConfig, key: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="CPF, Email ou Aleatória"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Banco</label>
                <input 
                  type="text" 
                  value={tempPixConfig.bankName} 
                  onChange={e => setTempPixConfig({...tempPixConfig, bankName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ex: Nubank"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Responsável</label>
                <input 
                  type="text" 
                  value={tempPixConfig.holderName} 
                  onChange={e => setTempPixConfig({...tempPixConfig, holderName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Nome Completo"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-6 mt-6 border border-gray-100">
               <div className="bg-white p-2 rounded shadow-sm">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(previewPixString)}`} 
                   alt="Preview QR" 
                   className="w-24 h-24 mix-blend-multiply"
                 />
               </div>
               <div>
                 <p className="font-bold text-gray-800 text-sm mb-1">QR Code Gerado por IA</p>
                 <p className="text-xs text-gray-500">Este QR Code será exibido automaticamente para o cliente ao selecionar Pix.</p>
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={saveSettings} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Salvar Configurações
              </button>
            </div>
          </div>
        </section>
      )}

      {/* DRIVERS SECTION */}
      {viewSection === 'DRIVERS' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Cadastrar Entregador
              </h2>
              <form onSubmit={handleAddDriver} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Nome do Entregador" 
                  required
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Telefone / WhatsApp" 
                  required
                  value={newDriverPhone}
                  onChange={e => setNewDriverPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input 
                  type="password" 
                  placeholder="Senha de Acesso" 
                  required
                  value={newDriverPassword}
                  onChange={e => setNewDriverPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">
                  Cadastrar
                </button>
              </form>
           </div>

           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" /> Lista de Entregadores
              </h2>
              <div className="space-y-2">
                {drivers.length === 0 ? <p className="text-gray-500 italic">Nenhum entregador cadastrado.</p> : 
                  drivers.map(driver => (
                    <div key={driver.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-bold text-gray-800">{driver.name}</p>
                           <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-mono">ID: {driver.id}</span>
                        </div>
                        <p className="text-xs text-gray-500">{driver.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Ativo</span>
                        <button 
                          onClick={() => removeDriver(driver.id)}
                          className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover Entregador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
           </div>
        </section>
      )}

      {/* ORDERS SECTION */}
      {viewSection === 'ORDERS' && (
        <>
          {/* Map */}
          {activeTab === 'ACTIVE' && (
            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <MapIcon className="w-6 h-6 text-blue-600" /> Monitoramento em Tempo Real
                </h2>
                <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                  <RefreshCcw className="w-3 h-3 animate-spin" /> Ao Vivo
                </span>
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 min-h-[320px]">
                  <AdminTrackingMap activeDeliveries={deliveringOrders} />
                </div>
              </div>
            </section>
          )}

          {/* List */}
          <section>
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 border-b pb-2 gap-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('ACTIVE')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'ACTIVE' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  Ativos ({activeOrders.length})
                </button>
                <button 
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  <Archive className="w-4 h-4" /> Histórico
                </button>
              </div>
            </div>

            {/* History Filters & Stats */}
            {activeTab === 'HISTORY' && (
              <div className="mb-6 space-y-4 animate-in slide-in-from-top-2">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
                  <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">De</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                      <input 
                        type="date" 
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                        className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none w-full"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-auto">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Até</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                      <input 
                        type="date" 
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                        className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none w-full"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Status</label>
                    <div className="relative">
                      <Filter className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                      <select 
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                        className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none w-full bg-white"
                      >
                        <option value="ALL">Todos os Status</option>
                        <option value="DELIVERED">Entregues</option>
                        <option value="CANCELLED">Cancelados</option>
                      </select>
                    </div>
                  </div>
                  {(historyStartDate || historyEndDate || historyStatusFilter !== 'ALL') && (
                    <button 
                      onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                        setHistoryStatusFilter('ALL');
                      }}
                      className="text-red-500 text-xs font-bold hover:underline mb-2 md:mb-0"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase">Total de Pedidos</p>
                      <p className="text-2xl font-bold text-gray-900">{historyCount}</p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                      <Archive className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase">Receita (Entregues)</p>
                      <p className="text-2xl font-bold text-green-600">R$ {historyTotalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-lg text-green-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedOrders.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Archive className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum pedido encontrado com os filtros atuais.</p>
                  </div>
                ) : (
                  displayedOrders.map(order => (
                    <div 
                      key={order.id} 
                      className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${order.status === OrderStatus.CANCELLED ? 'border-red-100 opacity-75' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-center mb-3 cursor-pointer" onClick={() => toggleOrder(order.id)}>
                        <span className="font-bold text-lg">#{order.id}</span>
                        {getOrderStatusBadge(order.status)}
                      </div>
                      <div className="mb-4 text-sm text-gray-600">
                          <div className="flex justify-between items-start">
                            <p><strong>Cliente:</strong> {order.customerName}</p>
                            <span className="text-xs text-gray-400">{order.createdAt.toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2 mt-1 mb-2">
                            <PaymentIcon method={order.paymentMethod} changeFor={order.changeFor} />
                          </div>

                          {/* Driver Assignment Display */}
                          {activeTab === 'ACTIVE' && order.status !== OrderStatus.DELIVERED && (
                            <div className="mt-3 mb-3">
                              {order.status === OrderStatus.READY || order.status === OrderStatus.DELIVERING ? (
                                <div>
                                   <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                                      {order.status === OrderStatus.DELIVERING ? 'Entregador em Rota' : 'Entregador Responsável'}
                                   </label>
                                   <div className="flex gap-2">
                                     <select 
                                       className="flex-1 text-xs border border-gray-300 rounded p-1.5 bg-gray-50 outline-none focus:border-orange-500"
                                       value={order.driverId || ''}
                                       onChange={(e) => assignDriver(order.id, e.target.value)}
                                     >
                                       <option value="">{order.status === OrderStatus.DELIVERING ? 'Em rota...' : '-- Aguardando Coleta --'}</option>
                                       {drivers.map(d => (
                                         <option key={d.id} value={d.id}>{d.name}</option>
                                       ))}
                                     </select>
                                   </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                          
                          {expandedOrderId === order.id ? (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                              <div className="mb-3 border-b border-gray-200 pb-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Endereço de Entrega</p>
                                <p className="text-sm font-medium text-gray-800">{order.address}, {order.addressNumber}</p>
                                {order.cep && <p className="text-xs text-gray-500 mt-0.5">CEP: {order.cep}</p>}
                              </div>
                              <ul className="space-y-1">
                                {order.items.map((item, idx) => (
                                  <li key={idx} className="flex justify-between text-gray-800">
                                    <span>{item.quantity}x {item.name}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                                <span>Total:</span>
                                <span>R$ {order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-1 text-gray-500 hover:text-orange-600 cursor-pointer" onClick={() => toggleOrder(order.id)}>
                              <p>Ver detalhes</p> <ChevronDown className="w-4 h-4" />
                            </div>
                          )}
                      </div>
                      
                      {activeTab === 'ACTIVE' && (
                        <div className="flex gap-2 border-t pt-3">
                            {order.status === OrderStatus.PENDING && (
                              <button onClick={() => updateOrderStatus(order.id, OrderStatus.PREPARING)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Aceitar Pedido
                              </button>
                            )}
                            {order.status === OrderStatus.PREPARING && (
                              <button onClick={() => updateOrderStatus(order.id, OrderStatus.READY)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                                <ChefHat className="w-4 h-4" /> Marcar como Pronto
                              </button>
                            )}
                             {/* If Ready, we wait for driver or manual assign. If Delivering, we show info */}
                            {order.status === OrderStatus.READY && (
                               <div className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wide">
                                  <Clock className="w-4 h-4" /> Aguardando Coleta
                               </div>
                            )}
                            {order.status === OrderStatus.DELIVERING && (
                               <div className="flex-1 bg-orange-100 text-orange-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wide">
                                  <Bike className="w-4 h-4" /> Em Rota de Entrega
                               </div>
                            )}

                            {(order.status === OrderStatus.PENDING || order.status === OrderStatus.PREPARING) && (
                              <button 
                                onClick={() => {
                                  if(window.confirm("Cancelar pedido?")) updateOrderStatus(order.id, OrderStatus.CANCELLED);
                                }} 
                                className="px-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs font-bold flex items-center gap-1"
                                title="Cancelar Pedido"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  ))
                )}
            </div>
          </section>
        </>
      )}

      {/* MENU SECTION */}
      {viewSection === 'MENU' && (
        <section>
          {/* Create New Product Section */}
          <div className="mb-6">
            {!isCreatingProduct ? (
              <button 
                onClick={() => setIsCreatingProduct(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 transition-colors shadow-sm"
              >
                <PlusCircle className="w-5 h-5" /> Novo Produto
              </button>
            ) : (
              <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
                 <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                   <h3 className="font-bold text-lg text-gray-800">Adicionar Novo Produto</h3>
                   <button onClick={() => setIsCreatingProduct(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Produto</label>
                       <input 
                         type="text" 
                         className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500"
                         placeholder="Ex: X-Salada Especial"
                         value={newProductForm.name}
                         onChange={e => setNewProductForm({...newProductForm, name: e.target.value})}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                       <select 
                         className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500 bg-white"
                         value={newProductForm.category}
                         onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}
                       >
                         <option>Lanches</option>
                         <option>Pizzas</option>
                         <option>Bebidas</option>
                         <option>Sobremesas</option>
                         <option>Combos</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço (R$)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500"
                         value={newProductForm.price}
                         onChange={e => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})}
                       />
                     </div>
                   </div>

                   <div className="space-y-4">
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                       <div className="relative">
                          <textarea 
                            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500 h-24 resize-none"
                            placeholder="Descreva os ingredientes..."
                            value={newProductForm.description}
                            onChange={e => setNewProductForm({...newProductForm, description: e.target.value})}
                          />
                          <button 
                            onClick={handleMagicWriteNew}
                            disabled={isGeneratingNewDesc || !newProductForm.name}
                            className="absolute bottom-2 right-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200 disabled:opacity-50"
                          >
                             {isGeneratingNewDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                             Gerar Texto
                          </button>
                       </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Imagem URL</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500 text-sm"
                            value={newProductForm.imageUrl}
                            onChange={e => setNewProductForm({...newProductForm, imageUrl: e.target.value})}
                          />
                          <button 
                             onClick={handleMagicImageNew}
                             disabled={isGeneratingNewImage || !newProductForm.name}
                             className="bg-purple-600 text-white px-3 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                          >
                            {isGeneratingNewImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Gerar Foto
                          </button>
                        </div>
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-end mt-6 gap-3">
                   <button onClick={() => setIsCreatingProduct(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                   <button onClick={handleSaveNewProduct} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Salvar Produto</button>
                 </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço (R$)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menu.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                           <input
                            type="text"
                            placeholder="Nome"
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                          />
                          <div className="flex items-center gap-1">
                             <ImageIcon className="w-3 h-3 text-gray-400" />
                             <input
                              type="text"
                              placeholder="URL da Imagem"
                              value={editForm.imageUrl}
                              onChange={e => setEditForm({...editForm, imageUrl: e.target.value})}
                              className="border border-gray-300 rounded px-2 py-1 w-full text-xs"
                            />
                            <button
                               onClick={handleMagicImage}
                               disabled={isGeneratingImage || !editForm.name}
                               className="bg-purple-100 text-purple-700 p-1.5 rounded hover:bg-purple-200 disabled:opacity-50"
                               title="Gerar Imagem com IA"
                             >
                               {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <img className="h-8 w-8 rounded-full object-cover mr-3" src={item.imageUrl} alt="" />
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === item.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editForm.description}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                            className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                            rows={3}
                          />
                          <button
                            onClick={handleMagicWrite}
                            disabled={isGenerating}
                            className="self-start text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isGenerating ? 'Gerando...' : 'Gerar Texto com IA'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 line-clamp-2">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                          className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">R$ {item.price.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={saveEdit} className="text-green-600 hover:text-green-900"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="text-red-600 hover:text-red-900"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                            <button onClick={() => startEdit(item)} className="text-orange-600 hover:text-orange-900" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => handleDeleteProduct(e, item.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminView;