
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export enum OrderStatus {
  PENDING = 'PENDING',       // Pedido feito, aguardando restaurante
  PREPARING = 'PREPARING',   // Restaurante aceitou/preparando
  READY = 'READY',           // Pronto para retirada pelo entregador
  DELIVERING = 'DELIVERING', // Entregador pegou
  DELIVERED = 'DELIVERED',   // Entregue
  CANCELLED = 'CANCELLED'
}

export type PaymentMethod = 'PIX' | 'CREDIT' | 'DEBIT' | 'CASH';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Review {
  id: string;
  itemId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  password?: string;
}

export interface PixConfig {
  key: string;
  bankName: string;
  holderName: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  customerName: string;
  address: string;
  addressNumber: string;
  cep?: string; // CEP added
  referencePoint?: string;
  paymentMethod: PaymentMethod;
  changeFor?: string; // Valor para troco (ex: "50.00")
  driverId?: string; // ID do entregador designado
  createdAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SystemNotification {
  id: string;
  message: string;
  targetRole: UserRole;
  timestamp: number;
}
