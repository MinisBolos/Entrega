import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Plus, ShoppingCart, Trash2, CheckCircle, CreditCard, Banknote, QrCode, Copy, X, DollarSign, Loader2, Clock, ChefHat, Bike, MapPin, Info, Star, MessageSquare, Search, Filter } from 'lucide-react';
import ChefBot from './ChefBot';
import { PaymentMethod, Order, OrderStatus, MenuItem, Review } from './types';
import { generatePixString } from './pix';

const StarRating: React.FC<{ rating: number, size?: string }> = ({ rating, size = "w-3 h-3" }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          className={`${size} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
        />
      ))}
    </div>
  );
};

const CustomerView: React.FC = () => {
  const { menu, addToCart, cart, removeFromCart, placeOrder, isCartOpen, toggleCart, pixConfig, orders, reviews, addReview, isLoadingMenu, updateOrderStatus } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Review Form State
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Track the most recent local order ID
  const [lastOrderId, setLastOrderId] = useState<string | null>(() => {
    return localStorage.getItem('entrega_local_last_order_id');
  });

  const activeOrder = orders.find(o => o.id === lastOrderId);

  const categories = ['Todos', ...Array.from(new Set(menu.map(item => item.category)))];
  
  const filteredMenu = menu.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const getProductRating = (itemId: string) => {
    const itemReviews = reviews.filter(r => r.itemId === itemId);
    if (itemReviews.length === 0) return { average: 0, count: 0 };
    const sum = itemReviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / itemReviews.length, count: itemReviews.length };
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
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
      message += `*Troco para:* R$ ${changeVal.toFixed(2)} (Devolver R$ ${changeReturn.toFixed(2)})\n`;
    }
    
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

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewProduct && reviewName && reviewComment) {
      const newReview: Review = {
        id: Math.random().toString(36).substr(2, 9),
        itemId: viewProduct.id,
        customerName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        date: new Date().toLocaleDateString()
      };
      addReview(newReview);
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
      setShowReviewForm(false);
    }
  };

  const pixPayload = activeOrder && showPixModal 
    ? generatePixString(pixConfig.key, pixConfig.holderName, 'SAO PAULO', activeOrder.total, activeOrder.id.replace(/[^a-zA-Z0-9]/g, '')) 
    : '';

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return { text: 'Aguardando Restaurante', icon: <Clock />, color: 'bg-yellow-500' };
      case OrderStatus.PREPARING: return { text: 'Pedido em Preparo', icon: <ChefHat />, color: 'bg-blue-600' };
      case OrderStatus.READY: return { text: 'Pronto para Retirada', icon: <CheckCircle />, color: 'bg-indigo-600' };
      case OrderStatus.DELIVERING: return { text: 'Saiu para Entrega', icon: <Bike />, color: 'bg-orange-600' };
      case OrderStatus.DELIVERED: return { text: 'Entregue', icon: <CheckCircle />, color: 'bg-green-600' };
      case OrderStatus.CANCELLED: return { text: 'Cancelado', icon: <X />, color: 'bg-red-600' };
      default: return { text: 'Processando', icon: <Loader2 />, color: 'bg-gray-500' };
    }
  };

  return (
    <div className="relative pb-24 max-w-7xl mx-auto">
      
      {/* Banner / Header Space */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">O que você quer comer hoje?</h1>
        <p className="text-gray-500">Escolha seus pratos favoritos e receba em casa.</p>
      </div>

      {/* Active Order Status Bar */}
      {activeOrder && activeOrder.status !== OrderStatus.DELIVERED && activeOrder.status !== OrderStatus.CANCELLED && (
        <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-6 mb-8 transform transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-full text-white ${getStatusInfo(activeOrder.status).color}`}>
                 {getStatusInfo(activeOrder.status).icon}
               </div>
               <div>
                 <p className="font-bold text-gray-900">Pedido #{activeOrder.id}</p>
                 <p className="text-sm text-gray-500">{getStatusInfo(activeOrder.status).text}</p>
               </div>
             </div>
             {(activeOrder.status === OrderStatus.PENDING) && (
                <button 
                  onClick={() => { if(window.confirm('Cancelar pedido?')) updateOrderStatus(activeOrder.id, OrderStatus.CANCELLED); }}
                  className="text-red-500 text-sm font-bold hover:underline"
                >
                  Cancelar
                </button>
             )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${getStatusInfo(activeOrder.status).color}`}
              style={{ width: activeOrder.status === OrderStatus.PENDING ? '20%' : activeOrder.status === OrderStatus.PREPARING ? '40%' : activeOrder.status === OrderStatus.READY ? '70%' : activeOrder.status === OrderStatus.DELIVERING ? '90%' : '100%' }}
            ></div>
          </div>
        </div>
      )}

      {/* Search & Categories */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 sticky top-20 z-30 bg-gray-50/95 backdrop-blur py-2">
        <div className="flex overflow-x-auto gap-2 w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-orange-200'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar pratos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Menu Grid */}
        <div className="lg:col-span-3">
          {isLoadingMenu ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl h-72 animate-pulse shadow-sm"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenu.length === 0 ? (
                <div className="col-span-full text-center py-12">
                   <p className="text-gray-400 text-lg">Nenhum item encontrado.</p>
                </div>
              ) : (
                filteredMenu.map(item => {
                  const { average, count } = getProductRating(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col"
                    >
                      <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => setViewProduct(item)}>
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                          {item.category}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-orange-600 transition-colors cursor-pointer" onClick={() => setViewProduct(item)}>
                            {item.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                           <StarRating rating={average} />
                           <span className="text-xs text-gray-400 ml-1">({count})</span>
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1 cursor-pointer" onClick={() => setViewProduct(item)}>
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                          <span className="text-xl font-bold text-green-700">R$ {item.price.toFixed(2)}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-gray-900 text-white p-2.5 rounded-full hover:bg-orange-600 transition-colors shadow-lg shadow-gray-200 active:scale-90"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Cart Sidebar / Modal */}
        <div className={`
          fixed inset-0 z-50 lg:z-auto lg:static lg:block
          ${isCartOpen ? 'flex justify-end bg-black/50 backdrop-blur-sm' : 'hidden'}
        `}>
          <div className="w-full lg:w-full max-w-md bg-white h-full lg:h-fit lg:min-h-[500px] lg:rounded-2xl lg:shadow-xl lg:border lg:border-gray-100 flex flex-col lg:sticky lg:top-24 animate-in slide-in-from-right duration-300">
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 lg:rounded-t-2xl">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800">
                <ShoppingCart className="w-5 h-5 text-orange-600" /> Seu Pedido
              </h2>
              <button onClick={toggleCart} className="lg:hidden p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(100vh-250px)] lg:max-h-[400px]">
              {cart.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-3">
                     <ShoppingCart className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Seu carrinho está vazio</p>
                  <p className="text-xs text-gray-400 mt-1">Adicione itens deliciosos para começar!</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-gray-50 lg:rounded-b-2xl">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-500 font-medium">Total</span>
                  <span className="text-2xl font-bold text-gray-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                
                <form onSubmit={handleCheckout} className="space-y-4">
                  <input 
                    required 
                    type="text" 
                    placeholder="Seu Nome"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                  
                  <div className="space-y-2">
                     <div className="flex gap-2 relative">
                        <input 
                          required 
                          type="text" 
                          placeholder="CEP"
                          maxLength={9}
                          value={cep}
                          onChange={e => setCep(e.target.value)}
                          onBlur={handleCepBlur}
                          className="w-28 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        {isLoadingCep && <div className="absolute left-20 top-3"><Loader2 className="w-4 h-4 animate-spin text-orange-500"/></div>}
                        <input 
                          required 
                          type="text" 
                          placeholder="Endereço"
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                     </div>
                     <div className="flex gap-2">
                        <input 
                          required 
                          type="text" 
                          placeholder="Nº"
                          value={addressNumber}
                          onChange={e => setAddressNumber(e.target.value)}
                          className="w-20 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                         <input 
                          type="text" 
                          placeholder="Comp. / Ref."
                          value={referencePoint}
                          onChange={e => setReferencePoint(e.target.value)}
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {['PIX', 'CREDIT', 'DEBIT', 'CASH'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method as PaymentMethod)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          paymentMethod === method 
                          ? 'bg-gray-900 text-white border-gray-900' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {method === 'PIX' && 'Pix'}
                        {method === 'CREDIT' && 'Crédito'}
                        {method === 'DEBIT' && 'Débito'}
                        {method === 'CASH' && 'Dinheiro'}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'CASH' && (
                    <input 
                      type="number" 
                      placeholder="Troco para (Ex: 50.00)"
                      value={changeFor}
                      onChange={e => setChangeFor(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-100 bg-yellow-50 rounded-xl text-sm focus:ring-2 focus:ring-yellow-500 outline-none text-yellow-800 placeholder-yellow-600"
                    />
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2 text-base"
                  >
                    {paymentMethod === 'PIX' ? <QrCode className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
                    {paymentMethod === 'PIX' ? 'Gerar Pagamento Pix' : 'Finalizar Pedido'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewProduct(null)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
             <div className="relative h-64 md:h-80 shrink-0">
                <img src={viewProduct.imageUrl} className="w-full h-full object-cover" alt={viewProduct.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <button onClick={() => setViewProduct(null)} className="absolute top-4 right-4 bg-white/20 backdrop-blur hover:bg-white/40 p-2 rounded-full text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-6 left-6 text-white">
                  <span className="bg-orange-600 text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block shadow-sm">{viewProduct.category}</span>
                  <h2 className="text-3xl md:text-4xl font-bold">{viewProduct.name}</h2>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-2xl font-bold text-green-700">R$ {viewProduct.price.toFixed(2)}</p>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                     <StarRating rating={getProductRating(viewProduct.id).average} size="w-4 h-4" />
                     <span className="text-sm font-bold text-gray-700">{getProductRating(viewProduct.id).average.toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-lg leading-relaxed mb-8">{viewProduct.description}</p>
                
                <button 
                  onClick={() => { addToCart(viewProduct); setViewProduct(null); }}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors shadow-xl mb-8 flex items-center justify-center gap-3"
                >
                  <Plus className="w-6 h-6" /> Adicionar ao Pedido
                </button>

                {/* Reviews Section */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-gray-900 flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Avaliações</h3>
                     <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-blue-600 text-sm font-bold hover:underline">
                        {showReviewForm ? 'Cancelar' : 'Escrever Avaliação'}
                     </button>
                  </div>

                  {showReviewForm && (
                    <form onSubmit={handleSubmitReview} className="bg-gray-50 p-4 rounded-xl mb-6 animate-in slide-in-from-top-2">
                       <div className="flex gap-2 mb-4 justify-center">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => setReviewRating(s)} className="transition-transform hover:scale-110">
                              <Star className={`w-8 h-8 ${s <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                       </div>
                       <input 
                         required
                         className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-3 outline-none focus:border-orange-500" 
                         placeholder="Seu nome"
                         value={reviewName}
                         onChange={e => setReviewName(e.target.value)}
                       />
                       <textarea 
                         required
                         className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-3 outline-none focus:border-orange-500 resize-none h-24" 
                         placeholder="Conte o que achou..."
                         value={reviewComment}
                         onChange={e => setReviewComment(e.target.value)}
                       />
                       <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Enviar</button>
                    </form>
                  )}

                  <div className="space-y-4">
                    {reviews.filter(r => r.itemId === viewProduct.id).length === 0 ? (
                      <p className="text-center text-gray-400 italic">Seja o primeiro a avaliar!</p>
                    ) : (
                      reviews.filter(r => r.itemId === viewProduct.id).map(review => (
                        <div key={review.id} className="bg-gray-50 p-4 rounded-xl">
                           <div className="flex justify-between mb-1">
                             <span className="font-bold text-gray-900">{review.customerName}</span>
                             <span className="text-xs text-gray-400">{review.date}</span>
                           </div>
                           <div className="mb-2"><StarRating rating={review.rating} /></div>
                           <p className="text-gray-600 text-sm">{review.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Pix Modal */}
      {showPixModal && activeOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center relative animate-in zoom-in-95 duration-300 shadow-2xl">
             <button onClick={handleClosePix} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
             
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
               <QrCode className="w-8 h-8" />
             </div>
             
             <h3 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Pix</h3>
             <p className="text-gray-500 text-sm mb-6">Escaneie o QR Code abaixo para pagar</p>

             <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-inner mb-6 inline-block">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`} 
                 alt="QR Code" 
                 className="w-48 h-48 mix-blend-multiply"
               />
             </div>

             <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Valor Total</p>
                <p className="text-3xl font-bold text-gray-900">R$ {activeOrder.total.toFixed(2)}</p>
             </div>

             <div className="flex gap-2">
               <input readOnly value={pixPayload} className="flex-1 bg-gray-100 border-none rounded-lg text-xs text-gray-500 px-3 outline-none" />
               <button onClick={() => navigator.clipboard.writeText(pixPayload)} className="bg-gray-200 hover:bg-gray-300 p-3 rounded-lg text-gray-600 transition-colors">
                 <Copy className="w-5 h-5" />
               </button>
             </div>

             <button 
               onClick={handlePixPaid}
               className="w-full bg-green-600 text-white py-4 rounded-xl font-bold mt-6 hover:bg-green-700 transition-all shadow-lg shadow-green-200"
             >
               Confirmar Pagamento
             </button>
           </div>
        </div>
      )}

      {/* Mobile Cart Floating Button */}
      <button
        onClick={toggleCart}
        className="fixed lg:hidden bottom-6 left-6 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 active:bg-orange-600"
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          {cart.length > 0 && (
            <span className="absolute -top-3 -right-3 bg-orange-600 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-900">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </div>
      </button>

      <ChefBot />
    </div>
  );
};

export default CustomerView;