import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { OrderStatus, Order, PaymentMethod, LatLng } from './types';
import { MapPin, Package, CheckSquare, Clock, ChevronDown, ChevronUp, Navigation, ExternalLink, CreditCard, Banknote, QrCode, DollarSign, Bike } from 'lucide-react';

// Declare Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

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
    case 'PIX': return <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded"><QrCode className="w-3 h-3" /> Pix</div>;
    case 'CREDIT': return <div className="flex items-center gap-1 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded"><CreditCard className="w-3 h-3" /> Crédito</div>;
    case 'DEBIT': return <div className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded"><Banknote className="w-3 h-3" /> Débito</div>;
    case 'CASH': return (
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 text-yellow-700 text-xs font-bold bg-yellow-50 px-2 py-1 rounded"><DollarSign className="w-3 h-3" /> Dinheiro</div>
        {changeFor && <span className="text-[10px] text-yellow-600 mt-0.5 font-medium">Troco p/ R$ {changeFor}</span>}
      </div>
    );
    default: return null;
  }
};

const OrderCard: React.FC<{ order: Order, actionButton?: React.ReactNode, isDelivering?: boolean, driverLocation?: LatLng }> = ({ order, actionButton, isDelivering, driverLocation }) => {
  const [expanded, setExpanded] = useState(false);
  const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullAddress = `${order.address}, ${order.addressNumber}, ${order.cep ? order.cep : ''}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    let url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    // If delivering and we have driver location, use Directions API
    if (isDelivering && driverLocation) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${driverLocation.lat},${driverLocation.lng}&destination=${encodedAddress}&travelmode=driving`;
    }
    
    window.open(url, '_blank');
  };

  return (
    <div 
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full hover:shadow-md transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido #{order.id}</span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{order.customerName}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-bold">
              R$ {order.total.toFixed(2)}
            </span>
            <PaymentIcon method={order.paymentMethod} changeFor={order.changeFor} />
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-800 font-medium leading-tight">
                {order.address}, {order.addressNumber}
              </p>
              {order.cep && <p className="text-xs text-gray-500">CEP: {order.cep}</p>}
              {order.referencePoint && (
                <p className="text-xs text-gray-500 mt-1">Ref: {order.referencePoint}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
             <Package className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
             <div className="flex-1">
               <div className="flex items-center justify-between">
                 <p className="text-sm text-gray-600 font-medium">{totalItems} itens</p>
                 {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
               </div>
               
               {expanded ? (
                 <ul className="mt-2 bg-gray-50 p-2 rounded-lg space-y-1">
                   {order.items.map((item, idx) => (
                     <li key={idx} className="text-sm text-gray-800 flex justify-between">
                       <span>{item.quantity}x {item.name}</span>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <p className="text-sm text-gray-500 mt-1 truncate">
                   {order.items.map(i => i.name).join(', ')}
                 </p>
               )}
             </div>
          </div>
          
          {/* Navigation Button */}
          {expanded && isDelivering && (
            <button 
              onClick={handleNavigate}
              className="w-full mt-2 bg-blue-50 text-blue-600 border border-blue-200 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <Navigation className="w-4 h-4" /> Navegar com GPS
            </button>
          )}
        </div>
      </div>

      {actionButton && (
        <div className="pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
          {actionButton}
        </div>
      )}
    </div>
  );
};

const DriverMap: React.FC<{ activeOrders: Order[], driverLocation: LatLng }> = ({ activeOrders, driverLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    mapInstanceRef.current = window.L.map(mapRef.current).setView([driverLocation.lat, driverLocation.lng], 15);
    
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: 'OpenStreetMap | CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstanceRef.current);
  }, []);

  // Update map markers and route
  useEffect(() => {
     if (!mapInstanceRef.current || !window.L) return;
     const map = mapInstanceRef.current;
     const L = window.L;

     // Update Driver Marker
     if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
     } else {
        const driverIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #16a34a; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
     }
     
     // Recenter map on driver
     map.panTo([driverLocation.lat, driverLocation.lng]);

     // Clear old destinations
     markersRef.current.forEach(l => map.removeLayer(l));
     markersRef.current = [];

     // Add destinations and draw line
     if (activeOrders.length > 0) {
        const targetOrder = activeOrders[0]; // Focus on the first active order
        const dest = getCoordinates(targetOrder.id);
        
        const destIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #2563eb; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [14, 14],
        });
        const marker = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(map).bindPopup(`Entrega: ${targetOrder.customerName}`);
        markersRef.current.push(marker);

        // Draw simple route line
        const latlngs = [
          [driverLocation.lat, driverLocation.lng],
          [dest.lat, dest.lng]
        ];

        if (routeLineRef.current) {
           routeLineRef.current.setLatLngs(latlngs);
        } else {
           routeLineRef.current = L.polyline(latlngs, {color: 'blue', dashArray: '5, 10'}).addTo(map);
        }
     } else {
       if (routeLineRef.current) {
         map.removeLayer(routeLineRef.current);
         routeLineRef.current = null;
       }
     }

  }, [driverLocation, activeOrders]);

  return <div ref={mapRef} className="w-full h-full rounded-xl z-0" />;
}

const DriverView: React.FC = () => {
  const { orders, updateOrderStatus, updateDriverLocation, driverLocation } = useApp();
  const [useRealGPS, setUseRealGPS] = useState(false);

  const availableOrders = orders.filter(o => o.status === OrderStatus.READY);
  const myDeliveries = orders.filter(o => o.status === OrderStatus.DELIVERING);
  const history = orders.filter(o => o.status === OrderStatus.DELIVERED); // Full history

  // Real-time GPS Tracking Logic
  useEffect(() => {
    if (!useRealGPS) return;
    if (!("geolocation" in navigator)) {
      alert("Geolocalização não suportada neste navegador.");
      setUseRealGPS(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDriverLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error("Erro de GPS:", error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [useRealGPS, updateDriverLocation]);


  // Simulator (Fallback if not using real GPS)
  useEffect(() => {
    if (useRealGPS || myDeliveries.length === 0) return;

    const interval = setInterval(() => {
      // Simulate random small movement
      const jitter = 0.0005; 
      const newLat = driverLocation.lat + (Math.random() - 0.5) * jitter;
      const newLng = driverLocation.lng + (Math.random() - 0.5) * jitter;
      updateDriverLocation({ lat: newLat, lng: newLng });
    }, 3000);

    return () => clearInterval(interval);
  }, [myDeliveries, driverLocation, updateDriverLocation, useRealGPS]);

  return (
    <div className="space-y-8">
      {/* Driver Header Status & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden h-64 lg:h-80 relative border border-gray-200">
            {myDeliveries.length > 0 ? (
               <DriverMap activeOrders={myDeliveries} driverLocation={driverLocation} />
            ) : (
               <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">
                  <p>Sem entregas ativas para rastrear.</p>
               </div>
            )}
            
            <button 
              onClick={() => setUseRealGPS(!useRealGPS)}
              className={`absolute top-4 right-4 z-[500] px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-2 ${useRealGPS ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <Navigation className="w-3 h-3" />
              {useRealGPS ? 'GPS Real Ativo' : 'Usar GPS Real'}
            </button>
         </div>

         <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md flex flex-col justify-center">
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-full">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Status</h2>
                  <p className="text-blue-100 text-sm">
                    {myDeliveries.length > 0 ? 'Em trânsito' : 'Aguardando Pedidos'}
                  </p>
                </div>
             </div>
             <div className="text-left">
                <p className="text-4xl font-bold">{myDeliveries.length}</p>
                <p className="text-sm text-blue-200 uppercase mt-1">Entregas Pendentes</p>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Column 1: Available */}
        <section className="bg-gray-100/50 p-4 rounded-2xl h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" /> Disponíveis
          </h2>
          <div className="space-y-4">
            {availableOrders.length === 0 ? <p className="text-sm text-gray-400">Sem pedidos prontos.</p> : 
              availableOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  actionButton={
                    <button 
                      onClick={() => updateOrderStatus(order.id, OrderStatus.DELIVERING)}
                      className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Bike className="w-4 h-4" /> Aceitar e Iniciar Rota
                    </button>
                  }
                />
              ))
            }
          </div>
        </section>

        {/* Column 2: In Transit */}
        <section className="bg-blue-50/50 p-4 rounded-2xl h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" /> Minhas Entregas
          </h2>
          <div className="space-y-4">
            {myDeliveries.length === 0 ? <p className="text-sm text-gray-400">Você não tem entregas ativas.</p> : 
              myDeliveries.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isDelivering={true}
                  driverLocation={driverLocation}
                  actionButton={
                    <button 
                      onClick={() => updateOrderStatus(order.id, OrderStatus.DELIVERED)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Confirmar Entrega
                    </button>
                  }
                />
              ))
            }
          </div>
        </section>

        {/* Column 3: History */}
        <section className="bg-gray-100/50 p-4 rounded-2xl h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-gray-600" /> Histórico
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {history.length === 0 ? <p className="text-sm text-gray-400">Nenhuma entrega finalizada.</p> : 
              history.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm opacity-75">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">#{order.id}</span>
                    <span className="text-green-600 text-xs font-bold uppercase">Entregue</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{order.address}, {order.addressNumber}</p>
                  <p className="text-xs text-gray-400 mt-1">{order.createdAt.toLocaleDateString()}</p>
                </div>
              ))
            }
          </div>
        </section>
      </div>
    </div>
  );
};

export default DriverView;