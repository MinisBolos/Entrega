import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, ShoppingCart, Trash2, CheckCircle, CreditCard, Banknote, QrCode, Copy, X, DollarSign, Loader2, Clock, ChefHat, Bike, MapPin, Info } from 'lucide-react';
import ChefBot from '../components/ChefBot';
import { PaymentMethod, Order, OrderStatus, MenuItem } from '../types';
import { generatePixString } from '../utils/pix';

const CustomerView: React.FC = () => {
  const { menu, addToCart, cart, removeFromCart, placeOrder, isCartOpen, toggleCart, pixConfig, orders } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [cep, setCep] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [changeFor, setChangeFor] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const [showPixModal, setShowPixModal] = useState(false);
  
  // Product Modal State
  const [viewProduct, setViewProduct] = useState<MenuItem | null>(null);
  
  // Track the most recent local order ID - Initialize from LocalStorage
  const [lastOrderId, setLastOrderId] = useState<string | null>(() => {
    return localStorage.getItem('entrega_local_last_order_id');
  });

  // Get the live order object from the global state based on ID
  const activeOrder = orders.find(o => o.id === lastOrderId);

  const categories = ['Todos', ...Array.from(new Set(menu.map(item => item.category)))];
  
  const filteredMenu = selectedCategory === 'Todos' 
    ? menu 
    : menu.filter(item => item.category === selectedCategory);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, '');
    if (rawCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const generateWhatsAppMessage = (order: Order) => {
    const itemsList = order.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n');
    const totalFormatted = order.total.toFixed(2);
    
    let payMethodPt = '';
    if (order.paymentMethod === 'PIX') payMethodPt = 'Pix (Pago)';
    else if (order.paymentMethod === 'CREDIT') payMethodPt = 'Cartão de Crédito';
    else if (order.paymentMethod === 'DEBIT') payMethodPt = 'Cartão de Débito';
    else if (order.paymentMethod === 'CASH') payMethodPt = 'Dinheiro';

    let message = `*Novo Pedido: #${order.id}*\n\n` +
      `*Cliente:* ${order.customerName}\n` +
      `*Endereço:* ${order.address}, ${order.addressNumber} ${order.cep ? `- CEP: ${order.cep}` : ''} ${order.referencePoint ? `(${order.referencePoint})` : ''}\n\n` +
      `*Itens:*\n${itemsList}\n\n` +
      `*Total: R$ ${totalFormatted}*\n` +
      `*Pagamento:* ${payMethodPt}\n`;
    
    if (order.paymentMethod === 'CASH' && order.changeFor) {
      const changeVal = parseFloat(order.changeFor);
      const changeReturn = changeVal - order.total;
      message += `*Troco para:* R$ ${changeVal.toFixed(2)} (Levar R$ ${changeReturn.toFixed(2)})\n`;
    }
    
    message += `\nAguardo confirmação!`;
    return message;
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === 'CASH' && changeFor) {
      const changeVal = parseFloat(changeFor);
      if (isNaN(changeVal) || changeVal < cartTotal) {
        alert("O valor para troco deve ser maior que o total do pedido.");
        return;
      }
    }

    const order = placeOrder(customerName, address, addressNumber, cep, referencePoint, paymentMethod, changeFor);
    
    // Save to State and Persist to LocalStorage
    setLastOrderId(order.id);
    localStorage.setItem('entrega_local_last_order_id', order.id);

    if (paymentMethod === 'PIX') {
      setShowPixModal(true);
    } else {
      const message = generateWhatsAppMessage(order);
      const whatsappUrl = `https://wa.me/5521995612947?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      setTimeout(() => {
        toggleCart();
        resetForm();
      }, 1000);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setAddress('');
    setAddressNumber('');
    setCep('');
    setReferencePoint('');
    setPaymentMethod('PIX');
    setChangeFor('');
  };

  const handleClosePix = () => {
    setShowPixModal(false);
    toggleCart();
    resetForm();
  };

  const handlePixPaid = () => {
    if (activeOrder) {
      const message = generateWhatsAppMessage(activeOrder);
      const whatsappUrl = `https://wa.me/5521995612947?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      handleClosePix();
    }
  };

  const pixPayload = activeOrder && showPixModal 
    ? generatePixString(pixConfig.key, pixConfig.holderName, 'SAO PAULO', activeOrder.total, activeOrder.id.replace(/[^a-zA-Z0-9]/g, '')) 
    : '';

  // Helper to get status UI
  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return { text: 'Aguardando Restaurante', icon: <Clock className="w-5 h-5 animate-pulse" />, color: 'bg-yellow-500' };
      case OrderStatus.PREPARING:
        return { text: 'Pedido em preparação', icon: <ChefHat className="w-5 h-5 animate-bounce" />, color: 'bg-blue-600' };
      case OrderStatus.READY:
        return { text: 'Aguardando Entregador', icon: <MapPin className="w-5 h-5" />, color: 'bg-indigo-600' };
      case OrderStatus.DELIVERING:
        return { text: 'Pedido em rota de entrega', icon: <Bike className="w-5 h-5 animate-pulse" />, color: 'bg-orange-600' };
      case OrderStatus.DELIVERED:
        return { text: 'Entregue com Sucesso', icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-600' };
      case OrderStatus.CANCELLED:
        return { text: 'Pedido Cancelado', icon: <X className="w-5 h-5" />, color: 'bg-red-600' };
      default:
        return { text: 'Processando', icon: <Loader2 className="w-5 h-5" />, color: 'bg-gray-500' };
    }
  };

  return (
    <div className="relative pb-20">
      
      {/* Active Order Status Bar */}
      {activeOrder && activeOrder.status !== OrderStatus.DELIVERED && activeOrder.status !== OrderStatus.CANCELLED && (
        <div className="bg-white border-b border-gray-200 shadow-sm p-4 mb-4 rounded-xl animate-in slide-in-from-top">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Pedido #{activeOrder.id}</span>
            <span className="text-xs font-bold text-gray-900">Tempo estimado: 30-45 min</span>
          </div>
          <div className={`rounded-lg p-3 text-white flex items-center justify-center gap-2 shadow-md transition-colors duration-500 ${getStatusInfo(activeOrder.status).color}`}>
            {getStatusInfo(activeOrder.status).icon}
            <span className="font-bold text-sm md:text-base">{getStatusInfo(activeOrder.status).text}</span>
          </div>
          <div className="mt-3 flex gap-1 h-1.5">
            <div className={`flex-1 rounded-full ${activeOrder.status === OrderStatus.PENDING ? 'bg-yellow-500' : 'bg-gray-200'} ${[OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERING].includes(activeOrder.status) ? 'bg-green-500' : ''}`}></div>
            <div className={`flex-1 rounded-full ${activeOrder.status === OrderStatus.PREPARING ? 'bg-blue-500' : 'bg-gray-200'} ${[OrderStatus.READY, OrderStatus.DELIVERING].includes(activeOrder.status) ? 'bg-green-500' : ''}`}></div>
            <div className={`flex-1 rounded-full ${activeOrder.status === OrderStatus.DELIVERING ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex overflow-x-auto pb-4 mb-4 space-x-2 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu Grid - COMPACT VERSION */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredMenu.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col border border-gray-100"
            >
              <div 
                className="h-24 overflow-hidden relative group cursor-pointer"
                onClick={() => setViewProduct(item)}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Info className="text-white w-6 h-6 drop-shadow-md" />
                </div>
              </div>
              <div className="p-2 flex-1 flex flex-col">
                <div className="mb-1 cursor-pointer" onClick={() => setViewProduct(item)}>
                  <h3 className="font-bold text-gray-900 text-xs line-clamp-1 leading-tight hover:text-orange-600 transition-colors">{item.name}</h3>
                  <p className="text-xs text-green-700 font-bold mt-0.5">R$ {item.price.toFixed(2)}</p>
                </div>
                <p 
                  className="text-[10px] text-gray-500 mb-2 line-clamp-2 flex-1 leading-tight cursor-pointer"
                  onClick={() => setViewProduct(item)}
                >
                  {item.description}
                </p>
                <button
                  onClick={() => addToCart(item)}
                  className="w-full bg-orange-50 text-orange-700 text-[10px] font-bold py-1.5 rounded hover:bg-orange-100 flex items-center justify-center gap-1 transition-colors uppercase tracking-wide"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Sidebar */}
        <div className={`lg:block ${isCartOpen ? 'fixed inset-0 z-50 flex justify-end bg-black/50' : 'hidden'}`}>
          <div className="w-full lg:w-full max-w-md lg:max-w-none bg-white lg:rounded-xl shadow-xl lg:shadow-sm lg:sticky lg:top-24 h-full lg:h-auto flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 lg:bg-white lg:rounded-t-xl">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" /> Seu Pedido
              </h2>
              <button onClick={toggleCart} className="lg:hidden text-gray-500">✕</button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-250px)] lg:max-h-[500px]">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>Seu carrinho está vazio.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center group">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 lg:bg-white lg:rounded-b-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Total</span>
                  <span className="text-xl font-bold text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                
                <form onSubmit={handleCheckout} className="space-y-3">
                  {/* Nome */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Seus Dados</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Seu Nome Completo"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Endereço */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Entrega</label>
                    <div className="flex gap-2 relative">
                       <input 
                        required 
                        type="text" 
                        placeholder="CEP"
                        value={cep}
                        maxLength={9}
                        onChange={e => {
                          setCep(e.target.value);
                          if(e.target.value.replace(/\D/g, '').length === 8) handleCepBlur(e as any);
                        }}
                        onBlur={handleCepBlur}
                        className="flex-1 min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                      {isLoadingCep && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                       <input 
                        required 
                        type="text" 
                        placeholder="Rua / Avenida"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                      <input 
                        required 
                        type="text" 
                        placeholder="Nº"
                        value={addressNumber}
                        onChange={e => setAddressNumber(e.target.value)}
                        className="flex-1 min-w-[60px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Ponto de Referência (Opcional)"
                      value={referencePoint}
                      onChange={e => setReferencePoint(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  {/* Pagamento */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PIX')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === 'PIX' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <QrCode className="w-5 h-5 mb-1" />
                        Pix
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === 'CASH' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <DollarSign className="w-5 h-5 mb-1" />
                        Dinheiro
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CREDIT')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <CreditCard className="w-5 h-5 mb-1" />
                        Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('DEBIT')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors ${paymentMethod === 'DEBIT' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        <Banknote className="w-5 h-5 mb-1" />
                        Débito
                      </button>
                    </div>
                  </div>

                  {/* Troco (se dinheiro) */}
                  {paymentMethod === 'CASH' && (
                    <div className="space-y-1 bg-yellow-50 p-3 rounded-lg border border-yellow-100 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-semibold text-yellow-800 uppercase flex items-center gap-1">
                        Troco para quanto?
                        <span className="text-yellow-600 font-normal lowercase">(opcional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 text-sm">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 50.00"
                          value={changeFor}
                          onChange={e => setChangeFor(e.target.value)}
                          className="w-full pl-10 px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md transition-all active:scale-95 mt-4"
                  >
                    {paymentMethod === 'PIX' ? 'Gerar QR Code Pix' : 'Enviar Pedido (WhatsApp)'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewProduct(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewProduct(null)} className="absolute top-4 right-4 bg-white/80 hover:bg-white p-2 rounded-full text-gray-800 z-10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="h-64 w-full relative">
               <img src={viewProduct.imageUrl} alt={viewProduct.name} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
               <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider bg-orange-600 inline-block px-2 py-1 rounded mb-2">{viewProduct.category}</p>
               </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{viewProduct.name}</h2>
                <span className="text-xl font-bold text-green-700 whitespace-nowrap ml-4">R$ {viewProduct.price.toFixed(2)}</span>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">{viewProduct.description}</p>
              
              <button 
                onClick={() => {
                  addToCart(viewProduct);
                  setViewProduct(null);
                }}
                className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-orange-700 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
              >
                <Plus className="w-5 h-5" /> Adicionar ao Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pix Modal */}
      {showPixModal && activeOrder && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center relative animate-in fade-in zoom-in duration-300">
             <button onClick={handleClosePix} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
             
             <div className="mb-4">
               <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
                 <QrCode className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-bold text-gray-800">Pagamento via Pix</h3>
               <p className="text-sm text-gray-500">Escaneie o QR Code ou copie a chave abaixo</p>
             </div>

             <div className="bg-gray-100 p-4 rounded-xl mb-4 flex items-center justify-center h-48 border border-gray-200">
               {/* Generates QR Code using standard Pix String */}
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixPayload)}`} 
                 alt="QR Code Pix" 
                 className="mix-blend-multiply opacity-90 w-40 h-40"
               />
             </div>

             <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total a Pagar</p>
                <p className="text-2xl font-bold text-green-600">R$ {activeOrder.total.toFixed(2)}</p>
             </div>

             <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col items-center gap-2 mb-4 text-left">
               <div className="w-full">
                 <p className="text-xs text-gray-400 uppercase font-bold">Dados para Transferência</p>
                 <p className="text-sm text-gray-800 font-medium">{pixConfig.bankName}</p>
                 <p className="text-sm text-gray-600">{pixConfig.holderName}</p>
               </div>
               <div className="w-full h-px bg-gray-200 my-1"></div>
               <div className="flex items-center gap-2 w-full">
                 <p className="text-xs text-gray-400 font-bold uppercase w-12 shrink-0">Copia e Cola:</p>
                 <input 
                    readOnly
                    value={pixPayload}
                    className="text-xs text-gray-600 truncate flex-1 font-mono bg-white p-1.5 rounded border border-gray-200 outline-none"
                    onClick={(e) => e.currentTarget.select()}
                 />
                 <button 
                    className="text-white bg-orange-600 hover:bg-orange-700 p-1.5 rounded transition-colors"
                    onClick={() => navigator.clipboard.writeText(pixPayload)}
                 >
                   <Copy className="w-4 h-4" />
                 </button>
               </div>
             </div>

             <button 
               onClick={handlePixPaid}
               className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all active:scale-95"
             >
               Já fiz o pagamento
             </button>
           </div>
        </div>
      )}

      {/* Floating Cart Button for Mobile */}
      <button
        onClick={toggleCart}
        className="fixed lg:hidden bottom-6 left-6 bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 z-40"
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-orange-600">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </div>
      </button>

      {/* AI Bot */}
      <ChefBot />
    </div>
  );
};

export default CustomerView;